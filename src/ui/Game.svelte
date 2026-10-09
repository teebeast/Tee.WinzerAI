<script lang="ts">
  import { GRAPES, type GrapeId } from '../engine/data/grapes'
  import { qualityInfo } from '../engine/data/quality'
  import { REGIONS } from '../engine/data/regions'
  import {
    applyAction,
    batchLabel,
    bulkPricePerHl,
    currentPlayer,
    formatEuro,
    harvestPreview,
    MONTH_NAMES,
    plotAgeFactor,
    RuleError,
    usedTankHl,
    validateAction,
  } from '../engine/game'
  import type { Action, GameState } from '../engine/types'
  import { WEATHER_KINDS, WEATHER_LABELS } from '../engine/weather'

  let { game, onChange, onQuit }: { game: GameState; onChange: (g: GameState) => void; onQuit: () => void } =
    $props()

  const grapeIds = Object.keys(GRAPES) as GrapeId[]
  let error = $state('')
  let plantChoice = $state<Record<string, GrapeId>>({})
  let sellAmount = $state<Record<string, number>>({})
  /** Bei Hot-Seat wird der Bildschirm verdeckt, bis der nächste Spieler bereit ist. */
  let handoverFor = $state<string | null>(null)

  const player = $derived(currentPlayer(game))
  const region = $derived(REGIONS[player.regionId])
  const multiplayer = $derived(game.players.length > 1)
  const winner = $derived(game.players.find((p) => p.id === game.winnerId))
  const recentLog = $derived(
    game.log
      .filter((e) => e.playerId === null || e.playerId === player.id)
      .slice(-12)
      .reverse(),
  )

  function run(action: Action) {
    try {
      const next = applyAction(game, action)
      error = ''
      if (action.type === 'endTurn' && multiplayer) handoverFor = currentPlayer(next).id
      onChange(next)
    } catch (e) {
      if (e instanceof RuleError) error = e.message
      else throw e
    }
  }

  function allowed(action: Action): boolean {
    return validateAction(game, action) === null
  }

  function hint(action: Action): string {
    return validateAction(game, action) ?? ''
  }
</script>

{#if handoverFor}
  <div class="card handover">
    <p class="muted">{MONTH_NAMES[game.month - 1]}, Jahr {game.year}</p>
    <h2>{player.name} ist am Zug</h2>
    <button class="primary" onclick={() => (handoverFor = null)}>Los geht's</button>
  </div>
{:else}
  <header class="topbar">
    <div>
      <strong>{MONTH_NAMES[game.month - 1]} · Jahr {game.year}</strong>
      <span class="muted">{player.name} · {region.name}</span>
    </div>
    <div class="stats">
      <span class:negative={player.money < 0} title="Kontostand">💶 {formatEuro(player.money)}</span>
      <span title="Siegpunkte">🏆 {player.points} / {game.targetPoints}</span>
      <span title="Tankbelegung">🛢️ {usedTankHl(player)} / {player.tankCapacityHl} hl</span>
    </div>
  </header>

  {#if winner}
    <div class="card banner">
      <strong>{winner.name} hat gewonnen!</strong>
      <button onclick={onQuit}>Neues Spiel</button>
    </div>
  {/if}

  {#if error}
    <div class="card error" role="alert">{error}</div>
  {/if}

  <main class="grid">
    <section class="card">
      <h2>Wetter</h2>
      <p class="muted">Prognose für den {MONTH_NAMES[game.month - 1]}</p>
      {#each WEATHER_KINDS as kind (kind)}
        <div class="bar-row">
          <span>{WEATHER_LABELS[kind]}</span>
          <div class="bar"><div class="fill {kind}" style:width="{game.forecast[kind] * 100}%"></div></div>
          <span class="num">{Math.round(game.forecast[kind] * 100)} %</span>
        </div>
      {/each}
      {#if game.lastWeather}
        <p class="muted">Vormonat: {WEATHER_LABELS[game.lastWeather]}</p>
      {/if}
    </section>

    <section class="card">
      <h2>Weinberg</h2>
      {#each player.plots as plot (plot.id)}
        {@const harvestAction = { type: 'harvest', plotId: plot.id } as const}
        <div class="item">
          <div class="item-head">
            <strong>{plot.name}</strong>
            <span class="muted">{plot.hectares} ha · {plot.grape ? GRAPES[plot.grape].name : 'brach'}</span>
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
            {#if allowed(harvestAction)}
              {@const preview = harvestPreview(game, player, plot)}
              <button onclick={() => run(harvestAction)}>
                Lesen: ~{preview.hectoliters} hl {qualityInfo(preview.level).name} ({formatEuro(preview.cost)})
              </button>
            {/if}
          {:else}
            {@const grape = plantChoice[plot.id] ?? 'riesling'}
            {@const plantAction = { type: 'plant', plotId: plot.id, grape } as const}
            <div class="row">
              <select bind:value={() => grape, (v) => (plantChoice[plot.id] = v)} aria-label="Rebsorte">
                {#each grapeIds as id (id)}
                  <option value={id}>
                    {GRAPES[id].name} ({formatEuro(GRAPES[id].plantCostPerHa * plot.hectares)})
                  </option>
                {/each}
              </select>
              <button disabled={!allowed(plantAction)} title={hint(plantAction)} onclick={() => run(plantAction)}>
                Pflanzen
              </button>
            </div>
          {/if}
        </div>
      {/each}
    </section>

    <section class="card">
      <h2>Keller</h2>
      {#if player.cellar.length === 0}
        <p class="muted">Noch kein Wein im Tank. Gelesen wird ab August.</p>
      {/if}
      {#each player.cellar as batch (batch.id)}
        {@const registerAction = { type: 'register', batchId: batch.id } as const}
        {@const amount = Math.min(sellAmount[batch.id] ?? batch.hectoliters, batch.hectoliters)}
        <div class="item">
          <div class="item-head">
            <strong>{batchLabel(batch)}</strong>
            <span class="muted">{batch.hectoliters} hl · Güte {batch.quality}</span>
          </div>
          <div class="muted small">
            {#if batch.registered}
              ✔ amtlich geprüft
            {:else if batch.monthsUntilReady > 0}
              reift noch {batch.monthsUntilReady} Monat{batch.monthsUntilReady === 1 ? '' : 'e'}
            {:else}
              ausgebaut
            {/if}
          </div>
          <div class="row">
            {#if !batch.registered && batch.level !== 'deutscher-wein'}
              <button
                disabled={!allowed(registerAction)}
                title={hint(registerAction)}
                onclick={() => run(registerAction)}
              >
                Prüfen (+{qualityInfo(batch.level).apPoints} P.)
              </button>
            {/if}
            <input
              type="number"
              min="1"
              max={batch.hectoliters}
              aria-label="Menge in hl"
              bind:value={() => amount, (v) => (sellAmount[batch.id] = v)}
            />
            <button onclick={() => run({ type: 'sellBulk', batchId: batch.id, hectoliters: amount })}>
              Fasswein verkaufen ({formatEuro(bulkPricePerHl(batch) * amount)})
            </button>
          </div>
        </div>
      {/each}
    </section>

    <section class="card">
      <h2>Logbuch</h2>
      <ul class="log">
        {#each recentLog as entry, i (i)}
          <li><span class="muted">{entry.month}/{entry.year}</span> {entry.text}</li>
        {/each}
      </ul>
    </section>
  </main>

  <footer class="bottombar">
    <button class="ghost" onclick={onQuit}>Spiel beenden</button>
    <button class="primary" disabled={!!winner} onclick={() => run({ type: 'endTurn' })}>
      {multiplayer ? 'Zug beenden' : 'Monat beenden'} →
    </button>
  </footer>
{/if}

<style>
  .topbar,
  .bottombar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .topbar > div:first-child {
    display: flex;
    flex-direction: column;
  }
  .bottombar {
    position: sticky;
    bottom: 0;
    border-top: 1px solid var(--border);
    border-bottom: none;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-variant-numeric: tabular-nums;
  }
  .negative {
    color: var(--danger);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 340px), 1fr));
    gap: 16px;
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }
  h2 {
    font-size: 1.05rem;
    margin: 0 0 8px;
  }
  .item {
    padding: 10px 0;
    border-top: 1px solid var(--border);
  }
  .item-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 4px 8px;
  }
  .small {
    font-size: 0.85rem;
    margin: 2px 0 6px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }
  .row input[type='number'] {
    width: 5.5em;
  }
  .bar-row {
    display: grid;
    grid-template-columns: 7em 1fr 3.5em;
    align-items: center;
    gap: 8px;
    margin: 4px 0;
  }
  .bar {
    height: 10px;
    background: var(--border);
    border-radius: 5px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
  }
  .fill.sonnig {
    background: var(--sun);
  }
  .fill.wechselhaft {
    background: var(--cloud);
  }
  .fill.nass {
    background: var(--rain);
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.9rem;
  }
  .log li {
    padding: 3px 0;
  }
  .handover {
    max-width: 420px;
    margin: 20vh auto 0;
    text-align: center;
  }
  .banner,
  .error {
    max-width: 1200px;
    margin: 16px auto 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .banner {
    border-color: var(--wine);
  }
  .error {
    border-color: var(--danger);
    color: var(--danger);
  }
</style>
