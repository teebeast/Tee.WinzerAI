<script lang="ts">
  import { AI_PROFILES } from '../engine/ai'
  import { CHALLENGE_YEARS, dailyChallenge, todayKey } from '../engine/challenge'
  import { REGIONS, type RegionId } from '../engine/data/regions'
  import { NO_POINT_TARGET } from '../engine/game'
  import type { AiProfileId, NewGameOptions } from '../engine/types'
  import { loadChallengeBest } from '../save'
  import SeasonScene from './SeasonScene.svelte'

  let { onStart }: { onStart: (options: NewGameOptions) => void } = $props()

  type Kind = 'human' | AiProfileId
  interface Seat {
    name: string
    regionId: RegionId
    kind: Kind
  }
  type Length = 300 | 600 | 1000 | 'endless'

  const regionIds = Object.keys(REGIONS) as RegionId[]
  const profileIds = Object.keys(AI_PROFILES) as AiProfileId[]
  const AI_NAMES: Record<AiProfileId, string> = {
    tradition: 'Weingut Steinbach',
    genossenschaft: 'Winzergenossenschaft',
    bio: 'Biohof Lindner',
    schlitzohr: 'Weinhaus Fuchs',
  }
  const LENGTHS: { value: Length; icon: string; name: string; text: string }[] = [
    { value: 300, icon: '⏱️', name: 'Kurz', text: '300 Punkte' },
    { value: 600, icon: '🍷', name: 'Normal', text: '600 Punkte' },
    { value: 1000, icon: '🏆', name: 'Klassisch', text: '1000 Punkte' },
    { value: 'endless', icon: '∞', name: 'Endlos', text: 'ohne Ziel und Zeitlimit' },
  ]

  let seats = $state<Seat[]>([
    { name: 'Spieler 1', regionId: 'mosel', kind: 'human' },
    { name: AI_NAMES.tradition, regionId: 'mosel', kind: 'tradition' },
  ])
  let length = $state<Length>(600)
  let climateChange = $state(true)
  const today = todayKey()
  const challenge = dailyChallenge(today)
  const challengeBest = loadChallengeBest(today)
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
      targetPoints: length === 'endless' ? NO_POINT_TARGET : length,
      climateChange,
      players: seats.map((s, i) => ({
        name: s.name.trim() || `Spieler ${i + 1}`,
        regionId: s.regionId,
        ai: s.kind === 'human' ? null : s.kind,
      })),
    })
  }
</script>

<div class="start">
  <header class="banner">
    <SeasonScene month={9} weather="sonnig" vinothek barrique height={220} />
    <div class="banner-text">
      <h1>Winzer<span>AI</span></h1>
      <p>Übernimm ein Weingut mit 10 ha, keltere die besten Weine und miss dich mit klugen Computer-Winzern.</p>
    </div>
  </header>

  <form class="layout" onsubmit={submit}>
    <section class="card variant challenge">
      <div class="variant-head">
        <span class="variant-icon" aria-hidden="true">🎯</span>
        <div>
          <h2>Tages-Challenge</h2>
          <span class="muted small">{today}</span>
        </div>
      </div>
      <p>
        {REGIONS[challenge.players[0].regionId].name} gegen zwei Computergegner, {CHALLENGE_YEARS} Jahre. Heute spielen alle
        dieselbe Partie – mit demselben Wetter und denselben Ereignissen.
      </p>
      <div class="variant-foot">
        <span class="chip">{challengeBest !== null ? `🏅 Dein Bestwert heute: ${challengeBest} Punkte` : 'Noch nicht gespielt'}</span>
        <button type="button" onclick={() => onStart(challenge)}>Challenge starten</button>
      </div>
    </section>

    <section class="card variant free">
      <div class="variant-head">
        <span class="variant-icon" aria-hidden="true">🍇</span>
        <div>
          <h2>Freies Spiel</h2>
          <span class="muted small">Gebiet, Gegner und Spiellänge frei wählbar</span>
        </div>
      </div>

      <h3>Weingüter</h3>
      {#each seats as seat, i (i)}
        <div class="seat">
          <span class="seat-icon" aria-hidden="true">{seat.kind === 'human' ? '👤' : '🤖'}</span>
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
            <button type="button" class="ghost remove" onclick={() => seats.splice(i, 1)} aria-label="Weingut entfernen">✕</button>
          {/if}
        </div>
      {/each}
      {#if seats.length < 4}
        <button type="button" class="ghost add" onclick={addSeat}>+ Weingut hinzufügen</button>
      {/if}
      <p class="muted small">
        Mehrere Menschen spielen abwechselnd am selben Gerät (Hot-Seat). Versteigerungen gibt es nur unter Weingütern im
        selben Gebiet – und gegen auswärtige Investoren.
      </p>

      {#if !hasHuman}
        <p class="warning small" role="alert">Mindestens ein Weingut muss von einem Menschen gespielt werden.</p>
      {/if}
      <button type="submit" class="primary" disabled={!hasHuman}>Spiel starten</button>
    </section>

    <aside class="card settings">
      <h2>⚙️ Einstellungen</h2>
      <p class="muted small">Gelten für das freie Spiel.</p>

      <h3>Spiellänge</h3>
      <div class="lengths" role="radiogroup" aria-label="Spiellänge">
        {#each LENGTHS as option (option.value)}
          <label class="length" class:active={length === option.value}>
            <input type="radio" name="length" bind:group={length} value={option.value} />
            <span class="length-icon" aria-hidden="true">{option.icon}</span>
            <span class="length-text">
              <strong>{option.name}</strong>
              <span class="muted small">{option.text}</span>
            </span>
          </label>
        {/each}
      </div>
      {#if length === 'endless'}
        <p class="muted small">Das Endlosspiel läuft, bis du es beendest oder pleitegehst. Die Rangliste zeigt jederzeit den Stand.</p>
      {/if}

      <h3>Welt</h3>
      <label class="toggle">
        <input type="checkbox" bind:checked={climateChange} />
        <span>
          <strong>🌡️ Klimawandel</strong>
          <span class="muted small">Jedes Jahr etwas wärmer: frühere Reife, mehr Hitze, seltener Eiswein.</span>
        </span>
      </label>

      <details>
        <summary class="small">Erweitert</summary>
        <label class="row small">Seed <input bind:value={seed} inputmode="numeric" /></label>
        <p class="muted small">Gleicher Seed, gleiche Einstellungen – gleiche Partie.</p>
      </details>
    </aside>
  </form>
</div>

<style>
  .start {
    max-width: 1100px;
    margin: 0 auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .banner {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
  }
  .banner-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 16px 28px;
    max-width: 60%;
    background: linear-gradient(90deg, rgb(43 16 28 / 0.72), rgb(43 16 28 / 0));
    color: #fff;
  }
  h1 {
    margin: 0;
    font-size: clamp(2.2rem, 6vw, 3.6rem);
    letter-spacing: -0.02em;
    line-height: 1;
    text-shadow: 0 2px 8px rgb(0 0 0 / 0.35);
  }
  h1 span {
    color: #f4c542;
  }
  .banner-text p {
    margin: 8px 0 0;
    font-size: 1rem;
    text-shadow: 0 1px 4px rgb(0 0 0 / 0.5);
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    grid-template-areas:
      'challenge settings'
      'free settings';
    grid-template-rows: auto 1fr;
    gap: 16px;
    align-items: start;
  }
  .challenge {
    grid-area: challenge;
  }
  .free {
    grid-area: free;
  }
  .settings {
    grid-area: settings;
    position: sticky;
    top: 16px;
  }
  @media (max-width: 800px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'challenge' 'settings' 'free';
      grid-template-rows: none;
    }
    .settings {
      position: static;
    }
    .banner-text {
      max-width: none;
    }
  }
  .variant {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .challenge {
    border-color: var(--wine);
  }
  .variant-head {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .variant-icon {
    font-size: 2rem;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    background: color-mix(in srgb, var(--wine) 12%, transparent);
  }
  h2 {
    font-size: 1.15rem;
    margin: 0;
  }
  h3 {
    font-size: 0.95rem;
    margin: 12px 0 4px;
  }
  .variant p {
    margin: 0;
  }
  .variant-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    align-items: center;
  }
  .seat {
    display: grid;
    grid-template-columns: auto minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.4fr) 2.2em;
    gap: 6px;
    align-items: center;
  }
  .seat > * {
    min-width: 0;
  }
  .seat-icon {
    font-size: 1.3rem;
  }
  .remove {
    padding: 6px;
  }
  @media (max-width: 560px) {
    .seat {
      grid-template-columns: auto minmax(0, 1fr) minmax(0, 1fr) 2.2em;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }
    .seat input {
      grid-column: 2 / 4;
    }
    .seat select:first-of-type {
      grid-column: 2;
    }
    .remove {
      grid-column: 4;
      grid-row: 1;
    }
  }
  .add {
    align-self: flex-start;
  }
  .settings h3:first-of-type {
    margin-top: 4px;
  }
  .settings > p {
    margin: 2px 0 0;
  }
  .lengths {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .length {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
  }
  .length.active {
    border-color: var(--wine);
    background: color-mix(in srgb, var(--wine) 10%, transparent);
  }
  .length input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .length:has(input:focus-visible) {
    outline: 2px solid var(--wine);
    outline-offset: 2px;
  }
  .length-icon {
    font-size: 1.4rem;
    width: 1.6em;
    text-align: center;
  }
  .length-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .toggle {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    cursor: pointer;
  }
  .toggle input {
    margin-top: 4px;
  }
  .toggle span {
    display: flex;
    flex-direction: column;
  }
  details {
    margin-top: 12px;
  }
  details summary {
    cursor: pointer;
  }
  details input {
    width: 9em;
  }
  .warning {
    color: var(--danger);
  }
  .primary {
    width: 100%;
    margin-top: 4px;
  }
</style>
