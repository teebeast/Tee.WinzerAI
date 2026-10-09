import { GRAPES } from './data/grapes'
import { levelForOechsle, qualityInfo, type QualityLevel } from './data/quality'
import { REGIONS } from './data/regions'
import type { Action, GameState, NewGameOptions, Player, Plot, WineBatch } from './types'
import { drawWeather, makeForecast, SUN_FACTOR, WEATHER_LABELS, type WeatherKind } from './weather'

// Startwerte fürs Balancing, siehe docs/spieldesign.md
export const START_MONEY = 80_000
export const START_TANK_HL = 300
export const WORKER_SALARY = 3_000
export const UPKEEP_PER_HA = 50
export const HARVEST_COST_PER_HA = 1_500
export const REGISTER_FEE = 150
export const REGISTER_MIN_HL = 5
export const OVERFLOW_PRICE_PER_LITER = 0.5
export const PLANT_MONTHS = [3, 4]
export const HARVEST_MONTHS = [8, 9, 10, 11, 12]
const MAX_LOG = 200

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
    version: 1,
    rng: { state: options.seed },
    year: 1,
    month: 1,
    players: [],
    currentPlayer: 0,
    forecast: { sonnig: 0, wechselhaft: 0, nass: 0 },
    lastWeather: null,
    targetPoints: options.targetPoints ?? 600,
    winnerId: null,
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
      tankCapacityHl: START_TANK_HL,
      workers: 1,
      plots: [
        makePlot(state, 'Hauslage', 4, region.startGrape, -10),
        makePlot(state, 'Südhang', 3, null, null),
        makePlot(state, 'Talweg', 3, null, null),
      ],
      cellar: [],
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
  const raw =
    20 + grape.qualityPotential * 4 + suitability * 6 + (plot.oechsle - 70) * 0.6 + (plot.health - 0.5) * 20
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

export function bulkPricePerHl(batch: WineBatch): number {
  return qualityInfo(batch.level).bulkPricePerLiter * 100 * (0.7 + batch.quality / 200)
}

/** Liefert eine Fehlermeldung, wenn die Aktion gerade nicht erlaubt ist, sonst null. */
export function validateAction(state: GameState, action: Action): string | null {
  if (state.winnerId) return 'Das Spiel ist beendet.'
  const player = currentPlayer(state)

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
      const batch = player.cellar.find((b) => b.id === action.batchId)
      if (!batch) return 'Unbekannte Charge.'
      if (!(action.hectoliters > 0) || action.hectoliters > batch.hectoliters) return 'Ungültige Menge.'
      return null
    }
    case 'register': {
      const batch = player.cellar.find((b) => b.id === action.batchId)
      if (!batch) return 'Unbekannte Charge.'
      if (batch.registered) return 'Die Charge ist bereits geprüft.'
      if (batch.monthsUntilReady > 0) return 'Der Wein ist noch nicht ausgebaut.'
      if (batch.level === 'deutscher-wein') return 'Deutscher Wein braucht keine Prüfung.'
      if (batch.hectoliters < REGISTER_MIN_HL) return `Mindestens ${REGISTER_MIN_HL} hl für eine Prüfung.`
      if (player.money < REGISTER_FEE) return 'Nicht genug Geld für die Prüfgebühr.'
      return null
    }
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
      const batch = player.cellar.find((b) => b.id === action.batchId)!
      const revenue = Math.round(bulkPricePerHl(batch) * action.hectoliters)
      player.money += revenue
      batch.hectoliters -= action.hectoliters
      if (batch.hectoliters <= 0.001) player.cellar = player.cellar.filter((b) => b.id !== batch.id)
      addLog(next, player.id, `${action.hectoliters} hl ${batchLabel(batch)} als Fasswein verkauft: +${formatEuro(revenue)}.`)
      break
    }
    case 'register': {
      const batch = player.cellar.find((b) => b.id === action.batchId)!
      const points = qualityInfo(batch.level).apPoints
      player.money -= REGISTER_FEE
      player.points += points
      batch.registered = true
      addLog(next, player.id, `${batchLabel(batch)} hat die amtliche Prüfung bestanden: +${points} Punkte.`)
      checkWinner(next, player)
      break
    }
    case 'endTurn':
      next.currentPlayer++
      if (next.currentPlayer >= next.players.length) {
        next.currentPlayer = 0
        resolveMonth(next)
      }
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
      registered: false,
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

function resolveMonth(state: GameState) {
  const weather = drawWeather(state.rng, state.forecast)
  state.lastWeather = weather
  addLog(state, null, `Wetter im ${MONTH_NAMES[state.month - 1]}: ${WEATHER_LABELS[weather]}.`)

  for (const player of state.players) {
    for (const plot of player.plots) growPlot(state, player, plot, weather)
    for (const batch of player.cellar) {
      if (batch.monthsUntilReady > 0) {
        batch.monthsUntilReady--
        if (batch.monthsUntilReady === 0) addLog(state, player.id, `${batchLabel(batch)} ist ausgebaut.`)
      }
    }
    const hectares = player.plots.reduce((sum, p) => sum + p.hectares, 0)
    const costs = player.workers * WORKER_SALARY + hectares * UPKEEP_PER_HA
    player.money -= costs
    if (player.money < 0) addLog(state, player.id, `Konto im Minus: ${formatEuro(player.money)}!`)
  }

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

function endOfYear(state: GameState) {
  for (const player of state.players) {
    for (const plot of player.plots) {
      const hadCrop = plot.grape !== null && plotAgeFactor(plot, state.year) > 0
      if (hadCrop && !plot.harvestedThisYear) {
        addLog(state, player.id, `${plot.name}: Trauben nicht gelesen – der Jahrgang ist verloren.`)
      }
      plot.oechsle = 0
      plot.health = 1
      plot.cropFactor = 1
      plot.harvestedThisYear = false
    }
  }
}

function checkWinner(state: GameState, player: Player) {
  if (!state.winnerId && player.points >= state.targetPoints) {
    state.winnerId = player.id
    addLog(state, player.id, `${player.name} erreicht ${player.points} Punkte und gewinnt!`)
  }
}

export function batchLabel(batch: WineBatch): string {
  return `${GRAPES[batch.grape].name} ${qualityInfo(batch.level).name} (Jg. ${batch.vintage})`
}

export function formatEuro(value: number): string {
  return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}
