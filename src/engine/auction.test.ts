import { describe, expect, it } from 'vitest'
import { maxAffordableBid } from './auction'
import { applyAction, currentPlayer, newGame } from './game'
import type { GameState } from './types'

function february(seed = 3): GameState {
  const state = newGame({
    seed,
    players: [
      { name: 'Anna', regionId: 'mosel' },
      { name: 'Ben', regionId: 'mosel' },
      { name: 'Cleo', regionId: 'pfalz' },
    ],
  })
  let s = state
  for (let i = 0; i < 3; i++) s = applyAction(s, { type: 'endTurn' })
  return s
}

function endRound(state: GameState): GameState {
  let s = state
  const month = s.month
  while (s.month === month) s = applyAction(s, { type: 'endTurn' })
  return s
}

describe('Weinbergversteigerung', () => {
  it('bietet im Februar Weinberge in jedem Gebiet der Spieler an', () => {
    const s = february()
    expect(s.month).toBe(2)
    const regions = new Set(s.auction.map((p) => p.regionId))
    expect(regions).toEqual(new Set(['mosel', 'pfalz']))
    for (const parcel of s.auction) {
      expect(parcel.hectares).toBeGreaterThanOrEqual(1)
      expect(parcel.hectares).toBeLessThanOrEqual(5)
      expect(parcel.minimumBid).toBeGreaterThan(0)
    }
  })

  it('prüft Gebiet, Mindestgebot und Finanzierbarkeit', () => {
    const s = february()
    const own = s.auction.find((p) => p.regionId === 'mosel')!
    const foreign = s.auction.find((p) => p.regionId === 'pfalz')!
    const bid = (parcelId: string, amount: number) => () => applyAction(s, { type: 'bid', parcelId, amount })

    expect(bid(foreign.id, foreign.minimumBid)).toThrow('Anbaugebiet')
    expect(bid(own.id, own.minimumBid - 1000)).toThrow('Mindestgebot')
    expect(bid(own.id, maxAffordableBid(currentPlayer(s)) + 1000)).toThrow('nicht finanzierbar')
    expect(bid(own.id, own.minimumBid)).not.toThrow()
  })

  it('das höchste Gebot über dem Investorengebot gewinnt und bezahlt', () => {
    let s = february()
    const parcel = s.auction.find((p) => p.regionId === 'mosel')!
    const winning = parcel.outsideBid + 2000
    s = applyAction(s, { type: 'bid', parcelId: parcel.id, amount: winning - 1000 }) // Anna
    s = applyAction(s, { type: 'endTurn' })
    s = applyAction(s, { type: 'bid', parcelId: parcel.id, amount: winning }) // Ben
    const benBefore = currentPlayer(s)
    s = endRound(s)

    const ben = s.players[1]
    expect(s.auction).toEqual([])
    expect(ben.plots).toHaveLength(4)
    expect(ben.plots[3].hectares).toBe(parcel.hectares)
    // Kaufpreis plus laufende Kosten sind abgeflossen – egal ob vom Konto oder per Kredit
    expect(ben.money - ben.loan).toBeLessThan(benBefore.money - benBefore.loan - winning)
    expect(s.players[0].plots).toHaveLength(3)
    expect(s.log.some((e) => e.playerId === null && e.text.includes(`an ${ben.name}`))).toBe(true)
  })

  it('ohne ausreichendes Gebot kaufen auswärtige Investoren', () => {
    let s = february()
    const parcel = s.auction.find((p) => p.regionId === 'mosel')!
    s = applyAction(s, { type: 'bid', parcelId: parcel.id, amount: parcel.minimumBid })
    expect(parcel.minimumBid).toBeLessThanOrEqual(parcel.outsideBid)
    s = endRound(s)
    expect(s.players[0].plots).toHaveLength(3)
    expect(s.log.some((e) => e.text.includes('auswärtige Investoren'))).toBe(true)
  })

  it('Gebote lassen sich zurückziehen', () => {
    let s = february()
    const parcel = s.auction.find((p) => p.regionId === 'mosel')!
    s = applyAction(s, { type: 'bid', parcelId: parcel.id, amount: parcel.minimumBid })
    s = applyAction(s, { type: 'bid', parcelId: parcel.id, amount: 0 })
    expect(s.auction.find((p) => p.id === parcel.id)!.bids).toEqual({})
  })
})
