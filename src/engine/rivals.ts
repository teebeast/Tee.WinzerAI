/**
 * Lebendige Gegner: Computergegner merken sich, wie andere Weingüter mit ihnen umgehen. Freundliche Nachbarn
 * bieten Kooperationen an (siehe decisions.ts), verstimmte starten Rabattaktionen oder beschweren sich öffentlich,
 * und das Schlitzohr sabotiert seinen Erzfeind. Mit der Zeit beruhigen sich die Gemüter.
 */
import { addEffect } from './events'
import { nextFloat } from './rng'
import { changeReputation } from './rules'
import type { GameState, Player } from './types'
import { addLog } from './util'

/** Anteil des Verhältnisses, der jeden Monat erhalten bleibt – der Rest verblasst */
const RELATION_MEMORY = 0.95
const PRICE_WAR_RELATION = -30
const PRICE_WAR_CHANCE = 0.05
const COMPLAINT_RELATION = -60
const COMPLAINT_CHANCE = 0.04
const COMPLAINT_REPUTATION = 3
export const REVENGE_RELATION = -40

export const relation = (ai: Player, otherId: string) => ai.relations[otherId] ?? 0

/** Ändert das Verhältnis eines Computergegners zu einem anderen Weingut. Menschen führen keine Liste. */
export function adjustRelation(ai: Player, otherId: string, delta: number) {
  if (ai.ai === null || ai.id === otherId) return
  ai.relations[otherId] = Math.max(-100, Math.min(100, Math.round((relation(ai, otherId) + delta) * 10) / 10))
}

/** Alle Computergegner eines Gebiets reagieren auf dasselbe Ereignis */
export function adjustRegionRelations(state: GameState, regionId: string, otherId: string, delta: number) {
  for (const ai of state.players) if (ai.ai !== null && !ai.bankrupt && ai.regionId === regionId) adjustRelation(ai, otherId, delta)
}

export function relationLabel(value: number): { icon: string; text: string } {
  if (value >= 40) return { icon: '😊', text: 'befreundet' }
  if (value >= 10) return { icon: '🙂', text: 'freundlich' }
  if (value > -10) return { icon: '😐', text: 'neutral' }
  if (value > PRICE_WAR_RELATION - 10) return { icon: '😒', text: 'verstimmt' }
  return { icon: '😠', text: 'verfeindet' }
}

/** Der Gegner, den ein Computergegner am wenigsten leiden kann – sofern es so schlimm ist */
export function archEnemy(state: GameState, ai: Player, threshold = REVENGE_RELATION): Player | undefined {
  return state.players
    .filter((p) => p.id !== ai.id && !p.bankrupt && relation(ai, p.id) <= threshold)
    .sort((a, b) => relation(ai, a.id) - relation(ai, b.id))[0]
}

/** Monatsende: Groll verblasst, verstimmte Nachbarn werden aktiv. */
export function monthlyRivalry(state: GameState) {
  for (const ai of state.players.filter((p) => p.ai !== null && !p.bankrupt)) {
    for (const other of state.players.filter((p) => p.id !== ai.id && !p.bankrupt)) {
      const value = relation(ai, other.id)
      if (value === 0) continue
      ai.relations[other.id] = Math.abs(value) < 1 ? 0 : Math.round(value * RELATION_MEMORY * 10) / 10

      const sameRegion = other.regionId === ai.regionId
      const priceWarRunning = other.effects.some((e) => e.label === priceWarLabel(ai))
      if (sameRegion && value <= PRICE_WAR_RELATION && !priceWarRunning && nextFloat(state.rng) < PRICE_WAR_CHANCE) {
        addEffect(other, 'demand', 0.85, 3, priceWarLabel(ai))
        addLog(state, null, `${ai.name} startet eine Rabattaktion gegen ${other.name}: drei Monate 15 % weniger Kundschaft ab Hof.`, 'bad')
      }
      if (value <= COMPLAINT_RELATION && nextFloat(state.rng) < COMPLAINT_CHANCE) {
        changeReputation(other, -COMPLAINT_REPUTATION)
        addLog(state, null, `${ai.name} beschwert sich öffentlich über ${other.name} (Bekanntheit −${COMPLAINT_REPUTATION}).`, 'bad')
      }
    }
  }
}

const priceWarLabel = (ai: Player) => `Rabattaktion von ${ai.name}`
