<script lang="ts">
  import { monthHints } from '../engine/advisor'
  import { MONTH_NAMES } from '../engine/game'
  import type { GameState, Player } from '../engine/types'

  let { game, player }: { game: GameState; player: Player } = $props()

  const hints = $derived(monthHints(game, player))
</script>

<section class="card tasks">
  <h2>📋 Diesen {MONTH_NAMES[game.month - 1]}</h2>
  <ul>
    {#each hints as hint (hint.text)}
      <li class:important={hint.important}>{hint.text}</li>
    {/each}
  </ul>
</section>

<style>
  .tasks {
    border-color: var(--wine);
  }
  ul {
    margin: 0;
    padding-left: 1.2em;
  }
  li {
    margin: 4px 0;
    color: var(--muted);
  }
  li.important {
    color: var(--text);
    font-weight: 500;
  }
</style>
