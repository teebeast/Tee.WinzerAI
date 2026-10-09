import { describe, expect, it } from 'vitest'
import { applyAction, currentPlayer, newGame, RuleError, START_MONEY } from './game'
import type { Action, GameState } from './types'

function start(seed = 42): GameState {
  return newGame({ seed, players: [{ name: 'Anna', regionId: 'mosel' }] })
}

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

function act(state: GameState, action: Action): GameState {
  return applyAction(state, action)
}

describe('newGame', () => {
  it('stattet den Spieler wie im Design aus', () => {
    const player = currentPlayer(start())
    expect(player.money).toBe(START_MONEY)
    expect(player.plots.reduce((s, p) => s + p.hectares, 0)).toBe(10)
    expect(player.plots[0].grape).toBe('riesling')
    expect(player.plots[1].grape).toBeNull()
  })

  it('ist mit gleichem Seed reproduzierbar', () => {
    expect(endMonths(start(7), 24)).toEqual(endMonths(start(7), 24))
  })
})

describe('applyAction', () => {
  it('verändert den alten Spielstand nicht', () => {
    const before = start()
    const snapshot = structuredClone(before)
    endMonths(before, 3)
    expect(before).toEqual(snapshot)
  })

  it('erlaubt Pflanzen nur im Frühjahr', () => {
    const state = start()
    const plotId = currentPlayer(state).plots[1].id
    expect(() => act(state, { type: 'plant', plotId, grape: 'silvaner' })).toThrow(RuleError)

    const march = endMonths(state, 2)
    const planted = act(march, { type: 'plant', plotId, grape: 'silvaner' })
    expect(currentPlayer(planted).plots[1].grape).toBe('silvaner')
    expect(currentPlayer(planted).money).toBe(currentPlayer(march).money - 3 * 20_000)
  })

  it('Junganlagen tragen erst im dritten Jahr', () => {
    let state = endMonths(start(), 2)
    const plotId = currentPlayer(state).plots[1].id
    state = act(state, { type: 'plant', plotId, grape: 'silvaner' })
    state = endMonths(state, 7) // Oktober Jahr 1
    expect(() => act(state, { type: 'harvest', plotId })).toThrow('zu jung')
  })
})

describe('Jahreslauf', () => {
  it('Trauben reifen ab August und können im Oktober gelesen werden', () => {
    let state = endMonths(start(), 9) // Oktober
    expect(state.month).toBe(10)
    const plot = currentPlayer(state).plots[0]
    expect(plot.oechsle).toBeGreaterThan(60)

    state = act(state, { type: 'harvest', plotId: plot.id })
    const player = currentPlayer(state)
    expect(player.cellar).toHaveLength(1)
    expect(player.cellar[0].hectoliters).toBeGreaterThan(200)
    expect(player.cellar[0].hectoliters).toBeLessThanOrEqual(player.tankCapacityHl)
  })

  it('späte Lese bringt mehr Mostgewicht als frühe', () => {
    const base = endMonths(start(3), 8) // September
    const plotId = currentPlayer(base).plots[0].id
    const early = currentPlayer(act(base, { type: 'harvest', plotId })).cellar[0]
    const late = currentPlayer(act(endMonths(base, 2), { type: 'harvest', plotId })).cellar[0]
    expect(late.oechsle).toBeGreaterThan(early.oechsle)
  })

  it('ungelesene Trauben gehen zum Jahreswechsel verloren', () => {
    const state = endMonths(start(), 12)
    expect(state.year).toBe(2)
    expect(state.log.some((e) => e.text.includes('Jahrgang ist verloren'))).toBe(true)
  })

  it('ausgebauter Wein bringt Punkte bei der Prüfung und Geld beim Verkauf', () => {
    let state = endMonths(start(), 9)
    state = act(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
    const batchId = currentPlayer(state).cellar[0].id
    expect(() => act(state, { type: 'register', batchId })).toThrow('nicht ausgebaut')

    state = endMonths(state, 6)
    const registered = act(state, { type: 'register', batchId })
    expect(currentPlayer(registered).points).toBeGreaterThan(0)

    const moneyBefore = currentPlayer(registered).money
    const sold = act(registered, { type: 'sellBulk', batchId, hectoliters: 50 })
    expect(currentPlayer(sold).money).toBeGreaterThan(moneyBefore)
  })
})

describe('Mehrspieler', () => {
  it('der Monat endet erst, wenn alle Spieler gezogen haben', () => {
    let state = newGame({
      seed: 1,
      players: [
        { name: 'Anna', regionId: 'mosel' },
        { name: 'Ben', regionId: 'pfalz' },
      ],
    })
    state = act(state, { type: 'endTurn' })
    expect(state.month).toBe(1)
    expect(state.currentPlayer).toBe(1)
    state = act(state, { type: 'endTurn' })
    expect(state.month).toBe(2)
    expect(state.currentPlayer).toBe(0)
  })
})
