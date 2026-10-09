# Spieldesign – Arbeitstitel „Winzer“

Nachempfunden dem Starbyte-Klassiker *Winzer* (1991/92). Ziel ist ein kurzweiliges, rundenbasiertes Wirtschaftsspiel rund um ein deutsches Weingut. Es bleibt einfach zugänglich und nimmt die bekannten Schwächen des Originals (Menüwüste, Leerlauf, nötiges Fachwissen) bewusst ins Visier.

> Alle Zahlen sind **Startwerte fürs Balancing**. Sie liegen zentral in `src/engine/data/` und werden per Simulation (KI gegen KI) justiert.

---

## 1. Designprinzipien

1. **Eine Entscheidung pro Monat ist genug.** Monate ohne Entscheidung laufen per „Vorspulen“ automatisch durch.
2. **Kein Vorwissen nötig.** Tooltips, ein Lexikon und die Vorschau „Was passiert, wenn…“ ersetzen das Handbuch.
3. **Kalkuliertes Risiko statt Würfelglück.** Das Wetter kommt mit Prognose und Wahrscheinlichkeit, damit z. B. das Pokern auf Eiswein eine bewusste Wette ist.
4. **Liquidität ist der Kern.** Massenwein bringt schnell Geld, Spitzenwein bringt Punkte und Ruhm, kostet aber Zeit. Diese Spannung aus dem Original bleibt erhalten.
5. **Augenzwinkern.** Panschen und Sabotage bleiben im Spiel, sind aber riskant.

## 2. Rahmen

| | |
|---|---|
| Spieler | 1–4, Menschen (Hot-Seat) und/oder KI |
| Runde | 1 Monat; alle Spieler ziehen nacheinander, danach wird der Monat aufgelöst |
| Start | Januar, Jahr 1 |
| Ziel | Wer zuerst die Siegpunkte erreicht, gewinnt. Wählbar: Kurz 300 / Normal 600 / Klassisch 1000 |
| Niederlage | Ein Spieler ist insolvent, wenn er Kontostand < 0 und Kreditlimit ausgeschöpft hat und das 3 Monate in Folge so bleibt |
| Zufall | Seed-basiert, damit jede Partie reproduzierbar ist (Tages-Challenge, Fehlersuche) |

**Startausstattung:** 10 ha Land: 4 ha bestockt mit einer gebietstypischen Rebsorte (Ertrag ab Jahr 1) und zwei brachliegende Parzellen à 3 ha (Südhang: sehr gute Lage, Talweg: einfache Lage). Alles auf einmal zu bepflanzen sprengt das Startkapital, man muss also priorisieren. Die Lese darf das Konto ins Minus bringen (Dispo). Dazu 80.000 € Startkapital, Edelstahltanks mit 300 hl Kapazität und 1 Festangestellter.

## 3. Anbaugebiete

Es gibt alle 13 deutschen Anbaugebiete. Damit ist auch der Fehler im Original behoben, wo „Württemberg“ ganz Baden-Württemberg umfasste. Jedes Gebiet hat diese Werte:

- **Wärme** (0–10): bestimmt den Reifezuwachs
- **Frostrisiko** (0–10): Spätfrost im Frühjahr, aber auch Chance auf Eiswein
- **Niederschlag** (0–10): Krankheitsdruck
- **Eignung je Rebsorte** (−2 bis +2): Bonus oder Malus auf Qualität

| Gebiet | Wärme | Frost | Nässe | Stärken |
|---|---|---|---|---|
| Ahr | 5 | 5 | 4 | Spätburgunder |
| Baden | 9 | 2 | 6 | Grau-/Weiß-/Spätburgunder |
| Franken | 5 | 6 | 3 | Silvaner, Müller-Thurgau |
| Hessische Bergstraße | 7 | 3 | 5 | Riesling, Grauburgunder |
| Mittelrhein | 5 | 5 | 5 | Riesling |
| Mosel | 4 | 6 | 5 | Riesling (Steillage) |
| Nahe | 6 | 4 | 4 | Riesling |
| Pfalz | 9 | 2 | 3 | breites Spektrum, Dornfelder |
| Rheingau | 6 | 4 | 4 | Riesling, Spätburgunder |
| Rheinhessen | 7 | 3 | 3 | Silvaner, Müller-Thurgau, Dornfelder |
| Saale-Unstrut | 3 | 8 | 2 | Müller-Thurgau, Weißburgunder |
| Sachsen | 3 | 8 | 3 | Müller-Thurgau, Riesling |
| Württemberg | 6 | 4 | 5 | Trollinger, Lemberger |

## 4. Rebsorten

| Sorte | Farbe | Ertrag hl/ha | Reifebedarf | Qualitätspotenzial | Fäulnis | Krankheit | Frost | Pflanzkosten €/ha |
|---|---|---|---|---|---|---|---|---|
| Müller-Thurgau | weiß | 110 | niedrig | 4 | hoch | mittel | mittel | 18.000 |
| Silvaner | weiß | 95 | mittel | 6 | mittel | mittel | mittel | 20.000 |
| Riesling | weiß | 80 | hoch | 9 | niedrig | mittel | hoch | 22.000 |
| Weißburgunder | weiß | 85 | mittel | 7 | mittel | mittel | mittel | 22.000 |
| Grauburgunder | weiß | 85 | mittel | 7 | hoch | mittel | mittel | 22.000 |
| Spätburgunder | rot | 70 | hoch | 9 | hoch | hoch | mittel | 25.000 |
| Dornfelder | rot | 120 | niedrig | 4 | mittel | mittel | mittel | 18.000 |
| Trollinger | rot | 120 | hoch | 3 | mittel | mittel | niedrig | 18.000 |
| Lemberger | rot | 90 | hoch | 7 | niedrig | mittel | mittel | 22.000 |
| Regent (PIWI) | rot | 85 | mittel | 5 | niedrig | sehr niedrig | hoch | 20.000 |
| Solaris (PIWI) | weiß | 75 | sehr niedrig | 5 | niedrig | sehr niedrig | hoch | 20.000 |

**Junganlage:** Im Pflanzjahr und im Jahr darauf gibt es keinen Ertrag. Im 3. Jahr sind es 50 %, ab dem 4. Jahr 100 %. Alte Reben (ab 25 Jahren) bringen −20 % Ertrag und +1 Qualität.

**PIWI** steht für pilzwiderstandsfähige Sorten. Sie brauchen kaum Pflanzenschutz, gelten aber als weniger prestigeträchtig (−10 % Preis bei Direktvermarktung).

## 5. Der Jahreslauf

Jeder Monat zeigt eine **Aufgabenliste** mit dem, was jetzt sinnvoll ist. Pflichtarbeiten erledigt das Personal automatisch, solange genug Arbeitskraft vorhanden ist.

| Monat | Weinberg | Keller & Markt |
|---|---|---|
| Jan | Rebschnitt (Pflicht, sonst −15 % Qualität), Eiswein-Chance | Abfüllen, Weinprüfung (AP) beantragen |
| Feb | Rebschnitt, **Versteigerung von Weinbergen** | Abfüllen, Verkauf |
| Mär | Pflanzen möglich | Messe (Reputation) |
| Apr | Pflanzen möglich, **Spätfrostrisiko** | |
| Mai | Pflanzenschutz-Strategie festlegen, Spätfrostrisiko | |
| Jun | Laubarbeit | **Regionale Weinprämierung** |
| Jul | **Grüne Lese** (−30 % Menge, +1 Stufe Qualität), Hagelrisiko | Hoffest/Weinprobe |
| Aug | Reifebeginn, Lese für Sekt-Grundwein möglich | Flaschen/Etiketten bestellen |
| Sep | **Lese** (frühe Sorten optimal) | Keltern |
| Okt | **Lese** (Hauptlese) | Keltern |
| Nov | Lese möglich, **Fäulnisrisiko** steigt stark | **Bundesweinprämierung** |
| Dez | Eiswein-Chance (ab −7 °C) | Jahresabschluss: Zinsen, Gehälter, Bilanz |

### Leerlauf vermeiden

Wenn die Aufgabenliste leer ist, kann der Spieler „Bis zum nächsten Ereignis vorspulen“ wählen. Das Spiel hält dann bei jeder Entscheidung an.

## 6. Wetter & Reife

- **Monatswetter:** Temperatur-Abweichung, Niederschlag, Sonne. Daraus ergibt sich der **Reifezuwachs in °Oechsle**.
- **Prognose:** Für die nächsten 2 Monate gibt es Wahrscheinlichkeiten, z. B. „Oktober: 60 % sonnig, 30 % nass, 10 % früher Frost“. Je weiter in der Zukunft, desto unschärfer.
- **Klimawandel** (abschaltbar): Die Durchschnittstemperatur steigt um 0,05 °C pro Spieljahr. Das bringt frühere Reife, mehr Hitzestress und weniger Eiswein-Chancen, macht aber Rotwein in kühlen Gebieten attraktiver.

### Reife & Lesezeitpunkt

- Ab August steigt das Mostgewicht jeden Monat abhängig von Sonne, Gebietswärme und Reifebedarf der Sorte.
- Die **Menge** erreicht im Oktober ihr Maximum. Ab November sinkt sie durch Fäulnis und Vogelfraß.
- Ist der Herbst feucht, kann **Edelfäule (Botrytis)** entstehen. Dann sinkt die Menge stark, das Mostgewicht steigt aber sprunghaft (Voraussetzung für die Trockenbeerenauslese).
- Lässt man die Trauben bis Dezember oder Januar hängen, wird es eine **Eiswein-Wette**: Fällt die Temperatur auf −7 °C oder weniger, gibt es Eiswein; sonst ist die Ernte größtenteils verloren.

### Qualitätsstufen (vereinfacht)

| Stufe | Mostgewicht | Besonderheit | Punkte bei AP-Anmeldung |
|---|---|---|---|
| Deutscher Wein | < 60 °Oe | keine AP nötig | 0 |
| Qualitätswein | ≥ 60 | | 1 |
| Kabinett | ≥ 73 | | 2 |
| Spätlese | ≥ 80 | Lese ab Oktober | 4 |
| Auslese | ≥ 90 | Selektion per Hand | 8 |
| Beerenauslese | ≥ 110 | Botrytis | 15 |
| Trockenbeerenauslese | ≥ 150 | Botrytis, sehr kleine Menge | 30 |
| Eiswein | ≥ 110 | gefroren gelesen | 25 |

Jeder Wein hat neben der Stufe eine **Güte von 0–100**. Sie ergibt sich aus Qualitätspotenzial, Eignung von Gebiet und Sorte, Gesundheit des Leseguts, Leseart, Kellermeister und Ausbau. Die Güte entscheidet bei Prämierungen und über den Preis.

## 7. Lese

| Leseart | Kosten | Tempo | Effekt |
|---|---|---|---|
| Handlese | 1.500 €/ha (Saisonkräfte) | 2 ha je Arbeitskraft/Monat | Selektion möglich: −40 % Menge, +1 Stufe |
| Vollernter (Lohnunternehmer) | 600 €/ha | unbegrenzt | −5 Güte, keine Auslese oder höher |
| Eigener Vollernter | 180.000 € einmalig, 100 €/ha | unbegrenzt | wie oben |

## 8. Keller

- **Keltern:** passiert automatisch nach der Lese, 1 ha ≈ Ertrag in hl Most.
- **Lagerkapazität:** Edelstahltank (frisch, schnell fertig) oder Barrique (+5 Güte für Rotwein, 12 Monate Ausbau). Erweiterung kostet 200 € pro hl Edelstahl bzw. 600 € pro hl Barrique.
- **Ausbauzeit bis zur Abfüllreife:** einfache Weine 3 Monate, Prädikate 6 Monate, Barrique 12 Monate.
- **Fassweinverkauf** an die Großkellerei geht **jederzeit** und sofort, aber billig (1,0–3,0 € pro Liter je nach Stufe und Güte). Das ist der Liquiditätsanker: Beim Start-Weingut deckt reiner Fassweinverkauf ungefähr die laufenden Kosten, Gewinn bringt erst die Flasche.
- **Abfüllung:** 1 hl ergibt 133 Flaschen à 0,75 l. Flaschen, Korken und Etiketten kosten 0,60 € pro Flasche (Mengenrabatt ab 10.000).
- **Sekt** (ab Jahr 2): Grundwein in Flaschengärung, 9 Monate. Gibt 10 Punkte bei Güte ≥ 80.
- **Kellermeister:** einstellbar, +5 Güte, 4.000 € pro Monat.

## 9. Weinprüfung (AP-Nummer)

Der abgefüllte Wein wird angemeldet (Gebühr 150 € pro Posten, mindestens 5 hl = 665 Flaschen). Kleine Abfüllungen desselben Weins landen im selben Posten. Er bekommt dann seine Prädikatsbezeichnung und **Siegpunkte** (siehe Tabelle). Ohne AP-Nummer gilt jeder Wein als „Deutscher Wein“. Bei der Prüfung werden auch gepanschte Weine entdeckt (siehe §13).

## 10. Vertrieb & Preise

| Kanal | Voraussetzung | Preis | Menge |
|---|---|---|---|
| Fasswein an Kellerei | – | sehr niedrig | unbegrenzt, sofort |
| Großhandel | AP-Nummer | niedrig | groß |
| Hofladen/Direktvermarktung | – | hoch, abzüglich 20 % Vertriebskosten | 150 + 30 × Bekanntheit Flaschen/Monat, automatisch |
| Online-Shop | 15.000 € Einrichtung | wie Hofladen | zusätzlich 40 × Bekanntheit Flaschen/Monat |
| Exportvertrag | Angebot (Ereignis) | fest vereinbart | feste Menge über 12 Monate, Vertragsstrafe bei Lieferausfall |

**Flaschenpreis** = Basispreis der Stufe (3 € Deutscher Wein bis 25 € Beerenauslese) × (0,5 + Güte/100) × (0,8 + Bekanntheit/250). Der Großhandel zahlt 45 % davon. Eine Marktsättigung ist für später vorgesehen.

Der Hofladen verkauft zuerst geprüfte Weine und Deutschen Wein, ältere Posten zuerst. Ungeprüfte Prädikatsweine dürfen nur als „Deutscher Wein“ verkauft werden und kommen zuletzt dran. Zur Prämierung angemeldete Weine bleiben im Lager.

**Bekanntheit** (0–100, Start 10) steigt durch Prämierungen und Marketing. Zuwächse schrumpfen mit dem Faktor (1 − Bekanntheit/120), und jeden Monat gehen 3 % verloren. Dauerhaft hohe Bekanntheit braucht deshalb Medaillen, nicht nur Werbung. Skandale (ab M4) senken sie zusätzlich.

**Marketing**, jede Maßnahme höchstens einmal pro Monat: Social Media (1.000 €, +1 Bekanntheit), Weinprobe/Hoffest (5.000 €, +4, nur Mai–Sep), Messe (12.000 €, +8, nur März).

## 11. Prämierungen

- **Regional (Juni)** und **Bundesweit (November):** bis zu 3 Weine einreichen.
- Nur amtlich geprüfte Weine. Teilnahmegebühr 100 € (regional) bzw. 300 € (Bund).
- Bewertung = Güte + Stufenbonus (Kabinett +2 bis Beerenauslese +10) + Zufall (±5).
- Medaillen ab Wertung: regional Gold 88, Silber 80, Bronze 72; Bund Gold 93, Silber 86, Bronze 79.
- Regional: Gold 20, Silber 10, Bronze 5 Punkte. Bundesweit: Gold 60, Silber 30, Bronze 15 Punkte. Dazu kommt jeweils ein Bonus auf die Bekanntheit.
- Ein Wein kann jede Prämierung nur einmal gewinnen.

## 12. Weinberg, Pflanzenschutz & Ereignisse

**Pflanzenschutz-Strategie** (einmal im Mai festgelegt):

| Strategie | Kosten/ha | Krankheitsschutz | Effekt |
|---|---|---|---|
| Keiner | 0 | 0 % | |
| Konventionell | 600 € | 90 % | |
| Bio | 900 € | 70 % | +10 % Preis bei Direktvermarktung, Bekanntheit +, nach 3 Jahren Umstellung |

**Krankheiten & Schädlinge:**
- Peronospora (nasser Sommer)
- Oidium (warm und trocken)
- Kirschessigfliege (September, vor allem rote Sorten)
- Botrytis (Fluch oder Segen, siehe §6)

**Zufallsereignisse** (Beispiele):
- Spätfrost, Hagel, Hitzewelle
- Exportanfrage, Medienbericht über das Weingut
- Kellerei-Insolvenz (Fassweinpreis halbiert)
- Erbschaft eines Weinbergs, Kontrolle der Weinaufsicht

**Weinbergversteigerung (Februar):**
- Je Anbaugebiet, in dem noch jemand wirtschaftet, kommen 1–2 Weinberge à 1–5 ha unter den Hammer. Rund 60 % davon sind bereits bestockt (3–27 Jahre alt) und tragen sofort, der Rest ist Brache.
- Die Lagenqualität reicht von −1 bis +2 und bringt je Stufe ±4 Güte. Ein Schätzwert wird angezeigt: Boden 25.000 €/ha plus Reben 15.000 €/ha, je Lagenstufe ±15 %. Das Mindestgebot liegt bei 80 % des Schätzwerts.
- Mitbieten darf, wer im selben Gebiet wirtschaftet. Die Gebote sind verdeckt und können bis Monatsende geändert oder zurückgezogen werden. Ein Gebot muss über Konto und freien Kreditrahmen finanzierbar sein.
- Auswärtige Investoren bieten verdeckt 85–135 % des Schätzwerts. Das höchste Spielergebot gewinnt nur, wenn es darüber liegt. So gibt es auch im Einzelspiel Bietspannung, und der Investorenpreis wird hinterher veröffentlicht.
- Ein Fehlbetrag beim Kauf wird automatisch über den Kredit gedeckt.

## 13. Panschen & Sabotage

**Panschen** an einer Charge im Keller:

| Methode | Effekt | Entdeckungsrisiko |
|---|---|---|
| Strecken mit Wasser | +20 % Menge, −15 Güte | 15 % bei AP-Prüfung |
| Unerlaubte Aufzuckerung | +1 Stufe | 25 % bei AP-Prüfung |
| „Frostschutz-Süße“ (Anspielung auf den Glykolskandal von 1985) | +2 Stufen | 40 %, außerdem zufällige Kontrollen |

Wird Panschen entdeckt, wird die Charge vernichtet. Dazu kommen eine Strafe von 20.000 €, −50 Punkte und −40 Bekanntheit.

**Sabotage** gegen einen Mitspieler:
- Gerüchte streuen: 3.000 €, −10 Bekanntheit beim Ziel
- Weinberg beschädigen: 8.000 €, −30 % Ertrag auf einer Parzelle

Das Entdeckungsrisiko liegt bei 30 %. Wer erwischt wird, zahlt 25.000 € Strafe und verliert −30 Bekanntheit.

## 14. Finanzen

- **Laufende Kosten pro Monat:** Festangestellte 2.500 €, Kellermeister 4.000 €. Bewirtschaftung 350 € pro ha bestockt (auch Junganlagen), Brache 50 € pro ha.
- **Kredit:** bis 50 % des Betriebswerts (Land 25.000 €/ha, Reben +15.000 €/ha, Tank 150 €/hl), 6 % Zinsen p. a., monatlich belastet. Aufnahme und Tilgung jederzeit in ganzen Euro.
- **Dispo:** Ein negatives Konto kostet 12 % Zinsen p. a. Die Lese darf ins Minus führen.
- **Jahresabschluss im Dezember:** Bilanz, Gewinn- und Verlustrechnung, Rangliste.

## 15. KI-Gegner

Die KI-Gegner nutzen dieselben Regeln und Aktionen wie Menschen. Sie sind deterministisch und unterscheiden sich nur in ihren Gewichtungen (`src/engine/ai.ts`).

| Profil | Sorten | Stil | Stärke |
|---|---|---|---|
| **Traditionswinzer** | Riesling, Spätburgunder | späte Lese, wenig Fasswein, Kellermeister, Messe, beide Prämierungen | stark |
| **Genossenschafts-Typ** | Müller-Thurgau, Dornfelder, Silvaner | frühe Lese, 30 % Fasswein, viel Großhandel, kaum Marketing | leicht |
| **Biopionier** | Silvaner, Spätburgunder, Riesling | kein Fasswein, großer Ab-Hof-Vorrat, Online-Shop, Hoffeste | stark |
| **Schlitzohr** | Dornfelder, Riesling | bis 90 % Kreditrahmen, bietet bei Versteigerungen am höchsten | stark, schwankend |

Gemeinsame Grundregeln aller KI-Gegner:
- **Gestaffeltes Wachstum:** Gepflanzt wird erst, wenn die letzte Junganlage trägt. Land wird erst ersteigert, wenn alle Flächen tragen.
- **Expansion nur mit Puffer:** Nach dem Pflanzen oder Ersteigern müssen Reserve plus zwölf Monate laufende Kosten finanzierbar bleiben.
- **Betriebsnotwendiges hat Vorrang:** Abfüllen, Tankausbau und Liquidität dürfen den vollen Kreditrahmen nutzen. Lieber Kredit aufnehmen als jungen Wein verramschen.
- **Prämierungen:** Angemeldet wird erst im Monat der Prämierung, damit der Wein nicht lange im Lager blockiert.

Panschen und Sabotage für das Schlitzohr folgen mit M4.

## 16. Bedienung

- **Hauptbildschirm (Dashboard)** mit Monat/Jahr, Wetter samt Prognose, Kontostand, Punkten und Rangliste
- **Weinberg-Karte:** Parzellen als Kacheln zeigen Sorte, Alter, Reife und Gesundheit
- **Aufgabenliste** „Diesen Monat“ mit Aktionsknöpfen, außerdem der Knopf „Monat beenden“ bzw. „Vorspulen“
- **Keller** als Liste der Chargen (Stufe, Güte, Menge, Reife), **Verkauf** und **Finanzen**
- **Hot-Seat:** Übergabebildschirm „Spieler 2 ist dran“, damit niemand die Werte der anderen sieht. Er erscheint nur, wenn mehrere Menschen mitspielen; KI-Züge laufen ohne Unterbrechung.
- **Rangliste** mit Punkten, Bekanntheit, Rebfläche und Vermögen aller Weingüter
- **Lexikon** und Tooltips für jeden Fachbegriff
- Bedienbar mit Maus, Touch und Tastatur; responsiv vom Handy bis zum Desktop

## 17. Technik

- **PWA:** TypeScript, Vite, Svelte 5 und vite-plugin-pwa; installierbar und offlinefähig
- **Engine** (`src/engine/`) ohne UI-Abhängigkeit:
  - `GameState` ist ein serialisierbares Objekt
  - `applyAction(state, action)` ist eine reine Funktion; der Monatsabschluss läuft über die Aktion `endTurn` des letzten Spielers
  - Ein Seed-basierter Zufallsgenerator (Zustand liegt im GameState)
- **Spielstände** liegen in IndexedDB (später Export/Import als Datei)
- **Tests** mit Vitest, dazu ein serverseitiger Render-Smoke-Test der Oberfläche.
- **Balancing-Report:** `npm run sim` lässt jedes KI-Profil in jedem Gebiet 5 Partien über 15 Jahre spielen und danach alle Profile gegeneinander antreten (`scripts/balance.sim.ts`).
- **Später:** asynchroner Online-Mehrspieler. Durch die reine Engine reicht es, Aktionen zu synchronisieren.

## 18. Meilensteine

| # | Inhalt |
|---|---|
| ✅ **M1 – Kernzyklus** | 1 Spieler, 3 Gebiete, 5 Sorten. Wetter, Reife, Lese, Keller, Fassweinverkauf, AP-Prüfung, Punkte |
| ✅ **M2 – Markt** | Abfüllung, Direktvermarktung, Großhandel, Online-Shop, Bekanntheit, Marketing, Prämierungen, Kellermeister, Tankausbau, Kredit, Insolvenz |
| ✅ **M3 – Gegner** | KI-Gegner mit 4 Profilen, Weinbergversteigerung mit Investorengebot, Lagenqualität, Rangliste, Balancing-Report |
| **M4 – Würze** | Krankheiten, Ereignisse, Panschen, Sabotage, Eiswein/Botrytis, Sekt, Export |
| **M5 – Feinschliff** | alle 13 Gebiete und 11 Sorten, Lexikon, Klimawandel, Tages-Challenge, Grafik und Sound |

### Balancing-Stand nach M2

Eine Simulation mit einfacher, vernünftiger Strategie lief 12 Jahre lang in allen drei Gebieten. Die Strategie: höchstens eine Parzelle pro Jahr pflanzen, Fasswein nur für die Liquidität verkaufen, den Rest abfüllen, prüfen lassen und prämieren lassen.

- Alle drei Gebiete überleben. Die Kreditlast liegt in Jahr 2–4 bei 100.000–180.000 €.
- Aggressives Wachstum kann in die Insolvenz führen, besonders mit Müller-Thurgau als Startsorte: alles auf Kredit pflanzen, sofort einen Kellermeister einstellen, nichts verkaufen. Das ist gewollt.
- Nach 12 Jahren stehen 290–430 Punkte. 600 Punkte („Normal“) wären erst nach etwa 16 Jahren erreicht. Das ist zu lang; M4 bringt zusätzliche Punktequellen (Sekt, Eiswein, Beerenauslese, Export).
- Ab Jahr 7–8 häuft sich Geld ohne sinnvolle Verwendung an. Die Versteigerungen in M3 sollen das als Geldsenke auffangen.

### Balancing-Stand nach M3 (`npm run sim`)

- **Insolvenz:** Kein KI-Profil geht in 5 Partien × 3 Gebieten × 15 Jahren pleite. Ohne gestaffeltes Wachstum gerieten Traditionswinzer und Schlitzohr in eine Kreditspirale. Sie konnten das Abfüllen nicht mehr bezahlen und verkauften alles als Fasswein.
- **Spieldauer:** Starke Profile haben nach 5 Jahren rund 60–150 Punkte, nach 10 Jahren 300–640 und nach 15 Jahren 430–1.040. „Normal“ (600) ist damit nach etwa 11–13 Jahren erreicht, „Kurz“ (300) nach 7–9.
- **Kräfteverhältnis:** Im direkten Vergleich gewinnt meist der Traditionswinzer, an der Mosel teilen sich Biopionier, Schlitzohr und Traditionswinzer die Siege. Der Genossenschafts-Typ bleibt mit 50–260 Punkten bewusst der leichte Gegner.
- **Gebiete:** Rheinhessen liegt bei Biopionier und Schlitzohr deutlich zurück, weil Müller-Thurgau als Startsorte wenig Potenzial hat. Das sollte M5 mit allen Gebieten neu bewertet werden.
- **Offen:** Das Vermögen erreicht nach 15 Jahren 3–12 Mio. €. Die Versteigerungen allein schöpfen das nicht ab, weil Investoren viele Lagen wegschnappen und die KI bei 20–35 ha aufhört. Ideen für M4: Barrique und Sekt als Investitionen, mehr Personal ab einer bestimmten Fläche, Marktsättigung im Großhandel.

## 19. Rechtliches

„Winzer“ ist nur der Arbeitstitel. Vor einer Veröffentlichung braucht das Spiel einen eigenen Namen. Grafiken, Musik und Texte des Originals werden nicht übernommen; nur das Spielprinzip wird nachempfunden.
