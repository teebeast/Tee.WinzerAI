<script lang="ts">
  import {
    CELLAR_MASTER_QUALITY_BONUS,
    CELLAR_MASTER_SALARY,
    LOAN_INTEREST_RATE,
    MARKETING,
    ONLINE_SHOP_COST,
    TANK_COST_PER_HL,
  } from '../engine/data/economy'
  import { formatEuro, validateAction } from '../engine/game'
  import { availableCredit, creditLimit } from '../engine/market'
  import type { Action, GameState, MarketingKind, Player } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const marketingKinds = Object.keys(MARKETING) as MarketingKind[]
  const TANK_STEP = 100
  let creditAmount = $state(10_000)

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
  input[type='number'] {
    width: 8em;
  }
</style>
