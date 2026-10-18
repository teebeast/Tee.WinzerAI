import { describe, expect, it } from 'vitest'
import { EVENT_CHANCE, ESTATE_EVENTS, estateEvents, possibleEvents, RARITY_WEIGHT, triggerEvent } from './events'
import { applyAction, currentPlayer } from './game'
import { monthlyCosts, monthlyDemand } from './market'
import { simulate } from './simulate'
import type { GameState } from './types'

/** Ein gut laufendes Weingut nach vier Jahren: Wein im Tank, Flaschen im Lager, Reben im Ertrag */
function established(): GameState {
  const { state } = simulate({ seed: 7, years: 4, players: [{ regionId: 'pfalz', ai: 'tradition' }] })
  return state
}

/** Bereitet den Spielstand so vor, dass das Ereignis eintreten kann */
function prepared(base: GameState, months?: number[]): GameState {
  const s = structuredClone(base)
  s.month = months?.[0] ?? 6
  const player = currentPlayer(s)
  for (const plot of player.plots) plot.harvestedThisYear = false
  // Eine Junganlage für Ereignisse, die nur junge Reben betreffen
  player.plots.push({ ...structuredClone(player.plots[0]), id: 'young', name: 'Junganlage', plantedYear: s.year })
  // Ein großer, geprüfter Flaschenposten für Ereignisse rund ums Lager
  player.bottles.push({
    id: 'lot-x', grape: 'riesling', vintage: s.year - 1, oechsle: 85, level: 'kabinett', quality: 75, adulterated: null,
    bottles: 2000, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
  })
  return s
}

describe('Zufallsereignisse', () => {
  const base = established()

  it('hat Ereignisse in allen Seltenheitsstufen, gute wie schlechte', () => {
    for (const rarity of Object.keys(RARITY_WEIGHT)) {
      const events = ESTATE_EVENTS.filter((e) => e.rarity === rarity)
      expect(events.some((e) => e.tone === 'good')).toBe(true)
      expect(events.some((e) => e.tone === 'bad')).toBe(true)
    }
    expect(ESTATE_EVENTS.length).toBeGreaterThanOrEqual(40)
    expect(new Set(ESTATE_EVENTS.map((e) => e.id)).size).toBe(ESTATE_EVENTS.length)
  })

  it.each(ESTATE_EVENTS.map((e) => [e.id, e]))('%s lässt sich auslösen und meldet sich im Logbuch', (_, event) => {
    const s = prepared(base, event.months)
    const player = currentPlayer(s)
    expect(possibleEvents(s, player)).toContain(event)
    const before = s.log.length
    triggerEvent(s, player, event)
    const entry = s.log[before]
    expect(entry.tone).toBe(event.tone)
    expect(entry.text.length).toBeGreaterThan(20)
    expect(entry.text).not.toMatch(/NaN|undefined/)
  })

  it('tritt in rund einem Drittel der Monate ein – drastische Ereignisse sehr selten', () => {
    const s = prepared(base)
    const months = 4000
    let events = 0
    for (let i = 0; i < months; i++) {
      const copy = { ...s, rng: { state: i * 7919 }, log: [], players: [structuredClone(currentPlayer(s))] }
      estateEvents(copy, copy.players[0])
      if (copy.log.length > 0) events++
    }
    expect(events / months).toBeGreaterThan(EVENT_CHANCE - 0.03)
    expect(events / months).toBeLessThan(EVENT_CHANCE + 0.03)

    // Anteil je Stufe an allen Ereignissen, die im Juni möglich sind
    const weights = possibleEvents(s, currentPlayer(s)).map((e) => ({ rarity: e.rarity, w: RARITY_WEIGHT[e.rarity] }))
    const total = weights.reduce((sum, e) => sum + e.w, 0)
    const share = (rarity: string) => weights.filter((e) => e.rarity === rarity).reduce((sum, e) => sum + e.w, 0) / total
    expect(share('alltag')).toBeGreaterThan(0.6)
    expect(share('sehr-selten')).toBeLessThan(0.01)
    // Ein bestimmtes drastisches Ereignis: weniger als einmal in 100 Spieljahren
    expect((EVENT_CHANCE * RARITY_WEIGHT['sehr-selten']) / total).toBeLessThan(1 / 1200)
  })

  it('Effekte wirken befristet auf Nachfrage und Kosten', () => {
    let s = prepared(base)
    const player = currentPlayer(s)
    const demand = monthlyDemand(player)
    const costs = monthlyCosts(player, 6).total
    triggerEvent(s, player, ESTATE_EVENTS.find((e) => e.id === 'handelskette')!)
    triggerEvent(s, player, ESTATE_EVENTS.find((e) => e.id === 'strom')!)
    expect(monthlyDemand(player)).toBe(Math.round(demand * 1.5))
    expect(monthlyCosts(player, 6).total).toBeGreaterThan(costs)

    for (let i = 0; i < 6; i++) s = applyAction(s, { type: 'endTurn' })
    const later = currentPlayer(s)
    expect(later.effects.some((e) => e.label.includes('Handelskette'))).toBe(false)
    expect(s.log.some((e) => e.text.includes('Vorbei: Listung bei einer Handelskette'))).toBe(true)
  })

  it('seltene Ereignisse erfahren alle am Tisch', () => {
    const s = prepared(base)
    triggerEvent(s, currentPlayer(s), ESTATE_EVENTS.find((e) => e.id === 'sturm')!)
    expect(s.log.at(-1)!.playerId).toBeNull()
    triggerEvent(s, currentPlayer(s), ESTATE_EVENTS.find((e) => e.id === 'pumpe')!)
    expect(s.log.at(-1)!.playerId).toBe(currentPlayer(s).id)
  })
})
