import { describe, expect, it } from 'vitest'
import { SEKT_MONTHS, SEKT_POINTS_HIGH } from './data/economy'
import { answerExport, deliverExport } from './exports'
import { applyAction, currentPlayer, newGame } from './game'
import { bulkPricePerHl, monthlyCosts, workersNeeded } from './market'
import type { GameState, Player } from './types'
import { resolveIceWine } from './vineyard'

function start(seed = 42, regionId: 'mosel' | 'pfalz' = 'mosel'): GameState {
  return newGame({ seed, players: [{ name: 'Anna', regionId }] })
}

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

/** April Jahr 2 mit ausgebautem Wein und Polster auf dem Konto */
function withReadyWine(seed = 42): GameState {
  let state = endMonths(start(seed), 9)
  state = applyAction(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
  state = endMonths(state, 6)
  return applyAction(state, { type: 'borrow', amount: 50_000 })
}

/** Summe der Ernteverluste (cropFactor) über viele Partien bis Ende August */
function averageCrop(protection: 'none' | 'conventional', seeds: number): number {
  let total = 0
  for (let seed = 1; seed <= seeds; seed++) {
    let state = start(seed)
    if (protection === 'none') state = applyAction(state, { type: 'setProtection', strategy: 'none' })
    state = endMonths(state, 8)
    total += currentPlayer(state).plots[0].cropFactor
  }
  return total / seeds
}

describe('Pflanzenschutz & Krankheiten', () => {
  it('ohne Pflanzenschutz fällt im Schnitt mehr Ernte aus', () => {
    expect(averageCrop('none', 60)).toBeLessThan(averageCrop('conventional', 60))
  })

  it('Pflanzenschutz kostet von Mai bis August', () => {
    const player = currentPlayer(start())
    expect(monthlyCosts(player, 3).protection).toBe(0)
    expect(monthlyCosts(player, 6).protection).toBe((4 * 600) / 4)
  })

  it('Bio braucht drei Jahre bis zur Zertifizierung', () => {
    const state = applyAction(start(), { type: 'setProtection', strategy: 'bio' })
    expect(currentPlayer(state).bioSinceYear).toBe(1)
    const back = applyAction(state, { type: 'setProtection', strategy: 'conventional' })
    expect(currentPlayer(back).bioSinceYear).toBeNull()
  })
})

describe('Eiswein', () => {
  function gambling(): GameState {
    const state = endMonths(start(), 10) // November
    const plot = currentPlayer(state).plots[0]
    plot.oechsle = 85 // getestet wird die Eiswein-Mechanik, nicht das Wetter
    return applyAction(state, { type: 'gambleIceWine', plotId: plot.id, gamble: true })
  }

  it('lässt sich erst ab November und mit genug Mostgewicht wetten', () => {
    const october = endMonths(start(), 9)
    const plotId = currentPlayer(october).plots[0].id
    expect(() => applyAction(october, { type: 'gambleIceWine', plotId, gamble: true })).toThrow('November')
  })

  it('bei Frost entsteht Eiswein, sonst ist die Ernte verloren', () => {
    const withFrost = structuredClone(gambling())
    resolveIceWine(withFrost, currentPlayer(withFrost), true)
    const wine = currentPlayer(withFrost).cellar[0]
    expect(wine.level).toBe('eiswein')
    expect(wine.oechsle).toBeGreaterThanOrEqual(125)
    expect(wine.hectoliters).toBeLessThan(80) // nur ein Bruchteil der normalen Menge

    const withoutFrost = structuredClone(gambling())
    resolveIceWine(withoutFrost, currentPlayer(withoutFrost), false)
    expect(currentPlayer(withoutFrost).cellar).toHaveLength(0)
    expect(currentPlayer(withoutFrost).plots[0].harvestedThisYear).toBe(true)
  })

  it('normale Lese hebt die Wette auf', () => {
    let state = gambling()
    state = applyAction(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
    expect(currentPlayer(state).plots[0].iceWineGamble).toBe(false)
  })
})

describe('Sekt', () => {
  it('reift neun Monate und bringt bei hoher Güte 10 Punkte', () => {
    let state = withReadyWine()
    state = applyAction(state, { type: 'makeSekt', batchId: currentPlayer(state).cellar[0].id, hectoliters: 10 })
    const lot = currentPlayer(state).bottles[0]
    expect(lot.sparkling).toBe(true)
    expect(lot.monthsUntilReady).toBe(SEKT_MONTHS)
    expect(() => applyAction(state, { type: 'register', lotId: lot.id })).toThrow('reift')

    state = endMonths(state, SEKT_MONTHS)
    const ready = currentPlayer(state).bottles.find((l) => l.id === lot.id)!
    expect(ready.bottles).toBe(1330) // weder reifend noch ungeprüft wird Sekt ab Hof verkauft
    const registered = applyAction(state, { type: 'register', lotId: lot.id })
    expect(currentPlayer(registered).points - currentPlayer(state).points).toBe(
      ready.quality >= 80 ? SEKT_POINTS_HIGH : 3,
    )
  })
})

describe('Panschen & Sabotage', () => {
  it('Wasser bringt Menge, Zucker eine höhere Stufe', () => {
    const state = withReadyWine()
    const batch = currentPlayer(state).cellar[0]
    const watered = currentPlayer(applyAction(state, { type: 'adulterate', batchId: batch.id, method: 'wasser' })).cellar[0]
    expect(watered.hectoliters).toBe(Math.round(batch.hectoliters * 1.2))
    expect(watered.quality).toBe(batch.quality - 15)

    const sugared = currentPlayer(applyAction(state, { type: 'adulterate', batchId: batch.id, method: 'zucker' })).cellar[0]
    expect(sugared.level).not.toBe(batch.level)
    expect(sugared.adulterated).toBe('zucker')
  })

  it('nur einmal pro Monat und nicht zweimal am selben Wein', () => {
    let state = withReadyWine()
    const batchId = currentPlayer(state).cellar[0].id
    state = applyAction(state, { type: 'adulterate', batchId, method: 'wasser' })
    expect(() => applyAction(state, { type: 'adulterate', batchId, method: 'zucker' })).toThrow()
  })

  it('bei der Prüfung fliegt Glykol-Wein manchmal auf – mit Skandal', () => {
    let caught = 0
    let passed = 0
    for (let seed = 1; seed <= 30; seed++) {
      let state = withReadyWine(seed)
      const batchId = currentPlayer(state).cellar[0].id
      state = applyAction(state, { type: 'adulterate', batchId, method: 'glykol' })
      state = applyAction(state, { type: 'bottle', batchId, hectoliters: 10 })
      const before = currentPlayer(state)
      state = applyAction(state, { type: 'register', lotId: before.bottles[0].id })
      const after = currentPlayer(state)
      if (after.bottles.length === 0) {
        caught++
        expect(after.cellar).toHaveLength(0) // auch der Rest im Tank wird beschlagnahmt
        expect(after.reputation).toBeLessThan(before.reputation)
        expect(state.log.some((e) => e.playerId === null && e.text.startsWith('Weinskandal'))).toBe(true)
      } else {
        passed++
        expect(after.points).toBeGreaterThan(before.points)
      }
    }
    expect(caught).toBeGreaterThan(0)
    expect(passed).toBeGreaterThan(caught)
  })

  it('Sabotage trifft den Gegner oder kostet bei Entdeckung Strafe', () => {
    let hits = 0
    let busted = 0
    for (let seed = 1; seed <= 30; seed++) {
      const state = newGame({
        seed,
        players: [
          { name: 'Anna', regionId: 'mosel' },
          { name: 'Ben', regionId: 'mosel' },
        ],
      })
      const after = applyAction(state, { type: 'sabotage', targetId: 'p2', kind: 'geruecht' })
      if (after.players[1].reputation < state.players[1].reputation) hits++
      else busted++
      expect(() => applyAction(after, { type: 'sabotage', targetId: 'p2', kind: 'geruecht' })).toThrow()
    }
    expect(hits).toBeGreaterThan(0)
    expect(busted).toBeGreaterThan(0)
  })
})

describe('Export', () => {
  function withContract(): { state: GameState; player: Player } {
    let state = withReadyWine()
    state = applyAction(state, { type: 'bottle', batchId: currentPlayer(state).cellar[0].id, hectoliters: 100 })
    state = applyAction(state, { type: 'register', lotId: currentPlayer(state).bottles[0].id })
    const next = structuredClone(state)
    const player = currentPlayer(next)
    player.exportOffer = {
      id: 'x', country: 'Japan', bottlesPerMonth: 1000, pricePerBottle: 6,
      minLevel: 'qualitaetswein', minQuality: 0, months: 2,
    }
    answerExport(next, player, true)
    return { state: next, player }
  }

  it('liefert monatlich und belohnt vollständige Erfüllung mit Punkten', () => {
    const { state, player } = withContract()
    const points = player.points
    const money = player.money
    deliverExport(state, player)
    deliverExport(state, player)
    expect(player.exportContract).toBeNull()
    expect(player.points).toBe(points + 15)
    expect(player.money).toBe(money + 2 * 1000 * 6)
  })

  it('Fehlmengen kosten Vertragsstrafe und den Bonus', () => {
    const { state, player } = withContract()
    player.bottles = []
    const points = player.points
    const money = player.money
    deliverExport(state, player)
    deliverExport(state, player)
    expect(player.points).toBe(points)
    expect(player.money).toBe(money - 2 * 1000 * 2)
  })
})

describe('Betrieb', () => {
  it('Personal wächst mit der Fläche', () => {
    const player = currentPlayer(start())
    expect(workersNeeded(player)).toBe(1)
    player.plots.push({ ...player.plots[1], id: 'extra', hectares: 5 })
    expect(workersNeeded(player)).toBe(2)
  })

  it('eine Kellerei-Krise halbiert den Fassweinpreis', () => {
    const state = withReadyWine()
    const batch = currentPlayer(state).cellar[0]
    const normal = bulkPricePerHl(batch, state)
    expect(bulkPricePerHl(batch, { ...state, bulkCrisisMonths: 3 })).toBeCloseTo(normal / 2)
  })
})
