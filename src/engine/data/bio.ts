import type { BioLabel, Player } from '../types'
import { BIO_CONVERSION_MONTHS } from './economy'

export interface BioLabelInfo {
  name: string
  icon: string
  /** Was nötig ist, bevor das Siegel beantragt werden kann */
  requires: 'conversion' | BioLabel
  /** Monate in der Vorstufe */
  waitMonths: number
  fee: number
  annualFee: number
  /** Aufschlag auf alle Flaschenpreise */
  priceBonus: number
  /** Zusätzliche Ab-Hof-Nachfrage durch Bio-Stammkundschaft */
  demandBonus: number
  /** Bekanntheit bei Verleihung */
  reputation: number
  /** Güte-Zuschlag bei jeder Lese */
  quality: number
  /** Mehrkosten im Pflanzenschutz und Ertragsminus (biodynamische Präparate, Handarbeit) */
  protectionCostFactor: number
  yieldFactor: number
  text: string
}

export const BIO_ORDER: BioLabel[] = ['basis', 'verband', 'biodynamisch']

export const BIO_LABELS: Record<BioLabel, BioLabelInfo> = {
  basis: {
    name: 'Grünblatt', icon: '🍃', requires: 'conversion', waitMonths: BIO_CONVERSION_MONTHS,
    fee: 1_500, annualFee: 600, priceBonus: 0.1, demandBonus: 0, reputation: 2, quality: 0,
    protectionCostFactor: 1, yieldFactor: 1,
    text: 'Das gesetzliche Mindestmaß: kein chemisch-synthetischer Pflanzenschutz, regelmäßige Kontrollen.',
  },
  verband: {
    name: 'Terravita', icon: '🌿', requires: 'basis', waitMonths: 12,
    fee: 3_000, annualFee: 1_500, priceBonus: 0.18, demandBonus: 0.1, reputation: 4, quality: 0,
    protectionCostFactor: 1, yieldFactor: 1,
    text: 'Anbauverband mit strengeren Regeln als das Grünblatt-Siegel – bei Kunden bekannter und geschätzt.',
  },
  biodynamisch: {
    name: 'Lunaris', icon: '🌙', requires: 'verband', waitMonths: 12,
    fee: 5_000, annualFee: 2_500, priceBonus: 0.28, demandBonus: 0.15, reputation: 8, quality: 2,
    protectionCostFactor: 1.25, yieldFactor: 0.95,
    text: 'Biodynamisch: Präparate, Mondkalender, viel Handarbeit. Etwas weniger Ertrag, dafür charaktervolle Weine.',
  },
}

export const bioInfo = (player: Player) => (player.bioLabel ? BIO_LABELS[player.bioLabel] : null)
