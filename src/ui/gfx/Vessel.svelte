<script lang="ts">
  /**
   * Edelstahltank oder Barriquefass. Der Füllstand zeigt, wie weit der Wein ausgebaut ist:
   * voll = bereit zum Abfüllen.
   */
  let {
    color,
    progress,
    barrique = false,
  }: { color: 'weiss' | 'rot'; progress: number; barrique?: boolean } = $props()

  const wine = $derived(color === 'rot' ? '#7b1f45' : '#e2c94e')
  const level = $derived(Math.max(0.08, Math.min(1, progress)))
</script>

{#if barrique}
  <svg viewBox="0 0 60 80" aria-hidden="true">
    <defs>
      <clipPath id="barrel">
        <path d="M8 18 Q4 40 8 62 Q30 70 52 62 Q56 40 52 18 Q30 10 8 18 Z" />
      </clipPath>
    </defs>
    <path d="M8 18 Q4 40 8 62 Q30 70 52 62 Q56 40 52 18 Q30 10 8 18 Z" fill="#a8683a" />
    <rect x="0" y={66 - 52 * level} width="60" height="80" fill={wine} opacity="0.55" clip-path="url(#barrel)" />
    <g stroke="#5b3a20" stroke-width="2" fill="none">
      <path d="M7 26 Q30 19 53 26" />
      <path d="M7 54 Q30 61 53 54" />
    </g>
    <g stroke="#6e4527" stroke-width="0.6" opacity="0.6">
      <line x1="20" y1="14" x2="18" y2="66" />
      <line x1="30" y1="13" x2="30" y2="67" />
      <line x1="40" y1="14" x2="42" y2="66" />
    </g>
  </svg>
{:else}
  <svg viewBox="0 0 60 80" aria-hidden="true">
    <rect x="14" y="8" width="32" height="62" rx="10" fill="#c9d1d8" />
    <rect x="18" y={14 + 50 * (1 - level)} width="24" height={50 * level} rx="4" fill={wine} />
    <rect x="18" y="14" width="24" height="50" rx="4" fill="none" stroke="#8d99a4" stroke-width="1" />
    <rect x="20" y="16" width="4" height="46" rx="2" fill="#ffffff" opacity="0.35" />
    <line x1="18" y1="70" x2="16" y2="78" stroke="#8d99a4" stroke-width="2" />
    <line x1="42" y1="70" x2="44" y2="78" stroke="#8d99a4" stroke-width="2" />
  </svg>
{/if}

<style>
  svg {
    display: block;
    width: 48px;
    height: 64px;
    flex: none;
  }
</style>
