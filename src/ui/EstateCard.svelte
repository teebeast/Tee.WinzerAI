<script lang="ts">
  import {
    CELLAR_MASTER_QUALITY_BONUS,
    CELLAR_MASTER_SALARY,
    LOAN_INTEREST_RATE,
    MARKETING,
    ONLINE_SHOP_COST,
    SABOTAGE,
    SABOTAGE_DETECTION,
    SABOTAGE_FINE,
    TANK_COST_PER_HL,
  } from '../engine/data/economy'
  import { formatEuro, validateAction } from '../engine/game'
  import { availableCredit, creditLimit, monthlyCosts, workersNeeded } from '../engine/market'
  import type { Action, GameState, MarketingKind, Player, SabotageKind } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const marketingKinds = Object.keys(MARKETING) as MarketingKind[]
  const TANK_STEP = 100
  const sabotageKinds = Object.keys(SABOTAGE) as SabotageKind[]
  let creditAmount = $state(10_000)
  let sabotageTarget = $state('')
  const rivals = $derived(game.players.filter((p) => p.id !== player.id && !p.bankrupt))
  const costs = $derived(monthlyCosts(player, game.month))
  const target = $derived(rivals.find((p) => p.id === sabotageTarget) ?? rivals[0])

  function button(action: Action) {
    const problem = validateAction(game, action)
    return { disabled: problem !== null, title: problem ?? '' }
  }
</script>

<section class="card">
  <h2>Betrieb</h2>

  <div class="item">
    <div class="item-head">
      <strong>Bekanntheit</strong>
      <span class="muted">{Math.round(player.reputation)} / 100</span>
    </div>
    <div class="meter"><div style:width="{player.reputation}%"></div></div>
    <div class="row">
      {#each marketingKinds as kind (kind)}
        {@const info = MARKETING[kind]}
        <button {...button({ type: 'marketing', kind })} onclick={() => run({ type: 'marketing', kind })}>
          {info.name} ({formatEuro(info.cost)})
        </button>
      {/each}
    </div>
  </div>

  <div class="item">
    <div class="item-head">
      <strong>Ausstattung</strong>
    </div>
    <div class="row">
      <button
        {...button({ type: 'expandTank', hectoliters: TANK_STEP })}
        onclick={() => run({ type: 'expandTank', hectoliters: TANK_STEP })}
      >
        +{TANK_STEP} hl Tank ({formatEuro(TANK_STEP * TANK_COST_PER_HL)})
      </button>
      {#if !player.hasOnlineShop}
        <button {...button({ type: 'buyOnlineShop' })} onclick={() => run({ type: 'buyOnlineShop' })}>
          Online-Shop ({formatEuro(ONLINE_SHOP_COST)})
        </button>
      {:else}
        <span class="muted small">✔ Online-Shop läuft</span>
      {/if}
      <button onclick={() => run({ type: 'cellarMaster', hire: !player.hasCellarMaster })}>
        {player.hasCellarMaster
          ? 'Kellermeister entlassen'
          : `Kellermeister einstellen (+${CELLAR_MASTER_QUALITY_BONUS} Güte, ${formatEuro(CELLAR_MASTER_SALARY)}/Monat)`}
      </button>
    </div>
  </div>

  <div class="item">
    <div class="item-head">
      <strong>Laufende Kosten</strong>
      <span class="muted">{formatEuro(costs.total)} diesen Monat</span>
    </div>
    <div class="muted small">
      Personal {formatEuro(costs.salaries)} ({workersNeeded(player)} Festangestellte{player.hasCellarMaster ? ' + Kellermeister' : ''})
      · Weinberge {formatEuro(costs.upkeep)}
      {#if costs.protection > 0}· Pflanzenschutz {formatEuro(costs.protection)}{/if}
      · Zinsen {formatEuro(costs.interest)}
    </div>
  </div>

  {#if rivals.length > 0 && target}
    <div class="item">
      <div class="item-head">
        <strong>Konkurrenz</strong>
        <span class="muted small">{Math.round(SABOTAGE_DETECTION * 100)} % Risiko, erwischt zu werden ({formatEuro(SABOTAGE_FINE)} Strafe)</span>
      </div>
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

  <div class="item">
    <div class="item-head">
      <strong>Kredit</strong>
      <span class="muted">{formatEuro(player.loan)} von {formatEuro(creditLimit(player))}</span>
    </div>
    <div class="muted small">
      {Math.round(LOAN_INTEREST_RATE * 100)} % Zinsen p. a. · frei: {formatEuro(availableCredit(player))}
      {#if player.monthsInsolvent > 0}
        · <span class="danger">Insolvenzwarnung!</span>
      {/if}
    </div>
    <div class="row">
      <label class="row">
        <input type="number" min="1000" step="5000" bind:value={creditAmount} aria-label="Betrag" /> €
      </label>
      <button
        {...button({ type: 'borrow', amount: creditAmount })}
        onclick={() => run({ type: 'borrow', amount: creditAmount })}
      >
        Aufnehmen
      </button>
      <button
        {...button({ type: 'repay', amount: creditAmount })}
        onclick={() => run({ type: 'repay', amount: creditAmount })}
      >
        Tilgen
      </button>
    </div>
  </div>
</section>

<style>
  .meter {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin: 4px 0 8px;
  }
  .meter > div {
    height: 100%;
    background: var(--wine);
  }
  .danger {
    color: var(--danger);
    font-weight: 600;
  }
  button.danger {
    border-color: var(--danger);
    font-weight: normal;
  }
  input[type='number'] {
    width: 8em;
  }
</style>
