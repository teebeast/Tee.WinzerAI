<script lang="ts">
  import { barriqueBonus, SEKT_COST_PER_BOTTLE } from '../../engine/cellar'
  import {
    ADULTERATION,
    BARRIQUE_MONTHS,
    BOTTLE_COST,
    COMPETITIONS,
    MEDAL_NAMES,
    REGISTER_FEE,
    REGISTER_MIN_BOTTLES,
    SEKT_MONTHS,
  } from '../../engine/data/economy'
  import { GRAPES } from '../../engine/data/grapes'
  import { qualityInfo } from '../../engine/data/quality'
  import { formatEuro, MONTH_NAMES, usedTankHl, validateAction, wineLabel } from '../../engine/game'
  import {
    bottlePrice,
    bulkPricePerHl,
    hlToBottles,
    monthlyDemand,
    registrationPoints,
    upcomingCompetition,
    wholesalePrice,
    wholesaleSaturation,
  } from '../../engine/market'
  import { usedBarriqueHl } from '../../engine/rules'
  import type { Action, AdulterationMethod, BottleLot, GameState, Player, WineBatch } from '../../engine/types'
  import Bottle from '../gfx/Bottle.svelte'
  import Vessel from '../gfx/Vessel.svelte'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  const methods = Object.keys(ADULTERATION) as AdulterationMethod[]
  let batchAmounts = $state<Record<string, number>>({})
  let lotAmounts = $state<Record<string, number>>({})
  let methodChoice = $state<Record<string, AdulterationMethod>>({})

  const competition = $derived(upcomingCompetition(game.month))
  const totalBottles = $derived(player.bottles.reduce((sum, l) => sum + l.bottles, 0))
  const MEDAL_ICONS = { gold: '🥇', silber: '🥈', bronze: '🥉' } as const
  const SHORT_LEVEL: Record<string, string> = {
    'deutscher-wein': 'DW',
    qualitaetswein: 'QbA',
    kabinett: 'KAB',
    spaetlese: 'SPL',
    auslese: 'ASL',
    beerenauslese: 'BA',
    trockenbeerenauslese: 'TBA',
    eiswein: 'EIS',
  }

  function button(action: Action) {
    const problem = validateAction(game, action)
    return { disabled: problem !== null, title: problem ?? '' }
  }

  /** Ausbaufortschritt 0–1 für die Füllstandsanzeige */
  function progress(batch: WineBatch) {
    const total = batch.barrique ? BARRIQUE_MONTHS : Math.max(qualityInfo(batch.level).maturingMonths, 1)
    return 1 - batch.monthsUntilReady / Math.max(total, batch.monthsUntilReady)
  }

  function lotStatus(lot: BottleLot): { text: string; tone: 'good' | 'bad' | '' } {
    if (lot.monthsUntilReady > 0) {
      return { text: `reift noch ${lot.monthsUntilReady} Monat${lot.monthsUntilReady === 1 ? '' : 'e'} auf der Hefe`, tone: '' }
    }
    if (lot.registered) return { text: '✔ amtlich geprüft', tone: 'good' }
    if (!lot.sparkling && lot.level === 'deutscher-wein') return { text: 'Deutscher Wein – ohne Prüfung', tone: '' }
    if (lot.bottles >= REGISTER_MIN_BOTTLES) return { text: '⏳ wartet auf die Prüfung', tone: 'bad' }
    return { text: 'Restposten – ohne Prüfung', tone: '' }
  }
</script>

<div class="page">
  <div class="page-head card">
    <div>
      <h1>🍷 Keller</h1>
      <span class="muted small">
        Ab Hof{player.hasOnlineShop ? ' & online' : ''}{player.hasVinothek ? ' & Vinothek' : ''} gehen etwa
        {monthlyDemand(player).toLocaleString('de-DE')} Flaschen im Monat weg.
      </span>
    </div>
    <div class="gauges">
      <div class="gauge">
        <span class="small">Tank <strong>{usedTankHl(player)} / {player.tankCapacityHl} hl</strong></span>
        <div class="meter"><div style:width="{(usedTankHl(player) / player.tankCapacityHl) * 100}%"></div></div>
      </div>
      {#if player.barriqueCapacityHl > 0}
        <div class="gauge">
          <span class="small">Barrique <strong>{usedBarriqueHl(player)} / {player.barriqueCapacityHl} hl</strong></span>
          <div class="meter oak">
            <div style:width="{(usedBarriqueHl(player) / player.barriqueCapacityHl) * 100}%"></div>
          </div>
        </div>
      {/if}
      <div class="gauge">
        <span class="small">Flaschenlager <strong>{totalBottles.toLocaleString('de-DE')} Fl.</strong></span>
        <span class="muted small">
          {competition.name}: {MONTH_NAMES[competition.month - 1]} ({player.competitionEntries.length}/{competition.maxEntries} angemeldet)
        </span>
      </div>
    </div>
  </div>

  {#if game.bulkCrisisMonths > 0}
    <p class="card warning small">
      Krise der Großkellereien: Fasswein bringt noch {game.bulkCrisisMonths} Monate nur den halben Preis.
    </p>
  {/if}

  <h2 class="section">Im Tank und im Fass</h2>
  <div class="tiles">
    {#each player.cellar as batch (batch.id)}
      {@const amount = Math.max(1, Math.min(batchAmounts[batch.id] ?? batch.hectoliters, batch.hectoliters))}
      {@const bottleAction = { type: 'bottle', batchId: batch.id, hectoliters: amount } as const}
      {@const sektAction = { type: 'makeSekt', batchId: batch.id, hectoliters: amount } as const}
      {@const method = methodChoice[batch.id] ?? 'zucker'}
      {@const fakeAction = { type: 'adulterate', batchId: batch.id, method } as const}
      {@const barriqueAction = { type: 'toBarrique', batchId: batch.id } as const}
      <article class="tile">
        <div class="tile-body">
          <div class="visual">
            <Vessel color={GRAPES[batch.grape].color} progress={progress(batch)} barrique={batch.barrique} />
            <div class="visual-text">
              <strong>{wineLabel(batch)}{batch.adulterated ? ' 🧪' : ''}</strong>
              <span class="muted small">{batch.hectoliters} hl · Güte {batch.quality}</span>
              <span class="chips">
                {#if batch.monthsUntilReady > 0}
                  <span class="chip">⏳ noch {batch.monthsUntilReady} Monat{batch.monthsUntilReady === 1 ? '' : 'e'}</span>
                {:else}
                  <span class="chip good">✔ bereit zum Abfüllen</span>
                {/if}
                {#if batch.barrique}<span class="chip">🛢️ Barrique</span>{/if}
                {#if batch.adulterated}<span class="chip bad">gepanscht ({ADULTERATION[batch.adulterated].name})</span>{/if}
              </span>
            </div>
          </div>

          <div class="tile-actions">
            <label class="row small">
              <input
                type="number"
                min="1"
                max={batch.hectoliters}
                bind:value={() => amount, (v) => (batchAmounts[batch.id] = v)}
              />
              hl = {hlToBottles(amount).toLocaleString('de-DE')} Fl.
            </label>
            <div class="action-grid">
              <button {...button(bottleAction)} onclick={() => run(bottleAction)}>
                🍾 Abfüllen <span class="muted small">{formatEuro(hlToBottles(amount) * BOTTLE_COST)}</span>
              </button>
              <button
                {...button(sektAction)}
                onclick={() => run(sektAction)}
                title={validateAction(game, sektAction) ?? `Flaschengärung, ${SEKT_MONTHS} Monate Reife`}
              >
                🥂 Sekt <span class="muted small">{formatEuro(hlToBottles(amount) * SEKT_COST_PER_BOTTLE)}</span>
              </button>
              <button onclick={() => run({ type: 'sellBulk', batchId: batch.id, hectoliters: amount })}>
                🚚 Fasswein <span class="muted small">+{formatEuro(bulkPricePerHl(batch, game, player) * amount)}</span>
              </button>
              {#if player.barriqueCapacityHl > 0 && !batch.barrique}
                <button
                  {...button(barriqueAction)}
                  onclick={() => run(barriqueAction)}
                  title={validateAction(game, barriqueAction) ??
                    `${BARRIQUE_MONTHS} Monate im Eichenfass, +${barriqueBonus(batch)} Güte`}
                >
                  🛢️ Barrique <span class="muted small">+{barriqueBonus(batch)} Güte</span>
                </button>
              {/if}
            </div>
            {#if !batch.adulterated}
              <details class="tricks">
                <summary class="muted small">Kellertricks …</summary>
                <div class="row">
                  <select bind:value={() => method, (v) => (methodChoice[batch.id] = v)} aria-label="Methode">
                    {#each methods as id (id)}
                      <option value={id}>
                        {ADULTERATION[id].name} ({Math.round(ADULTERATION[id].detection * 100)} % Risiko bei der Prüfung)
                      </option>
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
        </div>
      </article>
    {:else}
      <p class="tile empty muted">Kein Wein im Tank. Gelesen wird ab August im Weinberg.</p>
    {/each}
  </div>

  <h2 class="section">Flaschenlager</h2>
  {#if wholesaleSaturation(player) < 1}
    <p class="muted small">
      Großhandel gesättigt: In diesem Jahr gibt es nur noch {Math.round(wholesaleSaturation(player) * 100)} % des üblichen Preises.
    </p>
  {/if}
  <div class="tiles">
    {#each player.bottles as lot (lot.id)}
      {@const amount = Math.max(1, Math.min(lotAmounts[lot.id] ?? lot.bottles, lot.bottles))}
      {@const registerAction = { type: 'register', lotId: lot.id } as const}
      {@const wholesaleAction = { type: 'sellWholesale', lotId: lot.id, bottles: amount } as const}
      {@const enterAction = { type: 'enterCompetition', lotId: lot.id } as const}
      {@const entered = player.competitionEntries.includes(lot.id)}
      {@const status = lotStatus(lot)}
      <article class="tile">
        <div class="tile-body">
          <div class="visual">
            <Bottle color={GRAPES[lot.grape].color} sparkling={lot.sparkling} label={lot.sparkling ? 'SEKT' : SHORT_LEVEL[lot.level]} />
            <div class="visual-text">
              <strong>{wineLabel(lot)}{lot.adulterated ? ' 🧪' : ''}</strong>
              <span class="muted small">
                {lot.bottles.toLocaleString('de-DE')} Fl. · Güte {lot.quality} · {formatEuro(bottlePrice(lot, player, game.year))}/Fl.
              </span>
              <span class="chips">
                <span class="chip {status.tone}">{status.text}</span>
                {#each lot.awards as award, i (i)}
                  <span class="chip medal" title="{MEDAL_NAMES[award.medal]} – {COMPETITIONS[award.competition].name} {award.year}">
                    {MEDAL_ICONS[award.medal]} {award.year}
                  </span>
                {/each}
                {#if entered}<span class="chip">📝 angemeldet</span>{/if}
              </span>
            </div>
          </div>

          <div class="tile-actions">
            {#if !lot.registered && lot.monthsUntilReady === 0 && (lot.sparkling || lot.level !== 'deutscher-wein')}
              <button class="wide" {...button(registerAction)} onclick={() => run(registerAction)}>
                🏛️ Prüfen lassen ({formatEuro(REGISTER_FEE)}, +{registrationPoints(lot)} P.)
              </button>
            {/if}
            {#if lot.registered && !entered}
              <button class="wide" {...button(enterAction)} onclick={() => run(enterAction)}>
                🏅 Anmelden: {competition.name} ({formatEuro(competition.fee)})
              </button>
            {/if}
            {#if lot.registered}
              <div class="row">
                <input
                  type="number"
                  min="1"
                  max={lot.bottles}
                  step="100"
                  aria-label="Flaschen"
                  bind:value={() => amount, (v) => (lotAmounts[lot.id] = v)}
                />
                <button {...button(wholesaleAction)} onclick={() => run(wholesaleAction)}>
                  Großhandel +{formatEuro(wholesalePrice(lot, player, game.year) * amount)}
                </button>
              </div>
            {/if}
          </div>
        </div>
      </article>
    {:else}
      <p class="tile empty muted">Noch nichts abgefüllt. Ausgebauten Wein aus dem Tank abfüllen.</p>
    {/each}
  </div>
</div>

<style>
  .gauges {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
  }
  .gauge {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 180px;
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
  .meter.oak > div {
    background: #a8683a;
  }
  .warning {
    color: var(--danger);
    border-color: var(--danger);
    margin: 0;
  }
  .visual {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .visual-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .action-grid button {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 6px 8px;
  }
  .wide {
    width: 100%;
  }
  .tricks summary {
    cursor: pointer;
  }
  button.danger {
    border-color: var(--danger);
    color: var(--danger);
  }
  select {
    flex: 1;
    min-width: 0;
  }
</style>
