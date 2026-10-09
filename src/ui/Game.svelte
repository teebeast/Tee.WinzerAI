<script lang="ts">
  import { activeHumans, runAiTurns } from '../engine/ai'
  import { REGIONS } from '../engine/data/regions'
  import { applyAction, currentPlayer, formatEuro, MONTH_NAMES, RuleError } from '../engine/game'
  import type { Action, GameState } from '../engine/types'
  import AuctionCard from './AuctionCard.svelte'
  import BottlesCard from './BottlesCard.svelte'
  import CellarCard from './CellarCard.svelte'
  import EstateCard from './EstateCard.svelte'
  import RankingCard from './RankingCard.svelte'
  import VineyardCard from './VineyardCard.svelte'
  import WeatherCard from './WeatherCard.svelte'

  let { game, onChange, onQuit }: { game: GameState; onChange: (g: GameState) => void; onQuit: () => void } =
    $props()

  let error = $state('')
  /** Bei Hot-Seat wird der Bildschirm verdeckt, bis der nächste Spieler bereit ist. */
  let handover = $state(false)

  const player = $derived(currentPlayer(game))
  const region = $derived(REGIONS[player.regionId])
  const multiplayer = $derived(game.players.length > 1)
  /** Mehrere Menschen am selben Gerät: Bildschirm bei jedem Wechsel verdecken */
  const hotSeat = $derived(game.players.filter((p) => p.ai === null).length > 1)
  const winner = $derived(game.players.find((p) => p.id === game.winnerId))
  const humansLeft = $derived(activeHumans(game).length > 0)
  const over = $derived(!!winner || game.finished || !humansLeft)
  const recentLog = $derived(
    game.log
      .filter((e) => e.playerId === null || e.playerId === player.id)
      .slice(-15)
      .reverse(),
  )

  function run(action: Action) {
    try {
      // Nach einem Zug ziehen die Computergegner, bis wieder ein Mensch dran ist.
      const next = action.type === 'endTurn' ? runAiTurns(applyAction(game, action)) : applyAction(game, action)
      error = ''
      if (action.type === 'endTurn' && hotSeat && currentPlayer(next).id !== player.id) handover = true
      onChange(next)
    } catch (e) {
      if (e instanceof RuleError) {
        error = e.message
      } else {
        // Programmfehler sichtbar machen statt still zu scheitern
        console.error(e)
        error = `Interner Fehler: ${e instanceof Error ? e.message : String(e)}`
      }
    }
  }
</script>

{#if handover}
  <div class="card handover">
    <p class="muted">{MONTH_NAMES[game.month - 1]}, Jahr {game.year}</p>
    <h2>{player.name} ist am Zug</h2>
    <button class="primary" onclick={() => (handover = false)}>Los geht's</button>
  </div>
{:else}
  <header class="topbar">
    <div class="title">
      <strong>{MONTH_NAMES[game.month - 1]} · Jahr {game.year}</strong>
      <span class="muted">{player.name} · {region.name}</span>
    </div>
    <div class="stats">
      <span class:negative={player.money < 0} title="Kontostand">💶 {formatEuro(player.money)}</span>
      <span title="Siegpunkte">🏆 {player.points} / {game.targetPoints}</span>
      <span title="Bekanntheit">⭐ {Math.round(player.reputation)}</span>
    </div>
  </header>

  {#if over}
    <div class="card banner">
      <strong>
        {#if winner}
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
    <AuctionCard {game} {player} {run} />
    <WeatherCard {game} />
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
    <button class="primary" disabled={over} onclick={() => run({ type: 'endTurn' })}>
      {hotSeat ? 'Zug beenden' : 'Monat beenden'} →
    </button>
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
