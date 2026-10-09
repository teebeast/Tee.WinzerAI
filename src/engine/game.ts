import {
  BOTTLE_COST,
  CELLAR_MASTER_QUALITY_BONUS,
  CELLAR_MASTER_SALARY,
  COMPETITIONS,
  DIRECT_SALES_COST_SHARE,
  HARVEST_COST_PER_HA,
  INSOLVENCY_MONTHS,
  LOAN_INTEREST_RATE,
  MARKETING,
  MEDAL_NAMES,
  ONLINE_SHOP_COST,
  OVERDRAFT_INTEREST_RATE,
  OVERFLOW_PRICE_PER_LITER,
  REGISTER_FEE,
  REGISTER_MIN_BOTTLES,
  REPUTATION_DECAY_RATE,
  REPUTATION_SATURATION,
  START_MONEY,
  START_REPUTATION,
  START_TANK_HL,
  TANK_COST_PER_HL,
  UPKEEP_PER_HA,
  VINEYARD_COST_PER_HA,
  WORKER_SALARY,
  type CompetitionInfo,
} from './data/economy'
import { GRAPES } from './data/grapes'
import { levelForOechsle, qualityInfo, type QualityLevel } from './data/quality'
import { REGIONS } from './data/regions'
import {
  availableCredit,
  bottlePrice,
  bulkPricePerHl,
  competitionBaseScore,
  creditLimit,
  hlToBottles,
  monthlyDemand,
  upcomingCompetition,
  wholesalePrice,
} from './market'
import { nextRange } from './rng'
import type { Action, BottleLot, GameState, Medal, NewGameOptions, Player, Plot, WineInfo } from './types'
import { drawWeather, makeForecast, SUN_FACTOR, WEATHER_LABELS, type WeatherKind } from './weather'

export const PLANT_MONTHS = [3, 4]
export const HARVEST_MONTHS = [8, 9, 10, 11, 12]
const MAX_LOG = 300

/** Basis-Reifezuwachs in °Oe am Ende des jeweiligen Monats */
const RIPENING_BASE: Record<number, number> = { 8: 20, 9: 18, 10: 12, 11: 5 }
const RIPENING_START_OECHSLE = 45
/** Anteil der möglichen Menge je nach Lesemonat */
const HARVEST_TIMING: Record<number, number> = { 8: 0.7, 9: 0.9, 10: 1, 11: 1, 12: 1 }
/** Mengenverlust durch Fäulnis am Ende des Monats */
const ROT_LOSS: Record<number, number> = { 10: 0.05, 11: 0.25 }

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export class RuleError extends Error {}

export function newGame(options: NewGameOptions): GameState {
  const state: GameState = {
    version: 2,
    rng: { state: options.seed },
    year: 1,
    month: 1,
    players: [],
    currentPlayer: 0,
    forecast: { sonnig: 0, wechselhaft: 0, nass: 0 },
    lastWeather: null,
    targetPoints: options.targetPoints ?? 600,
    winnerId: null,
    finished: false,
    nextId: 1,
    log: [],
  }
  state.players = options.players.map((p, i) => {
    const region = REGIONS[p.regionId]
    return {
      id: `p${i + 1}`,
      name: p.name,
      regionId: p.regionId,
      money: START_MONEY,
      points: 0,
      reputation: START_REPUTATION,
      loan: 0,
      tankCapacityHl: START_TANK_HL,
      hasOnlineShop: false,
      hasCellarMaster: false,
      workers: 1,
      plots: [
        makePlot(state, 'Hauslage', 4, region.startGrape, -10),
        makePlot(state, 'Südhang', 3, null, null),
        makePlot(state, 'Talweg', 3, null, null),
      ],
      cellar: [],
      bottles: [],
      marketingThisMonth: [],
      competitionEntries: [],
      monthsInsolvent: 0,
      bankrupt: false,
    }
  })
  state.forecast = makeForecast(state.rng, state.month, 0.8)
  addLog(state, null, `Jahr 1 beginnt. Ziel: ${state.targetPoints} Punkte.`)
  return state
}

function makePlot(
  state: GameState,
  name: string,
  hectares: number,
  grape: Plot['grape'],
  plantedYear: number | null,
): Plot {
  return {
    id: newId(state, 'plot'),
    name,
    hectares,
    grape,
    plantedYear,
    oechsle: 0,
    health: 1,
    cropFactor: 1,
    harvestedThisYear: false,
  }
}

function newId(state: GameState, prefix: string): string {
  return `${prefix}${state.nextId++}`
}

function addLog(state: GameState, playerId: string | null, text: string) {
  state.log.push({ year: state.year, month: state.month, playerId, text })
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG)
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayer]
}

/** Ertragsfähigkeit nach Alter: Pflanzjahr und Folgejahr 0, 3. Jahr 50 %, danach voll. */
export function plotAgeFactor(plot: Plot, year: number): number {
  if (plot.grape === null || plot.plantedYear === null) return 0
  const age = year - plot.plantedYear
  if (age <= 1) return 0
  if (age === 2) return 0.5
  return 1
}

export function usedTankHl(player: Player): number {
  return player.cellar.reduce((sum, b) => sum + b.hectoliters, 0)
}

export function computeQuality(player: Player, plot: Plot): number {
  const grape = GRAPES[plot.grape!]
  const suitability = REGIONS[player.regionId].suitability[grape.id]
  const cellarMaster = player.hasCellarMaster ? CELLAR_MASTER_QUALITY_BONUS : 0
  const raw =
    20 + grape.qualityPotential * 4 + suitability * 6 + (plot.oechsle - 70) * 0.6 + (plot.health - 0.5) * 20 +
    cellarMaster
  return Math.max(0, Math.min(100, Math.round(raw)))
}

export interface HarvestPreview {
  hectoliters: number
  level: QualityLevel
  quality: number
  cost: number
}

export function harvestPreview(state: GameState, player: Player, plot: Plot): HarvestPreview {
  const grape = GRAPES[plot.grape!]
  const hectoliters =
    plot.hectares *
    grape.yieldPerHa *
    plotAgeFactor(plot, state.year) *
    plot.cropFactor *
    (HARVEST_TIMING[state.month] ?? 0) *
    (0.6 + 0.4 * plot.health)
  return {
    hectoliters: Math.round(hectoliters),
    level: levelForOechsle(plot.oechsle).level,
    quality: computeQuality(player, plot),
    cost: plot.hectares * HARVEST_COST_PER_HA,
  }
}

/** Liefert eine Fehlermeldung, wenn die Aktion gerade nicht erlaubt ist, sonst null. */
export function validateAction(state: GameState, action: Action): string | null {
  if (state.winnerId || state.finished) return 'Das Spiel ist beendet.'
  const player = currentPlayer(state)
  const findBatch = (id: string) => player.cellar.find((b) => b.id === id)
  const findLot = (id: string) => player.bottles.find((l) => l.id === id)

  switch (action.type) {
    case 'plant': {
      const plot = player.plots.find((p) => p.id === action.plotId)
      if (!plot) return 'Unbekannte Parzelle.'
      if (!PLANT_MONTHS.includes(state.month)) return 'Gepflanzt wird nur im März und April.'
      if (plot.grape !== null) return 'Die Parzelle ist bereits bestockt.'
      const cost = GRAPES[action.grape].plantCostPerHa * plot.hectares
      if (player.money < cost) return `Nicht genug Geld (benötigt ${formatEuro(cost)}).`
      return null
    }
    case 'harvest': {
      const plot = player.plots.find((p) => p.id === action.plotId)
      if (!plot) return 'Unbekannte Parzelle.'
      if (!HARVEST_MONTHS.includes(state.month)) return 'Gelesen wird von August bis Dezember.'
      if (plot.grape === null) return 'Die Parzelle ist nicht bestockt.'
      if (plot.harvestedThisYear) return 'Die Parzelle ist in diesem Jahr schon gelesen.'
      // Kein Geldcheck: Die Saisonkräfte werden aus dem Erlös bezahlt, notfalls im Dispo.
      if (plotAgeFactor(plot, state.year) === 0) return 'Die Reben sind noch zu jung.'
      return null
    }
    case 'sellBulk': {
      const batch = findBatch(action.batchId)
      if (!batch) return 'Unbekannte Charge.'
      if (!(action.hectoliters > 0) || action.hectoliters > batch.hectoliters) return 'Ungültige Menge.'
      return null
    }
    case 'bottle': {
      const batch = findBatch(action.batchId)
      if (!batch) return 'Unbekannte Charge.'
      if (batch.monthsUntilReady > 0) return 'Der Wein ist noch nicht ausgebaut.'
      if (!(action.hectoliters > 0) || action.hectoliters > batch.hectoliters) return 'Ungültige Menge.'
      const cost = hlToBottles(action.hectoliters) * BOTTLE_COST
      if (player.money < cost) return `Nicht genug Geld für Flaschen (benötigt ${formatEuro(cost)}).`
      return null
    }
    case 'register': {
      const lot = findLot(action.lotId)
      if (!lot) return 'Unbekannter Flaschenposten.'
      if (lot.registered) return 'Der Wein ist bereits geprüft.'
      if (lot.level === 'deutscher-wein') return 'Deutscher Wein braucht keine Prüfung.'
      if (lot.bottles < REGISTER_MIN_BOTTLES) return `Mindestens ${REGISTER_MIN_BOTTLES} Flaschen (5 hl) für eine Prüfung.`
      if (player.money < REGISTER_FEE) return 'Nicht genug Geld für die Prüfgebühr.'
      return null
    }
    case 'sellWholesale': {
      const lot = findLot(action.lotId)
      if (!lot) return 'Unbekannter Flaschenposten.'
      if (!lot.registered) return 'Der Großhandel nimmt nur amtlich geprüfte Weine.'
      if (!Number.isInteger(action.bottles) || action.bottles <= 0 || action.bottles > lot.bottles) {
        return 'Ungültige Menge.'
      }
      return null
    }
    case 'enterCompetition': {
      const lot = findLot(action.lotId)
      if (!lot) return 'Unbekannter Flaschenposten.'
      const competition = upcomingCompetition(state.month)
      if (!lot.registered) return 'Nur amtlich geprüfte Weine dürfen teilnehmen.'
      if (player.competitionEntries.includes(lot.id)) return 'Der Wein ist bereits angemeldet.'
      if (lot.awards.some((a) => a.competition === competition.id)) return 'Der Wein wurde hier schon prämiert.'
      if (player.competitionEntries.length >= competition.maxEntries) {
        return `Höchstens ${competition.maxEntries} Weine pro Prämierung.`
      }
      if (player.money < competition.fee) return 'Nicht genug Geld für die Teilnahmegebühr.'
      return null
    }
    case 'marketing': {
      const info = MARKETING[action.kind]
      if (!info.months.includes(state.month)) return `${info.name} ist in diesem Monat nicht möglich.`
      if (player.marketingThisMonth.includes(action.kind)) return `${info.name} ist für diesen Monat schon gebucht.`
      if (player.money < info.cost) return `Nicht genug Geld (benötigt ${formatEuro(info.cost)}).`
      return null
    }
    case 'expandTank': {
      if (!Number.isInteger(action.hectoliters) || action.hectoliters <= 0) return 'Ungültige Menge.'
      const cost = action.hectoliters * TANK_COST_PER_HL
      if (player.money < cost) return `Nicht genug Geld (benötigt ${formatEuro(cost)}).`
      return null
    }
    case 'buyOnlineShop':
      if (player.hasOnlineShop) return 'Der Online-Shop läuft bereits.'
      if (player.money < ONLINE_SHOP_COST) return `Nicht genug Geld (benötigt ${formatEuro(ONLINE_SHOP_COST)}).`
      return null
    case 'cellarMaster':
      if (player.hasCellarMaster === action.hire) {
        return action.hire ? 'Es ist bereits ein Kellermeister angestellt.' : 'Es ist kein Kellermeister angestellt.'
      }
      return null
    case 'borrow':
      if (!Number.isInteger(action.amount) || action.amount <= 0) return 'Ungültiger Betrag.'
      if (action.amount > availableCredit(player)) return `Kreditrahmen reicht nur für ${formatEuro(availableCredit(player))}.`
      return null
    case 'repay':
      if (!Number.isInteger(action.amount) || action.amount <= 0 || action.amount > player.loan) return 'Ungültiger Betrag.'
      if (action.amount > player.money) return 'Nicht genug Geld auf dem Konto.'
      return null
    case 'endTurn':
      return null
  }
}

/** Reine Funktion: liefert einen neuen Spielstand, der alte bleibt unverändert. */
export function applyAction(state: GameState, action: Action): GameState {
  const error = validateAction(state, action)
  if (error) throw new RuleError(error)

  const next = structuredClone(state)
  const player = currentPlayer(next)
  const batchOf = (id: string) => player.cellar.find((b) => b.id === id)!
  const lotOf = (id: string) => player.bottles.find((l) => l.id === id)!

  switch (action.type) {
    case 'plant': {
      const plot = player.plots.find((p) => p.id === action.plotId)!
      const grape = GRAPES[action.grape]
      player.money -= grape.plantCostPerHa * plot.hectares
      plot.grape = grape.id
      plot.plantedYear = next.year
      addLog(next, player.id, `${plot.name}: ${plot.hectares} ha ${grape.name} gepflanzt.`)
      break
    }
    case 'harvest':
      harvest(next, player, player.plots.find((p) => p.id === action.plotId)!)
      break
    case 'sellBulk': {
      const batch = batchOf(action.batchId)
      const revenue = Math.round(bulkPricePerHl(batch) * action.hectoliters)
      player.money += revenue
      batch.hectoliters -= action.hectoliters
      if (batch.hectoliters <= 0.001) player.cellar = player.cellar.filter((b) => b.id !== batch.id)
      addLog(next, player.id, `${action.hectoliters} hl ${wineLabel(batch)} als Fasswein verkauft: +${formatEuro(revenue)}.`)
      break
    }
    case 'bottle':
      bottle(next, player, action.batchId, action.hectoliters)
      break
    case 'register': {
      const lot = lotOf(action.lotId)
      const points = qualityInfo(lot.level).apPoints
      player.money -= REGISTER_FEE
      player.points += points
      lot.registered = true
      addLog(next, player.id, `${wineLabel(lot)} hat die amtliche Prüfung bestanden: +${points} Punkte.`)
      checkWinner(next)
      break
    }
    case 'sellWholesale': {
      const lot = lotOf(action.lotId)
      const revenue = Math.round(wholesalePrice(lot, player) * action.bottles)
      player.money += revenue
      removeBottles(player, lot, action.bottles)
      addLog(next, player.id, `${action.bottles} Fl. ${wineLabel(lot)} an den Großhandel: +${formatEuro(revenue)}.`)
      break
    }
    case 'enterCompetition': {
      const competition = upcomingCompetition(next.month)
      player.money -= competition.fee
      player.competitionEntries.push(action.lotId)
      addLog(next, player.id, `${wineLabel(lotOf(action.lotId))} zur ${competition.name} angemeldet.`)
      break
    }
    case 'marketing': {
      const info = MARKETING[action.kind]
      player.money -= info.cost
      player.marketingThisMonth.push(action.kind)
      const gain = changeReputation(player, info.reputation)
      addLog(next, player.id, `${info.name}: Bekanntheit +${gain.toFixed(1)}.`)
      break
    }
    case 'expandTank':
      player.money -= action.hectoliters * TANK_COST_PER_HL
      player.tankCapacityHl += action.hectoliters
      addLog(next, player.id, `Tanklager um ${action.hectoliters} hl erweitert.`)
      break
    case 'buyOnlineShop':
      player.money -= ONLINE_SHOP_COST
      player.hasOnlineShop = true
      addLog(next, player.id, 'Der Online-Shop ist eröffnet.')
      break
    case 'cellarMaster':
      player.hasCellarMaster = action.hire
      addLog(next, player.id, action.hire ? 'Ein Kellermeister ist eingestellt.' : 'Der Kellermeister ist entlassen.')
      break
    case 'borrow':
      player.loan += action.amount
      player.money += action.amount
      addLog(next, player.id, `Kredit über ${formatEuro(action.amount)} aufgenommen.`)
      break
    case 'repay':
      player.loan -= action.amount
      player.money -= action.amount
      addLog(next, player.id, `${formatEuro(action.amount)} Kredit getilgt.`)
      break
    case 'endTurn':
      endTurn(next)
      break
  }
  return next
}

function harvest(state: GameState, player: Player, plot: Plot) {
  const preview = harvestPreview(state, player, plot)
  player.money -= preview.cost
  plot.harvestedThisYear = true

  const freeHl = Math.max(0, player.tankCapacityHl - usedTankHl(player))
  const storedHl = Math.min(preview.hectoliters, freeHl)
  const overflowHl = preview.hectoliters - storedHl

  if (storedHl > 0) {
    player.cellar.push({
      id: newId(state, 'wine'),
      grape: plot.grape!,
      vintage: state.year,
      hectoliters: storedHl,
      oechsle: Math.round(plot.oechsle),
      level: preview.level,
      quality: preview.quality,
      monthsUntilReady: qualityInfo(preview.level).maturingMonths,
    })
  }
  const grapeName = GRAPES[plot.grape!].name
  addLog(
    state,
    player.id,
    `${plot.name}: ${preview.hectoliters} hl ${grapeName} gelesen, ${Math.round(plot.oechsle)} °Oe, ` +
      `${qualityInfo(preview.level).name}, Güte ${preview.quality}.`,
  )
  if (overflowHl > 0) {
    const revenue = Math.round(overflowHl * 100 * OVERFLOW_PRICE_PER_LITER)
    player.money += revenue
    addLog(state, player.id, `Tanks voll! ${overflowHl} hl Most billig abgegeben: +${formatEuro(revenue)}.`)
  }
}

function bottle(state: GameState, player: Player, batchId: string, hectoliters: number) {
  const batch = player.cellar.find((b) => b.id === batchId)!
  const bottles = hlToBottles(hectoliters)
  player.money -= bottles * BOTTLE_COST
  batch.hectoliters -= hectoliters
  if (batch.hectoliters <= 0.001) player.cellar = player.cellar.filter((b) => b.id !== batch.id)

  // Nachfüllen in einen noch ungeprüften Posten desselben Weins, damit kleine Abfüllungen prüfbar bleiben.
  const existing = player.bottles.find((l) => !l.registered && sameWine(l, batch))
  if (existing) {
    existing.bottles += bottles
  } else {
    player.bottles.push({
      id: newId(state, 'lot'),
      grape: batch.grape,
      vintage: batch.vintage,
      oechsle: batch.oechsle,
      level: batch.level,
      quality: batch.quality,
      bottles,
      registered: false,
      awards: [],
    })
  }
  addLog(state, player.id, `${bottles} Flaschen ${wineLabel(batch)} abgefüllt: −${formatEuro(bottles * BOTTLE_COST)}.`)
}

function sameWine(a: WineInfo, b: WineInfo): boolean {
  return a.grape === b.grape && a.vintage === b.vintage && a.level === b.level && a.quality === b.quality
}

function removeBottles(player: Player, lot: BottleLot, bottles: number) {
  lot.bottles -= bottles
  if (lot.bottles <= 0) {
    player.bottles = player.bottles.filter((l) => l.id !== lot.id)
    player.competitionEntries = player.competitionEntries.filter((id) => id !== lot.id)
  }
}

/** Ändert die Bekanntheit; Zuwächse schrumpfen, je bekannter das Weingut schon ist. Liefert die tatsächliche Änderung. */
function changeReputation(player: Player, delta: number): number {
  const effective = delta > 0 ? delta * Math.max(0, 1 - player.reputation / REPUTATION_SATURATION) : delta
  const before = player.reputation
  player.reputation = Math.max(0, Math.min(100, player.reputation + effective))
  return player.reputation - before
}

function activeIndices(state: GameState): number[] {
  return state.players.flatMap((p, i) => (p.bankrupt ? [] : [i]))
}

function endTurn(state: GameState) {
  const later = activeIndices(state).find((i) => i > state.currentPlayer)
  if (later !== undefined) {
    state.currentPlayer = later
    return
  }
  resolveMonth(state)
  const active = activeIndices(state)
  if (active.length === 0) {
    state.finished = true
    addLog(state, null, 'Alle Weingüter sind insolvent. Das Spiel ist vorbei.')
  } else {
    state.currentPlayer = active[0]
  }
}

function resolveMonth(state: GameState) {
  const weather = drawWeather(state.rng, state.forecast)
  state.lastWeather = weather
  addLog(state, null, `Wetter im ${MONTH_NAMES[state.month - 1]}: ${WEATHER_LABELS[weather]}.`)

  const competition = Object.values(COMPETITIONS).find((c) => c.month === state.month)

  for (const player of state.players) {
    if (player.bankrupt) continue
    for (const plot of player.plots) growPlot(state, player, plot, weather)
    for (const batch of player.cellar) {
      if (batch.monthsUntilReady > 0) {
        batch.monthsUntilReady--
        if (batch.monthsUntilReady === 0) addLog(state, player.id, `${wineLabel(batch)} ist ausgebaut.`)
      }
    }
    sellDirect(state, player)
    if (competition) judgeCompetition(state, player, competition)
    payMonthlyCosts(state, player)
    changeReputation(player, -player.reputation * REPUTATION_DECAY_RATE)
    player.marketingThisMonth = []
    checkInsolvency(state, player)
  }
  checkWinner(state)

  if (state.month === 12) {
    endOfYear(state)
    state.month = 1
    state.year++
    addLog(state, null, `Jahr ${state.year} beginnt.`)
  } else {
    state.month++
  }
  state.forecast = makeForecast(state.rng, state.month, 0.8)
}

function growPlot(state: GameState, player: Player, plot: Plot, weather: WeatherKind) {
  if (plot.grape === null || plot.harvestedThisYear || plotAgeFactor(plot, state.year) === 0) return
  const grape = GRAPES[plot.grape]
  const region = REGIONS[player.regionId]

  if (state.month === 7) plot.oechsle = RIPENING_START_OECHSLE

  const base = RIPENING_BASE[state.month]
  if (base) {
    const headroom = Math.max(0, (grape.maxOechsle - plot.oechsle) / (grape.maxOechsle - RIPENING_START_OECHSLE))
    const gain = (base * SUN_FACTOR[weather] * (0.8 + region.warmth * 0.04) * headroom) / grape.ripeningNeed
    plot.oechsle = Math.min(grape.maxOechsle, plot.oechsle + gain)
  }

  if (state.month >= 9 && weather === 'nass') {
    plot.health = Math.max(0, plot.health - 0.15 * grape.rotSusceptibility)
  }
  const rotLoss = ROT_LOSS[state.month]
  if (rotLoss) {
    const wetBonus = weather === 'nass' ? 0.1 * grape.rotSusceptibility : 0
    plot.cropFactor *= 1 - rotLoss - wetBonus
  }
}

/**
 * Hofladen und Online-Shop verkaufen automatisch: zuerst geprüfte Weine und Deutschen Wein,
 * ungeprüfte Prädikatsweine (die nur als Deutscher Wein durchgehen) zuletzt; jeweils älteste zuerst.
 * Zur Prämierung angemeldete Weine bleiben im Lager.
 */
function sellDirect(state: GameState, player: Player) {
  const waitsForTest = (lot: BottleLot) => !lot.registered && lot.level !== 'deutscher-wein'
  const forSale = player.bottles
    .filter((lot) => !player.competitionEntries.includes(lot.id))
    .sort((a, b) => Number(waitsForTest(a)) - Number(waitsForTest(b)))
  let demand = monthlyDemand(player)
  let sold = 0
  let revenue = 0
  for (const lot of forSale) {
    if (demand <= 0) break
    const count = Math.min(demand, lot.bottles)
    revenue += count * bottlePrice(lot, player)
    sold += count
    demand -= count
    removeBottles(player, lot, count)
  }
  if (sold > 0) {
    const net = Math.round(revenue * (1 - DIRECT_SALES_COST_SHARE))
    player.money += net
    addLog(state, player.id, `Ab Hof${player.hasOnlineShop ? ' und online' : ''} ${sold} Flaschen verkauft: +${formatEuro(net)} (nach Vertriebskosten).`)
  }
}

function judgeCompetition(state: GameState, player: Player, competition: CompetitionInfo) {
  for (const lotId of player.competitionEntries) {
    const lot = player.bottles.find((l) => l.id === lotId)
    if (!lot) continue
    const score = competitionBaseScore(lot) + nextRange(state.rng, -5, 5)
    const medal = (['gold', 'silber', 'bronze'] as Medal[]).find((m) => score >= competition.thresholds[m])
    if (!medal) {
      addLog(state, player.id, `${competition.name}: ${wineLabel(lot)} geht leer aus.`)
      continue
    }
    lot.awards.push({ competition: competition.id, year: state.year, medal })
    player.points += competition.points[medal]
    changeReputation(player, competition.reputation[medal])
    addLog(
      state,
      player.id,
      `${competition.name}: ${MEDAL_NAMES[medal]} für ${wineLabel(lot)}! +${competition.points[medal]} Punkte.`,
    )
  }
  player.competitionEntries = []
}

function payMonthlyCosts(state: GameState, player: Player) {
  const upkeep = player.plots.reduce(
    (sum, p) => sum + p.hectares * (p.grape ? VINEYARD_COST_PER_HA : UPKEEP_PER_HA),
    0,
  )
  const interest = (player.loan * LOAN_INTEREST_RATE) / 12
  const overdraft = player.money < 0 ? (-player.money * OVERDRAFT_INTEREST_RATE) / 12 : 0
  const salaries = player.workers * WORKER_SALARY + (player.hasCellarMaster ? CELLAR_MASTER_SALARY : 0)
  player.money -= Math.round(salaries + upkeep + interest + overdraft)
  if (player.money < 0) addLog(state, player.id, `Konto im Minus: ${formatEuro(player.money)}!`)
}

function checkInsolvency(state: GameState, player: Player) {
  const creditExhausted = player.loan >= creditLimit(player)
  if (player.money < 0 && creditExhausted) {
    player.monthsInsolvent++
    if (player.monthsInsolvent >= INSOLVENCY_MONTHS) {
      player.bankrupt = true
      player.competitionEntries = []
      addLog(state, player.id, `${player.name} ist insolvent und scheidet aus.`)
    } else {
      const left = INSOLVENCY_MONTHS - player.monthsInsolvent
      addLog(state, player.id, `Achtung: Kein Kreditrahmen mehr! Noch ${left} Monat${left === 1 ? '' : 'e'} bis zur Insolvenz.`)
    }
  } else {
    player.monthsInsolvent = 0
  }
}

function endOfYear(state: GameState) {
  for (const player of state.players) {
    for (const plot of player.plots) {
      const hadCrop = plot.grape !== null && plotAgeFactor(plot, state.year) > 0
      if (hadCrop && !plot.harvestedThisYear && !player.bankrupt) {
        addLog(state, player.id, `${plot.name}: Trauben nicht gelesen – der Jahrgang ist verloren.`)
      }
      plot.oechsle = 0
      plot.health = 1
      plot.cropFactor = 1
      plot.harvestedThisYear = false
    }
  }
}

/** Erreichen mehrere Spieler das Ziel gleichzeitig, gewinnt die höchste Punktzahl. */
function checkWinner(state: GameState) {
  if (state.winnerId) return
  const best = state.players
    .filter((p) => !p.bankrupt && p.points >= state.targetPoints)
    .sort((a, b) => b.points - a.points)[0]
  if (best) {
    state.winnerId = best.id
    addLog(state, best.id, `${best.name} erreicht ${best.points} Punkte und gewinnt!`)
  }
}

export function wineLabel(wine: WineInfo): string {
  return `${GRAPES[wine.grape].name} ${qualityInfo(wine.level).name} (Jg. ${wine.vintage})`
}

export function formatEuro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
