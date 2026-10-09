import { nextFloat, nextRange, type Rng } from './rng'

export type WeatherKind = 'sonnig' | 'wechselhaft' | 'nass'

export const WEATHER_KINDS: WeatherKind[] = ['sonnig', 'wechselhaft', 'nass']

export type WeatherOdds = Record<WeatherKind, number>

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  sonnig: 'Sonnig',
  wechselhaft: 'Wechselhaft',
  nass: 'Nass',
}

/** Langjähriges Mittel je Monat (Index 0 = Januar) als [sonnig, wechselhaft, nass]. */
const CLIMATE: [number, number, number][] = [
  [0.2, 0.4, 0.4], [0.25, 0.4, 0.35], [0.3, 0.4, 0.3], [0.35, 0.4, 0.25],
  [0.4, 0.35, 0.25], [0.45, 0.35, 0.2], [0.5, 0.3, 0.2], [0.5, 0.3, 0.2],
  [0.45, 0.35, 0.2], [0.35, 0.35, 0.3], [0.2, 0.4, 0.4], [0.15, 0.4, 0.45],
]

/** Wirkung des Wetters auf den Reifezuwachs. */
export const SUN_FACTOR: Record<WeatherKind, number> = {
  sonnig: 1.3,
  wechselhaft: 1.0,
  nass: 0.7,
}

/**
 * Prognose für einen Monat: das Klimamittel, zufällig verschoben.
 * `certainty` (0–1) bestimmt, wie weit sich die Prognose vom Mittel entfernt.
 */
export function makeForecast(rng: Rng, month: number, certainty: number): WeatherOdds {
  const base = CLIMATE[month - 1]
  const raw = base.map((p) => Math.max(0.05, p + nextRange(rng, -0.25, 0.25) * certainty))
  const sum = raw.reduce((a, b) => a + b, 0)
  const rounded = raw.map((p) => Math.round((p / sum) * 100) / 100)
  // Rundungsrest auf „wechselhaft“ buchen, damit die Summe exakt 1 ist.
  rounded[1] = Math.round((1 - rounded[0] - rounded[2]) * 100) / 100
  return { sonnig: rounded[0], wechselhaft: rounded[1], nass: rounded[2] }
}

export function drawWeather(rng: Rng, odds: WeatherOdds): WeatherKind {
  let roll = nextFloat(rng)
  for (const kind of WEATHER_KINDS) {
    roll -= odds[kind]
    if (roll < 0) return kind
  }
  return 'nass'
}
