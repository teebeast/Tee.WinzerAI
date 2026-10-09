export type QualityLevel =
  | 'deutscher-wein'
  | 'qualitaetswein'
  | 'kabinett'
  | 'spaetlese'
  | 'auslese'
  | 'beerenauslese'

export interface QualityInfo {
  level: QualityLevel
  name: string
  minOechsle: number
  /** Siegpunkte bei der amtlichen Prüfung (AP) */
  apPoints: number
  /** Fassweinpreis in €/l bei Güte 60 */
  bulkPricePerLiter: number
  /** Ab-Hof-Grundpreis je Flasche */
  bottlePrice: number
  /** Bonus auf die Wertung bei Prämierungen */
  competitionBonus: number
  /** Monate im Tank bis zur Abfüllreife */
  maturingMonths: number
}

/** Aufsteigend sortiert – die höchste erreichte Stufe gewinnt. */
export const QUALITY_LEVELS: QualityInfo[] = [
  { level: 'deutscher-wein', name: 'Deutscher Wein', minOechsle: 0, apPoints: 0, bulkPricePerLiter: 1.0, bottlePrice: 3, competitionBonus: 0, maturingMonths: 3 },
  { level: 'qualitaetswein', name: 'Qualitätswein', minOechsle: 60, apPoints: 1, bulkPricePerLiter: 1.3, bottlePrice: 5, competitionBonus: 0, maturingMonths: 3 },
  { level: 'kabinett', name: 'Kabinett', minOechsle: 73, apPoints: 2, bulkPricePerLiter: 1.5, bottlePrice: 7, competitionBonus: 2, maturingMonths: 6 },
  { level: 'spaetlese', name: 'Spätlese', minOechsle: 80, apPoints: 4, bulkPricePerLiter: 1.8, bottlePrice: 9, competitionBonus: 4, maturingMonths: 6 },
  { level: 'auslese', name: 'Auslese', minOechsle: 90, apPoints: 8, bulkPricePerLiter: 2.4, bottlePrice: 14, competitionBonus: 7, maturingMonths: 6 },
  { level: 'beerenauslese', name: 'Beerenauslese', minOechsle: 110, apPoints: 15, bulkPricePerLiter: 3.0, bottlePrice: 25, competitionBonus: 10, maturingMonths: 6 },
]

export function levelForOechsle(oechsle: number): QualityInfo {
  let result = QUALITY_LEVELS[0]
  for (const info of QUALITY_LEVELS) {
    if (oechsle >= info.minOechsle) result = info
  }
  return result
}

export function qualityInfo(level: QualityLevel): QualityInfo {
  return QUALITY_LEVELS.find((q) => q.level === level)!
}
