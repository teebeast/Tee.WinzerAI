import { describe, expect, it } from 'vitest'
import { gameMonth } from './bio'
import { applyAction, currentPlayer, newGame } from './game'
import { checkMilestones, isReached, MILESTONES, TIER_REWARDS } from './milestones'
import { simulate } from './simulate'
import type { GameState } from './types'

const start = (): GameState => newGame({ seed: 1, randomEvents: false, players: [{ name: 'Anna', regionId: 'mosel' }] })
const def = (id: string) => MILESTONES.find((m) => m.id === id)!

describe('Meilensteine', () => {
  it('jeder Meilenstein hat eine eindeutige ID und einen sinnvollen Fortschritt', () => {
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length)
    const s = start()
    for (const m of MILESTONES) {
      const [value, target] = m.progress(s, currentPlayer(s))
      expect(Number.isFinite(value)).toBe(true)
      expect(target).toBeGreaterThan(0)
    }
  })

  it('die erste Lese wird belohnt und mit Datum in der Chronik festgehalten', () => {
    let s = start()
    for (let i = 0; i < 9; i++) s = applyAction(s, { type: 'endTurn' }) // Oktober
    s = applyAction(s, { type: 'harvest', plotId: currentPlayer(s).plots[0].id })
    expect(currentPlayer(s).stats.harvests).toBe(1)
    const points = currentPlayer(s).points
    const month = gameMonth(s)
    s = applyAction(s, { type: 'endTurn' })
    const player = currentPlayer(s)
    expect(player.milestones['erste-lese']).toBe(month)
    expect(player.points).toBe(points + TIER_REWARDS.bronze.points)
    expect(s.log.some((e) => e.text.includes('„Erste Lese“') && e.tone === 'good')).toBe(true)
  })

  it('wird nur einmal vergeben', () => {
    const s = start()
    const player = currentPlayer(s)
    player.hasVinothek = true
    checkMilestones(s)
    const points = player.points
    checkMilestones(s)
    expect(player.points).toBe(points)
    expect(Object.keys(player.milestones)).toEqual(['vinothek'])
  })

  it('beim Übernehmen alter Spielstände ohne Belohnung eingetragen', () => {
    const s = start()
    const player = currentPlayer(s)
    player.hasOnlineShop = true
    checkMilestones(s, true)
    expect(player.milestones.onlineshop).toBeDefined()
    expect(player.points).toBe(0)
  })

  it('Fortschritt bei Zählern und Schwellen', () => {
    const s = start()
    const player = currentPlayer(s)
    player.stats.bottlesSold = 4000
    expect(def('flaschen-10k').progress(s, player)).toEqual([4000, 10_000])
    player.reputation = 55
    expect(isReached(s, player, def('bekanntheit-50'))).toBe(true)
    expect(isReached(s, player, def('bekanntheit-80'))).toBe(false)
  })

  it('in einer längeren Partie kommen viele Meilensteine zusammen', () => {
    const { state } = simulate({ seed: 2, years: 12, players: [{ regionId: 'rheingau', ai: 'tradition' }] })
    const reached = Object.keys(state.players[0].milestones)
    expect(reached.length).toBeGreaterThan(8)
    expect(reached.length).toBeLessThan(MILESTONES.length)
    expect(reached).toContain('erste-lese')
  })
})
