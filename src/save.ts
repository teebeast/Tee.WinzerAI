import type { GameState } from './engine/types'

// Für M1 genügt localStorage; laut Design wandert der Spielstand später nach IndexedDB.
const KEY = 'winzer.save.v1'

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as GameState) : null
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
