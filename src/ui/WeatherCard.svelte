<script lang="ts">
  import { MONTH_NAMES } from '../engine/game'
  import { REGIONS } from '../engine/data/regions'
  import { climateWarming } from '../engine/rules'
  import type { GameState, Player } from '../engine/types'
  import { iceWineChance } from '../engine/vineyard'
  import { WEATHER_KINDS, WEATHER_LABELS } from '../engine/weather'

  let { game, player }: { game: GameState; player: Player } = $props()
</script>

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
  {#if game.month === 11 || game.month === 12}
    <p class="small">❄️ Chance auf Eiswein-Frost (−7 °C) im Dezember: {Math.round(iceWineChance(game, player.regionId) * 100)} %</p>
  {/if}
  {#if game.climateChange && game.year > 1}
    <p class="muted small">
      🌡️ Klimawandel: {REGIONS[player.regionId].name} ist schon {climateWarming(game).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Wärmestufen wärmer als zu Spielbeginn.
    </p>
  {/if}
  {#if game.lastWeather}
    <p class="muted">Vormonat: {WEATHER_LABELS[game.lastWeather]}</p>
  {/if}
</section>

<style>
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
</style>
