import { render } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { applyAction, currentPlayer, newGame } from '../engine/game'
import type { GameState } from '../engine/types'
import Game from './Game.svelte'
import NewGame from './NewGame.svelte'

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
    const { body } = render(NewGame, { props: { onStart: () => {} } })
    expect(body).toContain('Spiel starten')
  })

  it('rendert ein fortgeschrittenes Spiel mit allen Bereichen', () => {
    const game = advancedGame()
    const { body } = render(Game, { props: { game, onChange: () => {}, onQuit: () => {} } })
    for (const text of ['Weinberg', 'Keller', 'Flaschenlager', 'Betrieb', 'Logbuch', 'Großhandel', 'Zug beenden']) {
      expect(body).toContain(text)
    }
  })
})
