import type { GameState } from './engine/types'

// Für M1 genügt localStorage; laut Design wandert der Spielstand später nach IndexedDB.
const KEY = 'winzer.save.v1'
const CURRENT_VERSION: GameState['version'] = 5

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

const challengeKey = (date: string) => `winzer.challenge.${date}`

/** Bestes eigenes Ergebnis der Tages-Challenge an diesem Datum (nur auf diesem Gerät) */
export function loadChallengeBest(date: string): number | null {
  try {
    const raw = localStorage.getItem(challengeKey(date))
    return raw === null ? null : Number(raw)
  } catch {
    return null
  }
}

/** Speichert das Ergebnis, wenn es besser ist als das bisherige. Liefert true bei neuem Bestwert. */
export function recordChallengeResult(date: string, points: number): boolean {
  const best = loadChallengeBest(date)
  if (best !== null && best >= points) return false
  try {
    localStorage.setItem(challengeKey(date), String(points))
  } catch {
    return false
  }
  return true
}
