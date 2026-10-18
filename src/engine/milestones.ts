/**
 * Meilensteine: Zwischenziele quer durchs Spiel, vor allem fürs Endlosspiel. Jeder Meilenstein bringt ein paar Punkte
 * und etwas Bekanntheit und wird mit Datum in der Chronik des Weinguts festgehalten – unabhängig vom Logbuch.
 */
import { gameMonth } from './bio'
import { netWorth, totalHectares } from './market'
import { changeReputation, levelRank } from './rules'
import type { GameState, Player, PlayerStats } from './types'
import { addLog } from './util'

export type Tier = 'bronze' | 'silber' | 'gold'

export interface MilestoneDef {
  id: string
  icon: string
  name: string
  text: string
  tier: Tier
  /** Fortschritt als [erreicht, Ziel] */
  progress: (state: GameState, player: Player) => [number, number]
}

export const TIER_REWARDS: Record<Tier, { points: number; reputation: number; icon: string; name: string }> = {
  bronze: { points: 1, reputation: 1, icon: '🥉', name: 'Bronze' },
  silber: { points: 3, reputation: 2, icon: '🥈', name: 'Silber' },
  gold: { points: 5, reputation: 4, icon: '🥇', name: 'Gold' },
}

export function emptyStats(): PlayerStats {
  return {
    harvests: 0, bestLevelRank: -1, edelsuess: 0, sekt: 0, barrique: 0, bottlesSold: 0,
    medals: 0, goldMedals: 0, ordersDelivered: 0, exportsCompleted: 0, auctionsWon: 0,
  }
}

const stat = (key: keyof PlayerStats, target: number) => (_: GameState, p: Player): [number, number] => [p.stats[key], target]
const flag = (test: (s: GameState, p: Player) => boolean) => (s: GameState, p: Player): [number, number] => [test(s, p) ? 1 : 0, 1]

export const MILESTONES: MilestoneDef[] = [
  // Weinberg und Keller
  { id: 'erste-lese', icon: '✂️', name: 'Erste Lese', text: 'Den ersten eigenen Jahrgang gelesen.', tier: 'bronze', progress: stat('harvests', 1) },
  {
    id: 'auslese', icon: '🍇', name: 'Auslese', text: 'Eine Lese mit mindestens Auslese-Mostgewicht eingebracht.', tier: 'silber',
    progress: (_, p) => [Math.min(p.stats.bestLevelRank, levelRank('auslese')), levelRank('auslese')],
  },
  { id: 'edelsuess', icon: '🍯', name: 'Edelsüß', text: 'Beerenauslese, Trockenbeerenauslese oder Eiswein gelesen.', tier: 'gold', progress: stat('edelsuess', 1) },
  { id: 'sekt', icon: '🍾', name: 'Prickelnd', text: 'Den ersten Sekt angesetzt.', tier: 'bronze', progress: stat('sekt', 1) },
  { id: 'barrique', icon: '🛢️', name: 'Im Eichenfass', text: 'Den ersten Wein ins Barrique gelegt.', tier: 'bronze', progress: stat('barrique', 1) },
  { id: 'lesen-25', icon: '🧺', name: 'Erfahrene Hand', text: '25 Lesen eingebracht.', tier: 'silber', progress: stat('harvests', 25) },

  // Wachstum
  { id: 'flaeche-20', icon: '🗺️', name: 'Stattliches Gut', text: '20 Hektar Rebfläche.', tier: 'silber', progress: (_, p) => [totalHectares(p), 20] },
  { id: 'flaeche-50', icon: '🏞️', name: 'Großweingut', text: '50 Hektar Rebfläche.', tier: 'gold', progress: (_, p) => [totalHectares(p), 50] },
  { id: 'versteigerung', icon: '🔨', name: 'Zuschlag!', text: 'Einen Weinberg ersteigert.', tier: 'bronze', progress: stat('auctionsWon', 1) },
  {
    id: 'vermoegen-1m', icon: '💶', name: 'Millionär', text: 'Reinvermögen von 1 Mio. €.', tier: 'silber',
    progress: (_, p) => [Math.round(netWorth(p) / 1000), 1000],
  },
  {
    id: 'vermoegen-5m', icon: '💰', name: 'Weinbaron', text: 'Reinvermögen von 5 Mio. €.', tier: 'gold',
    progress: (_, p) => [Math.round(netWorth(p) / 1000), 5000],
  },
  {
    id: 'schuldenfrei', icon: '🧾', name: 'Schuldenfrei', text: 'Ab Jahr 3 ohne Kredit und mit mindestens 100.000 € auf dem Konto.', tier: 'silber',
    progress: flag((s, p) => s.year >= 3 && p.loan === 0 && p.money >= 100_000),
  },

  // Markt und Ansehen
  { id: 'flaschen-10k', icon: '🍷', name: 'Gut im Geschäft', text: '10.000 Flaschen verkauft.', tier: 'bronze', progress: stat('bottlesSold', 10_000) },
  { id: 'flaschen-200k', icon: '🚚', name: 'Marktgröße', text: '200.000 Flaschen verkauft.', tier: 'gold', progress: stat('bottlesSold', 200_000) },
  { id: 'medaille', icon: '🏅', name: 'Prämiert', text: 'Die erste Medaille gewonnen.', tier: 'bronze', progress: stat('medals', 1) },
  { id: 'gold', icon: '🥇', name: 'Goldrichtig', text: 'Die erste Goldmedaille gewonnen.', tier: 'silber', progress: stat('goldMedals', 1) },
  { id: 'medaillen-10', icon: '🎖️', name: 'Medaillensammler', text: '10 Medaillen gewonnen.', tier: 'gold', progress: stat('medals', 10) },
  { id: 'auftraege-5', icon: '📦', name: 'Verlässlicher Lieferant', text: '5 Kundenaufträge geliefert.', tier: 'silber', progress: stat('ordersDelivered', 5) },
  { id: 'export', icon: '🌍', name: 'Weltweit', text: 'Einen Exportvertrag vollständig erfüllt.', tier: 'silber', progress: stat('exportsCompleted', 1) },
  { id: 'bekanntheit-50', icon: '⭐', name: 'Gefragt', text: 'Bekanntheit 50.', tier: 'silber', progress: (_, p) => [Math.floor(p.reputation), 50] },
  { id: 'bekanntheit-80', icon: '🌟', name: 'Kultweingut', text: 'Bekanntheit 80.', tier: 'gold', progress: (_, p) => [Math.floor(p.reputation), 80] },

  // Betrieb
  { id: 'vinothek', icon: '🏠', name: 'Probierstube', text: 'Eine Vinothek eröffnet.', tier: 'bronze', progress: flag((_, p) => p.hasVinothek) },
  { id: 'onlineshop', icon: '🛒', name: 'Online', text: 'Einen Online-Shop gestartet.', tier: 'bronze', progress: flag((_, p) => p.hasOnlineShop) },
  { id: 'bio', icon: '🌿', name: 'Bio-zertifiziert', text: 'Das erste Bio-Siegel erhalten.', tier: 'silber', progress: flag((_, p) => p.bioLabel !== null) },
  { id: 'lunaris', icon: '🌙', name: 'Biodynamisch', text: 'Das Lunaris-Siegel erhalten.', tier: 'gold', progress: flag((_, p) => p.bioLabel === 'biodynamisch') },
  {
    id: 'zehn-jahre', icon: '🎂', name: 'Zehn Jahre', text: 'Zehn Jahre lang ein Weingut geführt.', tier: 'silber',
    progress: (s) => [Math.min(10, s.year - 1), 10],
  },
]

export const isReached = (state: GameState, player: Player, def: MilestoneDef) => {
  const [value, target] = def.progress(state, player)
  return value >= target
}

/**
 * Monatsende: neu erreichte Meilensteine eintragen und belohnen. `silent` trägt nur ein – für alte Spielstände,
 * damit dort nichts rückwirkend Punkte bringt.
 */
export function checkMilestones(state: GameState, silent = false) {
  const now = gameMonth(state)
  for (const player of state.players.filter((p) => !p.bankrupt)) {
    for (const def of MILESTONES) {
      if (player.milestones[def.id] !== undefined || !isReached(state, player, def)) continue
      player.milestones[def.id] = now
      if (silent) continue
      const reward = TIER_REWARDS[def.tier]
      player.points += reward.points
      changeReputation(player, reward.reputation)
      addLog(
        state,
        def.tier === 'gold' ? null : player.id,
        `🏆 Meilenstein ${reward.icon} „${def.name}“${def.tier === 'gold' ? ` für ${player.name}` : ''}: ${def.text} +${reward.points} Punkte.`,
        'good',
      )
    }
  }
}
