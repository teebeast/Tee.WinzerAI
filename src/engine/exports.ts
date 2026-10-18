import {
  EXPORT_COMPLETION_POINTS,
  EXPORT_COMPLETION_REPUTATION,
  EXPORT_MIN_REPUTATION,
  EXPORT_OFFER_CHANCE,
  EXPORT_PENALTY_PER_BOTTLE,
} from './data/economy'
import { qualityInfo, type QualityLevel } from './data/quality'
import { nextFloat } from './rng'
import { changeReputation, levelRank, removeBottles } from './rules'
import type { BottleLot, ExportOffer, GameState, Player } from './types'
import { addLog, formatEuro, newId } from './util'

const COUNTRIES = ['Japan', 'die USA', 'Norwegen', 'Kanada', 'China', 'Großbritannien', 'Schweden', 'die Niederlande']
const LEVELS: QualityLevel[] = ['qualitaetswein', 'kabinett', 'spaetlese']
const CONTRACT_MONTHS = 12

/** Flaschen, die für den Exportvertrag in Frage kommen: geprüft, fertig, Stufe und Güte passen */
export function exportEligible(player: Player, offer: ExportOffer): BottleLot[] {
  return player.bottles
    .filter(
      (l) =>
        l.registered &&
        !l.sparkling &&
        l.monthsUntilReady === 0 &&
        !player.competitionEntries.includes(l.id) &&
        levelRank(l.level) >= levelRank(offer.minLevel) &&
        l.quality >= offer.minQuality,
    )
    .sort((a, b) => a.quality - b.quality)
}

/** Monatsende: Bekannte Weingüter bekommen gelegentlich eine Exportanfrage, die einen Monat gilt. */
export function maybeOfferExport(state: GameState, player: Player) {
  player.exportOffer = null
  if (player.exportContract || player.reputation < EXPORT_MIN_REPUTATION) return
  if (nextFloat(state.rng) >= EXPORT_OFFER_CHANCE) return
  const pick = <T>(items: T[]) => items[Math.floor(nextFloat(state.rng) * items.length)]
  const minLevel = pick(LEVELS)
  const minQuality = 60 + Math.floor(nextFloat(state.rng) * 5) * 5
  const bottlesPerMonth = (3 + Math.floor(nextFloat(state.rng) * 13)) * 100
  // Importeure zahlen deutlich mehr als der Großhandel, verlangen aber Liefertreue.
  const pricePerBottle =
    Math.round(qualityInfo(minLevel).bottlePrice * (0.5 + minQuality / 100) * 0.75 * 100) / 100
  player.exportOffer = {
    id: newId(state, 'export'),
    country: pick(COUNTRIES),
    bottlesPerMonth,
    pricePerBottle,
    minLevel,
    minQuality,
    months: CONTRACT_MONTHS,
  }
  addLog(
    state,
    player.id,
    `Exportanfrage aus ${player.exportOffer.country}: ${bottlesPerMonth} Flaschen pro Monat für ${formatEuro(pricePerBottle)}.`,
  )
}

export function validateAnswerExport(player: Player): string | null {
  return player.exportOffer ? null : 'Es liegt keine Exportanfrage vor.'
}

export function answerExport(state: GameState, player: Player, accept: boolean) {
  const offer = player.exportOffer!
  player.exportOffer = null
  if (!accept) {
    addLog(state, player.id, `Exportanfrage aus ${offer.country} abgelehnt.`)
    return
  }
  player.exportContract = { ...offer, monthsLeft: offer.months, missedMonths: 0 }
  addLog(state, player.id, `Exportvertrag mit ${offer.country} über ${offer.months} Monate unterschrieben.`)
}

/** Monatsende: Lieferung vor dem Hofverkauf. Fehlmengen kosten Vertragsstrafe. */
export function deliverExport(state: GameState, player: Player) {
  const contract = player.exportContract
  if (!contract) return
  let missing = contract.bottlesPerMonth
  let revenue = 0
  for (const lot of exportEligible(player, contract)) {
    if (missing <= 0) break
    const count = Math.min(missing, lot.bottles)
    revenue += count * contract.pricePerBottle
    missing -= count
    removeBottles(player, lot, count)
  }
  player.money += Math.round(revenue)
  if (missing > 0) {
    const penalty = missing * EXPORT_PENALTY_PER_BOTTLE
    player.money -= penalty
    contract.missedMonths++
    addLog(state, player.id, `Export nach ${contract.country}: ${missing} Flaschen fehlen – ${formatEuro(penalty)} Vertragsstrafe.`)
  } else {
    addLog(state, player.id, `Export nach ${contract.country}: ${contract.bottlesPerMonth} Flaschen geliefert (+${formatEuro(revenue)}).`)
  }

  if (--contract.monthsLeft > 0) return
  player.exportContract = null
  if (contract.missedMonths === 0) {
    player.points += EXPORT_COMPLETION_POINTS
    player.stats.exportsCompleted++
    changeReputation(player, EXPORT_COMPLETION_REPUTATION)
    addLog(state, null, `${player.name} hat den Exportvertrag mit ${contract.country} vollständig erfüllt: +${EXPORT_COMPLETION_POINTS} Punkte.`)
  } else {
    addLog(state, player.id, `Der Exportvertrag mit ${contract.country} ist ausgelaufen (${contract.missedMonths} Monate mit Fehlmengen).`)
  }
}
