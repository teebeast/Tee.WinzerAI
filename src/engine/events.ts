/**
 * Zufallsereignisse: Jeden Monat kann jedem Weingut etwas passieren – meist Kleinigkeiten, selten Einschneidendes,
 * ganz selten etwas, das das Spiel umkrempelt. Dazu befristete Folgen (Effekte) auf Absatz, Preise, Kosten und Güte.
 */
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS } from './data/regions'
import { bottlePrice } from './market'
import { nextFloat } from './rng'
import { changeReputation, plotAgeFactor, removeBatchVolume, removeBottles, wineLabel } from './rules'
import type { BottleLot, EffectKind, GameState, Player, Plot } from './types'
import { addLog, formatEuro, newId } from './util'

const CRISIS_CHANCE = 0.015
const CRISIS_MONTHS = 6

/** Chance je Weingut und Monat, dass überhaupt ein Ereignis eintritt */
export const EVENT_CHANCE = 0.35

export type Rarity = 'alltag' | 'gelegentlich' | 'selten' | 'sehr-selten'

/** Relative Häufigkeit je Seltenheitsstufe */
export const RARITY_WEIGHT: Record<Rarity, number> = {
  alltag: 10,
  gelegentlich: 3,
  selten: 1,
  'sehr-selten': 0.15,
}

export interface EventContext {
  state: GameState
  player: Player
  /** Zufallszahl im Bereich [min, max], auf `step` gerundet */
  between: (min: number, max: number, step?: number) => number
  roll: () => number
}

export interface EstateEventDef {
  id: string
  rarity: Rarity
  tone: 'good' | 'bad'
  /** Nur in diesen Monaten möglich */
  months?: number[]
  /** Nur möglich, wenn die Bedingung erfüllt ist */
  when?: (ctx: EventContext) => boolean
  /** Wendet das Ereignis an und liefert die Meldung */
  apply: (ctx: EventContext) => string
}

// Hilfen für den Katalog

export const bearingPlots = ({ state, player }: EventContext) =>
  player.plots.filter((p) => p.grape !== null && !p.harvestedThisYear && plotAgeFactor(p, state.year) > 0)
export const hasBearing = (ctx: EventContext) => bearingPlots(ctx).length > 0
const plantedPlots = ({ player }: EventContext) => player.plots.filter((p) => p.grape !== null)
const randomOf = <T>(ctx: EventContext, items: T[]): T => items[Math.floor(ctx.roll() * items.length)]

/** Verkaufsfertige Flaschen, die nicht für eine Prämierung angemeldet sind */
export const sellableLots = ({ player }: EventContext, registeredOnly = false) =>
  player.bottles.filter(
    (l) => l.monthsUntilReady === 0 && !player.competitionEntries.includes(l.id) && (!registeredOnly || l.registered),
  )
export const bottleCount = (lots: BottleLot[]) => lots.reduce((sum, l) => sum + l.bottles, 0)

export function money({ player }: EventContext, amount: number): string {
  player.money += amount
  return `${amount >= 0 ? '+' : '−'}${formatEuro(Math.abs(amount))}`
}

export function reputation({ player }: EventContext, delta: number): string {
  const change = changeReputation(player, delta)
  return `Bekanntheit ${change >= 0 ? '+' : ''}${change.toFixed(1)}`
}

export function addEffect(player: Player, kind: EffectKind, value: number, months: number, label: string) {
  player.effects.push({ kind, value, monthsLeft: months, label })
}

/** Verkauft Flaschen, älteste zuerst; liefert verkaufte Menge und Erlös */
export function sellBottles(ctx: EventContext, lots: BottleLot[], count: number, priceFactor: number) {
  let left = count
  let revenue = 0
  for (const lot of lots) {
    if (left <= 0) break
    const n = Math.min(left, lot.bottles)
    revenue += n * bottlePrice(lot, ctx.player, ctx.state.year) * priceFactor
    removeBottles(ctx.player, lot, n)
    left -= n
  }
  revenue = Math.round(revenue)
  ctx.player.money += revenue
  return { sold: count - left, revenue }
}

/** Vernichtet einen Anteil aller Flaschen; liefert die Zahl */
function destroyBottles(ctx: EventContext, share: number): number {
  let lost = 0
  for (const lot of [...ctx.player.bottles]) {
    const n = Math.round(lot.bottles * share)
    if (n > 0) removeBottles(ctx.player, lot, n)
    lost += n
  }
  return lost
}

function damageCrop(plots: Plot[], factor: number) {
  for (const plot of plots) plot.cropFactor *= factor
}

export const ESTATE_EVENTS: EstateEventDef[] = [
  // ── Alltag: häufig, kaum spürbar ─────────────────────────────────────────────
  {
    id: 'wandergruppe', rarity: 'alltag', tone: 'good', months: [4, 5, 6, 7, 8, 9, 10],
    apply: (c) => `Eine Wandergruppe kehrt spontan zur Weinprobe ein: ${money(c, c.between(200, 800, 50))}.`,
  },
  {
    id: 'pumpe', rarity: 'alltag', tone: 'bad',
    apply: (c) => `Die Weinpumpe streikt – Reparatur ${money(c, -c.between(200, 700, 50))}.`,
  },
  {
    id: 'lokalblatt', rarity: 'alltag', tone: 'good',
    apply: (c) => `Das Lokalblatt bringt ein kleines Porträt über dein Weingut (${reputation(c, 1)}).`,
  },
  {
    id: 'bewertung', rarity: 'alltag', tone: 'bad',
    apply: (c) => `Eine verärgerte Online-Bewertung macht die Runde (${reputation(c, -1)}).`,
  },
  {
    id: 'stare', rarity: 'alltag', tone: 'bad', months: [8, 9, 10], when: hasBearing,
    apply: (c) => {
      damageCrop(bearingPlots(c), 0.96)
      return 'Ein Starenschwarm fällt über die reifen Trauben her – ein paar Prozent der Ernte sind weg.'
    },
  },
  {
    id: 'wildschweine', rarity: 'alltag', tone: 'bad', months: [8, 9, 10], when: hasBearing,
    apply: (c) => {
      const plot = randomOf(c, bearingPlots(c))
      damageCrop([plot], 0.94)
      return `Wildschweine haben in der Lage ${plot.name} gewütet – rund 6 % weniger Trauben.`
    },
  },
  {
    id: 'hochzeit', rarity: 'alltag', tone: 'good', when: (c) => bottleCount(sellableLots(c)) >= 60,
    apply: (c) => {
      const { sold, revenue } = sellBottles(c, sellableLots(c), c.between(60, 120, 10), 1)
      return `Ein Stammkunde bestellt ${sold} Flaschen für eine Hochzeit: +${formatEuro(revenue)}.`
    },
  },
  {
    id: 'steuer', rarity: 'alltag', tone: 'good',
    apply: (c) => `Das Finanzamt erstattet zu viel gezahlte Steuern: ${money(c, c.between(500, 2000, 100))}.`,
  },
  {
    id: 'traktor', rarity: 'alltag', tone: 'bad',
    apply: (c) => `Der Schmalspurtraktor braucht neue Reifen: ${money(c, -c.between(300, 900, 100))}.`,
  },
  {
    id: 'sommelier', rarity: 'alltag', tone: 'good',
    apply: (c) => `Ein Sommelier empfiehlt deinen Wein im Restaurant der Kreisstadt (${reputation(c, 1.5)}).`,
  },
  {
    id: 'weinfest', rarity: 'alltag', tone: 'good', months: [5, 6, 7, 8, 9],
    apply: (c) => {
      addEffect(c.player, 'demand', 1.2, 1, 'Weinfest im Ort')
      return 'Weinfest im Ort: Nächsten Monat kommen 20 % mehr Kunden in den Hofladen.'
    },
  },
  {
    id: 'rehe', rarity: 'alltag', tone: 'bad', months: [4, 5, 6],
    when: ({ state, player }) => player.plots.some((p) => p.grape !== null && plotAgeFactor(p, state.year) === 0),
    apply: (c) => `Rehe knabbern an der Junganlage – ein Wildschutzzaun muss her: ${money(c, -c.between(300, 800, 50))}.`,
  },
  {
    id: 'starkregen', rarity: 'alltag', tone: 'bad', months: [3, 4, 5, 6, 7, 8, 9, 10],
    apply: (c) => `Starkregen spült Erde aus den Rebzeilen – Aufräumarbeiten: ${money(c, -c.between(200, 600, 50))}.`,
  },
  {
    id: 'praktikum', rarity: 'alltag', tone: 'good',
    apply: (c) => `Eine Praktikantin packt kräftig mit an – gesparte Aushilfslöhne: ${money(c, c.between(300, 900, 50))}.`,
  },
  {
    id: 'korken', rarity: 'alltag', tone: 'bad', when: (c) => bottleCount(c.player.bottles) >= 50,
    apply: (c) => {
      const lot = randomOf(c, c.player.bottles.filter((l) => l.bottles >= 10))
      const n = Math.min(lot.bottles, c.between(10, 30))
      removeBottles(c.player, lot, n)
      return `Korkfehler: ${n} Flaschen ${wineLabel(lot)} müssen weggekippt werden.`
    },
  },

  // ── Gelegentlich: spürbar, aber verkraftbar ──────────────────────────────────
  {
    id: 'weinfuehrer', rarity: 'gelegentlich', tone: 'good',
    apply: (c) => {
      addEffect(c.player, 'demand', 1.2, 3, 'Empfehlung im Weinführer')
      return `Ein Weinführer nennt dein Gut einen Geheimtipp (${reputation(c, 4)}, drei Monate 20 % mehr Nachfrage).`
    },
  },
  {
    id: 'glas', rarity: 'gelegentlich', tone: 'bad',
    apply: (c) => {
      addEffect(c.player, 'costs', 1.08, 3, 'Teures Verpackungsmaterial')
      return 'Glasflaschen und Kartons werden knapp: Drei Monate lang 8 % höhere Betriebskosten.'
    },
  },
  {
    id: 'erntehelfer', rarity: 'gelegentlich', tone: 'bad', months: [8, 9, 10], when: hasBearing,
    apply: (c) => `Die Erntehelfer bleiben aus – teure Ersatzkräfte müssen her: ${money(c, -c.between(1500, 3000, 100))}.`,
  },
  {
    id: 'gastronomie', rarity: 'gelegentlich', tone: 'good', when: (c) => bottleCount(sellableLots(c, true)) >= 300,
    apply: (c) => {
      const { sold, revenue } = sellBottles(c, sellableLots(c, true), 300, 0.9)
      return `Eine Restaurantkette nimmt ${sold} Flaschen auf einen Schlag ab: +${formatEuro(revenue)}.`
    },
  },
  {
    id: 'wasserschaden', rarity: 'gelegentlich', tone: 'bad', when: (c) => c.player.cellar.length > 0,
    apply: (c) => {
      const batch = randomOf(c, c.player.cellar)
      const lost = Math.max(1, Math.round(batch.hectoliters * (0.05 + c.roll() * 0.05)))
      const label = wineLabel(batch)
      removeBatchVolume(c.player, batch, Math.min(lost, batch.hectoliters))
      return `Wasserrohrbruch im Keller: ${lost} hl ${label} sind verdorben.`
    },
  },
  {
    id: 'foerderung', rarity: 'gelegentlich', tone: 'good',
    apply: (c) => `Ein Förderprogramm für Steillagen und Kulturlandschaft zahlt aus: ${money(c, c.between(4000, 10_000, 500))}.`,
  },
  {
    id: 'firmenfeier', rarity: 'gelegentlich', tone: 'good',
    apply: (c) => `Ein Unternehmen bucht dein Weingut für seine Sommerfeier mit Weinprobe: ${money(c, c.between(2000, 5000, 100))}.`,
  },
  {
    id: 'fernsehen', rarity: 'gelegentlich', tone: 'good',
    apply: (c) => `Das Regionalfernsehen dreht einen Beitrag auf deinem Hof (${reputation(c, 3)}).`,
  },
  {
    id: 'einbruch', rarity: 'gelegentlich', tone: 'bad', when: (c) => bottleCount(c.player.bottles) >= 150,
    apply: (c) => {
      const target = c.between(50, 150, 10)
      let stolen = 0
      for (const lot of [...c.player.bottles].sort((a, b) => b.quality - a.quality)) {
        if (stolen >= target) break
        const n = Math.min(lot.bottles, target - stolen)
        removeBottles(c.player, lot, n)
        stolen += n
      }
      return `Einbruch im Flaschenlager: ${stolen} Flaschen der besten Weine sind gestohlen.`
    },
  },
  {
    id: 'strom', rarity: 'gelegentlich', tone: 'bad',
    apply: (c) => {
      addEffect(c.player, 'costs', 1.05, 6, 'Höhere Energiepreise')
      return 'Der Stromversorger erhöht die Preise: Ein halbes Jahr lang 5 % höhere Betriebskosten.'
    },
  },
  {
    id: 'influencer', rarity: 'gelegentlich', tone: 'good',
    apply: (c) => {
      addEffect(c.player, 'demand', 1.3, 2, 'Video einer Influencerin')
      return 'Eine Influencerin filmt beim Weinwandern auf deinem Hof – zwei Monate lang 30 % mehr Nachfrage.'
    },
  },
  {
    id: 'rebschnitt', rarity: 'gelegentlich', tone: 'good', months: [1, 2, 3], when: (c) => plantedPlots(c).length > 0,
    apply: (c) => {
      addEffect(c.player, 'quality', 3, 13 - c.state.month, 'Rebschnitt vom Profi')
      return 'Ein erfahrener Rebschnitt-Profi hilft im Weinberg – der Jahrgang wird besser (+3 Güte).'
    },
  },
  {
    id: 'gewitter', rarity: 'gelegentlich', tone: 'bad', months: [5, 6, 7, 8], when: hasBearing,
    apply: (c) => {
      const plot = randomOf(c, bearingPlots(c))
      damageCrop([plot], 0.85)
      return `Ein Gewitter mit Sturmböen reißt in der Lage ${plot.name} Triebe ab – 15 % weniger Ertrag.`
    },
  },
  {
    id: 'zahlungsausfall', rarity: 'gelegentlich', tone: 'bad',
    apply: (c) => `Ein Großkunde ist pleite und zahlt seine Rechnung nicht: ${money(c, -c.between(1500, 4000, 100))}.`,
  },

  // ── Selten: deutliche Folgen ─────────────────────────────────────────────────
  {
    id: 'sturm', rarity: 'selten', tone: 'bad',
    apply: (c) => `Ein Orkan deckt das Dach der Kelterhalle ab: ${money(c, -c.between(6000, 12_000, 1000))}.`,
  },
  {
    id: 'erbschaft', rarity: 'selten', tone: 'good',
    apply: ({ state, player, roll }) => {
      const hectares = 1 + Math.floor(roll() * 2)
      const suitable = (Object.keys(GRAPES) as GrapeId[]).filter((g) => REGIONS[player.regionId].suitability[g] >= 0)
      const grape = roll() < 0.5 ? suitable[Math.floor(roll() * suitable.length)] : null
      const taken = new Set(player.plots.map((p) => p.name))
      let name = 'Erbstück'
      for (let n = 2; taken.has(name); n++) name = `Erbstück ${n}`
      player.plots.push({
        id: newId(state, 'plot'), name, hectares, grape, plantedYear: grape ? state.year - 20 : null, site: 0,
        oechsle: 0, health: 1, cropFactor: 1, harvestedThisYear: false, botrytis: false, iceWineGamble: false,
      })
      return `Eine Großtante vererbt dir einen Weinberg: ${hectares} ha ${grape ? GRAPES[grape].name : 'Brache'}.`
    },
  },
  {
    id: 'winzer-des-jahres', rarity: 'selten', tone: 'good',
    apply: (c) => {
      c.player.points += 15
      return `Der Weinbauverband kürt dich zum Winzer des Jahres im Gebiet: +15 Punkte, ${reputation(c, 8)}.`
    },
  },
  {
    id: 'reblaus', rarity: 'selten', tone: 'bad', months: [5, 6, 7, 8, 9], when: (c) => plantedPlots(c).length > 0,
    apply: (c) => {
      const plot = randomOf(c, plantedPlots(c))
      plot.health = Math.max(0, plot.health - 0.3)
      plot.cropFactor *= 0.7
      return `Reblaus-Befall in der Lage ${plot.name}! Bekämpfung ${money(c, -3000)}, 30 % weniger Ertrag in diesem Jahr.`
    },
  },
  {
    id: 'handelskette', rarity: 'selten', tone: 'good',
    apply: (c) => {
      addEffect(c.player, 'demand', 1.5, 6, 'Listung bei einer Handelskette')
      return 'Eine Feinkostkette listet deine Weine: Ein halbes Jahr lang 50 % mehr Absatz ab Hof und online.'
    },
  },
  {
    id: 'lagerbrand', rarity: 'selten', tone: 'bad', when: (c) => bottleCount(c.player.bottles) >= 200,
    apply: (c) => `Ein Schwelbrand im Flaschenlager: ${destroyBottles(c, 0.2)} Flaschen sind hinüber.`,
  },
  {
    id: 'rechtsstreit', rarity: 'selten', tone: 'bad',
    apply: (c) =>
      `Ein Nachbar verklagt dich wegen eines Grenzsteins – Anwalt und Vergleich: ${money(c, -c.between(5000, 10_000, 1000))}.`,
  },
  {
    id: 'filmdreh', rarity: 'selten', tone: 'good',
    apply: (c) => `Ein Filmteam dreht eine Fernsehserie auf deinem Hof und zahlt Drehgebühr: ${money(c, c.between(10_000, 20_000, 1000))}.`,
  },
  {
    id: 'maezen', rarity: 'selten', tone: 'good',
    apply: (c) => {
      c.player.barriqueCapacityHl += 20
      return 'Ein Mäzen aus der Stadt schenkt dir neue Barriquefässer: +20 hl Barrique-Kapazität.'
    },
  },
  {
    id: 'preiskampf', rarity: 'selten', tone: 'bad',
    apply: (c) => {
      addEffect(c.player, 'price', 0.92, 4, 'Preiskampf der Discounter')
      return 'Discounter verramschen Wein aus deinem Gebiet: Vier Monate lang 8 % niedrigere Preise.'
    },
  },
  {
    id: 'tankleck', rarity: 'selten', tone: 'bad', when: (c) => c.player.cellar.some((b) => !b.barrique),
    apply: (c) => {
      const batch = c.player.cellar.filter((b) => !b.barrique).sort((a, b) => b.hectoliters - a.hectoliters)[0]
      const lost = Math.max(1, Math.round(batch.hectoliters * 0.3))
      const label = wineLabel(batch)
      removeBatchVolume(c.player, batch, Math.min(lost, batch.hectoliters))
      return `Ein Tankventil bricht über Nacht: ${lost} hl ${label} laufen in den Gully.`
    },
  },

  // ── Sehr selten: drastisch ───────────────────────────────────────────────────
  {
    id: 'jahrhundertunwetter', rarity: 'sehr-selten', tone: 'bad', months: [5, 6, 7, 8, 9], when: hasBearing,
    apply: (c) => {
      damageCrop(bearingPlots(c), 0.3)
      return `Jahrhundertunwetter! Hagel und Sturzfluten vernichten 70 % der Trauben, Schäden an Mauern und Wegen: ${money(c, -20_000)}.`
    },
  },
  {
    id: 'kellerbrand', rarity: 'sehr-selten', tone: 'bad',
    apply: (c) => {
      let hl = 0
      for (const batch of [...c.player.cellar]) {
        const lost = Math.round(batch.hectoliters * 0.5)
        hl += lost
        removeBatchVolume(c.player, batch, lost)
      }
      const bottles = destroyBottles(c, 0.3)
      return `Großbrand im Weinkeller! ${hl} hl Wein und ${bottles} Flaschen verloren, Sanierung ${money(c, -25_000)}.`
    },
  },
  {
    id: 'weinpapst', rarity: 'sehr-selten', tone: 'good',
    apply: (c) => {
      c.player.points += 40
      addEffect(c.player, 'demand', 2, 6, '100 Punkte vom Weinpapst')
      return `Sensation: Ein weltberühmter Weinkritiker vergibt 100 Punkte! +40 Punkte, ${reputation(c, 20)}, ein halbes Jahr doppelte Nachfrage.`
    },
  },
  {
    id: 'vermoegen', rarity: 'sehr-selten', tone: 'good',
    apply: (c) => `Ein ausgewanderter Onkel hinterlässt dir sein Vermögen: ${money(c, 150_000)}!`,
  },
  {
    id: 'hangrutsch', rarity: 'sehr-selten', tone: 'bad', when: (c) => c.player.plots.length >= 2,
    apply: (c) => {
      const plot = randomOf(c, c.player.plots)
      c.player.plots = c.player.plots.filter((p) => p !== plot)
      return `Hangrutsch! Die Lage ${plot.name} (${plot.hectares} ha) ist abgerutscht und für immer verloren.`
    },
  },
  {
    id: 'gebietsskandal', rarity: 'sehr-selten', tone: 'bad',
    apply: ({ state, player }) => {
      for (const p of state.players.filter((q) => q.regionId === player.regionId && !q.bankrupt)) {
        changeReputation(p, -10)
        addEffect(p, 'price', 0.8, 12, 'Weinskandal im Anbaugebiet')
      }
      return `Weinskandal im Anbaugebiet ${REGIONS[player.regionId].name}: Eine Großkellerei hat gepanscht. Alle Winzer der Region verlieren Ansehen, ein Jahr lang 20 % niedrigere Preise.`
    },
  },
  {
    id: 'exportboom', rarity: 'sehr-selten', tone: 'good',
    apply: (c) => {
      addEffect(c.player, 'price', 1.2, 12, 'Exportboom')
      return 'Deutscher Wein ist in Asien plötzlich Kult: Ein Jahr lang 20 % höhere Preise.'
    },
  },
]

/** Ereignisse für alle: Krise der Großkellereien halbiert den Fassweinpreis für ein halbes Jahr. */
export function marketEvents(state: GameState) {
  if (state.bulkCrisisMonths > 0) {
    if (--state.bulkCrisisMonths === 0) addLog(state, null, 'Die Großkellereien zahlen wieder normale Fassweinpreise.')
    return
  }
  if (nextFloat(state.rng) < CRISIS_CHANCE) {
    state.bulkCrisisMonths = CRISIS_MONTHS
    addLog(state, null, `Eine Großkellerei ist pleite: ${CRISIS_MONTHS} Monate lang gibt es nur den halben Fassweinpreis.`, 'bad')
  }
}

export function context(state: GameState, player: Player): EventContext {
  const roll = () => nextFloat(state.rng)
  return {
    state,
    player,
    roll,
    between: (min, max, step = 1) => min + Math.round((roll() * (max - min)) / step) * step,
  }
}

/** Schonfrist: Im ersten Jahr, wenn die Kasse am knappsten ist, bleiben schwere Rückschläge aus. */
const isHeavyBlow = (e: EstateEventDef) => e.tone === 'bad' && (e.rarity === 'selten' || e.rarity === 'sehr-selten')

/** Ereignisse, die gerade eintreten können – mit Gewicht nach Seltenheit */
export function possibleEvents(state: GameState, player: Player): EstateEventDef[] {
  const ctx = context(state, player)
  return ESTATE_EVENTS.filter(
    (e) =>
      (!e.months || e.months.includes(state.month)) && (!e.when || e.when(ctx)) && !(state.year === 1 && isHeavyBlow(e)),
  )
}

/** Weitere Kandidaten für die Monatsziehung, etwa Entscheidungsereignisse */
export interface ExtraCandidate {
  rarity: Rarity
  trigger: () => void
}

/** Würfelt höchstens ein Ereignis für ein Weingut aus – aus dem Katalog und den zusätzlichen Kandidaten. */
export function estateEvents(state: GameState, player: Player, extra: ExtraCandidate[] = []) {
  if (nextFloat(state.rng) >= EVENT_CHANCE) return
  const candidates: ExtraCandidate[] = [
    ...possibleEvents(state, player).map((e) => ({ rarity: e.rarity, trigger: () => triggerEvent(state, player, e) })),
    ...extra,
  ]
  const total = candidates.reduce((sum, e) => sum + RARITY_WEIGHT[e.rarity], 0)
  let pick = nextFloat(state.rng) * total
  const chosen = candidates.find((e) => (pick -= RARITY_WEIGHT[e.rarity]) < 0) ?? candidates.at(-1)
  chosen?.trigger()
}

export function triggerEvent(state: GameState, player: Player, event: EstateEventDef) {
  const text = event.apply(context(state, player))
  // Drastische Ereignisse erfahren alle am Tisch
  const isPublic = event.rarity === 'sehr-selten' || event.rarity === 'selten'
  addLog(state, isPublic ? null : player.id, isPublic ? `${player.name}: ${text}` : text, event.tone)
}

/** Effekte laufen monatlich ab. */
export function tickEffects(state: GameState, player: Player) {
  for (const effect of player.effects) effect.monthsLeft--
  for (const effect of player.effects.filter((e) => e.monthsLeft <= 0)) {
    addLog(state, player.id, `Vorbei: ${effect.label}.`)
  }
  player.effects = player.effects.filter((e) => e.monthsLeft > 0)
}
