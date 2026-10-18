<script lang="ts">
  import { gameMonth } from '../../engine/bio'
  import { BIO_LABELS } from '../../engine/data/bio'
  import { formatEuro, validateAction } from '../../engine/game'
  import {
    deadlineText,
    describeWine,
    eligibleBottles,
    MAX_ORDERS,
    monthText,
    ORDER_PENALTY_SHARE,
    orderValue,
  } from '../../engine/orders'
  import type { Action, CustomerOrder, GameState, Player } from '../../engine/types'
  import ExportCard from '../ExportCard.svelte'

  /** Kundenaufträge: Anfragen annehmen oder ablehnen, angenommene Aufträge rechtzeitig liefern */
  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const now = $derived(gameMonth(game))
  const monthsLeft = (order: CustomerOrder) => order.deadline - now

  function button(action: Action) {
    const problem = validateAction(game, action)
    return { disabled: problem !== null, title: problem ?? '' }
  }
</script>

{#snippet terms(order: CustomerOrder)}
  {@const available = eligibleBottles(player, order)}
  <div class="item-head">
    <strong><span aria-hidden="true">{order.icon}</span> {order.customer}</strong>
    <span class="chip">+{order.points} Punkte</span>
  </div>
  <p class="wine">
    <strong>{order.bottles.toLocaleString('de-DE')} Flaschen</strong> {describeWine(order)}
    {#if order.bioLabel}
      · mit Bio-Siegel ({BIO_LABELS[order.bioLabel].icon} {BIO_LABELS[order.bioLabel].name} oder höher)
    {/if}
  </p>
  <div class="chips">
    <span class="chip">{formatEuro(order.pricePerBottle)}/Fl. · zusammen {formatEuro(orderValue(order))}</span>
    <span class="chip">Lieferung bis {deadlineText(order)}</span>
  </div>
  <div class="stock">
    <span class="meter" aria-hidden="true">
      <span class:full={available >= order.bottles} style:width="{Math.min(100, (available / order.bottles) * 100)}%"></span>
    </span>
    <span class="small">Passend im Lager: {available.toLocaleString('de-DE')} / {order.bottles.toLocaleString('de-DE')} Fl.</span>
  </div>
{/snippet}

<div class="page">
  <div class="page-head card">
    <div>
      <h1>📦 Aufträge</h1>
      <span class="muted small">
        Kunden bestellen größere Mengen eines bestimmten Weins bis zu einem Termin – besser bezahlt als im Hofladen, dazu
        Siegpunkte. Wer den Termin verpasst, zahlt {Math.round(ORDER_PENALTY_SHARE * 100)} % des Auftragswerts Vertragsstrafe.
      </span>
    </div>
    <span class="chip">{player.orders.length} / {MAX_ORDERS} Aufträge angenommen</span>
  </div>

  <ExportCard {player} {run} />

  <h2 class="section">Angenommene Aufträge</h2>
  {#if player.orders.length === 0}
    <p class="muted">Keine laufenden Aufträge.</p>
  {:else}
    <div class="tiles">
      {#each player.orders as order (order.id)}
        {@const action = { type: 'deliverOrder', orderId: order.id } as const}
        <article class="card order" class:urgent={monthsLeft(order) <= 1}>
          {@render terms(order)}
          <p class="small" class:warning={monthsLeft(order) <= 1}>
            {monthsLeft(order) === 0 ? 'Letzter Monat zum Liefern!' : `Noch ${monthsLeft(order) + 1} Monate Zeit.`}
          </p>
          <button class="primary" {...button(action)} onclick={() => run(action)}>Jetzt liefern</button>
        </article>
      {/each}
    </div>
  {/if}

  <h2 class="section">Anfragen</h2>
  {#if player.orderOffers.length === 0}
    <p class="muted">
      {game.year < 2 ? 'Ab dem zweiten Jahr fragen Kunden nach deinen Weinen.' : 'Gerade liegen keine Anfragen vor – neue kommen regelmäßig.'}
    </p>
  {:else}
    <div class="tiles">
      {#each player.orderOffers as order (order.id)}
        {@const accept = { type: 'acceptOrder', orderId: order.id } as const}
        <article class="card order">
          {@render terms(order)}
          <p class="muted small">Die Anfrage gilt bis Ende {monthText(order.offerExpires)}.</p>
          <div class="row">
            <button {...button(accept)} onclick={() => run(accept)}>Annehmen</button>
            <button class="ghost" onclick={() => run({ type: 'declineOrder', orderId: order.id })}>Ablehnen</button>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .order {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .order.urgent {
    border-color: var(--danger);
  }
  .order p {
    margin: 0;
  }
  .wine {
    line-height: 1.4;
  }
  .stock {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .meter {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: var(--border);
    overflow: hidden;
  }
  .meter > span {
    display: block;
    height: 100%;
    background: var(--wine);
  }
  .meter > span.full {
    background: var(--good);
  }
  .warning {
    color: var(--danger);
    font-weight: 600;
  }
  .order button {
    align-self: flex-start;
  }
</style>
