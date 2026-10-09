<script lang="ts">
  import { SITE_LABELS } from '../engine/auction'
  import { GRAPES, type GrapeId } from '../engine/data/grapes'
  import { qualityInfo } from '../engine/data/quality'
  import { formatEuro, harvestPreview, plotAgeFactor, validateAction } from '../engine/game'
  import type { Action, GameState, Player } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const grapeIds = Object.keys(GRAPES) as GrapeId[]
  let plantChoice = $state<Record<string, GrapeId>>({})
</script>

<section class="card">
  <h2>Weinberg</h2>
  {#each player.plots as plot (plot.id)}
    {@const harvestAction = { type: 'harvest', plotId: plot.id } as const}
    <div class="item">
      <div class="item-head">
        <strong>{plot.name}</strong>
        <span class="muted">
          {plot.hectares} ha · {plot.grape ? GRAPES[plot.grape].name : 'brach'} · {SITE_LABELS[plot.site]}
        </span>
      </div>
      {#if plot.grape}
        <div class="muted small">
          {#if plotAgeFactor(plot, game.year) === 0}
            Junganlage – noch kein Ertrag
          {:else if plot.harvestedThisYear}
            gelesen
          {:else}
            {plot.oechsle > 0 ? `${Math.round(plot.oechsle)} °Oe` : 'Reife noch nicht begonnen'}
            · Gesundheit {Math.round(plot.health * 100)} %
          {/if}
        </div>
        {#if validateAction(game, harvestAction) === null}
          {@const preview = harvestPreview(game, player, plot)}
          <button onclick={() => run(harvestAction)}>
            Lesen: ~{preview.hectoliters} hl {qualityInfo(preview.level).name}, Güte {preview.quality} ({formatEuro(preview.cost)})
          </button>
        {/if}
      {:else}
        {@const grape = plantChoice[plot.id] ?? 'riesling'}
        {@const plantAction = { type: 'plant', plotId: plot.id, grape } as const}
        {@const problem = validateAction(game, plantAction)}
        <div class="row">
          <select bind:value={() => grape, (v) => (plantChoice[plot.id] = v)} aria-label="Rebsorte">
            {#each grapeIds as id (id)}
              <option value={id}>{GRAPES[id].name} ({formatEuro(GRAPES[id].plantCostPerHa * plot.hectares)})</option>
            {/each}
          </select>
          <button disabled={problem !== null} title={problem ?? ''} onclick={() => run(plantAction)}>Pflanzen</button>
        </div>
      {/if}
    </div>
  {/each}
</section>
