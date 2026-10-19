<script lang="ts">
  import { tick } from 'svelte'
  import { advance, importantHints, monthHints, type Hint } from '../engine/advisor'
  import { awaitingLot } from '../engine/auction'
  import { gameMonth } from '../engine/bio'
  import { activeHumans } from '../engine/ai'
  import { qualityInfo } from '../engine/data/quality'
  import { exportEligible } from '../engine/exports'
  import { REGIONS } from '../engine/data/regions'
  import { applyAction, currentPlayer, formatEuro, validateAction, hasPointTarget as pointTarget, isEndless, MONTH_NAMES, RuleError } from '../engine/game'
  import type { Action, GameState, LogEntry } from '../engine/types'
  import { loadChallengeBest, recordChallengeResult } from '../save'
  import AuctionLive from './AuctionLive.svelte'
  import LexiconDialog from './LexiconDialog.svelte'
  import TurnSummary, { type Summary } from './TurnSummary.svelte'
  import { PAGES, type Page } from './pages'
  import CellarPage from './pages/CellarPage.svelte'
  import EstatePage from './pages/EstatePage.svelte'
  import OrdersPage from './pages/OrdersPage.svelte'
  import HofPage from './pages/HofPage.svelte'
  import RankingPage from './pages/RankingPage.svelte'
  import VineyardPage from './pages/VineyardPage.svelte'
  import { isMuted, play, setMuted, soundForChange } from './sound'

  let {
    game,
    onChange,
    onQuit,
    initialPage = 'hof',
  }: { game: GameState; onChange: (g: GameState) => void; onQuit: (finished: boolean) => void; initialPage?: Page } = $props()

  /** Unterseite aus der Adresse (#keller …), damit Zurück-Taste und Lesezeichen funktionieren */
  function pageFromHash(): Page | null {
    const id = typeof location === 'undefined' ? '' : location.hash.slice(1)
    return PAGES.some((p) => p.id === id) ? (id as Page) : null
  }

  // svelte-ignore state_referenced_locally
  let page = $state<Page>(pageFromHash() ?? initialPage)

  $effect(() => {
    const onHash = () => (page = pageFromHash() ?? 'hof')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  })

  let error = $state('')
  let lexiconOpen = $state(false)
  let muted = $state(isMuted())
  let challengeMessage = $state('')

  const player = $derived(currentPlayer(game))
  const region = $derived(REGIONS[player.regionId])
  /** Mehrere Menschen am selben Gerät: Bildschirm bei jedem Wechsel verdecken */
  const hotSeat = $derived(game.players.filter((p) => p.ai === null).length > 1)
  const winner = $derived(game.players.find((p) => p.id === game.winnerId))
  const humansLeft = $derived(activeHumans(game).length > 0)
  const over = $derived(!!winner || game.finished || !humansLeft)
  /** Live-Versteigerung, bei der gerade ein Mensch bieten muss */
  const liveLot = $derived(over ? undefined : awaitingLot(game))
  const hasPointTarget = $derived(pointTarget(game))
  /** Andere Menschen am Tisch, deren Züge gerade von selbst durchlaufen */
  const othersSkipping = $derived(game.players.filter((p) => p.ai === null && p.autoSkip && p.id !== player.id))
  const tabs = PAGES
  /** Offene wichtige Aufgaben je Unterseite – als Zähler an den Reitern */
  const badges = $derived.by(() => {
    const counts: Partial<Record<Page, number>> = {}
    if (!over) {
      for (const hint of monthHints(game, player)) {
        if (hint.important && hint.area !== 'auftraege') counts[hint.area] = (counts[hint.area] ?? 0) + 1
      }
      // Aufträge immer zählen – Anfragen, angenommene, noch nicht gelieferte Aufträge und Exportanfragen –, damit nichts untergeht
      const orders = player.orderOffers.length + player.orders.length + (player.exportOffer ? 1 : 0)
      if (orders > 0) counts.auftraege = orders
    }
    return counts
  })

  /** Zur Exportkarte auf der Seite „Aufträge“ springen */
  async function showExport() {
    go('auftraege')
    await tick()
    document.getElementById('export-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function go(target: Page) {
    page = target
    if (location.hash !== '#' + target) history.pushState(null, '', '#' + target)
    window.scrollTo?.({ top: 0 })
  }

  function commit(next: GameState, endedTurn: boolean) {
    error = ''
    if (endedTurn && hotSeat && currentPlayer(next).id !== player.id) go('hof')
    if (next.finished && next.challenge && !game.finished) {
      const me = next.players.find((p) => p.ai === null)!
      const best = loadChallengeBest(next.challenge)
      challengeMessage = recordChallengeResult(next.challenge, me.points)
        ? `Neuer Tagesbestwert: ${me.points} Punkte!`
        : `${me.points} Punkte – dein Bestwert heute: ${best} Punkte.`
    }
    play(soundForChange(game, next) ?? 'click')
    onChange(next)
  }

  function run(action: Action) {
    try {
      const before = player
      const endsTurn = action.type === 'endTurn' || action.type === 'autoSkip'
      if (endsTurn) markSeen(game, before.id)
      if (action.type === 'autoSkip') skipping.set(before.id, gameMonth(game))
      // Nach einem Zug ziehen die Computergegner und die Züge der Vorspulenden laufen durch, bis ein Mensch dran ist.
      const next = endsTurn ? advance(applyAction(game, action)) : applyAction(game, action)
      commit(next, endsTurn)
      if (!endsTurn) return
      const now = currentPlayer(next)
      // Wer jetzt dran ist und vorgespult hat, ist fertig damit – oder das Spiel endete während des Vorspulens
      const skipper = skipping.has(now.id) && !now.autoSkip ? now.id : isOver(next) && skipping.has(before.id) ? before.id : null
      if (skipper) {
        // Übersicht über die übersprungenen Monate und den Grund für den Halt
        const since = skipping.get(skipper)!
        skipping.delete(skipper)
        showSummary(next, before.id, gameMonth(next) - since, isOver(next) ? [] : importantHints(next), true)
      } else if (hotSeat && now.id !== before.id && !isOver(next)) {
        // Mehrere Menschen am Gerät: Die Übersicht verdeckt den Wechsel und zeigt dem Nächsten, was ansteht
        showSummary(next, before.id, 0, importantHints(next), false)
      }
    } catch (e) {
      showError(e)
    }
  }

  /** Übersicht nach dem Vorspulen und beim Spielerwechsel – sonst gehen Ereignisse unter, wenn man nicht auf dem Hof steht */
  let summary = $state<Summary | null>(null)
  /** Meldungen, die in der Übersicht erscheinen: Ereignisse sowie Versteigerung */
  const isNews = (e: LogEntry) => e.tone !== undefined || e.text.startsWith('📣') || e.text.startsWith('🔨')
  const timeOf = (e: { year: number; month: number }) => e.year * 12 + e.month
  const logKey = (e: LogEntry) => `${timeOf(e)}|${e.playerId}|${e.text}`
  const isOver = (s: GameState) => !!s.winnerId || s.finished || activeHumans(s).length === 0
  /** Wer gerade vorspult – seit welchem Spielmonat –, um ihm danach die Übersicht zu zeigen */
  const skipping = new Map<string, number>()

  /** Was jeder Mensch zuletzt gesehen hat: ab welchem Monat und welche Meldungen dieses Monats er schon kennt */
  const seen = new Map<string, { from: number; keys: Set<string> }>()

  function markSeen(state: GameState, playerId: string) {
    const from = timeOf(state)
    seen.set(playerId, { from, keys: new Set(state.log.filter((e) => timeOf(e) === from).map(logKey)) })
  }

  /** Neuigkeiten für einen Spieler seit seinem letzten Zug */
  function newsSince(state: GameState, playerId: string): LogEntry[] {
    const mark = seen.get(playerId) ?? { from: timeOf(state) - 1, keys: new Set<string>() }
    return state.log.filter(
      (e) => (e.playerId === null || e.playerId === playerId) && isNews(e) && timeOf(e) >= mark.from && !mark.keys.has(logKey(e)),
    )
  }

  function showSummary(state: GameState, previousId: string, months: number, reasons: Hint[], skipped: boolean) {
    const now = currentPlayer(state)
    summary = {
      playerName: now.name,
      changed: hotSeat && now.id !== previousId,
      months,
      reasons,
      entries: newsSince(state, now.id),
      over: isOver(state),
      skipped,
    }
  }

  function showError(e: unknown) {
    if (e instanceof RuleError) {
      error = e.message
    } else {
      // Programmfehler sichtbar machen statt still zu scheitern
      console.error(e)
      error = `Interner Fehler: ${e instanceof Error ? e.message : String(e)}`
    }
  }

  function toggleSound() {
    muted = !muted
    setMuted(muted)
    if (!muted) play('click')
  }
</script>

<LexiconDialog bind:open={lexiconOpen} />

{#if summary}
  <TurnSummary
    {game}
    {summary}
    onClose={() => (summary = null)}
    onGoto={(area) => {
      summary = null
      go(area)
    }}
  />
{:else if liveLot}
  <AuctionLive {game} lot={liveLot} {run} />
{/if}

  <header class="topbar">
    <div class="title">
      <strong>
        {MONTH_NAMES[game.month - 1]} · Jahr {game.year}{game.yearLimit ? ` von ${game.yearLimit}` : ''}
      </strong>
      <span class="muted">
        {player.name} · {region.name}{game.challenge ? ` · 🎯 Tages-Challenge ${game.challenge}` : ''}{isEndless(game) ? ' · ∞ Endlosspiel' : ''}{#each othersSkipping as other (other.id)}
          · ⏩ {other.name} spult vor{/each}
      </span>
    </div>
    <div class="stats">
      <span class:negative={player.money < 0} title="Kontostand">💶 {formatEuro(player.money)}</span>
      <span title="Siegpunkte">🏆 {player.points}{hasPointTarget ? ` / ${game.targetPoints}` : ''}</span>
      <span title="Bekanntheit">⭐ {Math.round(player.reputation)}</span>
    </div>
    <div class="tools">
      <button class="ghost" onclick={() => (lexiconOpen = true)} title="Lexikon">📖 <span class="wide-only">Lexikon</span></button>
      <button class="ghost" onclick={toggleSound} aria-label={muted ? 'Ton einschalten' : 'Ton ausschalten'}>
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  </header>

  {#if over}
    <div class="card banner">
      <strong>
        {#if game.challenge && game.finished}
          🎯 Tages-Challenge beendet. {challengeMessage}
        {:else if winner}
          {winner.name} hat gewonnen!
        {:else if game.finished}
          Alle Weingüter sind insolvent – Spiel vorbei.
        {:else}
          Du bist insolvent und scheidest aus.
        {/if}
      </strong>
      <button onclick={() => onQuit(true)}>Neues Spiel</button>
    </div>
  {/if}

  {#if error}
    <div class="card error" role="alert">{error}</div>
  {/if}

  <div class="sticky-head">
    <nav class="tabs" aria-label="Bereiche">
      {#each tabs as tab (tab.id)}
        <button
          class="tab"
          role="tab"
          aria-selected={page === tab.id}
          class:active={page === tab.id}
          onclick={() => go(tab.id)}
        >
          <span class="tab-icon" aria-hidden="true">{tab.icon}</span>
          <span>{tab.label}</span>
          {#if badges[tab.id]}<span class="badge" aria-label="{badges[tab.id]} offene Aufgaben">{badges[tab.id]}</span>{/if}
        </button>
      {/each}
    </nav>

    {#if player.decision && !over}
      {@const decision = player.decision}
      <aside class="offer decision" role="alert" aria-label="Entscheidung">
        <span class="offer-text">
          <strong>{decision.title}</strong>
          <span class="small">{decision.text} <em>Gilt bis {(decision.deadline ?? 0) > gameMonth(game) ? 'Ende nächsten Monats' : 'Monatsende'}.</em></span>
        </span>
        <span class="choices">
          {#each decision.options as choice, i (i)}
            {@const problem = validateAction(game, { type: 'decide', option: i })}
            <button
              class="choice"
              class:primary={i === 0}
              disabled={problem !== null}
              title={problem ?? ''}
              onclick={() => run({ type: 'decide', option: i })}
            >
              <strong>{choice.label}{choice.cost > 0 ? ` (${formatEuro(choice.cost)})` : ''}</strong>
              <span class="small">{choice.hint}</span>
            </button>
          {/each}
        </span>
      </aside>
    {/if}

    {#if player.exportOffer && !over}
      {@const offer = player.exportOffer}
      <aside class="offer" role="alert" aria-label="Exportanfrage">
        <span class="offer-icon" aria-hidden="true">🌍</span>
        <span class="offer-text">
          <strong>Exportanfrage aus {offer.country} – nur diesen Monat gültig</strong>
          <span class="small">
            {offer.bottlesPerMonth.toLocaleString('de-DE')} Fl. pro Monat zu {formatEuro(offer.pricePerBottle)} ·
            {offer.months} Monate · mindestens {qualityInfo(offer.minLevel).name}, Güte ab {offer.minQuality} ·
            passender Vorrat: {exportEligible(player, offer).reduce((sum, l) => sum + l.bottles, 0).toLocaleString('de-DE')} Fl.
          </span>
        </span>
        <span class="offer-actions">
          <button class="primary" onclick={() => run({ type: 'answerExport', accept: true })}>Annehmen</button>
          <button onclick={() => run({ type: 'answerExport', accept: false })}>Ablehnen</button>
          <button class="ghost" onclick={showExport}>Details</button>
        </span>
      </aside>
    {/if}
  </div>

  <main>
    {#if page === 'hof'}
      <HofPage {game} {player} {over} {run} {go} />
    {:else if page === 'weinberg'}
      <VineyardPage {game} {player} {run} />
    {:else if page === 'keller'}
      <CellarPage {game} {player} {run} />
    {:else if page === 'auftraege'}
      <OrdersPage {game} {player} {run} />
    {:else if page === 'betrieb'}
      <EstatePage {game} {player} {run} />
    {:else}
      <RankingPage {game} {player} />
    {/if}
  </main>

  <footer class="bottombar">
    <button class="ghost" onclick={() => onQuit(over)} title="Der Spielstand ist gespeichert und lässt sich im Hauptmenü wieder laden.">
      ← <span class="wide-only">Hauptmenü</span>
    </button>
    <div class="row">
      <button
        disabled={over}
        onclick={() => run({ type: 'autoSkip' })}
        aria-label="Vorspulen"
        title={hotSeat
          ? 'Deine Züge laufen von selbst durch, bis bei dir etwas Wichtiges ansteht (höchstens ein Jahr) – die anderen spielen normal weiter'
          : 'Monate beenden, bis eine wichtige Entscheidung ansteht (höchstens ein Jahr)'}
      >
        ⏩ <span class="wide-only">Vorspulen</span>
      </button>
      <button class="primary" disabled={over} onclick={() => run({ type: 'endTurn' })}>
        {hotSeat ? 'Zug beenden' : 'Monat beenden'} →
      </button>
    </div>
  </footer>

<style>
  .topbar,
  .bottombar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }
  .title {
    display: flex;
    flex-direction: column;
    flex: 1 1 200px;
  }
  .tools {
    display: flex;
    gap: 4px;
  }
  .bottombar {
    position: sticky;
    bottom: 0;
    border-top: 1px solid var(--border);
    border-bottom: none;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 16px;
    font-variant-numeric: tabular-nums;
  }
  .negative {
    color: var(--danger);
  }
  .topbar {
    border-bottom: none;
  }
  /* Reiter und dringende Hinweise bleiben beim Scrollen sichtbar */
  .sticky-head {
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .offer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 8px 16px;
    background: color-mix(in srgb, var(--sun) 28%, var(--surface));
    border-bottom: 2px solid var(--sun);
    animation: arrive 0.6s ease-out;
  }
  @keyframes arrive {
    from { transform: translateY(-8px); opacity: 0; }
    to { transform: none; opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .offer { animation: none; }
  }
  .offer-icon {
    font-size: 1.6rem;
  }
  .offer-text {
    display: flex;
    flex-direction: column;
    flex: 1 1 260px;
    min-width: 0;
  }
  .decision {
    background: color-mix(in srgb, var(--wine) 14%, var(--surface));
    border-bottom-color: var(--wine);
  }
  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 6px;
    flex: 2 1 360px;
  }
  .choice {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    text-align: left;
    font-weight: normal;
  }
  .offer-actions {
    display: flex;
    gap: 6px;
  }
  .tabs {
    display: flex;
    gap: 2px;
    padding: 0 8px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    overflow-x: auto;
    justify-content: center;
  }
  .tab {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    border: none;
    border-bottom: 3px solid transparent;
    border-radius: 0;
    color: var(--muted);
    background: none;
    white-space: nowrap;
  }
  .tab.active {
    color: var(--wine);
    border-bottom-color: var(--wine);
    font-weight: 600;
  }
  .tab-icon {
    font-size: 1.15rem;
  }
  .badge {
    min-width: 1.3em;
    padding: 0 5px;
    border-radius: 10px;
    background: var(--wine);
    color: var(--wine-contrast);
    font-size: 0.75rem;
    font-weight: 700;
    text-align: center;
  }
  @media (max-width: 560px) {
    .topbar {
      display: grid;
      grid-template-columns: 1fr auto;
      grid-template-areas: 'title tools' 'stats stats';
      padding: 8px 12px;
    }
    .title {
      grid-area: title;
    }
    .tools {
      grid-area: tools;
    }
    .stats {
      grid-area: stats;
    }
    .bottombar {
      flex-wrap: nowrap;
      padding: 8px 12px;
    }
    .wide-only {
      display: none;
    }
    .tab {
      flex-direction: column;
      gap: 0;
      padding: 6px 8px;
      font-size: 0.75rem;
      flex: 1;
    }
    .badge {
      position: absolute;
      top: 2px;
      right: 4px;
    }
  }
  .banner,
  .error {
    max-width: 1168px;
    margin: 16px auto 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .banner {
    border-color: var(--wine);
  }
  .error {
    border-color: var(--danger);
    color: var(--danger);
  }
  @media (max-width: 1200px) {
    .banner,
    .error {
      margin-inline: 16px;
    }
  }
</style>
