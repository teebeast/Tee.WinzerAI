<script lang="ts">
  import { maxAffordableBid, parcelValue, SITE_LABELS } from '../engine/auction'
  import { GRAPES } from '../engine/data/grapes'
  import { formatEuro, validateAction } from '../engine/game'
  import type { Action, GameState, Player } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const parcels = $derived(game.auction.filter((p) => p.regionId === player.regionId))
  let amounts = $state<Record<string, number>>({})
</script>

{#if parcels.length > 0}
  <section class="card auction">
    <h2>🔨 Weinbergversteigerung</h2>
    <p class="muted small">
      Verdeckte Gebote bis Monatsende. Auswärtige Investoren bieten mit – wer zu knapp bietet, geht leer aus.
      Finanzierbar sind bis zu {formatEuro(maxAffordableBid(player))}.
    </p>
    {#each parcels as parcel (parcel.id)}
      {@const ownBid = parcel.bids[player.id]}
      {@const amount = amounts[parcel.id] ?? ownBid ?? parcel.minimumBid}
      {@const bidAction = { type: 'bid', parcelId: parcel.id, amount } as const}
      {@const problem = validateAction(game, bidAction)}
      <div class="item">
        <div class="item-head">
          <strong>{parcel.name}</strong>
          <span class="muted">{parcel.hectares} ha · {SITE_LABELS[parcel.site]}</span>
        </div>
        <div class="muted small">
          {#if parcel.grape && parcel.plantedYear !== null}
            {GRAPES[parcel.grape].name}, {game.year - parcel.plantedYear} Jahre alt – trägt sofort
          {:else}
            Brache – muss erst bepflanzt werden
          {/if}
          · Schätzwert {formatEuro(parcelValue(parcel, game.year))} · Mindestgebot {formatEuro(parcel.minimumBid)}
          {#if ownBid}· <strong>Dein Gebot: {formatEuro(ownBid)}</strong>{/if}
        </div>
        <div class="row">
          <label class="row">
            <input
              type="number"
              min={parcel.minimumBid}
              step="1000"
              aria-label="Gebot in Euro"
              bind:value={() => amount, (v) => (amounts[parcel.id] = v)}
            />
            €
          </label>
          <button disabled={problem !== null} title={problem ?? ''} onclick={() => run(bidAction)}>
            {ownBid ? 'Gebot ändern' : 'Bieten'}
          </button>
          {#if ownBid}
            <button class="ghost" onclick={() => run({ type: 'bid', parcelId: parcel.id, amount: 0 })}>Zurückziehen</button>
          {/if}
        </div>
      </div>
    {/each}
  </section>
{/if}

<style>
  .auction {
    border-color: var(--wine);
  }
  input[type='number'] {
    width: 9em;
  }
</style>
