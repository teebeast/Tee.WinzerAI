/**
 * Vergleichsprotokolle für die .NET-Portierung: `npm run trace`
 * Reine KI-Partien; nach jedem Zug wird ein Auszug des Zustands festgehalten. Die C#-Engine spielt
 * dieselben Partien nach und muss Zug für Zug dieselben Werte liefern.
 * Ziel: TRACE_OUT oder ../Tee.Winzer.Net/tests/Winzer.Engine.Tests/Traces
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { it } from 'vitest'
import { AI_PROFILES, playAiTurn } from '../src/engine/ai'
import { DIFFICULTIES } from '../src/engine/data/economy'
import { REGIONS, type RegionId } from '../src/engine/data/regions'
import { newGame } from '../src/engine/game'
import { netWorth, totalHectares } from '../src/engine/market'
import type { AiProfileId, Difficulty, GameState } from '../src/engine/types'

interface Scenario {
  name: string
  seed: number
  years: number
  players: { regionId: RegionId; ai: AiProfileId }[]
  difficulty?: Difficulty
  randomEvents?: boolean
  climateChange?: boolean
}

const out = process.env.TRACE_OUT ?? resolve(__dirname, '../../Tee.Winzer.Net/tests/Winzer.Engine.Tests/Traces')
const saves = resolve(out, "..", "Saves")
/** Partien, aus denen nach so vielen Zügen ein Spielstand gesichert wird */
const SAVED = ["alle-mosel", "gemischt-schwierig", "solo-bio-baden"]
const SAVE_AT_TURN = 150
const profiles = Object.keys(AI_PROFILES) as AiProfileId[]
const regions = Object.keys(REGIONS) as RegionId[]

function row(state: GameState) {
  return {
    y: state.year,
    m: state.month,
    cp: state.currentPlayer,
    rng: state.rng.state,
    id: state.nextId,
    p: state.players.map((p) => [
      p.money,
      p.points,
      p.reputation,
      p.loan,
      totalHectares(p),
      netWorth(p),
      p.cellar.reduce((sum, b) => sum + b.hectoliters, 0),
      p.bottles.reduce((sum, l) => sum + l.bottles, 0),
      p.bankrupt ? 1 : 0,
    ]),
  }
}

function run(s: Scenario) {
  let state = newGame({
    seed: s.seed,
    targetPoints: Number.MAX_SAFE_INTEGER,
    randomEvents: s.randomEvents,
    climateChange: s.climateChange,
    players: s.players.map((p, i) => ({ name: `KI ${i + 1}`, regionId: p.regionId, ai: p.ai })),
  })
  if (s.difficulty) {
    for (const p of state.players) {
      p.difficulty = s.difficulty
      p.money = DIFFICULTIES[s.difficulty].startMoney
    }
  }
  const rows = [row(state)]
  while (!state.winnerId && !state.finished && state.year <= s.years) {
    state = playAiTurn(state)
    rows.push(row(state))
    // Spielstand mitten in der Partie im Format der Spielstandsdateien: Die C#-Fassung lädt ihn und muss von dort an
    // dieselben Züge liefern wie dieses Protokoll.
    if (SAVED.includes(s.name) && rows.length - 1 === SAVE_AT_TURN) {
      writeFileSync(resolve(saves, `${s.name}.json`), JSON.stringify({ format: 1, savedAt: 0, turn: SAVE_AT_TURN, state }))
    }
  }
  writeFileSync(resolve(out, `${s.name}.json`), JSON.stringify({ scenario: s, rows }))
}

it('Vergleichsprotokolle schreiben', () => {
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  rmSync(saves, { recursive: true, force: true })
  mkdirSync(saves, { recursive: true })
  const scenarios: Scenario[] = []
  // Jedes Profil allein in jedem Gebiet
  for (const ai of profiles) {
    for (const [i, regionId] of regions.entries()) {
      scenarios.push({ name: `solo-${ai}-${regionId}`, seed: 100 + i, years: 12, players: [{ regionId, ai }] })
    }
  }
  // Alle Profile gegeneinander: Versteigerungen, Kellermeister-Konkurrenz, Sabotage, Verhältnis der Gegner
  for (const [i, regionId] of regions.entries()) {
    scenarios.push({ name: `alle-${regionId}`, seed: 500 + i, years: 10, players: profiles.map((ai) => ({ regionId, ai })) })
  }
  // Gemischte Gebiete, Schwierigkeitsgrade, ohne Ereignisse, ohne Klimawandel
  const mixed = profiles.map((ai, i) => ({ regionId: regions[(i * 3 + 1) % regions.length], ai }))
  scenarios.push({ name: 'gemischt-leicht', seed: 901, years: 10, players: mixed, difficulty: 'leicht' })
  scenarios.push({ name: 'gemischt-schwierig', seed: 902, years: 10, players: mixed, difficulty: 'schwierig' })
  scenarios.push({ name: 'gemischt-ohne-ereignisse', seed: 903, years: 10, players: mixed, randomEvents: false })
  scenarios.push({ name: 'gemischt-ohne-klimawandel', seed: 904, years: 10, players: mixed, climateChange: false })
  scenarios.push({ name: 'lang-mosel', seed: 905, years: 25, players: profiles.map((ai) => ({ regionId: 'mosel' as RegionId, ai })) })
  for (const s of scenarios) run(s)
  console.log(`${scenarios.length} Protokolle nach ${out}`)
})
