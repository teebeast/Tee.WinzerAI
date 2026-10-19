import type {
  AdulterationMethod,
  CompetitionId,
  Difficulty,
  MarketingKind,
  Medal,
  ProtectionStrategy,
  SabotageKind,
} from '../types'

// Startwerte fürs Balancing, siehe docs/spieldesign.md

export const START_MONEY = 80_000
export const START_TANK_HL = 300
export const START_REPUTATION = 10

/**
 * Schwierigkeitsgrad der menschlichen Spieler: Startkapital sowie Auf- oder Abschlag auf alle Verkaufserlöse
 * (ab Hof, Großhandel, Fasswein) und auf die laufenden Kosten. Computergegner spielen immer mit Faktor 1 –
 * das entspricht etwa dem früheren Spielgefühl zwischen Leicht und Normal.
 */
export const DIFFICULTIES: Record<
  Difficulty,
  { name: string; icon: string; description: string; startMoney: number; priceFactor: number; costFactor: number }
> = {
  leicht: {
    name: 'Leicht', icon: '🌱', description: '100.000 € Startkapital, 5 % höhere Erlöse, 5 % weniger Kosten',
    startMoney: 100_000, priceFactor: 1.05, costFactor: 0.95,
  },
  normal: {
    name: 'Normal', icon: '🍷', description: '80.000 € Startkapital, 5 % niedrigere Erlöse',
    startMoney: START_MONEY, priceFactor: 0.95, costFactor: 1,
  },
  schwierig: {
    name: 'Schwierig', icon: '🔥', description: '70.000 € Startkapital, 10 % niedrigere Erlöse, 5 % höhere Kosten',
    startMoney: 70_000, priceFactor: 0.9, costFactor: 1.05,
  },
}

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

/** Kellermeister: Gehalt aus Grundbetrag, Talent und Fähigkeiten */
export const CELLAR_MASTER_BASE_SALARY = 2_500
export const CELLAR_MASTER_SALARY_PER_TALENT = 350
export const CELLAR_MASTER_SALARY_PER_SKILL = 600
/** Alle so viele Dienstjahre +1 Güte, höchstens bis zum Erfahrungsdeckel */
export const CELLAR_MASTER_YEARS_PER_EXPERIENCE = 4
export const CELLAR_MASTER_MAX_EXPERIENCE = 2
export const CELLAR_MASTER_CANDIDATES = 3

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
    id: 'bund', name: 'Große Rebenkrone', month: 11, fee: 300, maxEntries: 3,
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

/** Gebietscharakter: Steillagen kosten mehr Handarbeit (Pflege und Lese) und bringen mehr Güte; Renommee und
 * Tourismus wirken auf Preise und Nachfrage. */
export const SLOPE_UPKEEP_FACTOR = 0.25
export const SLOPE_HARVEST_FACTOR = 0.35
export const SLOPE_QUALITY = 4
export const PRESTIGE_PRICE_PER_LEVEL = 0.05
export const TOURISM_DEMAND_PER_LEVEL = 0.1

/** Weinbergversteigerung: Abstand zwischen zwei Versteigerungen in Monaten (zufällig) */
export const AUCTION_INTERVAL: [number, number] = [8, 16]
/** Ausrufpreis als Anteil des Schätzwerts */
export const AUCTION_START_SHARE = 0.7
/** Mindestschritt beim Überbieten als Anteil des Schätzwerts (mindestens 1.000 €) */
export const AUCTION_INCREMENT_SHARE = 0.04
/** Höchstgebot auswärtiger Investoren als Anteil des Schätzwerts; nicht bei jedem Los bieten sie mit */
export const AUCTION_INVESTOR_RANGE: [number, number] = [0.85, 1.35]
export const AUCTION_INVESTOR_CHANCE = 0.85
/** Verkauf eines Weinbergs: Anteil des Schätzwerts nach Makler und Notar */
export const PLOT_SALE_SHARE = 0.9
/** Roden einer bestockten Parzelle je ha */
export const CLEARING_COST_PER_HA = 2_000
/** Güte-Bonus je Stufe Lagenqualität */
export const SITE_QUALITY_BONUS = 4

/** Barrique: kleine Eichenfässer – teurer Lagerraum, aber bessere Weine */
export const BARRIQUE_COST_PER_HL = 600
export const BARRIQUE_VALUE_PER_HL = 300
export const BARRIQUE_MONTHS = 12
export const BARRIQUE_QUALITY_RED = 6
export const BARRIQUE_QUALITY_WHITE = 2

/** Vinothek: Verkaufsraum mit Weinprobe – mehr Ab-Hof-Absatz */
export const VINOTHEK_COST = 150_000
export const VINOTHEK_MONTHLY_COST = 1_000
export const VINOTHEK_DEMAND_FACTOR = 1.3
export const VINOTHEK_REPUTATION = 5

/** Marktsättigung: je 20.000 Flaschen im Jahr zahlt der Großhandel 10 % weniger, höchstens 50 % */
export const WHOLESALE_SATURATION_BOTTLES = 200_000
export const WHOLESALE_MIN_FACTOR = 0.5

/** Rosé: kurzer Ausbau und Sommeraufschlag auf den Flaschenpreis */
export const ROSE_MATURING_MONTHS = 3
export const ROSE_SUMMER_MONTHS = [5, 6, 7, 8]
export const ROSE_SUMMER_BONUS = 0.15
/** Federweißer: frischer Most im September und Oktober, Erlös je Liter und Absatz je Monat */
export const FEDERWEISSER_MONTHS = [9, 10]
export const FEDERWEISSER_PRICE_PER_L = 2.5
export const FEDERWEISSER_BASE_HL = 8
export const FEDERWEISSER_HL_PER_REPUTATION = 0.25
/** Straußwirtschaft: einmal im Jahr für vier Monate, Kosten inklusive Aushilfen */
export const STRAUSS_START_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10]
export const STRAUSS_MONTHS = 4
export const STRAUSS_COST = 8_000
export const STRAUSS_DEMAND_FACTOR = 1.4
export const STRAUSS_REPUTATION = 3

/** Markttrends: Spanne des Preisfaktors, Anteil der Annäherung ans Ziel je Monat, Chance auf ein neues Ziel je Sorte und Monat */
export const TREND_RANGE: [number, number] = [0.8, 1.3]
export const TREND_SPEED = 0.08
export const TREND_SHIFT_CHANCE = 0.03
/** Ab dieser Änderung des Ziels wird der Umschwung gemeldet */
export const TREND_NEWS_THRESHOLD = 0.15

/** Pilzwiderstandsfähige Sorten gelten als weniger edel */
export const PIWI_PRICE_FACTOR = 0.9

/** Klimawandel: Wärmezuwachs je Spieljahr (Skala 0–10) und Rückgang der Eiswein-Chance */
export const CLIMATE_WARMTH_PER_YEAR = 0.1
export const CLIMATE_ICE_WINE_LOSS_PER_YEAR = 0.01
export const CLIMATE_HEAT_PER_YEAR = 0.005

/** Personal: eine Vollzeitkraft je 10 ha, mindestens eine, dazwischen anteilig */
export const HECTARES_PER_WORKER = 10

/** Pflanzenschutz: Kosten je bestocktem ha und Saison (verteilt auf Mai–August) und Schutzwirkung */
export const PROTECTION: Record<ProtectionStrategy, { name: string; costPerHa: number; protection: number }> = {
  none: { name: 'Kein Pflanzenschutz', costPerHa: 0, protection: 0 },
  conventional: { name: 'Konventionell', costPerHa: 600, protection: 0.9 },
  bio: { name: 'Bio', costPerHa: 900, protection: 0.7 },
}
export const PROTECTION_MONTHS = [5, 6, 7, 8]
/** Bio-Umstellung: so viele Monate nach Bio-Vorgaben, bevor das erste Siegel beantragt werden kann */
export const BIO_CONVERSION_MONTHS = 24

/** Wetterabwehr */
export const FROST_MONTHS = [4, 5]
/** Spätfrost-Chance je Monat = Frostrisiko des Gebiets × Faktor */
export const FROST_CHANCE_PER_RISK = 0.02
export const FROST_LOSS = 0.4
export const FROST_CANDLES_PER_HA = 400
export const HAIL_MONTHS = [6, 7, 8]
export const HAIL_CHANCE = 0.05
export const HAIL_CLIMATE_PER_YEAR = 0.002
export const HAIL_LOSS = 0.5
export const HAIL_NET_COST_PER_HA = 3_000
/** Anteil des Hagelschadens, den ein Netz abhält */
export const HAIL_NET_PROTECTION = 0.9
export const DROUGHT_MONTHS = [7, 8]
export const DROUGHT_CHANCE = 0.08
export const DROUGHT_CLIMATE_PER_YEAR = 0.008
export const DROUGHT_LOSS = 0.15
export const IRRIGATION_COST_PER_HA = 2_500
/** Ernteversicherung: Abschluss Januar–April, versicherter Wert je ha und Selbstbehalt */
export const INSURANCE_MONTHS = [1, 2, 3, 4]
export const INSURED_VALUE_PER_HA = 8_000
export const INSURANCE_DEDUCTIBLE = 0.2
/** Prämie je tragendem ha: Grundbetrag plus Aufschlag je Stufe Frostrisiko */
export const INSURANCE_BASE_PREMIUM = 210
export const INSURANCE_PREMIUM_PER_FROST_RISK = 85

/** Eiswein: Frost ≤ −7 °C im Dezember; Chance = Basis + Frostrisiko des Gebiets × Faktor */
export const ICE_WINE_BASE_CHANCE = 0.2
export const ICE_WINE_CHANCE_PER_FROST_RISK = 0.04
export const ICE_WINE_YIELD_SHARE = 0.15
export const ICE_WINE_MIN_OECHSLE = 80

/** Sekt: Flaschengärung */
export const SEKT_EXTRA_COST_PER_BOTTLE = 1.0
export const SEKT_MONTHS = 9
export const SEKT_QUALITY_BONUS = 3
export const SEKT_BOTTLE_PRICE = 12
export const SEKT_COMPETITION_BONUS = 6
export const SEKT_POINTS_HIGH = 10
export const SEKT_POINTS_LOW = 3
export const SEKT_HIGH_QUALITY = 80

/** Panschen: Wirkung und Entdeckungsrisiko bei der amtlichen Prüfung */
export const ADULTERATION: Record<
  AdulterationMethod,
  { name: string; volumeFactor: number; qualityDelta: number; levelSteps: number; detection: number }
> = {
  wasser: { name: 'Strecken mit Wasser', volumeFactor: 1.2, qualityDelta: -15, levelSteps: 0, detection: 0.15 },
  zucker: { name: 'Unerlaubte Aufzuckerung', volumeFactor: 1, qualityDelta: 0, levelSteps: 1, detection: 0.25 },
  glykol: { name: '„Frostschutz-Süße“', volumeFactor: 1, qualityDelta: 0, levelSteps: 2, detection: 0.4 },
}
/** Monatliche Chance einer Kontrolle der Weinaufsicht, solange gepanschter Wein im Betrieb ist */
export const CONTROL_CHANCE = 0.03
export const SCANDAL_FINE = 20_000
export const SCANDAL_POINTS = 50
export const SCANDAL_REPUTATION = 40

export const SABOTAGE: Record<SabotageKind, { name: string; cost: number }> = {
  geruecht: { name: 'Gerüchte streuen', cost: 3_000 },
  weinberg: { name: 'Weinberg beschädigen', cost: 8_000 },
}
export const SABOTAGE_RUMOR_REPUTATION = 10
export const SABOTAGE_VINEYARD_LOSS = 0.3
export const SABOTAGE_DETECTION = 0.3
export const SABOTAGE_FINE = 25_000
export const SABOTAGE_REPUTATION = 30
/** Vorspulen läuft höchstens so viele Monate am Stück */
export const AUTO_SKIP_MONTHS = 12
/** Reaktion des Opfers: geschätzter Schaden, den eine Klage oder die Entlarvung als Schadensersatz einbringt */
export const SABOTAGE_DAMAGES: Record<SabotageKind, number> = { geruecht: 8_000, weinberg: 15_000 }
export const DETECTIVE_COST = 4_000
export const DETECTIVE_SUCCESS = 0.6
export const LAWSUIT_COST = 2_000
export const LAWSUIT_SUCCESS = 0.8
/** Nachtwache: Monate Schutz; Saboteure werden dann fast immer erwischt */
export const GUARD_COST = 3_000
export const GUARD_MONTHS = 12
export const GUARD_DETECTION = 0.9

/** Export: Anfragen ab dieser Bekanntheit, Bonus bei vollständiger Erfüllung, Strafe je fehlender Flasche */
export const EXPORT_MIN_REPUTATION = 20
export const EXPORT_OFFER_CHANCE = 0.08
export const EXPORT_COMPLETION_POINTS = 15
export const EXPORT_COMPLETION_REPUTATION = 5
export const EXPORT_PENALTY_PER_BOTTLE = 2
