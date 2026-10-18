/**
 * Kundenaufträge: Hotels, Restaurants, Fluglinien und Clubs bestellen einmalig eine größere Menge eines bestimmten
 * Weins bis zu einem Termin. Sie zahlen besser als der Hofladen und bringen Punkte – wer den Termin verpasst,
 * zahlt Vertragsstrafe.
 */
import { BIO_ORDER } from './data/bio'
import { GRAPES, type GrapeId } from './data/grapes'
import { QUALITY_LEVELS, qualityInfo, type QualityLevel } from './data/quality'
import { SEKT_BOTTLE_PRICE } from './data/economy'
import { gameMonth } from './bio'
import { nextFloat } from './rng'
import { changeReputation, levelRank, removeBottles } from './rules'
import type { BioLabel, BottleLot, CustomerOrder, GameState, Player } from './types'
import { addLog, formatEuro, newId } from './util'

export const MAX_ORDERS = 3
const MAX_OFFERS = 3
const OFFER_CHANCE = 0.3
/** Monate, die eine Anfrage gilt (einschließlich des laufenden) */
const OFFER_MONTHS = 2
export const ORDER_PENALTY_SHARE = 0.15
const ORDER_PENALTY_REPUTATION = 4

type Demand = 'grape' | 'color' | 'any' | 'sekt'

interface Customer {
  name: string
  icon: string
  demand: Demand
  levels: QualityLevel[]
  quality: [number, number]
  /** Menge je tragendem Hektar */
  bottlesPerHa: [number, number]
  /** Preisaufschlag gegenüber dem Listenpreis */
  premium: [number, number]
  bio?: BioLabel
}

/** Frei erfundene Kunden */
const CUSTOMERS: Customer[] = [
  { name: 'Grandhotel Sonnenkamm', icon: '🏨', demand: 'grape', levels: ['kabinett', 'spaetlese'], quality: [60, 75], bottlesPerHa: [60, 120], premium: [1.0, 1.2] },
  { name: 'Sternerestaurant Lindgrün', icon: '🍽️', demand: 'grape', levels: ['spaetlese', 'auslese'], quality: [72, 85], bottlesPerHa: [20, 45], premium: [1.15, 1.4] },
  { name: 'Fluglinie Aerovita', icon: '✈️', demand: 'color', levels: ['qualitaetswein', 'kabinett'], quality: [50, 65], bottlesPerHa: [120, 220], premium: [0.85, 1.0] },
  { name: 'Reederei Wellenblick', icon: '🚢', demand: 'color', levels: ['qualitaetswein', 'kabinett', 'spaetlese'], quality: [55, 70], bottlesPerHa: [90, 160], premium: [0.9, 1.1] },
  { name: 'Feinkostkette Gaumenfreund', icon: '🛍️', demand: 'any', levels: ['kabinett', 'spaetlese'], quality: [60, 72], bottlesPerHa: [80, 140], premium: [0.95, 1.15] },
  { name: 'Hochzeitsagentur Glücksglas', icon: '💍', demand: 'sekt', levels: ['qualitaetswein'], quality: [55, 70], bottlesPerHa: [20, 50], premium: [1.05, 1.3] },
  { name: 'Weinclub Korkenzieher', icon: '🌿', demand: 'any', levels: ['kabinett', 'spaetlese'], quality: [62, 75], bottlesPerHa: [30, 70], premium: [1.2, 1.45], bio: 'basis' },
]

const roundTo = (value: number, step: number) => Math.round(value / step) * step

/** Flaschen, die für den Auftrag passen – die einfachsten zuerst, damit die besten Weine für den Hofladen bleiben */
export function orderEligible(player: Player, order: CustomerOrder): BottleLot[] {
  if (order.bioLabel && (!player.bioLabel || BIO_ORDER.indexOf(player.bioLabel) < BIO_ORDER.indexOf(order.bioLabel))) return []
  return player.bottles
    .filter(
      (l) =>
        l.monthsUntilReady === 0 &&
        !l.rose && // Kunden bestellen Weiß-, Rot- oder Sekt – Rosé ist kein Ersatz
        !player.competitionEntries.includes(l.id) &&
        l.sparkling === order.sparkling &&
        (l.registered || (!order.sparkling && order.minLevel === 'deutscher-wein')) &&
        (order.grape === null || l.grape === order.grape) &&
        (order.color === null || GRAPES[l.grape].color === order.color) &&
        levelRank(l.level) >= levelRank(order.minLevel) &&
        l.quality >= order.minQuality,
    )
    .sort((a, b) => a.quality - b.quality)
}

export const eligibleBottles = (player: Player, order: CustomerOrder) =>
  orderEligible(player, order).reduce((sum, l) => sum + l.bottles, 0)

/** Kurzbeschreibung des verlangten Weins, z. B. „Riesling Spätlese, Güte ab 70“ */
export function describeWine(order: CustomerOrder): string {
  const what = order.sparkling
    ? 'Sekt'
    : `${order.grape ? GRAPES[order.grape].name : order.color === 'rot' ? 'Rotwein' : order.color === 'weiss' ? 'Weißwein' : 'Wein'}, mindestens ${qualityInfo(order.minLevel).name}`
  return `${what}, Güte ab ${order.minQuality}`
}

export const orderValue = (order: CustomerOrder) => Math.round(order.bottles * order.pricePerBottle)

/** Monatsende: gelegentlich eine neue Anfrage, ab dem zweiten Jahr */
export function maybeOfferOrder(state: GameState, player: Player) {
  if (state.year < 2 || player.orderOffers.length >= MAX_OFFERS || nextFloat(state.rng) >= OFFER_CHANCE) return
  const roll = () => nextFloat(state.rng)
  const between = ([min, max]: [number, number]) => min + roll() * (max - min)
  const pick = <T>(items: T[]) => items[Math.floor(roll() * items.length)]

  const customers = CUSTOMERS.filter((c) => !c.bio || player.protection === 'bio')
  const customer = pick(customers)
  const planted = [...new Set(player.plots.flatMap((p) => (p.grape ? [p.grape] : [])))]
  let grape: GrapeId | null = null
  let color: 'rot' | 'weiss' | null = null
  if (customer.demand === 'grape') {
    // Meist eine Sorte, die das Weingut anbaut – manchmal eine Anregung für die nächste Pflanzung
    grape = planted.length > 0 && roll() < 0.75 ? pick(planted) : pick(Object.keys(GRAPES) as GrapeId[])
  } else if (customer.demand === 'color') {
    const colors = planted.map((g) => GRAPES[g].color)
    color = colors.length > 0 && roll() < 0.75 ? pick(colors) : pick(['rot', 'weiss'] as const)
  }
  const sparkling = customer.demand === 'sekt'
  const minLevel = pick(customer.levels)
  const minQuality = roundTo(between(customer.quality), 5)
  const bearingHa = Math.max(4, player.plots.filter((p) => p.grape).reduce((sum, p) => sum + p.hectares, 0))
  const bottles = Math.max(200, roundTo(bearingHa * between(customer.bottlesPerHa), 100))
  const listPrice = sparkling ? SEKT_BOTTLE_PRICE : qualityInfo(minLevel).bottlePrice
  const pricePerBottle = Math.round(listPrice * (0.5 + minQuality / 100) * between(customer.premium) * 100) / 100
  const levelBonus = QUALITY_LEVELS.findIndex((q) => q.level === minLevel)
  const now = gameMonth(state)
  const order: CustomerOrder = {
    id: newId(state, 'order'),
    customer: customer.name,
    icon: customer.icon,
    grape,
    color,
    sparkling,
    minLevel,
    minQuality,
    bioLabel: customer.bio ?? null,
    bottles,
    pricePerBottle,
    points: Math.min(12, Math.max(2, Math.round(bottles / 400 + levelBonus + (customer.bio ? 2 : 0)))),
    reputation: 2 + Math.floor(roll() * 3),
    // Der Termin liegt 2 bis 8 Monate nach Ablauf der Anfrage
    deadline: now + OFFER_MONTHS + 2 + Math.floor(roll() * 7),
    offerExpires: now + OFFER_MONTHS,
  }
  player.orderOffers.push(order)
  addLog(
    state,
    player.id,
    `${order.icon} Auftragsanfrage von ${order.customer}: ${order.bottles} Flaschen ${describeWine(order)} – siehe Aufträge.`,
    'good',
  )
}

export function validateAccept(player: Player, orderId: string): string | null {
  if (!player.orderOffers.some((o) => o.id === orderId)) return 'Diese Anfrage liegt nicht (mehr) vor.'
  if (player.orders.length >= MAX_ORDERS) return `Höchstens ${MAX_ORDERS} Aufträge gleichzeitig.`
  return null
}

export function acceptOrder(state: GameState, player: Player, orderId: string) {
  const order = player.orderOffers.find((o) => o.id === orderId)!
  player.orderOffers = player.orderOffers.filter((o) => o.id !== orderId)
  player.orders.push(order)
  addLog(state, player.id, `Auftrag von ${order.customer} angenommen: ${order.bottles} Flaschen bis ${deadlineText(order)}.`)
}

export function validateDecline(player: Player, orderId: string): string | null {
  return player.orderOffers.some((o) => o.id === orderId) ? null : 'Diese Anfrage liegt nicht (mehr) vor.'
}

export function declineOrder(state: GameState, player: Player, orderId: string) {
  const order = player.orderOffers.find((o) => o.id === orderId)!
  player.orderOffers = player.orderOffers.filter((o) => o.id !== orderId)
  addLog(state, player.id, `Anfrage von ${order.customer} abgelehnt.`)
}

export function validateDeliver(player: Player, orderId: string): string | null {
  const order = player.orders.find((o) => o.id === orderId)
  if (!order) return 'Dieser Auftrag liegt nicht vor.'
  const available = eligibleBottles(player, order)
  if (order.bioLabel && available === 0) return 'Der Kunde verlangt ein Bio-Siegel.'
  if (available < order.bottles) return `Nur ${available} von ${order.bottles} passenden, geprüften Flaschen im Lager.`
  return null
}

export function deliverOrder(state: GameState, player: Player, orderId: string) {
  const order = player.orders.find((o) => o.id === orderId)!
  let left = order.bottles
  for (const lot of orderEligible(player, order)) {
    if (left <= 0) break
    const n = Math.min(left, lot.bottles)
    removeBottles(player, lot, n)
    left -= n
  }
  const revenue = orderValue(order)
  player.money += revenue
  player.points += order.points
  player.stats.ordersDelivered++
  player.stats.bottlesSold += order.bottles
  const gain = changeReputation(player, order.reputation)
  player.orders = player.orders.filter((o) => o.id !== orderId)
  addLog(
    state,
    player.id,
    `${order.icon} ${order.bottles} Flaschen an ${order.customer} geliefert: +${formatEuro(revenue)}, +${order.points} Punkte, Bekanntheit +${gain.toFixed(1)}.`,
    'good',
  )
}

/** Monatsende: abgelaufene Anfragen verschwinden, verpasste Termine kosten Vertragsstrafe. */
export function expireOrders(state: GameState, player: Player) {
  const now = gameMonth(state)
  player.orderOffers = player.orderOffers.filter((o) => o.offerExpires > now)
  for (const order of player.orders.filter((o) => o.deadline <= now)) {
    const penalty = Math.round(orderValue(order) * ORDER_PENALTY_SHARE)
    player.money -= penalty
    changeReputation(player, -ORDER_PENALTY_REPUTATION)
    addLog(
      state,
      player.id,
      `${order.customer} wartet vergeblich auf ${order.bottles} Flaschen: Vertragsstrafe ${formatEuro(penalty)}, Bekanntheit −${ORDER_PENALTY_REPUTATION}.`,
      'bad',
    )
  }
  player.orders = player.orders.filter((o) => o.deadline > now)
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

/** „Oktober, Jahr 4“ */
export function monthText(month: number): string {
  return `${MONTHS[(month - 1) % 12]}, Jahr ${Math.floor((month - 1) / 12) + 1}`
}

export const deadlineText = (order: CustomerOrder) => `Ende ${monthText(order.deadline)}`
