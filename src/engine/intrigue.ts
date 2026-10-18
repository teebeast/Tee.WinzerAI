import {
  ADULTERATION,
  CONTROL_CHANCE,
  SABOTAGE,
  SABOTAGE_DETECTION,
  SABOTAGE_FINE,
  SABOTAGE_REPUTATION,
  SABOTAGE_RUMOR_REPUTATION,
  SABOTAGE_VINEYARD_LOSS,
  SCANDAL_FINE,
  SCANDAL_POINTS,
  SCANDAL_REPUTATION,
} from './data/economy'
import { nextFloat } from './rng'
import { changeReputation, plotAgeFactor, raiseLevel, wineLabel } from './rules'
import type { AdulterationMethod, BottleLot, GameState, Player, SabotageKind } from './types'
import { addLog, formatEuro } from './util'
import { loseBio } from './bio'
import { adjustRegionRelations, adjustRelation } from './rivals'

export function validateAdulterate(player: Player, batchId: string, method: AdulterationMethod): string | null {
  const batch = player.cellar.find((b) => b.id === batchId)
  if (!batch) return 'Unbekannte Charge.'
  if (player.intrigueThisMonth) return 'Für diesen Monat hast du schon genug riskiert.'
  if (batch.adulterated) return 'An diesem Wein wurde schon gedreht.'
  if (ADULTERATION[method].levelSteps > 0 && raiseLevel(batch.level, 1) === batch.level) {
    return 'Höher geht es mit dieser Stufe nicht.'
  }
  if (batch.level === 'eiswein' && ADULTERATION[method].levelSteps > 0) return 'Eiswein lässt sich nicht weiter aufwerten.'
  return null
}

/** Heimliche Kellertricks: mehr Menge oder eine höhere Stufe – mit Entdeckungsrisiko */
export function adulterate(state: GameState, player: Player, batchId: string, method: AdulterationMethod) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const info = ADULTERATION[method]
  const before = wineLabel(batch)
  batch.hectoliters = Math.round(batch.hectoliters * info.volumeFactor)
  batch.quality = Math.max(0, batch.quality + info.qualityDelta)
  batch.level = raiseLevel(batch.level, info.levelSteps)
  batch.adulterated = method
  player.intrigueThisMonth = true
  addLog(state, player.id, `Heimlich im Keller: ${info.name} bei ${before}. Hoffentlich merkt es niemand …`)
}

/** Bei der amtlichen Prüfung fliegt Gepanschtes womöglich auf. Liefert true bei Entdeckung. */
export function inspectAtRegistration(state: GameState, player: Player, lot: BottleLot): boolean {
  if (!lot.adulterated) return false
  if (nextFloat(state.rng) >= ADULTERATION[lot.adulterated].detection) return false
  scandal(state, player, 'bei der amtlichen Prüfung')
  return true
}

/** Unangemeldete Kontrolle der Weinaufsicht, solange gepanschter Wein im Betrieb lagert */
export function randomControl(state: GameState, player: Player) {
  const hasFake = player.cellar.some((b) => b.adulterated) || player.bottles.some((l) => l.adulterated)
  if (hasFake && nextFloat(state.rng) < CONTROL_CHANCE) scandal(state, player, 'bei einer Kontrolle der Weinaufsicht')
}

/** Weinskandal: Alle gepanschten Weine werden beschlagnahmt, dazu Strafe, Punktabzug und Imageschaden. */
function scandal(state: GameState, player: Player, where: string) {
  const seized =
    player.cellar.filter((b) => b.adulterated).reduce((sum, b) => sum + b.hectoliters, 0) +
    player.bottles.filter((l) => l.adulterated).reduce((sum, l) => sum + l.bottles / 133, 0)
  player.cellar = player.cellar.filter((b) => !b.adulterated)
  const seizedLots = new Set(player.bottles.filter((l) => l.adulterated).map((l) => l.id))
  player.bottles = player.bottles.filter((l) => !seizedLots.has(l.id))
  player.competitionEntries = player.competitionEntries.filter((id) => !seizedLots.has(id))
  player.money -= SCANDAL_FINE
  player.points = Math.max(0, player.points - SCANDAL_POINTS)
  changeReputation(player, -SCANDAL_REPUTATION)
  loseBio(state, player, 'Weinskandal')
  // Ein Skandal schadet dem Ruf des ganzen Gebiets – die Nachbarn sind sauer
  adjustRegionRelations(state, player.regionId, player.id, -10)
  addLog(
    state,
    null,
    `Weinskandal! ${player.name} wurde ${where} beim Panschen erwischt: ${Math.round(seized)} hl beschlagnahmt, ` +
      `${formatEuro(SCANDAL_FINE)} Strafe, −${SCANDAL_POINTS} Punkte.`,
  )
}

export function validateSabotage(state: GameState, player: Player, targetId: string, kind: SabotageKind): string | null {
  const target = state.players.find((p) => p.id === targetId)
  if (!target || target.id === player.id) return 'Ungültiges Ziel.'
  if (target.bankrupt) return 'Dieses Weingut gibt es nicht mehr.'
  if (player.intrigueThisMonth) return 'Für diesen Monat hast du schon genug riskiert.'
  if (player.money < SABOTAGE[kind].cost) return `Nicht genug Geld (benötigt ${formatEuro(SABOTAGE[kind].cost)}).`
  if (kind === 'weinberg' && !sabotageablePlots(state, target).length) return 'Dort hängen gerade keine Trauben.'
  return null
}

function sabotageablePlots(state: GameState, target: Player) {
  return target.plots.filter((p) => p.grape !== null && !p.harvestedThisYear && plotAgeFactor(p, state.year) > 0)
}

export function sabotage(state: GameState, player: Player, targetId: string, kind: SabotageKind) {
  const target = state.players.find((p) => p.id === targetId)!
  player.money -= SABOTAGE[kind].cost
  player.intrigueThisMonth = true

  if (nextFloat(state.rng) < SABOTAGE_DETECTION) {
    player.money -= SABOTAGE_FINE
    changeReputation(player, -SABOTAGE_REPUTATION)
    addLog(state, null, `${player.name} wurde bei einer Sabotage gegen ${target.name} erwischt: ${formatEuro(SABOTAGE_FINE)} Strafe.`)
    adjustRelation(target, player.id, -60) // das vergisst so schnell niemand
    return
  }
  if (kind === 'geruecht') {
    changeReputation(target, -SABOTAGE_RUMOR_REPUTATION)
    addLog(state, target.id, `Üble Gerüchte über dein Weingut machen die Runde (−${SABOTAGE_RUMOR_REPUTATION} Bekanntheit).`)
  } else {
    const plots = sabotageablePlots(state, target)
    const plot = plots[Math.floor(nextFloat(state.rng) * plots.length)]
    plot.cropFactor *= 1 - SABOTAGE_VINEYARD_LOSS
    addLog(state, target.id, `Unbekannte haben Rebstöcke in ${plot.name} beschädigt (−${SABOTAGE_VINEYARD_LOSS * 100} % Ertrag).`)
  }
  addLog(state, player.id, `${SABOTAGE[kind].name} gegen ${target.name} ist unbemerkt geglückt.`)
}
