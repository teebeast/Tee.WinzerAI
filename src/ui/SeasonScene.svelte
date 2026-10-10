<script lang="ts">
  import type { WeatherKind } from '../engine/weather'

  /**
   * Panorama des Weinguts: Himmel, Hügel und Rebzeilen wechseln mit Jahreszeit und Wetter,
   * das Gutshaus wächst mit den Investitionen (Vinothek, Barriquekeller).
   */
  let {
    month,
    weather,
    vinothek = false,
    barrique = false,
    height = 150,
  }: { month: number; weather: WeatherKind | null; vinothek?: boolean; barrique?: boolean; height?: number } = $props()

  const season = $derived(
    month <= 2 || month === 12 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn',
  )
  const seasonName = $derived(
    season === 'winter' ? 'Winter' : season === 'spring' ? 'Frühling' : season === 'summer' ? 'Sommer' : 'Herbst',
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
  const hillFar = $derived(season === 'winter' ? '#e8ece8' : season === 'autumn' ? '#b5a65a' : '#8bb36a')
  const hillNear = $derived(season === 'winter' ? '#dfe5df' : season === 'autumn' ? '#9c8a45' : '#6f9a50')
  const showGrapes = $derived(month >= 7 && month <= 10)
  const rows = [0, 1, 2, 3, 4, 5]
  const stocks = Array.from({ length: 16 }, (_, i) => i)
</script>

<svg style:height="{height}px" viewBox="0 0 600 150" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Weingut im {seasonName}">
  <rect width="600" height="150" fill={sky} />
  {#if weather === 'sonnig' || weather === null}
    <circle cx="520" cy="34" r="16" fill="#f4c542" />
  {:else}
    <g fill="#eef2f5" opacity="0.92">
      <ellipse cx="490" cy="34" rx="34" ry="12" />
      <ellipse cx="520" cy="26" rx="22" ry="13" />
      <ellipse cx="300" cy="22" rx="26" ry="8" />
    </g>
  {/if}
  {#if weather === 'nass'}
    <g stroke="#5e7d9a" stroke-width="1.5">
      {#each [462, 478, 494, 510, 526, 542] as x (x)}
        <line x1={x} y1="48" x2={x - 5} y2="62" />
      {/each}
    </g>
  {/if}
  {#if season === 'winter'}
    <g fill="#ffffff" opacity="0.8">
      {#each [40, 120, 210, 330, 410, 560] as x, i (x)}
        <circle cx={x} cy={20 + (i % 3) * 18} r="1.8" />
      {/each}
    </g>
  {/if}

  <path d="M0 82 Q150 40 300 70 T600 60 V150 H0 Z" fill={hillFar} />

  <!-- Gutshaus -->
  <g transform="translate(372 58)">
    <rect x="0" y="22" width="70" height="40" fill="#f3e6cf" />
    <path d="M-6 24 L35 0 L76 24 Z" fill="#9b3b2c" />
    <rect x="28" y="40" width="14" height="22" fill="#6b4a2f" />
    <rect x="8" y="32" width="12" height="10" fill="#8fb2c9" />
    <rect x="50" y="32" width="12" height="10" fill="#8fb2c9" />
    {#if vinothek}
      <rect x="72" y="34" width="44" height="28" fill="#e8d4b0" />
      <path d="M70 36 L94 22 L118 36 Z" fill="#7b2346" />
      <rect x="78" y="42" width="32" height="12" fill="#8fb2c9" />
      <text x="94" y="31" text-anchor="middle" font-size="6" fill="#ffffff" font-weight="700">VINOTHEK</text>
    {/if}
    {#if barrique}
      <g fill="#a8683a" stroke="#5b3a20" stroke-width="1">
        <ellipse cx="-14" cy="56" rx="9" ry="7" />
        <ellipse cx="-30" cy="56" rx="9" ry="7" />
        <ellipse cx="-22" cy="45" rx="9" ry="7" />
      </g>
    {/if}
  </g>

  <path d="M0 104 Q160 72 330 96 T600 92 V150 H0 Z" fill={hillNear} />
  {#each rows as row (row)}
    {@const y = 108 + row * 7}
    <line x1={10 + row * 8} y1={y} x2={330 - row * 6} y2={y - 14} stroke="#6b4a2f" stroke-width="1" />
    {#each stocks as i (i)}
      {@const x = 18 + row * 8 + i * 23}
      {@const vy = y - ((x - 10) / 320) * 14}
      {#if x < 330 - row * 6}
        <line x1={x} y1={vy} x2={x} y2={vy - 6} stroke="#5b3d24" stroke-width="1.2" />
        <circle cx={x} cy={vy - 7} r="3.6" fill={leaves[season]} />
        {#if showGrapes && (i + row) % 2 === 0}
          <circle cx={x + 1.5} cy={vy - 4} r="1.8" fill="#6d2a5e" />
        {/if}
      {/if}
    {/each}
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    border-radius: 12px;
  }
</style>
