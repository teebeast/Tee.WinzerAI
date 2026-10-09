import {
  BIO_CONVERSION_YEARS,
  BIO_PRICE_BONUS,
  BOTTLES_PER_HL,
  CELLAR_MASTER_SALARY,
  COMPETITIONS,
  FARM_SHOP_BASE_DEMAND,
  FARM_SHOP_DEMAND_PER_REPUTATION,
  HECTARES_PER_WORKER,
  LAND_VALUE_PER_HA,
  LOAN_INTEREST_RATE,
  LOAN_TO_VALUE,
  ONLINE_DEMAND_PER_REPUTATION,
  OVERDRAFT_INTEREST_RATE,
  PROTECTION,
  PROTECTION_MONTHS,
  SEKT_BOTTLE_PRICE,
  SEKT_COMPETITION_BONUS,
  SEKT_HIGH_QUALITY,
  SEKT_POINTS_HIGH,
  SEKT_POINTS_LOW,
  TANK_VALUE_PER_HL,
  UPKEEP_PER_HA,
  VINES_VALUE_PER_HA,
  VINEYARD_COST_PER_HA,
  WHOLESALE_SHARE,
  WORKER_SALARY,
  type CompetitionInfo,
} from './data/economy'
import { qualityInfo } from './data/quality'
import type { BottleLot, GameState, Player, WineBatch } from './types'

/** Fasswein-Erlös je hl – in einer Krise der Großkellereien nur die Hälfte */
export function bulkPricePerHl(batch: WineBatch, state: GameState): number {
  const crisis = state.bulkCrisisMonths > 0 ? 0.5 : 1
  return qualityInfo(batch.level).bulkPricePerLiter * 100 * (0.7 + batch.quality / 200) * crisis
}

export function isBioCertified(player: Player, year: number): boolean {
  return player.protection === 'bio' && player.bioSinceYear !== null && year - player.bioSinceYear >= BIO_CONVERSION_YEARS
}

/**
 * Ab-Hof-Preis je Flasche. Ungeprüfte Weine dürfen nur als „Deutscher Wein“ verkauft werden,
 * ungeprüfter Sekt nur als einfacher Schaumwein zum halben Preis.
 */
export function bottlePrice(lot: BottleLot, player: Player, year: number): number {
  let base: number
  if (lot.sparkling) base = SEKT_BOTTLE_PRICE * (lot.registered ? 1 : 0.5)
  else base = qualityInfo(lot.registered ? lot.level : 'deutscher-wein').bottlePrice
  const bio = isBioCertified(player, year) ? 1 + BIO_PRICE_BONUS : 1
  const price = base * (0.5 + lot.quality / 100) * (0.8 + player.reputation / 250) * bio
  return Math.round(price * 100) / 100
}

export function wholesalePrice(lot: BottleLot, player: Player, year: number): number {
  return Math.round(bottlePrice(lot, player, year) * WHOLESALE_SHARE * 100) / 100
}

/** Siegpunkte für die amtliche Prüfung */
export function registrationPoints(lot: BottleLot): number {
  if (lot.sparkling) return lot.quality >= SEKT_HIGH_QUALITY ? SEKT_POINTS_HIGH : SEKT_POINTS_LOW
  return qualityInfo(lot.level).apPoints
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

export function totalHectares(player: Player): number {
  return player.plots.reduce((sum, p) => sum + p.hectares, 0)
}

export function plantedHectares(player: Player): number {
  return player.plots.filter((p) => p.grape !== null).reduce((sum, p) => sum + p.hectares, 0)
}

export function assetValue(player: Player): number {
  return (
    totalHectares(player) * LAND_VALUE_PER_HA +
    plantedHectares(player) * VINES_VALUE_PER_HA +
    player.tankCapacityHl * TANK_VALUE_PER_HL
  )
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
  return lot.quality + (lot.sparkling ? SEKT_COMPETITION_BONUS : qualityInfo(lot.level).competitionBonus)
}

/** Ein Festangestellter je angefangene 10 ha */
export function workersNeeded(player: Player): number {
  return Math.max(1, Math.ceil(totalHectares(player) / HECTARES_PER_WORKER))
}

export interface MonthlyCosts {
  salaries: number
  upkeep: number
  protection: number
  interest: number
  total: number
}

/** Laufende Kosten, die am Ende von `month` abgebucht werden */
export function monthlyCosts(player: Player, month: number): MonthlyCosts {
  const salaries = workersNeeded(player) * WORKER_SALARY + (player.hasCellarMaster ? CELLAR_MASTER_SALARY : 0)
  const upkeep = player.plots.reduce(
    (sum, p) => sum + p.hectares * (p.grape ? VINEYARD_COST_PER_HA : UPKEEP_PER_HA),
    0,
  )
  const protection = PROTECTION_MONTHS.includes(month)
    ? (plantedHectares(player) * PROTECTION[player.protection].costPerHa) / PROTECTION_MONTHS.length
    : 0
  const overdraft = player.money < 0 ? -player.money * OVERDRAFT_INTEREST_RATE : 0
  const interest = (player.loan * LOAN_INTEREST_RATE + overdraft) / 12
  return { salaries, upkeep, protection, interest, total: Math.round(salaries + upkeep + protection + interest) }
}

/** Reinvermögen: Betriebswert plus Konto minus Kredit */
export function netWorth(player: Player): number {
  return assetValue(player) + player.money - player.loan
}
