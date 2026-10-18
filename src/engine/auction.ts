/**
 * Weinbergversteigerung als Live-Event: Alle 8–16 Monate wird eine Versteigerung angekündigt und im
 * Folgemonat abgehalten. Menschen bieten Runde für Runde mit; Computergegner und auswärtige Investoren
 * bieten verdeckt bis zu ihrem Höchstgebot. Wer bereit ist, mehr als alle anderen zu zahlen, bekommt den Zuschlag.
 */
import {
  AUCTION_INCREMENT_SHARE,
  AUCTION_INTERVAL,
  AUCTION_INVESTOR_CHANCE,
  AUCTION_INVESTOR_RANGE,
  AUCTION_START_SHARE,
  LAND_VALUE_PER_HA,
  VINES_VALUE_PER_HA,
} from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS, type RegionId } from './data/regions'
import { availableCredit } from './market'
import { nextFloat, nextRange, type Rng } from './rng'
import type { AuctionLot, BidderId, GameState, Player } from './types'
import { addLog, formatEuro, newId } from './util'
import { adjustRelation } from './rivals'

export const INVESTOR: BidderId = 'investor'

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

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

/** Monate bis zur nächsten Ankündigung – die Versteigerung selbst folgt einen Monat später. */
export function scheduleNextAuction(state: GameState) {
  const [min, max] = AUCTION_INTERVAL
  state.monthsToAuction = min - 1 + Math.floor(nextFloat(state.rng) * (max - min + 1))
}

/** Schätzwert: Boden plus Reben, je nach Lage teurer oder billiger */
export function parcelValue(
  parcel: Pick<AuctionLot, 'hectares' | 'grape' | 'plantedYear' | 'site' | 'regionId'>,
  year: number,
): number {
  // Der Boden kostet je nach Gebiet unterschiedlich viel, die Reben überall gleich
  let perHa = LAND_VALUE_PER_HA * REGIONS[parcel.regionId].character.landPrice
  if (parcel.grape !== null && parcel.plantedYear !== null) {
    perHa += VINES_VALUE_PER_HA * (year - parcel.plantedYear >= 3 ? 1 : 0.5)
  }
  return parcel.hectares * perHa * (1 + 0.15 * parcel.site)
}

/** Kündigt für den Folgemonat 1–3 Weinberge je Anbaugebiet an, in dem noch jemand wirtschaftet. */
export function announceAuction(state: GameState) {
  const regions = [...new Set(state.players.filter((p) => !p.bankrupt).map((p) => p.regionId))]
  const year = state.month === 12 ? state.year + 1 : state.year
  const month = (state.month % 12) + 1
  const lots: AuctionLot[] = []
  for (const regionId of regions) {
    const roll = nextFloat(state.rng)
    const count = roll < 0.4 ? 1 : roll < 0.8 ? 2 : 3
    for (let i = 0; i < count; i++) lots.push(makeLot(state, regionId, lots))
  }
  state.auction = { phase: 'announced', year, month, lots }
  addLog(
    state,
    null,
    `📣 Weinbergversteigerung im ${MONTH_NAMES[month - 1]}: ${lots.length} Lagen kommen unter den Hammer. Live bieten – wer am meisten zahlt, bekommt den Zuschlag.`,
  )
}

function makeLot(state: GameState, regionId: RegionId, taken: AuctionLot[]): AuctionLot {
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
  const estimate = roundThousand(parcelValue({ hectares, grape, plantedYear, site, regionId }, state.year))
  const usedNames = new Set(taken.map((p) => p.name))
  const name = pick(rng, PARCEL_NAMES.filter((n) => !usedNames.has(n)))
  const limits: Record<BidderId, number> = {}
  if (nextFloat(rng) < AUCTION_INVESTOR_CHANCE) {
    limits[INVESTOR] = roundThousand(estimate * nextRange(rng, ...AUCTION_INVESTOR_RANGE))
  }
  return {
    id: newId(state, 'lot'),
    regionId,
    name,
    hectares,
    grape,
    plantedYear,
    site,
    estimate,
    startPrice: roundThousand(estimate * AUCTION_START_SHARE),
    increment: Math.max(1000, roundThousand(estimate * AUCTION_INCREMENT_SHARE)),
    status: 'pending',
    price: 0,
    leader: null,
    humansIn: [],
    awaiting: null,
    limits,
    bids: [],
  }
}

/** Höchstes Gebot, das ein Spieler finanzieren kann: Konto plus freier Kreditrahmen */
export function maxAffordableBid(player: Player): number {
  return Math.max(0, player.money) + availableCredit(player)
}

/** Name des Bieters; `inSentence` schreibt die Investoren klein („… an auswärtige Investoren“) */
export function bidderName(state: GameState, bidder: BidderId, inSentence = false): string {
  if (bidder === INVESTOR) return inSentence ? 'auswärtige Investoren' : 'Auswärtige Investoren'
  return state.players.find((p) => p.id === bidder)?.name ?? '?'
}

/** Das nächste zulässige Gebot */
export function nextMinimum(lot: AuctionLot): number {
  return lot.leader ? lot.price + lot.increment : lot.startPrice
}

export function findLot(state: GameState, lotId: string): AuctionLot | undefined {
  return state.auction?.lots.find((l) => l.id === lotId)
}

/** Das Los, bei dem gerade ein Mensch am Zug ist – Grundlage für die Live-Ansicht */
export function awaitingLot(state: GameState): AuctionLot | undefined {
  if (state.auction?.phase !== 'live') return undefined
  return state.auction.lots.find((l) => l.status === 'open' && l.awaiting !== null)
}

/** Computergegner hinterlegen im Ankündigungsmonat ihr Höchstgebot; 0 zieht es zurück. */
export function validateAuctionLimit(state: GameState, player: Player, lotId: string, amount: number): string | null {
  const lot = findLot(state, lotId)
  if (!lot || lot.status !== 'pending') return 'Dieser Weinberg wird nicht (mehr) versteigert.'
  if (player.ai === null) return 'Menschen bieten live bei der Versteigerung mit.'
  if (lot.regionId !== player.regionId) return 'Der Weinberg liegt nicht in deinem Anbaugebiet.'
  if (!Number.isInteger(amount) || amount < 0) return 'Ungültiger Betrag.'
  if (amount === 0) return null
  if (amount < lot.startPrice) return `Der Ausrufpreis liegt bei ${formatEuro(lot.startPrice)}.`
  if (amount > maxAffordableBid(player)) return 'Das Gebot ist nicht finanzierbar.'
  return null
}

export function setAuctionLimit(state: GameState, player: Player, lotId: string, amount: number) {
  const lot = findLot(state, lotId)!
  if (amount === 0) delete lot.limits[player.id]
  else lot.limits[player.id] = amount
}

/** Live-Gebot eines Menschen; geprüft wird für den Bieter, der gerade an der Reihe ist. */
export function validateAuctionBid(state: GameState, lotId: string, amount: number): string | null {
  const lot = findLot(state, lotId)
  if (!lot || lot.status !== 'open' || !lot.awaiting) return 'Bei diesem Weinberg kann gerade niemand bieten.'
  const bidder = state.players.find((p) => p.id === lot.awaiting)!
  if (!Number.isInteger(amount)) return 'Ungültiger Betrag.'
  if (amount < nextMinimum(lot)) return `Das Gebot muss mindestens ${formatEuro(nextMinimum(lot))} betragen.`
  if (amount > maxAffordableBid(bidder)) {
    return `Das Gebot ist nicht finanzierbar (höchstens ${formatEuro(maxAffordableBid(bidder))}).`
  }
  return null
}

export function validateAuctionPass(state: GameState, lotId: string): string | null {
  const lot = findLot(state, lotId)
  if (!lot || lot.status !== 'open' || !lot.awaiting) return 'Bei diesem Weinberg kann gerade niemand aussteigen.'
  return null
}

export function auctionBid(state: GameState, lotId: string, amount: number) {
  const lot = findLot(state, lotId)!
  lot.price = amount
  lot.leader = lot.awaiting
  lot.bids.push({ bidder: lot.awaiting!, amount })
  rivalsRespond(state, lot)
  advance(state, lot)
}

export function auctionPass(state: GameState, lotId: string) {
  const lot = findLot(state, lotId)!
  lot.humansIn = lot.humansIn.filter((id) => id !== lot.awaiting)
  rivalsRespond(state, lot)
  advance(state, lot)
}

/** Beginn des Versteigerungsmonats: In jedem Gebiet wird das erste Los aufgerufen. */
export function startLiveAuction(state: GameState) {
  const auction = state.auction!
  auction.phase = 'live'
  for (const regionId of new Set(auction.lots.map((l) => l.regionId))) openNextLot(state, regionId, true)
}

/** Ende des Versteigerungsmonats: Offene Lose werden ohne weitere Gebote der Menschen zugeschlagen. */
export function finishAuction(state: GameState) {
  const auction = state.auction!
  for (const lot of auction.lots.filter((l) => l.status === 'open')) {
    lot.humansIn = []
    lot.awaiting = null
    rivalsRespond(state, lot)
    closeLot(state, lot)
  }
  for (const regionId of new Set(auction.lots.map((l) => l.regionId))) openNextLot(state, regionId, false)
  state.auction = null
  scheduleNextAuction(state)
}

function openNextLot(state: GameState, regionId: RegionId, withHumans: boolean) {
  const lot = state.auction!.lots.find((l) => l.regionId === regionId && l.status === 'pending')
  if (!lot) return
  lot.status = 'open'
  lot.humansIn = withHumans
    ? state.players.filter((p) => p.ai === null && !p.bankrupt && p.regionId === regionId).map((p) => p.id)
    : []
  if (lot.humansIn.length > 0) {
    lot.awaiting = lot.humansIn[0]
    return
  }
  // Ohne Menschen entscheiden die verdeckten Höchstgebote sofort.
  rivalsRespond(state, lot)
  closeLot(state, lot)
  openNextLot(state, regionId, withHumans)
}

/** Höchstgebote der Computergegner und Investoren – gedeckelt durch das, was ein Computergegner gerade finanzieren kann */
function rivalLimits(state: GameState, lot: AuctionLot): { bidder: BidderId; limit: number }[] {
  return Object.entries(lot.limits)
    .map(([bidder, limit]) => {
      if (bidder === INVESTOR) return { bidder, limit }
      const player = state.players.find((p) => p.id === bidder)
      return { bidder, limit: player && !player.bankrupt ? Math.min(limit, maxAffordableBid(player)) : 0 }
    })
    .filter((r) => r.limit > 0)
}

/**
 * Computergegner und Investoren reagieren wie bei einer echten Versteigerung: Wer noch mag, überbietet
 * um einen Schritt; bieten mehrere, steigt der Preis bis knapp über das zweithöchste Limit.
 */
function rivalsRespond(state: GameState, lot: AuctionLot) {
  const minimum = nextMinimum(lot)
  const rivals = rivalLimits(state, lot)
    .filter((r) => (r.bidder === lot.leader ? r.limit >= lot.price : r.limit >= minimum))
    .sort((a, b) => b.limit - a.limit)
  const challengers = rivals.filter((r) => r.bidder !== lot.leader)
  if (challengers.length === 0) return

  const [top, second] = rivals
  let price = second ? Math.min(top.limit, second.limit + lot.increment) : minimum
  if (top.bidder !== lot.leader) price = Math.max(price, minimum)
  if (second && second.bidder !== lot.leader && second.limit > lot.price) {
    lot.bids.push({ bidder: second.bidder, amount: second.limit })
  }
  if (top.bidder === lot.leader && price === lot.price) return
  lot.price = price
  lot.leader = top.bidder
  lot.bids.push({ bidder: top.bidder, amount: price })
}

/** Wer muss als Nächstes entscheiden? Wenn niemand mehr, fällt der Hammer. */
function advance(state: GameState, lot: AuctionLot) {
  const next = lot.humansIn.find((id) => id !== lot.leader)
  if (next) {
    lot.awaiting = next
    return
  }
  lot.awaiting = null
  closeLot(state, lot)
  openNextLot(state, lot.regionId, true)
}

function closeLot(state: GameState, lot: AuctionLot) {
  const description = `${lot.name} (${lot.hectares} ha ${lot.grape ? GRAPES[lot.grape].name : 'Brache'}, ${REGIONS[lot.regionId].name})`
  lot.awaiting = null
  if (!lot.leader) {
    lot.status = 'unsold'
    addLog(state, null, `🔨 ${description}: kein Gebot – der Weinberg bleibt unverkauft.`)
    return
  }
  lot.status = 'sold'
  const ratio = Math.round((lot.price / lot.estimate) * 100)
  addLog(
    state,
    null,
    `🔨 Zuschlag: ${description} geht für ${formatEuro(lot.price)} (${ratio} % des Schätzwerts) an ${bidderName(state, lot.leader, true)}.`,
  )
  const winner = state.players.find((p) => p.id === lot.leader)
  if (winner) awardParcel(state, winner, lot)
  // Wer mitgeboten und verloren hat, ist verstimmt
  for (const loser of state.players.filter((p) => p.ai !== null && p.id !== lot.leader && lot.limits[p.id] !== undefined)) {
    if (winner) adjustRelation(loser, winner.id, -10)
  }
}

function awardParcel(state: GameState, player: Player, lot: AuctionLot) {
  player.stats.auctionsWon++
  const taken = new Set(player.plots.map((p) => p.name))
  let name = lot.name
  for (let n = 2; taken.has(name); n++) name = `${lot.name} ${n}`
  player.plots.push({
    id: newId(state, 'plot'),
    name,
    hectares: lot.hectares,
    grape: lot.grape,
    plantedYear: lot.plantedYear,
    site: lot.site,
    oechsle: 0,
    health: 1,
    cropFactor: 1,
    harvestedThisYear: false,
    botrytis: false,
    iceWineGamble: false,
  })

  // Fehlbetrag automatisch über den Kredit decken – der neue Weinberg erhöht bereits den Rahmen.
  player.money -= lot.price
  if (player.money < 0) {
    const loan = Math.min(-player.money, availableCredit(player))
    player.loan += loan
    player.money += loan
    if (loan > 0) addLog(state, player.id, `Für den Kauf wurden ${formatEuro(loan)} Kredit aufgenommen.`)
  }
}
