<script lang="ts">
  import { EXPORT_COMPLETION_POINTS, EXPORT_PENALTY_PER_BOTTLE } from '../engine/data/economy'
  import { qualityInfo } from '../engine/data/quality'
  import { exportEligible } from '../engine/exports'
  import { formatEuro } from '../engine/game'
  import type { Action, ExportOffer, Player } from '../engine/types'

  let { player, run }: { player: Player; run: (a: Action) => void } = $props()

  const stock = (offer: ExportOffer) => exportEligible(player, offer).reduce((sum, l) => sum + l.bottles, 0)
</script>

{#snippet terms(offer: ExportOffer)}
  <div class="muted small">
    {offer.bottlesPerMonth.toLocaleString('de-DE')} Flaschen pro Monat zu {formatEuro(offer.pricePerBottle)} ·
    mindestens {qualityInfo(offer.minLevel).name}, Güte ab {offer.minQuality} ·
    passender Vorrat: {stock(offer).toLocaleString('de-DE')} Fl.
  </div>
{/snippet}

{#if player.exportOffer || player.exportContract}
  <section class="card export" id="export-card">
    <h2>🌍 Export</h2>
    {#if player.exportOffer}
      {@const offer = player.exportOffer}
      <div class="item">
        <div class="item-head">
          <strong>Anfrage aus {offer.country}</strong>
          <span class="muted">{offer.months} Monate</span>
        </div>
        {@render terms(offer)}
        <p class="muted small">
          Geliefert wird automatisch am Monatsende. Fehlende Flaschen kosten {formatEuro(EXPORT_PENALTY_PER_BOTTLE)} Strafe
          je Flasche; wer ein Jahr lang vollständig liefert, bekommt +{EXPORT_COMPLETION_POINTS} Punkte. Die Anfrage gilt
          nur diesen Monat.
        </p>
        <div class="row">
          <button onclick={() => run({ type: 'answerExport', accept: true })}>Annehmen</button>
          <button class="ghost" onclick={() => run({ type: 'answerExport', accept: false })}>Ablehnen</button>
        </div>
      </div>
    {/if}
    {#if player.exportContract}
      {@const contract = player.exportContract}
      <div class="item">
        <div class="item-head">
          <strong>Vertrag mit {contract.country}</strong>
          <span class="muted">noch {contract.monthsLeft} Monat{contract.monthsLeft === 1 ? '' : 'e'}</span>
        </div>
        {@render terms(contract)}
        {#if contract.missedMonths > 0}
          <p class="warning small">{contract.missedMonths} Monat(e) mit Fehlmengen – der Punktebonus ist verloren.</p>
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .export {
    border-color: var(--wine);
  }
  .warning {
    color: var(--danger);
  }
</style>
