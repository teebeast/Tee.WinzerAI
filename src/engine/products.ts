/**
 * Saisonale Produkte: Federweißer (frischer, gärender Most im Herbst) und die Straußwirtschaft (Ausschank auf dem
 * eigenen Hof für vier Monate im Jahr). Rosé ist ein Merkmal des Weins und steckt in Lese, Keller und Preisen.
 */
import {
  FEDERWEISSER_BASE_HL,
  FEDERWEISSER_HL_PER_REPUTATION,
  FEDERWEISSER_MONTHS,
  FEDERWEISSER_PRICE_PER_L,
  STRAUSS_COST,
  STRAUSS_DEMAND_FACTOR,
  STRAUSS_MONTHS,
  STRAUSS_REPUTATION,
  STRAUSS_START_MONTHS,
} from './data/economy'
import { GRAPES } from './data/grapes'
import { addEffect } from './events'
import { priceFactor } from './market'
import { changeReputation, removeBatchVolume } from './rules'
import type { GameState, Player, WineBatch } from './types'
import { addLog, formatEuro } from './util'

/** Name des Effekts, an dem man eine geöffnete Straußwirtschaft erkennt */
export const STRAUSS_EFFECT_LABEL = 'Straußwirtschaft geöffnet'

/** Federweißer aus roten Trauben heißt Roter Rauscher. */
export const federweisserName = (batch: Pick<WineBatch, 'grape'>) =>
  GRAPES[batch.grape].color === 'rot' ? 'Roter Rauscher' : 'Federweißer'

/** Hektoliter, die die Kundschaft in diesem Monat noch abnimmt */
export function federweisserCapacity(player: Player): number {
  const total = Math.round(FEDERWEISSER_BASE_HL + player.reputation * FEDERWEISSER_HL_PER_REPUTATION)
  return Math.max(0, total - player.federweisserThisMonth)
}

export const federweisserPricePerHl = (player: Player) => FEDERWEISSER_PRICE_PER_L * 100 * priceFactor(player)

/** Frischer Most des laufenden Jahrgangs, der noch gärt */
export const isFreshMust = (state: GameState, batch: WineBatch) =>
  batch.vintage === state.year && batch.monthsUntilReady > 0 && !batch.barrique

export function validateFederweisser(state: GameState, player: Player, batchId: string, hectoliters: number): string | null {
  if (!FEDERWEISSER_MONTHS.includes(state.month)) return 'Federweißer gibt es nur im September und Oktober.'
  const batch = player.cellar.find((b) => b.id === batchId)
  if (!batch) return 'Unbekannte Charge.'
  if (!isFreshMust(state, batch)) return 'Federweißer wird nur aus frischem Most des neuen Jahrgangs gemacht.'
  if (!(hectoliters > 0) || hectoliters > batch.hectoliters) return 'Ungültige Menge.'
  const capacity = federweisserCapacity(player)
  if (capacity <= 0) return 'Diesen Monat trinkt niemand mehr Federweißer.'
  if (hectoliters > capacity) return `Diesen Monat nimmt die Kundschaft nur noch ${capacity} hl ab.`
  return null
}

export function sellFederweisser(state: GameState, player: Player, batchId: string, hectoliters: number) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const revenue = Math.round(federweisserPricePerHl(player) * hectoliters)
  const name = federweisserName(batch)
  player.money += revenue
  player.federweisserThisMonth += hectoliters
  removeBatchVolume(player, batch, hectoliters)
  addLog(state, player.id, `${hectoliters} hl ${name} aus ${GRAPES[batch.grape].name} verkauft: +${formatEuro(revenue)}.`)
}

export function validateStrauss(state: GameState, player: Player): string | null {
  if (!STRAUSS_START_MONTHS.includes(state.month)) return 'Die Straußwirtschaft öffnet zwischen März und Oktober.'
  if (player.straussYear === state.year) return 'Die Straußwirtschaft hatte dieses Jahr schon geöffnet.'
  if (player.money < STRAUSS_COST) return `Nicht genug Geld (benötigt ${formatEuro(STRAUSS_COST)}).`
  return null
}

export function openStrauss(state: GameState, player: Player) {
  player.money -= STRAUSS_COST
  player.straussYear = state.year
  addEffect(player, 'demand', STRAUSS_DEMAND_FACTOR, STRAUSS_MONTHS, STRAUSS_EFFECT_LABEL)
  const gain = changeReputation(player, STRAUSS_REPUTATION)
  addLog(
    state,
    player.id,
    `🌳 Die Straußwirtschaft hat geöffnet (${formatEuro(STRAUSS_COST)}): vier Monate mehr Gäste, Bekanntheit +${gain.toFixed(1)}.`,
  )
}
