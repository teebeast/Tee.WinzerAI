<script lang="ts">
  import { SEKT_COST_PER_BOTTLE } from '../engine/cellar'
  import { barriqueBonus } from '../engine/cellar'
  import { ADULTERATION, BARRIQUE_MONTHS, BOTTLE_COST, SEKT_MONTHS } from '../engine/data/economy'
  import { formatEuro, usedTankHl, validateAction, wineLabel } from '../engine/game'
  import { bulkPricePerHl, hlToBottles } from '../engine/market'
  import { usedBarriqueHl } from '../engine/rules'
  import type { Action, AdulterationMethod, GameState, Player } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const methods = Object.keys(ADULTERATION) as AdulterationMethod[]
  let amounts = $state<Record<string, number>>({})
  let methodChoice = $state<Record<string, AdulterationMethod>>({})

  function button(action: Action) {
    const problem = validateAction(game, action)
    return { disabled: problem !== null, title: problem ?? '' }
  }
</script>

<section class="card">
  <h2>
    Keller
    <span class="muted small">
      (Tank {usedTankHl(player)} / {player.tankCapacityHl} hl{player.barriqueCapacityHl > 0
        ? ` · Barrique ${usedBarriqueHl(player)} / ${player.barriqueCapacityHl} hl`
        : ''})
    </span>
  </h2>
  {#if game.bulkCrisisMonths > 0}
    <p class="warning small">Krise der Großkellereien: Fasswein bringt noch {game.bulkCrisisMonths} Monate nur den halben Preis.</p>
  {/if}
  {#if player.cellar.length === 0}
    <p class="muted">Kein Wein im Tank. Gelesen wird ab August.</p>
  {/if}
  {#each player.cellar as batch (batch.id)}
    {@const amount = Math.max(1, Math.min(amounts[batch.id] ?? batch.hectoliters, batch.hectoliters))}
    {@const bottleAction = { type: 'bottle', batchId: batch.id, hectoliters: amount } as const}
    {@const sektAction = { type: 'makeSekt', batchId: batch.id, hectoliters: amount } as const}
    {@const method = methodChoice[batch.id] ?? 'zucker'}
    {@const fakeAction = { type: 'adulterate', batchId: batch.id, method } as const}
    {@const barriqueAction = { type: 'toBarrique', batchId: batch.id } as const}
    <div class="item">
      <div class="item-head">
        <strong>{wineLabel(batch)}{batch.barrique ? ' 🛢️' : ''}{batch.adulterated ? ' 🧪' : ''}</strong>
        <span class="muted">{batch.hectoliters} hl · Güte {batch.quality}</span>
      </div>
      <div class="muted small">
        {batch.monthsUntilReady > 0
          ? `reift noch ${batch.monthsUntilReady} Monat${batch.monthsUntilReady === 1 ? '' : 'e'}`
          : 'ausgebaut – bereit zum Abfüllen'}
        {#if batch.barrique}· im Barrique{/if}
        {#if batch.adulterated}· gepanscht ({ADULTERATION[batch.adulterated].name}){/if}
      </div>
      <div class="row">
        <label class="row">
          <input
            type="number"
            min="1"
            max={batch.hectoliters}
            bind:value={() => amount, (v) => (amounts[batch.id] = v)}
          />
          hl
        </label>
        <button {...button(bottleAction)} onclick={() => run(bottleAction)}>
          Abfüllen ({hlToBottles(amount)} Fl., {formatEuro(hlToBottles(amount) * BOTTLE_COST)})
        </button>
        <button
          {...button(sektAction)}
          onclick={() => run(sektAction)}
          title={validateAction(game, sektAction) ?? `Flaschengärung, ${SEKT_MONTHS} Monate Reife`}
        >
          Sekt ({formatEuro(hlToBottles(amount) * SEKT_COST_PER_BOTTLE)})
        </button>
        {#if player.barriqueCapacityHl > 0 && !batch.barrique}
          <button
            {...button(barriqueAction)}
            onclick={() => run(barriqueAction)}
            title={validateAction(game, barriqueAction) ?? `${BARRIQUE_MONTHS} Monate im Eichenfass, +${barriqueBonus(batch)} Güte`}
          >
            🛢️ Ins Barrique (+{barriqueBonus(batch)} Güte)
          </button>
        {/if}
        <button onclick={() => run({ type: 'sellBulk', batchId: batch.id, hectoliters: amount })}>
          Fasswein (+{formatEuro(bulkPricePerHl(batch, game) * amount)})
        </button>
      </div>
      {#if !batch.adulterated}
        <details class="tricks">
          <summary class="muted small">Kellertricks …</summary>
          <div class="row">
            <select bind:value={() => method, (v) => (methodChoice[batch.id] = v)} aria-label="Methode">
              {#each methods as id (id)}
                <option value={id}>{ADULTERATION[id].name} ({Math.round(ADULTERATION[id].detection * 100)} % Risiko bei der Prüfung)</option>
              {/each}
            </select>
            <button class="danger" {...button(fakeAction)} onclick={() => run(fakeAction)}>Panschen</button>
          </div>
          <p class="muted small">
            Fliegt es auf, wird aller gepanschte Wein beschlagnahmt – dazu Strafe, Punktabzug und ein Skandal.
          </p>
        </details>
      {/if}
    </div>
  {/each}
</section>

<style>
  .warning {
    color: var(--danger);
  }
  .tricks {
    margin-top: 6px;
  }
  button.danger {
    border-color: var(--danger);
    color: var(--danger);
  }
  select {
    max-width: 100%;
  }
</style>
