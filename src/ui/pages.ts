import type { HintArea } from '../engine/advisor'

/** Unterseiten des Spielbildschirms */
export type Page = HintArea | 'rangliste'

export const PAGES: { id: Page; icon: string; label: string }[] = [
  { id: 'hof', icon: '🏡', label: 'Hof' },
  { id: 'weinberg', icon: '🍇', label: 'Weinberg' },
  { id: 'keller', icon: '🍷', label: 'Keller' },
  { id: 'auftraege', icon: '📦', label: 'Aufträge' },
  { id: 'betrieb', icon: '🏛️', label: 'Betrieb' },
  { id: 'rangliste', icon: '🏆', label: 'Rangliste' },
]

export function pageInfo(id: Page) {
  return PAGES.find((p) => p.id === id)!
}
