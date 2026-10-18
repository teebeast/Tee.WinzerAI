/**
 * Kellermeister mit Talent und Fähigkeiten: Er hebt die Güte jeder Lese, manche Weinarten (Sekt, Barrique)
 * gibt es nur mit dem passenden Können. Jeden Januar bewerben sich neue Kandidaten.
 */
import {
  CELLAR_MASTER_BASE_SALARY,
  CELLAR_MASTER_CANDIDATES,
  CELLAR_MASTER_MAX_EXPERIENCE,
  CELLAR_MASTER_SALARY_PER_SKILL,
  CELLAR_MASTER_SALARY_PER_TALENT,
  CELLAR_MASTER_YEARS_PER_EXPERIENCE,
} from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { nextFloat } from './rng'
import type { CellarMaster, CellarSkill, GameState, Player } from './types'
import { addLog, formatEuro } from './util'

export const SKILLS: Record<CellarSkill, { icon: string; name: string; text: string }> = {
  sekt: { icon: '🍾', name: 'Sekt', text: 'beherrscht die Flaschengärung – Voraussetzung für Sekt' },
  barrique: { icon: '🛢️', name: 'Barrique', text: 'kennt den Ausbau im Eichenfass – Voraussetzung für Barriqueweine' },
  rotwein: { icon: '🍷', name: 'Rotwein', text: '+3 Güte bei roten Sorten' },
  weisswein: { icon: '🥂', name: 'Weißwein', text: '+3 Güte bei weißen Sorten' },
  edelsuess: { icon: '🍯', name: 'Edelsüß', text: '+4 Güte ab Auslese-Mostgewicht (95 °Oe)' },
  sparsam: { icon: '💡', name: 'Sparsam', text: '25 % weniger Kosten fürs Abfüllen und die Sektherstellung' },
}

const COLOR_BONUS = 3
const SWEET_BONUS = 4
const SWEET_OECHSLE = 95
const THRIFT_FACTOR = 0.75

const NAMES = [
  'Karl Brenner', 'Marie Lehmann', 'Jonas Weidinger', 'Lena Hofmann', 'Paul Kessler', 'Sophie Rieger', 'Anton Bauer',
  'Clara Winkler', 'Felix Gruber', 'Hannah Scholz', 'Matthias Engel', 'Julia Kranz', 'Tobias Hahn', 'Eva Lindner',
  'Ralf Schreiber', 'Nora Feldmann', 'Georg Maurer', 'Ines Kaufmann',
]

export const hasSkill = (player: Player, skill: CellarSkill) => player.cellarMaster?.skills.includes(skill) ?? false

/** Dienstjahre bringen Erfahrung: +1 Güte alle vier Jahre, höchstens +2 */
export function experience(master: CellarMaster, year: number): number {
  if (master.hiredYear === null) return 0
  return Math.min(CELLAR_MASTER_MAX_EXPERIENCE, Math.floor((year - master.hiredYear) / CELLAR_MASTER_YEARS_PER_EXPERIENCE))
}

/** Güte-Zuschlag des Kellermeisters für eine Lese dieser Sorte mit diesem Mostgewicht */
export function cellarMasterBonus(player: Player, grape: GrapeId, oechsle: number, year: number): number {
  const master = player.cellarMaster
  if (!master) return 0
  const color = GRAPES[grape].color
  return (
    master.talent +
    experience(master, year) +
    (color === 'rot' && master.skills.includes('rotwein') ? COLOR_BONUS : 0) +
    (color !== 'rot' && master.skills.includes('weisswein') ? COLOR_BONUS : 0) +
    (oechsle >= SWEET_OECHSLE && master.skills.includes('edelsuess') ? SWEET_BONUS : 0)
  )
}

/** Faktor auf Flaschen- und Sektkosten */
export const bottlingCostFactor = (player: Player) => (hasSkill(player, 'sparsam') ? THRIFT_FACTOR : 1)

export function salaryFor(talent: number, skills: CellarSkill[]): number {
  const raw = CELLAR_MASTER_BASE_SALARY + talent * CELLAR_MASTER_SALARY_PER_TALENT + skills.length * CELLAR_MASTER_SALARY_PER_SKILL
  return Math.round(raw / 100) * 100
}

/** Neue Bewerber zum Jahresbeginn: Talent 1–5, ein bis drei Fähigkeiten */
export function refreshCandidates(state: GameState) {
  const roll = () => nextFloat(state.rng)
  const taken = new Set(state.players.map((p) => p.cellarMaster?.name))
  const names = NAMES.filter((n) => !taken.has(n))
  const all = Object.keys(SKILLS) as CellarSkill[]
  state.cellarMasterCandidates = Array.from({ length: CELLAR_MASTER_CANDIDATES }, () => {
    const name = names.splice(Math.floor(roll() * names.length), 1)[0]
    const talent = 1 + Math.floor(roll() * 5)
    const pool = [...all]
    const count = 1 + Math.floor(roll() * 3)
    const skills = Array.from({ length: count }, () => pool.splice(Math.floor(roll() * pool.length), 1)[0])
    return { name, talent, skills, salary: salaryFor(talent, skills), hiredYear: null }
  })
}

export function validateHire(state: GameState, player: Player, candidate: number): string | null {
  const master = state.cellarMasterCandidates[candidate]
  if (!master) return 'Diese Bewerbung liegt nicht vor.'
  if (player.money < master.salary) return `Nicht genug Geld für das erste Gehalt (${formatEuro(master.salary)}).`
  return null
}

/** Einstellen; ein bisheriger Kellermeister geht. */
export function hire(state: GameState, player: Player, candidate: number) {
  const master = state.cellarMasterCandidates.splice(candidate, 1)[0]
  const previous = player.cellarMaster
  player.cellarMaster = { ...master, hiredYear: state.year }
  addLog(
    state,
    player.id,
    `${master.name} ist dein neuer Kellermeister (${formatEuro(master.salary)}/Monat)${previous ? ` und löst ${previous.name} ab` : ''}.`,
  )
}

export function fire(state: GameState, player: Player) {
  const master = player.cellarMaster!
  player.cellarMaster = null
  addLog(state, player.id, `Kellermeister ${master.name} ist entlassen.`)
}

/** Kurzbeschreibung für Logbuch und Oberfläche */
export function describeMaster(master: CellarMaster, year: number): string {
  const skills = master.skills.map((s) => SKILLS[s].name).join(', ')
  const bonus = master.talent + experience(master, year)
  return `+${bonus} Güte${skills ? ` · ${skills}` : ''}`
}
