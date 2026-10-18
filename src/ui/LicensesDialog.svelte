<script lang="ts">
  let { open = $bindable(false) }: { open?: boolean } = $props()

  let dialog = $state<HTMLDialogElement>()
  /** Die Hinweise sind rund 1 MB groß und werden erst beim Öffnen geladen. */
  let text = $state<string | null>(null)
  let failed = $state(false)

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal?.()
    if (!open && dialog.open) dialog.close()
    if (open && text === null && !failed) {
      fetch(`${import.meta.env.BASE_URL}third-party-licenses.txt`)
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
        .then((t) => (text = t))
        .catch(() => (failed = true))
    }
  })
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="licenses-title">
  <header>
    <h2 id="licenses-title">📜 Lizenzen</h2>
    <button class="ghost" onclick={() => (open = false)} aria-label="Lizenzen schließen">✕</button>
  </header>
  <p class="small">
    WinzerAI nutzt quelloffene Software von Dritten. Hier stehen deren Lizenzhinweise. Alle Namen von Weingütern, Personen,
    Siegeln und Prämierungen im Spiel sind frei erfunden.
  </p>
  {#if failed}
    <p class="muted">Die Lizenzhinweise konnten nicht geladen werden.</p>
  {:else if text === null}
    <p class="muted">Wird geladen …</p>
  {:else}
    <pre>{text}</pre>
  {/if}
</dialog>

<style>
  dialog {
    width: min(760px, calc(100vw - 32px));
    max-height: min(85vh, 820px);
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
  pre {
    white-space: pre-wrap;
    font-size: 0.75rem;
    line-height: 1.4;
  }
</style>
