/**
 * Entscheidungsereignisse: Statt einfach einzutreten, stellen sie das Weingut vor eine Wahl – meist mit Risiko
 * oder Preis. Die Entscheidung gilt bis Monatsende, danach greift die vorsichtige Wahl. Computergegner entscheiden sofort.
 */
import { parcelValue, SITE_LABELS } from './auction'
import { TANK_COST_PER_HL } from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS } from './data/regions'
import {
  addEffect,
  bearingPlots,
  bottleCount,
  context,
  estateEvents,
  hasBearing,
  reputation,
  sellableLots,
  sellBottles,
  type EventContext,
  type Rarity,
} from './events'
import { availableCredit, bottlePrice, bulkPricePerHl } from './market'
import { adjustRelation, relation } from './rivals'
import { changeReputation, removeBatchVolume, usedTankHl, wineLabel } from './rules'
import type { Decision, DecisionOption, GameState, Player } from './types'
import { addLog, formatEuro, newId } from './util'

type Outcome = { text: string; tone?: 'good' | 'bad' }

export interface DecisionDef {
  id: string
  rarity: Rarity
  months?: number[]
  when?: (ctx: EventContext) => boolean
  /** Baut die Entscheidung mit ausgewürfelten Werten */
  offer: (ctx: EventContext) => Omit<Decision, 'eventId'>
  /** Wahl eines Computergegners */
  ai: (ctx: EventContext, decision: Decision) => number
  resolve: (ctx: EventContext, option: number, decision: Decision) => Outcome
}

const option = (label: string, hint: string, cost = 0): DecisionOption => ({ label, hint, cost })
const decline = (hint = 'Es passiert nichts.') => option('Ablehnen', hint)

/** Kann der Betrag über Konto und freien Kreditrahmen bezahlt werden? */
export const affordable = (player: Player, amount: number) => Math.max(0, player.money) + availableCredit(player) >= amount
/** Nur ausgeben, was die Rücklage nicht angreift – Maßstab der Computergegner */
const comfortable = (player: Player, amount: number) => player.money - amount > 20_000

/** Bezahlt; ein Fehlbetrag wird automatisch über den Kredit gedeckt. */
function pay(ctx: EventContext, amount: number): string {
  const { player } = ctx
  player.money -= amount
  if (player.money < 0) {
    const loan = Math.min(-player.money, availableCredit(player))
    player.loan += loan
    player.money += loan
    if (loan > 0) return `${formatEuro(amount)}, davon ${formatEuro(loan)} per Kredit`
  }
  return formatEuro(amount)
}

/** Erwarteter Erlös für Flaschen zum angegebenen Anteil des Ab-Hof-Preises, älteste zuerst */
function expectedRevenue(ctx: EventContext, bottles: number, share: number): number {
  let left = bottles
  let revenue = 0
  for (const lot of sellableLots(ctx)) {
    const n = Math.min(left, lot.bottles)
    revenue += n * bottlePrice(lot, ctx.player, ctx.state) * share
    left -= n
    if (left <= 0) break
  }
  return Math.round(revenue)
}

/** Ein Computer-Nachbar im selben Gebiet, der nicht verfeindet ist – der freundlichste zuerst */
function neighbour(ctx: EventContext, minRelation = -10): Player | undefined {
  if (ctx.player.ai !== null) return undefined
  return ctx.state.players
    .filter((p) => p.ai !== null && !p.bankrupt && p.regionId === ctx.player.regionId && relation(p, ctx.player.id) >= minRelation)
    .sort((a, b) => relation(b, ctx.player.id) - relation(a, ctx.player.id))[0]
}
const partnerOf = (ctx: EventContext, d: Decision) => ctx.state.players[d.params.partner]
/** Fertiger Wein im Tank, den ein Nachbar kaufen könnte */
const sellableBatch = (ctx: EventContext) =>
  ctx.player.cellar.filter((b) => !b.barrique && b.monthsUntilReady === 0 && b.hectoliters >= 20).sort((a, b) => b.hectoliters - a.hectoliters)[0]

const bearingHa = (ctx: EventContext) => bearingPlots(ctx).reduce((sum, p) => sum + p.hectares, 0)
const grapeIds = Object.keys(GRAPES) as GrapeId[]

export const DECISION_EVENTS: DecisionDef[] = [
  // ── Alltag ───────────────────────────────────────────────────────────────────
  {
    id: 'stadtweinfest', rarity: 'alltag', months: [5, 6, 7, 8],
    offer: (c) => {
      const rent = c.between(1500, 2500, 100)
      return {
        title: '🎪 Stand auf dem Stadtweinfest',
        text: `Das große Weinfest in der Kreisstadt sucht noch Winzer. Die Standmiete beträgt ${formatEuro(rent)}.`,
        options: [option('Stand mieten', '+3 Bekanntheit, nächsten Monat 40 % mehr Nachfrage', rent), decline()],
        fallback: 1,
        params: { rent },
      }
    },
    ai: (c, d) => (comfortable(c.player, d.params.rent) ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du verzichtest auf einen Stand beim Stadtweinfest.' }
      const paid = pay(c, d.params.rent)
      addEffect(c.player, 'demand', 1.4, 1, 'Nach dem Stadtweinfest')
      return { text: `Dein Stand auf dem Stadtweinfest ist gut besucht (${paid}, ${reputation(c, 3)}).`, tone: 'good' }
    },
  },
  {
    id: 'vereinsfest', rarity: 'alltag', when: (c) => bottleCount(sellableLots(c)) >= 60,
    offer: () => ({
      title: '⚽ Spende fürs Vereinsfest',
      text: 'Der Sportverein im Ort bittet um 60 Flaschen Wein für sein Sommerfest – als Spende.',
      options: [option('Spenden', '60 Flaschen weniger, +1,5 Bekanntheit'), option('Ablehnen', 'Im Ort wird getuschelt: −0,5 Bekanntheit')],
      fallback: 1,
      params: {},
    }),
    ai: () => 0,
    resolve: (c, choice) => {
      if (choice === 1) return { text: `Keine Spende für den Sportverein (${reputation(c, -0.5)}).`, tone: 'bad' }
      sellBottles(c, sellableLots(c), 60, 0)
      return { text: `Der Sportverein bedankt sich für 60 Flaschen (${reputation(c, 1.5)}).`, tone: 'good' }
    },
  },
  {
    id: 'influencer-werbung', rarity: 'alltag',
    offer: (c) => {
      const fee = c.between(800, 1500, 100)
      return {
        title: '📱 Bezahlte Werbung',
        text: `Eine Wein-Influencerin bietet dir einen gesponserten Beitrag für ${formatEuro(fee)} an.`,
        options: [option('Buchen', 'Meist: +3 Bekanntheit und 2 Monate 25 % mehr Nachfrage – manchmal verpufft es', fee), decline()],
        fallback: 1,
        params: { fee },
      }
    },
    ai: (c, d) => (comfortable(c.player, d.params.fee) && c.player.reputation < 40 ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du lehnst die bezahlte Werbung ab.' }
      const paid = pay(c, d.params.fee)
      if (c.roll() < 0.7) {
        addEffect(c.player, 'demand', 1.25, 2, 'Gesponserter Beitrag')
        return { text: `Der gesponserte Beitrag kommt gut an (${paid}, ${reputation(c, 3)}).`, tone: 'good' }
      }
      return { text: `Der gesponserte Beitrag verpufft – kaum jemand reagiert (${paid}).`, tone: 'bad' }
    },
  },

  // ── Gelegentlich ─────────────────────────────────────────────────────────────
  {
    id: 'discounter', rarity: 'gelegentlich', when: (c) => bottleCount(sellableLots(c)) >= 1000,
    offer: (c) => {
      const bottles = Math.min(bottleCount(sellableLots(c)), c.between(800, 2000, 100))
      const revenue = expectedRevenue(c, bottles, 0.5)
      return {
        title: '🛒 Großauftrag vom Discounter',
        text: `Eine Discounter-Kette will ${bottles.toLocaleString('de-DE')} Flaschen auf einen Schlag – zum halben Ab-Hof-Preis.`,
        options: [option('Verkaufen', `rund +${formatEuro(revenue)} sofort, aber −3 Bekanntheit (Ramsch-Image)`), decline()],
        fallback: 1,
        params: { bottles },
      }
    },
    ai: (c) => (c.player.money < 20_000 ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du lehnst den Großauftrag des Discounters ab.' }
      const { sold, revenue } = sellBottles(c, sellableLots(c), d.params.bottles, 0.5)
      return { text: `${sold} Flaschen gehen an den Discounter: +${formatEuro(revenue)} (${reputation(c, -3)}).`, tone: 'good' }
    },
  },
  {
    id: 'journalist', rarity: 'gelegentlich',
    offer: (c) => {
      const cost = c.between(1500, 3000, 100)
      return {
        title: '📰 Reportage im Weinmagazin',
        text: `Ein Journalist eines großen Weinmagazins möchte über dein Gut schreiben. Bewirtung und Zeitaufwand kosten rund ${formatEuro(cost)}.`,
        options: [
          option('Einladen', 'Meist ein begeisterter Artikel (+6 Bekanntheit, mehr Nachfrage) – manchmal ein Verriss (−3)', cost),
          option('Absagen', 'Es passiert nichts.'),
        ],
        fallback: 1,
        params: { cost },
      }
    },
    ai: (c, d) => (comfortable(c.player, d.params.cost * 3) ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du sagst dem Journalisten ab.' }
      const paid = pay(c, d.params.cost)
      if (c.roll() < 0.7) {
        addEffect(c.player, 'demand', 1.2, 2, 'Reportage im Weinmagazin')
        return { text: `Die Reportage ist eine Hymne auf dein Gut (${paid}, ${reputation(c, 6)}).`, tone: 'good' }
      }
      return { text: `Der Journalist verreißt deinen Wein (${paid}, ${reputation(c, -3)}).`, tone: 'bad' }
    },
  },
  {
    id: 'erntehelfer-lohn', rarity: 'gelegentlich', months: [8, 9], when: hasBearing,
    offer: (c) => {
      const extra = Math.round((bearingHa(c) * c.between(200, 400, 10)) / 100) * 100
      return {
        title: '✊ Erntehelfer wollen mehr Lohn',
        text: `Kurz vor der Lese fordern die Erntehelfer einen Zuschlag von ${formatEuro(extra)}.`,
        options: [
          option('Zahlen', 'Die Lese läuft wie geplant.', extra),
          option('Ablehnen', 'Einige reisen ab – rund 15 % weniger Ertrag auf allen tragenden Lagen'),
        ],
        fallback: 1,
        params: { extra },
      }
    },
    ai: (c, d) => (affordable(c.player, d.params.extra) ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 0) return { text: `Du zahlst den Erntehelfern einen Zuschlag (${pay(c, d.params.extra)}).` }
      for (const plot of bearingPlots(c)) plot.cropFactor *= 0.85
      return { text: 'Ein Teil der Erntehelfer reist ab – rund 15 % der Trauben bleiben hängen.', tone: 'bad' }
    },
  },
  {
    id: 'gebrauchte-tanks', rarity: 'gelegentlich',
    offer: (c) => {
      const hl = c.between(100, 200, 50)
      const price = Math.round((hl * TANK_COST_PER_HL * 0.5) / 100) * 100
      return {
        title: '🛢️ Gebrauchte Tanks günstig',
        text: `Ein Weingut gibt auf und verkauft ${hl} hl Edelstahltanks für ${formatEuro(price)} – halb so viel wie neu.`,
        options: [option('Kaufen', `+${hl} hl Tankkapazität`, price), decline()],
        fallback: 1,
        params: { hl, price },
      }
    },
    ai: (c, d) => (usedTankHl(c.player) > c.player.tankCapacityHl * 0.7 && comfortable(c.player, d.params.price) ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du lässt die gebrauchten Tanks stehen.' }
      const paid = pay(c, d.params.price)
      c.player.tankCapacityHl += d.params.hl
      return { text: `Schnäppchen: ${d.params.hl} hl gebrauchte Tanks gekauft (${paid}).`, tone: 'good' }
    },
  },

  // ── Nachbarschaft: Angebote freundlicher Computergegner ─────────────────────
  {
    id: 'kooperation-messestand', rarity: 'gelegentlich', when: (c) => neighbour(c) !== undefined,
    offer: (c) => {
      const partner = neighbour(c)!
      const share = c.between(3000, 5000, 500)
      return {
        title: `🤝 Gemeinsamer Messestand mit ${partner.name}`,
        text: `${partner.name} schlägt vor, auf der Regionalmesse gemeinsam auszustellen. Dein Anteil: ${formatEuro(share)}.`,
        options: [
          option('Mitmachen', 'Beide +5 Bekanntheit, das Verhältnis zum Nachbarn wird besser', share),
          option('Ablehnen', 'Der Nachbar ist ein wenig verstimmt'),
        ],
        fallback: 1,
        params: { share, partner: c.state.players.indexOf(partner) },
      }
    },
    ai: () => 1,
    resolve: (c, choice, d) => {
      const partner = partnerOf(c, d)
      if (choice === 1) {
        adjustRelation(partner, c.player.id, -5)
        return { text: `Du lehnst den gemeinsamen Messestand mit ${partner.name} ab.` }
      }
      const paid = pay(c, d.params.share)
      changeReputation(partner, 5)
      adjustRelation(partner, c.player.id, 15)
      return { text: `Der gemeinsame Messestand mit ${partner.name} ist ein Erfolg (${paid}, ${reputation(c, 5)}).`, tone: 'good' }
    },
  },
  {
    id: 'kooperation-weinkauf', rarity: 'gelegentlich', months: [3, 4, 5, 6, 7, 8],
    when: (c) => neighbour(c) !== undefined && sellableBatch(c) !== undefined,
    offer: (c) => {
      const partner = neighbour(c)!
      const batch = sellableBatch(c)!
      const hectoliters = Math.min(batch.hectoliters, c.between(20, 40, 5))
      const price = Math.round(bulkPricePerHl(batch, c.state, c.player) * hectoliters * 1.3)
      return {
        title: `🍷 ${partner.name} braucht Wein`,
        text: `${partner.name} hat zu wenig Wein für seine Kunden und möchte dir ${hectoliters} hl ${wineLabel(batch)} abkaufen – für ${formatEuro(price)}, 30 % über dem Fassweinpreis.`,
        options: [
          option('Verkaufen', `+${formatEuro(price)}, das Verhältnis zum Nachbarn wird besser`),
          option('Ablehnen', 'Der Wein bleibt in deinem Tank'),
        ],
        fallback: 1,
        params: { partner: c.state.players.indexOf(partner), hectoliters, price },
      }
    },
    ai: () => 1,
    resolve: (c, choice, d) => {
      const partner = partnerOf(c, d)
      const batch = sellableBatch(c)
      if (choice === 1 || !batch) return { text: `Du behältst deinen Wein – ${partner.name} sucht anderswo.` }
      const hectoliters = Math.min(batch.hectoliters, d.params.hectoliters)
      const label = wineLabel(batch)
      partner.cellar.push({ ...structuredClone(batch), id: newId(c.state, 'wine'), hectoliters })
      removeBatchVolume(c.player, batch, hectoliters)
      c.player.money += d.params.price
      adjustRelation(partner, c.player.id, 10)
      return { text: `${hectoliters} hl ${label} an ${partner.name} verkauft: +${formatEuro(d.params.price)}.`, tone: 'good' }
    },
  },
  {
    id: 'erntehilfe', rarity: 'selten', months: [9, 10], when: (c) => hasBearing(c) && neighbour(c, 20) !== undefined,
    offer: (c) => {
      const partner = neighbour(c, 20)!
      return {
        title: `🧺 Erntehilfe von ${partner.name}`,
        text: `${partner.name} ist mit der Lese fertig und bietet dir seine erfahrenen Erntehelfer an – unentgeltlich, unter Nachbarn.`,
        options: [option('Gern annehmen', 'Sorgfältige Handlese: +3 Güte für diesen Jahrgang'), option('Danke, nein', 'Es passiert nichts')],
        fallback: 1,
        params: { partner: c.state.players.indexOf(partner) },
      }
    },
    ai: () => 1,
    resolve: (c, choice, d) => {
      const partner = partnerOf(c, d)
      if (choice === 1) return { text: `Du dankst ${partner.name} für das Angebot.` }
      addEffect(c.player, 'quality', 3, 13 - c.state.month, `Erntehilfe von ${partner.name}`)
      adjustRelation(partner, c.player.id, 5)
      return { text: `Die Erntehelfer von ${partner.name} lesen sorgfältig mit (+3 Güte für den Jahrgang).`, tone: 'good' }
    },
  },

  // ── Selten ───────────────────────────────────────────────────────────────────
  {
    id: 'nachbarlage', rarity: 'selten',
    offer: (c) => {
      const { state, player } = c
      const hectares = c.between(1, 3)
      const site = c.between(-1, 1)
      const suitable = grapeIds.filter((g) => REGIONS[player.regionId].suitability[g] >= 0)
      const grape = c.roll() < 0.7 ? suitable[Math.floor(c.roll() * suitable.length)] : null
      const plantedYear = grape ? state.year - c.between(5, 30) : null
      const estimate = parcelValue({ hectares, grape, plantedYear, site, regionId: player.regionId }, state.year)
      const price = Math.round((estimate * (0.85 + c.roll() * 0.3)) / 1000) * 1000
      return {
        title: '🤝 Der Nachbar will verkaufen',
        text:
          `Dein Nachbar setzt sich zur Ruhe und bietet dir privat seine Lage an: ${hectares} ha, ${SITE_LABELS[site]}, ` +
          `${grape ? `${GRAPES[grape].name}, ${state.year - plantedYear!} Jahre alt` : 'Brache'}. Schätzwert ${formatEuro(Math.round(estimate / 1000) * 1000)}.`,
        options: [option('Kaufen', `Für ${formatEuro(price)} – ohne Versteigerung, Fehlbetrag per Kredit`, price), decline('Er verkauft an jemand anderen.')],
        fallback: 1,
        params: { hectares, site, grape: grape ? grapeIds.indexOf(grape) : -1, plantedYear: plantedYear ?? -1, price },
      }
    },
    ai: (c, d) => (comfortable(c.player, d.params.price) ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du lehnst das Angebot deines Nachbarn ab.' }
      const { player, state } = c
      const paid = pay(c, d.params.price)
      const taken = new Set(player.plots.map((p) => p.name))
      let name = 'Nachbarlage'
      for (let n = 2; taken.has(name); n++) name = `Nachbarlage ${n}`
      const grape = d.params.grape >= 0 ? grapeIds[d.params.grape] : null
      player.plots.push({
        id: newId(state, 'plot'), name, hectares: d.params.hectares, grape, plantedYear: grape ? d.params.plantedYear : null,
        site: d.params.site, oechsle: 0, health: 1, cropFactor: 1, harvestedThisYear: false, botrytis: false, iceWineGamble: false,
      })
      return { text: `Handschlag: Die Lage des Nachbarn (${d.params.hectares} ha) gehört jetzt dir (${paid}).`, tone: 'good' }
    },
  },
  {
    id: 'kellermeister-abwerbung', rarity: 'selten', when: (c) => c.player.cellarMaster !== null,
    offer: (c) => {
      const master = c.player.cellarMaster!
      const bonus = Math.round((master.salary * c.between(12, 20)) / 10 / 500) * 500
      return {
        title: '🧑‍🔬 Dein Kellermeister wird abgeworben',
        text: `Ein Großweingut will ${master.name} abwerben. Mit einer Prämie von ${formatEuro(bonus)} würde ${master.name.split(' ')[0]} bleiben.`,
        options: [
          option('Prämie zahlen', 'Bleibt – mit allen Fähigkeiten und der Erfahrung.', bonus),
          option('Ziehen lassen', 'Geht: kein Gehalt mehr, aber auch kein Güte-Zuschlag und keine Spezialweine mehr'),
        ],
        fallback: 1,
        params: { bonus },
      }
    },
    ai: (c, d) => (affordable(c.player, d.params.bonus) ? 0 : 1),
    resolve: (c, choice, d) => {
      const name = c.player.cellarMaster?.name ?? 'Dein Kellermeister'
      if (choice === 0) return { text: `${name} bleibt (Prämie ${pay(c, d.params.bonus)}).` }
      c.player.cellarMaster = null
      return { text: `${name} wechselt zur Konkurrenz.`, tone: 'bad' }
    },
  },
  {
    id: 'fernsehkoch', rarity: 'selten', when: (c) => bottleCount(sellableLots(c)) >= 600,
    offer: (c) => ({
      title: '👨‍🍳 Auftritt in einer Kochsendung',
      text: 'Ein bekannter Fernsehkoch will deinen Wein in seiner Sendung vorstellen – wenn du 600 Flaschen zu 40 % des Preises lieferst.',
      options: [
        option('Liefern', `600 Fl. für rund ${formatEuro(expectedRevenue(c, 600, 0.4))}, +8 Bekanntheit, drei Monate 40 % mehr Nachfrage`),
        decline(),
      ],
      fallback: 1,
      params: {},
    }),
    ai: () => 0,
    resolve: (c, choice) => {
      if (choice === 1) return { text: 'Du lehnst den Auftritt in der Kochsendung ab.' }
      const { revenue } = sellBottles(c, sellableLots(c), 600, 0.4)
      addEffect(c.player, 'demand', 1.4, 3, 'Auftritt in der Kochsendung')
      return { text: `Dein Wein glänzt in der Kochsendung (+${formatEuro(revenue)}, ${reputation(c, 8)}).`, tone: 'good' }
    },
  },
  {
    id: 'weinmesse-einladung', rarity: 'selten',
    offer: (c) => {
      const fee = c.between(6000, 10_000, 500)
      return {
        title: '🌐 Einladung zur internationalen Weinmesse',
        text: `Du kannst auf dem Gemeinschaftsstand deines Gebiets ausstellen. Standanteil und Reise kosten ${formatEuro(fee)}.`,
        options: [option('Teilnehmen', '+6 Bekanntheit, ein Jahr lang 5 % höhere Preise', fee), decline()],
        fallback: 1,
        params: { fee },
      }
    },
    ai: (c, d) => (comfortable(c.player, d.params.fee * 2) ? 0 : 1),
    resolve: (c, choice, d) => {
      if (choice === 1) return { text: 'Du verzichtest auf die internationale Weinmesse.' }
      const paid = pay(c, d.params.fee)
      addEffect(c.player, 'price', 1.05, 12, 'Kontakte von der Weinmesse')
      return { text: `Auf der Weinmesse knüpfst du wertvolle Kontakte (${paid}, ${reputation(c, 6)}).`, tone: 'good' }
    },
  },
]

/** Entscheidungen, die gerade angeboten werden können */
export function possibleDecisions(state: GameState, player: Player): DecisionDef[] {
  if (player.decision) return []
  const ctx = context(state, player)
  return DECISION_EVENTS.filter((d) => (!d.months || d.months.includes(state.month)) && (!d.when || d.when(ctx)))
}

/** Bietet eine Entscheidung an; Computergegner entscheiden sofort. */
export function offerDecision(state: GameState, player: Player, def: DecisionDef) {
  const ctx = context(state, player)
  const decision: Decision = { eventId: def.id, ...def.offer(ctx) }
  if (player.ai !== null) {
    let choice = def.ai(ctx, decision)
    if (!affordable(player, decision.options[choice].cost)) choice = decision.fallback
    applyDecision(state, player, decision, choice)
    return
  }
  player.decision = decision
  addLog(state, player.id, `Entscheidung gefragt: ${decision.title.replace(/^\S+\s/, '')}.`)
}

function applyDecision(state: GameState, player: Player, decision: Decision, choice: number) {
  const def = DECISION_EVENTS.find((d) => d.id === decision.eventId)!
  const outcome = def.resolve(context(state, player), choice, decision)
  addLog(state, player.id, outcome.text, outcome.tone)
}

export function validateDecide(player: Player, choice: number): string | null {
  const decision = player.decision
  if (!decision) return 'Es steht keine Entscheidung an.'
  const option = decision.options[choice]
  if (!option) return 'Ungültige Wahl.'
  if (!affordable(player, option.cost)) return `Nicht finanzierbar (benötigt ${formatEuro(option.cost)}).`
  return null
}

export function decide(state: GameState, player: Player, choice: number) {
  const decision = player.decision!
  player.decision = null
  applyDecision(state, player, decision, choice)
}

/** Monatsende: Ohne Antwort gilt die vorsichtige Wahl. */
export function expireDecision(state: GameState, player: Player) {
  const decision = player.decision
  if (!decision) return
  player.decision = null
  addLog(state, player.id, `Keine Antwort auf „${decision.title.replace(/^\S+\s/, '')}“ – es gilt: ${decision.options[decision.fallback].label}.`)
  applyDecision(state, player, decision, decision.fallback)
}

/** Monatliches Zufallsereignis: Glücksfall, Rückschlag oder Entscheidung */
export function monthlyEvent(state: GameState, player: Player) {
  const decisions = possibleDecisions(state, player).map((def) => ({
    rarity: def.rarity,
    trigger: () => offerDecision(state, player, def),
  }))
  estateEvents(state, player, decisions)
}
