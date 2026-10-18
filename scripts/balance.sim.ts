/**
 * Balancing-Report: `npm run sim`
 * Jedes KI-Profil spielt in jedem Anbaugebiet mehrere Partien allein, danach treten alle Profile gegeneinander an.
 */
import { it } from 'vitest'
import { AI_PROFILES } from '../src/engine/ai'
import { REGIONS, type RegionId } from '../src/engine/data/regions'
import { simulate } from '../src/engine/simulate'
import { DIFFICULTIES } from '../src/engine/data/economy'
import type { AiProfileId, Difficulty } from '../src/engine/types'

const YEARS = 15
const SEEDS = [1, 2, 3]
/**
 * Für die Schwierigkeitsgrade mehr Seeds: Dieselben Seeds wirken in allen Gebieten ähnlich (Wetter, Ereignisse, Trends),
 * mit nur drei schwankten Pleiten zwischen 2 und 16 von 78 Partien.
 */
const DIFFICULTY_SEEDS = [1, 2, 3, 4, 5, 6]
const profiles = Object.keys(AI_PROFILES) as AiProfileId[]
const regions = Object.keys(REGIONS) as RegionId[]

const avg = (values: number[]) => Math.round(values.reduce((a, b) => a + b, 0) / Math.max(1, values.length))
const pad = (value: string | number, width: number) => String(value).padStart(width)

it('Solo-Partien je Profil und Gebiet', () => {
  const lines = [
    `${'Profil'.padEnd(20)}${'Gebiet'.padEnd(22)}${pad('P. J5', 7)}${pad('P. J10', 8)}${pad('P. J15', 8)}${pad('ha', 5)}${pad('Vermögen', 12)}${pad('pleite', 8)}`,
  ]
  for (const ai of profiles) {
    for (const regionId of regions) {
      const runs = SEEDS.map((seed) => simulate({ seed, years: YEARS, players: [{ regionId, ai }] }).snapshots)
      const at = (year: number) => runs.map((s) => s[year - 1]?.players[0]).filter((p) => p !== undefined)
      const final = at(YEARS)
      // Eine Insolvenz beendet die Partie vorzeitig – dann fehlen Jahresstände.
      const bankrupt = runs.filter((s) => s.length < YEARS || s.at(-1)?.players[0].bankrupt).length
      lines.push(
        AI_PROFILES[ai].name.padEnd(20) +
          REGIONS[regionId].name.padEnd(22) +
          pad(avg(at(5).map((p) => p.points)), 7) +
          pad(avg(at(10).map((p) => p.points)), 8) +
          pad(avg(final.map((p) => p.points)), 8) +
          pad(avg(final.map((p) => p.hectares)), 5) +
          pad(avg(final.map((p) => p.netWorth)).toLocaleString('de-DE'), 12) +
          pad(`${bankrupt}/${SEEDS.length}`, 8),
      )
    }
  }
  console.log(lines.join('\n'))
})

it('Alle Profile gegeneinander', () => {
  for (const regionId of regions) {
    const wins: Record<string, number> = {}
    const points: Record<string, number[]> = {}
    for (const seed of SEEDS) {
      const { snapshots } = simulate({ seed, years: YEARS, players: profiles.map((ai) => ({ regionId, ai })) })
      const final = snapshots.at(-1)!.players
      const best = [...final].sort((a, b) => b.points - a.points)[0]
      wins[best.ai] = (wins[best.ai] ?? 0) + 1
      for (const p of final) (points[p.ai] ??= []).push(p.points)
    }
    console.log(
      `${REGIONS[regionId].name}: ` +
        profiles.map((ai) => `${AI_PROFILES[ai].name} ${avg(points[ai])} P. (${wins[ai] ?? 0} Siege)`).join(' · '),
    )
  }
})

it('Schwierigkeitsgrade (KI unter den Bedingungen der Menschen)', () => {
  const lines = [`${'Grad'.padEnd(12)}${pad('P. J10', 8)}${pad('P. J15', 8)}${pad('Vermögen', 12)}${pad('pleite', 8)}`]
  const levels: (Difficulty | undefined)[] = [undefined, ...(Object.keys(DIFFICULTIES) as Difficulty[])]
  for (const difficulty of levels) {
    const finals: { j10: number; j15: number; worth: number; bankrupt: boolean }[] = []
    for (const ai of ['tradition', 'bio'] as AiProfileId[]) {
      for (const regionId of regions) {
        for (const seed of DIFFICULTY_SEEDS) {
          const { snapshots } = simulate({ seed, years: YEARS, difficulty, players: [{ regionId, ai }] })
          const at = (year: number) => snapshots[year - 1]?.players[0]
          finals.push({
            j10: at(10)?.points ?? 0,
            j15: at(YEARS)?.points ?? 0,
            worth: at(YEARS)?.netWorth ?? 0,
            bankrupt: snapshots.length < YEARS || !!snapshots.at(-1)?.players[0].bankrupt,
          })
        }
      }
    }
    lines.push(
      (difficulty ? DIFFICULTIES[difficulty].name : 'ohne (KI)').padEnd(12) +
        pad(avg(finals.map((f) => f.j10)), 8) +
        pad(avg(finals.map((f) => f.j15)), 8) +
        pad(avg(finals.map((f) => f.worth)).toLocaleString('de-DE'), 12) +
        pad(`${finals.filter((f) => f.bankrupt).length}/${finals.length}`, 8),
    )
  }
  console.log(lines.join('\n'))
})
