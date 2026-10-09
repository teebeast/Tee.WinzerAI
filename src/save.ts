import type { GameState } from './engine/types'

// Für M1 genügt localStorage; laut Design wandert der Spielstand später nach IndexedDB.
const KEY = 'winzer.save.v1'
const CURRENT_VERSION: GameState['version'] = 4

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as GameState
    // Ältere Spielstände passen nicht zum aktuellen Regelwerk und werden verworfen.
    return state.version === CURRENT_VERSION ? state : null
  } catch {
    return null
  }
}

export function saveGame(state: GameState | null) {
  try {
    if (state) localStorage.setItem(KEY, JSON.stringify(state))
    else localStorage.removeItem(KEY)
  } catch {
    // Speichern ist Komfort – ohne Storage läuft das Spiel trotzdem.
  }
}
