import { describe, expect, it } from 'vitest'
import { runAiTurns } from './ai'
import { DECISION_EVENTS, monthlyEvent, offerDecision, possibleDecisions } from './decisions'
import { applyAction, currentPlayer, newGame } from './game'
import { simulate } from './simulate'
import type { GameState } from './types'

const established = simulate({ seed: 7, years: 4, players: [{ regionId: 'pfalz', ai: 'tradition' }] }).state

/** Ein eingespieltes Weingut mit Menschen am Zug: tragende Reben, volles Flaschenlager, Kellermeister */
function prepared(months?: number[]): GameState {
  const s = structuredClone(established)
  const player = currentPlayer(s)
  player.ai = null
  player.money = 500_000
  player.cellarMaster = { name: 'Test', talent: 5, skills: ['sekt', 'barrique'], salary: 4000, hiredYear: 1 }
  s.month = months?.[0] ?? 6
  for (const plot of player.plots) plot.harvestedThisYear = false
  player.bottles.push({
    id: 'lot-x', grape: 'riesling', vintage: s.year - 1, oechsle: 85, level: 'kabinett', quality: 75, adulterated: null,
    bottles: 3000, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
  })
  // Fertiger Wein im Tank und ein befreundeter Computer-Nachbar für die Nachbarschaftsangebote
  player.cellar.push({
    id: 'wine-x', grape: 'riesling', vintage: s.year - 1, oechsle: 80, level: 'kabinett', quality: 70, adulterated: null,
    hectoliters: 60, monthsUntilReady: 0, barrique: false,
  })
  s.players.push({ ...structuredClone(player), id: 'p2', name: 'Weingut Rebenhain', ai: 'tradition', relations: { [player.id]: 30 } })
  return s
}

describe('Entscheidungsereignisse', () => {
  it.each(DECISION_EVENTS.map((d) => [d.id, d]))('%s bietet eine Wahl, und jede Möglichkeit lässt sich wählen', (_, def) => {
    const base = prepared(def.months)
    expect(possibleDecisions(base, currentPlayer(base))).toContain(def)
    offerDecision(base, currentPlayer(base), def)
    const decision = currentPlayer(base).decision!
    expect(decision.options.length).toBeGreaterThanOrEqual(2)
    expect(decision.options[decision.fallback]).toBeDefined()
    expect(decision.text).not.toMatch(/NaN|undefined/)

    decision.options.forEach((_, choice) => {
      const after = applyAction(base, { type: 'decide', option: choice })
      expect(currentPlayer(after).decision).toBeNull()
      expect(after.log.at(-1)!.text).not.toMatch(/NaN|undefined/)
    })
  })

  it('kostspielige Wahl nur, wenn sie finanzierbar ist', () => {
    const s = prepared()
    const player = currentPlayer(s)
    offerDecision(s, player, DECISION_EVENTS.find((d) => d.id === 'weinmesse-einladung')!)
    player.money = 0
    player.loan = 10_000_000
    expect(() => applyAction(s, { type: 'decide', option: 0 })).toThrow('Nicht finanzierbar')
    expect(() => applyAction(s, { type: 'decide', option: 1 })).not.toThrow()
  })

  it('ohne Antwort gilt am Monatsende die vorsichtige Wahl', () => {
    const s = prepared()
    s.randomEvents = false
    offerDecision(s, currentPlayer(s), DECISION_EVENTS.find((d) => d.id === 'gebrauchte-tanks')!)
    const tanks = currentPlayer(s).tankCapacityHl
    const after = runAiTurns(applyAction(s, { type: 'endTurn' })) // der Nachbar zieht mit, dann endet der Monat
    expect(after.players[0].decision).toBeNull()
    expect(after.players[0].tankCapacityHl).toBe(tanks)
    expect(after.log.some((e) => e.text.startsWith('Keine Antwort auf „Gebrauchte Tanks günstig“'))).toBe(true)
  })

  it('Computergegner entscheiden sofort', () => {
    const s = prepared()
    const player = currentPlayer(s)
    player.ai = 'tradition'
    const before = s.log.length
    offerDecision(s, player, DECISION_EVENTS.find((d) => d.id === 'vereinsfest')!)
    expect(player.decision).toBeNull()
    expect(s.log.length).toBeGreaterThan(before)
  })

  it('kommen im Spielverlauf regelmäßig vor', () => {
    let offered = 0
    for (let seed = 0; seed < 300; seed++) {
      const s = prepared()
      s.rng.state = seed * 104_729
      monthlyEvent(s, currentPlayer(s))
      if (currentPlayer(s).decision) offered++
    }
    expect(offered).toBeGreaterThan(10)
    expect(offered).toBeLessThan(80)
  })
})

describe('Weinberge verkaufen und roden', () => {
  const start = () => newGame({ seed: 1, randomEvents: false, players: [{ name: 'Anna', regionId: 'mosel' }] })

  it('ein Weinberg lässt sich verkaufen, die letzte Parzelle nicht', () => {
    let s = start()
    const [first, second, third] = currentPlayer(s).plots
    const money = currentPlayer(s).money
    s = applyAction(s, { type: 'sellPlot', plotId: second.id })
    expect(currentPlayer(s).plots.map((p) => p.id)).toEqual([first.id, third.id])
    expect(currentPlayer(s).money).toBeGreaterThan(money + 50_000) // 3 ha Brache, sehr gute Lage
    s = applyAction(s, { type: 'sellPlot', plotId: third.id })
    expect(() => applyAction(s, { type: 'sellPlot', plotId: first.id })).toThrow('letzte Parzelle')
  })

  it('gerodete Reben machen Platz für eine neue Sorte', () => {
    let s = start()
    const plot = currentPlayer(s).plots[0]
    const money = currentPlayer(s).money
    s = applyAction(s, { type: 'clearPlot', plotId: plot.id })
    const cleared = currentPlayer(s).plots[0]
    expect(cleared.grape).toBeNull()
    expect(currentPlayer(s).money).toBe(money - plot.hectares * 2000)
    expect(() => applyAction(s, { type: 'clearPlot', plotId: plot.id })).toThrow('brach')

    for (let i = 0; i < 2; i++) s = applyAction(s, { type: 'endTurn' }) // März
    currentPlayer(s).money = 200_000 // Spätburgunder-Pflanzgut für 4 ha ist teuer
    s = applyAction(s, { type: 'plant', plotId: plot.id, grape: 'spaetburgunder' })
    expect(currentPlayer(s).plots[0].grape).toBe('spaetburgunder')
    expect(currentPlayer(s).plots[0].plantedYear).toBe(1)
  })
})
