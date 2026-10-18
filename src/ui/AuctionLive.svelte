<script lang="ts">
  import { bidderName, maxAffordableBid, nextMinimum, SITE_LABELS } from '../engine/auction'
  import { GRAPES } from '../engine/data/grapes'
  import { REGIONS } from '../engine/data/regions'
  import { formatEuro, validateAction } from '../engine/game'
  import { availableCredit } from '../engine/market'
  import type { Action, AuctionLot, GameState } from '../engine/types'

  /** Live-Versteigerung: Ein Mensch ist am Zug und bietet oder steigt aus. */
  let { game, lot, run }: { game: GameState; lot: AuctionLot; run: (a: Action) => void } = $props()

  const bidder = $derived(game.players.find((p) => p.id === lot.awaiting)!)
  const hotSeat = $derived(game.players.filter((p) => p.ai === null).length > 1)
  const regionLots = $derived(game.auction!.lots.filter((l) => l.regionId === lot.regionId))
  const position = $derived(regionLots.indexOf(lot) + 1)
  const lastClosed = $derived(
    regionLots
      .slice(0, position - 1)
      .filter((l) => l.status === 'sold' || l.status === 'unsold')
      .at(-1),
  )
  const minimum = $derived(nextMinimum(lot))
  const affordable = $derived(maxAffordableBid(bidder))
  const credit = $derived(availableCredit(bidder))
  const ticker = $derived(
    lot.bids
      .map((b, i) => ({ ...b, i }))
      .reverse()
      .slice(0, 8),
  )

  // Eigener Betrag fürs Sprunggebot – gilt nur, solange sich das Höchstgebot nicht ändert
  let custom = $state<{ key: string; amount: number } | null>(null)
  const key = $derived(`${lot.id}:${lot.bids.length}`)
  const amount = $derived(custom?.key === key ? custom.amount : minimum)

  function bid(value: number) {
    run({ type: 'auctionBid', lotId: lot.id, amount: value })
  }
  const problem = (value: number) => validateAction(game, { type: 'auctionBid', lotId: lot.id, amount: value })
  const jumps = $derived([minimum, minimum + 2 * lot.increment, minimum + 5 * lot.increment])
</script>

<div class="backdrop">
  <div class="card live" role="dialog" aria-modal="true" aria-label="Live-Versteigerung">
    <header class="head">
      <span class="gavel" aria-hidden="true">🔨</span>
      <div>
        <h2>Live-Versteigerung · {REGIONS[lot.regionId].name}</h2>
        <span class="muted small">Los {position} von {regionLots.length}</span>
      </div>
    </header>

    <div class="finance" aria-label="Deine Finanzen">
      <span><span class="muted small">Konto</span><strong class:negative={bidder.money < 0}>{formatEuro(bidder.money)}</strong></span>
      <span><span class="muted small">Freier Kreditrahmen</span><strong>{formatEuro(credit)}</strong></span>
      <span><span class="muted small">Finanzierbar bis</span><strong>{formatEuro(affordable)}</strong></span>
    </div>

    <!-- Die Zeile bleibt immer stehen, damit das Fenster nicht springt -->
    <p class="result small" class:won={lastClosed?.leader === bidder.id}>
      {#if lastClosed?.status === 'sold' && lastClosed.leader}
        Zuschlag {lastClosed.name}: {formatEuro(lastClosed.price)} an
        {lastClosed.leader === bidder.id ? 'dich' : bidderName(game, lastClosed.leader, true)}
      {:else if lastClosed}
        {lastClosed.name}: kein Gebot, bleibt unverkauft
      {:else}
        <span class="muted">Erstes Los – noch kein Zuschlag in dieser Versteigerung</span>
      {/if}
    </p>

    <section class="lot">
      <h3>{lot.name}</h3>
      <p class="muted small">
        {lot.hectares} ha · {SITE_LABELS[lot.site]} ·
        {#if lot.grape && lot.plantedYear !== null}
          {GRAPES[lot.grape].name}, {game.year - lot.plantedYear} Jahre alt – trägt sofort
        {:else}
          Brache – muss erst bepflanzt werden
        {/if}
      </p>
      <div class="chips">
        <span class="chip">Schätzwert {formatEuro(lot.estimate)}</span>
        <span class="chip">Ausruf {formatEuro(lot.startPrice)}</span>
        <span class="chip">Schritt {formatEuro(lot.increment)}</span>
      </div>
    </section>

    <div class="price" aria-live="polite">
      {#if lot.leader}
        <span class="muted small">Höchstgebot</span>
        <strong>{formatEuro(lot.price)}</strong>
        <span class="leader">{bidderName(game, lot.leader)}</span>
      {:else}
        <span class="muted small">Noch kein Gebot</span>
        <strong>{formatEuro(lot.startPrice)}</strong>
        <span class="leader muted">Ausrufpreis</span>
      {/if}
    </div>

    <!-- Feste Höhe: Neue Gebote schieben die alten nach unten, das Fenster wächst nicht -->
    <ol class="ticker" aria-label="Gebotsverlauf">
      {#each ticker as entry (entry.i)}
        <li class:mine={entry.bidder === bidder.id}>
          <span>{entry.bidder === bidder.id ? 'Du' : bidderName(game, entry.bidder)}</span>
          <strong>{formatEuro(entry.amount)}</strong>
        </li>
      {:else}
        <li class="empty muted">Noch keine Gebote – eröffne mit dem Ausrufpreis oder steig aus.</li>
      {/each}
    </ol>

    <section class="controls">
      {#if hotSeat}<p class="turn"><strong>{bidder.name}</strong> ist am Zug.</p>{/if}
      <div class="quick">
        {#each jumps as value, i (i)}
          <button class:primary={i === 0} disabled={problem(value) !== null} title={problem(value) ?? ''} onclick={() => bid(value)}>
            {i === 0 ? 'Bieten' : `+${i === 1 ? 2 : 5} Schritte`}: {formatEuro(value)}
          </button>
        {/each}
      </div>
      <div class="row">
        <label class="row small">
          Eigenes Gebot
          <input
            type="number"
            min={minimum}
            step={lot.increment}
            aria-label="Eigenes Gebot in Euro"
            bind:value={() => amount, (v) => (custom = { key, amount: Number(v) })}
          />
          €
        </label>
        <button disabled={problem(amount) !== null} title={problem(amount) ?? ''} onclick={() => bid(amount)}>Bieten</button>
        <button class="ghost" onclick={() => run({ type: 'auctionPass', lotId: lot.id })}>Aussteigen</button>
      </div>
      <p class="muted small">Ein Fehlbetrag wird beim Zuschlag automatisch über den Kredit gedeckt.</p>
    </section>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    /* Das Fenster hat eine feste Höhe – es kann daher mittig stehen, ohne dass die Knöpfe springen */
    place-items: center;
    padding: 16px;
    background: rgb(20 10 14 / 0.7);
    backdrop-filter: blur(2px);
    overflow-y: auto;
  }
  .live {
    width: min(560px, 100%);
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    border-color: var(--wine);
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.3);
  }
  .head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .head h2 {
    margin: 0;
  }
  .gavel {
    font-size: 2rem;
    animation: knock 1.6s ease-in-out infinite;
    transform-origin: 70% 70%;
  }
  @keyframes knock {
    0%, 80%, 100% { transform: rotate(0); }
    88% { transform: rotate(-25deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    .gavel { animation: none; }
    .ticker li { animation: none; }
  }
  .finance {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    font-variant-numeric: tabular-nums;
  }
  .finance > span {
    display: flex;
    flex-direction: column;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .negative {
    color: var(--danger);
  }
  .result {
    min-height: 2.4em;
    margin: 0;
    padding: 6px 10px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--muted) 12%, transparent);
  }
  .result.won {
    background: color-mix(in srgb, #3f8f3a 18%, transparent);
  }
  .lot h3 {
    margin: 0;
    font-size: 1.2rem;
  }
  .lot p {
    margin: 2px 0 6px;
  }
  .price {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--wine) 10%, transparent);
  }
  .price strong {
    font-size: 2rem;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .leader {
    font-weight: 600;
  }
  .ticker {
    list-style: none;
    margin: 0;
    padding: 0;
    /* feste Höhe für sechs Zeilen */
    height: 10.5em;
    overflow-y: auto;
    font-size: 0.9rem;
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .ticker li.empty {
    justify-content: center;
    border-bottom: none;
    padding-top: 2em;
    animation: none;
  }
  .ticker li {
    display: flex;
    justify-content: space-between;
    padding: 3px 6px;
    border-bottom: 1px solid var(--border);
    font-variant-numeric: tabular-nums;
    animation: flash 0.9s ease-out;
  }
  .ticker li.mine {
    color: var(--wine);
  }
  @keyframes flash {
    from { background: color-mix(in srgb, var(--sun) 45%, transparent); }
    to { background: transparent; }
  }
  .controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .controls p {
    margin: 0;
  }
  .quick {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 6px;
  }
  input[type='number'] {
    width: 9em;
  }
</style>
