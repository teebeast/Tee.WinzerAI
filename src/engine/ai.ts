import { maxAffordableBid } from './auction'
import { barriqueBonus, bottleCost, sektCost } from './cellar'
import { BIO_LABELS, monthsUntilEligible, nextBioLabel } from './bio'
import { hasSkill } from './cellarmaster'
import { droughtChance, frostCandlesCost, frostChance, installCost, insurancePremium } from './defense'
import {
  BOTTLE_COST,
  INSURANCE_MONTHS,
  COMPETITIONS,
  MARKETING,
  ONLINE_SHOP_COST,
  SABOTAGE,
  SABOTAGE_FINE,
  TANK_COST_PER_HL,
  VINOTHEK_COST,
} from './data/economy'
import { GRAPES, type GrapeId } from './data/grapes'
import { REGIONS } from './data/regions'
import {
  applyAction,
  currentPlayer,
  harvestPreview,
  HARVEST_MONTHS,
  PLANT_MONTHS,
  plotAgeFactor,
  usedTankHl,
  validateAction,
} from './game'
import {
  availableCredit,
  bulkPricePerHl,
  competitionBaseScore,
  creditLimit,
  hlToBottles,
  monthlyCosts,
  monthlyDemand,
  totalHectares,
  wholesalePrice,
} from './market'
import { exportEligible } from './exports'
import type { Action, AiProfileId, CompetitionId, GameState, MarketingKind, Player, ProtectionStrategy } from './types'
import { usedBarriqueHl } from './rules'
import { iceWineChance } from './vineyard'

export interface AiProfile {
  id: AiProfileId
  name: string
  description: string
  /** Bevorzugte Rebsorten; gepflanzt wird die, die am besten zum Gebiet passt */
  grapes: GrapeId[]
  /** Frühester Lesemonat */
  harvestMonth: number
  /** Gelesen wird erst ab diesem Mostgewicht – spätestens aber im November */
  minOechsle: number
  /** Anteil des neuen Jahrgangs, der direkt als Fasswein verkauft wird */
  bulkShare: number
  /** Geld, das die KI möglichst nicht unterschreitet */
  cashReserve: number
  /** So viele Monate Ab-Hof-Absatz bleiben im Lager, der Rest geht an den Großhandel */
  keepMonthsOfDemand: number
  competitions: CompetitionId[]
  cellarMaster: boolean
  onlineShop: boolean
  marketing: MarketingKind[]
  /** Höchstgebot bei Versteigerungen als Vielfaches des Schätzwerts */
  auctionPremium: number
  maxHectares: number
  /** Anteil des Kreditrahmens, den die KI höchstens ausschöpft */
  maxLoanShare: number
  protection: ProtectionStrategy
  /** Lässt in frostsicheren Gebieten eine kleine Parzelle für Eiswein hängen */
  iceWine: boolean
  /** Setzt jedes Frühjahr etwas Sekt an */
  sekt: boolean
  /** Panscht ab und zu und streut Gerüchte über den Spitzenreiter */
  intrigue: boolean
  /** Baut Rotwein im Barrique aus */
  barrique: boolean
  /** Sichert sich gegen Wetter ab: Versicherung, Frostkerzen, Bewässerung */
  cautious: boolean
}

/** Vorgeschlagene Namen der Computer-Weingüter */
export const AI_ESTATE_NAMES: Record<AiProfileId, string> = {
  tradition: 'Weingut Steinbach',
  genossenschaft: 'Winzergenossenschaft',
  bio: 'Biohof Lindner',
  schlitzohr: 'Weinhaus Fuchs',
}

export const AI_PROFILES: Record<AiProfileId, AiProfile> = {
  tradition: {
    id: 'tradition', name: 'Traditionswinzer',
    description: 'Riesling und Spätburgunder, späte Lese, Kellermeister und Prämierungen.',
    grapes: ['riesling', 'spaetburgunder', 'lemberger', 'weissburgunder'], harvestMonth: 10, minOechsle: 73, bulkShare: 0.1, cashReserve: 20_000,
    keepMonthsOfDemand: 12, competitions: ['regional', 'bund'], cellarMaster: true, onlineShop: false,
    marketing: ['social', 'messe'], auctionPremium: 1.3, maxHectares: 25, maxLoanShare: 0.6,
    protection: 'conventional', iceWine: true, sekt: true, intrigue: false, barrique: true, cautious: true,
  },
  genossenschaft: {
    id: 'genossenschaft', name: 'Genossenschafts-Typ',
    description: 'Masse statt Klasse: Müller-Thurgau und Dornfelder, viel Fasswein und Großhandel.',
    grapes: ['mueller-thurgau', 'dornfelder', 'silvaner', 'trollinger'], harvestMonth: 9, minOechsle: 68, bulkShare: 0.3, cashReserve: 30_000,
    keepMonthsOfDemand: 6, competitions: ['regional', 'bund'], cellarMaster: false, onlineShop: false,
    marketing: ['social'], auctionPremium: 1.15, maxHectares: 40, maxLoanShare: 0.5,
    protection: 'conventional', iceWine: false, sekt: false, intrigue: false, barrique: false, cautious: true,
  },
  bio: {
    id: 'bio', name: 'Biopionier',
    description: 'Bio-Weinbau mit Silvaner und Spätburgunder, alles in die Flasche, Hoffeste und Online-Shop.',
    grapes: ['weissburgunder', 'silvaner', 'spaetburgunder', 'riesling', 'regent'], harvestMonth: 10, minOechsle: 70, bulkShare: 0, cashReserve: 15_000,
    keepMonthsOfDemand: 18, competitions: ['regional', 'bund'], cellarMaster: true, onlineShop: true,
    marketing: ['social', 'hoffest'], auctionPremium: 1.1, maxHectares: 20, maxLoanShare: 0.5,
    protection: 'bio', iceWine: false, sekt: true, intrigue: false, barrique: false, cautious: true,
  },
  schlitzohr: {
    id: 'schlitzohr', name: 'Schlitzohr',
    description: 'Riskant: kauft auf Pump, bietet hoch, panscht gelegentlich und streut Gerüchte.',
    grapes: ['dornfelder', 'riesling', 'grauburgunder', 'lemberger'], harvestMonth: 10, minOechsle: 65, bulkShare: 0.3, cashReserve: 15_000,
    keepMonthsOfDemand: 8, competitions: ['regional', 'bund'], cellarMaster: true, onlineShop: true,
    marketing: ['social', 'hoffest', 'messe'], auctionPremium: 1.35, maxHectares: 35, maxLoanShare: 0.7,
    protection: 'conventional', iceWine: true, sekt: false, intrigue: true, barrique: true, cautious: false,
  },
}

/** Zusätzliches Polster über der Reserve, ab dem Marketing gebucht wird */
const MARKETING_BUFFER: Record<MarketingKind, number> = { social: 0, hoffest: 15_000, messe: 30_000 }
const TANK_STEP = 100
/** Ab dieser Frostchance lässt die KI Trauben für Eiswein hängen */
const ICE_WINE_MIN_CHANCE = 0.35
/** Höchstens dieser Anteil der tragenden Fläche wird für Eiswein riskiert */
const ICE_WINE_MAX_SHARE = 0.25
const SEKT_HECTOLITERS = 15
const BARRIQUE_TARGET_HL = 200
/** Ab diesem Anteil des Kreditrahmens spart die KI: kein Kellermeister, kein teures Marketing, keine Fässer */
const AUSTERITY_LOAN_SHARE = 0.75
/** Gepanscht wird nur, wenn ein Skandal (Strafe, beschlagnahmter Jahrgang) verkraftbar wäre */
const SCHEME_MIN_CREDIT = 150_000
const SCHEME_MAX_HL = 120

/**
 * Spielt den Zug des aktuellen Computergegners und beendet ihn.
 * Die KI nutzt ausschließlich reguläre Aktionen – ungültige werden still übersprungen.
 */
export function playAiTurn(state: GameState): GameState {
  const profile = AI_PROFILES[currentPlayer(state).ai ?? 'tradition']
  let s = state
  const me = () => currentPlayer(s)
  const act = (action: Action): boolean => {
    if (validateAction(s, action) !== null) return false
    s = applyAction(s, action)
    return true
  }
  /**
   * Kreditrahmen, den die KI noch nutzen mag: für Expansion nur den Anteil laut Profil,
   * für Betriebsnotwendiges (Abfüllen, Tanks, Liquidität) den vollen Rahmen.
   */
  const usableCredit = (full = false) =>
    full
      ? availableCredit(me())
      : Math.max(0, Math.min(availableCredit(me()), Math.floor(creditLimit(me()) * profile.maxLoanShare) - me().loan))
  /** Sorgt per Kredit dafür, dass `amount` ausgegeben werden kann, ohne die Reserve zu unterschreiten. */
  const ensureCash = (amount: number, reserve = profile.cashReserve, full = false): boolean => {
    const missing = amount + reserve - me().money
    if (missing <= 0) return true
    const borrow = Math.min(usableCredit(full), Math.ceil(missing / 1000) * 1000)
    if (borrow > 0) act({ type: 'borrow', amount: borrow })
    return me().money >= amount
  }
  /**
   * Expansion (Pflanzen, Ersteigern) nur, wenn danach Reserve plus zwölf Monate laufende Kosten
   * finanzierbar bleiben – sonst fehlt später das Geld fürs Abfüllen.
   */
  const canExpand = (cost: number) => {
    const yearOfCosts = 12 * monthlyCosts(me(), s.month).total
    const cash = Math.max(0, me().money)
    const fullHeadroom = cash + availableCredit(me()) - cost
    return cash + usableCredit() - cost >= profile.cashReserve && fullHeadroom >= profile.cashReserve + yearOfCosts
  }

  /**
   * Sparmodus bei hoher Verschuldung. Wichtig, weil Geld auf dem Konto oft nur geliehen ist
   * (etwa fürs Abfüllen) und sonst in Gehälter und Werbung fließen würde.
   */
  const strained = () => me().loan > creditLimit(me()) * AUSTERITY_LOAN_SHARE

  // 1. Liquidität sichern: lieber Kredit als jungen Wein verramschen
  if (me().money < 0) ensureCash(0, 0, true)
  if (me().money < 0) raiseCash(-me().money)

  if (me().protection !== profile.protection) act({ type: 'setProtection', strategy: profile.protection })

  // Bio-Siegel beantragen, sobald es geht und die Gebühr die Reserve nicht angreift
  const nextLabel = nextBioLabel(me())
  if (nextLabel && monthsUntilEligible(s, me()) === 0 && me().money - BIO_LABELS[nextLabel].fee >= profile.cashReserve + 20_000) {
    act({ type: 'applyBioLabel' })
  }

  // Exportanfrage nur annehmen, wenn der Vorrat für mehrere Monate reicht
  const offer = me().exportOffer
  if (offer) {
    const stock = exportEligible(me(), offer).reduce((sum, l) => sum + l.bottles, 0)
    act({ type: 'answerExport', accept: stock >= offer.bottlesPerMonth * 4 })
  }

  // Gestaffeltes Wachstum: erst pflanzen, wenn die letzte Junganlage trägt; erst Land kaufen, wenn alles trägt.
  const hasYoungVines = me().plots.some((p) => p.grape !== null && plotAgeFactor(p, s.year) === 0)
  const hasFallow = me().plots.some((p) => p.grape === null)

  // 2. Versteigerung: Im Ankündigungsmonat ein verdecktes Höchstgebot hinterlegen
  if (s.auction?.phase === 'announced' && !hasYoungVines && !hasFallow) {
    let committed = 0
    const lots = s.auction.lots
      .filter((l) => l.regionId === me().regionId && l.status === 'pending' && l.limits[me().id] === undefined)
      .sort((a, b) => b.estimate - a.estimate)
    let hectares = totalHectares(me())
    for (const lot of lots) {
      if (hectares + lot.hectares > profile.maxHectares) continue
      const limit = Math.round((lot.estimate * profile.auctionPremium) / 1000) * 1000
      if (limit < lot.startPrice || !canExpand(committed + limit) || limit > maxAffordableBid(me())) continue
      if (act({ type: 'auctionLimit', lotId: lot.id, amount: limit })) {
        committed += limit
        hectares += lot.hectares
      }
    }
  }

  // Wetterabwehr: vorsichtige Profile versichern die Ernte, stellen bei hoher Frostgefahr Kerzen auf
  // und bewässern mit dem Klimawandel nach und nach ihre größte Lage.
  if (profile.cautious && !strained()) {
    if (INSURANCE_MONTHS.includes(s.month) && me().money - insurancePremium(s, me()) >= profile.cashReserve) {
      act({ type: 'insureHarvest' })
    }
    if (frostChance(s, me()) >= 0.1 && me().money - frostCandlesCost(s, me()) >= profile.cashReserve) {
      act({ type: 'frostCandles' })
    }
    if (s.month === 1 && droughtChance(s, me()) >= 0.08) {
      const dry = me().plots.filter((p) => p.grape && !p.irrigation).sort((a, b) => b.hectares - a.hectares)[0]
      if (dry && me().money - installCost(dry, 'irrigation') >= profile.cashReserve + 40_000) {
        act({ type: 'installIrrigation', plotId: dry.id })
      }
    }
  }

  // 3. Pflanzen: höchstens eine Parzelle pro Monat, beste Lage zuerst
  if (PLANT_MONTHS.includes(s.month) && !hasYoungVines) {
    const plot = me().plots.filter((p) => p.grape === null).sort((a, b) => b.site - a.site)[0]
    if (plot) {
      const region = REGIONS[me().regionId]
      // Eignung zählt am meisten; wohin der Markt läuft, gibt den Ausschlag (die Reben tragen erst in drei Jahren)
      const score = (g: GrapeId) => region.suitability[g] + (s.trends[g].target - 1) * 5
      const grape = [...profile.grapes].sort((a, b) => score(b) - score(a))[0]
      const cost = GRAPES[grape].plantCostPerHa * plot.hectares
      if (canExpand(cost) && ensureCash(cost, 0)) {
        act({ type: 'plant', plotId: plot.id, grape })
      }
    }
  }

  // 4. Lese – eine kleine Nebenfläche bleibt in frostsicheren Gebieten für Eiswein hängen
  const bearingHa = me()
    .plots.filter((p) => p.grape !== null && plotAgeFactor(p, s.year) > 0)
    .reduce((sum, p) => sum + p.hectares, 0)
  const iceWinePlot =
    profile.iceWine && iceWineChance(s, me().regionId) >= ICE_WINE_MIN_CHANCE
      ? me()
          .plots.filter((p) => validateAction(s, { type: 'harvest', plotId: p.id }) === null && p.oechsle >= 80)
          .filter((p) => p.iceWineGamble || p.hectares <= bearingHa * ICE_WINE_MAX_SHARE)
          .sort((a, b) => a.hectares - b.hectares)[0]
      : undefined
  if (iceWinePlot && s.month === 11) act({ type: 'gambleIceWine', plotId: iceWinePlot.id, gamble: true })
  if (HARVEST_MONTHS.includes(s.month) && s.month >= profile.harvestMonth) harvestAll(iceWinePlot?.id)

  // Sekt: im Frühjahr aus einem einfachen, ausgebauten Grundwein
  if (profile.sekt && hasSkill(me(), 'sekt') && s.month === 4 && !me().bottles.some((l) => l.sparkling && l.monthsUntilReady > 0)) {
    const base = me()
      .cellar.filter((b) => b.monthsUntilReady === 0 && (b.level === 'qualitaetswein' || b.level === 'kabinett'))
      .sort((a, b) => b.quality - a.quality)[0]
    if (base) {
      const hectoliters = Math.min(SEKT_HECTOLITERS, base.hectoliters)
      if (ensureCash(hlToBottles(hectoliters) * sektCost(me()), 0, true)) {
        act({ type: 'makeSekt', batchId: base.id, hectoliters })
      }
    }
  }

  // Barrique: den besten frischen Rotwein ins Eichenfass legen – nur mit einem Kellermeister, der das kann
  if (profile.barrique && hasSkill(me(), 'barrique')) {
    const hasRedVines = me().plots.some((p) => p.grape && GRAPES[p.grape].color === 'rot')
    if (hasRedVines && s.year >= 3 && me().barriqueCapacityHl < BARRIQUE_TARGET_HL && !strained()) {
      if (me().money >= profile.cashReserve + 80_000) act({ type: 'expandBarrique', hectoliters: 100 })
    }
    const free = me().barriqueCapacityHl - usedBarriqueHl(me())
    const candidate = me()
      .cellar.filter((b) => !b.barrique && b.vintage === s.year && b.hectoliters <= free && barriqueBonus(b) > 2)
      .sort((a, b) => b.quality - a.quality)[0]
    if (candidate) act({ type: 'toBarrique', batchId: candidate.id })
  }

  // 5. Ausgebauten Wein abfüllen, sonst als Fasswein verkaufen
  for (const batch of me().cellar.filter((b) => b.monthsUntilReady === 0)) {
    const cost = hlToBottles(batch.hectoliters) * bottleCost(me())
    if (!(ensureCash(cost, 0, true) && act({ type: 'bottle', batchId: batch.id, hectoliters: batch.hectoliters }))) {
      act({ type: 'sellBulk', batchId: batch.id, hectoliters: batch.hectoliters })
    }
  }

  // 6. Amtliche Prüfung
  for (const lot of me().bottles) {
    if (ensureCash(0, 0)) act({ type: 'register', lotId: lot.id })
  }

  // 7. Prämierungen: nur im Monat der Bewertung anmelden, damit der Wein nicht lange im Lager blockiert
  const competition = Object.values(COMPETITIONS).find((c) => c.month === s.month)
  if (competition && profile.competitions.includes(competition.id)) {
    const candidates = me()
      .bottles.filter((l) => l.registered && !l.awards.some((a) => a.competition === competition.id))
      .filter((l) => competitionBaseScore(l) + 2 >= competition.thresholds.bronze)
      .sort((a, b) => competitionBaseScore(b) - competitionBaseScore(a))
    for (const lot of candidates) {
      if (me().money - competition.fee < profile.cashReserve / 2) break
      act({ type: 'enterCompetition', lotId: lot.id })
    }
  }

  // 8. Großhandel: Vorrat für Hofladen und Export behalten, die besten Weine zuerst
  sellSurplusWholesale()

  if (profile.intrigue) scheme()
  if (me().money < 0) raiseCash(-me().money)

  // 9. Investitionen und Marketing
  const productiveHa = me().plots.filter((p) => plotAgeFactor(p, s.year) > 0).reduce((sum, p) => sum + p.hectares, 0)
  if (strained()) {
    if (me().cellarMaster) act({ type: 'fireCellarMaster' })
    if (profile.marketing.includes('social') && me().money - MARKETING.social.cost >= profile.cashReserve) {
      act({ type: 'marketing', kind: 'social' })
    }
  } else {
    if (profile.cellarMaster && s.year >= 2 && productiveHa >= 6 && me().money >= profile.cashReserve + 30_000) {
      chooseCellarMaster()
    }
    if (profile.onlineShop && !me().hasOnlineShop && me().reputation >= 25) {
      if (me().money >= profile.cashReserve + ONLINE_SHOP_COST + 20_000) act({ type: 'buyOnlineShop' })
    }
    if (!me().hasVinothek && me().money >= profile.cashReserve + VINOTHEK_COST + 100_000) act({ type: 'buildVinothek' })
    for (const kind of profile.marketing) {
      if (me().money - MARKETING[kind].cost >= profile.cashReserve + MARKETING_BUFFER[kind]) act({ type: 'marketing', kind })
    }
  }

  // 10. Kredit tilgen, wenn genug Polster da ist
  const surplus = me().money - profile.cashReserve - 20_000
  if (me().loan > 0 && surplus >= 20_000) {
    act({ type: 'repay', amount: Math.min(me().loan, Math.floor(surplus / 1000) * 1000) })
  }

  return applyAction(s, { type: 'endTurn' })

  /**
   * Bewerber nach Profil bewerten: Talent zählt, benötigte Fähigkeiten (Sekt, Barrique) noch mehr, das Gehalt dagegen.
   * Gewechselt wird nur im Januar, wenn ein Bewerber deutlich besser passt.
   */
  function chooseCellarMaster() {
    const needs = [...(profile.sekt ? ['sekt'] : []), ...(profile.barrique ? ['barrique'] : [])]
    const score = (m: { talent: number; skills: string[]; salary: number }) =>
      m.talent * 2 + needs.filter((n) => m.skills.includes(n)).length * 6 - m.salary / 1000
    const ranked = s.cellarMasterCandidates.map((m, i) => ({ i, score: score(m) })).sort((a, b) => b.score - a.score)
    const best = ranked[0]
    const current = me().cellarMaster
    if (!best) return
    if (!current || (s.month === 1 && best.score > score(current) + 4)) act({ type: 'hireCellarMaster', candidate: best.i })
  }

  function harvestAll(reservedPlotId?: string) {
    const plots = me()
      .plots.filter((p) => validateAction(s, { type: 'harvest', plotId: p.id }) === null)
      .filter((p) => !p.iceWineGamble && p.id !== reservedPlotId)
      .filter((p) => p.oechsle >= profile.minOechsle || s.month >= 11)
      .map((p) => ({ plot: p, preview: harvestPreview(s, me(), p) }))
      .sort((a, b) => b.preview.quality - a.preview.quality)
    if (plots.length === 0) return

    const needed = plots.reduce((sum, p) => sum + p.preview.hectoliters, 0)
    const missing = needed - (me().tankCapacityHl - usedTankHl(me()))
    if (missing > 0) {
      const hectoliters = Math.ceil(missing / TANK_STEP) * TANK_STEP
      if (ensureCash(hectoliters * TANK_COST_PER_HL, 0, true)) act({ type: 'expandTank', hectoliters })
    }
    for (const { plot } of plots) act({ type: 'harvest', plotId: plot.id })

    // Ein Teil des neuen Jahrgangs geht sofort als Fasswein weg – die schwächsten Weine zuerst.
    const fresh = me()
      .cellar.filter((b) => b.vintage === s.year)
      .sort((a, b) => a.quality - b.quality)
    let toSell = Math.round(fresh.reduce((sum, b) => sum + b.hectoliters, 0) * profile.bulkShare)
    for (const batch of fresh) {
      if (toSell <= 0) break
      const hectoliters = Math.min(batch.hectoliters, toSell)
      if (act({ type: 'sellBulk', batchId: batch.id, hectoliters })) toSell -= hectoliters
    }
  }

  function sellSurplusWholesale() {
    const contract = me().exportContract
    let keep =
      monthlyDemand(me()) * (strained() ? Math.min(3, profile.keepMonthsOfDemand) : profile.keepMonthsOfDemand) +
      (contract ? contract.bottlesPerMonth * Math.min(3, contract.monthsLeft) : 0)
    for (const lot of [...me().bottles].sort((a, b) => b.quality - a.quality)) {
      if (me().competitionEntries.includes(lot.id)) continue
      const surplus = lot.bottles - Math.max(0, keep)
      keep -= lot.bottles
      if (surplus > 0 && lot.registered) act({ type: 'sellWholesale', lotId: lot.id, bottles: surplus })
    }
  }

  /**
   * Schlitzohr: zuckert alle drei Jahre nach der Lese heimlich einen Wein auf und
   * streut im Mai Gerüchte über den Spitzenreiter, wenn es sich das leisten kann.
   */
  function scheme() {
    if (s.month === 10 && s.year % 3 === 0 && availableCredit(me()) >= SCHEME_MIN_CREDIT) {
      // Nur eine kleine Charge riskieren – fliegt sie auf, wird nicht der ganze Jahrgang beschlagnahmt.
      const target = me()
        .cellar.filter((b) => b.vintage === s.year && (b.level === 'qualitaetswein' || b.level === 'kabinett'))
        .filter((b) => b.hectoliters <= SCHEME_MAX_HL)
        .sort((a, b) => a.hectoliters - b.hectoliters)[0]
      if (target) act({ type: 'adulterate', batchId: target.id, method: 'zucker' })
    }
    if (s.month === 5) {
      const leader = s.players
        .filter((p) => p.id !== me().id && !p.bankrupt && p.points > me().points)
        .sort((a, b) => b.points - a.points)[0]
      if (leader && me().money >= profile.cashReserve + SABOTAGE.geruecht.cost + SABOTAGE_FINE) {
        act({ type: 'sabotage', targetId: leader.id, kind: 'geruecht' })
      }
    }
  }

  /** Notverkäufe: erst Fasswein, dann Großhandel, schwächste Weine zuerst – nur so viel wie nötig */
  function raiseCash(amount: number) {
    const target = me().money + amount
    for (const batch of [...me().cellar].sort((a, b) => a.quality - b.quality)) {
      const missing = target - me().money
      if (missing <= 0) return
      const hectoliters = Math.min(batch.hectoliters, Math.ceil(missing / Math.max(1, bulkPricePerHl(batch, s, me()))))
      act({ type: 'sellBulk', batchId: batch.id, hectoliters })
    }
    for (const lot of [...me().bottles].sort((a, b) => a.quality - b.quality)) {
      const missing = target - me().money
      if (missing <= 0) return
      if (!lot.registered || me().competitionEntries.includes(lot.id)) continue
      const bottles = Math.min(lot.bottles, Math.ceil(missing / Math.max(0.01, wholesalePrice(lot, me(), s))))
      act({ type: 'sellWholesale', lotId: lot.id, bottles })
    }
  }
}

/** Lässt alle Computergegner ziehen, bis ein Mensch am Zug ist oder das Spiel endet. */
export function runAiTurns(state: GameState): GameState {
  let s = state
  for (let guard = 0; guard < 10_000; guard++) {
    if (s.winnerId || s.finished || currentPlayer(s).ai === null) return s
    if (activeHumans(s).length === 0) return s // ohne Menschen nicht endlos weiterspielen
    s = playAiTurn(s)
  }
  return s
}

/** Spieler, die noch mitspielen und von Menschen gesteuert werden */
export function activeHumans(state: GameState): Player[] {
  return state.players.filter((p) => p.ai === null && !p.bankrupt)
}
