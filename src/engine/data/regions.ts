import type { GrapeId } from './grapes'

export type RegionId = 'mosel' | 'pfalz' | 'rheinhessen'

export interface Region {
  id: RegionId
  name: string
  /** 0–10: beschleunigt die Reife */
  warmth: number
  /** −2 bis +2 je Rebsorte, wirkt auf die Güte */
  suitability: Record<GrapeId, number>
  /** Rebsorte der 4 ha, die zu Spielbeginn bestockt sind */
  startGrape: GrapeId
}

export const REGIONS: Record<RegionId, Region> = {
  mosel: {
    id: 'mosel', name: 'Mosel', warmth: 4, startGrape: 'riesling',
    suitability: { riesling: 2, 'mueller-thurgau': 0, silvaner: -1, spaetburgunder: 0, dornfelder: -1 },
  },
  pfalz: {
    id: 'pfalz', name: 'Pfalz', warmth: 9, startGrape: 'dornfelder',
    suitability: { riesling: 1, 'mueller-thurgau': 0, silvaner: 0, spaetburgunder: 1, dornfelder: 2 },
  },
  rheinhessen: {
    id: 'rheinhessen', name: 'Rheinhessen', warmth: 7, startGrape: 'mueller-thurgau',
    suitability: { riesling: 1, 'mueller-thurgau': 2, silvaner: 2, spaetburgunder: 0, dornfelder: 1 },
  },
}
