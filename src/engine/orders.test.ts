import { describe, expect, it } from 'vitest'
import { gameMonth } from './bio'
import { applyAction, currentPlayer, newGame } from './game'
import { describeWine, maybeOfferOrder, orderValue } from './orders'
import { playAiTurn } from './ai'
import type { BottleLot, CustomerOrder, GameState } from './types'

/** Jahr 2, Juni, mit zwei geprüften Riesling-Posten im Lager */
function stocked(): GameState {
  const s = newGame({ seed: 2, randomEvents: false, players: [{ name: 'Anna', regionId: 'mosel' }] })
  s.year = 2
  s.month = 6
  const lot = (id: string, quality: number, bottles: number): BottleLot => ({
    id, grape: 'riesling', vintage: 1, oechsle: 85, level: 'spaetlese', quality, adulterated: null,
    bottles, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
  })
  currentPlayer(s).bottles = [lot('gut', 80, 800), lot('einfach', 72, 600)]
  return s
}

function order(s: GameState, overrides: Partial<CustomerOrder> = {}): CustomerOrder {
  return {
    id: 'o1', customer: 'Grandhotel Sonnenkamm', icon: '🏨', grape: 'riesling', color: null, sparkling: false,
    minLevel: 'kabinett', minQuality: 70, bioLabel: null, bottles: 1000, pricePerBottle: 10, points: 12, reputation: 3,
    deadline: gameMonth(s) + 3, offerExpires: gameMonth(s) + 1, ...overrides,
  }
}

describe('Kundenaufträge', () => {
  it('Anfragen gibt es erst ab dem zweiten Jahr, höchstens drei gleichzeitig', () => {
    const first = newGame({ seed: 1, players: [{ name: 'Anna', regionId: 'mosel' }] })
    for (let i = 0; i < 50; i++) maybeOfferOrder(first, currentPlayer(first))
    expect(currentPlayer(first).orderOffers).toHaveLength(0)

    const s = stocked()
    for (let i = 0; i < 50; i++) maybeOfferOrder(s, currentPlayer(s))
    const offers = currentPlayer(s).orderOffers
    expect(offers).toHaveLength(3)
    for (const o of offers) {
      expect(o.bottles).toBeGreaterThanOrEqual(200)
      expect(o.pricePerBottle).toBeGreaterThan(0)
      expect(o.deadline).toBeGreaterThan(o.offerExpires)
      expect(describeWine(o)).not.toMatch(/undefined|NaN/)
    }
  })

  it('angenommen und geliefert: Geld, Punkte, Bekanntheit – die einfachsten Flaschen zuerst', () => {
    const s = stocked()
    const player = currentPlayer(s)
    player.orderOffers = [order(s)]
    const money = player.money
    let t = applyAction(s, { type: 'acceptOrder', orderId: 'o1' })
    expect(currentPlayer(t).orders).toHaveLength(1)
    t = applyAction(t, { type: 'deliverOrder', orderId: 'o1' })
    const after = currentPlayer(t)
    expect(after.orders).toHaveLength(0)
    expect(after.money).toBe(money + 10_000)
    expect(after.points).toBe(12)
    // 600 einfache und 400 gute Flaschen gingen raus
    expect(after.bottles.map((l) => [l.id, l.bottles])).toEqual([['gut', 400]])
  })

  it('geliefert wird nur mit genug passenden Flaschen', () => {
    const s = stocked()
    currentPlayer(s).orders = [order(s, { minQuality: 75 })] // nur der gute Posten passt (800 Fl.)
    expect(() => applyAction(s, { type: 'deliverOrder', orderId: 'o1' })).toThrow('Nur 800 von 1000')
    currentPlayer(s).orders = [order(s, { grape: 'spaetburgunder' })]
    expect(() => applyAction(s, { type: 'deliverOrder', orderId: 'o1' })).toThrow('Nur 0 von 1000')
    currentPlayer(s).orders = [order(s, { bioLabel: 'basis' })]
    expect(() => applyAction(s, { type: 'deliverOrder', orderId: 'o1' })).toThrow('Bio-Siegel')
  })

  it('höchstens drei Aufträge gleichzeitig', () => {
    const s = stocked()
    const player = currentPlayer(s)
    player.orders = [order(s, { id: 'a' }), order(s, { id: 'b' }), order(s, { id: 'c' })]
    player.orderOffers = [order(s, { id: 'd' })]
    expect(() => applyAction(s, { type: 'acceptOrder', orderId: 'd' })).toThrow('Höchstens 3')
  })

  it('wer den Termin verpasst, zahlt Vertragsstrafe', () => {
    const s = stocked()
    const o = order(s, { grape: 'spaetburgunder', deadline: gameMonth(s) })
    currentPlayer(s).orders = [o]
    const money = currentPlayer(s).money
    const t = applyAction(s, { type: 'endTurn' })
    const after = currentPlayer(t)
    expect(after.orders).toHaveLength(0)
    expect(t.log.some((e) => e.text.includes('Vertragsstrafe') && e.tone === 'bad')).toBe(true)
    expect(after.money).toBeLessThan(money - Math.round(orderValue(o) * 0.15) + 1)
  })

  it('Anfragen verfallen nach zwei Monaten', () => {
    let s = stocked()
    s.randomEvents = false
    currentPlayer(s).orderOffers = [order(s, { offerExpires: gameMonth(s) + 1 })]
    s = applyAction(s, { type: 'endTurn' })
    expect(currentPlayer(s).orderOffers.some((o) => o.id === 'o1')).toBe(true)
    s = applyAction(s, { type: 'endTurn' })
    expect(currentPlayer(s).orderOffers.some((o) => o.id === 'o1')).toBe(false)
  })

  it('Computergegner beliefern Kunden, wenn sie genug Wein haben – und nehmen nichts an, was sie nicht liefern können', () => {
    let s = newGame({ seed: 1, targetPoints: Number.MAX_SAFE_INTEGER, players: [{ name: 'KI', regionId: 'pfalz', ai: 'bio' }] })
    let delivered = 0
    while (s.year <= 8) {
      // Das Logbuch ist begrenzt – neue Einträge Zug für Zug zählen
      const seen = s.log.length
      const last = s.log.at(-1)?.text
      s = playAiTurn(s)
      const start = seen >= 400 ? s.log.map((e) => e.text).lastIndexOf(last!) + 1 : seen
      delivered += s.log.slice(start).filter((e) => e.text.includes(' geliefert: ')).length
      expect(s.players[0].orders).toHaveLength(0)
    }
    expect(delivered).toBeGreaterThan(3)
  })
})
