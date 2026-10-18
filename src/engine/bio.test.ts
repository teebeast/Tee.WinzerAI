import { describe, expect, it } from 'vitest'
import { BIO_LABELS, monthsUntilEligible } from './bio'
import { BIO_CONVERSION_MONTHS } from './data/economy'
import { applyAction, currentPlayer, harvestPreview, newGame } from './game'
import { bottlePrice, monthlyCosts, monthlyDemand } from './market'
import { simulate } from './simulate'
import type { BottleLot, GameState } from './types'

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

/** Weingut mit viel Geld, das im Januar auf Bio umstellt */
function converting(): GameState {
  const s = newGame({ seed: 5, randomEvents: false, start: { money: 2_000_000 }, players: [{ name: 'Anna', regionId: 'baden' }] })
  return applyAction(s, { type: 'setProtection', strategy: 'bio' })
}

const lot: BottleLot = {
  id: 'x', grape: 'riesling', vintage: 1, oechsle: 85, level: 'kabinett', quality: 75, adulterated: null,
  bottles: 100, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
}

describe('Bio-Zertifizierung', () => {
  it('das Grünblatt-Siegel gibt es erst nach zwei Jahren Umstellung – und nur auf Antrag', () => {
    let s = converting()
    expect(() => applyAction(s, { type: 'applyBioLabel' })).toThrow(`Noch ${BIO_CONVERSION_MONTHS} Monate Umstellung`)
    s = endMonths(s, BIO_CONVERSION_MONTHS - 1)
    expect(monthsUntilEligible(s, currentPlayer(s))).toBe(1)
    s = endMonths(s, 1)
    expect(monthsUntilEligible(s, currentPlayer(s))).toBe(0)
    expect(currentPlayer(s).bioLabel).toBeNull() // nicht automatisch
    const money = currentPlayer(s).money
    s = applyAction(s, { type: 'applyBioLabel' })
    expect(currentPlayer(s).bioLabel).toBe('basis')
    expect(currentPlayer(s).money).toBe(money - BIO_LABELS.basis.fee)
  })

  it('Terravita und Lunaris folgen jeweils nach einem Jahr auf der Vorstufe', () => {
    let s = endMonths(converting(), BIO_CONVERSION_MONTHS)
    s = applyAction(s, { type: 'applyBioLabel' })
    expect(() => applyAction(s, { type: 'applyBioLabel' })).toThrow('Grünblatt')
    s = endMonths(s, 12)
    s = applyAction(s, { type: 'applyBioLabel' })
    expect(currentPlayer(s).bioLabel).toBe('verband')
    s = endMonths(s, 12)
    s = applyAction(s, { type: 'applyBioLabel' })
    expect(currentPlayer(s).bioLabel).toBe('biodynamisch')
    expect(() => applyAction(s, { type: 'applyBioLabel' })).toThrow('strengste')
  })

  it('höhere Siegel bringen bessere Preise und mehr Nachfrage', () => {
    const s = converting()
    const player = currentPlayer(s)
    const base = { price: bottlePrice(lot, player, s), demand: monthlyDemand(player) }
    player.bioLabel = 'basis'
    const basis = bottlePrice(lot, player, s)
    player.bioLabel = 'verband'
    const verband = bottlePrice(lot, player, s)
    player.bioLabel = 'biodynamisch'
    const biodynamisch = bottlePrice(lot, player, s)
    expect(basis).toBeCloseTo(base.price * 1.1, 1)
    expect(verband).toBeGreaterThan(basis)
    expect(biodynamisch).toBeGreaterThan(verband)
    expect(monthlyDemand(player)).toBeGreaterThan(base.demand)
  })

  it('Lunaris kostet Ertrag und mehr Pflanzenschutz, bringt aber Güte', () => {
    const s = endMonths(converting(), 9) // Oktober Jahr 1
    const player = currentPlayer(s)
    const plot = player.plots[0]
    const before = { preview: harvestPreview(s, player, plot), protection: monthlyCosts(player, 6).protection }
    player.bioLabel = 'biodynamisch'
    const after = { preview: harvestPreview(s, player, plot), protection: monthlyCosts(player, 6).protection }
    expect(after.preview.hectoliters).toBeLessThan(before.preview.hectoliters)
    expect(after.preview.quality).toBe(before.preview.quality + BIO_LABELS.biodynamisch.quality)
    expect(after.protection).toBeCloseTo(before.protection * 1.25)
  })

  it('wer vom Bio-Pflanzenschutz abweicht, verliert Siegel und Umstellungszeit', () => {
    let s = endMonths(converting(), BIO_CONVERSION_MONTHS)
    s = applyAction(s, { type: 'applyBioLabel' })
    s = applyAction(s, { type: 'setProtection', strategy: 'conventional' })
    expect(currentPlayer(s).bioLabel).toBeNull()
    expect(s.log.some((e) => e.text.includes('verliert das Grünblatt-Siegel'))).toBe(true)
    s = applyAction(s, { type: 'setProtection', strategy: 'bio' })
    expect(monthsUntilEligible(s, currentPlayer(s))).toBe(BIO_CONVERSION_MONTHS)
  })

  it('Siegel kosten jedes Jahr eine Gebühr', () => {
    let s = endMonths(converting(), BIO_CONVERSION_MONTHS) // Januar Jahr 3
    s = applyAction(s, { type: 'applyBioLabel' })
    s = endMonths(s, 12)
    expect(s.log.some((e) => e.text.startsWith('Jahresgebühr für Kontrolle und Verband (Grünblatt)'))).toBe(true)
  })

  it('der Biopionier arbeitet sich die Stufen hinauf', () => {
    const { state } = simulate({ seed: 1, years: 8, players: [{ regionId: 'baden', ai: 'bio' }] })
    expect(state.players[0].bioLabel).not.toBeNull()
  })
})
