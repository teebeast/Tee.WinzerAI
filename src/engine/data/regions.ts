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
  character: RegionCharacter
}

/** Was ein Gebiet jenseits des Klimas ausmacht */
export interface RegionCharacter {
  /** Anteil der Steillagen 0–1: teurere Handarbeit, aber mehr Güte */
  slope: number
  /** Renommee −1 (Geheimtipp) bis +2 (weltberühmt): wirkt auf die Flaschenpreise */
  prestige: number
  /** Weintourismus 0–2: mehr Kundschaft ab Hof */
  tourism: number
  /** Ertragsniveau als Faktor auf die Erntemenge */
  yieldFactor: number
  /** Bodenpreis als Faktor auf den Wert der Weinberge */
  landPrice: number
  /** Kurzporträt für die Oberfläche */
  profile: string
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
  character: RegionCharacter,
): Region {
  return { id, name, ...climate, startGrape, suitability: { ...BASE, ...suitability }, character }
}

const c = (slope: number, prestige: number, tourism: number, yieldFactor: number, landPrice: number, profile: string): RegionCharacter =>
  ({ slope, prestige, tourism, yieldFactor, landPrice, profile })

export const REGIONS: Record<RegionId, Region> = {
  ahr: region('ahr', 'Ahr', { warmth: 5, frostRisk: 5, wetness: 4 }, 'spaetburgunder', {
    spaetburgunder: 2, riesling: 0, dornfelder: 0, 'mueller-thurgau': -1, silvaner: -1,
  }, c(0.6, 1, 2, 0.95, 1.1, 'Kleines Rotweintal mit steilen Schieferhängen und vielen Ausflüglern.')),
  baden: region('baden', 'Baden', { warmth: 9, frostRisk: 2, wetness: 6 }, 'grauburgunder', {
    grauburgunder: 2, weissburgunder: 2, spaetburgunder: 2, 'mueller-thurgau': 1, regent: 1, solaris: 1,
  }, c(0.2, 1, 1, 1.0, 1.0, 'Sonnigstes Gebiet: Burgunder in Hülle und Fülle, solide Nachfrage.')),
  franken: region('franken', 'Franken', { warmth: 5, frostRisk: 6, wetness: 3 }, 'silvaner', {
    silvaner: 2, 'mueller-thurgau': 2, riesling: 1, spaetburgunder: 1, solaris: 1,
  }, c(0.3, 1, 1, 0.95, 0.9, 'Silvaner im Bocksbeutel, eigenwillig und bodenständig – Frost ist ein Thema.')),
  'hessische-bergstrasse': region('hessische-bergstrasse', 'Hessische Bergstraße', { warmth: 7, frostRisk: 3, wetness: 5 }, 'riesling', {
    riesling: 2, grauburgunder: 1, spaetburgunder: 1, weissburgunder: 1,
  }, c(0.3, 0, 1, 0.95, 0.9, 'Kleines, mildes Gebiet an der Bergstraße – wenig bekannt, gute Rieslinge.')),
  mittelrhein: region('mittelrhein', 'Mittelrhein', { warmth: 5, frostRisk: 5, wetness: 5 }, 'riesling', {
    riesling: 2, silvaner: -1, dornfelder: -1,
  }, c(0.8, 1, 2, 0.9, 0.9, 'Fast nur Steillagen im romantischen Welterbe-Rheintal: viele Touristen, viel Handarbeit.')),
  mosel: region('mosel', 'Mosel', { warmth: 4, frostRisk: 6, wetness: 5 }, 'riesling', {
    riesling: 2, silvaner: -1, dornfelder: -1, grauburgunder: -1, trollinger: -2, solaris: 1,
  }, c(0.7, 2, 2, 0.95, 1.1, 'Weltberühmter Riesling aus Steilstlagen – teuer zu bewirtschaften, aber begehrt.')),
  nahe: region('nahe', 'Nahe', { warmth: 6, frostRisk: 4, wetness: 4 }, 'riesling', {
    riesling: 2, 'mueller-thurgau': 1, silvaner: 1, dornfelder: 1, weissburgunder: 1, grauburgunder: 1,
  }, c(0.4, 1, 0, 0.95, 0.9, 'Vielfältige Böden, feine Rieslinge – abseits der großen Touristenströme.')),
  pfalz: region('pfalz', 'Pfalz', { warmth: 9, frostRisk: 2, wetness: 3 }, 'dornfelder', {
    dornfelder: 2, riesling: 1, spaetburgunder: 1, weissburgunder: 1, grauburgunder: 1,
    trollinger: 0, lemberger: 1, regent: 1,
  }, c(0.05, 1, 2, 1.1, 1.0, 'Warm, flach, ertragreich – und die Weinstraße lockt die Gäste in Scharen.')),
  rheingau: region('rheingau', 'Rheingau', { warmth: 6, frostRisk: 4, wetness: 4 }, 'riesling', {
    riesling: 2, spaetburgunder: 2, 'mueller-thurgau': -1, dornfelder: -1,
  }, c(0.3, 2, 1, 0.95, 1.3, 'Adelige Rieslinglagen mit großem Namen – Boden ist hier besonders teuer.')),
  rheinhessen: region('rheinhessen', 'Rheinhessen', { warmth: 7, frostRisk: 3, wetness: 3 }, 'silvaner', {
    'mueller-thurgau': 2, silvaner: 2, riesling: 1, dornfelder: 1, weissburgunder: 1, grauburgunder: 1,
    trollinger: 0, lemberger: 0, regent: 1,
  }, c(0.05, 0, 0, 1.15, 0.9, 'Größtes Gebiet: sanfte Hügel, hohe Erträge, günstiges Land – aber wenig Glamour.')),
  'saale-unstrut': region('saale-unstrut', 'Saale-Unstrut', { warmth: 4, frostRisk: 8, wetness: 2 }, 'weissburgunder', {
    'mueller-thurgau': 2, weissburgunder: 2, silvaner: 1, solaris: 2, regent: 1,
    spaetburgunder: -1, trollinger: -2,
  }, c(0.4, -1, 1, 0.9, 0.85, 'Nördlichster Weinbau: kleine Erträge, günstiger Boden, ein echter Geheimtipp.')),
  sachsen: region('sachsen', 'Sachsen', { warmth: 4, frostRisk: 7, wetness: 3 }, 'riesling', {
    'mueller-thurgau': 2, riesling: 1, weissburgunder: 1, grauburgunder: 1, solaris: 2, regent: 1,
    trollinger: -2,
  }, c(0.5, 0, 1, 0.9, 0.9, 'Terrassen an der Elbe: rare, gesuchte Weine, günstiges Land, harte Winter.')),
  wuerttemberg: region('wuerttemberg', 'Württemberg', { warmth: 6, frostRisk: 4, wetness: 5 }, 'lemberger', {
    trollinger: 2, lemberger: 2, riesling: 1, spaetburgunder: 1, dornfelder: 1, regent: 1,
  }, c(0.4, 0, 1, 1.0, 1.0, 'Trollinger und Lemberger, viel davon im eigenen Land getrunken.')),
}
