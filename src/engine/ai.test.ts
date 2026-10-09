import { describe, expect, it } from 'vitest'
import { AI_PROFILES, runAiTurns } from './ai'
import { REGIONS, type RegionId } from './data/regions'
import { applyAction, currentPlayer, newGame } from './game'
import { simulate } from './simulate'
import type { AiProfileId } from './types'

const profiles = Object.keys(AI_PROFILES) as AiProfileId[]
const regions = Object.keys(REGIONS) as RegionId[]

describe('KI-Gegner', () => {
  it.each(profiles)('%s spielt 8 Jahre in jedem Gebiet fehlerfrei und sammelt Punkte', (ai) => {
    let survived = 0
    for (const regionId of regions) {
      const { snapshots, state } = simulate({ seed: 9, years: 8, players: [{ regionId, ai }] })
      const player = state.players[0]
      expect(Number.isFinite(player.money)).toBe(true)
      expect(player.points).toBeGreaterThan(0)
      if (snapshots.length === 8 && !player.bankrupt) survived++
    }
    // Die soliden Profile gehen nirgends pleite; das Schlitzohr darf sich gelegentlich verzocken.
    const required = AI_PROFILES[ai].intrigue ? Math.ceil(regions.length * 0.75) : regions.length
    expect(survived).toBeGreaterThanOrEqual(required)
  })

  it('kauft im Lauf der Jahre Weinberge dazu', () => {
    const { snapshots } = simulate({ seed: 2, years: 10, players: [{ regionId: 'pfalz', ai: 'schlitzohr' }] })
    expect(snapshots.at(-1)!.players[0].hectares).toBeGreaterThan(10)
  })

  it('ist mit gleichem Seed reproduzierbar', () => {
    const options = { seed: 4, years: 4, players: profiles.map((ai) => ({ regionId: 'mosel' as const, ai })) }
    expect(simulate(options).snapshots).toEqual(simulate(options).snapshots)
  })

  it('zieht nach dem Menschen und gibt den Zug zurück', () => {
    let state = newGame({
      seed: 1,
      players: [
        { name: 'Anna', regionId: 'mosel' },
        { name: 'KI', regionId: 'pfalz', ai: 'tradition' },
      ],
    })
    state = runAiTurns(applyAction(state, { type: 'endTurn' }))
    expect(state.month).toBe(2)
    expect(currentPlayer(state).name).toBe('Anna')
  })

  it('beginnt die Partie selbst, wenn ein Computergegner zuerst dran ist', () => {
    const state = runAiTurns(
      newGame({
        seed: 1,
        players: [
          { name: 'KI', regionId: 'pfalz', ai: 'bio' },
          { name: 'Anna', regionId: 'mosel' },
        ],
      }),
    )
    expect(currentPlayer(state).name).toBe('Anna')
    expect(state.month).toBe(1)
  })

  it('spielt ohne Menschen nicht von allein weiter', () => {
    const state = newGame({ seed: 1, players: [{ name: 'KI', regionId: 'pfalz', ai: 'bio' }] })
    expect(runAiTurns(state)).toBe(state)
  })
})
