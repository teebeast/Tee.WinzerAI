<script lang="ts">
  import { AI_PROFILES } from '../../engine/ai'
  import { REGIONS } from '../../engine/data/regions'
  import { formatEuro, hasPointTarget as pointTarget, isEndless } from '../../engine/game'
  import { netWorth, totalHectares } from '../../engine/market'
  import { relation, relationLabel } from '../../engine/rivals'
  import type { GameState, Player } from '../../engine/types'

  let { game, player }: { game: GameState; player: Player } = $props()

  const ranking = $derived([...game.players].sort((a, b) => b.points - a.points || netWorth(b) - netWorth(a)))
  const hasPointTarget = $derived(pointTarget(game))
  /** Balkenlänge: bis zum Punkteziel, bei offenem Ende relativ zum Besten */
  const scale = $derived(Math.max(hasPointTarget ? game.targetPoints : 0, ...game.players.map((p) => p.points), 1))
  const MEDALS = ['🥇', '🥈', '🥉']
  const rivals = $derived(game.players.filter((p) => p.ai !== null && !p.bankrupt && p.id !== player.id))
</script>

<div class="page">
  <div class="page-head card">
    <div>
      <h1>🏆 Rangliste</h1>
      <span class="muted small">
        {hasPointTarget
          ? `Gewonnen hat, wer zuerst ${game.targetPoints} Punkte erreicht.`
          : isEndless(game)
            ? 'Endlosspiel: Die Rangliste zeigt den aktuellen Stand.'
            : 'Punkte entscheiden am Ende der Partie.'}
        Vermögen = Betriebswert + Konto − Kredit.
      </span>
    </div>
  </div>

  <section class="card">
    <h2>Siegpunkte</h2>
    <div class="bars">
      {#each ranking as p, i (p.id)}
        <div class="bar-row" class:current={p.id === player.id} class:out={p.bankrupt}>
          <span class="place">{MEDALS[i] ?? `${i + 1}.`}</span>
          <span class="name">{p.name}</span>
          <div class="bar">
            <div style:width="{(p.points / scale) * 100}%"></div>
            {#if hasPointTarget}<span class="goal" title="Ziel"></span>{/if}
          </div>
          <strong class="num">{p.points}</strong>
        </div>
      {/each}
    </div>
  </section>

  <section class="card">
    <h2>Weingüter im Vergleich</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Weingut</th>
            <th class="num">Punkte</th>
            <th class="num">⭐</th>
            <th class="num">ha</th>
            <th class="num">Vermögen</th>
          </tr>
        </thead>
        <tbody>
          {#each ranking as p, i (p.id)}
            <tr class:current={p.id === player.id} class:out={p.bankrupt}>
              <td>{i + 1}</td>
              <td>
                {p.name}
                <span class="muted small">
                  · {REGIONS[p.regionId].name}{p.ai ? ` · KI ${AI_PROFILES[p.ai].name}` : ''}{p.bankrupt ? ' · insolvent' : ''}
                </span>
              </td>
              <td class="num">{p.points}</td>
              <td class="num">{Math.round(p.reputation)}</td>
              <td class="num">{totalHectares(p)}</td>
              <td class="num">{formatEuro(netWorth(p))}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  {#if rivals.length > 0}
    <section class="card">
      <h2>🤝 Nachbarschaft</h2>
      <p class="muted small">
        So stehen die Computergegner zu dir. Kooperationen machen Nachbarn freundlicher – erwischte Sabotage, weggeschnappte
        Weinberge und Weinskandale verstimmen sie. Freundliche Nachbarn im selben Gebiet bieten Zusammenarbeit an, verstimmte
        starten Rabattaktionen oder beschweren sich öffentlich. Mit der Zeit beruhigen sich die Gemüter.
      </p>
      <ul class="relations">
        {#each rivals as rival (rival.id)}
          {@const value = relation(rival, player.id)}
          {@const label = relationLabel(value)}
          <li>
            <span class="relation-icon" aria-hidden="true">{label.icon}</span>
            <span class="relation-name">
              {rival.name}
              <span class="muted small">· {REGIONS[rival.regionId].name}{rival.regionId === player.regionId ? ' (Nachbar)' : ''}</span>
            </span>
            <span class="chip" class:good={value >= 10} class:bad={value <= -10}>{label.text} ({value > 0 ? '+' : ''}{Math.round(value)})</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .relations {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .relations li {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    align-items: center;
  }
  .relation-icon {
    font-size: 1.3rem;
  }
  .relation-name {
    flex: 1;
  }
  .bars {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .bar-row {
    display: grid;
    grid-template-columns: 2.2em minmax(5em, 10em) 1fr 3.5em;
    align-items: center;
    gap: 8px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .bar {
    position: relative;
    height: 18px;
    background: var(--border);
    border-radius: 9px;
    overflow: hidden;
  }
  .bar > div {
    height: 100%;
    background: color-mix(in srgb, var(--wine) 55%, var(--border));
    border-radius: 9px;
  }
  .current .bar > div {
    background: var(--wine);
  }
  .goal {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: #d1a12c;
  }
  .table-wrap {
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th,
  td {
    text-align: left;
    padding: 6px 4px;
    border-top: 1px solid var(--border);
    vertical-align: top;
  }
  th {
    font-weight: 600;
    border-top: none;
  }
  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .current td,
  .current .name {
    color: var(--wine);
    font-weight: 600;
  }
  .out td,
  .out .name {
    color: var(--muted);
    text-decoration: line-through;
  }
</style>
