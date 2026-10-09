export type GrapeId =
  | 'mueller-thurgau'
  | 'silvaner'
  | 'riesling'
  | 'weissburgunder'
  | 'grauburgunder'
  | 'spaetburgunder'
  | 'dornfelder'
  | 'trollinger'
  | 'lemberger'
  | 'regent'
  | 'solaris'

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
  /** 0–1: Anfälligkeit für Pilzkrankheiten (Peronospora, Oidium) */
  diseaseSusceptibility: number
  plantCostPerHa: number
  /** Pilzwiderstandsfähige Neuzüchtung: kaum Krankheiten, aber weniger Prestige */
  piwi?: boolean
}

export const GRAPES: Record<GrapeId, Grape> = {
  'mueller-thurgau': {
    id: 'mueller-thurgau', name: 'Müller-Thurgau', color: 'weiss',
    yieldPerHa: 110, ripeningNeed: 0.85, maxOechsle: 90, qualityPotential: 4,
    rotSusceptibility: 0.8, diseaseSusceptibility: 0.5, plantCostPerHa: 18_000,
  },
  silvaner: {
    id: 'silvaner', name: 'Silvaner', color: 'weiss',
    yieldPerHa: 95, ripeningNeed: 1.0, maxOechsle: 105, qualityPotential: 6,
    rotSusceptibility: 0.5, diseaseSusceptibility: 0.5, plantCostPerHa: 20_000,
  },
  riesling: {
    id: 'riesling', name: 'Riesling', color: 'weiss',
    yieldPerHa: 80, ripeningNeed: 1.15, maxOechsle: 125, qualityPotential: 9,
    rotSusceptibility: 0.3, diseaseSusceptibility: 0.5, plantCostPerHa: 22_000,
  },
  weissburgunder: {
    id: 'weissburgunder', name: 'Weißburgunder', color: 'weiss',
    yieldPerHa: 85, ripeningNeed: 1.0, maxOechsle: 110, qualityPotential: 7,
    rotSusceptibility: 0.5, diseaseSusceptibility: 0.5, plantCostPerHa: 22_000,
  },
  grauburgunder: {
    id: 'grauburgunder', name: 'Grauburgunder', color: 'weiss',
    yieldPerHa: 85, ripeningNeed: 1.0, maxOechsle: 115, qualityPotential: 7,
    rotSusceptibility: 0.8, diseaseSusceptibility: 0.5, plantCostPerHa: 22_000,
  },
  spaetburgunder: {
    id: 'spaetburgunder', name: 'Spätburgunder', color: 'rot',
    yieldPerHa: 70, ripeningNeed: 1.15, maxOechsle: 115, qualityPotential: 9,
    rotSusceptibility: 0.8, diseaseSusceptibility: 0.8, plantCostPerHa: 25_000,
  },
  dornfelder: {
    id: 'dornfelder', name: 'Dornfelder', color: 'rot',
    yieldPerHa: 120, ripeningNeed: 0.85, maxOechsle: 92, qualityPotential: 4,
    rotSusceptibility: 0.5, diseaseSusceptibility: 0.5, plantCostPerHa: 18_000,
  },
  trollinger: {
    id: 'trollinger', name: 'Trollinger', color: 'rot',
    yieldPerHa: 120, ripeningNeed: 1.15, maxOechsle: 90, qualityPotential: 3,
    rotSusceptibility: 0.5, diseaseSusceptibility: 0.5, plantCostPerHa: 18_000,
  },
  lemberger: {
    id: 'lemberger', name: 'Lemberger', color: 'rot',
    yieldPerHa: 90, ripeningNeed: 1.15, maxOechsle: 105, qualityPotential: 7,
    rotSusceptibility: 0.3, diseaseSusceptibility: 0.5, plantCostPerHa: 22_000,
  },
  regent: {
    id: 'regent', name: 'Regent (PIWI)', color: 'rot',
    yieldPerHa: 85, ripeningNeed: 1.0, maxOechsle: 100, qualityPotential: 5,
    rotSusceptibility: 0.3, diseaseSusceptibility: 0.1, plantCostPerHa: 20_000, piwi: true,
  },
  solaris: {
    id: 'solaris', name: 'Solaris (PIWI)', color: 'weiss',
    yieldPerHa: 75, ripeningNeed: 0.75, maxOechsle: 110, qualityPotential: 5,
    rotSusceptibility: 0.3, diseaseSusceptibility: 0.1, plantCostPerHa: 20_000, piwi: true,
  },
}
