/**
 * Aktive Wetterabwehr: Frostkerzen, Hagelnetze, Bewässerung und Ernteversicherung.
 * Hier liegen auch die Regeln für Ernteschäden, damit die Versicherung überall gleich zahlt.
 */
import {
  DROUGHT_CHANCE,
  DROUGHT_CLIMATE_PER_YEAR,
  FROST_CANDLES_PER_HA,
  FROST_CHANCE_PER_RISK,
  FROST_MONTHS,
  HAIL_CHANCE,
  HAIL_CLIMATE_PER_YEAR,
  HAIL_NET_COST_PER_HA,
  INSURANCE_BASE_PREMIUM,
  INSURANCE_DEDUCTIBLE,
  INSURANCE_MONTHS,
  INSURANCE_PREMIUM_PER_FROST_RISK,
  INSURED_VALUE_PER_HA,
  IRRIGATION_COST_PER_HA,
} from './data/economy'
import { REGIONS } from './data/regions'
import { plotAgeFactor } from './rules'
import type { GameState, Player, Plot } from './types'
import { addLog, formatEuro } from './util'

/** Reben, die in diesem Jahr noch Trauben tragen */
export function bearingPlots(state: GameState, player: Player): Plot[] {
  return player.plots.filter((p) => p.grape !== null && !p.harvestedThisYear && plotAgeFactor(p, state.year) > 0)
}

const hectares = (plots: Plot[]) => plots.reduce((sum, p) => sum + p.hectares, 0)
const climateYears = (state: GameState) => (state.climateChange ? state.year - 1 : 0)

/** Spätfrost-Chance im laufenden Monat (nur April und Mai) */
export function frostChance(state: GameState, player: Player): number {
  return FROST_MONTHS.includes(state.month) ? REGIONS[player.regionId].frostRisk * FROST_CHANCE_PER_RISK : 0
}

export const hailChance = (state: GameState) => HAIL_CHANCE + climateYears(state) * HAIL_CLIMATE_PER_YEAR

/** Dürre-Chance bei sonnigem Hochsommer – in nassen Gebieten seltener */
export function droughtChance(state: GameState, player: Player): number {
  const base = DROUGHT_CHANCE + climateYears(state) * DROUGHT_CLIMATE_PER_YEAR
  return base * Math.max(0.2, 1 - REGIONS[player.regionId].wetness / 15)
}

export const frostCandlesCost = (state: GameState, player: Player) =>
  Math.round(hectares(bearingPlots(state, player)) * FROST_CANDLES_PER_HA)

export function insurancePremium(state: GameState, player: Player): number {
  const perHa = INSURANCE_BASE_PREMIUM + REGIONS[player.regionId].frostRisk * INSURANCE_PREMIUM_PER_FROST_RISK
  return Math.round((hectares(bearingPlots(state, player)) * perHa) / 10) * 10
}

export const isInsured = (state: GameState, player: Player) => player.insuredYear === state.year

/**
 * Ernteschaden auf den Parzellen: Der Mengenfaktor sinkt um `factor`. Mit Ernteversicherung werden 80 % des
 * verlorenen Werts erstattet. Liefert die Entschädigung.
 */
export function cropLoss(state: GameState, player: Player, plots: Plot[], factor: number, cause: string): number {
  let lostHa = 0
  for (const plot of plots) {
    lostHa += plot.hectares * plot.cropFactor * (1 - factor)
    plot.cropFactor *= factor
  }
  if (!isInsured(state, player) || lostHa <= 0) return 0
  const payout = Math.round((lostHa * INSURED_VALUE_PER_HA * (1 - INSURANCE_DEDUCTIBLE)) / 100) * 100
  player.money += payout
  addLog(state, player.id, `🛡️ Die Ernteversicherung zahlt ${formatEuro(payout)} für den Schaden durch ${cause}.`, 'good')
  return payout
}

// ── Aktionen ──────────────────────────────────────────────────────────────────

export function validateFrostCandles(state: GameState, player: Player): string | null {
  if (!FROST_MONTHS.includes(state.month)) return 'Spätfrost droht nur im April und Mai.'
  if (player.frostCandles) return 'Die Frostkerzen stehen bereits.'
  if (bearingPlots(state, player).length === 0) return 'Es gibt keine tragenden Reben zu schützen.'
  const cost = frostCandlesCost(state, player)
  if (player.money < cost) return `Nicht genug Geld (benötigt ${formatEuro(cost)}).`
  return null
}

export function setFrostCandles(state: GameState, player: Player) {
  const cost = frostCandlesCost(state, player)
  player.money -= cost
  player.frostCandles = true
  addLog(state, player.id, `Frostkerzen für alle tragenden Lagen stehen bereit (${formatEuro(cost)}).`)
}

export function validateInsurance(state: GameState, player: Player): string | null {
  if (!INSURANCE_MONTHS.includes(state.month)) return 'Versicherungen werden nur von Januar bis April abgeschlossen.'
  if (isInsured(state, player)) return 'Die Ernte ist in diesem Jahr bereits versichert.'
  const premium = insurancePremium(state, player)
  if (premium === 0) return 'Es gibt noch keine tragenden Reben zu versichern.'
  if (player.money < premium) return `Nicht genug Geld (Prämie ${formatEuro(premium)}).`
  return null
}

export function insure(state: GameState, player: Player) {
  const premium = insurancePremium(state, player)
  player.money -= premium
  player.insuredYear = state.year
  addLog(state, player.id, `Ernteversicherung für Jahr ${state.year} abgeschlossen (${formatEuro(premium)}).`)
}

type Installation = 'hailNet' | 'irrigation'
const INSTALL: Record<Installation, { cost: number; name: string }> = {
  hailNet: { cost: HAIL_NET_COST_PER_HA, name: 'Hagelnetz' },
  irrigation: { cost: IRRIGATION_COST_PER_HA, name: 'Tröpfchenbewässerung' },
}

export const installCost = (plot: Plot, kind: Installation) => plot.hectares * INSTALL[kind].cost

export function validateInstall(player: Player, plotId: string, kind: Installation): string | null {
  const plot = player.plots.find((p) => p.id === plotId)
  if (!plot) return 'Unbekannte Parzelle.'
  if (plot[kind]) return `${INSTALL[kind].name} ist bereits installiert.`
  const cost = installCost(plot, kind)
  if (player.money < cost) return `Nicht genug Geld (benötigt ${formatEuro(cost)}).`
  return null
}

export function install(state: GameState, player: Player, plotId: string, kind: Installation) {
  const plot = player.plots.find((p) => p.id === plotId)!
  const cost = installCost(plot, kind)
  player.money -= cost
  plot[kind] = true
  addLog(state, player.id, `${plot.name}: ${INSTALL[kind].name} installiert (${formatEuro(cost)}).`)
}
