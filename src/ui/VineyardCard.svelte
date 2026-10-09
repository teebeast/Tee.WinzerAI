<script lang="ts">
  import { SITE_LABELS } from '../engine/auction'
  import { BIO_CONVERSION_YEARS, PROTECTION } from '../engine/data/economy'
  import { GRAPES, type GrapeId } from '../engine/data/grapes'
  import { qualityInfo } from '../engine/data/quality'
  import { formatEuro, harvestPreview, plotAgeFactor, validateAction } from '../engine/game'
  import { isBioCertified } from '../engine/market'
  import type { Action, GameState, Player, ProtectionStrategy } from '../engine/types'
  import { iceWineChance } from '../engine/vineyard'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const grapeIds = Object.keys(GRAPES) as GrapeId[]
  const strategies = Object.keys(PROTECTION) as ProtectionStrategy[]
  let plantChoice = $state<Record<string, GrapeId>>({})
  const frostChance = $derived(Math.round(iceWineChance(game, player.regionId) * 100))
</script>

<section class="card">
  <h2>Weinberg</h2>
  <label class="row small">
    Pflanzenschutz
    <select
      value={player.protection}
      onchange={(e) => run({ type: 'setProtection', strategy: e.currentTarget.value as ProtectionStrategy })}
    >
      {#each strategies as id (id)}
        <option value={id}>
          {PROTECTION[id].name} ({Math.round(PROTECTION[id].protection * 100)} % Schutz, {formatEuro(PROTECTION[id].costPerHa)}/ha)
        </option>
      {/each}
    </select>
  </label>
  {#if player.protection === 'bio' && player.bioSinceYear !== null}
    <p class="muted small">
      {isBioCertified(player, game.year)
        ? '🌿 Bio-zertifiziert: +10 % im Direktverkauf'
        : `🌿 In Umstellung – zertifiziert ab Jahr ${player.bioSinceYear + BIO_CONVERSION_YEARS}`}
    </p>
  {:else if player.protection === 'none'}
    <p class="warning small">Ohne Pflanzenschutz drohen bei Nässe und Hitze schwere Ausfälle.</p>
  {/if}

  {#each player.plots as plot (plot.id)}
    {@const harvestAction = { type: 'harvest', plotId: plot.id } as const}
    {@const gambleAction = { type: 'gambleIceWine', plotId: plot.id, gamble: !plot.iceWineGamble } as const}
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
            {#if plot.oechsle > 0}
              <span
                class="ripeness {GRAPES[plot.grape].color}"
                style:--ripe="{Math.min(100, (plot.oechsle / 130) * 100)}%"
                title="Mostgewicht"
              ></span>
            {/if}
            {plot.oechsle > 0 ? `${Math.round(plot.oechsle)} °Oe` : 'Reife noch nicht begonnen'}
            · Gesundheit {Math.round(plot.health * 100)} %
            {#if plot.cropFactor < 0.99}· Ertrag {Math.round(plot.cropFactor * 100)} %{/if}
            {#if plot.botrytis}· 🍇 Edelfäule{/if}
            {#if plot.iceWineGamble}· ❄️ hängt für Eiswein ({frostChance} % Frostchance){/if}
          {/if}
        </div>
        <div class="row">
          {#if validateAction(game, harvestAction) === null}
            {@const preview = harvestPreview(game, player, plot)}
            <button onclick={() => run(harvestAction)}>
              Lesen: ~{preview.hectoliters} hl {qualityInfo(preview.level).name}, Güte {preview.quality} ({formatEuro(preview.cost)})
            </button>
          {/if}
          {#if validateAction(game, gambleAction) === null}
            <button
              class="ghost"
              title="Bei Frost von −7 °C im Dezember wird Eiswein gelesen (wenig Menge, viele Punkte) – sonst ist die Ernte verloren."
              onclick={() => run(gambleAction)}
            >
              {plot.iceWineGamble ? 'Eiswein abbrechen' : `❄️ Für Eiswein hängen lassen (${frostChance} %)`}
            </button>
          {/if}
        </div>
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

<style>
  .warning {
    color: var(--danger);
  }
  .ripeness {
    display: inline-block;
    width: 60px;
    height: 8px;
    margin-right: 4px;
    border-radius: 4px;
    vertical-align: middle;
    background: linear-gradient(90deg, var(--grape) var(--ripe), var(--border) var(--ripe));
  }
  .ripeness.weiss {
    --grape: #b8b14a;
  }
  .ripeness.rot {
    --grape: #7b2346;
  }
  select {
    max-width: 100%;
  }
</style>
