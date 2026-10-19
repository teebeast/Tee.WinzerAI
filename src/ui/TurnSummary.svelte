<script lang="ts" module>
  import type { Hint } from '../engine/advisor'
  import type { LogEntry } from '../engine/types'

  export interface Summary {
    /** Wer jetzt am Zug ist */
    playerName: string
    /** Ein anderer Mensch ist jetzt dran – wird hervorgehoben */
    changed: boolean
    /** Vorgespulte Monate (0 beim einfachen Spielerwechsel) */
    months: number
    /** Wichtige Hinweise, die jetzt anstehen – beim Vorspulen der Grund für den Halt */
    reasons: Hint[]
    /** Neuigkeiten seit dem letzten Zug dieses Spielers */
    entries: LogEntry[]
    over: boolean
    /** Nach dem Vorspulen (sonst Spielerwechsel nach „Zug beenden“) */
    skipped: boolean
  }
</script>

<script lang="ts">
  import type { HintArea } from '../engine/advisor'
  import { MONTH_NAMES } from '../engine/game'
  import type { GameState } from '../engine/types'
  import { pageInfo } from './pages'

  /** Übersicht nach dem Vorspulen und beim Spielerwechsel: Wer ist dran, was steht an, was ist passiert? */
  let { game, summary, onClose, onGoto }: { game: GameState; summary: Summary; onClose: () => void; onGoto: (area: HintArea) => void } =
    $props()

  /** Nach Monat gruppiert, älteste zuerst */
  const groups = $derived.by(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of summary.entries) {
      const key = `${MONTH_NAMES[entry.month - 1]}, Jahr ${entry.year}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return [...map.entries()]
  })
  const good = $derived(summary.entries.filter((e) => e.tone === 'good').length)
  const bad = $derived(summary.entries.filter((e) => e.tone === 'bad').length)
</script>

<div class="backdrop" class:handover={summary.changed}>
  <div class="card summary" role="dialog" aria-modal="true" aria-labelledby="skip-title">
    {#if summary.changed}
      <div class="player-change">
        <span class="muted small">🔄 Spielerwechsel</span>
        <strong>{summary.playerName} ist am Zug</strong>
      </div>
    {/if}
    <header>
      <h2 id="skip-title">{summary.skipped ? '⏩ ' : ''}Jetzt: {MONTH_NAMES[game.month - 1]}, Jahr {game.year}</h2>
      <span class="muted small">
        {summary.entries.length === 0
          ? `${summary.changed ? 'Seit deinem letzten Zug' : 'Unterwegs'} keine besonderen Vorkommnisse.`
          : `${summary.changed ? 'Seit deinem letzten Zug' : 'Unterwegs'}: ${good} gute und ${bad} schlechte Nachrichten`}
      </span>
    </header>
    <section class="reasons" aria-label="Die Arbeit ruft">
      <h3>Die Arbeit ruft</h3>
      {#if summary.reasons.length > 0}
        <ul>
          {#each summary.reasons as reason, i (i)}
            <li class="reason">
              <span>{reason.text}</span>
              {#if reason.area !== 'hof'}
                <button class="go" onclick={() => onGoto(reason.area)}>{pageInfo(reason.area).label} →</button>
              {/if}
            </li>
          {/each}
        </ul>
      {:else if summary.over}
        <p class="muted small">Das Spiel ist zu Ende.</p>
      {:else if summary.skipped}
        <p class="muted small">Höchstens {summary.months} Monate am Stück – es stand keine wichtige Entscheidung an.</p>
      {:else}
        <p class="muted small">Nichts Dringendes – Zeit für Marketing oder Investitionen.</p>
      {/if}
    </section>
    <div class="list">
      {#each groups as [month, items] (month)}
        <h3>{month}</h3>
        <ul>
          {#each items as entry, i (i)}
            <li class={entry.tone ?? ''}>
              <span class="icon" aria-hidden="true">{entry.tone === 'good' ? '👍' : entry.tone === 'bad' ? '⚠️' : '📌'}</span>
              <span>{entry.text}</span>
            </li>
          {/each}
        </ul>
      {/each}
    </div>
    <button class="primary" onclick={onClose}>{summary.changed ? "Los geht's" : 'Weiter'}</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: center;
    padding: 16px;
    background: rgb(20 10 14 / 0.7);
    backdrop-filter: blur(2px);
  }
  /* Beim Spielerwechsel bleibt verdeckt, was der Vorgänger zuletzt angesehen hat */
  .backdrop.handover {
    background: rgb(20 10 14 / 0.92);
    backdrop-filter: blur(8px);
  }
  .player-change {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    margin: -4px -4px 0;
    padding: 12px;
    border-radius: 10px;
    background: var(--wine);
    color: #fff;
    text-align: center;
  }
  .player-change .muted {
    color: rgb(255 255 255 / 0.8);
  }
  .player-change strong {
    font-size: 1.35rem;
  }
  .summary {
    width: min(620px, 100%);
    max-height: calc(100vh - 32px);
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-color: var(--wine);
    box-shadow: 0 12px 40px rgb(0 0 0 / 0.3);
  }
  header {
    display: flex;
    flex-direction: column;
  }
  h2 {
    margin: 0;
  }
  .list {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }
  h3 {
    margin: 10px 0 4px;
    font-size: 0.9rem;
    color: var(--muted);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    display: flex;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 8px;
    border-left: 4px solid var(--border);
    font-size: 0.92rem;
  }
  li.good {
    border-left-color: var(--good);
    background: color-mix(in srgb, var(--good) 9%, transparent);
  }
  li.bad {
    border-left-color: var(--danger);
    background: color-mix(in srgb, var(--danger) 8%, transparent);
  }
  .primary {
    align-self: flex-end;
  }
  .reasons h3 {
    margin-top: 0;
  }
  .reasons p {
    margin: 0;
  }
  li.reason {
    align-items: center;
    justify-content: space-between;
    border-left-color: var(--wine);
    background: color-mix(in srgb, var(--wine) 7%, transparent);
  }
  .go {
    flex-shrink: 0;
    padding: 2px 10px;
    font-size: 0.85rem;
  }
</style>
