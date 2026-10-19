import { describe, expect, it } from 'vitest'
import { advance, importantHints } from './advisor'
import { gameMonth } from './bio'
import { SABOTAGE_DAMAGES } from './data/economy'
import { applyAction, currentPlayer, newGame } from './game'
import type { GameState } from './types'

/** Zwei Menschen am selben Gerät, ohne Zufallsereignisse */
function duo(seed = 1): GameState {
  const s = newGame({
    seed,
    randomEvents: false,
    players: [
      { name: 'Anna', regionId: 'mosel' },
      { name: 'Ben', regionId: 'mosel' },
    ],
  })
  for (const p of s.players) p.money = 200_000
  return s
}

/** Sabotiert Ben durch Anna – wahlweise so lange Seeds probieren, bis sie unbemerkt bleibt bzw. auffliegt */
function sabotaged(detected: boolean): GameState {
  for (let seed = 1; seed < 100; seed++) {
    const s = duo(seed)
    const after = applyAction(s, { type: 'sabotage', targetId: 'p2', kind: 'geruecht' })
    if ((after.players[0].money < s.players[0].money - 10_000) === detected) return after
  }
  throw new Error('kein passender Seed')
}

describe('Reaktion auf Sabotage', () => {
  it('das Opfer darf bis Ende des Folgemonats reagieren', () => {
    const s = sabotaged(false)
    const ben = s.players[1]
    expect(ben.decision?.title).toContain('Sabotage')
    expect(ben.decision?.deadline).toBe(gameMonth(s) + 1)
    // Anna beendet den Zug, Ben ist dran – und die Entscheidung überlebt das Monatsende
    let next = applyAction(s, { type: 'endTurn' })
    expect(currentPlayer(next).id).toBe('p2')
    next = applyAction(next, { type: 'endTurn' })
    expect(next.players[1].decision?.title).toContain('Sabotage')
    // Am Ende des Folgemonats greift „Hinnehmen“
    next = applyAction(applyAction(next, { type: 'endTurn' }), { type: 'endTurn' })
    expect(next.players[1].decision).toBeNull()
  })

  it('die Detektei überführt den Täter manchmal – dann gibt es Schadensersatz', () => {
    let caught = 0
    for (let seed = 1; seed <= 40; seed++) {
      const s = duo(seed)
      let after = applyAction(s, { type: 'sabotage', targetId: 'p2', kind: 'geruecht' })
      if (!after.players[1].decision || after.players[1].decision.params.detected === 1) continue
      after = applyAction(after, { type: 'endTurn' })
      const before = after.players[1].money
      after = applyAction(after, { type: 'decide', option: 0 })
      if (after.players[1].money > before) {
        caught++
        expect(after.players[1].money).toBe(before - 4_000 + SABOTAGE_DAMAGES.geruecht)
        expect(after.log.some((e) => e.text.includes('überführt Anna'))).toBe(true)
      }
    }
    expect(caught).toBeGreaterThan(0)
  })

  it('auch ein erwischter Täter lässt sich verklagen', () => {
    const s = sabotaged(true)
    expect(s.players[1].decision?.options[0].label).toContain('klagen')
  })

  it('die Nachtwache schützt: Saboteure fliegen fast immer auf', () => {
    let busted = 0
    for (let seed = 1; seed <= 20; seed++) {
      let s = duo(seed)
      s = applyAction(s, { type: 'endTurn' }) // Ben ist dran …
      s.players[1].decision = null
      const guarded = structuredClone(s)
      // … und heuert über die Reaktion die Nachtwache an
      guarded.players[1].effects.push({ kind: 'guard', value: 1, monthsLeft: 12, label: 'Nachtwache im Weinberg' })
      const annasTurn = applyAction(guarded, { type: 'endTurn' })
      const after = applyAction(annasTurn, { type: 'sabotage', targetId: 'p2', kind: 'geruecht' })
      if (after.players[1].reputation >= annasTurn.players[1].reputation) busted++
    }
    expect(busted).toBeGreaterThanOrEqual(15)
  })
})

describe('Vorspulen mit mehreren Menschen', () => {
  /** Anna spult vor, Ben spielt normal */
  function annaSkips(): GameState {
    return advance(applyAction(duo(), { type: 'autoSkip' }))
  }

  it('jeder spult für sich: Wer nicht vorspult, kommt jeden Monat dran', () => {
    let s = annaSkips()
    expect(currentPlayer(s).id).toBe('p2')
    expect(s.players[0].autoSkip).not.toBeNull()
    for (let i = 0; i < 3; i++) {
      const month = gameMonth(s)
      s = advance(applyAction(s, { type: 'endTurn' }))
      if (currentPlayer(s).id === 'p1') {
        // Annas Vorspulen endet nur, wenn bei ihr etwas Wichtiges ansteht
        expect(s.players[0].autoSkip).toBeNull()
        expect(importantHints(s).length).toBeGreaterThan(0)
        return
      }
      // Annas Zug lief von selbst durch – Ben ist im nächsten Monat wieder dran
      expect(gameMonth(s)).toBe(month + 1)
    }
  })

  it('eine Sabotage beendet das Vorspulen des Opfers', () => {
    let s = annaSkips()
    if (currentPlayer(s).id !== 'p2') throw new Error('Ben sollte am Zug sein')
    s = applyAction(s, { type: 'sabotage', targetId: 'p1', kind: 'geruecht' })
    s = advance(applyAction(s, { type: 'endTurn' }))
    expect(currentPlayer(s).id).toBe('p1')
    expect(s.players[0].autoSkip).toBeNull()
    expect(importantHints(s).some((h) => h.text.includes('Sabotage'))).toBe(true)
  })

  it('Computergegner spulen nicht vor', () => {
    const s = newGame({ seed: 1, players: [{ name: 'KI', regionId: 'mosel', ai: 'tradition' }, { name: 'Anna', regionId: 'mosel' }] })
    expect(() => applyAction(s, { type: 'autoSkip' })).toThrow()
  })
})
