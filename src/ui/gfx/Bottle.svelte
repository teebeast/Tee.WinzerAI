<script lang="ts">
  /** Weinflasche – Sekt mit Folie und Perlen, Rotwein dunkel, Weißwein grünlich. */
  let {
    color,
    sparkling = false,
    label = '',
  }: { color: 'weiss' | 'rot'; sparkling?: boolean; label?: string } = $props()

  const glass = $derived(color === 'rot' ? '#3d1a2a' : '#6f8a3e')
  const wine = $derived(color === 'rot' ? '#6d1838' : '#e6d36a')
</script>

<svg viewBox="0 0 40 100" aria-hidden="true">
  {#if sparkling}
    <path d="M15 2 h10 v20 h-10 Z" fill="#d6b24a" />
  {:else}
    <rect x="15.5" y="2" width="9" height="6" rx="1" fill="#7b2346" />
  {/if}
  <path d="M16 8 h8 v18 q0 8 8 14 v54 q0 4 -4 4 h-16 q-4 0 -4 -4 v-54 q8 -6 8 -14 Z" fill={glass} />
  <path d="M10 56 h20 v36 q0 2 -2 2 h-16 q-2 0 -2 -2 Z" fill={wine} opacity="0.35" />
  <rect x="10" y="50" width="20" height="26" rx="1.5" fill="#f6efe2" />
  <text x="20" y="66" text-anchor="middle" font-size="9" font-weight="700" fill="#7b2346">{label}</text>
  {#if sparkling}
    <g fill="#ffffff" opacity="0.7">
      <circle cx="14" cy="86" r="1.2" />
      <circle cx="22" cy="82" r="1" />
      <circle cx="26" cy="88" r="1.3" />
    </g>
  {/if}
  <path d="M12 42 q2 -3 5 -4 v40 h-5 Z" fill="#ffffff" opacity="0.12" />
</svg>

<style>
  svg {
    display: block;
    width: 34px;
    height: 85px;
    flex: none;
  }
</style>
