<script lang="ts">
  import { fastForward } from '../engine/advisor'
  import { activeHumans, runAiTurns } from '../engine/ai'
  import { REGIONS } from '../engine/data/regions'
  import { applyAction, currentPlayer, formatEuro, MONTH_NAMES, RuleError } from '../engine/game'
  import type { Action, GameState } from '../engine/types'
  import { loadChallengeBest, recordChallengeResult } from '../save'
  import AuctionCard from './AuctionCard.svelte'
  import BottlesCard from './BottlesCard.svelte'
  import CellarCard from './CellarCard.svelte'
  import EstateCard from './EstateCard.svelte'
  import ExportCard from './ExportCard.svelte'
  import LexiconDialog from './LexiconDialog.svelte'
  import RankingCard from './RankingCard.svelte'
  import SeasonScene from './SeasonScene.svelte'
  import { isMuted, play, setMuted, soundForChange } from './sound'
  import TasksCard from './TasksCard.svelte'
  import VineyardCard from './VineyardCard.svelte'
  import WeatherCard from './WeatherCard.svelte'

  let { game, onChange, onQuit }: { game: GameState; onChange: (g: GameState) => void; onQuit: () => void } =
    $props()

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
  const hasPointTarget = $derived(game.targetPoints < Number.MAX_SAFE_INTEGER)
  const recentLog = $derived(
    game.log
      .filter((e) => e.playerId === null || e.playerId === player.id)
      .slice(-15)
      .reverse(),
  )

  function commit(next: GameState, endedTurn: boolean) {
    error = ''
    if (endedTurn && hotSeat && currentPlayer(next).id !== player.id) handover = true
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
    <div class="scene"><SeasonScene month={game.month} weather={game.lastWeather} /></div>
    <div class="title">
      <strong>
        {MONTH_NAMES[game.month - 1]} · Jahr {game.year}{game.yearLimit ? ` von ${game.yearLimit}` : ''}
      </strong>
      <span class="muted">
        {player.name} · {region.name}{game.challenge ? ` · 🎯 Tages-Challenge ${game.challenge}` : ''}
      </span>
    </div>
    <div class="stats">
      <span class:negative={player.money < 0} title="Kontostand">💶 {formatEuro(player.money)}</span>
      <span title="Siegpunkte">🏆 {player.points}{hasPointTarget ? ` / ${game.targetPoints}` : ''}</span>
      <span title="Bekanntheit">⭐ {Math.round(player.reputation)}</span>
    </div>
    <div class="tools">
      <button class="ghost" onclick={() => (lexiconOpen = true)} title="Lexikon">📖 Lexikon</button>
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

  <main class="grid">
    {#if !over}
      <TasksCard {game} {player} />
    {/if}
    <AuctionCard {game} {player} {run} />
    <ExportCard {player} {run} />
    <WeatherCard {game} {player} />
    <VineyardCard {game} {player} {run} />
    <CellarCard {game} {player} {run} />
    <BottlesCard {game} {player} {run} />
    <EstateCard {game} {player} {run} />
    {#if multiplayer}
      <RankingCard {game} {player} />
    {/if}
    <section class="card">
      <h2>Logbuch</h2>
      <ul class="log">
        {#each recentLog as entry, i (i)}
          <li><span class="muted">{entry.month}/{entry.year}</span> {entry.text}</li>
        {/each}
      </ul>
    </section>
  </main>

  <footer class="bottombar">
    <button class="ghost" onclick={onQuit}>Spiel beenden</button>
    <div class="row">
      {#if !hotSeat}
        <button
          disabled={over}
          onclick={skipAhead}
          title="Monate beenden, bis eine wichtige Entscheidung ansteht (höchstens ein Jahr)"
        >
          ⏩ Vorspulen
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
  .scene {
    flex: 0 1 180px;
    min-width: 120px;
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
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
    gap: 16px;
    padding: 16px;
    max-width: 1200px;
    margin: 0 auto;
  }
  .log {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.9rem;
  }
  .log li {
    padding: 3px 0;
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
