<script lang="ts">
  import { CLEARING_COST_PER_HA, PROTECTION } from '../../engine/data/economy'
  import { BIO_LABELS, monthsUntilEligible } from '../../engine/bio'
  import BioCertification from '../BioCertification.svelte'
  import RegionProfile from '../RegionProfile.svelte'
  import { GRAPES, type GrapeId } from '../../engine/data/grapes'
  import { QUALITY_LEVELS, qualityInfo } from '../../engine/data/quality'
  import { formatEuro, harvestPreview, plotAgeFactor, plotSalePrice, validateAction } from '../../engine/game'
  import { plantedHectares, totalHectares } from '../../engine/market'
  import type { Action, GameState, Player, ProtectionStrategy } from '../../engine/types'
  import { trendDirection } from '../../engine/trends'
  import {
    droughtChance,
    frostCandlesCost,
    frostChance as lateFrostChance,
    hailChance,
    installCost,
    insurancePremium,
    isInsured,
  } from '../../engine/defense'
  import { iceWineChance } from '../../engine/vineyard'
  import PlotScene from '../gfx/PlotScene.svelte'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const grapeIds = Object.keys(GRAPES) as GrapeId[]
  const strategies = Object.keys(PROTECTION) as ProtectionStrategy[]
  const STRATEGY_ICONS: Record<ProtectionStrategy, string> = { none: '🚫', conventional: '🧪', bio: '🌿' }
  /** Lagenqualität −1 bis +2 als Sterne */
  const stars = (site: number) => '★'.repeat(site + 2) + '☆'.repeat(2 - site)
  let plantChoice = $state<Record<string, GrapeId>>({})

  function changeProtection(strategy: ProtectionStrategy) {
    if (player.protection === strategy) return
    const label = player.bioLabel ? BIO_LABELS[player.bioLabel].name : null
    const leavingBio = player.protection === 'bio' && player.bioSince !== null
    const warning = label
      ? `Ohne Bio-Pflanzenschutz verlierst du das ${label}-Siegel und die Umstellungszeit. Trotzdem wechseln?`
      : 'Ohne Bio-Pflanzenschutz beginnt die Umstellung später wieder von vorn. Trotzdem wechseln?'
    if (leavingBio && !confirm(warning)) return
    run({ type: 'setProtection', strategy })
  }
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
      <RegionProfile regionId={player.regionId} />
    </div>
    <div class="protection">
      <span class="muted small">Pflanzenschutz</span>
      <div class="segmented" role="group" aria-label="Pflanzenschutz">
        {#each strategies as id (id)}
          <button
            aria-pressed={player.protection === id}
            class:active={player.protection === id}
            title="{Math.round(PROTECTION[id].protection * 100)} % Schutz, {formatEuro(PROTECTION[id].costPerHa)}/ha im Mai–August"
            onclick={() => changeProtection(id)}
          >
            {STRATEGY_ICONS[id]} {id === 'none' ? 'Keiner' : PROTECTION[id].name}
          </button>
        {/each}
      </div>
      <span class="small" class:warning={player.protection === 'none'} class:muted={player.protection !== 'none'}>
        {#if player.protection === 'bio' && player.bioLabel}
          {BIO_LABELS[player.bioLabel].icon} {BIO_LABELS[player.bioLabel].name}-zertifiziert
        {:else if player.protection === 'bio'}
          {monthsUntilEligible(game, player) === 0
            ? '🌱 Umstellung abgeschlossen – das Grünblatt-Siegel kann beantragt werden'
            : `🌱 In Umstellung – noch ${monthsUntilEligible(game, player)} Monate bis zum Grünblatt-Siegel`}
        {:else if player.protection === 'conventional'}
          {Math.round(PROTECTION.conventional.protection * 100)} % Schutz vor Pilzen und Schädlingen · Bio-Siegel nur mit Bio-Pflanzenschutz
        {:else}
          Ohne Schutz drohen bei Nässe und Hitze schwere Ausfälle.
        {/if}
      </span>
    </div>
  </div>

  <section class="card defense">
    <h2>🛡️ Wetterschutz</h2>
    <div class="defense-grid">
      <div>
        <strong>Ernteversicherung</strong>
        {#if isInsured(game, player)}
          <p class="small"><span class="chip good">✔ versichert für Jahr {game.year}</span></p>
          <p class="muted small">Zahlt 80 % des Schadens durch Frost, Hagel, Dürre und Unwetter.</p>
        {:else}
          {@const action = { type: 'insureHarvest' } as const}
          {@const problem = validateAction(game, action)}
          <p class="muted small">Abschluss Januar bis April für das laufende Jahr. Zahlt 80 % des Schadens durch Frost, Hagel, Dürre und Unwetter.</p>
          <button disabled={problem !== null} title={problem ?? ''} onclick={() => run(action)}>
            Versichern ({formatEuro(insurancePremium(game, player))})
          </button>
        {/if}
      </div>
      <div>
        <strong>Frostkerzen</strong>
        {#if lateFrostChance(game, player) > 0}
          <p class="small">
            Spätfrostgefahr diesen Monat: <strong>{Math.round(lateFrostChance(game, player) * 100)} %</strong> (−40 % Ertrag)
          </p>
          {#if player.frostCandles}
            <span class="chip good">🕯️ stehen bereit</span>
          {:else}
            {@const action = { type: 'frostCandles' } as const}
            {@const problem = validateAction(game, action)}
            <button disabled={problem !== null} title={problem ?? ''} onclick={() => run(action)}>
              🕯️ Bereitstellen ({formatEuro(frostCandlesCost(game, player))})
            </button>
          {/if}
        {:else}
          <p class="muted small">Spätfrost droht im April und Mai – dann lassen sich hier für einen Monat Kerzen aufstellen.</p>
        {/if}
      </div>
      <div>
        <strong>Hagel und Dürre</strong>
        <p class="muted small">
          Hagel Juni–August: {Math.round(hailChance(game) * 100)} % pro Monat · Dürre bei Sonne im Juli/August:
          {Math.round(droughtChance(game, player) * 100)} %. Netze und Bewässerung installierst du je Parzelle.
        </p>
      </div>
    </div>
  </section>

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
              {#if plot.hailNet}<span class="chip" title="Hält 90 % des Hagelschadens ab">🕸️ Hagelnetz</span>{/if}
              {#if plot.irrigation}<span class="chip" title="Schützt vor Hitze- und Dürreschäden">💧 Bewässerung</span>{/if}
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
              {#if GRAPES[plot.grape].color === 'rot' && validateAction(game, harvestAction) === null}
                <button
                  class="ghost wide"
                  title="Hell gekeltert: nach drei Monaten trinkfertig, eigener Markttrend, im Sommer 15 % teurer"
                  onclick={() => run({ type: 'harvest', plotId: plot.id, rose: true })}
                >
                  🌸 Als Rosé lesen
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
            {#if !plot.hailNet}
              {@const action = { type: 'installHailNet', plotId: plot.id } as const}
              {@const problem = validateAction(game, action)}
              <button class="ghost" disabled={problem !== null} title={problem ?? 'Hält 90 % des Hagelschadens ab'} onclick={() => run(action)}>
                🕸️ Hagelnetz ({formatEuro(installCost(plot, 'hailNet'))})
              </button>
            {/if}
            {#if !plot.irrigation}
              {@const action = { type: 'installIrrigation', plotId: plot.id } as const}
              {@const problem = validateAction(game, action)}
              <button class="ghost" disabled={problem !== null} title={problem ?? 'Schützt vor Hitze- und Dürreschäden'} onclick={() => run(action)}>
                💧 Bewässerung ({formatEuro(installCost(plot, 'irrigation'))})
              </button>
            {/if}
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
              {@const price = plotSalePrice(player, plot, game.year)}
              <button class="ghost" title="Verkauf zu 90 % des Schätzwerts" onclick={() => sellPlot(plot.id, plot.name, price)}>
                💰 Verkaufen ({formatEuro(price)})
              </button>
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>

  <!-- Die Stufenleiter erscheint erst mit Bio-Pflanzenschutz; vorher genügt der Hinweis beim Pflanzenschutz. -->
  {#if player.protection === 'bio'}
    <BioCertification {game} {player} {run} />
  {/if}
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
  .defense-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
    gap: 12px 20px;
  }
  .defense-grid p {
    margin: 4px 0 6px;
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
