import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS } from './data/regions'
import { nextFloat } from './rng'
import { changeReputation } from './rules'
import type { GameState, Player } from './types'
import { addLog, newId } from './util'

const CRISIS_CHANCE = 0.015
const CRISIS_MONTHS = 6
const MEDIA_CHANCE = 0.02
const MEDIA_REPUTATION = 5
const INHERITANCE_CHANCE = 0.004

/** Ereignisse für alle: Krise der Großkellereien halbiert den Fassweinpreis für ein halbes Jahr. */
export function marketEvents(state: GameState) {
  if (state.bulkCrisisMonths > 0) {
    if (--state.bulkCrisisMonths === 0) addLog(state, null, 'Die Großkellereien zahlen wieder normale Fassweinpreise.')
    return
  }
  if (nextFloat(state.rng) < CRISIS_CHANCE) {
    state.bulkCrisisMonths = CRISIS_MONTHS
    addLog(state, null, `Eine Großkellerei ist pleite: ${CRISIS_MONTHS} Monate lang gibt es nur den halben Fassweinpreis.`)
  }
}

/** Glücksfälle einzelner Weingüter */
export function estateEvents(state: GameState, player: Player) {
  if (nextFloat(state.rng) < MEDIA_CHANCE) {
    const gain = changeReputation(player, MEDIA_REPUTATION)
    addLog(state, player.id, `Ein Weinmagazin berichtet begeistert über dein Weingut (Bekanntheit +${gain.toFixed(1)}).`)
  }
  if (nextFloat(state.rng) < INHERITANCE_CHANCE) {
    const hectares = 1 + Math.floor(nextFloat(state.rng) * 2)
    const suitable = (Object.keys(GRAPES) as GrapeId[]).filter((g) => REGIONS[player.regionId].suitability[g] >= 0)
    const planted = nextFloat(state.rng) < 0.5
    const grape = planted ? suitable[Math.floor(nextFloat(state.rng) * suitable.length)] : null
    const taken = new Set(player.plots.map((p) => p.name))
    let name = 'Erbstück'
    for (let n = 2; taken.has(name); n++) name = `Erbstück ${n}`
    player.plots.push({
      id: newId(state, 'plot'),
      name,
      hectares,
      grape,
      plantedYear: grape ? state.year - 20 : null,
      site: 0,
      oechsle: 0,
      health: 1,
      cropFactor: 1,
      harvestedThisYear: false,
      botrytis: false,
      iceWineGamble: false,
    })
    addLog(
      state,
      null,
      `${player.name} erbt einen Weinberg: ${hectares} ha ${grape ? GRAPES[grape].name : 'Brache'}.`,
    )
  }
}
