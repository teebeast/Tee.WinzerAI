import { describe, expect, it } from 'vitest'
import { TREND_RANGE } from './data/economy'
import { applyAction, currentPlayer, newGame } from './game'
import { bottlePrice, bulkPricePerHl } from './market'
import { TREND_KEYS, trendDirection, updateTrends } from './trends'
import type { BottleLot, GameState } from './types'

const start = (seed = 4): GameState => newGame({ seed, randomEvents: false, players: [{ name: 'Anna', regionId: 'pfalz' }] })

const lot: BottleLot = {
  id: 'x', grape: 'riesling', vintage: 1, oechsle: 85, level: 'kabinett', quality: 75, adulterated: null,
  bottles: 100, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
}

describe('Markttrends', () => {
  it('jede Rebsorte und Sekt starten nahe 100 %', () => {
    const s = start()
    expect(Object.keys(s.trends).sort()).toEqual([...TREND_KEYS].sort())
    for (const trend of Object.values(s.trends)) {
      expect(trend.value).toBeGreaterThanOrEqual(0.85)
      expect(trend.value).toBeLessThanOrEqual(1.15)
    }
  })

  it('wandern über die Jahre, bleiben aber in der Spanne', () => {
    const s = start()
    const initial = structuredClone(s.trends)
    for (let month = 0; month < 12 * 20; month++) {
      updateTrends(s)
      for (const trend of Object.values(s.trends)) {
        expect(trend.value).toBeGreaterThanOrEqual(TREND_RANGE[0])
        expect(trend.value).toBeLessThanOrEqual(TREND_RANGE[1])
      }
    }
    const moved = TREND_KEYS.filter((k) => Math.abs(s.trends[k].value - initial[k].value) > 0.1)
    expect(moved.length).toBeGreaterThan(3)
    expect(s.log.some((e) => e.text.startsWith('📈 Markttrend'))).toBe(true)
    expect(s.log.some((e) => e.text.startsWith('📉 Markttrend'))).toBe(true)
  })

  it('nähern sich dem Ziel schrittweise', () => {
    const s = start()
    s.trends.riesling = { value: 0.8, target: 1.3 }
    const values = [s.trends.riesling.value]
    for (let i = 0; i < 6; i++) {
      s.trends.riesling.target = 1.3 // ein zufälliger Zielwechsel soll den Test nicht stören
      updateTrends(s)
      values.push(s.trends.riesling.value)
    }
    for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1])
    expect(values.at(-1)).toBeLessThan(1.3)
    expect(trendDirection(s.trends.riesling)).toBe('up')
  })

  it('wirken auf Flaschen- und Fassweinpreise', () => {
    const s = start()
    const player = currentPlayer(s)
    s.trends.riesling.value = 1
    const normal = bottlePrice(lot, player, s)
    const batch = { ...lot, hectoliters: 10, monthsUntilReady: 0, barrique: false }
    const bulk = bulkPricePerHl(batch, s, player)
    s.trends.riesling.value = 1.3
    expect(bottlePrice(lot, player, s)).toBeCloseTo(normal * 1.3, 1)
    expect(bulkPricePerHl(batch, s, player)).toBeCloseTo(bulk * 1.3, 1)
  })

  it('Sekt folgt dem Sekt-Trend, nicht der Rebsorte', () => {
    const s = start()
    const player = currentPlayer(s)
    const sekt = { ...lot, sparkling: true }
    s.trends.sekt.value = 1
    const normal = bottlePrice(sekt, player, s)
    s.trends.riesling.value = 0.7
    expect(bottlePrice(sekt, player, s)).toBe(normal)
    s.trends.sekt.value = 1.2
    expect(bottlePrice(sekt, player, s)).toBeCloseTo(normal * 1.2, 1)
  })

  it('sind für denselben Seed gleich', () => {
    let a = start(9)
    let b = start(9)
    for (let i = 0; i < 24; i++) {
      a = applyAction(a, { type: 'endTurn' })
      b = applyAction(b, { type: 'endTurn' })
    }
    expect(a.trends).toEqual(b.trends)
  })
})
