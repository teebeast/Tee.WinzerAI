import {
  HARVEST_COST_PER_HA,
  ICE_WINE_BASE_CHANCE,
  ICE_WINE_CHANCE_PER_FROST_RISK,
  ICE_WINE_MIN_OECHSLE,
  ICE_WINE_YIELD_SHARE,
  PROTECTION,
} from './data/economy'
import { GRAPES } from './data/grapes'
import { REGIONS, type RegionId } from './data/regions'
import { nextFloat } from './rng'
import { computeQuality, plotAgeFactor, storeWine } from './rules'
import type { GameState, Player, Plot, ProtectionStrategy } from './types'
import { addLog, formatEuro } from './util'
import { SUN_FACTOR, type WeatherKind } from './weather'

/** Basis-Reifezuwachs in °Oe am Ende des jeweiligen Monats */
const RIPENING_BASE: Record<number, number> = { 8: 20, 9: 18, 10: 12, 11: 5 }
export const RIPENING_START_OECHSLE = 45
/** Mengenverlust durch Fäulnis am Ende des Monats */
const ROT_LOSS: Record<number, number> = { 10: 0.05, 11: 0.25 }
/** Edelfäule: Chance bei wechselhaftem Herbstwetter (Morgennebel, Nachmittagssonne) */
const BOTRYTIS_CHANCE = 0.35
const BOTRYTIS_OECHSLE = 30

function bearing(state: GameState, plot: Plot): boolean {
  return plot.grape !== null && !plot.harvestedThisYear && plotAgeFactor(plot, state.year) > 0
}

/** Reife, Fäulnis, Krankheiten und Edelfäule einer Parzelle am Monatsende */
export function growPlot(state: GameState, player: Player, plot: Plot, weather: WeatherKind) {
  if (!bearing(state, plot)) return
  const grape = GRAPES[plot.grape!]
  const region = REGIONS[player.regionId]
  const shield = 1 - PROTECTION[player.protection].protection
  const roll = () => nextFloat(state.rng)

  if (state.month === 7) plot.oechsle = RIPENING_START_OECHSLE

  const base = RIPENING_BASE[state.month]
  if (base && plot.oechsle < grape.maxOechsle) {
    const headroom = (grape.maxOechsle - plot.oechsle) / (grape.maxOechsle - RIPENING_START_OECHSLE)
    const gain = (base * SUN_FACTOR[weather] * (0.8 + region.warmth * 0.04) * headroom) / grape.ripeningNeed
    plot.oechsle = Math.min(grape.maxOechsle, plot.oechsle + gain)
  }

  // Pilzkrankheiten und Schädlinge – Pflanzenschutz senkt das Risiko
  if (state.month >= 5 && state.month <= 8 && weather === 'nass') {
    if (roll() < 0.4 * grape.diseaseSusceptibility * (0.5 + region.wetness / 10) * shield) {
      plot.cropFactor *= 0.7
      addLog(state, player.id, `${plot.name}: Peronospora (Falscher Mehltau) – rund 30 % weniger Ertrag.`)
    }
  }
  if (state.month >= 6 && state.month <= 8 && weather === 'sonnig') {
    if (roll() < 0.25 * grape.diseaseSusceptibility * shield) {
      plot.health = Math.max(0, plot.health - 0.2)
      addLog(state, player.id, `${plot.name}: Oidium (Echter Mehltau) – die Trauben leiden.`)
    }
  }
  if (state.month === 9 && grape.color === 'rot' && roll() < 0.3 * shield) {
    plot.cropFactor *= 0.85
    plot.health = Math.max(0, plot.health - 0.1)
    addLog(state, player.id, `${plot.name}: Die Kirschessigfliege ist da – Verluste bei den roten Trauben.`)
  }

  if (state.month >= 9 && weather === 'nass') {
    plot.health = Math.max(0, plot.health - 0.15 * grape.rotSusceptibility)
  }
  const rotLoss = ROT_LOSS[state.month]
  if (rotLoss) {
    const wetBonus = weather === 'nass' ? 0.1 * grape.rotSusceptibility : 0
    plot.cropFactor *= 1 - rotLoss - wetBonus
  }

  // Edelfäule: Fluch für die Menge, Segen fürs Mostgewicht
  if ((state.month === 10 || state.month === 11) && weather === 'wechselhaft' && plot.oechsle >= 80) {
    if (roll() < BOTRYTIS_CHANCE * (0.5 + grape.rotSusceptibility)) {
      plot.oechsle += BOTRYTIS_OECHSLE
      plot.cropFactor *= plot.botrytis ? 0.6 : 0.5
      addLog(
        state,
        player.id,
        plot.botrytis
          ? `${plot.name}: Die Beeren schrumpfen zu Rosinen – ${Math.round(plot.oechsle)} °Oe!`
          : `${plot.name}: Edelfäule (Botrytis)! Weniger Menge, aber ${Math.round(plot.oechsle)} °Oe.`,
      )
      plot.botrytis = true
    }
  }
}

/** Wetterereignisse, die den ganzen Betrieb treffen: Spätfrost, Hagel, Hitzewelle */
export function vineyardEvents(state: GameState, player: Player, weather: WeatherKind) {
  const plots = player.plots.filter((p) => bearing(state, p))
  if (plots.length === 0) return
  const region = REGIONS[player.regionId]

  if ((state.month === 4 || state.month === 5) && nextFloat(state.rng) < region.frostRisk * 0.01) {
    for (const plot of plots) plot.cropFactor *= 0.6
    addLog(state, player.id, 'Spätfrost! Die jungen Triebe sind erfroren – rund 40 % weniger Ertrag in diesem Jahr.')
  }
  if (state.month >= 6 && state.month <= 8 && nextFloat(state.rng) < 0.04) {
    const plot = plots[Math.floor(nextFloat(state.rng) * plots.length)]
    plot.cropFactor *= 0.5
    plot.health = Math.max(0, plot.health - 0.1)
    addLog(state, player.id, `Hagelschlag über ${plot.name} – die Hälfte der Trauben ist zerstört.`)
  }
  if ((state.month === 7 || state.month === 8) && weather === 'sonnig' && nextFloat(state.rng) < 0.15) {
    for (const plot of plots) {
      plot.cropFactor *= 0.9
      plot.oechsle += 4
      plot.health = Math.max(0, plot.health - 0.05)
    }
    addLog(state, player.id, 'Hitzewelle: Sonnenbrand an den Trauben, etwas weniger Menge, dafür süßer.')
  }
}

export function iceWineChance(regionId: RegionId): number {
  return ICE_WINE_BASE_CHANCE + REGIONS[regionId].frostRisk * ICE_WINE_CHANCE_PER_FROST_RISK
}

export function validateIceWineGamble(state: GameState, player: Player, plotId: string, gamble: boolean): string | null {
  const plot = player.plots.find((p) => p.id === plotId)
  if (!plot) return 'Unbekannte Parzelle.'
  if (!gamble) return plot.iceWineGamble ? null : 'Die Parzelle ist nicht für Eiswein vorgesehen.'
  if (state.month !== 11 && state.month !== 12) return 'Für Eiswein entscheidet man im November oder Dezember.'
  if (!bearing(state, plot)) return 'Hier hängen keine Trauben mehr.'
  if (plot.iceWineGamble) return 'Die Trauben hängen bereits für Eiswein.'
  if (plot.oechsle < ICE_WINE_MIN_OECHSLE) return `Für Eiswein braucht es mindestens ${ICE_WINE_MIN_OECHSLE} °Oe.`
  return null
}

/**
 * Ende Dezember: Bei starkem Frost werden die gefrorenen Trauben zu Eiswein gelesen,
 * sonst sind sie verloren. `frost` wird je Anbaugebiet einmal ausgewürfelt.
 */
export function resolveIceWine(state: GameState, player: Player, frost: boolean) {
  for (const plot of player.plots.filter((p) => p.iceWineGamble && bearing(state, p))) {
    plot.harvestedThisYear = true
    if (!frost) {
      addLog(state, player.id, `${plot.name}: Kein Frost – die Trauben für den Eiswein sind verloren.`)
      continue
    }
    const grape = GRAPES[plot.grape!]
    const oechsle = Math.max(125, plot.oechsle + 40)
    const hectoliters = Math.round(
      plot.hectares * grape.yieldPerHa * plotAgeFactor(plot, state.year) * ICE_WINE_YIELD_SHARE * plot.cropFactor * (0.6 + 0.4 * plot.health),
    )
    const cost = Math.round(plot.hectares * HARVEST_COST_PER_HA * 1.5)
    player.money -= cost
    storeWine(state, player, {
      grape: grape.id,
      vintage: state.year,
      hectoliters,
      oechsle: Math.round(oechsle),
      level: 'eiswein',
      quality: computeQuality(player, plot, oechsle),
    })
    addLog(
      state,
      player.id,
      `Klirrender Frost! ${plot.name}: ${hectoliters} hl Eiswein mit ${Math.round(oechsle)} °Oe gelesen (${formatEuro(cost)}).`,
    )
  }
}

export function validateProtection(player: Player, strategy: ProtectionStrategy): string | null {
  return player.protection === strategy ? 'Diese Strategie ist bereits gewählt.' : null
}

export function setProtection(state: GameState, player: Player, strategy: ProtectionStrategy) {
  player.protection = strategy
  player.bioSinceYear = strategy === 'bio' ? state.year : null
  addLog(
    state,
    player.id,
    strategy === 'bio'
      ? 'Umstellung auf Bio-Weinbau begonnen – zertifiziert in drei Jahren.'
      : `Pflanzenschutz: ${PROTECTION[strategy].name}.`,
  )
}
