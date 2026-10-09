import type { GrapeId } from './grapes'

export type RegionId =
  | 'ahr'
  | 'baden'
  | 'franken'
  | 'hessische-bergstrasse'
  | 'mittelrhein'
  | 'mosel'
  | 'nahe'
  | 'pfalz'
  | 'rheingau'
  | 'rheinhessen'
  | 'saale-unstrut'
  | 'sachsen'
  | 'wuerttemberg'

export interface Region {
  id: RegionId
  name: string
  /** 0–10: beschleunigt die Reife */
  warmth: number
  /** 0–10: Spätfrost im Frühjahr, aber auch Chance auf Eiswein */
  frostRisk: number
  /** 0–10: Krankheitsdruck durch Nässe */
  wetness: number
  /** −2 bis +2 je Rebsorte, wirkt auf die Güte */
  suitability: Record<GrapeId, number>
  /** Rebsorte der 4 ha, die zu Spielbeginn bestockt sind */
  startGrape: GrapeId
}

type Suitability = Record<GrapeId, number>

/** Grundeignung: neutral, PIWIs gedeihen überall ordentlich */
const BASE: Suitability = {
  'mueller-thurgau': 0, silvaner: 0, riesling: 0, weissburgunder: 0, grauburgunder: 0,
  spaetburgunder: 0, dornfelder: 0, trollinger: -1, lemberger: -1, regent: 0, solaris: 0,
}

function region(
  id: RegionId,
  name: string,
  climate: { warmth: number; frostRisk: number; wetness: number },
  startGrape: GrapeId,
  suitability: Partial<Suitability>,
): Region {
  return { id, name, ...climate, startGrape, suitability: { ...BASE, ...suitability } }
}

export const REGIONS: Record<RegionId, Region> = {
  ahr: region('ahr', 'Ahr', { warmth: 5, frostRisk: 5, wetness: 4 }, 'spaetburgunder', {
    spaetburgunder: 2, riesling: 0, dornfelder: 0, 'mueller-thurgau': -1, silvaner: -1,
  }),
  baden: region('baden', 'Baden', { warmth: 9, frostRisk: 2, wetness: 6 }, 'grauburgunder', {
    grauburgunder: 2, weissburgunder: 2, spaetburgunder: 2, 'mueller-thurgau': 1, regent: 1, solaris: 1,
  }),
  franken: region('franken', 'Franken', { warmth: 5, frostRisk: 6, wetness: 3 }, 'silvaner', {
    silvaner: 2, 'mueller-thurgau': 2, riesling: 1, spaetburgunder: 1, solaris: 1,
  }),
  'hessische-bergstrasse': region('hessische-bergstrasse', 'Hessische Bergstraße', { warmth: 7, frostRisk: 3, wetness: 5 }, 'riesling', {
    riesling: 2, grauburgunder: 1, spaetburgunder: 1, weissburgunder: 1,
  }),
  mittelrhein: region('mittelrhein', 'Mittelrhein', { warmth: 5, frostRisk: 5, wetness: 5 }, 'riesling', {
    riesling: 2, silvaner: -1, dornfelder: -1,
  }),
  mosel: region('mosel', 'Mosel', { warmth: 4, frostRisk: 6, wetness: 5 }, 'riesling', {
    riesling: 2, silvaner: -1, dornfelder: -1, grauburgunder: -1, trollinger: -2, solaris: 1,
  }),
  nahe: region('nahe', 'Nahe', { warmth: 6, frostRisk: 4, wetness: 4 }, 'riesling', {
    riesling: 2, 'mueller-thurgau': 1, silvaner: 1, dornfelder: 1, weissburgunder: 1, grauburgunder: 1,
  }),
  pfalz: region('pfalz', 'Pfalz', { warmth: 9, frostRisk: 2, wetness: 3 }, 'dornfelder', {
    dornfelder: 2, riesling: 1, spaetburgunder: 1, weissburgunder: 1, grauburgunder: 1,
    trollinger: 0, lemberger: 1, regent: 1,
  }),
  rheingau: region('rheingau', 'Rheingau', { warmth: 6, frostRisk: 4, wetness: 4 }, 'riesling', {
    riesling: 2, spaetburgunder: 2, 'mueller-thurgau': -1, dornfelder: -1,
  }),
  rheinhessen: region('rheinhessen', 'Rheinhessen', { warmth: 7, frostRisk: 3, wetness: 3 }, 'silvaner', {
    'mueller-thurgau': 2, silvaner: 2, riesling: 1, dornfelder: 1, weissburgunder: 1, grauburgunder: 1,
    trollinger: 0, lemberger: 0, regent: 1,
  }),
  'saale-unstrut': region('saale-unstrut', 'Saale-Unstrut', { warmth: 4, frostRisk: 8, wetness: 2 }, 'weissburgunder', {
    'mueller-thurgau': 2, weissburgunder: 2, silvaner: 1, solaris: 2, regent: 1,
    spaetburgunder: -1, trollinger: -2,
  }),
  sachsen: region('sachsen', 'Sachsen', { warmth: 4, frostRisk: 7, wetness: 3 }, 'riesling', {
    'mueller-thurgau': 2, riesling: 1, weissburgunder: 1, grauburgunder: 1, solaris: 2, regent: 1,
    trollinger: -2,
  }),
  wuerttemberg: region('wuerttemberg', 'Württemberg', { warmth: 6, frostRisk: 4, wetness: 5 }, 'lemberger', {
    trollinger: 2, lemberger: 2, riesling: 1, spaetburgunder: 1, dornfelder: 1, regent: 1,
  }),
}
