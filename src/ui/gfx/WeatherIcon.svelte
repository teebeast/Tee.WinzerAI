<script lang="ts">
  import type { WeatherKind } from '../../engine/weather'

  let { kind }: { kind: WeatherKind } = $props()
</script>

<svg viewBox="0 0 48 48" aria-hidden="true">
  {#if kind === 'sonnig'}
    <g stroke="#e9a92c" stroke-width="3" stroke-linecap="round">
      {#each [0, 45, 90, 135, 180, 225, 270, 315] as angle (angle)}
        <line x1="24" y1="5" x2="24" y2="10" transform="rotate({angle} 24 24)" />
      {/each}
    </g>
    <circle cx="24" cy="24" r="10" fill="#f4c542" />
  {:else if kind === 'wechselhaft'}
    <circle cx="30" cy="17" r="9" fill="#f4c542" />
    <path d="M10 36 a8 8 0 0 1 3 -15 a10 10 0 0 1 19 3 a6 6 0 0 1 2 12 Z" fill="#b8c3cc" />
  {:else}
    <path d="M9 28 a8 8 0 0 1 3 -15 a10 10 0 0 1 19 3 a6 6 0 0 1 2 12 Z" fill="#8f9ca8" />
    <g stroke="#4a7fb5" stroke-width="2.5" stroke-linecap="round">
      <line x1="15" y1="33" x2="13" y2="40" />
      <line x1="23" y1="33" x2="21" y2="40" />
      <line x1="31" y1="33" x2="29" y2="40" />
    </g>
  {/if}
</svg>

<style>
  svg {
    display: block;
    width: 44px;
    height: 44px;
  }
</style>
