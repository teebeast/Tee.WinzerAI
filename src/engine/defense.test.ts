import { describe, expect, it } from 'vitest'
import { INSURED_VALUE_PER_HA } from './data/economy'
import { cropLoss, frostChance, insurancePremium } from './defense'
import { applyAction, currentPlayer, newGame } from './game'
import { simulate } from './simulate'
import type { GameState } from './types'
import { vineyardEvents } from './vineyard'
import type { WeatherKind } from './weather'

/** Jahr 3, alle drei Parzellen tragen, viel Geld – im gewünschten Monat */
function bearingEstate(month: number, seed = 1): GameState {
  const s = newGame({ seed, randomEvents: false, start: { plots: 'planted', money: 500_000 }, players: [{ name: 'Anna', regionId: 'franken' }] })
  s.year = 3
  s.month = month
  return s
}

/** Wendet das Monatswetter auf viele Zufallsfolgen an und mittelt den Ertragsfaktor je Parzelle */
function averageCrop(prepare: (s: GameState) => void, month: number, weather: WeatherKind, runs = 400): number[] {
  const totals = [0, 0, 0]
  for (let i = 0; i < runs; i++) {
    const s = bearingEstate(month)
    prepare(s)
    s.rng.state = i * 7919 + 13
    vineyardEvents(s, currentPlayer(s), weather)
    currentPlayer(s).plots.forEach((p, j) => (totals[j] += p.cropFactor))
  }
  return totals.map((t) => t / runs)
}

describe('Wetterabwehr', () => {
  it('Frostkerzen verhindern Spätfrostschäden', () => {
    expect(frostChance(bearingEstate(4), currentPlayer(bearingEstate(4)))).toBeGreaterThan(0)
    expect(frostChance(bearingEstate(6), currentPlayer(bearingEstate(6)))).toBe(0)
    const unprotected = averageCrop(() => {}, 4, 'wechselhaft')
    const protectedCrop = averageCrop((s) => (currentPlayer(s).frostCandles = true), 4, 'wechselhaft')
    expect(unprotected[0]).toBeLessThan(0.99)
    expect(protectedCrop[0]).toBe(1)
  })

  it('ein Hagelnetz hält den Großteil des Hagelschadens ab', () => {
    const crop = averageCrop((s) => (currentPlayer(s).plots[0].hailNet = true), 7, 'wechselhaft', 800)
    const lossNet = 1 - crop[0]
    const lossOpen = 1 - (crop[1] + crop[2]) / 2
    expect(lossOpen).toBeGreaterThan(0.005)
    expect(lossNet).toBeLessThan(lossOpen * 0.3)
  })

  it('Bewässerung schützt vor Hitze und Dürre', () => {
    const crop = averageCrop((s) => (currentPlayer(s).plots[0].irrigation = true), 8, 'sonnig', 800)
    const lossWatered = 1 - crop[0]
    const lossDry = 1 - (crop[1] + crop[2]) / 2
    expect(lossDry).toBeGreaterThan(lossWatered + 0.01)
  })

  it('die Ernteversicherung zahlt 80 % des verlorenen Werts', () => {
    const s = bearingEstate(1)
    let player = currentPlayer(s)
    const premium = insurancePremium(s, player)
    expect(premium).toBeGreaterThan(0)
    const insured = applyAction(s, { type: 'insureHarvest' })
    player = currentPlayer(insured)
    expect(player.money).toBe(500_000 - premium)
    expect(() => applyAction(insured, { type: 'insureHarvest' })).toThrow('bereits')

    const plot = player.plots[0]
    const payout = cropLoss(insured, player, [plot], 0.5, 'Hagel')
    expect(payout).toBe(Math.round((plot.hectares * 0.5 * INSURED_VALUE_PER_HA * 0.8) / 100) * 100)
    expect(player.money).toBe(500_000 - premium + payout)
  })

  it('ohne Versicherung zahlt niemand', () => {
    const s = bearingEstate(6)
    const player = currentPlayer(s)
    expect(cropLoss(s, player, [player.plots[0]], 0.5, 'Hagel')).toBe(0)
    expect(player.money).toBe(500_000)
  })

  it('prüft Zeitpunkt und doppelte Installation', () => {
    expect(() => applyAction(bearingEstate(6), { type: 'insureHarvest' })).toThrow('Januar bis April')
    expect(() => applyAction(bearingEstate(6), { type: 'frostCandles' })).toThrow('April und Mai')
    const s = bearingEstate(6)
    const plotId = currentPlayer(s).plots[0].id
    const netted = applyAction(s, { type: 'installHailNet', plotId })
    expect(currentPlayer(netted).plots[0].hailNet).toBe(true)
    expect(() => applyAction(netted, { type: 'installHailNet', plotId })).toThrow('bereits')
  })

  it('Frostkerzen gelten nur für den laufenden Monat', () => {
    let s = applyAction(bearingEstate(4), { type: 'frostCandles' })
    expect(currentPlayer(s).frostCandles).toBe(true)
    s = applyAction(s, { type: 'endTurn' })
    expect(currentPlayer(s).frostCandles).toBe(false)
  })

  it('vorsichtige Computergegner versichern ihre Ernte', () => {
    const { state } = simulate({ seed: 3, years: 4, players: [{ regionId: 'franken', ai: 'tradition' }] })
    expect(state.log.some((e) => e.text.startsWith('Ernteversicherung für Jahr'))).toBe(true)
  })
})
