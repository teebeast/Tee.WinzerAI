import type { CompetitionId, MarketingKind, Medal } from '../types'

// Startwerte fürs Balancing, siehe docs/spieldesign.md

export const START_MONEY = 80_000
export const START_TANK_HL = 300
export const START_REPUTATION = 10

export const WORKER_SALARY = 2_500
/** Monatliche Kosten je ha: Brache bzw. Bewirtschaftung bestockter Fläche */
export const UPKEEP_PER_HA = 50
export const VINEYARD_COST_PER_HA = 350
export const HARVEST_COST_PER_HA = 1_500
export const OVERFLOW_PRICE_PER_LITER = 0.5

export const BOTTLES_PER_HL = 133
export const BOTTLE_COST = 0.6
export const REGISTER_FEE = 150
/** Mindestgröße einer Prüfcharge: 5 hl */
export const REGISTER_MIN_BOTTLES = 5 * BOTTLES_PER_HL

export const TANK_COST_PER_HL = 200
export const ONLINE_SHOP_COST = 15_000

/** Großhandel zahlt diesen Anteil des Ab-Hof-Preises */
export const WHOLESALE_SHARE = 0.45
/** Anteil des Ab-Hof-Erlöses für Vertrieb, Versand und Verkaufspersonal */
export const DIRECT_SALES_COST_SHARE = 0.2
/** Ab-Hof-Nachfrage in Flaschen pro Monat */
export const FARM_SHOP_BASE_DEMAND = 150
export const FARM_SHOP_DEMAND_PER_REPUTATION = 30
export const ONLINE_DEMAND_PER_REPUTATION = 40

/** Anteil der Bekanntheit, der jeden Monat verloren geht */
export const REPUTATION_DECAY_RATE = 0.03
/** Zuwächse schrumpfen mit steigender Bekanntheit: Faktor (1 − Bekanntheit / Wert) */
export const REPUTATION_SATURATION = 120

export const CELLAR_MASTER_SALARY = 4_000
export const CELLAR_MASTER_QUALITY_BONUS = 5

export interface MarketingInfo {
  kind: MarketingKind
  name: string
  cost: number
  reputation: number
  months: number[]
}

export const MARKETING: Record<MarketingKind, MarketingInfo> = {
  social: { kind: 'social', name: 'Social Media', cost: 1_000, reputation: 1, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  hoffest: { kind: 'hoffest', name: 'Weinprobe/Hoffest', cost: 5_000, reputation: 4, months: [5, 6, 7, 8, 9] },
  messe: { kind: 'messe', name: 'Weinmesse', cost: 12_000, reputation: 8, months: [3] },
}

export interface CompetitionInfo {
  id: CompetitionId
  name: string
  month: number
  fee: number
  maxEntries: number
  /** Mindestwertung je Medaille */
  thresholds: Record<Medal, number>
  points: Record<Medal, number>
  reputation: Record<Medal, number>
}

export const COMPETITIONS: Record<CompetitionId, CompetitionInfo> = {
  regional: {
    id: 'regional', name: 'Regionale Weinprämierung', month: 6, fee: 100, maxEntries: 3,
    thresholds: { gold: 88, silber: 80, bronze: 72 },
    points: { gold: 20, silber: 10, bronze: 5 },
    reputation: { gold: 6, silber: 3, bronze: 1 },
  },
  bund: {
    id: 'bund', name: 'Bundesweinprämierung', month: 11, fee: 300, maxEntries: 3,
    thresholds: { gold: 93, silber: 86, bronze: 79 },
    points: { gold: 60, silber: 30, bronze: 15 },
    reputation: { gold: 15, silber: 8, bronze: 4 },
  },
}

export const MEDAL_NAMES: Record<Medal, string> = { gold: 'Gold', silber: 'Silber', bronze: 'Bronze' }

/** Kredit: Zinssatz p. a. und Beleihungsgrenze */
export const LOAN_INTEREST_RATE = 0.06
/** Überziehungszins p. a. auf ein negatives Konto */
export const OVERDRAFT_INTEREST_RATE = 0.12
export const LOAN_TO_VALUE = 0.5
export const LAND_VALUE_PER_HA = 25_000
export const VINES_VALUE_PER_HA = 15_000
export const TANK_VALUE_PER_HL = 150
/** Monate ohne Liquidität bis zur Insolvenz */
export const INSOLVENCY_MONTHS = 3

/** Weinbergversteigerung */
export const AUCTION_MONTH = 2
/** Mindestgebot als Anteil des Schätzwerts */
export const AUCTION_MIN_BID_SHARE = 0.8
/** Spanne des verdeckten Investorengebots als Anteil des Schätzwerts */
export const AUCTION_OUTSIDE_BID_RANGE: [number, number] = [0.85, 1.35]
/** Güte-Bonus je Stufe Lagenqualität */
export const SITE_QUALITY_BONUS = 4
