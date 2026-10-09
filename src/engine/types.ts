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
  /** Aktuelles Mostgewicht in °Oechsle (0 vor Reifebeginn) */
  oechsle: number
  /** 0–1, sinkt durch Fäulnis */
  health: number
  /** Mengenfaktor des laufenden Jahrgangs (Fäulnis, später Frost/Hagel) */
  cropFactor: number
  harvestedThisYear: boolean
}

/** Gemeinsame Eigenschaften von Wein im Tank und in der Flasche */
export interface WineInfo {
  grape: GrapeId
  vintage: number
  oechsle: number
  level: QualityLevel
  /** Güte 0–100 */
  quality: number
}

/** Wein im Tank */
export interface WineBatch extends WineInfo {
  id: string
  hectoliters: number
  monthsUntilReady: number
}

export type CompetitionId = 'regional' | 'bund'

export type Medal = 'gold' | 'silber' | 'bronze'

/** Abgefüllter Wein im Flaschenlager */
export interface BottleLot extends WineInfo {
  id: string
  bottles: number
  /** Amtlich geprüft (AP-Nummer) – Voraussetzung für Prädikat, Großhandel und Prämierung */
  registered: boolean
  awards: { competition: CompetitionId; year: number; medal: Medal }[]
}

export type MarketingKind = 'social' | 'hoffest' | 'messe'

export interface Player {
  id: string
  name: string
  regionId: RegionId
  money: number
  points: number
  /** Bekanntheit 0–100 */
  reputation: number
  /** Offener Kreditbetrag */
  loan: number
  tankCapacityHl: number
  hasOnlineShop: boolean
  hasCellarMaster: boolean
  workers: number
  plots: Plot[]
  cellar: WineBatch[]
  bottles: BottleLot[]
  /** In diesem Monat bereits gebuchte Marketingmaßnahmen */
  marketingThisMonth: MarketingKind[]
  /** Für die nächste Prämierung eingereichte Flaschenposten */
  competitionEntries: string[]
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
  version: 2
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
  | { type: 'endTurn' }

export interface NewGameOptions {
  seed: number
  players: { name: string; regionId: RegionId }[]
  targetPoints?: number
}
