/**
 * Kleine Klänge per Web Audio – ohne Audiodateien, damit die PWA schlank und offline bleibt.
 * Ohne AudioContext (Tests, alte Browser) bleibt es einfach still.
 */
import type { GameState } from '../engine/types'

export type SoundName = 'click' | 'month' | 'harvest' | 'coin' | 'medal' | 'scandal' | 'frost' | 'hammer' | 'bid'

const MUTE_KEY = 'winzer.muted'
let context: AudioContext | null = null

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // ohne Storage gilt die Einstellung nur bis zum Neuladen
  }
}

/** Tonfolgen als [Frequenz in Hz, Dauer in s] */
const MELODIES: Record<SoundName, [number, number][]> = {
  click: [[660, 0.04]],
  month: [[392, 0.08], [523, 0.12]],
  harvest: [[330, 0.07], [392, 0.07], [494, 0.12]],
  coin: [[988, 0.06], [1319, 0.1]],
  medal: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.25]],
  scandal: [[311, 0.18], [233, 0.3]],
  frost: [[1568, 0.05], [1760, 0.05], [2093, 0.15]],
  hammer: [[196, 0.06], [0, 0.08], [196, 0.06], [0, 0.08], [147, 0.2]],
  bid: [[523, 0.05], [784, 0.08]],
}

export function play(name: SoundName) {
  if (isMuted() || typeof window === 'undefined' || !('AudioContext' in window)) return
  try {
    context ??= new AudioContext()
    let time = context.currentTime
    for (const [frequency, duration] of MELODIES[name]) {
      if (frequency === 0) {
        time += duration // Pause
        continue
      }
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = name === 'scandal' ? 'sawtooth' : 'triangle'
      osc.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, time)
      gain.gain.exponentialRampToValueAtTime(0.12, time + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
      osc.connect(gain).connect(context.destination)
      osc.start(time)
      osc.stop(time + duration + 0.02)
      time += duration
    }
  } catch {
    // Audio ist Beiwerk – Fehler dürfen das Spiel nicht stören
  }
}

const awaitingBids = (state: GameState) => state.auction?.lots.reduce((sum, l) => sum + l.bids.length, 0) ?? 0

/** Wählt anhand der neuen Logbuch-Einträge den passendsten Klang. */
export function soundForChange(before: GameState, after: GameState): SoundName | null {
  // Das Logbuch ist begrenzt – neue Einträge beginnen hinter dem letzten bekannten.
  const last = before.log.at(-1)
  const start = last
    ? after.log.findLastIndex((e) => e.year === last.year && e.month === last.month && e.text === last.text) + 1
    : 0
  const fresh = after.log.slice(start).map((e) => e.text)
  const any = (pattern: RegExp) => fresh.some((t) => pattern.test(t))
  if (any(/Weinskandal|erwischt|insolvent/)) return 'scandal'
  if (any(/Gold|Silber|Bronze|gewinnt|vollständig erfüllt/)) return 'medal'
  if (any(/Klirrender Frost/)) return 'frost'
  if (any(/^🔨 Zuschlag/)) return 'hammer'
  if (any(/gelesen/)) return 'harvest'
  if (any(/verkauft|Großhandel/) && after.month === before.month) return 'coin'
  if (after.month !== before.month || after.year !== before.year) return 'month'
  if (awaitingBids(after) > awaitingBids(before)) return 'bid'
  return 'click'
}
