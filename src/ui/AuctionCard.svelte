<script lang="ts">
  import { bidderName, maxAffordableBid, SITE_LABELS } from '../engine/auction'
  import { GRAPES } from '../engine/data/grapes'
  import { formatEuro, MONTH_NAMES } from '../engine/game'
  import type { GameState, Player } from '../engine/types'

  /** Ankündigung der nächsten Versteigerung bzw. Ergebnisse der laufenden – das Bieten selbst läuft im Live-Fenster. */
  let { game, player }: { game: GameState; player: Player } = $props()

  const auction = $derived(game.auction)
  const lots = $derived(auction?.lots.filter((l) => l.regionId === player.regionId) ?? [])
</script>

{#if auction && lots.length > 0}
  <section class="card auction">
    <h2>
      🔨 Weinbergversteigerung
      {auction.phase === 'announced' ? `im ${MONTH_NAMES[auction.month - 1]}` : 'läuft'}
    </h2>
    {#if auction.phase === 'announced'}
      <p class="muted small">
        Nächsten Monat wird live geboten: Du bietest Runde für Runde gegen Nachbarn und auswärtige Investoren. Wer am
        meisten zahlt, bekommt den Zuschlag. Finanzierbar sind derzeit bis zu {formatEuro(maxAffordableBid(player))}.
      </p>
    {/if}
    {#each lots as lot (lot.id)}
      <div class="item">
        <div class="item-head">
          <strong>{lot.name}</strong>
          <span class="muted">{lot.hectares} ha · {SITE_LABELS[lot.site]}</span>
        </div>
        <div class="muted small">
          {#if lot.grape && lot.plantedYear !== null}
            {GRAPES[lot.grape].name}, {game.year - lot.plantedYear} Jahre alt – trägt sofort
          {:else}
            Brache – muss erst bepflanzt werden
          {/if}
          · Schätzwert {formatEuro(lot.estimate)} · Ausruf {formatEuro(lot.startPrice)}
        </div>
        {#if lot.status === 'sold' && lot.leader}
          <span class="chip" class:good={lot.leader === player.id}>
            Zuschlag für {formatEuro(lot.price)} an {lot.leader === player.id ? 'dich' : bidderName(game, lot.leader, true)}
          </span>
        {:else if lot.status === 'unsold'}
          <span class="chip">nicht verkauft</span>
        {:else if lot.status === 'open'}
          <span class="chip">wird gerade versteigert</span>
        {/if}
      </div>
    {/each}
  </section>
{/if}

<style>
  .auction {
    border-color: var(--wine);
  }
</style>
