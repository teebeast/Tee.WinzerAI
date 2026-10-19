import {
  BARRIQUE_VALUE_PER_HL,
  BOTTLES_PER_HL,
  COMPETITIONS,
  DIFFICULTIES,
  FARM_SHOP_BASE_DEMAND,
  FARM_SHOP_DEMAND_PER_REPUTATION,
  HECTARES_PER_WORKER,
  LAND_VALUE_PER_HA,
  LOAN_INTEREST_RATE,
  LOAN_TO_VALUE,
  ONLINE_DEMAND_PER_REPUTATION,
  OVERDRAFT_INTEREST_RATE,
  PIWI_PRICE_FACTOR,
  PROTECTION,
  PRESTIGE_PRICE_PER_LEVEL,
  PROTECTION_MONTHS,
  ROSE_SUMMER_BONUS,
  ROSE_SUMMER_MONTHS,
  SEKT_BOTTLE_PRICE,
  SEKT_COMPETITION_BONUS,
  SEKT_HIGH_QUALITY,
  SEKT_POINTS_HIGH,
  SEKT_POINTS_LOW,
  SLOPE_UPKEEP_FACTOR,
  TANK_VALUE_PER_HL,
  TOURISM_DEMAND_PER_LEVEL,
  UPKEEP_PER_HA,
  VINES_VALUE_PER_HA,
  VINEYARD_COST_PER_HA,
  VINOTHEK_COST,
  VINOTHEK_DEMAND_FACTOR,
  VINOTHEK_MONTHLY_COST,
  WHOLESALE_MIN_FACTOR,
  WHOLESALE_SATURATION_BOTTLES,
  WHOLESALE_SHARE,
  WORKER_SALARY,
  type CompetitionInfo,
} from './data/economy'
import { GRAPES } from './data/grapes'
import { qualityInfo } from './data/quality'
import { REGIONS } from './data/regions'
import { bioInfo } from './data/bio'
import { effectValue } from './rules'
import { trendFactor } from './trends'
import type { BottleLot, GameState, Player, WineBatch } from './types'

/** Auf- oder Abschlag auf Verkaufserlöse durch Schwierigkeitsgrad und laufende Ereignisse */
export function priceFactor(player: Player): number {
  return (player.difficulty ? DIFFICULTIES[player.difficulty].priceFactor : 1) * effectValue(player, 'price')
}

/** Auf- oder Abschlag auf die laufenden Kosten durch Schwierigkeitsgrad und laufende Ereignisse */
export function costFactor(player: Player): number {
  return (player.difficulty ? DIFFICULTIES[player.difficulty].costFactor : 1) * effectValue(player, 'costs')
}

/** Fasswein-Erlös je hl – in einer Krise der Großkellereien nur die Hälfte */
export function bulkPricePerHl(batch: WineBatch, state: GameState, player: Player): number {
  const crisis = state.bulkCrisisMonths > 0 ? 0.5 : 1
  return qualityInfo(batch.level).bulkPricePerLiter * 100 * (0.7 + batch.quality / 200) * crisis * priceFactor(player) * trendFactor(state, batch)
}

/** Trägt das Weingut ein Bio-Siegel? */
export function isBioCertified(player: Player): boolean {
  return player.bioLabel !== null
}

/**
 * Ab-Hof-Preis je Flasche. Ungeprüfte Weine dürfen nur als „Deutscher Wein“ verkauft werden,
 * ungeprüfter Sekt nur als einfacher Schaumwein zum halben Preis.
 */
export function bottlePrice(lot: BottleLot, player: Player, state: GameState): number {
  let base: number
  if (lot.sparkling) base = SEKT_BOTTLE_PRICE * (lot.registered ? 1 : 0.5)
  else base = qualityInfo(lot.registered ? lot.level : 'deutscher-wein').bottlePrice
  const bio = 1 + (bioInfo(player)?.priceBonus ?? 0)
  const prestige = 1 + REGIONS[player.regionId].character.prestige * PRESTIGE_PRICE_PER_LEVEL
  // Rosé geht im Sommer besonders gut
  const roseSeason = lot.rose && !lot.sparkling && ROSE_SUMMER_MONTHS.includes(state.month) ? 1 + ROSE_SUMMER_BONUS : 1
  const piwi = GRAPES[lot.grape].piwi ? PIWI_PRICE_FACTOR : 1
  const price = base * (0.5 + lot.quality / 100) * (0.8 + player.reputation / 250) * bio * prestige * piwi * priceFactor(player) * trendFactor(state, lot) * roseSeason
  return Math.round(price * 100) / 100
}

/** Je mehr Flaschen ein Weingut im Jahr an den Großhandel drückt, desto weniger zahlt er. */
export function wholesaleSaturation(player: Player): number {
  return Math.max(WHOLESALE_MIN_FACTOR, 1 - player.wholesaleThisYear / WHOLESALE_SATURATION_BOTTLES)
}

export function wholesalePrice(lot: BottleLot, player: Player, state: GameState): number {
  return Math.round(bottlePrice(lot, player, state) * WHOLESALE_SHARE * wholesaleSaturation(player) * 100) / 100
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
  if (player.hasVinothek) demand *= VINOTHEK_DEMAND_FACTOR
  demand *= 1 + (bioInfo(player)?.demandBonus ?? 0)
  demand *= 1 + REGIONS[player.regionId].character.tourism * TOURISM_DEMAND_PER_LEVEL
  return Math.round(demand * effectValue(player, 'demand'))
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
    totalHectares(player) * LAND_VALUE_PER_HA * REGIONS[player.regionId].character.landPrice +
    plantedHectares(player) * VINES_VALUE_PER_HA +
    player.tankCapacityHl * TANK_VALUE_PER_HL +
    player.barriqueCapacityHl * BARRIQUE_VALUE_PER_HL +
    (player.hasVinothek ? VINOTHEK_COST / 2 : 0)
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

/** Warum ein Wein nicht zur Prämierung angemeldet werden kann – null, wenn es geht */
export function competitionEntryProblem(player: Player, lot: BottleLot, competition: CompetitionInfo): string | null {
  if (!lot.registered) return 'Nur amtlich geprüfte Weine dürfen teilnehmen.'
  if (player.competitionEntries.includes(lot.id)) return 'Der Wein ist bereits angemeldet.'
  if (lot.awards.some((a) => a.competition === competition.id)) return 'Der Wein wurde hier schon prämiert.'
  if (player.competitionEntries.length >= competition.maxEntries) return `Höchstens ${competition.maxEntries} Weine pro Prämierung.`
  if (player.money < competition.fee) return 'Nicht genug Geld für die Teilnahmegebühr.'
  return null
}

export function competitionBaseScore(lot: BottleLot): number {
  return lot.quality + (lot.sparkling ? SEKT_COMPETITION_BONUS : qualityInfo(lot.level).competitionBonus)
}

/** Personal in Vollzeitkräften: eine je 10 ha, mindestens eine – dazwischen anteilig (Teilzeit) */
export function staffFte(player: Player): number {
  return Math.max(1, totalHectares(player) / HECTARES_PER_WORKER)
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
  // Steillagen brauchen viel mehr Handarbeit
  const slopeUpkeep = 1 + REGIONS[player.regionId].character.slope * SLOPE_UPKEEP_FACTOR
  const salaries =
    staffFte(player) * WORKER_SALARY +
    (player.cellarMaster?.salary ?? 0) +
    (player.hasVinothek ? VINOTHEK_MONTHLY_COST : 0)
  const upkeep = player.plots.reduce(
    (sum, p) => sum + p.hectares * (p.grape ? VINEYARD_COST_PER_HA * slopeUpkeep : UPKEEP_PER_HA),
    0,
  )
  const protection = PROTECTION_MONTHS.includes(month)
    ? (plantedHectares(player) * PROTECTION[player.protection].costPerHa * (bioInfo(player)?.protectionCostFactor ?? 1)) /
      PROTECTION_MONTHS.length
    : 0
  const overdraft = player.money < 0 ? -player.money * OVERDRAFT_INTEREST_RATE : 0
  const interest = (player.loan * LOAN_INTEREST_RATE + overdraft) / 12
  const factor = costFactor(player)
  return {
    salaries: salaries * factor,
    upkeep: upkeep * factor,
    protection: protection * factor,
    interest,
    total: Math.round((salaries + upkeep + protection) * factor + interest),
  }
}

/** Reinvermögen: Betriebswert plus Konto minus Kredit */
export function netWorth(player: Player): number {
  return assetValue(player) + player.money - player.loan
}
