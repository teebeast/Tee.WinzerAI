import { invoke } from '@tauri-apps/api/core'
import { scheduleNextAuction } from './engine/auction'
import { refreshCandidates, salaryFor } from './engine/cellarmaster'
import { ensureTrends, initTrends } from './engine/trends'
import { checkMilestones, emptyStats } from './engine/milestones'
import type { GameState } from './engine/types'

/**
 * Spielstände: Jede Partie hat einen eigenen Speicherplatz und wird nach jedem Zug gesichert.
 * Die Desktop-App legt sie als JSON-Dateien unter %LOCALAPPDATA%\WinzerAI\Spielstände ab,
 * im Browser liegen sie in localStorage.
 */

const CURRENT_VERSION: GameState['version'] = 16
const SLOT_PREFIX = 'winzer.slot.'
/** Früher gab es nur einen Spielstand – er wird beim ersten Laden zu einem Speicherplatz. */
const LEGACY_KEY = 'winzer.save.v1'

export interface SaveSlot {
  id: string
  /** Zeitpunkt der letzten Sicherung (ms seit 1970) */
  savedAt: number
  state: GameState
}

interface SaveFile {
  format: 1
  savedAt: number
  state: GameState
}

const isDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// Dateizugriffe nacheinander ausführen, damit ein älterer Stand nie einen neueren überschreibt
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task)
  queue = run.catch(() => {})
  return run
}

/** Ältere Spielstände werden angehoben, soweit möglich; unpassende verworfen. */
function migrate(state: GameState): GameState | null {
  const old = state as unknown as { version: number }
  if (old.version === 5) {
    old.version = 6
    state.difficulty = 'normal'
    for (const p of state.players) p.difficulty = p.ai ? null : 'normal'
  }
  if (old.version === 6) {
    // Version 7: Live-Versteigerung in zufälligen Abständen und befristete Ereignis-Effekte
    old.version = 7
    state.auction = null
    scheduleNextAuction(state)
    state.randomEvents = true
    for (const p of state.players) p.effects = []
  }
  if (old.version === 7) {
    // Version 8: Entscheidungsereignisse
    old.version = 8
    for (const p of state.players) p.decision = null
  }
  if (old.version === 8) {
    // Version 9: Kellermeister mit Talent und Fähigkeiten. Ein vorhandener bleibt als erfahrener Allrounder,
    // damit laufende Partien Sekt und Barrique behalten.
    old.version = 9
    for (const p of state.players) {
      const legacy = p as unknown as { hasCellarMaster?: boolean }
      p.cellarMaster = legacy.hasCellarMaster
        ? { name: 'Kellermeister', talent: 5, skills: ['sekt', 'barrique'], salary: salaryFor(5, ['sekt', 'barrique']), hiredYear: state.year }
        : null
      delete legacy.hasCellarMaster
    }
    refreshCandidates(state)
  }
  if (old.version === 9) {
    // Version 10: Markttrends je Rebsorte und für Sekt
    old.version = 10
    initTrends(state)
  }
  if (old.version === 10) {
    // Version 11: Wetterabwehr (Versicherung, Frostkerzen; Netze und Bewässerung sind optional je Parzelle)
    old.version = 11
    for (const p of state.players) {
      p.insuredYear = null
      p.frostCandles = false
    }
  }
  if (old.version === 11) {
    // Version 12: Bio-Siegel in Stufen. Wer bisher schon zertifiziert war (drei Jahre Bio), trägt jetzt Grünblatt.
    old.version = 12
    const now = (state.year - 1) * 12 + state.month
    for (const p of state.players) {
      const legacy = p as unknown as { bioSinceYear?: number | null }
      const sinceYear = legacy.bioSinceYear ?? null
      delete legacy.bioSinceYear
      p.bioSince = p.protection === 'bio' && sinceYear !== null ? (sinceYear - 1) * 12 + 1 : null
      const certified = p.bioSince !== null && state.year - sinceYear! >= 3
      p.bioLabel = certified ? 'basis' : null
      p.bioLabelSince = certified ? now : null
    }
  }
  if (old.version === 12) {
    // Version 13: Kundenaufträge
    old.version = 13
    for (const p of state.players) {
      p.orderOffers = []
      p.orders = []
    }
  }
  if (old.version === 13) {
    // Version 14: Verhältnis der Computergegner zu den anderen Weingütern
    old.version = 14
    for (const p of state.players) p.relations = {}
  }
  if (old.version === 14) {
    // Version 15: Meilensteine. Bereits Erreichtes wird ohne Belohnung eingetragen, die Zähler beginnen bei null.
    old.version = 15
    for (const p of state.players) {
      p.stats = emptyStats()
      p.milestones = {}
    }
    checkMilestones(state, true)
  }
  if (old.version === 15) {
    // Version 16: Rosé (eigener Trend), Federweißer und Straußwirtschaft
    state.version = 16
    ensureTrends(state)
    for (const p of state.players) {
      p.federweisserThisMonth = 0
      p.straussYear = null
    }
  }
  return state.version === CURRENT_VERSION ? state : null
}

function parse(id: string, text: string): SaveSlot | null {
  try {
    const file = JSON.parse(text) as SaveFile
    const state = migrate(file.state)
    return state ? { id, savedAt: file.savedAt, state } : null
  } catch {
    return null
  }
}

/** Neue Speicherplatz-ID, zugleich lesbarer Dateiname, z. B. 2026-10-16_14-03-22-512 */
export function newSaveId(date = new Date()): string {
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_` +
    `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}-${pad(date.getMilliseconds(), 3)}`
  )
}

export function writeSave(id: string, state: GameState): Promise<void> {
  const content = JSON.stringify({ format: 1, savedAt: Date.now(), state } satisfies SaveFile)
  if (isDesktop()) {
    return enqueue(() => invoke<void>('write_save', { id, content })).catch((e) => console.error('Speichern fehlgeschlagen', e))
  }
  try {
    localStorage.setItem(SLOT_PREFIX + id, content)
  } catch {
    // Speichern ist Komfort – ohne Storage läuft das Spiel trotzdem.
  }
  return Promise.resolve()
}

export function deleteSave(id: string): Promise<void> {
  if (isDesktop()) {
    return enqueue(() => invoke<void>('delete_save', { id })).catch((e) => console.error('Löschen fehlgeschlagen', e))
  }
  try {
    localStorage.removeItem(SLOT_PREFIX + id)
  } catch {
    // siehe writeSave
  }
  return Promise.resolve()
}

async function importLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return
    const state = migrate(JSON.parse(raw) as GameState)
    if (state) await writeSave(newSaveId(), state)
    localStorage.removeItem(LEGACY_KEY)
  } catch {
    // Ein unlesbarer Altstand wird ignoriert.
  }
}

/** Alle lesbaren Spielstände, der zuletzt gespielte zuerst */
export async function listSaves(): Promise<SaveSlot[]> {
  await importLegacy()
  let files: { id: string; content: string }[] = []
  try {
    if (isDesktop()) {
      files = await enqueue(() => invoke<{ id: string; content: string }[]>('list_saves'))
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(SLOT_PREFIX)) files.push({ id: key.slice(SLOT_PREFIX.length), content: localStorage.getItem(key)! })
      }
    }
  } catch (e) {
    console.error('Spielstände nicht lesbar', e)
  }
  return files
    .map((f) => parse(f.id, f.content))
    .filter((s): s is SaveSlot => s !== null)
    .sort((a, b) => b.savedAt - a.savedAt)
}

/** Ablageort für die Anzeige; null im Browser */
export async function saveLocation(): Promise<string | null> {
  if (!isDesktop()) return null
  try {
    return await invoke<string>('saves_location')
  } catch {
    return null
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
