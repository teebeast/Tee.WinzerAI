<script lang="ts">
  import { REGIONS, type RegionId } from '../engine/data/regions'
  import type { NewGameOptions } from '../engine/types'

  let { onStart }: { onStart: (options: NewGameOptions) => void } = $props()

  const regionIds = Object.keys(REGIONS) as RegionId[]
  let players = $state([{ name: 'Spieler 1', regionId: 'mosel' as RegionId }])
  let targetPoints = $state(600)
  let seed = $state(String(Math.floor(Math.random() * 1_000_000)))

  function addPlayer() {
    players.push({ name: `Spieler ${players.length + 1}`, regionId: regionIds[players.length % regionIds.length] })
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    onStart({
      seed: Number(seed) || 0,
      targetPoints,
      players: players.map((p, i) => ({ ...p, name: p.name.trim() || `Spieler ${i + 1}` })),
    })
  }
</script>

<form class="card new-game" onsubmit={submit}>
  <h1>Winzer</h1>
  <p class="muted">Übernimm ein Weingut mit 10 ha, keltere die besten Weine und sammle Punkte. Wer zuerst das Ziel erreicht, gewinnt.</p>

  <h2>Spieler</h2>
  {#each players as player, i (i)}
    <div class="row">
      <input aria-label="Name" bind:value={player.name} maxlength="20" />
      <select aria-label="Anbaugebiet" bind:value={player.regionId}>
        {#each regionIds as id (id)}
          <option value={id}>{REGIONS[id].name}</option>
        {/each}
      </select>
      {#if players.length > 1}
        <button type="button" class="ghost" onclick={() => players.splice(i, 1)} aria-label="Spieler entfernen">✕</button>
      {/if}
    </div>
  {/each}
  {#if players.length < 4}
    <button type="button" class="ghost" onclick={addPlayer}>+ Spieler (Hot-Seat)</button>
  {/if}

  <h2>Spiellänge</h2>
  <div class="row">
    <label><input type="radio" bind:group={targetPoints} value={300} /> Kurz (300)</label>
    <label><input type="radio" bind:group={targetPoints} value={600} /> Normal (600)</label>
    <label><input type="radio" bind:group={targetPoints} value={1000} /> Klassisch (1000)</label>
  </div>

  <details>
    <summary>Erweitert</summary>
    <label class="row">Seed <input bind:value={seed} inputmode="numeric" /></label>
  </details>

  <button type="submit" class="primary">Spiel starten</button>
</form>

<style>
  .new-game {
    max-width: 520px;
    margin: 32px auto;
  }
  h1 {
    margin: 0 0 4px;
    color: var(--wine);
  }
  h2 {
    font-size: 1rem;
    margin: 20px 0 8px;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }
  .row input:not([type='radio']) {
    flex: 1;
    min-width: 0;
  }
  details {
    margin: 16px 0;
  }
  .primary {
    width: 100%;
  }
</style>
