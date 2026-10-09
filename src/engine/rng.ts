/**
 * Seed-basierter Zufall (mulberry32). Der Zustand ist eine einzelne Zahl,
 * die im GameState liegt – so bleiben Spielstände reproduzierbar.
 */
export interface Rng {
  state: number
}

export function nextFloat(rng: Rng): number {
  rng.state = (rng.state + 0x6d2b79f5) | 0
  let t = rng.state
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function nextRange(rng: Rng, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min)
}

export function seedFromString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  }
  return h | 0
}
