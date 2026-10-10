import { REGIONS, type RegionId } from './data/regions'
import { NO_POINT_TARGET } from './rules'
import { seedFromString } from './rng'
import type { NewGameOptions } from './types'

export const CHALLENGE_YEARS = 10

/** Datum als JJJJ-MM-TT in Ortszeit */
export function todayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Tages-Challenge: Alle spielen am selben Tag dieselbe Partie – gleiches Gebiet, gleiches Wetter,
 * gleiche Gegner. Gewertet werden die Punkte nach zehn Jahren.
 */
export function dailyChallenge(date: string, playerName = 'Du'): NewGameOptions {
  const seed = seedFromString(`winzer-${date}`)
  const regionIds = Object.keys(REGIONS) as RegionId[]
  const regionId = regionIds[Math.abs(seed) % regionIds.length]
  return {
    seed,
    targetPoints: NO_POINT_TARGET,
    yearLimit: CHALLENGE_YEARS,
    climateChange: true,
    challenge: date,
    players: [
      { name: playerName, regionId },
      { name: 'Weingut Steinbach', regionId, ai: 'tradition' },
      { name: 'Biohof Lindner', regionId, ai: 'bio' },
    ],
  }
}
