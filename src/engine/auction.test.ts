import { describe, expect, it } from 'vitest'
import { playAiTurn, runAiTurns } from './ai'
import { awaitingLot, INVESTOR, nextMinimum } from './auction'
import { AUCTION_INTERVAL } from './data/economy'
import { applyAction, currentPlayer, newGame } from './game'
import type { AuctionLot, GameState, NewGameOptions } from './types'

function game(players: NewGameOptions['players'], seed = 3, start?: NewGameOptions['start']): GameState {
  return runAiTurns(newGame({ seed, players, start }))
}

/** Beendet Monate, bis die Versteigerung die gewünschte Phase erreicht hat */
function until(state: GameState, phase: 'announced' | 'live'): GameState {
  let s = state
  // Bei mehreren Menschen beendet ein endTurn nur den Zug – daher großzügig viele Durchläufe
  for (let i = 0; i < 100 && s.auction?.phase !== phase; i++) s = runAiTurns(applyAction(s, { type: 'endTurn' }))
  expect(s.auction?.phase).toBe(phase)
  return s
}

const anna = { name: 'Anna', regionId: 'mosel' as const }
const steinbach = { name: 'Steinbach', regionId: 'mosel' as const, ai: 'tradition' as const }

/** Live-Versteigerung, bei der Anna am Zug ist, mit selbst gesetzten Limits der Gegner */
function liveFor(limits: Record<string, number> = {}, extraPlayers: NewGameOptions['players'] = []) {
  const s = until(game([anna, ...extraPlayers]), 'live')
  const lot = awaitingLot(s)!
  lot.limits = { ...limits }
  s.players[0].money = Math.max(s.players[0].money, 1_000_000) // genug Spielraum für jedes Testgebot
  return { s, lot }
}

const lotOf = (s: GameState, id: string) => s.auction?.lots.find((l) => l.id === id)
/** Der Weinberg, wie er nach dem Zuschlag im Logbuch steht */
const soldTo = (s: GameState, lot: AuctionLot) => s.log.find((e) => e.text.startsWith(`🔨 Zuschlag: ${lot.name}`))?.text

describe('Weinbergversteigerung', () => {
  it('findet in zufälligen Abständen von 8 bis 16 Monaten statt', () => {
    let s = newGame({ seed: 11, targetPoints: Number.MAX_SAFE_INTEGER, players: [{ ...steinbach }] })
    const months: number[] = []
    while (s.year <= 12 && !s.finished) {
      const before = s.auction?.phase
      s = playAiTurn(s)
      if (s.auction?.phase === 'live' && before !== 'live') months.push((s.year - 1) * 12 + s.month)
    }
    const gaps = [months[0] - 1, ...months.slice(1).map((m, i) => m - months[i])]
    expect(gaps.length).toBeGreaterThan(6)
    for (const gap of gaps) {
      expect(gap).toBeGreaterThanOrEqual(AUCTION_INTERVAL[0])
      expect(gap).toBeLessThanOrEqual(AUCTION_INTERVAL[1])
    }
    expect(new Set(gaps).size).toBeGreaterThan(2)
  })

  it('wird einen Monat vorher mit 1–3 Lagen je Gebiet angekündigt', () => {
    const s = until(game([anna, { name: 'Cleo', regionId: 'pfalz' }]), 'announced')
    const auction = s.auction!
    expect(auction.month).toBe((s.month % 12) + 1)
    for (const regionId of ['mosel', 'pfalz']) {
      const count = auction.lots.filter((l) => l.regionId === regionId).length
      expect(count).toBeGreaterThanOrEqual(1)
      expect(count).toBeLessThanOrEqual(3)
    }
    for (const lot of auction.lots) {
      expect(lot.startPrice).toBeLessThan(lot.estimate)
      expect(lot.status).toBe('pending')
    }
    const live = until(s, 'live')
    expect(awaitingLot(live)?.awaiting).toBe('p1')
  })

  it('wer am meisten bietet, bekommt den Zuschlag – auch weit über dem Schätzwert', () => {
    const { s, lot } = liveFor()
    lot.limits = { [INVESTOR]: Math.round((lot.estimate * 1.3) / 1000) * 1000 }
    s.players[0].money = 1_000_000
    const offer = Math.round((lot.estimate * 1.6) / 1000) * 1000
    const after = applyAction(s, { type: 'auctionBid', lotId: lot.id, amount: offer })

    expect(lotOf(after, lot.id)?.status).toBe('sold')
    expect(soldTo(after, lot)).toContain('an Anna')
    expect(after.players[0].plots.some((p) => p.name === lot.name)).toBe(true)
    expect(after.players[0].money).toBe(1_000_000 - offer)
  })

  it('Gegner überbieten Schritt für Schritt bis zu ihrem Limit', () => {
    const { s, lot } = liveFor()
    const limit = lot.startPrice + 3 * lot.increment
    s.auction!.lots.find((l) => l.id === lot.id)!.limits = { [INVESTOR]: limit }
    let t = applyAction(s, { type: 'auctionBid', lotId: lot.id, amount: lot.startPrice })
    let current = lotOf(t, lot.id)!
    expect(current.leader).toBe(INVESTOR)
    expect(current.price).toBe(lot.startPrice + lot.increment)
    expect(current.awaiting).toBe('p1')

    // Ein Schritt über das Limit genügt
    t = applyAction(t, { type: 'auctionBid', lotId: lot.id, amount: nextMinimum(current) })
    current = lotOf(t, lot.id)!
    expect(current.leader).toBe(INVESTOR)
    expect(current.price).toBe(limit)
    t = applyAction(t, { type: 'auctionBid', lotId: lot.id, amount: nextMinimum(current) })
    expect(soldTo(t, lot)).toContain(`an Anna`)
  })

  it('steigt man aus, entscheidet das zweithöchste Limit über den Preis', () => {
    const { s, lot } = liveFor()
    const [high, low] = [lot.estimate + 20_000, lot.estimate]
    s.auction!.lots.find((l) => l.id === lot.id)!.limits = { [INVESTOR]: high, p2: low }
    s.players.push({ ...structuredClone(s.players[0]), id: 'p2', name: 'Fuchs', ai: 'schlitzohr', money: 1_000_000 })
    const after = applyAction(s, { type: 'auctionPass', lotId: lot.id })
    expect(soldTo(after, lot)).toContain('an auswärtige Investoren')
    expect(soldTo(after, lot)).toContain((low + lot.increment).toLocaleString('de-DE'))
    expect(after.players[0].plots.some((p) => p.name === lot.name)).toBe(false)
  })

  it('ohne Gebote bleibt ein Weinberg unverkauft', () => {
    const { s, lot } = liveFor()
    const after = applyAction(s, { type: 'auctionPass', lotId: lot.id })
    expect(lotOf(after, lot.id)?.status ?? 'unsold').toBe('unsold')
  })

  it('prüft Mindestgebot und Finanzierbarkeit', () => {
    const { s, lot } = liveFor()
    const bid = (amount: number) => () => applyAction(s, { type: 'auctionBid', lotId: lot.id, amount })
    expect(bid(lot.startPrice - 1000)).toThrow('mindestens')
    expect(bid(10_000_000)).toThrow('nicht finanzierbar')
    expect(bid(lot.startPrice)).not.toThrow()
  })

  it('am Monatsende wird ohne weitere Gebote zugeschlagen', () => {
    const { s, lot } = liveFor()
    let t = applyAction(s, { type: 'auctionBid', lotId: lot.id, amount: lot.startPrice })
    t = runAiTurns(applyAction(t, { type: 'endTurn' }))
    expect(t.auction).toBeNull()
    expect(soldTo(t, lot)).toContain('an Anna')
  })

  it('mehrere Menschen im selben Gebiet bieten abwechselnd', () => {
    const { s, lot } = liveFor({}, [{ name: 'Ben', regionId: 'mosel' }])
    expect(lot.awaiting).toBe('p1')
    let t = applyAction(s, { type: 'auctionBid', lotId: lot.id, amount: lot.startPrice })
    expect(lotOf(t, lot.id)?.awaiting).toBe('p2')
    t = applyAction(t, { type: 'auctionBid', lotId: lot.id, amount: lot.startPrice + lot.increment })
    expect(lotOf(t, lot.id)?.awaiting).toBe('p1')
    t = applyAction(t, { type: 'auctionPass', lotId: lot.id })
    expect(soldTo(t, lot)).toContain('an Ben')
  })

  it('Computergegner hinterlegen im Ankündigungsmonat ein Höchstgebot, Menschen nicht', () => {
    const s = until(game([anna, steinbach], 5, { plots: 'planted', money: 400_000 }), 'announced')
    const lot = s.auction!.lots[0]
    // Anna ist am Zug; die KI zieht erst nach ihr
    expect(() => applyAction(s, { type: 'auctionLimit', lotId: lot.id, amount: lot.startPrice })).toThrow('live')
    const aiTurn = applyAction(s, { type: 'endTurn' })
    expect(currentPlayer(aiTurn).id).toBe('p2')
    currentPlayer(aiTurn).money = 2_000_000 // genug Geld, damit die KI sicher mitbietet
    const afterAi = playAiTurn(aiTurn)
    for (const l of afterAi.auction!.lots) {
      expect(l.limits.p2).toBe(Math.round((l.estimate * 1.3) / 1000) * 1000) // Traditionswinzer: 130 % des Schätzwerts
    }
  })
})
