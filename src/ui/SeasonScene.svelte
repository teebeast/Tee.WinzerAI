<script lang="ts">
  import type { WeatherKind } from '../engine/weather'

  /** Kleine Landschaft im Kopf: Himmel, Hügel und Rebzeilen wechseln mit Jahreszeit und Wetter. */
  let { month, weather }: { month: number; weather: WeatherKind | null } = $props()

  const season = $derived(
    month <= 2 || month === 12 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn',
  )
  const leaves: Record<string, string> = {
    winter: 'transparent',
    spring: '#9bcf6a',
    summer: '#4f9a3c',
    autumn: '#d79b2e',
  }
  const sky = $derived(
    weather === 'nass' ? '#9aa8b5' : season === 'winter' ? '#c9d8e6' : weather === 'sonnig' ? '#8fc7ef' : '#b5cbe0',
  )
  const showGrapes = $derived(month >= 7 && month <= 11)
  const rows = [0, 1, 2, 3, 4]
</script>

<svg viewBox="0 0 240 64" role="img" aria-label="Weinberg im {season === 'winter' ? 'Winter' : season === 'spring' ? 'Frühling' : season === 'summer' ? 'Sommer' : 'Herbst'}">
  <rect width="240" height="64" fill={sky} />
  {#if weather === 'sonnig' || weather === null}
    <circle cx="206" cy="16" r="9" fill="#f4c542" />
  {:else}
    <g fill="#eef2f5" opacity="0.9">
      <ellipse cx="190" cy="16" rx="18" ry="7" />
      <ellipse cx="206" cy="12" rx="12" ry="7" />
    </g>
  {/if}
  {#if weather === 'nass'}
    <g stroke="#5e7d9a" stroke-width="1">
      {#each [176, 186, 196, 206, 216] as x (x)}
        <line x1={x} y1="24" x2={x - 3} y2="32" />
      {/each}
    </g>
  {/if}
  <path d="M0 40 Q60 18 120 34 T240 30 V64 H0 Z" fill={season === 'winter' ? '#e8ece8' : '#8bb36a'} />
  <path d="M0 50 Q80 34 160 46 T240 44 V64 H0 Z" fill={season === 'winter' ? '#dfe5df' : '#6f9a50'} />
  {#each rows as row (row)}
    {@const y = 44 + row * 4}
    <line x1={12 + row * 6} y1={y} x2={150 - row * 4} y2={y - 6} stroke="#6b4a2f" stroke-width="1" />
    {#each Array.from({ length: 9 }, (_, i) => i) as i (i)}
      {@const x = 18 + row * 6 + i * 14}
      {@const vy = y - ((x - 12) / 140) * 6}
      <circle cx={x} cy={vy - 2} r="2.4" fill={leaves[season]} />
      {#if showGrapes && (i + row) % 2 === 0}
        <circle cx={x + 1} cy={vy} r="1.2" fill="#6d2a5e" />
      {/if}
    {/each}
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    max-width: 240px;
    height: auto;
    border-radius: 8px;
  }
</style>
