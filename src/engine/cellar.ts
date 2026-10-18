import {
  BARRIQUE_COST_PER_HL,
  BARRIQUE_MONTHS,
  BARRIQUE_QUALITY_RED,
  BARRIQUE_QUALITY_WHITE,
  BOTTLE_COST,
  SEKT_EXTRA_COST_PER_BOTTLE,
  SEKT_MONTHS,
  SEKT_QUALITY_BONUS,
} from './data/economy'
import { bottlingCostFactor, hasSkill } from './cellarmaster'
import { GRAPES } from './data/grapes'
import { hlToBottles } from './market'
import { removeBatchVolume, usedBarriqueHl, wineLabel } from './rules'
import type { BottleLot, GameState, Player, WineBatch } from './types'
import { addLog, formatEuro, newId } from './util'

export const SEKT_COST_PER_BOTTLE = BOTTLE_COST + SEKT_EXTRA_COST_PER_BOTTLE

/** Kosten je Flasche – ein sparsamer Kellermeister drückt sie */
export const bottleCost = (player: Player) => BOTTLE_COST * bottlingCostFactor(player)
export const sektCost = (player: Player) => SEKT_COST_PER_BOTTLE * bottlingCostFactor(player)

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
  const cost = hlToBottles(hectoliters) * bottleCost(player)
  if (player.money < cost) return `Nicht genug Geld für Flaschen (benötigt ${formatEuro(cost)}).`
  return null
}

export function bottle(state: GameState, player: Player, batchId: string, hectoliters: number) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const bottles = hlToBottles(hectoliters)
  const cost = Math.round(bottles * bottleCost(player))
  player.money -= cost
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
  addLog(state, player.id, `${bottles} Flaschen ${wineLabel(batch)} abgefüllt: −${formatEuro(cost)}.`)
}

export function validateSekt(player: Player, batchId: string, hectoliters: number): string | null {
  const batch = readyBatch(player, batchId, hectoliters)
  if (typeof batch === 'string') return batch
  if (!hasSkill(player, 'sekt')) return 'Für Sekt braucht es einen Kellermeister, der die Flaschengärung beherrscht.'
  const cost = hlToBottles(hectoliters) * sektCost(player)
  if (player.money < cost) return `Nicht genug Geld für die Sektherstellung (benötigt ${formatEuro(cost)}).`
  return null
}

/** Grundwein wird in der Flasche ein zweites Mal vergoren und reift neun Monate auf der Hefe. */
export function makeSekt(state: GameState, player: Player, batchId: string, hectoliters: number) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const bottles = hlToBottles(hectoliters)
  const cost = Math.round(bottles * sektCost(player))
  player.money -= cost
  removeBatchVolume(player, batch, hectoliters)
  player.bottles.push(newLot(state, batch, bottles, true))
  addLog(
    state,
    player.id,
    `${bottles} Flaschen Sekt aus ${wineLabel(batch)} angesetzt – fertig in ${SEKT_MONTHS} Monaten (−${formatEuro(cost)}).`,
  )
}

export function barriqueBonus(batch: WineBatch): number {
  return GRAPES[batch.grape].color === 'rot' ? BARRIQUE_QUALITY_RED : BARRIQUE_QUALITY_WHITE
}

export function validateExpandBarrique(player: Player, hectoliters: number): string | null {
  if (!Number.isInteger(hectoliters) || hectoliters <= 0) return 'Ungültige Menge.'
  const cost = hectoliters * BARRIQUE_COST_PER_HL
  if (player.money < cost) return `Nicht genug Geld (benötigt ${formatEuro(cost)}).`
  return null
}

export function expandBarrique(state: GameState, player: Player, hectoliters: number) {
  player.money -= hectoliters * BARRIQUE_COST_PER_HL
  player.barriqueCapacityHl += hectoliters
  addLog(state, player.id, `${hectoliters} hl Barriquefässer gekauft.`)
}

export function validateToBarrique(player: Player, batchId: string): string | null {
  const batch = player.cellar.find((b) => b.id === batchId)
  if (!batch) return 'Unbekannte Charge.'
  if (batch.barrique) return 'Der Wein liegt bereits im Barrique.'
  if (!hasSkill(player, 'barrique')) return 'Für den Barrique-Ausbau braucht es einen Kellermeister mit Erfahrung im Eichenfass.'
  if (batch.level === 'eiswein' || batch.level === 'trockenbeerenauslese') return 'Edelsüße Weine gehören nicht ins Barrique.'
  const free = player.barriqueCapacityHl - usedBarriqueHl(player)
  if (batch.hectoliters > free) return `Im Barrique ist nur Platz für ${free} hl.`
  return null
}

/** Umlagern ins Eichenfass: längere Reife, dafür mehr Güte (vor allem bei Rotwein) – und Platz im Tank. */
export function toBarrique(state: GameState, player: Player, batchId: string) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const bonus = barriqueBonus(batch)
  batch.barrique = true
  batch.quality = Math.min(100, batch.quality + bonus)
  batch.monthsUntilReady = Math.max(batch.monthsUntilReady, BARRIQUE_MONTHS)
  addLog(state, player.id, `${wineLabel(batch)} reift jetzt ${BARRIQUE_MONTHS} Monate im Barrique (+${bonus} Güte).`)
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
