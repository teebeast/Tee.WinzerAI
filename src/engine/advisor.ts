import { activeHumans, runAiTurns } from './ai'
import { AUCTION_MONTH, COMPETITIONS, ICE_WINE_MIN_OECHSLE, REGISTER_MIN_BOTTLES } from './data/economy'
import { applyAction, harvestPreview, MONTH_NAMES } from './game'
import { qualityInfo } from './data/quality'
import { HARVEST_MONTHS, PLANT_MONTHS, currentPlayer, plotAgeFactor } from './rules'
import type { GameState, Player } from './types'

export interface Hint {
  text: string
  /** Wichtige Hinweise unterbrechen das Vorspulen */
  important: boolean
}

/** Was steht diesen Monat an? Grundlage für die Aufgabenliste und das Vorspulen. */
export function monthHints(state: GameState, player: Player): Hint[] {
  const hints: Hint[] = []
  const add = (text: string, important = true) => hints.push({ text, important })
  const bearing = player.plots.filter((p) => p.grape && !p.harvestedThisYear && plotAgeFactor(p, state.year) > 0)

  if (player.money < 0) add(`Konto im Minus – Kredit aufnehmen oder Wein verkaufen.`)
  if (player.monthsInsolvent > 0) add('Insolvenzgefahr: Es ist kein Kreditrahmen mehr frei!')
  if (player.exportOffer) add(`Exportanfrage aus ${player.exportOffer.country} – nur diesen Monat gültig.`)
  if (state.month === AUCTION_MONTH && state.auction.some((p) => p.regionId === player.regionId)) {
    add('Weinbergversteigerung: Gebote bis Monatsende.')
  }
  if (PLANT_MONTHS.includes(state.month) && player.plots.some((p) => p.grape === null)) {
    add('Pflanzzeit: Brachflächen können bestockt werden.')
  }

  if (HARVEST_MONTHS.includes(state.month) && bearing.length > 0) {
    const ripe = bearing.filter((p) => !p.iceWineGamble)
    if (state.month >= 11 && ripe.length > 0) {
      add(`Letzte Chance: ${ripe.length} Parzelle(n) noch nicht gelesen – ungelesene Trauben verderben zum Jahresende.`)
    } else if (ripe.length > 0) {
      const best = ripe
        .map((p) => harvestPreview(state, player, p))
        .sort((a, b) => b.quality - a.quality)[0]
      add(
        `Lesezeit: bis zu ${qualityInfo(best.level).name} möglich. Jetzt lesen oder auf mehr Reife pokern?`,
        best.level !== 'deutscher-wein',
      )
    }
    if (state.month >= 11 && bearing.some((p) => !p.iceWineGamble && p.oechsle >= ICE_WINE_MIN_OECHSLE)) {
      add('Eiswein möglich: Trauben bis zum Frost hängen lassen?', false)
    }
  }

  const ready = player.cellar.filter((b) => b.monthsUntilReady === 0)
  if (ready.length > 0) add(`${ready.length} Wein(e) im Keller ausgebaut – abfüllen, Sekt machen oder als Fasswein verkaufen.`)
  const unregistered = player.bottles.filter(
    (l) => !l.registered && l.monthsUntilReady === 0 && (l.sparkling || l.level !== 'deutscher-wein') && l.bottles >= REGISTER_MIN_BOTTLES,
  )
  if (unregistered.length > 0) add(`${unregistered.length} Posten warten auf die amtliche Prüfung.`)

  const competition = Object.values(COMPETITIONS).find((c) => c.month === state.month)
  if (competition && player.bottles.some((l) => l.registered && !l.awards.some((a) => a.competition === competition.id))) {
    add(`${competition.name} am Monatsende – Weine anmelden?`)
  }
  if (hints.length === 0) add(`Ruhiger ${MONTH_NAMES[state.month - 1]} – Zeit für Marketing oder Investitionen.`, false)
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
