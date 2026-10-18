<script lang="ts">
  import { MILESTONES, TIER_REWARDS, type MilestoneDef } from '../engine/milestones'
  import { monthText } from '../engine/orders'
  import type { GameState, Player } from '../engine/types'

  /** Meilensteine: nächste Ziele mit Fortschritt und die Chronik des Erreichten */
  let { game, player }: { game: GameState; player: Player } = $props()

  const progress = (def: MilestoneDef) => {
    const [value, target] = def.progress(game, player)
    return { value: Math.max(0, value), target, ratio: Math.max(0, Math.min(1, value / target)) }
  }
  const reached = $derived(
    MILESTONES.filter((m) => player.milestones[m.id] !== undefined).sort(
      (a, b) => player.milestones[b.id] - player.milestones[a.id],
    ),
  )
  const open = $derived(
    MILESTONES.filter((m) => player.milestones[m.id] === undefined).sort((a, b) => progress(b).ratio - progress(a).ratio),
  )
  const earnedPoints = $derived(reached.reduce((sum, m) => sum + TIER_REWARDS[m.tier].points, 0))
  /** Große Zahlen lesbar: 12.500 statt 12500 */
  const num = (n: number) => n.toLocaleString('de-DE')
</script>

<section class="card">
  <h2>🏅 Meilensteine</h2>
  <p class="muted small">
    {reached.length} von {MILESTONES.length} erreicht · {earnedPoints} Punkte daraus. Bronze bringt 1 Punkt, Silber 3, Gold 5 –
    dazu etwas Bekanntheit.
  </p>

  {#if open.length > 0}
    <h3>Nächste Ziele</h3>
    <ul class="milestones">
      {#each open as def (def.id)}
        {@const p = progress(def)}
        <li>
          <span class="icon" aria-hidden="true">{def.icon}</span>
          <span class="text">
            <strong>{def.name}</strong> <span class="tier" title={TIER_REWARDS[def.tier].name}>{TIER_REWARDS[def.tier].icon}</span>
            <span class="muted small">{def.text}</span>
            {#if p.target > 1}
              <span class="meter" aria-hidden="true"><span style:width="{p.ratio * 100}%"></span></span>
              <span class="small">{num(Math.min(p.value, p.target))} / {num(p.target)}</span>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  {#if reached.length > 0}
    <h3>Chronik</h3>
    <ul class="milestones chronicle">
      {#each reached as def (def.id)}
        <li>
          <span class="icon" aria-hidden="true">{def.icon}</span>
          <span class="text">
            <strong>{def.name}</strong> <span class="tier" title={TIER_REWARDS[def.tier].name}>{TIER_REWARDS[def.tier].icon}</span>
            <span class="muted small">{def.text} · {monthText(player.milestones[def.id])}</span>
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  h3 {
    margin: 12px 0 6px;
    font-size: 0.95rem;
  }
  .milestones {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
    gap: 8px;
  }
  .milestones li {
    display: flex;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .chronicle li {
    border-color: color-mix(in srgb, var(--good) 40%, var(--border));
    background: color-mix(in srgb, var(--good) 7%, transparent);
  }
  .icon {
    font-size: 1.5rem;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    min-width: 0;
  }
  .tier {
    font-size: 0.9rem;
  }
  .meter {
    display: block;
    height: 6px;
    border-radius: 3px;
    background: var(--border);
    overflow: hidden;
  }
  .meter > span {
    display: block;
    height: 100%;
    background: var(--wine);
  }
</style>
