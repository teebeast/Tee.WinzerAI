import { describe, expect, it } from 'vitest'
import { parcelValue } from './auction'
import { REGIONS, type RegionId } from './data/regions'
import { currentPlayer, harvestPreview, newGame } from './game'
import { assetValue, bottlePrice, monthlyCosts, monthlyDemand } from './market'
import type { BottleLot, GameState } from './types'

/** Ein Weingut im Gebiet, im Oktober des dritten Jahres, alle Parzellen mit gleichen alten Riesling-Reben */
function estate(regionId: RegionId): GameState {
  const s = newGame({ seed: 1, randomEvents: false, start: { plots: 'planted' }, players: [{ name: 'Anna', regionId }] })
  s.year = 3
  s.month = 10
  const player = currentPlayer(s)
  for (const plot of player.plots) Object.assign(plot, { grape: 'riesling', oechsle: 80, site: 0, health: 1, cropFactor: 1 })
  for (const trend of Object.values(s.trends)) trend.value = 1
  return s
}

const lot: BottleLot = {
  id: 'x', grape: 'riesling', vintage: 2, oechsle: 85, level: 'kabinett', quality: 75, adulterated: null,
  bottles: 100, sparkling: false, monthsUntilReady: 0, registered: true, awards: [],
}

describe('Gebietscharakter', () => {
  it('jedes Gebiet hat einen Charakter in sinnvollen Grenzen', () => {
    for (const region of Object.values(REGIONS)) {
      const c = region.character
      expect(c.slope).toBeGreaterThanOrEqual(0)
      expect(c.slope).toBeLessThanOrEqual(1)
      expect(c.prestige).toBeGreaterThanOrEqual(-1)
      expect(c.prestige).toBeLessThanOrEqual(2)
      expect(c.tourism).toBeGreaterThanOrEqual(0)
      expect(c.tourism).toBeLessThanOrEqual(2)
      expect(c.yieldFactor).toBeGreaterThan(0.7)
      expect(c.landPrice).toBeGreaterThan(0.7)
      expect(c.profile.length).toBeGreaterThan(20)
    }
  })

  it('Steillagen: teurere Lese und Pflege, aber mehr Güte', () => {
    const [steep, flat] = [estate('mittelrhein'), estate('rheinhessen')]
    const [ps, pf] = [currentPlayer(steep), currentPlayer(flat)]
    const [hs, hf] = [harvestPreview(steep, ps, ps.plots[0]), harvestPreview(flat, pf, pf.plots[0])]
    expect(hs.cost).toBeGreaterThan(hf.cost)
    expect(monthlyCosts(ps, 3).upkeep).toBeGreaterThan(monthlyCosts(pf, 3).upkeep)
    // Die Eignung für Riesling unterscheidet sich (Mittelrhein +2, Rheinhessen +1) – die Steillage legt noch etwas drauf
    expect(hs.quality - hf.quality).toBeGreaterThan(6)
    // Rheinhessen trägt deutlich mehr
    expect(hf.hectoliters).toBeGreaterThan(hs.hectoliters * 1.2)
  })

  it('Renommee hebt die Preise, Tourismus die Nachfrage', () => {
    const [famous, hidden] = [estate('mosel'), estate('saale-unstrut')]
    expect(bottlePrice(lot, currentPlayer(famous), famous)).toBeGreaterThan(bottlePrice(lot, currentPlayer(hidden), hidden) * 1.1)
    const [busy, quiet] = [estate('pfalz'), estate('nahe')]
    expect(monthlyDemand(currentPlayer(busy))).toBeCloseTo(monthlyDemand(currentPlayer(quiet)) * 1.2, -1)
  })

  it('der Bodenpreis bestimmt Weinbergswerte und damit den Kreditrahmen', () => {
    const [dear, cheap] = [estate('rheingau'), estate('sachsen')]
    expect(assetValue(currentPlayer(dear))).toBeGreaterThan(assetValue(currentPlayer(cheap)))
    const parcel = { hectares: 3, grape: null, plantedYear: null, site: 0 }
    expect(parcelValue({ ...parcel, regionId: 'rheingau' }, 3)).toBeGreaterThan(parcelValue({ ...parcel, regionId: 'sachsen' }, 3) * 1.3)
  })
})
