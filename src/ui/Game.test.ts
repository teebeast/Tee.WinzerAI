import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { runAiTurns } from '../engine/ai'
import { applyAction, currentPlayer, newGame } from '../engine/game'
import type { GameState } from '../engine/types'
import Game from './Game.svelte'
import NewGame from './NewGame.svelte'
import type { Page } from './pages'

function endMonths(state: GameState, count: number): GameState {
  for (let i = 0; i < count; i++) state = applyAction(state, { type: 'endTurn' })
  return state
}

/** Spielstand mit Wein im Tank, geprüften Flaschen und Kredit */
function advancedGame(): GameState {
  let state = newGame({
    seed: 5,
    players: [
      { name: 'Anna', regionId: 'mosel' },
      { name: 'Ben', regionId: 'pfalz' },
    ],
  })
  state = endMonths(state, 18) // Oktober Jahr 1
  state = applyAction(state, { type: 'harvest', plotId: currentPlayer(state).plots[0].id })
  state = endMonths(state, 12) // April Jahr 2
  state = applyAction(state, { type: 'borrow', amount: 20_000 })
  state = applyAction(state, { type: 'bottle', batchId: currentPlayer(state).cellar[0].id, hectoliters: 50 })
  state = applyAction(state, { type: 'register', lotId: currentPlayer(state).bottles[0].id })
  return state
}

describe('Oberfläche', () => {
  it('rendert den Startbildschirm', () => {
    const { body } = render(NewGame, { props: { onStart: () => {}, onLoad: () => {} } })
    expect(body).toContain('Spiel starten')
  })

  it('rendert ein fortgeschrittenes Spiel auf allen Unterseiten', () => {
    const game = advancedGame()
    const expected: Record<Page, string[]> = {
      hof: ['Jetzt zu tun', 'Logbuch', 'Siegpunkte', 'Zug beenden', 'Rangliste'],
      weinberg: ['Pflanzenschutz', 'Lagenqualität', 'Riesling'],
      keller: ['Im Tank und im Fass', 'Flaschenlager', 'Großhandel', 'Abfüllen'],
      betrieb: ['Laufende Kosten', 'Aufnehmen', 'Vinothek', 'Konkurrenz'],
      rangliste: ['Weingüter im Vergleich', 'Anna', 'Ben'],
    }
    for (const [page, texts] of Object.entries(expected)) {
      const { body } = render(Game, { props: { game, onChange: () => {}, onQuit: () => {}, initialPage: page as Page } })
      for (const text of texts) expect(body, `${page}: ${text}`).toContain(text)
    }
  })

  it('rendert Sekt, Exportanfrage, Panschen und Konkurrenz', () => {
    let game = advancedGame()
    game = applyAction(game, { type: 'makeSekt', batchId: currentPlayer(game).cellar[0].id, hectoliters: 5 })
    currentPlayer(game).exportOffer = {
      id: 'x', country: 'Japan', bottlesPerMonth: 500, pricePerBottle: 6,
      minLevel: 'qualitaetswein', minQuality: 60, months: 12,
    }
    const page = (initialPage: Page) =>
      render(Game, { props: { game, onChange: () => {}, onQuit: () => {}, initialPage } }).body
    expect(page('hof')).toContain('Anfrage aus Japan')
    for (const text of ['SEKT', 'reift noch', 'Kellertricks']) expect(page('keller')).toContain(text)
    expect(page('betrieb')).toContain('Konkurrenz')
  })

  it('rendert eine Partie gegen die KI mit laufender Versteigerung', () => {
    let game = runAiTurns(
      newGame({
        seed: 3,
        players: [
          { name: 'Anna', regionId: 'mosel' },
          { name: 'Steinbach', regionId: 'mosel', ai: 'tradition' },
        ],
      }),
    )
    game = runAiTurns(applyAction(game, { type: 'endTurn' })) // Februar
    expect(game.auction.length).toBeGreaterThan(0)
    const { body } = render(Game, { props: { game, onChange: () => {}, onQuit: () => {} } })
    for (const text of ['Weinbergversteigerung', 'Mindestgebot', 'Rangliste', 'Monat beenden']) {
      expect(body).toContain(text)
    }
    const ranking = render(Game, { props: { game, onChange: () => {}, onQuit: () => {}, initialPage: 'rangliste' } })
    expect(ranking.body).toContain('KI Traditionswinzer')
  })
})
