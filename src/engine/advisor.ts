import { activeHumans, runAiTurns } from './ai'
import { COMPETITIONS, ICE_WINE_MIN_OECHSLE, REGISTER_MIN_BOTTLES } from './data/economy'
import { applyAction, harvestPreview, MONTH_NAMES } from './game'
import { qualityInfo } from './data/quality'
import { HARVEST_MONTHS, PLANT_MONTHS, currentPlayer, plotAgeFactor } from './rules'
import type { GameState, Player } from './types'

/** Bereich der Oberfläche, in dem sich ein Hinweis erledigen lässt */
export type HintArea = 'hof' | 'weinberg' | 'keller' | 'betrieb'

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
  if (player.decision) add('hof', `Entscheidung gefragt: ${player.decision.title} – bis Monatsende.`)
  if (player.exportOffer) add('hof', `Exportanfrage aus ${player.exportOffer.country} – nur diesen Monat gültig.`)
  const lots = state.auction?.lots.filter((l) => l.regionId === player.regionId && l.status !== 'sold' && l.status !== 'unsold') ?? []
  if (state.auction?.phase === 'announced' && lots.length > 0) {
    add('hof', `📣 Nächsten Monat werden ${lots.length} Weinberg(e) in deinem Gebiet versteigert – Geld bereithalten.`)
  }
  if (state.auction?.phase === 'live' && lots.some((l) => l.awaiting !== null)) {
    add('hof', '🔨 Live-Versteigerung läuft – jetzt mitbieten!')
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
}

/**
 * Beendet Monate, bis eine wichtige Entscheidung ansteht, das Spiel endet oder `maxMonths` vergangen sind.
 * Nur sinnvoll mit genau einem Menschen am Tisch – die KI zieht wie gewohnt mit.
 */
export function fastForward(state: GameState, maxMonths = 12): FastForwardResult {
  let s = state
  let months = 0
  while (months < maxMonths && !s.winnerId && !s.finished && activeHumans(s).length === 1) {
    s = runAiTurns(applyAction(s, { type: 'endTurn' }))
    months++
    if (monthHints(s, currentPlayer(s)).some((h) => h.important)) break
  }
  return { state: s, months }
}
