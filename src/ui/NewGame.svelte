<script lang="ts">
  import { AI_PROFILES } from '../engine/ai'
  import { REGIONS, type RegionId } from '../engine/data/regions'
  import type { AiProfileId, NewGameOptions } from '../engine/types'

  let { onStart }: { onStart: (options: NewGameOptions) => void } = $props()

  type Kind = 'human' | AiProfileId
  interface Seat {
    name: string
    regionId: RegionId
    kind: Kind
  }

  const regionIds = Object.keys(REGIONS) as RegionId[]
  const profileIds = Object.keys(AI_PROFILES) as AiProfileId[]
  const AI_NAMES: Record<AiProfileId, string> = {
    tradition: 'Weingut Steinbach',
    genossenschaft: 'Winzergenossenschaft',
    bio: 'Biohof Lindner',
    schlitzohr: 'Weinhaus Fuchs',
  }

  let seats = $state<Seat[]>([
    { name: 'Spieler 1', regionId: 'mosel', kind: 'human' },
    { name: AI_NAMES.tradition, regionId: 'mosel', kind: 'tradition' },
  ])
  let targetPoints = $state(600)
  let seed = $state(String(Math.floor(Math.random() * 1_000_000)))
  const hasHuman = $derived(seats.some((s) => s.kind === 'human'))

  function addSeat() {
    const used = new Set(seats.map((s) => s.kind))
    const kind = profileIds.find((p) => !used.has(p)) ?? 'tradition'
    seats.push({ name: AI_NAMES[kind], regionId: seats[0].regionId, kind })
  }

  function changeKind(seat: Seat, kind: Kind) {
    const wasDefaultName = seat.kind === 'human' ? /^Spieler \d+$/.test(seat.name) : seat.name === AI_NAMES[seat.kind]
    seat.kind = kind
    if (wasDefaultName) seat.name = kind === 'human' ? `Spieler ${seats.indexOf(seat) + 1}` : AI_NAMES[kind]
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!hasHuman) return
    onStart({
      seed: Number(seed) || 0,
      targetPoints,
      players: seats.map((s, i) => ({
        name: s.name.trim() || `Spieler ${i + 1}`,
        regionId: s.regionId,
        ai: s.kind === 'human' ? null : s.kind,
      })),
    })
  }
</script>

<form class="card new-game" onsubmit={submit}>
  <h1>Winzer</h1>
  <p class="muted">Übernimm ein Weingut mit 10 ha, keltere die besten Weine und sammle Punkte. Wer zuerst das Ziel erreicht, gewinnt.</p>

  <h2>Weingüter</h2>
  {#each seats as seat, i (i)}
    <div class="seat">
      <input aria-label="Name" bind:value={seat.name} maxlength="24" />
      <select aria-label="Anbaugebiet" bind:value={seat.regionId}>
        {#each regionIds as id (id)}
          <option value={id}>{REGIONS[id].name}</option>
        {/each}
      </select>
      <select
        aria-label="Gesteuert von"
        value={seat.kind}
        onchange={(e) => changeKind(seat, e.currentTarget.value as Kind)}
        title={seat.kind === 'human' ? '' : AI_PROFILES[seat.kind].description}
      >
        <option value="human">Mensch</option>
        {#each profileIds as id (id)}
          <option value={id}>KI: {AI_PROFILES[id].name}{id === 'genossenschaft' ? ' (leicht)' : ''}</option>
        {/each}
      </select>
      {#if seats.length > 1}
        <button type="button" class="ghost" onclick={() => seats.splice(i, 1)} aria-label="Weingut entfernen">✕</button>
      {/if}
    </div>
  {/each}
  {#if seats.length < 4}
    <button type="button" class="ghost" onclick={addSeat}>+ Weingut</button>
  {/if}
  <p class="muted small">
    Mehrere Menschen spielen abwechselnd am selben Gerät (Hot-Seat). Versteigerungen gibt es nur unter Weingütern
    im selben Gebiet – und gegen auswärtige Investoren.
  </p>

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

  {#if !hasHuman}
    <p class="warning small" role="alert">Mindestens ein Weingut muss von einem Menschen gespielt werden.</p>
  {/if}
  <button type="submit" class="primary" disabled={!hasHuman}>Spiel starten</button>
</form>

<style>
  .new-game {
    max-width: 640px;
    margin: 32px auto;
  }
  @media (max-width: 672px) {
    .new-game {
      margin: 16px;
    }
  }
  h1 {
    margin: 0 0 4px;
    color: var(--wine);
  }
  h2 {
    font-size: 1rem;
    margin: 20px 0 8px;
  }
  .seat {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.4fr) auto;
    gap: 6px;
    margin-bottom: 8px;
  }
  @media (max-width: 520px) {
    .seat {
      grid-template-columns: 1fr 1fr;
    }
    .seat input {
      grid-column: 1 / -1;
    }
  }
  details {
    margin: 16px 0;
  }
  .warning {
    color: var(--danger);
  }
  .primary {
    width: 100%;
  }
</style>
