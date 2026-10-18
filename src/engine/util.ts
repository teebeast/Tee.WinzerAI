import type { GameState } from './types'

const MAX_LOG = 400

export function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`
}

/** `playerId` null = öffentliche Meldung, die alle Spieler sehen */
export function addLog(state: GameState, playerId: string | null, text: string, tone?: 'good' | 'bad') {
  state.log.push({ year: state.year, month: state.month, playerId, text, ...(tone ? { tone } : {}) })
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG)
}

export function formatEuro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
