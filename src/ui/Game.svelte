<script lang="ts">
  import { fastForward, monthHints } from '../engine/advisor'
  import { activeHumans, runAiTurns } from '../engine/ai'
  import { REGIONS } from '../engine/data/regions'
  import { applyAction, currentPlayer, formatEuro, hasPointTarget as pointTarget, isEndless, MONTH_NAMES, RuleError } from '../engine/game'
  import type { Action, GameState } from '../engine/types'
  import { loadChallengeBest, recordChallengeResult } from '../save'
  import LexiconDialog from './LexiconDialog.svelte'
  import { PAGES, type Page } from './pages'
  import CellarPage from './pages/CellarPage.svelte'
  import EstatePage from './pages/EstatePage.svelte'
  import HofPage from './pages/HofPage.svelte'
  import RankingPage from './pages/RankingPage.svelte'
  import VineyardPage from './pages/VineyardPage.svelte'
  import { isMuted, play, setMuted, soundForChange } from './sound'

  let {
    game,
    onChange,
    onQuit,
    initialPage = 'hof',
  }: { game: GameState; onChange: (g: GameState) => void; onQuit: () => void; initialPage?: Page } = $props()

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
  /** Bei Hot-Seat wird der Bildschirm verdeckt, bis der nächste Spieler bereit ist. */
  let handover = $state(false)
  let lexiconOpen = $state(false)
  let muted = $state(isMuted())
  let challengeMessage = $state('')

  const player = $derived(currentPlayer(game))
  const region = $derived(REGIONS[player.regionId])
  const multiplayer = $derived(game.players.length > 1)
  /** Mehrere Menschen am selben Gerät: Bildschirm bei jedem Wechsel verdecken */
  const hotSeat = $derived(game.players.filter((p) => p.ai === null).length > 1)
  const winner = $derived(game.players.find((p) => p.id === game.winnerId))
  const humansLeft = $derived(activeHumans(game).length > 0)
  const over = $derived(!!winner || game.finished || !humansLeft)
  const hasPointTarget = $derived(pointTarget(game))
  const tabs = $derived(PAGES.filter((p) => p.id !== 'rangliste' || multiplayer))
  /** Offene wichtige Aufgaben je Unterseite – als Zähler an den Reitern */
  const badges = $derived.by(() => {
    const counts: Partial<Record<Page, number>> = {}
    if (!over) {
      for (const hint of monthHints(game, player)) {
        if (hint.important) counts[hint.area] = (counts[hint.area] ?? 0) + 1
      }
    }
    return counts
  })

  function go(target: Page) {
    page = target
    if (location.hash !== '#' + target) history.pushState(null, '', '#' + target)
    window.scrollTo?.({ top: 0 })
  }

  function commit(next: GameState, endedTurn: boolean) {
    error = ''
    if (endedTurn && hotSeat && currentPlayer(next).id !== player.id) {
      handover = true
      go('hof')
    }
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
      // Nach einem Zug ziehen die Computergegner, bis wieder ein Mensch dran ist.
      const next = action.type === 'endTurn' ? runAiTurns(applyAction(game, action)) : applyAction(game, action)
      commit(next, action.type === 'endTurn')
    } catch (e) {
      showError(e)
    }
  }

  function skipAhead() {
    try {
      commit(fastForward(game).state, true)
    } catch (e) {
      showError(e)
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

{#if handover}
  <div class="card handover">
    <p class="muted">{MONTH_NAMES[game.month - 1]}, Jahr {game.year}</p>
    <h2>{player.name} ist am Zug</h2>
    <button class="primary" onclick={() => (handover = false)}>Los geht's</button>
  </div>
{:else}
  <header class="topbar">
    <div class="title">
      <strong>
        {MONTH_NAMES[game.month - 1]} · Jahr {game.year}{game.yearLimit ? ` von ${game.yearLimit}` : ''}
      </strong>
      <span class="muted">
        {player.name} · {region.name}{game.challenge ? ` · 🎯 Tages-Challenge ${game.challenge}` : ''}{isEndless(game) ? ' · ∞ Endlosspiel' : ''}
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
      <button onclick={onQuit}>Neues Spiel</button>
    </div>
  {/if}

  {#if error}
    <div class="card error" role="alert">{error}</div>
  {/if}

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

  <main>
    {#if page === 'hof'}
      <HofPage {game} {player} {over} {run} {go} />
    {:else if page === 'weinberg'}
      <VineyardPage {game} {player} {run} />
    {:else if page === 'keller'}
      <CellarPage {game} {player} {run} />
    {:else if page === 'betrieb'}
      <EstatePage {game} {player} {run} />
    {:else}
      <RankingPage {game} {player} />
    {/if}
  </main>

  <footer class="bottombar">
    <button class="ghost" onclick={onQuit}><span class="wide-only">Spiel</span> beenden</button>
    <div class="row">
      {#if !hotSeat}
        <button
          disabled={over}
          onclick={skipAhead}
          aria-label="Vorspulen"
          title="Monate beenden, bis eine wichtige Entscheidung ansteht (höchstens ein Jahr)"
        >
          ⏩ <span class="wide-only">Vorspulen</span>
        </button>
      {/if}
      <button class="primary" disabled={over} onclick={() => run({ type: 'endTurn' })}>
        {hotSeat ? 'Zug beenden' : 'Monat beenden'} →
      </button>
    </div>
  </footer>
{/if}

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
  .tabs {
    position: sticky;
    top: 0;
    z-index: 5;
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
  .handover {
    max-width: 420px;
    margin: 20vh auto 0;
    text-align: center;
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
