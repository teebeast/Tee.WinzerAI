import {
  BOTTLES_PER_HL,
  CELLAR_MASTER_SALARY,
  COMPETITIONS,
  FARM_SHOP_BASE_DEMAND,
  FARM_SHOP_DEMAND_PER_REPUTATION,
  LAND_VALUE_PER_HA,
  LOAN_INTEREST_RATE,
  LOAN_TO_VALUE,
  ONLINE_DEMAND_PER_REPUTATION,
  OVERDRAFT_INTEREST_RATE,
  TANK_VALUE_PER_HL,
  UPKEEP_PER_HA,
  VINES_VALUE_PER_HA,
  VINEYARD_COST_PER_HA,
  WHOLESALE_SHARE,
  WORKER_SALARY,
  type CompetitionInfo,
} from './data/economy'
import { qualityInfo } from './data/quality'
import type { BottleLot, Player, WineBatch } from './types'

export function bulkPricePerHl(batch: WineBatch): number {
  return qualityInfo(batch.level).bulkPricePerLiter * 100 * (0.7 + batch.quality / 200)
}

/** Ab-Hof-Preis je Flasche. Ungeprüfte Weine dürfen nur als „Deutscher Wein“ verkauft werden. */
export function bottlePrice(lot: BottleLot, player: Player): number {
  const level = lot.registered ? lot.level : 'deutscher-wein'
  const price = qualityInfo(level).bottlePrice * (0.5 + lot.quality / 100) * (0.8 + player.reputation / 250)
  return Math.round(price * 100) / 100
}

export function wholesalePrice(lot: BottleLot, player: Player): number {
  return Math.round(bottlePrice(lot, player) * WHOLESALE_SHARE * 100) / 100
}

/** Flaschen, die Hofladen und Online-Shop pro Monat absetzen können */
export function monthlyDemand(player: Player): number {
  let demand = FARM_SHOP_BASE_DEMAND + player.reputation * FARM_SHOP_DEMAND_PER_REPUTATION
  if (player.hasOnlineShop) demand += player.reputation * ONLINE_DEMAND_PER_REPUTATION
  return Math.round(demand)
}

export function hlToBottles(hectoliters: number): number {
  return Math.round(hectoliters * BOTTLES_PER_HL)
}

export function assetValue(player: Player): number {
  const hectares = player.plots.reduce((sum, p) => sum + p.hectares, 0)
  const planted = player.plots.filter((p) => p.grape !== null).reduce((sum, p) => sum + p.hectares, 0)
  return hectares * LAND_VALUE_PER_HA + planted * VINES_VALUE_PER_HA + player.tankCapacityHl * TANK_VALUE_PER_HL
}

export function creditLimit(player: Player): number {
  return Math.floor((assetValue(player) * LOAN_TO_VALUE) / 1000) * 1000
}

export function availableCredit(player: Player): number {
  return Math.max(0, creditLimit(player) - player.loan)
}

/** Die nächste Prämierung, für die man im aktuellen Monat einreichen kann */
export function upcomingCompetition(month: number): CompetitionInfo {
  if (month <= COMPETITIONS.regional.month || month > COMPETITIONS.bund.month) return COMPETITIONS.regional
  return COMPETITIONS.bund
}

export function competitionBaseScore(lot: BottleLot): number {
  return lot.quality + qualityInfo(lot.level).competitionBonus
}

export interface MonthlyCosts {
  salaries: number
  upkeep: number
  interest: number
  total: number
}

/** Laufende Kosten, die am Monatsende abgebucht werden */
export function monthlyCosts(player: Player): MonthlyCosts {
  const salaries = player.workers * WORKER_SALARY + (player.hasCellarMaster ? CELLAR_MASTER_SALARY : 0)
  const upkeep = player.plots.reduce(
    (sum, p) => sum + p.hectares * (p.grape ? VINEYARD_COST_PER_HA : UPKEEP_PER_HA),
    0,
  )
  const overdraft = player.money < 0 ? -player.money * OVERDRAFT_INTEREST_RATE : 0
  const interest = (player.loan * LOAN_INTEREST_RATE + overdraft) / 12
  return { salaries, upkeep, interest, total: Math.round(salaries + upkeep + interest) }
}

/** Reinvermögen: Betriebswert plus Konto minus Kredit */
export function netWorth(player: Player): number {
  return assetValue(player) + player.money - player.loan
}

export function totalHectares(player: Player): number {
  return player.plots.reduce((sum, p) => sum + p.hectares, 0)
}
