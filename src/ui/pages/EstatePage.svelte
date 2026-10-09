<script lang="ts">
  import {
    BARRIQUE_COST_PER_HL,
    CELLAR_MASTER_QUALITY_BONUS,
    CELLAR_MASTER_SALARY,
    LOAN_INTEREST_RATE,
    MARKETING,
    ONLINE_SHOP_COST,
    SABOTAGE,
    SABOTAGE_DETECTION,
    SABOTAGE_FINE,
    TANK_COST_PER_HL,
    VINOTHEK_COST,
  } from '../../engine/data/economy'
  import { formatEuro, MONTH_NAMES, validateAction } from '../../engine/game'
  import { availableCredit, creditLimit, monthlyCosts, staffFte } from '../../engine/market'
  import type { Action, GameState, MarketingKind, Player, SabotageKind } from '../../engine/types'
  import Ring from '../gfx/Ring.svelte'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const marketingKinds = Object.keys(MARKETING) as MarketingKind[]
  const MARKETING_ICONS: Record<MarketingKind, string> = { social: '📱', hoffest: '🎪', messe: '🏟️' }
  const TANK_STEP = 100
  const sabotageKinds = Object.keys(SABOTAGE) as SabotageKind[]
  let creditAmount = $state(10_000)
  let sabotageTarget = $state('')
  const rivals = $derived(game.players.filter((p) => p.id !== player.id && !p.bankrupt))
  const target = $derived(rivals.find((p) => p.id === sabotageTarget) ?? rivals[0])
  const costs = $derived(monthlyCosts(player, game.month))
  const limit = $derived(creditLimit(player))
  const costParts = $derived(
    [
      { label: 'Personal', value: costs.salaries, color: '#7b2346' },
      { label: 'Weinberge', value: costs.upkeep, color: '#6f9a50' },
      { label: 'Pflanzenschutz', value: costs.protection, color: '#d1a12c' },
      { label: 'Zinsen', value: costs.interest, color: '#4a7fb5' },
    ].filter((p) => p.value > 0),
  )

  function button(action: Action) {
    const problem = validateAction(game, action)
    return { disabled: problem !== null, title: problem ?? '' }
  }

  const upgrades = $derived([
    {
      icon: '🛢️',
      name: 'Edelstahltanks',
      state: `${player.tankCapacityHl} hl`,
      text: 'Mehr Platz für die Ernte',
      action: { type: 'expandTank', hectoliters: TANK_STEP } as Action,
      label: `+${TANK_STEP} hl (${formatEuro(TANK_STEP * TANK_COST_PER_HL)})`,
    },
    {
      icon: '🪵',
      name: 'Barrique',
      state: player.barriqueCapacityHl > 0 ? `${player.barriqueCapacityHl} hl` : 'keins',
      text: 'Eichenfässer – vor allem Rotwein gewinnt an Güte',
      action: { type: 'expandBarrique', hectoliters: TANK_STEP } as Action,
      label: `+${TANK_STEP} hl (${formatEuro(TANK_STEP * BARRIQUE_COST_PER_HL)})`,
    },
    {
      icon: '🏠',
      name: 'Vinothek',
      state: player.hasVinothek ? '✔ geöffnet' : 'fehlt',
      text: 'Probierstube: +30 % Ab-Hof-Absatz',
      action: player.hasVinothek ? null : ({ type: 'buildVinothek' } as Action),
      label: `Bauen (${formatEuro(VINOTHEK_COST)})`,
    },
    {
      icon: '🛒',
      name: 'Online-Shop',
      state: player.hasOnlineShop ? '✔ läuft' : 'fehlt',
      text: 'Verkauft zusätzlich ins ganze Land',
      action: player.hasOnlineShop ? null : ({ type: 'buyOnlineShop' } as Action),
      label: `Starten (${formatEuro(ONLINE_SHOP_COST)})`,
    },
    {
      icon: '👨‍🔬',
      name: 'Kellermeister',
      state: player.hasCellarMaster ? '✔ angestellt' : 'keiner',
      text: `+${CELLAR_MASTER_QUALITY_BONUS} Güte für jede Lese, ${formatEuro(CELLAR_MASTER_SALARY)}/Monat`,
      action: { type: 'cellarMaster', hire: !player.hasCellarMaster } as Action,
      label: player.hasCellarMaster ? 'Entlassen' : 'Einstellen',
    },
  ])
</script>

<div class="page">
  <div class="page-head card">
    <div>
      <h1>🏛️ Betrieb</h1>
      <span class="muted small">Finanzen, Ausstattung und Marketing</span>
    </div>
  </div>

  <div class="tiles">
    <article class="tile">
      <div class="tile-body">
        <h2>💶 Kredit</h2>
        <div class="visual">
          <Ring value={player.loan} max={limit} text="{limit > 0 ? Math.round((player.loan / limit) * 100) : 0}%" />
          <div class="small">
            <div><strong>{formatEuro(player.loan)}</strong> von {formatEuro(limit)}</div>
            <div class="muted">frei: {formatEuro(availableCredit(player))}</div>
            <div class="muted">{Math.round(LOAN_INTEREST_RATE * 100)} % Zinsen p. a.</div>
            {#if player.monthsInsolvent > 0}<div class="danger">Insolvenzwarnung!</div>{/if}
          </div>
        </div>
        <div class="tile-actions">
          <label class="row small">
            <input type="number" min="1000" step="5000" bind:value={creditAmount} aria-label="Betrag" /> €
          </label>
          <div class="row">
            <button {...button({ type: 'borrow', amount: creditAmount })} onclick={() => run({ type: 'borrow', amount: creditAmount })}>
              Aufnehmen
            </button>
            <button {...button({ type: 'repay', amount: creditAmount })} onclick={() => run({ type: 'repay', amount: creditAmount })}>
              Tilgen
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="tile">
      <div class="tile-body">
        <h2>📉 Laufende Kosten</h2>
        <div><strong>{formatEuro(costs.total)}</strong> <span class="muted small">im {MONTH_NAMES[game.month - 1]}</span></div>
        <div class="stack" aria-hidden="true">
          {#each costParts as part (part.label)}
            <span style:flex-grow={part.value} style:background={part.color}></span>
          {/each}
        </div>
        <ul class="legend small">
          {#each costParts as part (part.label)}
            <li><span class="swatch" style:background={part.color}></span>{part.label} <span class="muted">{formatEuro(part.value)}</span></li>
          {/each}
        </ul>
        <p class="muted small">
          {staffFte(player).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Vollzeitkräfte{player.hasCellarMaster
            ? ' + Kellermeister'
            : ''}{player.hasVinothek ? ' + Vinothek' : ''}
        </p>
      </div>
    </article>

    <article class="tile">
      <div class="tile-body">
        <h2>📣 Marketing</h2>
        <div class="row small">
          Bekanntheit <strong>{Math.round(player.reputation)}</strong> / 100
        </div>
        <div class="meter"><div style:width="{player.reputation}%"></div></div>
        <div class="tile-actions">
          {#each marketingKinds as kind (kind)}
            {@const info = MARKETING[kind]}
            <button class="wide split" {...button({ type: 'marketing', kind })} onclick={() => run({ type: 'marketing', kind })}>
              <span>{MARKETING_ICONS[kind]} {info.name}</span>
              <span class="muted small">+{info.reputation} ⭐ · {formatEuro(info.cost)}</span>
            </button>
          {/each}
        </div>
      </div>
    </article>
  </div>

  <h2 class="section">Ausstattung</h2>
  <div class="tiles small-tiles">
    {#each upgrades as up (up.name)}
      <article class="tile upgrade">
        <div class="tile-body">
          <span class="big-icon" aria-hidden="true">{up.icon}</span>
          <strong>{up.name}</strong>
          <span class="chip">{up.state}</span>
          <span class="muted small">{up.text}</span>
          <div class="tile-actions">
            {#if up.action}
              {@const action = up.action}
              <button class="wide" {...button(action)} onclick={() => run(action)}>{up.label}</button>
            {/if}
          </div>
        </div>
      </article>
    {/each}
  </div>

  {#if rivals.length > 0 && target}
    <h2 class="section">Konkurrenz</h2>
    <div class="card rivals">
      <p class="muted small">
        Schmutzige Tricks: {Math.round(SABOTAGE_DETECTION * 100)} % Risiko, erwischt zu werden ({formatEuro(SABOTAGE_FINE)} Strafe).
      </p>
      <div class="row">
        <select bind:value={() => target.id, (v) => (sabotageTarget = v)} aria-label="Ziel">
          {#each rivals as rival (rival.id)}
            <option value={rival.id}>{rival.name}</option>
          {/each}
        </select>
        {#each sabotageKinds as kind (kind)}
          {@const action = { type: 'sabotage', targetId: target.id, kind } as const}
          <button class="danger" {...button(action)} onclick={() => run(action)}>
            {SABOTAGE[kind].name} ({formatEuro(SABOTAGE[kind].cost)})
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .visual {
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .danger {
    color: var(--danger);
    font-weight: 600;
  }
  button.danger {
    border-color: var(--danger);
    font-weight: normal;
  }
  .stack {
    display: flex;
    height: 14px;
    border-radius: 7px;
    overflow: hidden;
    background: var(--border);
  }
  .stack span {
    flex-basis: 0;
  }
  .legend {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 2px;
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .legend .muted {
    margin-left: auto;
  }
  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  .meter {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
  }
  .meter > div {
    height: 100%;
    background: var(--wine);
  }
  .wide {
    width: 100%;
  }
  .split {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .small-tiles {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
  }
  .upgrade .tile-body {
    align-items: center;
    text-align: center;
  }
  .big-icon {
    font-size: 2.4rem;
    line-height: 1;
  }
  input[type='number'] {
    width: 8em;
  }
  .rivals .row select {
    min-width: 0;
  }
</style>
