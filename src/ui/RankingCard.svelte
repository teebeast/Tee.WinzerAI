<script lang="ts">
  import { AI_PROFILES } from '../engine/ai'
  import { REGIONS } from '../engine/data/regions'
  import { formatEuro } from '../engine/game'
  import { netWorth, totalHectares } from '../engine/market'
  import type { GameState, Player } from '../engine/types'

  let { game, player }: { game: GameState; player: Player } = $props()

  const ranking = $derived([...game.players].sort((a, b) => b.points - a.points || netWorth(b) - netWorth(a)))
</script>

<section class="card">
  <h2>Rangliste</h2>
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
  <p class="muted small">Ziel: {game.targetPoints} Punkte. Vermögen = Betriebswert + Konto − Kredit.</p>
</section>

<style>
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
  .current td {
    color: var(--wine);
    font-weight: 600;
  }
  .out td {
    color: var(--muted);
    text-decoration: line-through;
  }
</style>
