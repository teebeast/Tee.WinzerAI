<script lang="ts">
  import { onMount } from 'svelte'
  import { AI_ESTATE_NAMES, AI_PROFILES } from '../engine/ai'
  import { dailyChallenge, todayKey } from '../engine/challenge'
  import { DIFFICULTIES } from '../engine/data/economy'
  import { REGIONS, type RegionId } from '../engine/data/regions'
  import { MONTH_NAMES, NO_POINT_TARGET } from '../engine/game'
  import type { AiProfileId, Difficulty, NewGameOptions } from '../engine/types'
  import { deleteSave, listSaves, loadChallengeBest, saveLocation, type SaveSlot } from '../save'
  import LicensesDialog from './LicensesDialog.svelte'
  import SeasonScene from './SeasonScene.svelte'

  let { onStart, onLoad }: { onStart: (options: NewGameOptions) => void; onLoad: (slot: SaveSlot) => void } = $props()

  type Kind = 'human' | AiProfileId
  interface Seat {
    name: string
    regionId: RegionId
    kind: Kind
  }
  type Length = 300 | 600 | 1000 | 'endless'

  const regionIds = Object.keys(REGIONS) as RegionId[]
  const profileIds = Object.keys(AI_PROFILES) as AiProfileId[]
  const difficultyIds = Object.keys(DIFFICULTIES) as Difficulty[]
  const LENGTHS: { value: Length; icon: string; name: string; text: string }[] = [
    { value: 300, icon: '⏱️', name: 'Kurz', text: '300 Punkte' },
    { value: 600, icon: '🍷', name: 'Normal', text: '600 Punkte' },
    { value: 1000, icon: '🏆', name: 'Klassisch', text: '1000 Punkte' },
    { value: 'endless', icon: '∞', name: 'Endlos', text: 'ohne Punkteziel' },
  ]
  /** Stufen des Schiebereglers fürs Endlosspiel; null = ohne Zeitlimit */
  const ENDLESS_YEARS = [5, 10, 25, 50, null]

  let seats = $state<Seat[]>([
    { name: 'Spieler 1', regionId: 'mosel', kind: 'human' },
    { name: AI_ESTATE_NAMES.tradition, regionId: 'mosel', kind: 'tradition' },
  ])
  let length = $state<Length>(600)
  let endlessStep = $state(ENDLESS_YEARS.length - 1)
  let difficulty = $state<Difficulty>('normal')
  let climateChange = $state(true)
  let randomEvents = $state(true)
  const today = todayKey()
  const daily = dailyChallenge(today)
  const challengeBest = loadChallengeBest(today)
  let seed = $state(String(Math.floor(Math.random() * 1_000_000)))
  const hasHuman = $derived(seats.some((s) => s.kind === 'human'))
  const endlessYears = $derived(ENDLESS_YEARS[endlessStep])

  // raw: Die geladenen Spielstände gehen unverändert an die Engine, die sie per structuredClone kopiert.
  let licensesOpen = $state(false)
  let saves = $state.raw<SaveSlot[] | null>(null)
  let saveDir = $state<string | null>(null)

  onMount(() => {
    listSaves().then((list) => (saves = list))
    saveLocation().then((path) => (saveDir = path))
  })

  function addSeat() {
    const used = new Set(seats.map((s) => s.kind))
    const kind = profileIds.find((p) => !used.has(p)) ?? 'tradition'
    seats.push({ name: AI_ESTATE_NAMES[kind], regionId: seats[0].regionId, kind })
  }

  function changeKind(seat: Seat, kind: Kind) {
    const wasDefaultName = seat.kind === 'human' ? /^Spieler \d+$/.test(seat.name) : seat.name === AI_ESTATE_NAMES[seat.kind]
    seat.kind = kind
    if (wasDefaultName) seat.name = kind === 'human' ? `Spieler ${seats.indexOf(seat) + 1}` : AI_ESTATE_NAMES[kind]
  }

  function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!hasHuman) return
    onStart({
      seed: Number(seed) || 0,
      targetPoints: length === 'endless' ? NO_POINT_TARGET : length,
      yearLimit: length === 'endless' ? endlessYears : null,
      climateChange,
      randomEvents,
      difficulty,
      players: seats.map((s, i) => ({
        name: s.name.trim() || `Spieler ${i + 1}`,
        regionId: s.regionId,
        ai: s.kind === 'human' ? null : s.kind,
      })),
    })
  }

  async function remove(slot: SaveSlot) {
    if (!confirm(`Spielstand „${slotTitle(slot)}“ wirklich löschen?`)) return
    await deleteSave(slot.id)
    saves = saves!.filter((s) => s.id !== slot.id)
  }

  function slotTitle(slot: SaveSlot): string {
    return slot.state.players
      .filter((p) => p.ai === null)
      .map((p) => p.name)
      .join(' & ')
  }

  function slotIcon(slot: SaveSlot): string {
    if (slot.state.challenge) return '🎯'
    return slot.state.targetPoints === NO_POINT_TARGET ? '∞' : '🍇'
  }

  function slotDetail(slot: SaveSlot): string {
    const { state } = slot
    const human = state.players.find((p) => p.ai === null)!
    const when = `${MONTH_NAMES[state.month - 1]}, Jahr ${state.year}${state.yearLimit ? ` von ${state.yearLimit}` : ''}`
    const mode = state.challenge ? `Tages-Challenge ${state.challenge}` : DIFFICULTIES[state.difficulty].name
    const over = state.finished || state.winnerId ? ' · beendet' : ''
    return `${REGIONS[human.regionId].name} · ${when} · 🏆 ${human.points} · ${mode}${over}`
  }

  function savedAtText(savedAt: number): string {
    const date = new Date(savedAt)
    const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    return todayKey(date) === today ? `heute, ${time}` : `${date.toLocaleDateString('de-DE')}, ${time}`
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

  <div class="top">
    <section class="card variant challenge">
      <div class="variant-head">
        <span class="variant-icon" aria-hidden="true">🎯</span>
        <div>
          <h2>Tages-Challenge</h2>
          <span class="muted small">{today} · für alle dieselbe Partie</span>
        </div>
      </div>
      <h3 class="scenario">{daily.scenario.icon} {daily.scenario.name}</h3>
      <p>{daily.scenario.description}</p>
      <div class="chips">
        <span class="chip">📍 {REGIONS[daily.options.players[0].regionId].name}</span>
        <span class="chip">📅 {daily.scenario.years} Jahre</span>
        <span class="chip">🤖 {daily.options.players.slice(1).map((p) => p.name).join(', ')}</span>
        {#if !daily.scenario.climateChange}<span class="chip">🌡️ ohne Klimawandel</span>{/if}
      </div>
      <div class="variant-foot">
        <span class="chip">{challengeBest !== null ? `🏅 Dein Bestwert heute: ${challengeBest} Punkte` : 'Noch nicht gespielt'}</span>
        <button type="button" onclick={() => onStart(daily.options)}>Challenge starten</button>
      </div>
    </section>

    <section class="card variant saves" aria-label="Spielstand laden">
      <div class="variant-head">
        <span class="variant-icon" aria-hidden="true">💾</span>
        <div>
          <h2>Spielstand laden</h2>
          <span class="muted small">Jede Partie wird nach jedem Zug automatisch gespeichert</span>
        </div>
      </div>
      {#if saves === null}
        <p class="muted small">Spielstände werden gelesen …</p>
      {:else if saves.length === 0}
        <p class="muted">Noch keine Spielstände vorhanden. Starte ein Spiel – es erscheint dann hier.</p>
      {:else}
        <ul class="slots">
          {#each saves as slot (slot.id)}
            <li class="slot">
              <span class="slot-icon" aria-hidden="true">{slotIcon(slot)}</span>
              <span class="slot-text">
                <strong>{slotTitle(slot)}</strong>
                <span class="muted small">{slotDetail(slot)}</span>
                <span class="muted small">Gespeichert {savedAtText(slot.savedAt)}</span>
              </span>
              <button type="button" onclick={() => onLoad(slot)}>Laden</button>
              <button type="button" class="ghost remove" onclick={() => remove(slot)} aria-label="Spielstand löschen">🗑</button>
            </li>
          {/each}
        </ul>
      {/if}
      {#if saveDir}
        <p class="muted small location" title={saveDir}>Ablage: {saveDir}</p>
      {/if}
    </section>
  </div>

  <form class="layout" onsubmit={submit}>
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

      <h3>Schwierigkeitsgrad</h3>
      <div class="options three" role="radiogroup" aria-label="Schwierigkeitsgrad">
        {#each difficultyIds as id (id)}
          <label class="option compact" class:active={difficulty === id}>
            <input type="radio" name="difficulty" bind:group={difficulty} value={id} />
            <span class="option-icon" aria-hidden="true">{DIFFICULTIES[id].icon}</span>
            <strong>{DIFFICULTIES[id].name}</strong>
          </label>
        {/each}
      </div>
      <p class="muted small">{DIFFICULTIES[difficulty].description}. Die Computergegner spielen immer gleich stark.</p>

      <h3>Spiellänge</h3>
      <div class="options" role="radiogroup" aria-label="Spiellänge">
        {#each LENGTHS as option (option.value)}
          <label class="option" class:active={length === option.value}>
            <input type="radio" name="length" bind:group={length} value={option.value} />
            <span class="option-icon" aria-hidden="true">{option.icon}</span>
            <span class="option-text">
              <strong>{option.name}</strong>
              <span class="muted small">{option.text}</span>
            </span>
          </label>
        {/each}
      </div>
      {#if length === 'endless'}
        <label class="slider">
          <span class="small">Spieldauer: <strong>{endlessYears ? `${endlessYears} Jahre` : 'endlos'}</strong></span>
          <input
            type="range"
            min="0"
            max={ENDLESS_YEARS.length - 1}
            step="1"
            bind:value={endlessStep}
            aria-label="Spieljahre"
            aria-valuetext={endlessYears ? `${endlessYears} Jahre` : 'endlos'}
          />
          <span class="ticks muted small" aria-hidden="true">
            {#each ENDLESS_YEARS as years, i (i)}<span>{years ?? '∞'}</span>{/each}
          </span>
        </label>
        <p class="muted small">
          {#if endlessYears}
            Nach {endlessYears} Jahren endet das Spiel, wer dann die meisten Punkte hat, gewinnt.
          {:else}
            Das Endlosspiel läuft, bis du es beendest oder pleitegehst. Die Rangliste zeigt jederzeit den Stand.
          {/if}
        </p>
      {/if}

      <h3>Welt</h3>
      <label class="toggle">
        <input type="checkbox" bind:checked={climateChange} />
        <span>
          <strong>🌡️ Klimawandel</strong>
          <span class="muted small">Jedes Jahr etwas wärmer: frühere Reife, mehr Hitze, seltener Eiswein.</span>
        </span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={randomEvents} />
        <span>
          <strong>🎲 Zufallsereignisse</strong>
          <span class="muted small">Glücksfälle und Rückschläge – von der Wandergruppe bis zum Kellerbrand.</span>
        </span>
      </label>

      <details>
        <summary class="small">Erweitert</summary>
        <label class="row small">Seed <input bind:value={seed} inputmode="numeric" /></label>
        <p class="muted small">Gleicher Seed, gleiche Einstellungen – gleiche Partie.</p>
      </details>
    </aside>
  </form>

  <footer class="credits small muted">
    Alle Weingüter, Personen, Siegel und Prämierungen sind frei erfunden.
    <button type="button" class="link" onclick={() => (licensesOpen = true)}>Lizenzen</button>
  </footer>
</div>

<LicensesDialog bind:open={licensesOpen} />

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
  .top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
    align-items: stretch;
  }
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    grid-template-areas: 'free settings';
    gap: 16px;
    align-items: start;
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
    .top {
      grid-template-columns: minmax(0, 1fr);
    }
    .layout {
      grid-template-columns: minmax(0, 1fr);
      grid-template-areas: 'settings' 'free';
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
    flex: none;
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
  .scenario {
    margin: 4px 0 0;
    font-size: 1.05rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .variant-foot {
    margin-top: auto;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: space-between;
    align-items: center;
  }
  .slots {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 260px;
    overflow-y: auto;
  }
  .slot {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .slot-icon {
    font-size: 1.3rem;
    width: 1.6em;
    text-align: center;
  }
  .slot-text {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    min-width: 0;
  }
  .slot-text > * {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .location {
    margin-top: auto;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
    .seat .remove {
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
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .options.three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
  }
  .option.compact {
    flex-direction: column;
    gap: 2px;
    padding: 6px 4px;
    text-align: center;
    font-size: 0.9rem;
  }
  .option.active {
    border-color: var(--wine);
    background: color-mix(in srgb, var(--wine) 10%, transparent);
  }
  .option input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .option:has(input:focus-visible) {
    outline: 2px solid var(--wine);
    outline-offset: 2px;
  }
  .option-icon {
    font-size: 1.4rem;
    width: 1.6em;
    text-align: center;
  }
  .option-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .slider {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin-top: 10px;
  }
  .slider input {
    width: 100%;
    accent-color: var(--wine);
  }
  .ticks {
    display: flex;
    justify-content: space-between;
    padding: 0 2px;
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
  .credits {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .link {
    padding: 0;
    border: none;
    background: none;
    color: var(--wine);
    text-decoration: underline;
    font-weight: normal;
  }
  .primary {
    width: 100%;
    margin-top: 4px;
  }
</style>
