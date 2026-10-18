<script lang="ts">
  import { BIO_CONVERSION_YEARS, CLEARING_COST_PER_HA, PROTECTION } from '../../engine/data/economy'
  import { GRAPES, type GrapeId } from '../../engine/data/grapes'
  import { QUALITY_LEVELS, qualityInfo } from '../../engine/data/quality'
  import { formatEuro, harvestPreview, plotAgeFactor, plotSalePrice, validateAction } from '../../engine/game'
  import { isBioCertified, plantedHectares, totalHectares } from '../../engine/market'
  import type { Action, GameState, Player, ProtectionStrategy } from '../../engine/types'
  import { trendDirection } from '../../engine/trends'
  import { iceWineChance } from '../../engine/vineyard'
  import PlotScene from '../gfx/PlotScene.svelte'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const grapeIds = Object.keys(GRAPES) as GrapeId[]
  const strategies = Object.keys(PROTECTION) as ProtectionStrategy[]
  const STRATEGY_ICONS: Record<ProtectionStrategy, string> = { none: '🚫', conventional: '🧪', bio: '🌿' }
  /** Lagenqualität −1 bis +2 als Sterne */
  const stars = (site: number) => '★'.repeat(site + 2) + '☆'.repeat(2 - site)
  let plantChoice = $state<Record<string, GrapeId>>({})
  const ARROWS = { up: '↗', down: '↘', flat: '→' } as const
  /** Markttrend als kurzer Zusatz in der Sortenauswahl */
  const trendLabel = (id: GrapeId) =>
    `Markt ${Math.round(game.trends[id].value * 100)} % ${ARROWS[trendDirection(game.trends[id])]}`

  function clearPlot(plotId: string, name: string, grape: string, cost: number) {
    if (confirm(`${grape} in der Lage ${name} roden? Das kostet ${formatEuro(cost)}; eine neue Rebsorte pflanzt du im März oder April – sie trägt erst ab dem dritten Jahr.`)) {
      run({ type: 'clearPlot', plotId })
    }
  }

  function sellPlot(plotId: string, name: string, price: number) {
    if (confirm(`Die Lage ${name} für ${formatEuro(price)} verkaufen? Der Weinberg ist danach weg, Trauben am Stock inklusive.`)) {
      run({ type: 'sellPlot', plotId })
    }
  }
  const frostChance = $derived(Math.round(iceWineChance(game, player.regionId) * 100))

  /** Reifeskala für die Mostgewichtsanzeige */
  const SCALE_MIN = 40
  const SCALE_MAX = 160
  const pos = (oechsle: number) =>
    Math.max(0, Math.min(100, ((oechsle - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100))
  const ticks = QUALITY_LEVELS.filter((q) => !q.special && q.minOechsle > 0)
  const SHORT: Record<string, string> = {
    qualitaetswein: 'QbA',
    spaetlese: 'Spl',
    auslese: 'Asl',
    beerenauslese: 'BA',
    trockenbeerenauslese: 'TBA',
  }
</script>

<div class="page">
  <div class="page-head card">
    <div>
      <h1>🍇 Weinberg</h1>
      <span class="muted small">
        {plantedHectares(player)} von {totalHectares(player)} ha bestockt · {player.plots.length} Parzellen
      </span>
    </div>
    <div class="protection">
      <span class="muted small">Pflanzenschutz</span>
      <div class="segmented" role="group" aria-label="Pflanzenschutz">
        {#each strategies as id (id)}
          <button
            aria-pressed={player.protection === id}
            class:active={player.protection === id}
            title="{Math.round(PROTECTION[id].protection * 100)} % Schutz, {formatEuro(PROTECTION[id].costPerHa)}/ha im Mai–August"
            onclick={() => player.protection !== id && run({ type: 'setProtection', strategy: id })}
          >
            {STRATEGY_ICONS[id]} {id === 'none' ? 'Keiner' : PROTECTION[id].name}
          </button>
        {/each}
      </div>
      <span class="small" class:warning={player.protection === 'none'} class:muted={player.protection !== 'none'}>
        {#if player.protection === 'bio' && player.bioSinceYear !== null}
          {isBioCertified(player, game.year)
            ? 'Bio-zertifiziert: +10 % im Direktverkauf'
            : `In Umstellung – zertifiziert ab Jahr ${player.bioSinceYear + BIO_CONVERSION_YEARS}`}
        {:else if player.protection === 'none'}
          Ohne Schutz drohen bei Nässe und Hitze schwere Ausfälle.
        {:else}
          {Math.round(PROTECTION[player.protection].protection * 100)} % Schutz vor Pilzen und Schädlingen
        {/if}
      </span>
    </div>
  </div>

  <div class="tiles">
    {#each player.plots as plot (plot.id)}
      {@const harvestAction = { type: 'harvest', plotId: plot.id } as const}
      {@const gambleAction = { type: 'gambleIceWine', plotId: plot.id, gamble: !plot.iceWineGamble } as const}
      {@const young = plot.grape !== null && plotAgeFactor(plot, game.year) === 0}
      <article class="tile">
        <PlotScene
          month={game.month}
          color={plot.grape ? GRAPES[plot.grape].color : null}
          {young}
          harvested={plot.harvestedThisYear}
          iceWine={plot.iceWineGamble}
          botrytis={plot.botrytis}
          health={plot.health}
          site={plot.site}
        />
        <div class="tile-body">
          <div class="item-head">
            <strong>{plot.name}</strong>
            <span class="stars" title="Lagenqualität">{stars(plot.site)}</span>
          </div>
          <div class="muted small">{plot.hectares} ha · {plot.grape ? GRAPES[plot.grape].name : 'Brache'}</div>

          {#if plot.grape && !young && !plot.harvestedThisYear}
            <div class="ripeness" title="Mostgewicht">
              <div class="scale">
                <div class="fill {GRAPES[plot.grape].color}" style:width="{pos(plot.oechsle)}%"></div>
                {#each ticks as tick (tick.level)}
                  <span class="tick" style:left="{pos(tick.minOechsle)}%"></span>
                {/each}
              </div>
              <div class="labels">
                {#each ticks.filter((t) => t.level !== 'kabinett') as tick (tick.level)}
                  <span style:left="{pos(tick.minOechsle)}%">{SHORT[tick.level]}</span>
                {/each}
              </div>
            </div>
            <div class="chips">
              <span class="chip">{plot.oechsle > 0 ? `${Math.round(plot.oechsle)} °Oe` : 'Reife noch nicht begonnen'}</span>
              <span class="chip" class:bad={plot.health < 0.7}>❤️ {Math.round(plot.health * 100)} %</span>
              {#if plot.cropFactor < 0.99}<span class="chip bad">Ertrag {Math.round(plot.cropFactor * 100)} %</span>{/if}
              {#if plot.botrytis}<span class="chip good">🍇 Edelfäule</span>{/if}
              {#if plot.iceWineGamble}<span class="chip">❄️ hängt für Eiswein ({frostChance} %)</span>{/if}
            </div>
          {:else if young}
            <p class="muted small">🌱 Junganlage – trägt ab dem dritten Jahr.</p>
          {:else if plot.harvestedThisYear}
            <p class="muted small">✔ In diesem Jahr gelesen.</p>
          {/if}

          <div class="tile-actions">
            {#if plot.grape}
              {#if validateAction(game, harvestAction) === null}
                {@const preview = harvestPreview(game, player, plot)}
                <button class="wide" onclick={() => run(harvestAction)}>
                  ✂️ Lesen: ~{preview.hectoliters} hl {qualityInfo(preview.level).name}, Güte {preview.quality}
                  <span class="muted small">({formatEuro(preview.cost)})</span>
                </button>
              {/if}
              {#if validateAction(game, gambleAction) === null}
                <button
                  class="ghost wide"
                  title="Bei Frost von −7 °C im Dezember wird Eiswein gelesen (wenig Menge, viele Punkte) – sonst ist die Ernte verloren."
                  onclick={() => run(gambleAction)}
                >
                  {plot.iceWineGamble ? 'Eiswein abbrechen' : `❄️ Für Eiswein hängen lassen (${frostChance} %)`}
                </button>
              {/if}
            {:else}
              {@const grape = plantChoice[plot.id] ?? 'riesling'}
              {@const plantAction = { type: 'plant', plotId: plot.id, grape } as const}
              {@const problem = validateAction(game, plantAction)}
              <select bind:value={() => grape, (v) => (plantChoice[plot.id] = v)} aria-label="Rebsorte">
                {#each grapeIds as id (id)}
                  <option value={id}>
                    {GRAPES[id].name} ({formatEuro(GRAPES[id].plantCostPerHa * plot.hectares)}) · {trendLabel(id)}
                  </option>
                {/each}
              </select>
              <button disabled={problem !== null} title={problem ?? ''} onclick={() => run(plantAction)}>🌱 Pflanzen</button>
            {/if}
          </div>

          <div class="manage">
            {#if plot.grape}
              {@const cost = plot.hectares * CLEARING_COST_PER_HA}
              {@const problem = validateAction(game, { type: 'clearPlot', plotId: plot.id })}
              <button
                class="ghost"
                disabled={problem !== null}
                title={problem ?? 'Reben entfernen, um eine andere Sorte zu pflanzen'}
                onclick={() => clearPlot(plot.id, plot.name, GRAPES[plot.grape!].name, cost)}
              >
                🪓 Roden ({formatEuro(cost)})
              </button>
            {/if}
            {#if player.plots.length > 1}
              {@const price = plotSalePrice(plot, game.year)}
              <button class="ghost" title="Verkauf zu 90 % des Schätzwerts" onclick={() => sellPlot(plot.id, plot.name, price)}>
                💰 Verkaufen ({formatEuro(price)})
              </button>
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>
</div>

<style>
  .protection {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .warning {
    color: var(--danger);
  }
  .manage {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed var(--border);
  }
  .manage button {
    padding: 4px 8px;
    font-size: 0.85rem;
  }
  .stars {
    color: #d1a12c;
    letter-spacing: 1px;
  }
  .ripeness {
    margin: 4px 0 2px;
  }
  .scale {
    position: relative;
    height: 10px;
    background: var(--border);
    border-radius: 5px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
  }
  .fill.weiss {
    background: linear-gradient(90deg, #a8c25a, #d4c24a);
  }
  .fill.rot {
    background: linear-gradient(90deg, #9a4a6a, #5a1d44);
  }
  .tick {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--surface);
    opacity: 0.8;
  }
  .labels {
    position: relative;
    height: 14px;
    font-size: 0.7rem;
    color: var(--muted);
  }
  .labels span {
    position: absolute;
    transform: translateX(-50%);
  }
  .wide {
    width: 100%;
  }
  select {
    flex: 1;
    min-width: 0;
  }
</style>
