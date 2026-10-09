import {
  AUCTION_MIN_BID_SHARE,
  AUCTION_MONTH,
  AUCTION_OUTSIDE_BID_RANGE,
  LAND_VALUE_PER_HA,
  VINES_VALUE_PER_HA,
} from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS, type RegionId } from './data/regions'
import { availableCredit } from './market'
import { nextFloat, nextRange, type Rng } from './rng'
import type { AuctionParcel, GameState, Player } from './types'
import { addLog, formatEuro, newId } from './util'

const PARCEL_NAMES = [
  'Sonnenberg', 'Kirchberg', 'Schlossberg', 'Herrenberg', 'Rosengarten', 'Mühlberg', 'Steinacker',
  'Goldtröpfchen', 'Himmelreich', 'Fuchsloch', 'Altenberg', 'Kapellenberg', 'Paradies', 'Hasensprung',
  'Bienengarten', 'Felsenkopf', 'Abtsberg', 'Klosterpfad',
]
const SITES = [-1, 0, 0, 1, 1, 2]

export const SITE_LABELS: Record<number, string> = {
  [-1]: 'einfache Lage',
  0: 'gute Lage',
  1: 'sehr gute Lage',
  2: 'Spitzenlage',
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(nextFloat(rng) * items.length)]
}

function roundThousand(value: number): number {
  return Math.round(value / 1000) * 1000
}

/** Schätzwert: Boden plus Reben, je nach Lage teurer oder billiger */
export function parcelValue(
  parcel: Pick<AuctionParcel, 'hectares' | 'grape' | 'plantedYear' | 'site'>,
  year: number,
): number {
  let perHa = LAND_VALUE_PER_HA
  if (parcel.grape !== null && parcel.plantedYear !== null) {
    perHa += VINES_VALUE_PER_HA * (year - parcel.plantedYear >= 3 ? 1 : 0.5)
  }
  return parcel.hectares * perHa * (1 + 0.15 * parcel.site)
}

/** Erzeugt zum Februar 1–2 Weinberge je Anbaugebiet, in dem noch jemand wirtschaftet. */
export function generateAuction(state: GameState) {
  const regions = [...new Set(state.players.filter((p) => !p.bankrupt).map((p) => p.regionId))]
  state.auction = []
  for (const regionId of regions) {
    const count = nextFloat(state.rng) < 0.5 ? 1 : 2
    for (let i = 0; i < count; i++) state.auction.push(makeParcel(state, regionId))
  }
  if (state.auction.length > 0) {
    addLog(state, null, `Weinbergversteigerung: ${state.auction.length} Lagen stehen bis Ende Februar zum Verkauf.`)
  }
}

function makeParcel(state: GameState, regionId: RegionId): AuctionParcel {
  const rng = state.rng
  const hectares = 1 + Math.floor(nextFloat(rng) * 5)
  const site = pick(rng, SITES)
  let grape: GrapeId | null = null
  let plantedYear: number | null = null
  if (nextFloat(rng) < 0.6) {
    const suitable = (Object.keys(GRAPES) as GrapeId[]).filter((g) => REGIONS[regionId].suitability[g] >= 0)
    grape = pick(rng, suitable)
    plantedYear = state.year - 3 - Math.floor(nextFloat(rng) * 25)
  }
  const value = parcelValue({ hectares, grape, plantedYear, site }, state.year)
  const usedNames = new Set(state.auction.map((p) => p.name))
  const name = pick(rng, PARCEL_NAMES.filter((n) => !usedNames.has(n)))
  return {
    id: newId(state, 'parcel'),
    regionId,
    name,
    hectares,
    grape,
    plantedYear,
    site,
    minimumBid: roundThousand(value * AUCTION_MIN_BID_SHARE),
    outsideBid: roundThousand(value * nextRange(rng, ...AUCTION_OUTSIDE_BID_RANGE)),
    bids: {},
  }
}

/** Höchstes Gebot, das ein Spieler finanzieren kann: Konto plus freier Kreditrahmen */
export function maxAffordableBid(player: Player): number {
  return Math.max(0, player.money) + availableCredit(player)
}

export function validateBid(state: GameState, player: Player, parcelId: string, amount: number): string | null {
  if (state.month !== AUCTION_MONTH) return 'Versteigert wird nur im Februar.'
  const parcel = state.auction.find((p) => p.id === parcelId)
  if (!parcel) return 'Unbekannter Weinberg.'
  if (parcel.regionId !== player.regionId) return 'Der Weinberg liegt nicht in deinem Anbaugebiet.'
  if (!Number.isInteger(amount) || amount < 0) return 'Ungültiger Betrag.'
  if (amount === 0) return parcel.bids[player.id] ? null : 'Es gibt kein Gebot zum Zurückziehen.'
  if (amount < parcel.minimumBid) return `Das Mindestgebot liegt bei ${formatEuro(parcel.minimumBid)}.`
  if (amount > maxAffordableBid(player)) {
    return `Das Gebot ist nicht finanzierbar (höchstens ${formatEuro(maxAffordableBid(player))}).`
  }
  return null
}

/** Betrag 0 zieht ein Gebot zurück. */
export function placeBid(state: GameState, player: Player, parcelId: string, amount: number) {
  const parcel = state.auction.find((p) => p.id === parcelId)!
  if (amount === 0) {
    delete parcel.bids[player.id]
    addLog(state, player.id, `Gebot für ${parcel.name} zurückgezogen.`)
  } else {
    parcel.bids[player.id] = amount
    addLog(state, player.id, `Verdecktes Gebot für ${parcel.name}: ${formatEuro(amount)}.`)
  }
}

/** Ende Februar: Das höchste Gebot gewinnt, wenn es das verdeckte Investorengebot übertrifft. */
export function resolveAuction(state: GameState) {
  for (const parcel of state.auction) {
    const bids = Object.entries(parcel.bids)
      .map(([playerId, amount]) => ({ player: state.players.find((p) => p.id === playerId)!, amount }))
      .filter((b) => !b.player.bankrupt)
      .map((b) => ({ ...b, tieBreak: nextFloat(state.rng) }))
      .sort((a, b) => b.amount - a.amount || b.tieBreak - a.tieBreak)
    const best = bids[0]
    const description = `${parcel.name} (${parcel.hectares} ha ${parcel.grape ? GRAPES[parcel.grape].name : 'Brache'}, ${REGIONS[parcel.regionId].name})`

    if (best && best.amount > parcel.outsideBid) {
      awardParcel(state, best.player, parcel, best.amount)
      addLog(state, null, `Versteigerung: ${description} geht für ${formatEuro(best.amount)} an ${best.player.name}.`)
    } else {
      const highest = best ? ` Höchstes Spielergebot: ${formatEuro(best.amount)}.` : ''
      addLog(state, null, `Versteigerung: ${description} geht für ${formatEuro(parcel.outsideBid)} an auswärtige Investoren.${highest}`)
    }
  }
  state.auction = []
}

function awardParcel(state: GameState, player: Player, parcel: AuctionParcel, price: number) {
  const taken = new Set(player.plots.map((p) => p.name))
  let name = parcel.name
  for (let n = 2; taken.has(name); n++) name = `${parcel.name} ${n}`
  player.plots.push({
    id: newId(state, 'plot'),
    name,
    hectares: parcel.hectares,
    grape: parcel.grape,
    plantedYear: parcel.plantedYear,
    site: parcel.site,
    oechsle: 0,
    health: 1,
    cropFactor: 1,
    harvestedThisYear: false,
  })

  // Fehlbetrag automatisch über den Kredit decken – der neue Weinberg erhöht bereits den Rahmen.
  player.money -= price
  if (player.money < 0) {
    const loan = Math.min(-player.money, availableCredit(player))
    player.loan += loan
    player.money += loan
    if (loan > 0) addLog(state, player.id, `Für den Kauf wurden ${formatEuro(loan)} Kredit aufgenommen.`)
  }
}
