import { describe, expect, it } from 'vitest'
import { COMPETITIONS, REGISTER_MIN_BOTTLES, START_MONEY } from './data/economy'
import { applyAction, currentPlayer, newGame, RuleError } from './game'
import { availableCredit, creditLimit, monthlyDemand } from './market'
import type { Action, GameState } from './types'

function start(seed = 42): GameState {
  // Ohne Zufallsereignisse, damit die Mechanik ungestört geprüft wird
  return newGame({ seed, randomEvents: false, players: [{ name: 'Anna', regionId: 'mosel' }] })
}

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

function act(state: GameState, action: Action): GameState {
  return applyAction(state, action)
}

/** April im Jahr 2 mit einer ausgebauten Charge Riesling im Tank */
function withReadyWine(seed = 42): GameState {
  let state = endMonths(start(seed), 9)
  state = act(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
  state = endMonths(state, 6)
  // Ein passives Mosel-Gut ist nach den teuren Steillagen-Monaten knapp bei Kasse – die Tests prüfen die Kellermechanik.
  currentPlayer(state).money += 50_000
  return state
}

/** Wie withReadyWine, aber 100 hl abgefüllt und amtlich geprüft */
function withRegisteredLot(seed = 42): GameState {
  let state = withReadyWine(seed)
  state = act(state, { type: 'bottle', batchId: currentPlayer(state).cellar[0].id, hectoliters: 100 })
  return act(state, { type: 'register', lotId: currentPlayer(state).bottles[0].id })
}

describe('newGame', () => {
  it('stattet den Spieler wie im Design aus', () => {
    const player = currentPlayer(start())
    expect(player.money).toBe(START_MONEY)
    expect(player.plots.reduce((s, p) => s + p.hectares, 0)).toBe(10)
    expect(player.plots[0].grape).toBe('riesling')
    expect(player.plots[1].grape).toBeNull()
  })

  it('ist mit gleichem Seed reproduzierbar', () => {
    expect(endMonths(start(7), 24)).toEqual(endMonths(start(7), 24))
  })
})

describe('applyAction', () => {
  it('verändert den alten Spielstand nicht', () => {
    const before = start()
    const snapshot = structuredClone(before)
    endMonths(before, 3)
    expect(before).toEqual(snapshot)
  })

  it('erlaubt Pflanzen nur im Frühjahr', () => {
    const state = start()
    const plotId = currentPlayer(state).plots[1].id
    expect(() => act(state, { type: 'plant', plotId, grape: 'silvaner' })).toThrow(RuleError)

    const march = endMonths(state, 2)
    const planted = act(march, { type: 'plant', plotId, grape: 'silvaner' })
    expect(currentPlayer(planted).plots[1].grape).toBe('silvaner')
    expect(currentPlayer(planted).money).toBe(currentPlayer(march).money - 3 * 20_000)
  })

  it('Junganlagen tragen erst im dritten Jahr', () => {
    let state = endMonths(start(), 2)
    const plotId = currentPlayer(state).plots[1].id
    state = act(state, { type: 'plant', plotId, grape: 'silvaner' })
    state = endMonths(state, 7) // Oktober Jahr 1
    expect(() => act(state, { type: 'harvest', plotId })).toThrow('zu jung')
  })
})

describe('Jahreslauf', () => {
  it('Trauben reifen ab August und können im Oktober gelesen werden', () => {
    let state = endMonths(start(1), 9) // Oktober; Seed 1 ohne Spätfrost und Hagel
    expect(state.month).toBe(10)
    const plot = currentPlayer(state).plots[0]
    expect(plot.oechsle).toBeGreaterThan(60)

    state = act(state, { type: 'harvest', plotId: plot.id })
    const player = currentPlayer(state)
    expect(player.cellar).toHaveLength(1)
    expect(player.cellar[0].hectoliters).toBeGreaterThan(200)
    expect(player.cellar[0].hectoliters).toBeLessThanOrEqual(player.tankCapacityHl)
  })

  it('späte Lese bringt mehr Mostgewicht als frühe', () => {
    const base = endMonths(start(3), 8) // September
    const plotId = currentPlayer(base).plots[0].id
    const early = currentPlayer(act(base, { type: 'harvest', plotId })).cellar[0]
    const late = currentPlayer(act(endMonths(base, 2), { type: 'harvest', plotId })).cellar[0]
    expect(late.oechsle).toBeGreaterThan(early.oechsle)
  })

  it('ungelesene Trauben gehen zum Jahreswechsel verloren', () => {
    const state = endMonths(start(), 12)
    expect(state.year).toBe(2)
    expect(state.log.some((e) => e.text.includes('Jahrgang ist verloren'))).toBe(true)
  })

  it('Fasswein lässt sich jederzeit verkaufen', () => {
    let state = endMonths(start(), 9)
    state = act(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
    const batchId = currentPlayer(state).cellar[0].id
    const sold = act(state, { type: 'sellBulk', batchId, hectoliters: 50 })
    expect(currentPlayer(sold).money).toBeGreaterThan(currentPlayer(state).money)
  })
})

describe('Abfüllung & Prüfung', () => {
  it('abgefüllt wird erst nach dem Ausbau', () => {
    let state = endMonths(start(), 9)
    state = act(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
    const batchId = currentPlayer(state).cellar[0].id
    expect(() => act(state, { type: 'bottle', batchId, hectoliters: 10 })).toThrow('nicht ausgebaut')
  })

  it('Abfüllen leert den Tank und kostet Flaschen', () => {
    const state = withReadyWine()
    const batch = currentPlayer(state).cellar[0]
    const bottled = currentPlayer(act(state, { type: 'bottle', batchId: batch.id, hectoliters: 100 }))
    expect(bottled.cellar[0].hectoliters).toBe(batch.hectoliters - 100)
    expect(bottled.bottles[0].bottles).toBe(13_300)
    expect(bottled.money).toBe(currentPlayer(state).money - 13_300 * 0.6)
  })

  it('kleine Abfüllungen desselben Weins landen im selben Posten', () => {
    let state = withReadyWine()
    const batchId = currentPlayer(state).cellar[0].id
    state = act(state, { type: 'bottle', batchId, hectoliters: 3 })
    const lotId = currentPlayer(state).bottles[0].id
    expect(() => act(state, { type: 'register', lotId })).toThrow(String(REGISTER_MIN_BOTTLES))

    state = act(state, { type: 'bottle', batchId, hectoliters: 3 })
    expect(currentPlayer(state).bottles).toHaveLength(1)
    expect(currentPlayer(act(state, { type: 'register', lotId })).points).toBeGreaterThan(0)
  })

  it('Großhandel nimmt nur geprüfte Weine', () => {
    let state = withReadyWine()
    state = act(state, { type: 'bottle', batchId: currentPlayer(state).cellar[0].id, hectoliters: 10 })
    const lotId = currentPlayer(state).bottles[0].id
    expect(() => act(state, { type: 'sellWholesale', lotId, bottles: 100 })).toThrow('amtlich geprüfte')

    state = act(state, { type: 'register', lotId })
    const sold = act(state, { type: 'sellWholesale', lotId, bottles: 100 })
    expect(currentPlayer(sold).money).toBeGreaterThan(currentPlayer(state).money)
    expect(currentPlayer(sold).bottles[0].bottles).toBe(1_330 - 100)
  })
})

describe('Direktvermarktung', () => {
  it('der Hofladen verkauft monatlich so viele Flaschen, wie die Bekanntheit hergibt', () => {
    const state = withRegisteredLot()
    const demand = monthlyDemand(currentPlayer(state))
    const after = currentPlayer(endMonths(state, 1))
    expect(after.bottles[0].bottles).toBe(13_300 - demand)
  })

  it('der Online-Shop steigert den Absatz', () => {
    // Nach 15 Monaten ohne Verkäufe ist die Kasse knapp – der Shop wird per Kredit finanziert.
    const state = act(withRegisteredLot(), { type: 'borrow', amount: 20_000 })
    const withShop = act(state, { type: 'buyOnlineShop' })
    expect(monthlyDemand(currentPlayer(withShop))).toBeGreaterThan(monthlyDemand(currentPlayer(state)))
    expect(() => act(withShop, { type: 'buyOnlineShop' })).toThrow('läuft bereits')
  })

  it('Marketing steigert die Bekanntheit, aber nur einmal pro Monat und Saison', () => {
    const state = start()
    const after = act(state, { type: 'marketing', kind: 'social' })
    expect(currentPlayer(after).reputation).toBeGreaterThan(currentPlayer(state).reputation)
    expect(() => act(after, { type: 'marketing', kind: 'social' })).toThrow('schon gebucht')
    expect(() => act(state, { type: 'marketing', kind: 'messe' })).toThrow('nicht möglich')
    expect(() => act(endMonths(state, 2), { type: 'marketing', kind: 'messe' })).not.toThrow()
  })

  it('je bekannter das Weingut, desto weniger bringt Marketing', () => {
    const unknown = start()
    const famous = start()
    currentPlayer(famous).reputation = 80
    const gain = (s: GameState) =>
      currentPlayer(act(s, { type: 'marketing', kind: 'social' })).reputation - currentPlayer(s).reputation
    expect(gain(famous)).toBeLessThan(gain(unknown))
  })

  it('ohne Pflege sinkt die Bekanntheit', () => {
    const state = start()
    currentPlayer(state).reputation = 60
    expect(currentPlayer(endMonths(state, 6)).reputation).toBeLessThan(60)
  })
})

describe('Prämierungen', () => {
  it('nur geprüfte Weine dürfen teilnehmen', () => {
    let state = withReadyWine()
    state = act(state, { type: 'bottle', batchId: currentPlayer(state).cellar[0].id, hectoliters: 10 })
    const lotId = currentPlayer(state).bottles[0].id
    expect(() => act(state, { type: 'enterCompetition', lotId })).toThrow('amtlich geprüfte')
  })

  it('angemeldete Weine werden im Juni bewertet und nicht vorher verkauft', () => {
    let state = withRegisteredLot() // April
    const lotId = currentPlayer(state).bottles[0].id
    state = act(state, { type: 'enterCompetition', lotId })
    expect(currentPlayer(state).money).toBeLessThan(currentPlayer(withRegisteredLot()).money)

    state = endMonths(state, 3) // April, Mai, Juni
    const player = currentPlayer(state)
    expect(state.month).toBe(7)
    expect(player.competitionEntries).toEqual([])
    expect(state.log.some((e) => e.text.startsWith(COMPETITIONS.regional.name))).toBe(true)
    // bis zur Bewertung (April, Mai, Juni) wurde nichts aus dem Posten verkauft
    const sales = state.log.filter((e) => e.text.startsWith('Ab Hof'))
    expect(sales).toHaveLength(0)
  })
})

describe('Kellermeister', () => {
  it('hebt die Güte bei der Lese um sein Talent und kostet Gehalt', () => {
    const october = endMonths(start(), 9)
    const plotId = currentPlayer(october).plots[0].id
    const without = currentPlayer(act(october, { type: 'harvest', plotId })).cellar[0]

    const candidate = october.cellarMasterCandidates[0]
    const hired = act(october, { type: 'hireCellarMaster', candidate: 0 })
    expect(currentPlayer(hired).cellarMaster?.name).toBe(candidate.name)
    expect(hired.cellarMasterCandidates).not.toContainEqual(candidate)
    const withMaster = currentPlayer(act(hired, { type: 'harvest', plotId })).cellar[0]
    expect(withMaster.quality).toBeGreaterThanOrEqual(without.quality + candidate.talent)

    const costWithout = currentPlayer(october).money - currentPlayer(endMonths(october, 1)).money
    const costWith = currentPlayer(hired).money - currentPlayer(endMonths(hired, 1)).money
    expect(costWith - costWithout).toBeCloseTo(candidate.salary, -2)

    const fired = act(hired, { type: 'fireCellarMaster' })
    expect(currentPlayer(fired).cellarMaster).toBeNull()
    expect(() => act(fired, { type: 'fireCellarMaster' })).toThrow('kein Kellermeister')
  })
})

describe('Kredit & Insolvenz', () => {
  it('Kredite sind durch den Betriebswert begrenzt und kosten Zinsen', () => {
    const state = start()
    const player = currentPlayer(state)
    expect(() => act(state, { type: 'borrow', amount: creditLimit(player) + 1 })).toThrow('Kreditrahmen')

    const borrowed = act(state, { type: 'borrow', amount: 100_000 })
    expect(currentPlayer(borrowed).money).toBe(START_MONEY + 100_000)
    expect(availableCredit(currentPlayer(borrowed))).toBe(creditLimit(player) - 100_000)

    const costsWithout = START_MONEY - currentPlayer(endMonths(state, 1)).money
    const costsWith = START_MONEY + 100_000 - currentPlayer(endMonths(borrowed, 1)).money
    expect(costsWith - costsWithout).toBe(500) // 6 % p. a. auf 100.000 €

    const repaid = act(borrowed, { type: 'repay', amount: 40_000 })
    expect(currentPlayer(repaid).loan).toBe(60_000)
  })

  it('wer drei Monate ohne Geld und Kreditrahmen ist, scheidet aus', () => {
    const state = start()
    const player = currentPlayer(state)
    player.loan = creditLimit(player)
    player.money = -50_000
    const after = endMonths(state, 2)
    expect(currentPlayer(after).bankrupt).toBe(false)
    const broke = endMonths(after, 1)
    expect(broke.players[0].bankrupt).toBe(true)
    expect(broke.finished).toBe(true)
    expect(() => act(broke, { type: 'endTurn' })).toThrow('beendet')
  })

  it('insolvente Spieler werden im Mehrspieler übersprungen', () => {
    const state = newGame({
      seed: 1,
      players: [
        { name: 'Anna', regionId: 'mosel' },
        { name: 'Ben', regionId: 'pfalz' },
      ],
    })
    state.players[0].bankrupt = true
    state.currentPlayer = 1
    const next = act(state, { type: 'endTurn' })
    expect(next.month).toBe(2)
    expect(next.currentPlayer).toBe(1)
    expect(next.finished).toBe(false)
  })
})

describe('Mehrspieler', () => {
  it('der Monat endet erst, wenn alle Spieler gezogen haben', () => {
    let state = newGame({
      seed: 1,
      players: [
        { name: 'Anna', regionId: 'mosel' },
        { name: 'Ben', regionId: 'pfalz' },
      ],
    })
    state = act(state, { type: 'endTurn' })
    expect(state.month).toBe(1)
    expect(state.currentPlayer).toBe(1)
    state = act(state, { type: 'endTurn' })
    expect(state.month).toBe(2)
    expect(state.currentPlayer).toBe(0)
  })
})
