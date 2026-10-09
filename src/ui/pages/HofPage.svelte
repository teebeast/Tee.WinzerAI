<script lang="ts">
  import { monthHints } from '../../engine/advisor'
  import { REGIONS } from '../../engine/data/regions'
  import { formatEuro, MONTH_NAMES, usedTankHl } from '../../engine/game'
  import { creditLimit, netWorth } from '../../engine/market'
  import { climateWarming } from '../../engine/rules'
  import type { Action, GameState, Player } from '../../engine/types'
  import { iceWineChance } from '../../engine/vineyard'
  import { WEATHER_KINDS, WEATHER_LABELS } from '../../engine/weather'
  import AuctionCard from '../AuctionCard.svelte'
  import ExportCard from '../ExportCard.svelte'
  import Ring from '../gfx/Ring.svelte'
  import WeatherIcon from '../gfx/WeatherIcon.svelte'
  import { pageInfo, type Page } from '../pages'
  import SeasonScene from '../SeasonScene.svelte'

  /** Übersicht: Was ist los, was muss ich jetzt tun? */
  let {
    game,
    player,
    over,
    run,
    go,
  }: { game: GameState; player: Player; over: boolean; run: (a: Action) => void; go: (p: Page) => void } = $props()

  const hints = $derived(over ? [] : monthHints(game, player))
  const hasPointTarget = $derived(game.targetPoints < Number.MAX_SAFE_INTEGER)
  const ranking = $derived([...game.players].sort((a, b) => b.points - a.points || netWorth(b) - netWorth(a)))
  const place = $derived(ranking.findIndex((p) => p.id === player.id) + 1)
  const bottles = $derived(player.bottles.reduce((sum, l) => sum + l.bottles, 0))
  const limit = $derived(creditLimit(player))
  const recentLog = $derived(
    game.log
      .filter((e) => e.playerId === null || e.playerId === player.id)
      .slice(-12)
      .reverse(),
  )
</script>

<div class="page">
  <SeasonScene
    month={game.month}
    weather={game.lastWeather}
    vinothek={player.hasVinothek}
    barrique={player.barriqueCapacityHl > 0}
  />

  <div class="kpis">
    <button class="kpi" onclick={() => go('betrieb')}>
      <span class="kpi-icon" aria-hidden="true">💶</span>
      <span class="kpi-text">
        <span class="muted small">Konto</span>
        <strong class:negative={player.money < 0}>{formatEuro(player.money)}</strong>
        <span class="meter" title="Kredit"><span style:width="{limit > 0 ? (player.loan / limit) * 100 : 0}%"></span></span>
        <span class="muted small">Kredit {formatEuro(player.loan)}</span>
      </span>
    </button>
    <div class="kpi">
      <Ring value={player.points} max={hasPointTarget ? game.targetPoints : player.points || 1} text={String(player.points)} />
      <span class="kpi-text">
        <span class="muted small">Siegpunkte</span>
        <strong>{hasPointTarget ? `Ziel ${game.targetPoints}` : 'kein Punkteziel'}</strong>
        <span class="muted small">
          {game.players.length > 1 ? `Platz ${place} von ${game.players.length}` : 'Solo-Partie'}
        </span>
      </span>
    </div>
    <div class="kpi">
      <Ring value={player.reputation} text={String(Math.round(player.reputation))} />
      <span class="kpi-text">
        <span class="muted small">Bekanntheit</span>
        <strong>{player.reputation >= 60 ? 'gefragt' : player.reputation >= 30 ? 'bekannt' : 'Geheimtipp'}</strong>
        <span class="muted small">von 100</span>
      </span>
    </div>
    <button class="kpi" onclick={() => go('keller')}>
      <span class="kpi-icon" aria-hidden="true">🍾</span>
      <span class="kpi-text">
        <span class="muted small">Vorrat</span>
        <strong>{bottles.toLocaleString('de-DE')} Fl.</strong>
        <span class="meter" title="Tankbelegung">
          <span style:width="{(usedTankHl(player) / player.tankCapacityHl) * 100}%"></span>
        </span>
        <span class="muted small">Tank {usedTankHl(player)} / {player.tankCapacityHl} hl</span>
      </span>
    </button>
  </div>

  <div class="columns">
    <div class="col">
      <section class="card tasks">
        <h2>📋 Jetzt zu tun im {MONTH_NAMES[game.month - 1]}</h2>
        {#if over}
          <p class="muted">Die Partie ist beendet.</p>
        {/if}
        <ul>
          {#each hints as hint (hint.text)}
            {@const target = pageInfo(hint.area)}
            <li class:important={hint.important}>
              <span class="dot" aria-hidden="true">{target.icon}</span>
              <span class="hint-text">{hint.text}</span>
              {#if hint.area !== 'hof'}
                <button class="go" onclick={() => go(hint.area)}>{target.label} →</button>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
      <AuctionCard {game} {player} {run} />
      <ExportCard {player} {run} />
      <section class="card">
        <h2>Wetter im {MONTH_NAMES[game.month - 1]}</h2>
        <div class="forecast">
          {#each WEATHER_KINDS as kind (kind)}
            <div class="weather" style:opacity={0.35 + game.forecast[kind] * 0.65}>
              <WeatherIcon {kind} />
              <strong>{Math.round(game.forecast[kind] * 100)} %</strong>
              <span class="muted small">{WEATHER_LABELS[kind]}</span>
            </div>
          {/each}
        </div>
        {#if game.month === 11 || game.month === 12}
          <p class="small">❄️ Eiswein-Frost (−7 °C) im Dezember: {Math.round(iceWineChance(game, player.regionId) * 100)} %</p>
        {/if}
        {#if game.climateChange && game.year > 1}
          <p class="muted small">
            🌡️ {REGIONS[player.regionId].name} ist schon
            {climateWarming(game).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Wärmestufen wärmer als zu Spielbeginn.
          </p>
        {/if}
      </section>
    </div>

    <div class="col">

      <section class="card">
        <h2>Logbuch</h2>
        <ul class="log">
          {#each recentLog as entry, i (i)}
            <li><span class="muted">{entry.month}/{entry.year}</span> {entry.text}</li>
          {/each}
        </ul>
      </section>
    </div>
  </div>
</div>

<style>
  .kpis {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
    gap: 12px;
  }

  .kpi {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 92px;
    padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text);
    text-align: left;
    font-weight: normal;
  }
  button.kpi:hover {
    border-color: var(--wine);
  }
  .kpi-icon {
    font-size: 2rem;
    width: 56px;
    text-align: center;
  }
  .kpi-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }
  .kpi-text strong {
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
  }
  .negative {
    color: var(--danger);
  }
  .meter {
    display: block;
    height: 6px;
    background: var(--border);
    border-radius: 3px;
    overflow: hidden;
  }
  .meter > span {
    display: block;
    height: 100%;
    background: var(--wine);
  }
  .columns {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 800px) {
    .columns {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .col {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .tasks {
    border-color: var(--wine);
  }
  .tasks ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .tasks li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-top: 1px solid var(--border);
    color: var(--muted);
  }
  .tasks li:first-child {
    border-top: none;
  }
  .tasks li.important {
    color: var(--text);
    font-weight: 500;
  }
  .dot {
    font-size: 1.3rem;
  }
  .hint-text {
    flex: 1;
  }
  .go {
    flex: none;
    white-space: nowrap;
  }
  .forecast {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    text-align: center;
  }
  .weather {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-variant-numeric: tabular-nums;
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.9rem;
    max-height: 340px;
    overflow-y: auto;
  }
  .log li {
    padding: 3px 0;
  }
  @media (max-width: 560px) {
    .kpis {
      grid-template-columns: 1fr 1fr;
    }
    .kpi {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    .kpi-icon {
      width: auto;
      font-size: 1.6rem;
    }
  }
</style>
