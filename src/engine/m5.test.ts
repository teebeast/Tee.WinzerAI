import { describe, expect, it } from 'vitest'
import { fastForward, monthHints } from './advisor'
import { playAiTurn } from './ai'
import { CHALLENGE_SCENARIOS, dailyChallenge } from './challenge'
import { DIFFICULTIES, VINOTHEK_COST } from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS } from './data/regions'
import { applyAction, currentPlayer, isEndless, newGame } from './game'
import { bottlePrice, bulkPricePerHl, monthlyCosts, monthlyDemand, wholesalePrice } from './market'
import type { BottleLot, GameState } from './types'
import { simulate } from './simulate'
import { iceWineChance } from './vineyard'

function start(options: { climateChange?: boolean; regionId?: keyof typeof REGIONS } = {}): GameState {
  return newGame({
    seed: 42,
    climateChange: options.climateChange,
    players: [{ name: 'Anna', regionId: options.regionId ?? 'mosel' }],
  })
}

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

describe('Anbaugebiete und Rebsorten', () => {
  it('alle 13 Gebiete bewerten alle 11 Rebsorten', () => {
    const grapes = Object.keys(GRAPES) as GrapeId[]
    expect(Object.keys(REGIONS)).toHaveLength(13)
    expect(grapes).toHaveLength(11)
    for (const region of Object.values(REGIONS)) {
      for (const grape of grapes) expect(region.suitability[grape]).toBeTypeOf('number')
      expect(GRAPES[region.startGrape]).toBeDefined()
      expect(region.suitability[region.startGrape]).toBeGreaterThanOrEqual(1)
    }
  })

  it('PIWI-Sorten sind kaum krankheitsanfällig, verkaufen sich aber etwas schlechter', () => {
    expect(GRAPES.regent.diseaseSusceptibility).toBeLessThan(GRAPES.spaetburgunder.diseaseSusceptibility)
    const player = currentPlayer(start())
    const lot: BottleLot = {
      id: 'x', grape: 'regent', vintage: 1, oechsle: 80, level: 'spaetlese', quality: 70, adulterated: null,
      bottles: 100, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
    }
    expect(bottlePrice(lot, player, 1)).toBeLessThan(bottlePrice({ ...lot, grape: 'lemberger' }, player, 1))
  })
})

describe('Klimawandel', () => {
  it('lässt die Trauben schneller reifen und macht Eiswein seltener', () => {
    const late = (climateChange: boolean) => {
      const state = start({ climateChange })
      state.year = 20 // zwanzig Jahre später
      return state
    }
    expect(iceWineChance(late(true), 'mosel')).toBeLessThan(iceWineChance(late(false), 'mosel'))

    const ripeness = (climateChange: boolean) => {
      const state = late(climateChange)
      return currentPlayer(endMonths(state, 9)).plots[0].oechsle
    }
    expect(ripeness(true)).toBeGreaterThan(ripeness(false))
  })
})

describe('Geldsenken', () => {
  function rich(): GameState {
    const state = start()
    currentPlayer(state).money = 500_000
    return state
  }

  it('Barrique bringt Güte und längere Reife, braucht aber Platz', () => {
    let state = endMonths(start({ regionId: 'ahr' }), 9)
    currentPlayer(state).money = 200_000
    state = applyAction(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
    const batch = currentPlayer(state).cellar[0]
    expect(() => applyAction(state, { type: 'toBarrique', batchId: batch.id })).toThrow('Platz')

    state = applyAction(state, { type: 'expandBarrique', hectoliters: 300 })
    state = applyAction(state, { type: 'toBarrique', batchId: batch.id })
    const aged = currentPlayer(state).cellar[0]
    expect(aged.barrique).toBe(true)
    expect(aged.quality).toBe(Math.min(100, batch.quality + 6)) // Spätburgunder ist rot
    expect(aged.monthsUntilReady).toBe(12)
  })

  it('die Vinothek steigert den Ab-Hof-Absatz', () => {
    const state = rich()
    const built = applyAction(state, { type: 'buildVinothek' })
    expect(currentPlayer(built).money).toBe(500_000 - VINOTHEK_COST)
    expect(monthlyDemand(currentPlayer(built))).toBeGreaterThan(monthlyDemand(currentPlayer(state)))
  })

  it('der Großhandel zahlt weniger, je mehr Flaschen er im Jahr abnimmt', () => {
    const player = currentPlayer(rich())
    const lot: BottleLot = {
      id: 'x', grape: 'riesling', vintage: 1, oechsle: 80, level: 'spaetlese', quality: 80, adulterated: null,
      bottles: 100, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
    }
    const fresh = wholesalePrice(lot, player, 1)
    player.wholesaleThisYear = 60_000
    expect(wholesalePrice(lot, player, 1)).toBeCloseTo(fresh * 0.7, 1)
  })
})

describe('Tages-Challenge', () => {
  /** Die Tage ab dem 2026-10-01 – an aufeinanderfolgenden Tagen kommt jedes Szenario einmal dran */
  const dates = CHALLENGE_SCENARIOS.map((_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
  const dateFor = (id: string) => dates.find((d) => dailyChallenge(d).scenario.id === id)!

  it('ist für alle am selben Tag gleich und wechselt täglich', () => {
    expect(dailyChallenge('2026-10-09')).toEqual(dailyChallenge('2026-10-09'))
    expect(dailyChallenge('2026-10-09').options.seed).not.toBe(dailyChallenge('2026-10-10').options.seed)
    const scenarios = dates.map((d) => dailyChallenge(d).scenario.id)
    expect(new Set(scenarios).size).toBe(CHALLENGE_SCENARIOS.length)
  })

  it('stellt unterschiedliche Gegner und Gebiete auf', () => {
    const challenges = Array.from({ length: 30 }, (_, i) => dailyChallenge(`2026-11-${String(i + 1).padStart(2, '0')}`))
    expect(new Set(challenges.map((c) => c.options.players[0].regionId)).size).toBeGreaterThan(5)
    expect(new Set(challenges.map((c) => c.options.players.slice(1).map((p) => p.ai).join())).size).toBeGreaterThan(5)
    for (const c of challenges) {
      const opponents = c.options.players.slice(1).map((p) => p.ai)
      expect(new Set(opponents).size).toBe(opponents.length)
      expect(opponents).toHaveLength(c.scenario.opponents)
    }
  })

  it('übernimmt die Startbedingungen des Szenarios für alle Weingüter', () => {
    const fallow = dailyChallenge(dateFor('brache'))
    const state = newGame(fallow.options)
    for (const p of state.players) {
      expect(p.money).toBe(fallow.scenario.start!.money)
      expect(p.plots.every((plot) => plot.grape === null)).toBe(true)
    }
    const debt = newGame(dailyChallenge(dateFor('schuldenberg')).options)
    expect(debt.players[0].loan).toBe(60_000)
    expect(debt.players[0].money).toBe(30_000)
  })

  it.each(CHALLENGE_SCENARIOS.map((s) => [s.name, dateFor(s.id)]))('%s ist spielbar und endet pünktlich', (_, date) => {
    const { scenario, options } = dailyChallenge(date)
    // Ohne Menschen: Den eigenen Platz übernimmt ein Traditionswinzer.
    let state = newGame({ ...options, players: options.players.map((p) => ({ ...p, ai: p.ai ?? 'tradition' })) })
    while (!state.finished) state = playAiTurn(state)
    expect(state.year).toBe(scenario.years)
    expect(state.winnerId).not.toBeNull()
    expect(state.players[0].bankrupt).toBe(false)
    expect(state.players[0].points).toBeGreaterThan(0)
  })
})

describe('Schwierigkeitsgrad', () => {
  const lot: BottleLot = {
    id: 'x', grape: 'riesling', vintage: 1, oechsle: 80, level: 'spaetlese', quality: 80, adulterated: null,
    bottles: 100, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
  }
  const game = (difficulty: keyof typeof DIFFICULTIES) =>
    newGame({ seed: 1, difficulty, players: [{ name: 'Anna', regionId: 'mosel' }, { name: 'KI', regionId: 'mosel', ai: 'tradition' }] })

  it('wirkt auf Startkapital, Erlöse und Kosten der Menschen', () => {
    const [easy, hard] = [game('leicht'), game('schwierig')]
    expect(easy.players[0].money).toBe(DIFFICULTIES.leicht.startMoney)
    expect(hard.players[0].money).toBe(DIFFICULTIES.schwierig.startMoney)
    expect(bottlePrice(lot, hard.players[0], 1)).toBeLessThan(bottlePrice(lot, easy.players[0], 1))
    expect(monthlyCosts(hard.players[0], 6).total).toBeGreaterThan(monthlyCosts(easy.players[0], 6).total)
    const batch = { ...lot, hectoliters: 10, monthsUntilReady: 0, barrique: false }
    expect(bulkPricePerHl(batch, hard, hard.players[0])).toBeLessThan(bulkPricePerHl(batch, easy, easy.players[0]))
  })

  it('lässt die Computergegner unverändert', () => {
    const [easy, hard] = [game('leicht').players[1], game('schwierig').players[1]]
    expect(easy.difficulty).toBeNull()
    expect(easy.money).toBe(hard.money)
    expect(bottlePrice(lot, easy, 1)).toBe(bottlePrice(lot, hard, 1))
    expect(monthlyCosts(easy, 6)).toEqual(monthlyCosts(hard, 6))
  })
})

describe('Ratgeber und Vorspulen', () => {
  it('meldet die Lese als wichtige Entscheidung', () => {
    const october = endMonths(start(), 9)
    const hints = monthHints(october, currentPlayer(october))
    expect(hints.some((h) => h.important && h.text.startsWith('Lesezeit'))).toBe(true)
  })

  it('spult über ruhige Monate bis zur nächsten Entscheidung', () => {
    const may = endMonths(start(), 4)
    const { state, months } = fastForward(may)
    expect(months).toBeGreaterThan(1)
    expect(state.month).toBeGreaterThan(may.month)
    expect(monthHints(state, currentPlayer(state)).some((h) => h.important)).toBe(true)
  })

  it('spult höchstens ein Jahr', () => {
    expect(fastForward(start(), 3).months).toBeLessThanOrEqual(3)
  })
})

describe('Endlosspiel', () => {
  it('kennt kein Siegziel und läuft über viele Jahre weiter', () => {
    const { state } = simulate({
      seed: 4,
      players: [{ regionId: 'pfalz', ai: 'tradition' }],
      years: 20,
    })
    expect(isEndless(state)).toBe(true)
    expect(state.winnerId).toBeNull()
    expect(state.finished).toBe(false)
    expect(state.year).toBeGreaterThan(20)
  })
})
