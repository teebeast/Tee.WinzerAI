import { activeHumans, runAiTurns } from './ai'
import { COMPETITIONS, FEDERWEISSER_MONTHS, ICE_WINE_MIN_OECHSLE, REGISTER_MIN_BOTTLES } from './data/economy'
import { applyAction, formatEuro, harvestPreview, MONTH_NAMES } from './game'
import { qualityInfo } from './data/quality'
import { HARVEST_MONTHS, PLANT_MONTHS, currentPlayer, plotAgeFactor } from './rules'
import { frostCandlesCost, frostChance, insurancePremium, isInsured } from './defense'
import { BIO_LABELS, gameMonth, monthsUntilEligible, nextBioLabel } from './bio'
import { eligibleBottles } from './orders'
import { federweisserCapacity, isFreshMust } from './products'
import { INSURANCE_MONTHS } from './data/economy'
import type { GameState, Player } from './types'

/** Bereich der Oberfläche, in dem sich ein Hinweis erledigen lässt */
export type HintArea = 'hof' | 'weinberg' | 'keller' | 'auftraege' | 'betrieb'

export interface Hint {
  text: string
  /** Wichtige Hinweise unterbrechen das Vorspulen */
  important: boolean
  area: HintArea
}

/** Was steht diesen Monat an? Grundlage für die Aufgabenliste und das Vorspulen. */
export function monthHints(state: GameState, player: Player): Hint[] {
  const hints: Hint[] = []
  const add = (area: HintArea, text: string, important = true) => hints.push({ text, important, area })
  const bearing = player.plots.filter((p) => p.grape && !p.harvestedThisYear && plotAgeFactor(p, state.year) > 0)

  if (player.money < 0) add('betrieb', `Konto im Minus – Kredit aufnehmen oder Wein verkaufen.`)
  if (player.monthsInsolvent > 0) add('betrieb', 'Insolvenzgefahr: Es ist kein Kreditrahmen mehr frei!')
  if (player.decision) {
    const nextMonth = (player.decision.deadline ?? 0) > gameMonth(state)
    add('hof', `Entscheidung gefragt: ${player.decision.title} – bis ${nextMonth ? 'Ende nächsten Monats' : 'Monatsende'}.`)
  }
  const deliverable = player.orders.filter((o) => eligibleBottles(player, o) >= o.bottles)
  if (deliverable.length > 0) {
    add('auftraege', `📦 ${deliverable.length} Auftrag/Aufträge können jetzt geliefert werden.`)
  }
  const urgent = player.orders.filter((o) => o.deadline - gameMonth(state) <= 1 && !deliverable.includes(o))
  if (urgent.length > 0) {
    add('auftraege', `⏰ ${urgent.length} Auftrag/Aufträge laufen bald ab – es fehlen passende Flaschen. Sonst droht Vertragsstrafe.`)
  }
  if (player.orderOffers.length > 0) {
    const fulfillable = player.orderOffers.some((o) => eligibleBottles(player, o) >= o.bottles)
    add('auftraege', `📦 ${player.orderOffers.length} Auftragsanfrage(n) liegen vor${fulfillable ? ' – eine davon kannst du sofort liefern' : ''}.`, fulfillable)
  }
  if (player.exportOffer) add('auftraege', `Exportanfrage aus ${player.exportOffer.country} – nur diesen Monat gültig.`)
  const lots = state.auction?.lots.filter((l) => l.regionId === player.regionId && l.status !== 'sold' && l.status !== 'unsold') ?? []
  if (state.auction?.phase === 'announced' && lots.length > 0) {
    add('hof', `📣 Nächsten Monat werden ${lots.length} Weinberg(e) in deinem Gebiet versteigert – Geld bereithalten.`)
  }
  if (state.auction?.phase === 'live' && lots.some((l) => l.awaiting !== null)) {
    add('hof', '🔨 Live-Versteigerung läuft – jetzt mitbieten!')
  }
  if (player.cellar.some((b) => isFreshMust(state, b)) && FEDERWEISSER_MONTHS.includes(state.month) && federweisserCapacity(player) > 0) {
    add('keller', `🥂 Federweißer-Zeit: Bis zu ${federweisserCapacity(player)} hl frischen Most kannst du diesen Monat direkt verkaufen.`, false)
  }
  const sellable = player.bottles.filter((l) => l.monthsUntilReady === 0).reduce((sum, l) => sum + l.bottles, 0)
  if ([4, 5, 6].includes(state.month) && player.straussYear !== state.year && sellable >= 1000) {
    add('betrieb', '🌳 Ein guter Zeitpunkt für die Straußwirtschaft: vier Monate mehr Gäste ab Hof.', false)
  }
  const nextLabel = nextBioLabel(player)
  if (nextLabel && monthsUntilEligible(state, player) === 0) {
    const info = BIO_LABELS[nextLabel]
    add('weinberg', `${info.icon} Das ${info.name}-Siegel kann jetzt beantragt werden (${formatEuro(info.fee)}).`)
  }
  const frost = frostChance(state, player)
  if (frost > 0 && !player.frostCandles && bearing.length > 0) {
    add(
      'weinberg',
      `🥶 Spätfrostgefahr diesen Monat: ${Math.round(frost * 100)} % – Frostkerzen für ${formatEuro(frostCandlesCost(state, player))} bereitstellen?`,
      frost >= 0.08,
    )
  }
  if (INSURANCE_MONTHS.includes(state.month) && !isInsured(state, player) && insurancePremium(state, player) > 0) {
    add('weinberg', `🛡️ Die Ernte ist für dieses Jahr noch nicht versichert (Prämie ${formatEuro(insurancePremium(state, player))}).`, false)
  }
  if (PLANT_MONTHS.includes(state.month) && player.plots.some((p) => p.grape === null)) {
    add('weinberg', 'Pflanzzeit: Brachflächen können bestockt werden.')
  }

  if (HARVEST_MONTHS.includes(state.month) && bearing.length > 0) {
    const ripe = bearing.filter((p) => !p.iceWineGamble)
    if (state.month >= 11 && ripe.length > 0) {
      add('weinberg', `Letzte Chance: ${ripe.length} Parzelle(n) noch nicht gelesen – ungelesene Trauben verderben zum Jahresende.`)
    } else if (ripe.length > 0) {
      const best = ripe
        .map((p) => harvestPreview(state, player, p))
        .sort((a, b) => b.quality - a.quality)[0]
      add(
        'weinberg',
        `Lesezeit: bis zu ${qualityInfo(best.level).name} möglich. Jetzt lesen oder auf mehr Reife pokern?`,
        best.level !== 'deutscher-wein',
      )
    }
    if (state.month >= 11 && bearing.some((p) => !p.iceWineGamble && p.oechsle >= ICE_WINE_MIN_OECHSLE)) {
      add('weinberg', 'Eiswein möglich: Trauben bis zum Frost hängen lassen?', false)
    }
  }

  const ready = player.cellar.filter((b) => b.monthsUntilReady === 0)
  if (ready.length > 0) add('keller', `${ready.length} Wein(e) im Keller ausgebaut – abfüllen, Sekt machen oder als Fasswein verkaufen.`)
  const unregistered = player.bottles.filter(
    (l) => !l.registered && l.monthsUntilReady === 0 && (l.sparkling || l.level !== 'deutscher-wein') && l.bottles >= REGISTER_MIN_BOTTLES,
  )
  if (unregistered.length > 0) add('keller', `${unregistered.length} Posten warten auf die amtliche Prüfung.`)

  const competition = Object.values(COMPETITIONS).find((c) => c.month === state.month)
  if (competition && player.bottles.some((l) => l.registered && !l.awards.some((a) => a.competition === competition.id))) {
    add('keller', `${competition.name} am Monatsende – Weine anmelden?`)
  }
  if (hints.length === 0) add('betrieb', `Ruhiger ${MONTH_NAMES[state.month - 1]} – Zeit für Marketing oder Investitionen.`, false)
  return hints
}

export interface FastForwardResult {
  state: GameState
  months: number
  /** Die wichtigen Hinweise, die das Vorspulen angehalten haben; leer, wenn die Höchstdauer oder das Spielende erreicht ist */
  reasons: Hint[]
}

/**
 * Beendet Züge, bis ein Mensch etwas Wichtiges zu tun hat, das Spiel endet oder `maxMonths` vergangen sind.
 * Mit mehreren Menschen am Tisch laufen auch deren ruhige Züge durch: Angehalten wird bei dem, der zuerst
 * gefragt ist – etwa weil er sabotiert wurde und reagieren kann. Die KI zieht wie gewohnt mit.
 */
export function fastForward(state: GameState, maxMonths = 12): FastForwardResult {
  const start = gameMonth(state)
  let s = state
  let reasons: Hint[] = []
  while (gameMonth(s) - start < maxMonths && !s.winnerId && !s.finished && activeHumans(s).length > 0) {
    s = runAiTurns(applyAction(s, { type: 'endTurn' }))
    if (s.winnerId || s.finished || activeHumans(s).length === 0) break
    reasons = monthHints(s, currentPlayer(s)).filter((h) => h.important)
    if (reasons.length > 0) break
  }
  return { state: s, months: gameMonth(s) - start, reasons }
}
