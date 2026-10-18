import { AI_ESTATE_NAMES } from './ai'
import { REGIONS, type RegionId } from './data/regions'
import { NO_POINT_TARGET } from './rules'
import { nextFloat, seedFromString } from './rng'
import type { AiProfileId, NewGameOptions, StartSetup } from './types'

export interface ChallengeScenario {
  id: string
  icon: string
  name: string
  description: string
  years: number
  opponents: number
  climateChange: boolean
  start?: StartSetup
}

/** Täglich wechselnde Ausgangslagen – sie gelten für alle Weingüter der Partie, auch für die Gegner. */
export const CHALLENGE_SCENARIOS: ChallengeScenario[] = [
  {
    id: 'klassiker', icon: '🍷', name: 'Klassisches Duell',
    description: 'Ganz normaler Start gegen zwei Computer-Winzer. Wer holt in zehn Jahren die meisten Punkte?',
    years: 10, opponents: 2, climateChange: true,
  },
  {
    id: 'schuldenberg', icon: '💸', name: 'Schuldenberg',
    description: 'Der Hof ist mit 60.000 € Kredit belastet, auf dem Konto liegen nur 30.000 €. Erst konsolidieren, dann glänzen.',
    years: 10, opponents: 2, climateChange: true, start: { money: 30_000, loan: 60_000 },
  },
  {
    id: 'erbe', icon: '📜', name: 'Das große Erbe',
    description: 'Alle zehn Hektar tragen alte Reben – aber das Erbe hat die Kasse geleert: nur 40.000 € Startkapital.',
    years: 8, opponents: 2, climateChange: true, start: { money: 40_000, plots: 'planted' },
  },
  {
    id: 'brache', icon: '🌱', name: 'Neuanfang auf der Brache',
    description: 'Kein einziger Rebstock, dafür 160.000 € Kapital. Was pflanzt du – und wie überbrückst du die Jahre ohne Ernte?',
    years: 12, opponents: 2, climateChange: true, start: { money: 160_000, plots: 'fallow' },
  },
  {
    id: 'sprint', icon: '⚡', name: 'Fünf-Jahres-Sprint',
    description: 'Nur fünf Jahre Zeit gegen drei Gegner. Jede Lese zählt.',
    years: 5, opponents: 3, climateChange: true,
  },
  {
    id: 'name', icon: '⭐', name: 'Bekannter Name',
    description: 'Dein Weingut ist schon bekannt (Bekanntheit 35), aber der Keller fasst nur 150 hl.',
    years: 10, opponents: 2, climateChange: true, start: { reputation: 35, tankHl: 150 },
  },
  {
    id: 'kaltzeit', icon: '❄️', name: 'Wie in alten Zeiten',
    description: 'Ohne Klimawandel: kühlere Jahrgänge, später reif – aber gute Chancen auf Eiswein.',
    years: 10, opponents: 2, climateChange: false,
  },
  {
    id: 'marathon', icon: '🏃', name: 'Marathon',
    description: 'Fünfzehn Jahre gegen drei Gegner. Hier gewinnt, wer langfristig investiert.',
    years: 15, opponents: 3, climateChange: true,
  },
]

/** Datum als JJJJ-MM-TT in Ortszeit */
export function todayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Fortlaufende Tagesnummer – so wechselt das Szenario garantiert von Tag zu Tag. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

export interface DailyChallenge {
  date: string
  scenario: ChallengeScenario
  options: NewGameOptions
}

/**
 * Tages-Challenge: Alle spielen am selben Tag dieselbe Partie – gleiches Szenario, Gebiet, Wetter und dieselben
 * Gegner. Gewertet werden die Punkte am Ende der vorgegebenen Jahre.
 */
export function dailyChallenge(date: string, playerName = 'Du'): DailyChallenge {
  const seed = seedFromString(`winzer-${date}`)
  // Eigener Zufall für die Aufstellung, damit Wetter und Ereignisse allein am Seed hängen
  const setup = { state: seedFromString(`winzer-setup-${date}`) }
  const pick = <T>(items: T[]) => items.splice(Math.floor(nextFloat(setup) * items.length), 1)[0]

  const scenario = CHALLENGE_SCENARIOS[dayNumber(date) % CHALLENGE_SCENARIOS.length]
  const regionId = pick(Object.keys(REGIONS) as RegionId[])
  const profiles = Object.keys(AI_ESTATE_NAMES) as AiProfileId[]
  const opponents = Array.from({ length: scenario.opponents }, () => pick(profiles))

  return {
    date,
    scenario,
    options: {
      seed,
      targetPoints: NO_POINT_TARGET,
      yearLimit: scenario.years,
      climateChange: scenario.climateChange,
      challenge: date,
      difficulty: 'normal',
      start: scenario.start,
      players: [
        { name: playerName, regionId },
        ...opponents.map((ai) => ({ name: AI_ESTATE_NAMES[ai], regionId, ai })),
      ],
    },
  }
}
