import { describe, expect, it } from 'vitest'
import { bottleCost, sektCost } from './cellar'
import { cellarMasterBonus, experience, salaryFor } from './cellarmaster'
import { applyAction, currentPlayer, newGame } from './game'
import { simulate } from './simulate'
import type { CellarMaster, CellarSkill, GameState } from './types'

const start = (): GameState => newGame({ seed: 3, randomEvents: false, players: [{ name: 'Anna', regionId: 'pfalz' }] })
const master = (skills: CellarSkill[], talent = 4, hiredYear = 1): CellarMaster => ({
  name: 'Test', talent, skills, salary: salaryFor(talent, skills), hiredYear,
})

describe('Kellermeister mit Fähigkeiten', () => {
  it('Spezialisten heben die Güte ihrer Weine', () => {
    const player = currentPlayer(start())
    player.cellarMaster = master(['rotwein'])
    expect(cellarMasterBonus(player, 'spaetburgunder', 80, 1)).toBe(4 + 3)
    expect(cellarMasterBonus(player, 'riesling', 80, 1)).toBe(4)

    player.cellarMaster = master(['weisswein', 'edelsuess'])
    expect(cellarMasterBonus(player, 'riesling', 80, 1)).toBe(4 + 3)
    expect(cellarMasterBonus(player, 'riesling', 110, 1)).toBe(4 + 3 + 4)
    expect(cellarMasterBonus(player, 'dornfelder', 110, 1)).toBe(4 + 4)
  })

  it('wird mit den Dienstjahren besser – bis höchstens +2', () => {
    const m = master([], 4, 1)
    expect(experience(m, 1)).toBe(0)
    expect(experience(m, 5)).toBe(1)
    expect(experience(m, 9)).toBe(2)
    expect(experience(m, 30)).toBe(2)
  })

  it('ein sparsamer Kellermeister senkt die Flaschen- und Sektkosten', () => {
    const player = currentPlayer(start())
    player.cellarMaster = master(['sekt'])
    const [bottle, sekt] = [bottleCost(player), sektCost(player)]
    player.cellarMaster = master(['sekt', 'sparsam'])
    expect(bottleCost(player)).toBeCloseTo(bottle * 0.75)
    expect(sektCost(player)).toBeCloseTo(sekt * 0.75)
  })

  it('Gehalt steigt mit Talent und Fähigkeiten', () => {
    expect(salaryFor(6, ['sekt'])).toBeGreaterThan(salaryFor(3, ['sekt']))
    expect(salaryFor(4, ['sekt', 'barrique'])).toBeGreaterThan(salaryFor(4, ['sekt']))
  })

  it('jeden Januar bewerben sich drei neue Kandidaten', () => {
    let s = start()
    expect(s.cellarMasterCandidates).toHaveLength(3)
    for (const c of s.cellarMasterCandidates) {
      expect(c.talent).toBeGreaterThanOrEqual(1)
      expect(c.talent).toBeLessThanOrEqual(5)
      expect(c.skills.length).toBeGreaterThanOrEqual(1)
      expect(new Set(c.skills).size).toBe(c.skills.length)
    }
    s = applyAction(s, { type: 'hireCellarMaster', candidate: 1 })
    expect(s.cellarMasterCandidates).toHaveLength(2)
    const before = s.cellarMasterCandidates.map((c) => c.name)
    for (let i = 0; i < 12; i++) s = applyAction(s, { type: 'endTurn' })
    expect(s.month).toBe(1)
    expect(s.cellarMasterCandidates).toHaveLength(3)
    expect(s.cellarMasterCandidates.map((c) => c.name)).not.toEqual(before)
    expect(s.cellarMasterCandidates.map((c) => c.name)).not.toContain(currentPlayer(s).cellarMaster!.name)
  })

  it('ein neuer Kellermeister löst den bisherigen ab', () => {
    let s = applyAction(start(), { type: 'hireCellarMaster', candidate: 0 })
    const first = currentPlayer(s).cellarMaster!.name
    s = applyAction(s, { type: 'hireCellarMaster', candidate: 0 })
    expect(currentPlayer(s).cellarMaster!.name).not.toBe(first)
    expect(s.log.at(-1)!.text).toContain(`löst ${first} ab`)
  })

  it('Computergegner suchen sich einen Kellermeister mit den Fähigkeiten, die ihr Profil braucht', () => {
    for (const seed of [1, 2, 3]) {
      // Der Traditionswinzer setzt auf Sekt und Barrique
      const { state } = simulate({ seed, years: 8, players: [{ regionId: 'rheingau', ai: 'tradition' }] })
      const skills = state.players[0].cellarMaster?.skills ?? []
      expect(skills.some((s) => s === 'sekt' || s === 'barrique')).toBe(true)
    }
  })
})
