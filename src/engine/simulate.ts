import { playAiTurn } from './ai'
import { DIFFICULTIES } from './data/economy'
import type { RegionId } from './data/regions'
import { newGame } from './game'
import { netWorth, totalHectares } from './market'
import type { AiProfileId, Difficulty, GameState } from './types'

export interface SimOptions {
  seed: number
  players: { regionId: RegionId; ai: AiProfileId; name?: string }[]
  years: number
  /** Ohne Angabe praktisch unerreichbar, damit die volle Laufzeit gemessen wird */
  targetPoints?: number
  /** Lässt die KI unter den Bedingungen eines Schwierigkeitsgrads spielen, um dessen Wirkung zu messen */
  difficulty?: Difficulty
}

export interface PlayerSnapshot {
  name: string
  ai: AiProfileId
  regionId: RegionId
  points: number
  money: number
  loan: number
  reputation: number
  hectares: number
  netWorth: number
  bankrupt: boolean
}

export interface YearSnapshot {
  year: number
  players: PlayerSnapshot[]
}

export interface SimResult {
  state: GameState
  /** Stand jeweils am Jahresende */
  snapshots: YearSnapshot[]
}

/** Spielt eine Partie nur mit Computergegnern – Grundlage für Balancing und KI-Tests. */
export function simulate(options: SimOptions): SimResult {
  let state = newGame({
    seed: options.seed,
    targetPoints: options.targetPoints ?? Number.MAX_SAFE_INTEGER,
    players: options.players.map((p, i) => ({ name: p.name ?? `KI ${i + 1}`, regionId: p.regionId, ai: p.ai })),
  })
  if (options.difficulty) {
    for (const p of state.players) {
      p.difficulty = options.difficulty
      p.money = DIFFICULTIES[options.difficulty].startMoney
    }
  }
  const snapshots: YearSnapshot[] = []
  while (!state.winnerId && !state.finished && state.year <= options.years) {
    const year = state.year
    state = playAiTurn(state)
    if (state.year !== year) snapshots.push(snapshot(state, year))
  }
  return { state, snapshots }
}

function snapshot(state: GameState, year: number): YearSnapshot {
  return {
    year,
    players: state.players.map((p) => ({
      name: p.name,
      ai: p.ai!,
      regionId: p.regionId,
      points: p.points,
      money: Math.round(p.money),
      loan: p.loan,
      reputation: Math.round(p.reputation),
      hectares: totalHectares(p),
      netWorth: Math.round(netWorth(p)),
      bankrupt: p.bankrupt,
    })),
  }
}
