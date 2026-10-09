<script lang="ts">
  import { BOTTLE_COST } from '../engine/data/economy'
  import { formatEuro, usedTankHl, validateAction, wineLabel } from '../engine/game'
  import { bulkPricePerHl, hlToBottles } from '../engine/market'
  import type { Action, GameState, Player } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  let amounts = $state<Record<string, number>>({})
</script>

<section class="card">
  <h2>Keller <span class="muted small">({usedTankHl(player)} / {player.tankCapacityHl} hl)</span></h2>
  {#if player.cellar.length === 0}
    <p class="muted">Kein Wein im Tank. Gelesen wird ab August.</p>
  {/if}
  {#each player.cellar as batch (batch.id)}
    {@const amount = Math.max(1, Math.min(amounts[batch.id] ?? batch.hectoliters, batch.hectoliters))}
    {@const bottleAction = { type: 'bottle', batchId: batch.id, hectoliters: amount } as const}
    {@const bottleProblem = validateAction(game, bottleAction)}
    <div class="item">
      <div class="item-head">
        <strong>{wineLabel(batch)}</strong>
        <span class="muted">{batch.hectoliters} hl · Güte {batch.quality}</span>
      </div>
      <div class="muted small">
        {batch.monthsUntilReady > 0
          ? `reift noch ${batch.monthsUntilReady} Monat${batch.monthsUntilReady === 1 ? '' : 'e'}`
          : 'ausgebaut – bereit zum Abfüllen'}
      </div>
      <div class="row">
        <label class="row">
          <input
            type="number"
            min="1"
            max={batch.hectoliters}
            bind:value={() => amount, (v) => (amounts[batch.id] = v)}
          />
          hl
        </label>
        <button disabled={bottleProblem !== null} title={bottleProblem ?? ''} onclick={() => run(bottleAction)}>
          Abfüllen ({hlToBottles(amount)} Fl., {formatEuro(hlToBottles(amount) * BOTTLE_COST)})
        </button>
        <button onclick={() => run({ type: 'sellBulk', batchId: batch.id, hectoliters: amount })}>
          Fasswein (+{formatEuro(bulkPricePerHl(batch) * amount)})
        </button>
      </div>
    </div>
  {/each}
</section>
