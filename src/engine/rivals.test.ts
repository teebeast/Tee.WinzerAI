import { describe, expect, it } from 'vitest'
import { playAiTurn } from './ai'
import { applyAction, currentPlayer, newGame } from './game'
import { adjustRelation, archEnemy, monthlyRivalry, relation, relationLabel } from './rivals'
import type { AiProfileId, GameState } from './types'

/** Anna (Mensch) und ein Computer-Nachbar im selben Gebiet */
function neighbours(ai: AiProfileId = 'tradition', seed = 3): GameState {
  return newGame({
    seed,
    start: { money: 500_000, plots: 'planted' },
    players: [
      { name: 'Anna', regionId: 'pfalz' },
      { name: 'Nachbar', regionId: 'pfalz', ai },
    ],
  })
}

describe('Verhältnis der Computergegner', () => {
  it('bleibt zwischen −100 und +100 und betrifft nur Computergegner', () => {
    const s = neighbours()
    const [anna, ai] = s.players
    adjustRelation(ai, anna.id, -250)
    expect(relation(ai, anna.id)).toBe(-100)
    adjustRelation(anna, ai.id, 50)
    expect(anna.relations).toEqual({})
    expect(relationLabel(-100).text).toBe('verfeindet')
    expect(relationLabel(50).text).toBe('befreundet')
  })

  it('wer bei einer Sabotage erwischt wird, macht sich einen Feind', () => {
    for (let seed = 1; seed < 60; seed++) {
      const s = neighbours('tradition', seed)
      const after = applyAction(s, { type: 'sabotage', targetId: 'p2', kind: 'geruecht' })
      if (after.log.some((e) => e.text.includes('erwischt'))) {
        expect(relation(after.players[1], 'p1')).toBe(-60)
        return
      }
    }
    throw new Error('Keine Sabotage wurde entdeckt')
  })

  it('Groll verblasst mit der Zeit', () => {
    const s = neighbours()
    adjustRelation(s.players[1], 'p1', -60)
    for (let i = 0; i < 14; i++) monthlyRivalry(s)
    expect(relation(s.players[1], 'p1')).toBeGreaterThan(-31)
    expect(relation(s.players[1], 'p1')).toBeLessThan(-20)
  })

  it('verstimmte Nachbarn starten Rabattaktionen, verfeindete beschweren sich öffentlich', () => {
    let priceWars = 0
    let complaints = 0
    for (let seed = 0; seed < 200; seed++) {
      const s = neighbours()
      s.rng.state = seed * 7919
      adjustRelation(s.players[1], 'p1', -80)
      monthlyRivalry(s)
      if (s.players[0].effects.some((e) => e.label.startsWith('Rabattaktion'))) priceWars++
      if (s.log.some((e) => e.text.includes('beschwert sich öffentlich'))) complaints++
    }
    expect(priceWars).toBeGreaterThan(3)
    expect(complaints).toBeGreaterThan(3)
  })

  it('freundliche Nachbarn starten keine Feindseligkeiten', () => {
    for (let seed = 0; seed < 100; seed++) {
      const s = neighbours()
      s.rng.state = seed * 7919
      adjustRelation(s.players[1], 'p1', 40)
      monthlyRivalry(s)
      expect(s.players[0].effects).toHaveLength(0)
    }
  })

  it('das Schlitzohr rächt sich im Sommer am Weinberg seines Erzfeinds', () => {
    let s = neighbours('schlitzohr')
    s.year = 3
    s.month = 6
    adjustRelation(s.players[1], 'p1', -70)
    expect(archEnemy(s, s.players[1])?.id).toBe('p1')
    s = applyAction(s, { type: 'endTurn' }) // jetzt zieht das Schlitzohr
    expect(currentPlayer(s).id).toBe('p2')
    const after = playAiTurn(s)
    expect(after.log.some((e) => e.text.includes('Sabotage gegen Anna') || e.text.includes('beschädigt'))).toBe(true)
  })

  it('Computergegner roden, wenn ihre Sorte aus der Mode kommt und eine andere gefragt ist', () => {
    let s = neighbours('tradition')
    s.year = 4
    s.month = 1
    const ai = s.players[1]
    const grape = ai.plots[0].grape!
    s.trends[grape] = { value: 0.85, target: 0.82 }
    s.trends.spaetburgunder = { value: 1.1, target: 1.25 }
    s = applyAction(s, { type: 'endTurn' })
    const after = playAiTurn(s)
    expect(after.players[1].plots.some((p) => p.grape === null)).toBe(true)
    expect(after.log.some((e) => e.playerId === null && e.text.startsWith('Nachbar rodet'))).toBe(true)
  })
})
