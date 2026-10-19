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
  /** Letzte Sicherung gescheitert – sonst merkt man erst beim nächsten Start, dass der Stand fehlt */
  let saveFailed = $state(false)

  function save(id: string, game: GameState) {
    writeSave(id, game).then((ok) => (saveFailed = !ok))
  }

  function update(next: GameState) {
    current = { saveId: current!.saveId, game: next }
    save(current.saveId, next)
  }

  function start(options: NewGameOptions) {
    current = { saveId: newSaveId(), game: runAiTurns(newGame(options)) }
    save(current.saveId, current.game)
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

{#if current && saveFailed}
  <div class="save-failed" role="alert">
    ⚠️ Der Spielstand konnte nicht gespeichert werden – vermutlich ist der Speicher des Browsers voll oder gesperrt.
    Lösche alte Spielstände im Hauptmenü oder prüfe die Browsereinstellungen.
  </div>
{/if}

{#if current}
  <Game game={current.game} onChange={update} onQuit={quit} />
{:else}
  <NewGame onStart={start} onLoad={load} />
{/if}

<style>
  .save-failed {
    position: fixed;
    left: 50%;
    bottom: 12px;
    z-index: 30;
    transform: translateX(-50%);
    width: min(640px, calc(100% - 24px));
    padding: 10px 14px;
    border-radius: 10px;
    background: var(--danger);
    color: #fff;
    font-size: 0.92rem;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
  }
</style>
