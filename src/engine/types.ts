import type { GrapeId } from './data/grapes'
import type { QualityLevel } from './data/quality'
import type { RegionId } from './data/regions'
import type { Rng } from './rng'
import type { WeatherKind, WeatherOdds } from './weather'

export interface Plot {
  id: string
  name: string
  hectares: number
  grape: GrapeId | null
  plantedYear: number | null
  /** Lagenqualität −1 bis +2, wirkt auf die Güte */
  site: number
  /** Aktuelles Mostgewicht in °Oechsle (0 vor Reifebeginn) */
  oechsle: number
  /** 0–1, sinkt durch Fäulnis */
  health: number
  /** Mengenfaktor des laufenden Jahrgangs (Fäulnis, später Frost/Hagel) */
  cropFactor: number
  harvestedThisYear: boolean
  /** Edelfäule hat eingesetzt: weniger Menge, aber sprunghaft mehr Mostgewicht */
  botrytis: boolean
  /** Trauben bleiben für Eiswein hängen – gelesen wird nur bei starkem Frost im Dezember */
  iceWineGamble: boolean
}

export type AdulterationMethod = 'wasser' | 'zucker' | 'glykol'

export type ProtectionStrategy = 'none' | 'conventional' | 'bio'

export type SabotageKind = 'geruecht' | 'weinberg'

/** Gemeinsame Eigenschaften von Wein im Tank und in der Flasche */
export interface WineInfo {
  grape: GrapeId
  vintage: number
  oechsle: number
  level: QualityLevel
  /** Güte 0–100 */
  quality: number
  /** Heimlich gepanscht – fliegt womöglich bei Prüfung oder Kontrolle auf */
  adulterated: AdulterationMethod | null
}

/** Wein im Tank oder im Barriquefass */
export interface WineBatch extends WineInfo {
  id: string
  hectoliters: number
  monthsUntilReady: number
  /** Reift im kleinen Eichenfass statt im Edelstahltank */
  barrique: boolean
}

export type CompetitionId = 'regional' | 'bund'

export type Medal = 'gold' | 'silber' | 'bronze'

/** Abgefüllter Wein im Flaschenlager */
export interface BottleLot extends WineInfo {
  id: string
  bottles: number
  /** Sekt aus Flaschengärung */
  sparkling: boolean
  /** Sekt reift noch in der Flasche und ist bis dahin nicht verkäuflich */
  monthsUntilReady: number
  /** Amtlich geprüft (AP-Nummer) – Voraussetzung für Prädikat, Großhandel und Prämierung */
  registered: boolean
  awards: { competition: CompetitionId; year: number; medal: Medal }[]
}

export type MarketingKind = 'social' | 'hoffest' | 'messe'

export interface ExportOffer {
  id: string
  country: string
  bottlesPerMonth: number
  pricePerBottle: number
  minLevel: QualityLevel
  minQuality: number
  months: number
}

export interface ExportContract extends ExportOffer {
  monthsLeft: number
  missedMonths: number
}

export type AiProfileId = 'tradition' | 'genossenschaft' | 'bio' | 'schlitzohr'

export type Difficulty = 'leicht' | 'normal' | 'schwierig'

/** Ein Weinberg, der im Februar versteigert wird */
export interface AuctionParcel {
  id: string
  regionId: RegionId
  name: string
  hectares: number
  grape: GrapeId | null
  plantedYear: number | null
  site: number
  minimumBid: number
  /** Verdecktes Gebot auswärtiger Investoren – muss überboten werden */
  outsideBid: number
  /** Verdeckte Gebote der Spieler je Spieler-ID */
  bids: Record<string, number>
}

export interface Player {
  id: string
  name: string
  regionId: RegionId
  /** null = Mensch, sonst das Profil des Computergegners */
  ai: AiProfileId | null
  /** Schwierigkeitsgrad eines menschlichen Spielers; Computergegner (null) spielen ohne Auf- oder Abschlag */
  difficulty: Difficulty | null
  money: number
  points: number
  /** Bekanntheit 0–100 */
  reputation: number
  /** Offener Kreditbetrag */
  loan: number
  tankCapacityHl: number
  barriqueCapacityHl: number
  hasOnlineShop: boolean
  hasVinothek: boolean
  /** Im laufenden Jahr an den Großhandel verkaufte Flaschen – drückt den Preis */
  wholesaleThisYear: number
  hasCellarMaster: boolean
  plots: Plot[]
  cellar: WineBatch[]
  bottles: BottleLot[]
  /** In diesem Monat bereits gebuchte Marketingmaßnahmen */
  marketingThisMonth: MarketingKind[]
  /** Für die nächste Prämierung eingereichte Flaschenposten */
  competitionEntries: string[]
  protection: ProtectionStrategy
  /** Jahr der Umstellung auf Bio; zertifiziert nach drei Jahren */
  bioSinceYear: number | null
  /** Panschen oder Sabotage ist höchstens einmal pro Monat möglich */
  intrigueThisMonth: boolean
  exportOffer: ExportOffer | null
  exportContract: ExportContract | null
  /** Aufeinanderfolgende Monate ohne Liquidität */
  monthsInsolvent: number
  bankrupt: boolean
}

export interface LogEntry {
  year: number
  month: number
  playerId: string | null
  text: string
}

export interface GameState {
  version: 6
  rng: Rng
  year: number
  month: number
  players: Player[]
  /** Index des Spielers, der gerade am Zug ist */
  currentPlayer: number
  /** Prognose für den laufenden Monat */
  forecast: WeatherOdds
  /** Tatsächliches Wetter des Vormonats */
  lastWeather: WeatherKind | null
  targetPoints: number
  winnerId: string | null
  /** Ende ohne Sieger, wenn alle insolvent sind */
  finished: boolean
  /** Weinberge, die im laufenden Februar versteigert werden */
  auction: AuctionParcel[]
  /** Restmonate einer Krise der Großkellereien (Fassweinpreis halbiert) */
  bulkCrisisMonths: number
  /** Jedes Jahr wird es etwas wärmer: frühere Reife, mehr Hitze, weniger Eiswein */
  climateChange: boolean
  /** Spielende nach so vielen Jahren (Tages-Challenge); null = bis zum Punkteziel */
  yearLimit: number | null
  /** Datum der Tages-Challenge (JJJJ-MM-TT) */
  challenge: string | null
  difficulty: Difficulty
  nextId: number
  log: LogEntry[]
}

export type Action =
  | { type: 'plant'; plotId: string; grape: GrapeId }
  | { type: 'harvest'; plotId: string }
  | { type: 'sellBulk'; batchId: string; hectoliters: number }
  | { type: 'bottle'; batchId: string; hectoliters: number }
  | { type: 'register'; lotId: string }
  | { type: 'sellWholesale'; lotId: string; bottles: number }
  | { type: 'enterCompetition'; lotId: string }
  | { type: 'marketing'; kind: MarketingKind }
  | { type: 'expandTank'; hectoliters: number }
  | { type: 'buyOnlineShop' }
  | { type: 'cellarMaster'; hire: boolean }
  | { type: 'borrow'; amount: number }
  | { type: 'repay'; amount: number }
  | { type: 'bid'; parcelId: string; amount: number }
  | { type: 'setProtection'; strategy: ProtectionStrategy }
  | { type: 'gambleIceWine'; plotId: string; gamble: boolean }
  | { type: 'makeSekt'; batchId: string; hectoliters: number }
  | { type: 'adulterate'; batchId: string; method: AdulterationMethod }
  | { type: 'sabotage'; targetId: string; kind: SabotageKind }
  | { type: 'answerExport'; accept: boolean }
  | { type: 'expandBarrique'; hectoliters: number }
  | { type: 'toBarrique'; batchId: string }
  | { type: 'buildVinothek' }
  | { type: 'endTurn' }

export interface NewGameOptions {
  seed: number
  players: { name: string; regionId: RegionId; ai?: AiProfileId | null }[]
  targetPoints?: number
  climateChange?: boolean
  yearLimit?: number | null
  challenge?: string | null
  /** Gilt für die menschlichen Spieler, Standard: normal */
  difficulty?: Difficulty
  /** Abweichende Startbedingungen für alle Weingüter (Szenarien der Tages-Challenge) */
  start?: StartSetup
}

export interface StartSetup {
  money?: number
  loan?: number
  tankHl?: number
  reputation?: number
  /** standard: Hauslage bestockt, Rest Brache · planted: alles mit alten Reben · fallow: alles Brache */
  plots?: 'standard' | 'planted' | 'fallow'
}
