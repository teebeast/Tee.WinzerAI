<script lang="ts">
  import { runAiTurns } from './engine/ai'
  import { newGame } from './engine/game'
  import type { GameState, NewGameOptions } from './engine/types'
  import { loadGame, saveGame } from './save'
  import Game from './ui/Game.svelte'
  import NewGame from './ui/NewGame.svelte'

  let game = $state<GameState | null>(loadGame())

  function update(next: GameState | null) {
    game = next
    saveGame(next)
  }

  function quit() {
    if (confirm('Spiel wirklich beenden? Der Spielstand wird gelöscht.')) update(null)
  }
</script>

{#if game}
  <Game {game} onChange={update} onQuit={quit} />
{:else}
  <NewGame onStart={(options: NewGameOptions) => update(runAiTurns(newGame(options)))} />
{/if}
