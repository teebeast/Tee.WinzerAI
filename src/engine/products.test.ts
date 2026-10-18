import { describe, expect, it } from 'vitest'
import { applyAction, currentPlayer, newGame } from './game'
import { bottlePrice, monthlyDemand } from './market'
import { orderEligible } from './orders'
import { federweisserCapacity } from './products'
import { wineLabel } from './rules'
import type { BottleLot, GameState } from './types'

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

/** Ahr: Spätburgunder als Startsorte, also rote Trauben – im September des ersten Jahres */
const september = (): GameState =>
  endMonths(newGame({ seed: 1, randomEvents: false, start: { money: 300_000 }, players: [{ name: 'Anna', regionId: 'ahr' }] }), 8)

const roseLot: BottleLot = {
  id: 'r', grape: 'spaetburgunder', vintage: 1, oechsle: 80, level: 'kabinett', quality: 70, adulterated: null, rose: true,
  bottles: 1000, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
}

describe('Rosé', () => {
  it('rote Trauben lassen sich als Rosé lesen – er ist nach drei Monaten fertig', () => {
    let s = endMonths(september(), 1) // Oktober
    const plotId = currentPlayer(s).plots[0].id
    s = applyAction(s, { type: 'harvest', plotId, rose: true })
    const batch = currentPlayer(s).cellar[0]
    expect(batch.rose).toBe(true)
    expect(batch.monthsUntilReady).toBe(3)
    expect(wineLabel(batch)).toContain('Spätburgunder Rosé')
    expect(() => applyAction(s, { type: 'toBarrique', batchId: batch.id })).toThrow('Barrique')
  })

  it('nur aus roten Trauben', () => {
    const s = newGame({ seed: 1, randomEvents: false, players: [{ name: 'Anna', regionId: 'mosel' }] })
    const october = endMonths(s, 9)
    expect(() => applyAction(october, { type: 'harvest', plotId: currentPlayer(october).plots[0].id, rose: true })).toThrow(
      'roten Trauben',
    )
  })

  it('folgt seinem eigenen Trend und ist im Sommer teurer', () => {
    const s = september()
    const player = currentPlayer(s)
    s.trends.rose.value = 1
    s.month = 3
    const spring = bottlePrice(roseLot, player, s)
    s.month = 7
    expect(bottlePrice(roseLot, player, s)).toBeCloseTo(spring * 1.15, 1)
    s.trends.rose.value = 1.2
    s.trends.spaetburgunder.value = 0.8
    expect(bottlePrice(roseLot, player, s)).toBeCloseTo(spring * 1.15 * 1.2, 1)
  })

  it('zählt nicht für Kundenaufträge über Rotwein', () => {
    const s = september()
    const player = currentPlayer(s)
    player.bottles = [roseLot]
    const order = {
      id: 'o', customer: 'Test', icon: '', grape: null, color: 'rot' as const, sparkling: false, minLevel: 'qualitaetswein' as const,
      minQuality: 50, bioLabel: null, bottles: 100, pricePerBottle: 5, points: 3, reputation: 1, deadline: 99, offerExpires: 99,
    }
    expect(orderEligible(player, order)).toHaveLength(0)
  })
})

describe('Federweißer', () => {
  it('frischer Most wird im Herbst direkt verkauft – so viel, wie die Kundschaft trinkt', () => {
    let s = september()
    s = applyAction(s, { type: 'harvest', plotId: currentPlayer(s).plots[0].id })
    const batch = currentPlayer(s).cellar[0]
    const capacity = federweisserCapacity(currentPlayer(s))
    expect(capacity).toBeGreaterThan(5)
    expect(() => applyAction(s, { type: 'sellFederweisser', batchId: batch.id, hectoliters: capacity + 1 })).toThrow('nur noch')
    const money = currentPlayer(s).money
    s = applyAction(s, { type: 'sellFederweisser', batchId: batch.id, hectoliters: capacity })
    expect(currentPlayer(s).money).toBe(money + capacity * 250 * 0.95) // Normal: −5 % auf Erlöse
    expect(federweisserCapacity(currentPlayer(s))).toBe(0)
    expect(s.log.at(-1)!.text).toContain('Roter Rauscher')
    s = endMonths(s, 1)
    expect(federweisserCapacity(currentPlayer(s))).toBe(capacity) // neuer Monat, neue Kundschaft
  })

  it('nur im September und Oktober und nur aus frischem Most', () => {
    let s = september()
    s = applyAction(s, { type: 'harvest', plotId: currentPlayer(s).plots[0].id })
    const batchId = currentPlayer(s).cellar[0].id
    const later = endMonths(s, 2) // November
    expect(() => applyAction(later, { type: 'sellFederweisser', batchId, hectoliters: 1 })).toThrow('September und Oktober')
  })
})

describe('Straußwirtschaft', () => {
  it('öffnet einmal im Jahr für vier Monate und bringt mehr Gäste', () => {
    let s = endMonths(newGame({ seed: 1, randomEvents: false, start: { money: 300_000 }, players: [{ name: 'Anna', regionId: 'pfalz' }] }), 4) // Mai
    const demand = monthlyDemand(currentPlayer(s))
    s = applyAction(s, { type: 'openStrausswirtschaft' })
    expect(monthlyDemand(currentPlayer(s))).toBeGreaterThan(demand * 1.3)
    expect(() => applyAction(s, { type: 'openStrausswirtschaft' })).toThrow('schon geöffnet')
    s = endMonths(s, 4)
    expect(currentPlayer(s).effects.some((e) => e.label.startsWith('Straußwirtschaft'))).toBe(false)
  })

  it('nicht im Winter', () => {
    const s = newGame({ seed: 1, randomEvents: false, players: [{ name: 'Anna', regionId: 'pfalz' }] })
    expect(() => applyAction(s, { type: 'openStrausswirtschaft' })).toThrow('März und Oktober')
  })
})
