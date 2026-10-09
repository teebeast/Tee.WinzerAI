<script lang="ts">
  /**
   * Bild einer Parzelle: Rebzeilen am Hang, deren Aussehen Monat, Rebsorte und Zustand zeigt –
   * kahl im Winter, Austrieb im Frühjahr, Trauben im Herbst, Schnee beim Eiswein-Poker.
   */
  let {
    month,
    color,
    young = false,
    harvested = false,
    iceWine = false,
    botrytis = false,
    health = 1,
    site = 0,
  }: {
    month: number
    /** Farbe der Rebsorte, null = Brache */
    color: 'weiss' | 'rot' | null
    young?: boolean
    harvested?: boolean
    iceWine?: boolean
    botrytis?: boolean
    health?: number
    /** Lagenqualität −1 bis +2 – bessere Lagen sind steiler */
    site?: number
  } = $props()

  const winter = $derived(month === 12 || month <= 2)
  const snow = $derived(month === 1 || (iceWine && month >= 11))
  const sky = $derived(winter ? '#cfdce8' : month >= 9 ? '#cbd9e6' : '#a9d3f0')
  const ground = $derived(snow ? '#eef2f4' : color === null ? '#b48a5c' : winter ? '#a99a7c' : '#8fb36a')
  const leaf = $derived.by(() => {
    if (winter || young) return null
    if (month <= 4) return '#b6dc84'
    if (month >= 10 || harvested) return health < 0.7 ? '#a8783a' : '#d39a34'
    return health < 0.7 ? '#a7a54a' : '#4f9a3c'
  })
  const leafSize = $derived(month === 3 ? 1.5 : month === 4 ? 2.6 : 3.6)
  const grapeColor = $derived(
    botrytis ? '#8a6b45' : color === 'rot' ? '#5a1d44' : month <= 8 ? '#9fc25a' : '#d4c24a',
  )
  const showGrapes = $derived(
    color !== null && !young && !harvested && (month >= 7 || (iceWine && month <= 12)) && !(month <= 2),
  )
  /** Hangneigung: bessere Lagen sind steiler – so viel steigt der Hang über die Bildbreite an */
  const rise = $derived(4 + (site + 1) * 4)
  const slope = $derived(-rise / 200)
  const rows = [0, 1, 2, 3]
  const stocks = [0, 1, 2, 3, 4, 5, 6, 7]
</script>

<svg viewBox="0 0 200 64" aria-hidden="true">
  <rect width="200" height="64" fill={sky} />
  {#if !winter && month >= 5 && month <= 9}
    <circle cx="22" cy="9" r="5" fill="#f4c542" />
  {/if}
  <path d="M0 22 L200 {22 - rise} V64 H0 Z" fill={ground} />
  {#each rows as row (row)}
    {@const y0 = 22 + 9 + row * 10}
    <line x1="4" y1={y0 + slope * 4} x2="196" y2={y0 + slope * 196} stroke="#6b4a2f" stroke-width="0.8" opacity="0.7" />
    {#if color === null}
      {#each stocks as i (i)}
        {#if (i + row) % 3 === 0}
          {@const x = 12 + i * 24 + row * 4}
          <circle cx={x} cy={y0 - 1 + slope * x} r="1.6" fill="#7aa04c" />
        {/if}
      {/each}
    {:else}
      {#each stocks as i (i)}
        {@const x = 12 + i * 24 + row * 4}
        {@const y = y0 + slope * x}
        <line x1={x} y1={y} x2={x} y2={y - (young ? 4 : 9)} stroke="#5b3d24" stroke-width={young ? 0.9 : 1.4} />
        {#if winter && !young}
          <path d="M{x} {y - 8} l-4 -3 M{x} {y - 8} l4 -3" stroke="#5b3d24" stroke-width="0.8" fill="none" />
        {/if}
        {#if young && !winter}
          <circle cx={x} cy={y - 5} r="1.6" fill="#9bcf6a" />
        {/if}
        {#if leaf}
          <circle cx={x - 2} cy={y - 10} r={leafSize} fill={leaf} />
          <circle cx={x + 2.5} cy={y - 11} r={leafSize * 0.85} fill={leaf} />
        {/if}
        {#if showGrapes && (i + row) % 2 === 0}
          <g fill={grapeColor}>
            <circle cx={x + 1} cy={y - 6} r="1.6" />
            <circle cx={x - 0.8} cy={y - 5.4} r="1.4" />
            <circle cx={x + 0.2} cy={y - 4} r="1.3" />
          </g>
        {/if}
        {#if snow}
          <circle cx={x - 1} cy={y - 12} r="1.4" fill="#ffffff" opacity="0.9" />
        {/if}
      {/each}
    {/if}
  {/each}
</svg>

<style>
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
</style>
