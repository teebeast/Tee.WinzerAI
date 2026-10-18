/**
 * Markttrends: Jede Rebsorte und Sekt hat eine Beliebtheit, die als Faktor auf alle Verkaufspreise wirkt.
 * Ab und zu ändert sich das Ziel – dann wandert der Wert über viele Monate dorthin. Neue Reben tragen erst
 * im dritten Jahr: Wer pflanzt, wettet auf den Markt von übermorgen.
 */
import { TREND_NEWS_THRESHOLD, TREND_RANGE, TREND_SHIFT_CHANCE, TREND_SPEED } from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { nextFloat } from './rng'
import type { GameState, Trend, TrendKey, WineInfo } from './types'
import { addLog } from './util'

export const TREND_KEYS: TrendKey[] = [...(Object.keys(GRAPES) as GrapeId[]), 'sekt', 'rose']

export const trendName = (key: TrendKey) => (key === 'sekt' ? 'Sekt' : key === 'rose' ? 'Rosé' : GRAPES[key].name)

const round = (value: number) => Math.round(value * 100) / 100
const clamp = (value: number) => Math.min(TREND_RANGE[1], Math.max(TREND_RANGE[0], value))

/** Neues Ziel: meist in der Nähe von 100 %, selten ein echter Boom oder Absturz */
function drawTarget(state: GameState): number {
  const spread = nextFloat(state.rng) + nextFloat(state.rng) - 1 // −1 … 1, Häufung um 0
  return round(clamp(1 + spread * 0.4))
}

export function initTrends(state: GameState) {
  state.trends = {} as Record<TrendKey, Trend>
  for (const key of TREND_KEYS) {
    const value = round(clamp(1 + (nextFloat(state.rng) - 0.5) * 0.3))
    state.trends[key] = { value, target: value }
  }
}

/** Monatsende: Werte wandern ans Ziel, gelegentlich dreht der Markt. */
export function updateTrends(state: GameState) {
  for (const key of TREND_KEYS) {
    const trend = state.trends[key]
    if (nextFloat(state.rng) < TREND_SHIFT_CHANCE) {
      const target = drawTarget(state)
      const change = target - trend.value
      trend.target = target
      if (Math.abs(change) >= TREND_NEWS_THRESHOLD) {
        addLog(
          state,
          null,
          change > 0
            ? `📈 Markttrend: ${trendName(key)} ist zunehmend gefragt – die Preise ziehen in den nächsten Monaten an.`
            : `📉 Markttrend: ${trendName(key)} kommt aus der Mode – die Preise geben in den nächsten Monaten nach.`,
          change > 0 ? 'good' : 'bad',
        )
      }
    }
    trend.value = round(trend.value + (trend.target - trend.value) * TREND_SPEED)
  }
}

/** Preisfaktor für einen Wein: Sekt und Rosé folgen ihrem eigenen Trend, alles andere dem der Rebsorte */
export function trendFactor(state: GameState, wine: Pick<WineInfo, 'grape' | 'rose'> & { sparkling?: boolean }): number {
  return state.trends[wine.sparkling ? 'sekt' : wine.rose ? 'rose' : wine.grape].value
}

/** Für ältere Spielstände: fehlende Trends nachtragen */
export function ensureTrends(state: GameState) {
  for (const key of TREND_KEYS) state.trends[key] ??= { value: 1, target: 1 }
}

/** Richtung für die Anzeige: steigend, fallend oder stabil */
export function trendDirection(trend: Trend): 'up' | 'down' | 'flat' {
  const gap = trend.target - trend.value
  return gap > 0.03 ? 'up' : gap < -0.03 ? 'down' : 'flat'
}
