<script lang="ts">
  import { TREND_RANGE } from '../engine/data/economy'
  import { TREND_KEYS, trendDirection, trendName } from '../engine/trends'
  import type { GameState, Player, TrendKey } from '../engine/types'

  /** Markttrends: Preisfaktor je Rebsorte und für Sekt, eigene Sorten hervorgehoben */
  let { game, player }: { game: GameState; player: Player } = $props()

  const ARROWS = { up: '↗', down: '↘', flat: '→' } as const
  const ARROW_LABELS = { up: 'steigend', down: 'fallend', flat: 'stabil' } as const

  const own = $derived(
    new Set<TrendKey>([
      ...player.plots.flatMap((p) => (p.grape ? [p.grape] : [])),
      ...player.cellar.map((b) => b.grape),
      ...player.bottles.map((l) => (l.sparkling ? 'sekt' : l.grape)),
    ]),
  )
  const rows = $derived(
    TREND_KEYS.map((key) => ({ key, trend: game.trends[key], direction: trendDirection(game.trends[key]) })).sort(
      (a, b) => b.trend.value - a.trend.value,
    ),
  )
  /** Balken: 100 % liegt in der Mitte der Skala */
  const width = (value: number) => ((value - TREND_RANGE[0]) / (TREND_RANGE[1] - TREND_RANGE[0])) * 100
</script>

<section class="card market">
  <h2>📈 Weinmarkt</h2>
  <p class="muted small">
    Preisfaktor je Sorte – wirkt auf Ab-Hof-, Großhandels- und Fassweinpreise. Trends wandern langsam; neue Reben tragen erst
    im dritten Jahr. <strong>Fett</strong>: deine Sorten.
  </p>
  <ul>
    {#each rows as row (row.key)}
      <li class:own={own.has(row.key)}>
        <span class="name">{trendName(row.key)}</span>
        <span class="bar" aria-hidden="true">
          <span class="fill" class:high={row.trend.value >= 1} style:width="{width(row.trend.value)}%"></span>
          <span class="mid" style:left="{width(1)}%"></span>
        </span>
        <span class="value">{Math.round(row.trend.value * 100)} %</span>
        <span class="arrow {row.direction}" title={ARROW_LABELS[row.direction]} aria-label={ARROW_LABELS[row.direction]}>
          {ARROWS[row.direction]}
        </span>
      </li>
    {/each}
  </ul>
</section>

<style>
  ul {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
    gap: 4px 20px;
  }
  li {
    display: grid;
    grid-template-columns: 9em minmax(0, 1fr) 3.4em 1.4em;
    gap: 8px;
    align-items: center;
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  li.own {
    color: var(--text);
    font-weight: 600;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar {
    position: relative;
    height: 8px;
    border-radius: 4px;
    background: var(--border);
    overflow: hidden;
  }
  .fill {
    position: absolute;
    inset: 0 auto 0 0;
    background: var(--danger);
    opacity: 0.7;
  }
  .fill.high {
    background: var(--good);
  }
  .mid {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--text);
    opacity: 0.4;
  }
  .value {
    text-align: right;
  }
  .arrow.up {
    color: var(--good);
  }
  .arrow.down {
    color: var(--danger);
  }
</style>
