/**
 * Bio-Zertifizierung als Stufenleiter: Wer auf Bio umstellt, arbeitet zwei Jahre nach Bio-Vorgaben und beantragt
 * dann das Grünblatt-Siegel. Darauf aufbauend folgen Terravita und Lunaris – jeweils strenger, teurer und lohnender.
 * Wer vom Bio-Pflanzenschutz abweicht oder beim Panschen erwischt wird, verliert alle Siegel.
 */
import { BIO_LABELS, BIO_ORDER, bioInfo } from './data/bio'
import { changeReputation } from './rules'
import type { BioLabel, GameState, Player } from './types'
import { addLog, formatEuro } from './util'

export { BIO_LABELS, BIO_ORDER, bioInfo }

/** Fortlaufender Spielmonat: Januar in Jahr 1 = 1 */
export const gameMonth = (state: GameState) => (state.year - 1) * 12 + state.month

/** Das nächste Siegel, das sich beantragen ließe */
export function nextBioLabel(player: Player): BioLabel | null {
  const index = player.bioLabel ? BIO_ORDER.indexOf(player.bioLabel) + 1 : 0
  return BIO_ORDER[index] ?? null
}

/** Monate, bis das nächste Siegel beantragt werden kann (0 = jetzt) – null ohne Bio-Pflanzenschutz */
export function monthsUntilEligible(state: GameState, player: Player): number | null {
  const next = nextBioLabel(player)
  if (player.protection !== 'bio' || player.bioSince === null || !next) return null
  const since = BIO_LABELS[next].requires === 'conversion' ? player.bioSince : player.bioLabelSince!
  return Math.max(0, since + BIO_LABELS[next].waitMonths - gameMonth(state))
}

export function validateBioLabel(state: GameState, player: Player): string | null {
  const next = nextBioLabel(player)
  if (!next) return 'Du trägst bereits das strengste Siegel.'
  if (player.protection !== 'bio') return 'Ein Bio-Siegel gibt es nur mit Bio-Pflanzenschutz.'
  const wait = monthsUntilEligible(state, player)!
  if (wait > 0) {
    const before = BIO_LABELS[next].requires === 'conversion' ? 'Umstellung' : BIO_LABELS[BIO_LABELS[next].requires as BioLabel].name
    return `Noch ${wait} Monat${wait === 1 ? '' : 'e'} ${before}, bevor ${BIO_LABELS[next].name} beantragt werden kann.`
  }
  if (player.money < BIO_LABELS[next].fee) return `Nicht genug Geld für die Zertifizierung (${formatEuro(BIO_LABELS[next].fee)}).`
  return null
}

export function applyBioLabel(state: GameState, player: Player) {
  const next = nextBioLabel(player)!
  const info = BIO_LABELS[next]
  player.money -= info.fee
  player.bioLabel = next
  player.bioLabelSince = gameMonth(state)
  changeReputation(player, info.reputation)
  addLog(
    state,
    null,
    `${info.icon} ${player.name} ist jetzt ${info.name}-zertifiziert (+${Math.round(info.priceBonus * 100)} % auf die Flaschenpreise).`,
    'good',
  )
}

/** Wechsel weg vom Bio-Pflanzenschutz oder Weinskandal: Siegel und Umstellungszeit sind verloren. */
export function loseBio(state: GameState, player: Player, reason: string) {
  const label = bioInfo(player)
  player.bioLabel = null
  player.bioLabelSince = null
  if (label) addLog(state, null, `${player.name} verliert das ${label.name}-Siegel: ${reason}.`, 'bad')
}

/** Jahresbeginn: Kontroll- und Verbandsgebühren */
export function chargeBioFees(state: GameState, player: Player) {
  const label = bioInfo(player)
  if (!label) return
  player.money -= label.annualFee
  addLog(state, player.id, `Jahresgebühr für Kontrolle und Verband (${label.name}): −${formatEuro(label.annualFee)}.`)
}
