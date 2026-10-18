/**
 * Gemeinsame Spielregeln, die mehrere Module brauchen (Weinberg, Keller, Markt, Ereignisse).
 * Bewusst ohne Abhängigkeit zu game.ts, damit keine Import-Zyklen entstehen.
 */
import {
  CLIMATE_WARMTH_PER_YEAR,
  OVERFLOW_PRICE_PER_LITER,
  ROSE_MATURING_MONTHS,
  REPUTATION_SATURATION,
  SITE_QUALITY_BONUS,
  SLOPE_QUALITY,
} from './data/economy'
import { cellarMasterBonus } from './cellarmaster'
import { BIO_LABELS } from './data/bio'
import { GRAPES } from './data/grapes'
import { QUALITY_LEVELS, qualityInfo, type QualityLevel } from './data/quality'
import { REGIONS } from './data/regions'
import type { BottleLot, EffectKind, GameState, Player, Plot, WineBatch, WineInfo } from './types'
import { addLog, formatEuro, newId } from './util'

export const PLANT_MONTHS = [3, 4]
export const HARVEST_MONTHS = [8, 9, 10, 11, 12]

/** Punkteziel, das nie erreicht wird – für Endlosspiel und Partien mit Jahreslimit */
export const NO_POINT_TARGET = Number.MAX_SAFE_INTEGER

export function hasPointTarget(state: GameState): boolean {
  return state.targetPoints < NO_POINT_TARGET
}

/** Endlosspiel: weder Punkteziel noch Jahreslimit – es endet nur durch Insolvenz oder auf Wunsch */
export function isEndless(state: GameState): boolean {
  return !hasPointTarget(state) && !state.yearLimit
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayer]
}

/** Ertragsfähigkeit nach Alter: Pflanzjahr und Folgejahr 0, 3. Jahr 50 %, danach voll. */
export function plotAgeFactor(plot: Plot, year: number): number {
  if (plot.grape === null || plot.plantedYear === null) return 0
  const age = year - plot.plantedYear
  if (age <= 1) return 0
  if (age === 2) return 0.5
  return 1
}

/** Belegter Edelstahltank – Wein im Barrique zählt nicht mit */
export function usedTankHl(player: Player): number {
  return player.cellar.filter((b) => !b.barrique).reduce((sum, b) => sum + b.hectoliters, 0)
}

export function usedBarriqueHl(player: Player): number {
  return player.cellar.filter((b) => b.barrique).reduce((sum, b) => sum + b.hectoliters, 0)
}

/** Zusätzliche Wärme durch den Klimawandel (Skala der Gebietswärme) */
export function climateWarming(state: GameState): number {
  return state.climateChange ? (state.year - 1) * CLIMATE_WARMTH_PER_YEAR : 0
}

/** Güte 0–100 bei der Lese – `oechsle` überschreibt das Mostgewicht (z. B. für Eiswein). */
/** Gemeinsamer Faktor aller laufenden Ereignis-Effekte einer Art; bei `quality` die Summe der Zuschläge */
export function effectValue(player: Player, kind: EffectKind): number {
  const matching = player.effects.filter((e) => e.kind === kind)
  return kind === 'quality'
    ? matching.reduce((sum, e) => sum + e.value, 0)
    : matching.reduce((product, e) => product * e.value, 1)
}

export function computeQuality(player: Player, plot: Plot, year: number, oechsle = plot.oechsle): number {
  const grape = GRAPES[plot.grape!]
  const suitability = REGIONS[player.regionId].suitability[grape.id]
  const bonus =
    cellarMasterBonus(player, grape.id, oechsle, year) +
    plot.site * SITE_QUALITY_BONUS +
    REGIONS[player.regionId].character.slope * SLOPE_QUALITY +
    effectValue(player, 'quality') +
    (player.bioLabel ? BIO_LABELS[player.bioLabel].quality : 0)
  const raw =
    20 + grape.qualityPotential * 4 + suitability * 6 + (oechsle - 70) * 0.6 + (plot.health - 0.5) * 20 + bonus
  return Math.max(0, Math.min(100, Math.round(raw)))
}

/** Rangfolge der Qualitätsstufen; Eiswein zählt wie eine Beerenauslese. */
export function levelRank(level: QualityLevel): number {
  const effective = level === 'eiswein' ? 'beerenauslese' : level
  return QUALITY_LEVELS.findIndex((q) => q.level === effective)
}

/** Stufe nach `steps` Schritten nach oben (ohne Sonderstufen wie Eiswein) */
export function raiseLevel(level: QualityLevel, steps: number): QualityLevel {
  const ordinary = QUALITY_LEVELS.filter((q) => !q.special)
  const index = Math.min(ordinary.length - 1, levelRank(level) + steps)
  return ordinary[index].level
}

export function wineLabel(wine: WineInfo & { sparkling?: boolean }): string {
  const kind = wine.sparkling ? 'Sekt' : qualityInfo(wine.level).name
  return `${GRAPES[wine.grape].name} ${wine.rose ? 'Rosé ' : ''}${kind} (Jg. ${wine.vintage})`
}

/** Ändert die Bekanntheit; Zuwächse schrumpfen, je bekannter das Weingut schon ist. Liefert die tatsächliche Änderung. */
export function changeReputation(player: Player, delta: number): number {
  const effective = delta > 0 ? delta * Math.max(0, 1 - player.reputation / REPUTATION_SATURATION) : delta
  const before = player.reputation
  player.reputation = Math.max(0, Math.min(100, player.reputation + effective))
  return player.reputation - before
}

export function removeBottles(player: Player, lot: BottleLot, bottles: number) {
  lot.bottles -= bottles
  if (lot.bottles <= 0) {
    player.bottles = player.bottles.filter((l) => l.id !== lot.id)
    player.competitionEntries = player.competitionEntries.filter((id) => id !== lot.id)
  }
}

export function removeBatchVolume(player: Player, batch: WineBatch, hectoliters: number) {
  batch.hectoliters -= hectoliters
  if (batch.hectoliters <= 0.001) player.cellar = player.cellar.filter((b) => b.id !== batch.id)
}

/** Legt frischen Most in den Tank; was nicht passt, geht billig an die Kellerei. */
export function storeWine(
  state: GameState,
  player: Player,
  wine: Omit<WineBatch, 'id' | 'monthsUntilReady' | 'adulterated' | 'barrique'>,
) {
  const freeHl = Math.max(0, player.tankCapacityHl - usedTankHl(player))
  const storedHl = Math.min(wine.hectoliters, freeHl)
  const overflowHl = wine.hectoliters - storedHl
  if (storedHl > 0) {
    player.cellar.push({
      ...wine,
      id: newId(state, 'wine'),
      hectoliters: storedHl,
      // Rosé ist schnell trinkfertig
      monthsUntilReady: wine.rose
        ? Math.min(ROSE_MATURING_MONTHS, qualityInfo(wine.level).maturingMonths)
        : qualityInfo(wine.level).maturingMonths,
      adulterated: null,
      barrique: false,
    })
  }
  if (overflowHl > 0) {
    const revenue = Math.round(overflowHl * 100 * OVERFLOW_PRICE_PER_LITER)
    player.money += revenue
    addLog(state, player.id, `Tanks voll! ${overflowHl} hl Most billig abgegeben: +${formatEuro(revenue)}.`)
  }
}
