<script lang="ts">
  import { BIO_LABELS, BIO_ORDER, gameMonth, monthsUntilEligible, nextBioLabel } from '../engine/bio'
  import { BIO_CONVERSION_MONTHS } from '../engine/data/economy'
  import { formatEuro, validateAction } from '../engine/game'
  import type { Action, BioLabel, GameState, Player } from '../engine/types'

  /** Stufenleiter der Bio-Zertifizierung: Umstellung → Grünblatt → Terravita → Lunaris */
  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const isBio = $derived(player.protection === 'bio' && player.bioSince !== null)
  const convertedMonths = $derived(isBio ? Math.min(BIO_CONVERSION_MONTHS, gameMonth(game) - player.bioSince!) : 0)
  const reached = $derived(player.bioLabel ? BIO_ORDER.indexOf(player.bioLabel) : -1)
  const next = $derived(nextBioLabel(player))
  const wait = $derived(monthsUntilEligible(game, player))
  const applyAction = { type: 'applyBioLabel' } as const
  const problem = $derived(validateAction(game, applyAction))

  function stepState(label: BioLabel): 'done' | 'next' | 'locked' {
    const index = BIO_ORDER.indexOf(label)
    if (index <= reached) return 'done'
    return label === next && isBio ? 'next' : 'locked'
  }

  const percent = (value: number) => `+${Math.round(value * 100)} %`
</script>

<section class="card bio">
  <h2>🌿 Bio-Zertifizierung</h2>
  <p class="muted small">
    Jedes Siegel muss beantragt werden. Wer vom Bio-Pflanzenschutz abweicht oder beim Panschen erwischt wird, verliert alle
    Siegel und die Umstellungszeit.
  </p>

  <ol class="ladder">
    <li class:done={convertedMonths >= BIO_CONVERSION_MONTHS} class:active={isBio && convertedMonths < BIO_CONVERSION_MONTHS}>
      <span class="step-icon" aria-hidden="true">🌱</span>
      <span class="step-text">
        <strong>Umstellung</strong>
        <span class="muted small">{BIO_CONVERSION_MONTHS} Monate nach Bio-Vorgaben – noch ohne Siegel</span>
        {#if isBio}
          <span class="progress" aria-label="{convertedMonths} von {BIO_CONVERSION_MONTHS} Monaten">
            <span style:width="{(convertedMonths / BIO_CONVERSION_MONTHS) * 100}%"></span>
          </span>
          <span class="small">{convertedMonths} / {BIO_CONVERSION_MONTHS} Monate</span>
        {/if}
      </span>
    </li>
    {#each BIO_ORDER as label (label)}
      {@const info = BIO_LABELS[label]}
      {@const state = stepState(label)}
      <li class:done={state === 'done'} class:active={state === 'next'} class:locked={state === 'locked'}>
        <span class="step-icon" aria-hidden="true">{info.icon}</span>
        <span class="step-text">
          <strong>{info.name}</strong>{#if label === player.bioLabel}<span class="chip good">✔ dein Siegel</span>{/if}
          <span class="muted small">{info.text}</span>
          <span class="chips">
            <span class="chip good">Preise {percent(info.priceBonus)}</span>
            {#if info.demandBonus}<span class="chip good">Nachfrage {percent(info.demandBonus)}</span>{/if}
            {#if info.quality}<span class="chip good">+{info.quality} Güte</span>{/if}
            {#if info.yieldFactor < 1}<span class="chip bad">Ertrag −{Math.round((1 - info.yieldFactor) * 100)} %</span>{/if}
            {#if info.protectionCostFactor > 1}
              <span class="chip bad">Pflanzenschutz +{Math.round((info.protectionCostFactor - 1) * 100)} %</span>
            {/if}
            <span class="chip">Antrag {formatEuro(info.fee)} · {formatEuro(info.annualFee)}/Jahr</span>
          </span>
          {#if state === 'next'}
            {#if wait === 0}
              <button class="primary" disabled={problem !== null} title={problem ?? ''} onclick={() => run(applyAction)}>
                {info.name}-Siegel beantragen ({formatEuro(info.fee)})
              </button>
            {:else}
              <span class="small">Beantragbar in {wait} Monat{wait === 1 ? '' : 'en'}.</span>
            {/if}
          {/if}
        </span>
      </li>
    {/each}
  </ol>
</section>

<style>
  .ladder {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ladder li {
    display: flex;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-left: 4px solid var(--border);
    border-radius: 8px;
  }
  .ladder li.done {
    border-left-color: var(--good);
    background: color-mix(in srgb, var(--good) 8%, transparent);
  }
  .ladder li.active {
    border-left-color: var(--wine);
    border-color: var(--wine);
  }
  .ladder li.locked {
    opacity: 0.6;
  }
  .step-icon {
    font-size: 1.5rem;
    width: 1.6em;
    text-align: center;
  }
  .step-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }
  .step-text strong {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }
  .step-text button {
    align-self: flex-start;
  }
  .progress {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: var(--border);
    overflow: hidden;
  }
  .progress > span {
    display: block;
    height: 100%;
    background: var(--good);
  }
</style>
