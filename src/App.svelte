<script lang="ts">
  import { runAiTurns } from './engine/ai'
  import { newGame } from './engine/game'
  import type { GameState, NewGameOptions } from './engine/types'
  import { deleteSave, newSaveId, writeSave, type SaveSlot } from './save'
  import Game from './ui/Game.svelte'
  import NewGame from './ui/NewGame.svelte'

  // $state.raw: Der Spielstand wird nie verändert, sondern bei jedem Zug ersetzt. Ein tief reaktiver
  // Proxy wäre überflüssig – und die Engine könnte ihn nicht per structuredClone kopieren.
  let current = $state.raw<{ saveId: string; game: GameState } | null>(null)

  function update(next: GameState) {
    current = { saveId: current!.saveId, game: next }
    writeSave(current.saveId, next)
  }

  function start(options: NewGameOptions) {
    current = { saveId: newSaveId(), game: runAiTurns(newGame(options)) }
    writeSave(current.saveId, current.game)
  }

  function load(slot: SaveSlot) {
    current = { saveId: slot.id, game: slot.state }
  }

  /** Zurück zum Hauptmenü – laufende Partien bleiben gespeichert, beendete werden aufgeräumt. */
  function quit(finished: boolean) {
    if (finished) deleteSave(current!.saveId)
    current = null
  }
</script>

{#if current}
  <Game game={current.game} onChange={update} onQuit={quit} />
{:else}
  <NewGame onStart={start} onLoad={load} />
{/if}
