export type GrapeId = 'mueller-thurgau' | 'silvaner' | 'riesling' | 'spaetburgunder' | 'dornfelder'

export interface Grape {
  id: GrapeId
  name: string
  color: 'weiss' | 'rot'
  /** Ertrag in hl/ha bei voll ertragsfähigen Reben */
  yieldPerHa: number
  /** Teiler für den Reifezuwachs: > 1 reift langsamer */
  ripeningNeed: number
  /** Mostgewicht, dem sich die Traube ohne Botrytis annähert */
  maxOechsle: number
  /** 1–10 */
  qualityPotential: number
  /** 0–1: Anfälligkeit für Fäulnis bei nassem Herbst */
  rotSusceptibility: number
  plantCostPerHa: number
}

export const GRAPES: Record<GrapeId, Grape> = {
  'mueller-thurgau': {
    id: 'mueller-thurgau', name: 'Müller-Thurgau', color: 'weiss',
    yieldPerHa: 110, ripeningNeed: 0.85, maxOechsle: 90, qualityPotential: 4,
    rotSusceptibility: 0.8, plantCostPerHa: 18_000,
  },
  silvaner: {
    id: 'silvaner', name: 'Silvaner', color: 'weiss',
    yieldPerHa: 95, ripeningNeed: 1.0, maxOechsle: 105, qualityPotential: 6,
    rotSusceptibility: 0.5, plantCostPerHa: 20_000,
  },
  riesling: {
    id: 'riesling', name: 'Riesling', color: 'weiss',
    yieldPerHa: 80, ripeningNeed: 1.15, maxOechsle: 125, qualityPotential: 9,
    rotSusceptibility: 0.3, plantCostPerHa: 22_000,
  },
  spaetburgunder: {
    id: 'spaetburgunder', name: 'Spätburgunder', color: 'rot',
    yieldPerHa: 70, ripeningNeed: 1.15, maxOechsle: 115, qualityPotential: 9,
    rotSusceptibility: 0.8, plantCostPerHa: 25_000,
  },
  dornfelder: {
    id: 'dornfelder', name: 'Dornfelder', color: 'rot',
    yieldPerHa: 120, ripeningNeed: 0.85, maxOechsle: 92, qualityPotential: 4,
    rotSusceptibility: 0.5, plantCostPerHa: 18_000,
  },
}
