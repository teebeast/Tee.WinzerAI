<script lang="ts">
  import { MONTH_NAMES } from '../engine/game'
  import type { LogEntry } from '../engine/types'

  /** Nach dem Vorspulen: Was ist in den übersprungenen Monaten passiert? */
  let { months, entries, onClose }: { months: number; entries: LogEntry[]; onClose: () => void } = $props()

  /** Nach Monat gruppiert, älteste zuerst */
  const groups = $derived.by(() => {
    const map = new Map<string, LogEntry[]>()
    for (const entry of entries) {
      const key = `${MONTH_NAMES[entry.month - 1]}, Jahr ${entry.year}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(entry)
    }
    return [...map.entries()]
  })
  const good = $derived(entries.filter((e) => e.tone === 'good').length)
  const bad = $derived(entries.filter((e) => e.tone === 'bad').length)
</script>

<div class="backdrop">
  <div class="card summary" role="dialog" aria-modal="true" aria-labelledby="skip-title">
    <header>
      <h2 id="skip-title">⏩ {months} {months === 1 ? 'Monat' : 'Monate'} vorgespult</h2>
      <span class="muted small">
        {entries.length === 0 ? 'Keine besonderen Vorkommnisse.' : `${good} gute und ${bad} schlechte Nachrichten`}
      </span>
    </header>
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
    <button class="primary" onclick={onClose}>Weiter</button>
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
</style>
