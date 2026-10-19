import {
  announceAuction,
  auctionBid,
  auctionPass,
  finishAuction,
  parcelValue,
  scheduleNextAuction,
  setAuctionLimit,
  startLiveAuction,
  validateAuctionBid,
  validateAuctionLimit,
  validateAuctionPass,
} from './auction'
import {
  bottle,
  expandBarrique,
  makeSekt,
  matureCellar,
  toBarrique,
  validateBottle,
  validateExpandBarrique,
  validateSekt,
  validateToBarrique,
} from './cellar'
import {
  AUTO_SKIP_MONTHS,
  CLEARING_COST_PER_HA,
  COMPETITIONS,
  DIFFICULTIES,
  DIRECT_SALES_COST_SHARE,
  HARVEST_COST_PER_HA,
  INSOLVENCY_MONTHS,
  MARKETING,
  MEDAL_NAMES,
  ONLINE_SHOP_COST,
  PLOT_SALE_SHARE,
  REGISTER_FEE,
  REGISTER_MIN_BOTTLES,
  REPUTATION_DECAY_RATE,
  SLOPE_HARVEST_FACTOR,
  START_REPUTATION,
  START_TANK_HL,
  TANK_COST_PER_HL,
  VINOTHEK_COST,
  VINOTHEK_REPUTATION,
  type CompetitionInfo,
} from './data/economy'
import { GRAPES } from './data/grapes'
import { levelForOechsle, qualityInfo, type QualityLevel } from './data/quality'
import { REGIONS, type RegionId } from './data/regions'
import { applyBioLabel, bioInfo, chargeBioFees, gameMonth, validateBioLabel } from './bio'
import { fire, hire, refreshCandidates, validateHire } from './cellarmaster'
import {
  acceptOrder,
  declineOrder,
  deliverOrder,
  expireOrders,
  maybeOfferOrder,
  validateAccept,
  validateDecline,
  validateDeliver,
} from './orders'
import { decide, expireDecision, monthlyEvent, validateDecide } from './decisions'
import { insure, install, setFrostCandles, validateFrostCandles, validateInstall, validateInsurance } from './defense'
import { marketEvents, tickEffects } from './events'
import { monthlyRivalry } from './rivals'
import { openStrauss, sellFederweisser, validateFederweisser, validateStrauss } from './products'
import { checkMilestones, emptyStats } from './milestones'
import { initTrends, updateTrends } from './trends'
import { answerExport, deliverExport, maybeOfferExport, validateAnswerExport } from './exports'
import { adulterate, inspectAtRegistration, randomControl, sabotage, validateAdulterate, validateSabotage } from './intrigue'
import {
  availableCredit,
  bottlePrice,
  bulkPricePerHl,
  competitionBaseScore,
  creditLimit,
  monthlyCosts,
  monthlyDemand,
  registrationPoints,
  upcomingCompetition,
  wholesalePrice,
} from './market'
import { nextFloat, nextRange } from './rng'
import {
  changeReputation,
  computeQuality,
  currentPlayer,
  HARVEST_MONTHS,
  hasPointTarget,
  isEndless,
  levelRank,
  NO_POINT_TARGET,
  PLANT_MONTHS,
  plotAgeFactor,
  removeBatchVolume,
  removeBottles,
  storeWine,
  usedTankHl,
  wineLabel,
} from './rules'
import type { Action, BottleLot, GameState, Medal, NewGameOptions, Player, Plot } from './types'
import { addLog, formatEuro, newId } from './util'
import {
  growPlot,
  iceWineChance,
  resolveIceWine,
  setProtection,
  validateIceWineGamble,
  validateProtection,
  vineyardEvents,
} from './vineyard'
import { drawWeather, makeForecast, WEATHER_LABELS } from './weather'

// Bewährte Exporte für Oberfläche und KI
export {
  computeQuality,
  currentPlayer,
  formatEuro,
  HARVEST_MONTHS,
  hasPointTarget,
  isEndless,
  NO_POINT_TARGET,
  PLANT_MONTHS,
  plotAgeFactor,
  usedTankHl,
  wineLabel,
}

/** Anteil der möglichen Menge je nach Lesemonat */
const HARVEST_TIMING: Record<number, number> = { 8: 0.7, 9: 0.9, 10: 1, 11: 1, 12: 1 }

export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

export class RuleError extends Error {}

export function newGame(options: NewGameOptions): GameState {
  const state: GameState = {
    version: 17,
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
    auction: null,
    monthsToAuction: 0,
    randomEvents: options.randomEvents ?? true,
    cellarMasterCandidates: [],
    trends: {} as GameState['trends'],
    bulkCrisisMonths: 0,
    climateChange: options.climateChange ?? true,
    yearLimit: options.yearLimit ?? null,
    challenge: options.challenge ?? null,
    difficulty: options.difficulty ?? 'normal',
    nextId: 1,
    log: [],
  }
  const start = options.start ?? {}
  state.players = options.players.map((p, i) => {
    const region = REGIONS[p.regionId]
    const ai = p.ai ?? null
    const difficulty = ai ? null : state.difficulty
    // Szenarien geben das Startkapital vor, sonst gilt das des Schwierigkeitsgrads
    const money = start.money ?? DIFFICULTIES[difficulty ?? 'normal'].startMoney
    const oldVines = start.plots === 'planted'
    const fallow = start.plots === 'fallow'
    return {
      id: `p${i + 1}`,
      name: p.name,
      regionId: p.regionId,
      ai,
      difficulty,
      money,
      points: 0,
      reputation: start.reputation ?? START_REPUTATION,
      loan: start.loan ?? 0,
      tankCapacityHl: start.tankHl ?? START_TANK_HL,
      barriqueCapacityHl: 0,
      hasOnlineShop: false,
      hasVinothek: false,
      wholesaleThisYear: 0,
      cellarMaster: null,
      plots: [
        makePlot(state, 'Hauslage', 4, fallow ? null : region.startGrape, fallow ? null : -10, 0),
        makePlot(state, 'Südhang', 3, oldVines ? region.startGrape : null, oldVines ? -10 : null, 1),
        makePlot(state, 'Talweg', 3, oldVines ? region.startGrape : null, oldVines ? -10 : null, -1),
      ],
      cellar: [],
      bottles: [],
      marketingThisMonth: [],
      competitionEntries: [],
      protection: 'conventional',
      bioSince: null,
      bioLabel: null,
      bioLabelSince: null,
      orderOffers: [],
      orders: [],
      relations: {},
      stats: emptyStats(),
      milestones: {},
      federweisserThisMonth: 0,
      straussYear: null,
      autoSkip: null,
      intrigueThisMonth: false,
      exportOffer: null,
      exportContract: null,
      monthsInsolvent: 0,
      bankrupt: false,
      effects: [],
      decision: null,
      insuredYear: null,
      frostCandles: false,
    }
  })
  scheduleNextAuction(state)
  refreshCandidates(state)
  initTrends(state)
  state.forecast = makeForecast(state.rng, state.month, 0.8)
  addLog(
    state,
    null,
    state.yearLimit
      ? `Jahr 1 beginnt. Wer nach ${state.yearLimit} Jahren die meisten Punkte hat, gewinnt.`
      : isEndless(state)
        ? 'Jahr 1 beginnt. Endlosspiel: kein Punkteziel, kein Zeitlimit – baue dein Weingut in Ruhe aus.'
        : `Jahr 1 beginnt. Ziel: ${state.targetPoints} Punkte.`,
  )
  return state
}

function makePlot(
  state: GameState,
  name: string,
  hectares: number,
  grape: Plot['grape'],
  plantedYear: number | null,
  site: number,
): Plot {
  return {
    id: newId(state, 'plot'),
    name,
    hectares,
    grape,
    plantedYear,
    site,
    oechsle: 0,
    health: 1,
    cropFactor: 1,
    harvestedThisYear: false,
    botrytis: false,
    iceWineGamble: false,
  }
}

/** Erlös beim Verkauf eines Weinbergs */
export function plotSalePrice(player: Player, plot: Plot, year: number): number {
  return Math.round((parcelValue({ ...plot, regionId: player.regionId }, year) * PLOT_SALE_SHARE) / 1000) * 1000
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
    REGIONS[player.regionId].character.yieldFactor *
    plotAgeFactor(plot, state.year) *
    plot.cropFactor *
    (bioInfo(player)?.yieldFactor ?? 1) *
    (HARVEST_TIMING[state.month] ?? 0) *
    (0.6 + 0.4 * plot.health)
  return {
    hectoliters: Math.round(hectoliters),
    level: levelForOechsle(plot.oechsle).level,
    quality: computeQuality(player, plot, state.year),
    // Steillagen werden von Hand gelesen
    cost: Math.round(plot.hectares * HARVEST_COST_PER_HA * (1 + REGIONS[player.regionId].character.slope * SLOPE_HARVEST_FACTOR)),
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
      if (action.rose && GRAPES[plot.grape].color !== 'rot') return 'Rosé gibt es nur aus roten Trauben.'
      return null
    }
    case 'sellBulk': {
      const batch = findBatch(action.batchId)
      if (!batch) return 'Unbekannte Charge.'
      if (!(action.hectoliters > 0) || action.hectoliters > batch.hectoliters) return 'Ungültige Menge.'
      return null
    }
    case 'bottle':
      return validateBottle(player, action.batchId, action.hectoliters)
    case 'makeSekt':
      return validateSekt(player, action.batchId, action.hectoliters)
    case 'register': {
      const lot = findLot(action.lotId)
      if (!lot) return 'Unbekannter Flaschenposten.'
      if (lot.registered) return 'Der Wein ist bereits geprüft.'
      if (lot.monthsUntilReady > 0) return 'Der Sekt reift noch.'
      if (lot.level === 'deutscher-wein' && !lot.sparkling) return 'Deutscher Wein braucht keine Prüfung.'
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
    case 'hireCellarMaster':
      return validateHire(state, player, action.candidate)
    case 'fireCellarMaster':
      return player.cellarMaster ? null : 'Es ist kein Kellermeister angestellt.'
    case 'borrow':
      if (!Number.isInteger(action.amount) || action.amount <= 0) return 'Ungültiger Betrag.'
      if (action.amount > availableCredit(player)) return `Kreditrahmen reicht nur für ${formatEuro(availableCredit(player))}.`
      return null
    case 'repay':
      if (!Number.isInteger(action.amount) || action.amount <= 0 || action.amount > player.loan) return 'Ungültiger Betrag.'
      if (action.amount > player.money) return 'Nicht genug Geld auf dem Konto.'
      return null
    case 'auctionLimit':
      return validateAuctionLimit(state, player, action.lotId, action.amount)
    case 'auctionBid':
      return validateAuctionBid(state, action.lotId, action.amount)
    case 'auctionPass':
      return validateAuctionPass(state, action.lotId)
    case 'decide':
      return validateDecide(player, action.option)
    case 'installHailNet':
      return validateInstall(player, action.plotId, 'hailNet')
    case 'installIrrigation':
      return validateInstall(player, action.plotId, 'irrigation')
    case 'insureHarvest':
      return validateInsurance(state, player)
    case 'frostCandles':
      return validateFrostCandles(state, player)
    case 'applyBioLabel':
      return validateBioLabel(state, player)
    case 'sellFederweisser':
      return validateFederweisser(state, player, action.batchId, action.hectoliters)
    case 'openStrausswirtschaft':
      return validateStrauss(state, player)
    case 'acceptOrder':
      return validateAccept(player, action.orderId)
    case 'declineOrder':
      return validateDecline(player, action.orderId)
    case 'deliverOrder':
      return validateDeliver(player, action.orderId)
    case 'sellPlot': {
      const plot = player.plots.find((p) => p.id === action.plotId)
      if (!plot) return 'Unbekannte Parzelle.'
      if (player.plots.length <= 1) return 'Die letzte Parzelle kann nicht verkauft werden.'
      return null
    }
    case 'clearPlot': {
      const plot = player.plots.find((p) => p.id === action.plotId)
      if (!plot) return 'Unbekannte Parzelle.'
      if (plot.grape === null) return 'Die Parzelle liegt bereits brach.'
      const cost = plot.hectares * CLEARING_COST_PER_HA
      if (player.money < cost) return `Nicht genug Geld (benötigt ${formatEuro(cost)}).`
      return null
    }
    case 'setProtection':
      return validateProtection(player, action.strategy)
    case 'gambleIceWine':
      return validateIceWineGamble(state, player, action.plotId, action.gamble)
    case 'adulterate':
      return validateAdulterate(player, action.batchId, action.method)
    case 'sabotage':
      return validateSabotage(state, player, action.targetId, action.kind)
    case 'answerExport':
      return validateAnswerExport(player)
    case 'expandBarrique':
      return validateExpandBarrique(player, action.hectoliters)
    case 'toBarrique':
      return validateToBarrique(player, action.batchId)
    case 'buildVinothek':
      if (player.hasVinothek) return 'Die Vinothek steht bereits.'
      if (player.money < VINOTHEK_COST) return `Nicht genug Geld (benötigt ${formatEuro(VINOTHEK_COST)}).`
      return null
    case 'endTurn':
      return null
    case 'autoSkip':
      return player.ai !== null ? 'Computergegner spulen nicht vor.' : null
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
      harvest(next, player, player.plots.find((p) => p.id === action.plotId)!, action.rose ?? false)
      break
    case 'sellBulk': {
      const batch = batchOf(action.batchId)
      const revenue = Math.round(bulkPricePerHl(batch, next, player) * action.hectoliters)
      player.money += revenue
      removeBatchVolume(player, batch, action.hectoliters)
      addLog(next, player.id, `${action.hectoliters} hl ${wineLabel(batch)} als Fasswein verkauft: +${formatEuro(revenue)}.`)
      break
    }
    case 'bottle':
      bottle(next, player, action.batchId, action.hectoliters)
      break
    case 'makeSekt':
      makeSekt(next, player, action.batchId, action.hectoliters)
      break
    case 'register': {
      const lot = lotOf(action.lotId)
      player.money -= REGISTER_FEE
      if (inspectAtRegistration(next, player, lot)) break
      const points = registrationPoints(lot)
      player.points += points
      lot.registered = true
      addLog(next, player.id, `${wineLabel(lot)} hat die amtliche Prüfung bestanden: +${points} Punkte.`)
      checkWinner(next)
      break
    }
    case 'sellWholesale': {
      const lot = lotOf(action.lotId)
      const revenue = Math.round(wholesalePrice(lot, player, next) * action.bottles)
      player.money += revenue
      player.wholesaleThisYear += action.bottles
      player.stats.bottlesSold += action.bottles
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
    case 'hireCellarMaster':
      hire(next, player, action.candidate)
      break
    case 'fireCellarMaster':
      fire(next, player)
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
    case 'auctionLimit':
      setAuctionLimit(next, player, action.lotId, action.amount)
      break
    // Live-Gebote gelten für den Menschen, der bei der Versteigerung gerade an der Reihe ist – nicht für den Spieler am Zug.
    case 'auctionBid':
      auctionBid(next, action.lotId, action.amount)
      break
    case 'auctionPass':
      auctionPass(next, action.lotId)
      break
    case 'decide':
      decide(next, player, action.option)
      break
    case 'installHailNet':
      install(next, player, action.plotId, 'hailNet')
      break
    case 'installIrrigation':
      install(next, player, action.plotId, 'irrigation')
      break
    case 'insureHarvest':
      insure(next, player)
      break
    case 'frostCandles':
      setFrostCandles(next, player)
      break
    case 'applyBioLabel':
      applyBioLabel(next, player)
      break
    case 'sellFederweisser':
      sellFederweisser(next, player, action.batchId, action.hectoliters)
      break
    case 'openStrausswirtschaft':
      openStrauss(next, player)
      break
    case 'acceptOrder':
      acceptOrder(next, player, action.orderId)
      break
    case 'declineOrder':
      declineOrder(next, player, action.orderId)
      break
    case 'deliverOrder':
      deliverOrder(next, player, action.orderId)
      checkWinner(next)
      break
    case 'sellPlot': {
      const plot = player.plots.find((p) => p.id === action.plotId)!
      const price = plotSalePrice(player, plot, next.year)
      player.money += price
      player.plots = player.plots.filter((p) => p.id !== plot.id)
      addLog(next, player.id, `${plot.name} (${plot.hectares} ha) für ${formatEuro(price)} verkauft.`)
      break
    }
    case 'clearPlot': {
      const plot = player.plots.find((p) => p.id === action.plotId)!
      const cost = plot.hectares * CLEARING_COST_PER_HA
      const grape = GRAPES[plot.grape!].name
      player.money -= cost
      Object.assign(plot, {
        grape: null, plantedYear: null, oechsle: 0, health: 1, cropFactor: 1,
        harvestedThisYear: false, botrytis: false, iceWineGamble: false,
      })
      // Computergegner roden öffentlich – so sieht man, wohin der Markt läuft
      addLog(
        next,
        player.ai ? null : player.id,
        player.ai
          ? `${player.name} rodet ${grape} in der Lage ${plot.name} und pflanzt im Frühjahr neu.`
          : `${plot.name}: ${grape} gerodet (${formatEuro(cost)}). Neu gepflanzt wird im März oder April.`,
      )
      break
    }
    case 'setProtection':
      setProtection(next, player, action.strategy)
      break
    case 'gambleIceWine': {
      const plot = player.plots.find((p) => p.id === action.plotId)!
      plot.iceWineGamble = action.gamble
      addLog(
        next,
        player.id,
        action.gamble
          ? `${plot.name}: Die Trauben bleiben für Eiswein hängen. Jetzt braucht es Frost.`
          : `${plot.name}: Doch kein Eiswein – die Trauben können normal gelesen werden.`,
      )
      break
    }
    case 'adulterate':
      adulterate(next, player, action.batchId, action.method)
      break
    case 'sabotage':
      sabotage(next, player, action.targetId, action.kind)
      break
    case 'answerExport':
      answerExport(next, player, action.accept)
      break
    case 'expandBarrique':
      expandBarrique(next, player, action.hectoliters)
      break
    case 'toBarrique':
      toBarrique(next, player, action.batchId)
      break
    case 'buildVinothek':
      player.money -= VINOTHEK_COST
      player.hasVinothek = true
      changeReputation(player, VINOTHEK_REPUTATION)
      addLog(next, null, `${player.name} eröffnet eine Vinothek mit Probierstube.`)
      break
    case 'endTurn':
      endTurn(next)
      break
    case 'autoSkip':
      player.autoSkip = { since: gameMonth(next), until: gameMonth(next) + AUTO_SKIP_MONTHS }
      endTurn(next)
      break
  }
  return next
}

function harvest(state: GameState, player: Player, plot: Plot, rose = false) {
  const preview = harvestPreview(state, player, plot)
  player.money -= preview.cost
  player.stats.harvests++
  player.stats.bestLevelRank = Math.max(player.stats.bestLevelRank, levelRank(preview.level))
  if (preview.level === 'beerenauslese' || preview.level === 'trockenbeerenauslese') player.stats.edelsuess++
  plot.harvestedThisYear = true
  plot.iceWineGamble = false
  addLog(
    state,
    player.id,
    `${plot.name}: ${preview.hectoliters} hl ${GRAPES[plot.grape!].name}${rose ? ' für Rosé' : ''} gelesen, ${Math.round(plot.oechsle)} °Oe, ` +
      `${qualityInfo(preview.level).name}, Güte ${preview.quality}.`,
  )
  storeWine(state, player, {
    grape: plot.grape!,
    vintage: state.year,
    hectoliters: preview.hectoliters,
    oechsle: Math.round(plot.oechsle),
    level: preview.level,
    quality: preview.quality,
    ...(rose ? { rose: true } : {}),
  })
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
  if (state.auction?.phase === 'live') finishAuction(state)
  marketEvents(state)
  updateTrends(state)

  // Eiswein-Frost wird je Anbaugebiet einmal ausgewürfelt
  const frost = new Map<RegionId, boolean>()
  if (state.month === 12) {
    for (const regionId of new Set(state.players.map((p) => p.regionId))) {
      frost.set(regionId, nextFloat(state.rng) < iceWineChance(state, regionId))
    }
  }

  for (const player of state.players) {
    if (player.bankrupt) continue
    for (const plot of player.plots) growPlot(state, player, plot, weather)
    vineyardEvents(state, player, weather)
    if (state.month === 12) resolveIceWine(state, player, frost.get(player.regionId) ?? false)
    matureCellar(state, player)
    deliverExport(state, player)
    sellDirect(state, player)
    if (competition) judgeCompetition(state, player, competition)
    randomControl(state, player)
    tickEffects(state, player)
    expireDecision(state, player)
    if (state.randomEvents) monthlyEvent(state, player)
    payMonthlyCosts(state, player)
    changeReputation(player, -player.reputation * REPUTATION_DECAY_RATE)
    player.marketingThisMonth = []
    player.frostCandles = false
    player.federweisserThisMonth = 0
    player.intrigueThisMonth = false
    maybeOfferExport(state, player)
    expireOrders(state, player)
    maybeOfferOrder(state, player)
    checkInsolvency(state, player)
  }
  if (state.randomEvents) monthlyRivalry(state)
  checkMilestones(state)
  checkWinner(state)

  if (state.month === 12) {
    endOfYear(state)
    state.month = 1
    state.year++
    if (state.yearLimit && state.year > state.yearLimit) {
      finishByTime(state)
      return
    }
    addLog(state, null, `Jahr ${state.year} beginnt.`)
    refreshCandidates(state)
    for (const player of state.players) if (!player.bankrupt) chargeBioFees(state, player)
  } else {
    state.month++
  }
  if (state.auction?.phase === 'announced') startLiveAuction(state)
  else if (!state.auction && --state.monthsToAuction <= 0) announceAuction(state)
  state.forecast = makeForecast(state.rng, state.month, 0.8)
}

/**
 * Hofladen und Online-Shop verkaufen automatisch geprüfte Weine und Deutschen Wein, älteste zuerst.
 * Ungeprüfte Prädikatsweine und ungeprüfter Sekt warten auf die Prüfung – nur Restposten, die für eine
 * Prüfung zu klein sind, gehen als einfacher Wein weg. Reifender Sekt und Prämierungsweine bleiben im Lager.
 */
function sellDirect(state: GameState, player: Player) {
  const waitsForTest = (lot: BottleLot) =>
    !lot.registered && (lot.sparkling || lot.level !== 'deutscher-wein') && lot.bottles >= REGISTER_MIN_BOTTLES
  const forSale = player.bottles.filter(
    (lot) => !player.competitionEntries.includes(lot.id) && lot.monthsUntilReady === 0 && !waitsForTest(lot),
  )
  let demand = monthlyDemand(player)
  let sold = 0
  let revenue = 0
  for (const lot of forSale) {
    if (demand <= 0) break
    const count = Math.min(demand, lot.bottles)
    revenue += count * bottlePrice(lot, player, state)
    sold += count
    player.stats.bottlesSold += count
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
    player.stats.medals++
    if (medal === 'gold') player.stats.goldMedals++
    changeReputation(player, competition.reputation[medal])
    addLog(
      state,
      null,
      `${competition.name}: ${MEDAL_NAMES[medal]} für ${player.name} – ${wineLabel(lot)}! +${competition.points[medal]} Punkte.`,
    )
  }
  player.competitionEntries = []
}

function payMonthlyCosts(state: GameState, player: Player) {
  player.money -= monthlyCosts(player, state.month).total
  if (player.money < 0) addLog(state, player.id, `Konto im Minus: ${formatEuro(player.money)}!`)
}

function checkInsolvency(state: GameState, player: Player) {
  const creditExhausted = player.loan >= creditLimit(player)
  if (player.money < 0 && creditExhausted) {
    player.monthsInsolvent++
    if (player.monthsInsolvent >= INSOLVENCY_MONTHS) {
      player.bankrupt = true
      player.competitionEntries = []
      player.exportContract = null
      player.exportOffer = null
      addLog(state, null, `${player.name} ist insolvent und scheidet aus.`)
    } else {
      const left = INSOLVENCY_MONTHS - player.monthsInsolvent
      addLog(state, player.id, `Achtung: Kein Kreditrahmen mehr! Noch ${left} Monat${left === 1 ? '' : 'e'} bis zur Insolvenz.`)
    }
  } else {
    player.monthsInsolvent = 0
  }
}

/** Zeitlimit erreicht: Die meisten Punkte gewinnen, auch unterhalb des Punkteziels. */
function finishByTime(state: GameState) {
  state.finished = true
  state.year = state.yearLimit!
  state.month = 12
  const best = state.players.filter((p) => !p.bankrupt).sort((a, b) => b.points - a.points)[0]
  if (!state.winnerId && best) state.winnerId = best.id
  addLog(state, null, `Nach ${state.yearLimit} Jahren ist Schluss${best ? `: ${best.name} liegt mit ${best.points} Punkten vorn` : ''}.`)
}

function endOfYear(state: GameState) {
  for (const player of state.players) {
    player.wholesaleThisYear = 0
    for (const plot of player.plots) {
      const hadCrop = plot.grape !== null && plotAgeFactor(plot, state.year) > 0
      if (hadCrop && !plot.harvestedThisYear && !player.bankrupt) {
        addLog(state, player.id, `${plot.name}: Trauben nicht gelesen – der Jahrgang ist verloren.`)
      }
      plot.oechsle = 0
      plot.health = 1
      plot.cropFactor = 1
      plot.harvestedThisYear = false
      plot.botrytis = false
      plot.iceWineGamble = false
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
    addLog(state, null, `${best.name} erreicht ${best.points} Punkte und gewinnt!`)
  }
}
