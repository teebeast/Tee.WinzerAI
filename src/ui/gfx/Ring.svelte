<script lang="ts">
  /** Kreisförmige Fortschrittsanzeige mit Wert in der Mitte. */
  let { value, max = 100, text = '' }: { value: number; max?: number; text?: string } = $props()

  const R = 26
  const C = 2 * Math.PI * R
  const share = $derived(Math.max(0, Math.min(1, max > 0 ? value / max : 0)))
</script>

<svg viewBox="0 0 64 64" aria-hidden="true">
  <circle cx="32" cy="32" r={R} fill="none" stroke="var(--border)" stroke-width="7" />
  <circle
    cx="32"
    cy="32"
    r={R}
    fill="none"
    stroke="var(--wine)"
    stroke-width="7"
    stroke-linecap="round"
    stroke-dasharray="{C * share} {C}"
    transform="rotate(-90 32 32)"
  />
  <text x="32" y="37" text-anchor="middle" font-size="14" font-weight="700" fill="var(--text)">{text}</text>
</svg>

<style>
  svg {
    display: block;
    width: 56px;
    height: 56px;
    flex: none;
  }
</style>
