import { describe, expect, it } from 'vitest'
import { fastForward, monthHints } from './advisor'
import { CHALLENGE_YEARS, dailyChallenge } from './challenge'
import { VINOTHEK_COST } from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS } from './data/regions'
import { applyAction, currentPlayer, isEndless, newGame } from './game'
import { bottlePrice, monthlyDemand, wholesalePrice } from './market'
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
  it('ist für alle am selben Tag gleich und endet nach zehn Jahren', () => {
    expect(dailyChallenge('2026-10-09')).toEqual(dailyChallenge('2026-10-09'))
    expect(dailyChallenge('2026-10-09').seed).not.toBe(dailyChallenge('2026-10-10').seed)

    const options = dailyChallenge('2026-10-09')
    // Ohne Menschen: Alle drei Plätze spielt die KI durch, um das Zeitlimit zu prüfen.
    let state = newGame({ ...options, players: options.players.map((p) => ({ ...p, ai: p.ai ?? 'tradition' })) })
    for (let i = 0; i < 12 * CHALLENGE_YEARS * 3 + 5 && !state.finished; i++) {
      state = applyAction(state, { type: 'endTurn' })
    }
    expect(state.finished).toBe(true)
    expect(state.year).toBe(CHALLENGE_YEARS)
    expect(state.winnerId).not.toBeNull()
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
