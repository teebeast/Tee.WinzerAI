<script lang="ts">
  import { LEXICON } from './lexicon'

  let { open = $bindable(false) }: { open?: boolean } = $props()

  let dialog = $state<HTMLDialogElement>()
  let filter = $state('')
  const entries = $derived(
    LEXICON.filter((e) => (e.term + ' ' + e.text).toLowerCase().includes(filter.trim().toLowerCase())),
  )

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close()
  })
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="lexicon-title">
  <header>
    <h2 id="lexicon-title">📖 Lexikon</h2>
    <button class="ghost" onclick={() => (open = false)} aria-label="Lexikon schließen">✕</button>
  </header>
  <input type="search" placeholder="Begriff suchen …" bind:value={filter} aria-label="Begriff suchen" />
  <dl>
    {#each entries as entry (entry.term)}
      <dt>{entry.term}</dt>
      <dd>{entry.text}</dd>
    {:else}
      <p class="muted">Nichts gefunden.</p>
    {/each}
  </dl>
</dialog>

<style>
  dialog {
    width: min(640px, calc(100vw - 32px));
    max-height: min(80vh, 720px);
    padding: 0 16px 16px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--surface);
    color: var(--text);
  }
  dialog::backdrop {
    background: rgb(0 0 0 / 0.45);
  }
  header {
    position: sticky;
    top: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--surface);
    padding-top: 12px;
  }
  h2 {
    margin: 0;
    font-size: 1.15rem;
  }
  input {
    width: 100%;
    margin: 8px 0 12px;
  }
  dt {
    font-weight: 600;
    color: var(--wine);
    margin-top: 12px;
  }
  dd {
    margin: 4px 0 0;
    line-height: 1.5;
  }
</style>
