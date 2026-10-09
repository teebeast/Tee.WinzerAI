<script lang="ts">
  import { COMPETITIONS, MEDAL_NAMES, REGISTER_FEE } from '../engine/data/economy'
  import { qualityInfo } from '../engine/data/quality'
  import { formatEuro, MONTH_NAMES, validateAction, wineLabel } from '../engine/game'
  import { bottlePrice, monthlyDemand, upcomingCompetition, wholesalePrice } from '../engine/market'
  import type { Action, GameState, Player } from '../engine/types'

  let { game, player, run }: { game: GameState; player: Player; run: (a: Action) => void } = $props()

  let amounts = $state<Record<string, number>>({})
  const competition = $derived(upcomingCompetition(game.month))
  const totalBottles = $derived(player.bottles.reduce((sum, l) => sum + l.bottles, 0))
</script>

<section class="card">
  <h2>Flaschenlager <span class="muted small">({totalBottles.toLocaleString('de-DE')} Fl.)</span></h2>
  <p class="muted small">
    Ab Hof{player.hasOnlineShop ? ' & online' : ''} gehen etwa {monthlyDemand(player).toLocaleString('de-DE')} Flaschen
    pro Monat weg. Nächste Prämierung: {competition.name} im {MONTH_NAMES[competition.month - 1]}
    ({player.competitionEntries.length}/{competition.maxEntries} angemeldet).
  </p>
  {#if player.bottles.length === 0}
    <p class="muted">Noch nichts abgefüllt. Ausgebauten Wein im Keller abfüllen.</p>
  {/if}
  {#each player.bottles as lot (lot.id)}
    {@const amount = Math.max(1, Math.min(amounts[lot.id] ?? lot.bottles, lot.bottles))}
    {@const registerAction = { type: 'register', lotId: lot.id } as const}
    {@const registerProblem = validateAction(game, registerAction)}
    {@const wholesaleAction = { type: 'sellWholesale', lotId: lot.id, bottles: amount } as const}
    {@const wholesaleProblem = validateAction(game, wholesaleAction)}
    {@const enterAction = { type: 'enterCompetition', lotId: lot.id } as const}
    {@const enterProblem = validateAction(game, enterAction)}
    {@const entered = player.competitionEntries.includes(lot.id)}
    <div class="item">
      <div class="item-head">
        <strong>{wineLabel(lot)}</strong>
        <span class="muted">{lot.bottles.toLocaleString('de-DE')} Fl. · Güte {lot.quality}</span>
      </div>
      <div class="muted small">
        {lot.registered ? '✔ amtlich geprüft' : lot.level === 'deutscher-wein' ? 'Deutscher Wein' : 'ungeprüft – wird nur als Deutscher Wein verkauft'}
        · ab Hof {formatEuro(bottlePrice(lot, player))}/Fl.
        {#each lot.awards as award, i (i)}
          · 🏅 {MEDAL_NAMES[award.medal]} {COMPETITIONS[award.competition].name.split(' ')[0]} {award.year}
        {/each}
        {#if entered}· zur {competition.name} angemeldet{/if}
      </div>
      <div class="row">
        {#if !lot.registered && lot.level !== 'deutscher-wein'}
          <button disabled={registerProblem !== null} title={registerProblem ?? ''} onclick={() => run(registerAction)}>
            Prüfen ({formatEuro(REGISTER_FEE)}, +{qualityInfo(lot.level).apPoints} P.)
          </button>
        {/if}
        {#if lot.registered && !entered}
          <button disabled={enterProblem !== null} title={enterProblem ?? ''} onclick={() => run(enterAction)}>
            Zur Prämierung ({formatEuro(competition.fee)})
          </button>
        {/if}
        {#if lot.registered}
          <label class="row">
            <input
              type="number"
              min="1"
              max={lot.bottles}
              step="100"
              bind:value={() => amount, (v) => (amounts[lot.id] = v)}
            />
            Fl.
          </label>
          <button disabled={wholesaleProblem !== null} title={wholesaleProblem ?? ''} onclick={() => run(wholesaleAction)}>
            Großhandel (+{formatEuro(wholesalePrice(lot, player) * amount)})
          </button>
        {/if}
      </div>
    </div>
  {/each}
</section>
