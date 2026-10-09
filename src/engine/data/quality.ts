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
  /** Monate im Tank bis zur Abfüllreife */
  maturingMonths: number
}

/** Aufsteigend sortiert – die höchste erreichte Stufe gewinnt. */
export const QUALITY_LEVELS: QualityInfo[] = [
  { level: 'deutscher-wein', name: 'Deutscher Wein', minOechsle: 0, apPoints: 0, bulkPricePerLiter: 0.8, maturingMonths: 3 },
  { level: 'qualitaetswein', name: 'Qualitätswein', minOechsle: 60, apPoints: 1, bulkPricePerLiter: 1.0, maturingMonths: 3 },
  { level: 'kabinett', name: 'Kabinett', minOechsle: 73, apPoints: 2, bulkPricePerLiter: 1.2, maturingMonths: 6 },
  { level: 'spaetlese', name: 'Spätlese', minOechsle: 80, apPoints: 4, bulkPricePerLiter: 1.5, maturingMonths: 6 },
  { level: 'auslese', name: 'Auslese', minOechsle: 90, apPoints: 8, bulkPricePerLiter: 2.0, maturingMonths: 6 },
  { level: 'beerenauslese', name: 'Beerenauslese', minOechsle: 110, apPoints: 15, bulkPricePerLiter: 2.5, maturingMonths: 6 },
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
