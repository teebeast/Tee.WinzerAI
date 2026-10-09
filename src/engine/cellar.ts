import { BOTTLE_COST, SEKT_EXTRA_COST_PER_BOTTLE, SEKT_MONTHS, SEKT_QUALITY_BONUS } from './data/economy'
import { hlToBottles } from './market'
import { removeBatchVolume, wineLabel } from './rules'
import type { BottleLot, GameState, Player, WineBatch } from './types'
import { addLog, formatEuro, newId } from './util'

export const SEKT_COST_PER_BOTTLE = BOTTLE_COST + SEKT_EXTRA_COST_PER_BOTTLE

function readyBatch(player: Player, batchId: string, hectoliters: number): WineBatch | string {
  const batch = player.cellar.find((b) => b.id === batchId)
  if (!batch) return 'Unbekannte Charge.'
  if (batch.monthsUntilReady > 0) return 'Der Wein ist noch nicht ausgebaut.'
  if (!(hectoliters > 0) || hectoliters > batch.hectoliters) return 'Ungültige Menge.'
  return batch
}

export function validateBottle(player: Player, batchId: string, hectoliters: number): string | null {
  const batch = readyBatch(player, batchId, hectoliters)
  if (typeof batch === 'string') return batch
  const cost = hlToBottles(hectoliters) * BOTTLE_COST
  if (player.money < cost) return `Nicht genug Geld für Flaschen (benötigt ${formatEuro(cost)}).`
  return null
}

export function bottle(state: GameState, player: Player, batchId: string, hectoliters: number) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const bottles = hlToBottles(hectoliters)
  player.money -= bottles * BOTTLE_COST
  removeBatchVolume(player, batch, hectoliters)

  // Nachfüllen in einen noch ungeprüften Posten desselben Weins, damit kleine Abfüllungen prüfbar bleiben.
  const existing = player.bottles.find(
    (l) =>
      !l.registered &&
      !l.sparkling &&
      l.grape === batch.grape &&
      l.vintage === batch.vintage &&
      l.level === batch.level &&
      l.quality === batch.quality &&
      l.adulterated === batch.adulterated,
  )
  if (existing) existing.bottles += bottles
  else player.bottles.push(newLot(state, batch, bottles, false))
  addLog(state, player.id, `${bottles} Flaschen ${wineLabel(batch)} abgefüllt: −${formatEuro(bottles * BOTTLE_COST)}.`)
}

export function validateSekt(player: Player, batchId: string, hectoliters: number): string | null {
  const batch = readyBatch(player, batchId, hectoliters)
  if (typeof batch === 'string') return batch
  const cost = hlToBottles(hectoliters) * SEKT_COST_PER_BOTTLE
  if (player.money < cost) return `Nicht genug Geld für die Sektherstellung (benötigt ${formatEuro(cost)}).`
  return null
}

/** Grundwein wird in der Flasche ein zweites Mal vergoren und reift neun Monate auf der Hefe. */
export function makeSekt(state: GameState, player: Player, batchId: string, hectoliters: number) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const bottles = hlToBottles(hectoliters)
  player.money -= bottles * SEKT_COST_PER_BOTTLE
  removeBatchVolume(player, batch, hectoliters)
  player.bottles.push(newLot(state, batch, bottles, true))
  addLog(
    state,
    player.id,
    `${bottles} Flaschen Sekt aus ${wineLabel(batch)} angesetzt – fertig in ${SEKT_MONTHS} Monaten (−${formatEuro(bottles * SEKT_COST_PER_BOTTLE)}).`,
  )
}

function newLot(state: GameState, batch: WineBatch, bottles: number, sparkling: boolean): BottleLot {
  return {
    id: newId(state, 'lot'),
    grape: batch.grape,
    vintage: batch.vintage,
    oechsle: batch.oechsle,
    level: batch.level,
    quality: sparkling ? Math.min(100, batch.quality + SEKT_QUALITY_BONUS) : batch.quality,
    adulterated: batch.adulterated,
    bottles,
    sparkling,
    monthsUntilReady: sparkling ? SEKT_MONTHS : 0,
    registered: false,
    awards: [],
  }
}

/** Monatsende: Wein im Tank und Sekt in der Flasche reifen weiter. */
export function matureCellar(state: GameState, player: Player) {
  for (const batch of player.cellar) {
    if (batch.monthsUntilReady > 0 && --batch.monthsUntilReady === 0) {
      addLog(state, player.id, `${wineLabel(batch)} ist ausgebaut.`)
    }
  }
  for (const lot of player.bottles) {
    if (lot.monthsUntilReady > 0 && --lot.monthsUntilReady === 0) {
      addLog(state, player.id, `${wineLabel(lot)} hat ausgereift und kann geprüft werden.`)
    }
  }
}
