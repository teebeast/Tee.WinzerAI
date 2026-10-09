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

export interface WineBatch {
  id: string
  grape: GrapeId
  vintage: number
  hectoliters: number
  oechsle: number
  level: QualityLevel
  /** Güte 0–100 */
  quality: number
  monthsUntilReady: number
  registered: boolean
}

export interface Player {
  id: string
  name: string
  regionId: RegionId
  money: number
  points: number
  tankCapacityHl: number
  workers: number
  plots: Plot[]
  cellar: WineBatch[]
}

export interface LogEntry {
  year: number
  month: number
  playerId: string | null
  text: string
}

export interface GameState {
  version: 1
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
  nextId: number
  log: LogEntry[]
}

export type Action =
  | { type: 'plant'; plotId: string; grape: GrapeId }
  | { type: 'harvest'; plotId: string }
  | { type: 'sellBulk'; batchId: string; hectoliters: number }
  | { type: 'register'; batchId: string }
  | { type: 'endTurn' }

export interface NewGameOptions {
  seed: number
  players: { name: string; regionId: RegionId }[]
  targetPoints?: number
}
