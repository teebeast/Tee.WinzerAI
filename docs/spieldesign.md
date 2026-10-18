# Spieldesign – WinzerAI

Angelehnt an die Weinbau-Simulationen der 1990er-Jahre. Ziel ist ein kurzweiliges, rundenbasiertes Wirtschaftsspiel rund um ein deutsches Weingut. Es bleibt einfach zugänglich und vermeidet die typischen Schwächen des Genres (Menüwüste, Leerlauf, nötiges Fachwissen).

> Alle Zahlen sind **Startwerte fürs Balancing**. Sie liegen zentral in `src/engine/data/` und werden per Simulation (KI gegen KI) justiert.

---

## 1. Designprinzipien

1. **Eine Entscheidung pro Monat ist genug.** Monate ohne Entscheidung laufen per „Vorspulen“ automatisch durch.
2. **Kein Vorwissen nötig.** Tooltips, ein Lexikon und die Vorschau „Was passiert, wenn…“ ersetzen das Handbuch.
3. **Kalkuliertes Risiko statt Würfelglück.** Das Wetter kommt mit Prognose und Wahrscheinlichkeit, damit z. B. das Pokern auf Eiswein eine bewusste Wette ist.
4. **Liquidität ist der Kern.** Massenwein bringt schnell Geld, Spitzenwein bringt Punkte und Ruhm, kostet aber Zeit. Diese Spannung trägt das Spiel.
5. **Augenzwinkern.** Panschen und Sabotage bleiben im Spiel, sind aber riskant.

## 2. Rahmen

| | |
|---|---|
| Spieler | 1–4, Menschen (Hot-Seat) und/oder KI |
| Runde | 1 Monat; alle Spieler ziehen nacheinander, danach wird der Monat aufgelöst |
| Start | Januar, Jahr 1 |
| Ziel | Wer zuerst die Siegpunkte erreicht, gewinnt. Wählbar: Kurz 300 / Normal 600 / Klassisch 1000 |
| Endlosspiel | Ohne Punkteziel. Per Schieberegler 5, 10, 25 oder 50 Jahre – dann gewinnt die höchste Punktzahl – oder ganz ohne Zeitlimit: Die Partie läuft, bis man sie beendet oder pleitegeht. Die Rangliste zeigt den laufenden Stand. |
| Schwierigkeitsgrad | Nur im freien Spiel, gilt für die menschlichen Spieler: **Leicht** 100.000 € Startkapital, Erlöse +5 %, laufende Kosten −5 % · **Normal** 80.000 €, Erlöse −5 % · **Schwierig** 70.000 €, Erlöse −12 %, Kosten +8 %. Computergegner spielen immer ohne Auf- oder Abschlag (entspricht dem früheren Spielgefühl zwischen Leicht und Normal). Im Balancing-Report (mit Zufalls- und Entscheidungsereignissen) holt die KI unter diesen Bedingungen nach 15 Jahren rund +11 % / −10 % / −22 % Punkte; pleite gehen 0, 0 bzw. 6 von 78 Partien (mit Markttrends und Wetterabwehr der KI). |
| Tages-Challenge | Alle spielen am selben Tag dieselbe Partie: gleiches Szenario, Gebiet, Wetter und dieselben KI-Gegner (2–3, täglich ausgelost). Die Szenarien wechseln täglich: Klassisches Duell, Schuldenberg, Das große Erbe, Neuanfang auf der Brache, Fünf-Jahres-Sprint, Bekannter Name, Wie in alten Zeiten (ohne Klimawandel), Marathon. Sie geben Laufzeit (5–15 Jahre) und Startbedingungen für alle Weingüter vor. Gewertet werden die Punkte am Ende, der Bestwert wird auf dem Gerät gespeichert. Schwierigkeitsgrad: Normal. |
| Niederlage | Ein Spieler ist insolvent, wenn er Kontostand < 0 und Kreditlimit ausgeschöpft hat und das 3 Monate in Folge so bleibt |
| Zufall | Seed-basiert, damit jede Partie reproduzierbar ist (Tages-Challenge, Fehlersuche) |

**Startausstattung:** 10 ha Land: 4 ha bestockt mit einer gebietstypischen Rebsorte (Ertrag ab Jahr 1) und zwei brachliegende Parzellen à 3 ha (Südhang: sehr gute Lage, Talweg: einfache Lage). Alles auf einmal zu bepflanzen sprengt das Startkapital, man muss also priorisieren. Die Lese darf das Konto ins Minus bringen (Dispo). Dazu 80.000 € Startkapital, Edelstahltanks mit 300 hl Kapazität und 1 Vollzeitkraft. Die gebietstypische Startsorte ist die Rebsorte, die im Gebiet am besten passt, zum Beispiel Spätburgunder an der Ahr, Silvaner in Franken und Rheinhessen, Lemberger in Württemberg.

## 3. Anbaugebiete

Es gibt alle 13 deutschen Anbaugebiete, Baden und Württemberg getrennt. Jedes Gebiet hat diese Werte:

- **Wärme** (0–10): bestimmt den Reifezuwachs
- **Frostrisiko** (0–10): Spätfrost im Frühjahr, aber auch Chance auf Eiswein
- **Niederschlag** (0–10): Krankheitsdruck
- **Eignung je Rebsorte** (−2 bis +2): Bonus oder Malus auf Qualität

| Gebiet | Wärme | Frost | Nässe | Stärken |
|---|---|---|---|---|
| Ahr | 5 | 5 | 4 | Spätburgunder |
| Baden | 9 | 2 | 6 | Grau-/Weiß-/Spätburgunder |
| Franken | 5 | 6 | 3 | Silvaner, Müller-Thurgau, auch Riesling und Spätburgunder |
| Hessische Bergstraße | 7 | 3 | 5 | Riesling, Grauburgunder |
| Mittelrhein | 5 | 5 | 5 | Riesling |
| Mosel | 4 | 6 | 5 | Riesling (Steillage) |
| Nahe | 6 | 4 | 4 | Riesling |
| Pfalz | 9 | 2 | 3 | breites Spektrum, Dornfelder |
| Rheingau | 6 | 4 | 4 | Riesling, Spätburgunder |
| Rheinhessen | 7 | 3 | 3 | Silvaner, Müller-Thurgau, Dornfelder |
| Saale-Unstrut | 4 | 8 | 2 | Weißburgunder, Müller-Thurgau, Solaris |
| Sachsen | 4 | 7 | 3 | Müller-Thurgau, Riesling, Solaris |
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
| Feb | Rebschnitt | Abfüllen, Verkauf |
| Mär | Pflanzen möglich | Messe (Reputation) |
| Apr | Pflanzen möglich, **Spätfrostrisiko** | |
| Mai | Pflanzenschutz läuft (Kosten Mai–August), Spätfrostrisiko | |
| Jun | Laubarbeit | **Regionale Weinprämierung** |
| Jul | **Grüne Lese** (−30 % Menge, +1 Stufe Qualität), Hagelrisiko | Hoffest/Weinprobe |
| Aug | Reifebeginn, Lese für Sekt-Grundwein möglich | Flaschen/Etiketten bestellen |
| Sep | **Lese** (frühe Sorten optimal) | Keltern |
| Okt | **Lese** (Hauptlese) | Keltern |
| Nov | Lese möglich, **Fäulnisrisiko** steigt stark | **Große Rebenkrone** (bundesweite Prämierung) |
| Dez | Eiswein-Chance (ab −7 °C) | Jahresabschluss: Zinsen, Gehälter, Bilanz |

### Leerlauf vermeiden

Wenn die Aufgabenliste leer ist, kann der Spieler „Bis zum nächsten Ereignis vorspulen“ wählen. Das Spiel hält dann bei jeder Entscheidung an.

## 6. Wetter & Reife

- **Monatswetter:** Temperatur-Abweichung, Niederschlag, Sonne. Daraus ergibt sich der **Reifezuwachs in °Oechsle**.
- **Prognose:** Für die nächsten 2 Monate gibt es Wahrscheinlichkeiten, z. B. „Oktober: 60 % sonnig, 30 % nass, 10 % früher Frost“. Je weiter in der Zukunft, desto unschärfer.
- **Klimawandel** (beim Spielstart abschaltbar, Standard an): Jedes Spieljahr wird jedes Gebiet um 0,1 Wärmestufen wärmer. Die Frostchance für Eiswein sinkt um 1 Prozentpunkt pro Jahr (mindestens 5 %), Hitzewellen werden um 0,5 Prozentpunkte pro Jahr häufiger. Kühle Gebiete holen dadurch im Lauf des Spiels auf.

### Reife & Lesezeitpunkt

- Ab August steigt das Mostgewicht jeden Monat abhängig von Sonne, Gebietswärme und Reifebedarf der Sorte.
- Die **Menge** erreicht im Oktober ihr Maximum. Ab November sinkt sie durch Fäulnis und Vogelfraß.
- **Edelfäule (Botrytis):** Bei wechselhaftem Wetter im Oktober oder November (Morgennebel, Nachmittagssonne) kann sie ab 80 °Oe einsetzen. Die Chance liegt bei 35 % × (0,5 + Fäulnisanfälligkeit). Dann halbiert sich die Menge, das Mostgewicht steigt aber um 30 °Oe, auch über das Sortenmaximum hinaus. Ein zweiter Schub („Rosinen“) macht die Trockenbeerenauslese ab 150 °Oe möglich. Nasses Wetter bringt dagegen Graufäule.
- **Eiswein-Wette:** Im November oder Dezember lässt man eine Parzelle ab 80 °Oe ausdrücklich für Eiswein hängen; eine normale Lese hebt die Wette wieder auf.
  - Frost von −7 °C im Dezember tritt mit 20 % + 4 % × Frostrisiko ein (Mosel 44 %, Rheinhessen 32 %, Pfalz 28 %). Die Chance wird je Gebiet einmal ausgewürfelt und im November und Dezember angezeigt.
  - Bei Frost gibt es Eiswein mit mindestens 125 °Oe, aber nur 15 % der normalen Menge, zu 1,5-fachen Lesekosten. Ohne Frost ist die Ernte verloren.

### Qualitätsstufen (vereinfacht)

| Stufe | Mostgewicht | Besonderheit | Punkte bei AP-Anmeldung |
|---|---|---|---|
| Deutscher Wein | < 60 °Oe | keine AP nötig | 0 |
| Qualitätswein | ≥ 60 | | 1 |
| Kabinett | ≥ 73 | | 2 |
| Spätlese | ≥ 80 | Lese ab Oktober | 4 |
| Auslese | ≥ 90 | Selektion per Hand | 8 |
| Beerenauslese | ≥ 110 | meist nur mit Botrytis | 15 |
| Trockenbeerenauslese | ≥ 150 | nur mit doppelter Botrytis, sehr kleine Menge | 30 |
| Eiswein | ≥ 125 | nur über die Eiswein-Wette | 25 |

Jeder Wein hat neben der Stufe eine **Güte von 0–100**. Sie ergibt sich aus Qualitätspotenzial, Eignung von Gebiet und Sorte, Gesundheit des Leseguts, Leseart, Kellermeister und Ausbau. Die Güte entscheidet bei Prämierungen und über den Preis.

## 7. Lese

| Leseart | Kosten | Tempo | Effekt |
|---|---|---|---|
| Handlese | 1.500 €/ha (Saisonkräfte) | 2 ha je Arbeitskraft/Monat | Selektion möglich: −40 % Menge, +1 Stufe |
| Vollernter (Lohnunternehmer) | 600 €/ha | unbegrenzt | −5 Güte, keine Auslese oder höher |
| Eigener Vollernter | 180.000 € einmalig, 100 €/ha | unbegrenzt | wie oben |

## 8. Keller

- **Keltern:** passiert automatisch nach der Lese, 1 ha ≈ Ertrag in hl Most.
- **Lagerkapazität:** Edelstahltank (200 € pro hl). Die Barrique-Kapazität kostet 600 € pro hl und wird separat gekauft.
- **Barrique:** Wein aus dem Tank lässt sich ins Eichenfass umlagern, solange Platz ist. Er reift dann mindestens 12 Monate und gewinnt Güte (Rotwein +6, Weißwein +2); im Tank wird dafür Platz frei. Eiswein und Trockenbeerenauslese bleiben im Tank.
- **Vinothek:** Verkaufsraum mit Probierstube für 150.000 € und 1.000 € pro Monat. Sie bringt +30 % Ab-Hof-Nachfrage und einmalig +5 Bekanntheit.
- **Ausbauzeit bis zur Abfüllreife:** einfache Weine 3 Monate, Prädikate 6 Monate, Barrique 12 Monate.
- **Fassweinverkauf** an die Großkellerei geht **jederzeit** und sofort, aber billig (1,0–3,0 € pro Liter je nach Stufe und Güte). Das ist der Liquiditätsanker: Beim Start-Weingut deckt reiner Fassweinverkauf ungefähr die laufenden Kosten, Gewinn bringt erst die Flasche.
- **Abfüllung:** 1 hl ergibt 133 Flaschen à 0,75 l. Flaschen, Korken und Etiketten kosten 0,60 € pro Flasche (Mengenrabatt ab 10.000).
- **Sekt:** Aus ausgebautem Grundwein entsteht in Flaschengärung Sekt; das kostet 1,60 € pro Flasche (Flasche plus Gärung). Er reift 9 Monate auf der Hefe, ist bis dahin unverkäuflich und bekommt +3 Güte. Die Prüfung bringt 10 Punkte bei Güte ≥ 80, sonst 3. Ab Hof liegt der Grundpreis bei 12 €, bei Prämierungen gibt es +6 auf die Wertung. Ungeprüfter Sekt geht nur als einfacher Schaumwein zum halben Preis weg.
- **Kellermeister:** Jeden Januar bewerben sich drei Kandidaten (für alle Spieler gemeinsam; wer zuerst einstellt, bekommt ihn). Jeder hat ein Talent (+1 bis +5 Güte für jede Lese) und 1–3 Fähigkeiten. Erfahrung: alle vier Dienstjahre +1 Güte, höchstens +2. Gehalt: 2.500 € + 350 € je Talentpunkt + 600 € je Fähigkeit. Ein neuer Kellermeister löst den bisherigen ab.

| Fähigkeit | Wirkung |
|---|---|
| 🍾 Sekt | Voraussetzung für Sekt (Flaschengärung) |
| 🛢️ Barrique | Voraussetzung für den Ausbau im Eichenfass |
| 🍷 Rotwein | +3 Güte bei roten Sorten |
| 🥂 Weißwein | +3 Güte bei weißen Sorten |
| 🍯 Edelsüß | +4 Güte ab 95 °Oe (Auslese und höher, Eiswein) |
| 💡 Sparsam | −25 % Kosten fürs Abfüllen und die Sektherstellung |

Ein Spitzen-Kellermeister bringt so bis zu +11 Güte (Talent 5, Erfahrung 2, Edelsüß 4) – im Schnitt holt die KI etwa so viel heraus wie früher mit dem festen +5-Kellermeister. Die KI bewertet Bewerber nach Talent, den Fähigkeiten, die ihr Profil braucht (Sekt, Barrique), und dem Gehalt; im Januar wechselt sie, wenn ein Bewerber deutlich besser passt.

## 9. Weinprüfung (AP-Nummer)

Der abgefüllte Wein wird angemeldet (Gebühr 150 € pro Posten, mindestens 5 hl = 665 Flaschen). Kleine Abfüllungen desselben Weins landen im selben Posten. Er bekommt dann seine Prädikatsbezeichnung und **Siegpunkte** (siehe Tabelle). Ohne AP-Nummer gilt jeder Wein als „Deutscher Wein“. Bei der Prüfung werden auch gepanschte Weine entdeckt (siehe §13).

## 10. Vertrieb & Preise

| Kanal | Voraussetzung | Preis | Menge |
|---|---|---|---|
| Fasswein an Kellerei | – | sehr niedrig | unbegrenzt, sofort |
| Großhandel | AP-Nummer | niedrig, sinkt mit der Jahresmenge | groß |
| Hofladen/Direktvermarktung | – | hoch, abzüglich 20 % Vertriebskosten | 150 + 30 × Bekanntheit Flaschen/Monat, automatisch |
| Online-Shop | 15.000 € Einrichtung | wie Hofladen | zusätzlich 40 × Bekanntheit Flaschen/Monat |
| Exportvertrag | Anfrage (ab Bekanntheit 20, 8 % pro Monat) | fest vereinbart, etwa 75 % des Ab-Hof-Grundpreises | 300–1.500 Flaschen/Monat über 12 Monate |

**Flaschenpreis** = Basispreis der Stufe (3 € Deutscher Wein bis 25 € Beerenauslese) × (0,5 + Güte/100) × (0,8 + Bekanntheit/250). Der Großhandel zahlt 45 % davon. Eine Marktsättigung ist für später vorgesehen.

Der Hofladen verkauft geprüfte Weine und Deutschen Wein, ältere Posten zuerst. Ungeprüfte Prädikatsweine und ungeprüfter Sekt warten auf die Prüfung. Nur Restposten, die für eine Prüfung zu klein sind (unter 665 Flaschen), gehen als einfacher Wein weg. Zur Prämierung angemeldete Weine und reifender Sekt bleiben im Lager.

**Export:**
- Eine Anfrage gilt einen Monat. Wer annimmt, liefert 12 Monate lang automatisch am Monatsende, noch vor dem Hofverkauf.
- Geliefert werden geprüfte Weine ab der geforderten Stufe und Güte, die schwächsten passenden zuerst.
- Fehlende Flaschen kosten 2 € Strafe pro Flasche. Wer alle 12 Monate vollständig liefert, bekommt +15 Punkte und +5 Bekanntheit.

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

**Pflanzenschutz-Strategie** (jederzeit änderbar, Start: konventionell). Die Kosten je bestocktem ha werden auf Mai bis August verteilt:

| Strategie | Kosten/ha und Saison | Schutz | Effekt |
|---|---|---|---|
| Keiner | 0 | 0 % | |
| Konventionell | 600 € | 90 % | |
| Bio | 900 € | 70 % | Voraussetzung für die Bio-Siegel (siehe unten); wer wechselt, verliert Siegel und Umstellungszeit |

**Bio-Zertifizierung** (`src/engine/bio.ts`, `src/engine/data/bio.ts`): Mit dem Wechsel auf Bio-Pflanzenschutz beginnt die Umstellung. Nach 24 Monaten lässt sich das erste Siegel beantragen, jede weitere Stufe nach 12 Monaten auf der vorigen. Siegel kommen nur auf Antrag; jedes Jahr im Januar fällt die Jahresgebühr an. Wer den Bio-Pflanzenschutz aufgibt oder beim Panschen erwischt wird, verliert alle Siegel (Meldung für alle).

| Stufe | Voraussetzung | Antrag | Jahresgebühr | Wirkung |
|---|---|---|---|---|
| 🍃 Grünblatt | 24 Monate Umstellung | 1.500 € | 600 € | +10 % auf alle Flaschenpreise, +2 Bekanntheit |
| 🌿 Terravita | 12 Monate Grünblatt | 3.000 € | 1.500 € | +18 % Preise, +10 % Ab-Hof-Nachfrage, +4 Bekanntheit |
| 🌙 Lunaris | 12 Monate Terravita | 5.000 € | 2.500 € | +28 % Preise, +15 % Nachfrage, +2 Güte, +8 Bekanntheit; dafür +25 % Pflanzenschutzkosten und −5 % Ertrag |

Der Biopionier beantragt jede Stufe, sobald er darf und die Gebühr seine Reserve nicht angreift. Die Weinberg-Seite zeigt die Stufenleiter mit Fortschritt der Umstellung.

**Krankheiten & Schädlinge.** Sie treffen nur tragende Parzellen. Der Schutz senkt die Chance um seinen Prozentsatz:

| Krankheit | Wann | Chance (ohne Schutz) | Folge |
|---|---|---|---|
| Peronospora | Mai–Aug, nasser Monat | 40 % × Sortenanfälligkeit × (0,5 + Nässe/10) | −30 % Menge |
| Oidium | Jun–Aug, sonniger Monat | 25 % × Sortenanfälligkeit | −20 % Gesundheit |
| Kirschessigfliege | September, rote Sorten | 30 % | −15 % Menge, −10 % Gesundheit |
| Botrytis | Okt/Nov | siehe §6 | Fluch oder Segen |

**Zufallsereignisse:**

| Ereignis | Wann | Chance | Folge |
|---|---|---|---|
| Spätfrost | April, Mai | 2 % × Frostrisiko pro Monat (4–16 %) | −40 % Menge aller tragenden Parzellen |
| Hagel | Juni–August | 5 % pro Monat, +0,2 Prozentpunkte je Jahr Klimawandel | eine Parzelle (30 %: zwei) −50 % Menge, −10 % Gesundheit |
| Hitzewelle | Juli, August bei Sonne | 15 % | −10 % Menge, −5 % Gesundheit, +4 °Oe |
| Dürre | Juli, August bei Sonne | 8 %, +0,8 Prozentpunkte je Jahr Klimawandel, in nassen Gebieten seltener | −15 % Menge, −5 % Gesundheit |
| Kellerei-Insolvenz | jederzeit, für alle | 1,5 % pro Monat | 6 Monate halber Fassweinpreis |

**Wetterabwehr** (`src/engine/defense.ts`, Karte „Wetterschutz“ auf der Weinberg-Seite):

| Maßnahme | Kosten | Wirkung |
|---|---|---|
| 🕯️ Frostkerzen | 400 €/ha tragender Fläche, für einen Monat (April/Mai) | kein Spätfrostschaden in diesem Monat |
| 🕸️ Hagelnetz | einmalig 3.000 €/ha je Parzelle | hält 90 % des Hagelschadens ab |
| 💧 Tröpfchenbewässerung | einmalig 2.500 €/ha je Parzelle | kein Schaden durch Hitzewelle und Dürre (die Süße legt trotzdem zu) |
| 🛡️ Ernteversicherung | Abschluss Januar–April für das Jahr; Prämie je tragendem ha 210 € + 85 € je Stufe Frostrisiko | zahlt 80 % des verlorenen Werts (8.000 €/ha) bei Frost, Hagel, Dürre, Sturmböen und Jahrhundertunwetter |

Die Versicherung ist knapp kalkuliert: In KI-Partien (Traditionswinzer, alle Gebiete, 12 Jahre) fließen rund 80 % der Prämien als Entschädigung zurück – sie lohnt sich als Schutz vor dem großen Schaden, nicht als Geschäft. Vorsichtige KI-Profile (alle außer dem Schlitzohr) versichern jedes Jahr, stellen ab 10 % Frostgefahr Kerzen auf und bewässern mit zunehmender Dürregefahr nach und nach ihre größte Lage.

**Ereigniskatalog** (`src/engine/events.ts`, in den Einstellungen abschaltbar): Jedes Weingut erlebt in 35 % der Monate ein Ereignis. Welches, entscheidet das Gewicht der Seltenheitsstufe, eingeschränkt auf Ereignisse, die zu Monat und Betrieb passen (Ernteschäden nur mit tragenden Reben, Diebstahl nur mit vollem Lager usw.).

| Stufe | Gewicht | Anzahl | Beispiele |
|---|---|---|---|
| Alltag | 10 | 15 | Wandergruppe (+150–500 €), defekte Pumpe, Lokalblatt (+1 Bekanntheit), Stare und Wildschweine (−4–6 % Ernte), Weinfest (+20 % Nachfrage für einen Monat) |
| Gelegentlich | 3 | 14 | Firmenfeier (+2.000–5.000 €), Weinführer-Empfehlung, Influencerin (+30 % Nachfrage), Förderprogramm (+3.000–8.000 €), Wasserschaden im Keller, höhere Energiepreise (+8 % Kosten für ein halbes Jahr), Rebschnitt-Profi (+3 Güte für den Jahrgang) |
| Selten | 1 | 11 | Orkan (−6.000–12.000 €), Filmdreh auf dem Hof (+10.000–20.000 €), Erbschaft, Winzer des Jahres (+15 Punkte), Reblaus, Listung bei einer Handelskette (+50 % Nachfrage für ein halbes Jahr), Preiskampf der Discounter |
| Sehr selten | 0,15 | 7 | Jahrhundertunwetter (−70 % Ernte), Kellerbrand, 100 Punkte vom Weinpapst (+40 Punkte, doppelte Nachfrage), Vermögen geerbt (+150.000 €), Hangrutsch (eine Lage verloren), Weinskandal im Gebiet, Exportboom |

Ein bestimmtes Alltagsereignis trifft ein Weingut etwa zweimal in zehn Jahren, ein bestimmtes sehr seltenes in weniger als einem von hundert Spieljahren. Im ersten Jahr bleiben seltene und sehr seltene Rückschläge aus, solange die Kasse am knappsten ist. Geldbeträge sind so gewählt, dass Glücksfälle und Rückschläge sich im Mittel etwa die Waage halten. Befristete Folgen (Nachfrage, Preise, Kosten, Güte) stehen auf der Hof-Seite unter „Neuigkeiten“, seltene und sehr seltene Ereignisse erfahren alle am Tisch.

**Entscheidungsereignisse** (`src/engine/decisions.ts`): Ein Teil der Monatsereignisse stellt das Weingut vor eine Wahl. Sie stehen mit Titel, Beschreibung und den Folgen jeder Möglichkeit als Hinweis unter den Reitern – auf jeder Seite – und gelten bis Monatsende; ohne Antwort greift die vorsichtige Wahl (meist „Ablehnen“). Kostspielige Möglichkeiten müssen über Konto und freien Kreditrahmen finanzierbar sein, ein Fehlbetrag wird per Kredit gedeckt. Computergegner entscheiden sofort nach einfachen Regeln (etwa nur zahlen, wenn danach noch 20.000 € Rücklage bleiben).

| Stufe | Entscheidungen |
|---|---|
| Alltag | Stand auf dem Stadtweinfest, Spende fürs Vereinsfest, bezahlte Influencer-Werbung |
| Gelegentlich | Großauftrag vom Discounter (halber Preis, Ramsch-Image), Reportage im Weinmagazin (Chance auf Hymne oder Verriss), Erntehelfer wollen mehr Lohn, gebrauchte Tanks zum halben Preis |
| Selten | Der Nachbar verkauft seine Lage privat, Kellermeister wird abgeworben, Auftritt in einer Kochsendung, Einladung zur internationalen Weinmesse |

**Lebendige Gegner** (`src/engine/rivals.ts`): Jeder Computergegner führt ein Verhältnis zu jedem anderen Weingut (−100 bis +100; 😊 befreundet ab 40, 🙂 freundlich ab 10, 😐 neutral, 😒 verstimmt, 😠 verfeindet ab −40). Es verblasst jeden Monat um 5 % Richtung neutral.

| Anlass | Verhältnis |
|---|---|
| Bei einer Sabotage gegen ihn erwischt | −60 |
| Weinberg bei der Versteigerung weggeschnappt (er hatte mitgeboten) | −10 |
| Weinskandal im eigenen Gebiet (alle Nachbarn) | −10 |
| Gemeinsamer Messestand / Wein verkauft / Erntehilfe angenommen | +15 / +10 / +5 |
| Messestand oder Weinkauf abgelehnt | −5 / 0 |

Freundliche und neutrale Nachbarn im selben Gebiet bieten Menschen Kooperationen als Entscheidung an: gemeinsamer Messestand (3.000–5.000 €, beide +5 Bekanntheit), Weinkauf, wenn ihnen Wein fehlt (20–40 hl zum 1,3-fachen Fassweinpreis, März–August), und ab „freundlich“ Erntehilfe im September/Oktober (+3 Güte für den Jahrgang). Verstimmte Nachbarn (ab −30) starten mit 5 % Chance pro Monat eine Rabattaktion (drei Monate −15 % Ab-Hof-Nachfrage), verfeindete (ab −60) beschweren sich mit 4 % Chance öffentlich (−3 Bekanntheit). Das Schlitzohr beschädigt im Juni oder Juli den Weinberg seines Erzfeinds (ab −40). Feindseligkeiten gehören zu den Zufallsereignissen und entfallen, wenn diese abgeschaltet sind.

Computergegner reagieren außerdem auf Markttrends: Ist das Ziel einer ihrer tragenden Sorten auf 88 % oder weniger gefallen und eine ihrer Profilsorten auf 110 % oder mehr gestiegen, roden sie im Januar die kleinste betroffene Parzelle (öffentliche Meldung) und pflanzen im Frühjahr nach Eignung und Marktrichtung neu.

Die Rangliste zeigt unter „Nachbarschaft“, wie jeder Computergegner zu dir steht.

**Kundenaufträge** (`src/engine/orders.ts`, Unterseite „📦 Aufträge“): Ab Jahr 2 kommt mit 30 % Chance pro Monat eine Anfrage eines erfundenen Kunden (höchstens drei offen, jede zwei Monate gültig). Kunden verlangen eine Rebsorte (meist eine eigene), eine Farbe, beliebigen Wein oder Sekt, dazu Mindeststufe und Mindestgüte; der Bio-Weinclub nur bei Bio-Betrieben und mit Siegel. Die Menge richtet sich nach der bestockten Fläche (mindestens 200 Flaschen), der Preis nach Listenpreis der Stufe × Güte × Kundenaufschlag (0,85–1,45) – meist besser als der Hofladen nach Vertriebskosten. Höchstens drei angenommene Aufträge; geliefert wird jederzeit bis zum Termin (2–8 Monate nach Ablauf der Anfrage) aus geprüften Flaschen, die einfachsten zuerst. Lieferung bringt 2–12 Punkte (etwa eine Bronze- bis Silbermedaille) und 2–4 Bekanntheit; ein verpasster Termin kostet 15 % des Auftragswerts und 4 Bekanntheit. Anfragen erscheinen unter „Neuigkeiten“ und als Zähler am Reiter. Computergegner nehmen nur an, was sie sofort liefern können (je nach Profil 15–45 % der Anfragen).

**Markttrends** (`src/engine/trends.ts`): Jede Rebsorte und Sekt haben eine Beliebtheit als Preisfaktor (80–130 %) auf Ab-Hof-, Großhandels- und Fassweinpreise. Zu Spielbeginn liegen alle bei 85–115 %. Je Sorte und Monat bekommt der Trend mit 3 % Chance ein neues Ziel (meist nahe 100 %, selten ein Boom oder Absturz); der Wert nähert sich ihm jeden Monat um 8 % des Abstands, braucht für einen Umschwung also gut ein Jahr. Ändert sich das Ziel um mindestens 15 Prozentpunkte, erscheint die Nachricht für alle. Die Keller-Seite zeigt den Weinmarkt mit Richtung, die Sortenauswahl beim Pflanzen den Trend je Sorte. Die KI wählt beim Pflanzen nach Eignung und Zielrichtung des Marktes.

**Weinberge verkaufen und roden:** Jede Parzelle außer der letzten lässt sich jederzeit für 90 % des Schätzwerts verkaufen (Trauben am Stock gehen mit). Bestockte Parzellen können für 2.000 €/ha gerodet werden; die Brache wird dann im März oder April mit einer neuen Sorte bepflanzt und trägt wie jede Junganlage erst ab dem dritten Jahr.

**Weinbergversteigerung (Live-Event):**
- Alle 8–16 Monate (zufällig) wird eine Versteigerung angekündigt und im Folgemonat abgehalten. Je Anbaugebiet, in dem noch jemand wirtschaftet, kommen 1–3 Weinberge à 1–5 ha unter den Hammer. Rund 60 % davon sind bereits bestockt (3–27 Jahre alt) und tragen sofort, der Rest ist Brache.
- Die Lagenqualität reicht von −1 bis +2 und bringt je Stufe ±4 Güte. Schätzwert: Boden 25.000 €/ha plus Reben 15.000 €/ha, je Lagenstufe ±15 %. Ausrufpreis 70 % des Schätzwerts, Mindestschritt 4 % (mindestens 1.000 €).
- Zu Monatsbeginn öffnet sich das Live-Fenster: Die Lose kommen nacheinander dran, Menschen bieten Runde für Runde (Mindestgebot, Sprunggebote, eigener Betrag) oder steigen aus. Mehrere Menschen im selben Gebiet bieten abwechselnd.
- Computergegner hinterlegen im Ankündigungsmonat ein verdecktes Höchstgebot (Schätzwert × Profilaufschlag), auswärtige Investoren bieten bei 85 % der Lose bis 85–135 % des Schätzwerts. Sie überbieten jeweils um einen Schritt, solange ihr Limit reicht; untereinander steigt der Preis bis knapp über das zweithöchste Limit.
- Wer mehr bietet als alle Limits, bekommt den Zuschlag sicher – auch weit über dem Schätzwert. Ein Gebot muss über Konto und freien Kreditrahmen finanzierbar sein, ein Fehlbetrag wird beim Zuschlag automatisch über den Kredit gedeckt.
- Bleibt ein Mensch bis Monatsende untätig, gilt das als Aussteigen; ein bereits führendes Gebot bleibt bestehen.

## 13. Panschen & Sabotage

**Panschen** an einer Charge im Keller:

| Methode | Effekt | Entdeckungsrisiko |
|---|---|---|
| Strecken mit Wasser | +20 % Menge, −15 Güte | 15 % bei AP-Prüfung |
| Unerlaubte Aufzuckerung | +1 Stufe | 25 % bei AP-Prüfung |
| „Frostschutz-Süße“ (Anspielung auf den Glykolskandal von 1985) | +2 Stufen | 40 %, außerdem zufällige Kontrollen |

Gepanscht wird höchstens einmal pro Monat und nie zweimal am selben Wein. Der Wein trägt die Markierung in die Flasche weiter.

Solange gepanschter Wein im Betrieb lagert, kontrolliert die Weinaufsicht zusätzlich mit 3 % pro Monat. Wird Panschen entdeckt (öffentlicher **Weinskandal**), wird **aller** gepanschte Wein in Tank und Flasche beschlagnahmt. Dazu kommen eine Strafe von 20.000 €, −50 Punkte und −40 Bekanntheit.

**Sabotage** gegen einen Mitspieler:
- Gerüchte streuen: 3.000 €, −10 Bekanntheit beim Ziel
- Weinberg beschädigen: 8.000 €, −30 % Ertrag auf einer Parzelle

Das Entdeckungsrisiko liegt bei 30 %. Wer erwischt wird, zahlt 25.000 € Strafe, verliert −30 Bekanntheit, und die Sabotage misslingt. Das Ganze ist öffentlich. Panschen und Sabotage teilen sich das Limit von einer Intrige pro Monat. Weinberg-Sabotage wirkt nur bis zur nächsten Lese.

## 14. Finanzen

- **Laufende Kosten pro Monat:** 2.500 € je Vollzeitkraft, eine je 10 ha, mindestens eine, dazwischen anteilig (11 ha = 1,1 Kräfte). Kellermeister je nach Talent und Fähigkeiten 3.500–6.100 €, Vinothek 1.000 €, Pflanzenschutz siehe §12.
- **Marktsättigung im Großhandel:** Je 20.000 Flaschen, die ein Weingut im Jahr an den Großhandel verkauft, zahlt er 10 % weniger, höchstens 50 % weniger. Zum Jahreswechsel wird zurückgesetzt. Bewirtschaftung 350 € pro ha bestockt (auch Junganlagen), Brache 50 € pro ha.
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

Ab M4 kommen hinzu:
- **Pflanzenschutz:** Der Biopionier stellt auf Bio um, alle anderen schützen konventionell.
- **Export:** Angenommen wird nur, wenn der passende Vorrat für mindestens vier Monate reicht.
- **Eiswein:** Traditionswinzer und Schlitzohr wetten nur in Gebieten mit mindestens 35 % Frostchance, und höchstens mit einer Nebenfläche bis 25 % der tragenden Fläche.
- **Sekt:** Traditionswinzer und Biopionier setzen jeden April 15 hl an.
- **Schlitzohr:** Es zuckert alle drei Jahre eine kleine Charge (bis 120 hl) auf, aber nur mit mindestens 150.000 € freiem Kreditrahmen. Außerdem streut es im Mai Gerüchte über den Spitzenreiter.

Ab M5 kommen hinzu:
- **Sparmodus (alle Profile):** Ist der Kredit zu mehr als 75 % ausgeschöpft, wird der Kellermeister entlassen und es gibt nur noch günstiges Marketing, keine Fässer und keine Vinothek. Der Vorrat schrumpft auf drei Monate, der Rest geht an den Großhandel. Ohne diese Regel gab die KI oft geliehenes Geld (etwa fürs Abfüllen) für Gehälter und Werbung aus.
- **Barrique:** Traditionswinzer und Schlitzohr kaufen ab Jahr 3 bis zu 200 hl Barrique, sobald sie rote Reben haben, und legen den besten frischen Rotwein hinein.
- **Vinothek:** Jedes Profil baut eine, sobald Reserve, Baukosten und 100.000 € Polster auf dem Konto liegen.
- **Rebsorten:** Die Wunschliste umfasst jetzt auch die neuen Sorten (Lemberger, Weißburgunder, Grauburgunder, Trollinger, Regent). Gepflanzt wird die, die am besten zum Gebiet passt.
- **Profilwerte:** Das Schlitzohr nutzt höchstens 70 % des Kreditrahmens und bietet bei Versteigerungen bis 135 % des Schätzwerts.

## 16. Bedienung

- **Hauptbildschirm (Dashboard)** mit Monat/Jahr, Wetter samt Prognose, Kontostand, Punkten und Rangliste
- **Weinberg-Karte:** Parzellen als Kacheln zeigen Sorte, Alter, Reife und Gesundheit
- **Aufgabenliste** „Diesen Monat“: Der Ratgeber (`advisor.ts`) zeigt, was ansteht, etwa Lese, Pflanzzeit, abfüllbereiter Wein, Prüfung, Prämierung, Versteigerung, Exportanfrage, Eiswein-Entscheidung oder ein Minus auf dem Konto.
- **Vorspulen** (nur mit einem Menschen am Tisch): Monate laufen durch, bis eine wichtige Entscheidung ansteht, höchstens ein Jahr. Die KI zieht wie gewohnt mit.
- **Keller** als Liste der Chargen (Stufe, Güte, Menge, Reife), **Verkauf** und **Finanzen**
- **Hot-Seat:** Übergabebildschirm „Spieler 2 ist dran“, damit niemand die Werte der anderen sieht. Er erscheint nur, wenn mehrere Menschen mitspielen; KI-Züge laufen ohne Unterbrechung.
- **Rangliste** mit Punkten, Bekanntheit, Rebfläche und Vermögen aller Weingüter
- **Lexikon:** 26 Fachbegriffe von Oechsle bis Vinothek, mit Suche. Dazu Tooltips an den Aktionsknöpfen, die erklären, warum etwas gerade nicht geht.
- **Grafik:** eine kleine SVG-Landschaft im Kopf, die mit Jahreszeit und Wetter wechselt (kahle Reben im Winter, Trauben ab Juli, Herbstlaub). Im Weinberg zeigen Reifebalken das Mostgewicht.
- **Sound:** kurze Klänge per Web Audio ohne Audiodateien für Lese, Verkauf, Monatswechsel, Medaille, Frost und Skandal. Ein Ton-Schalter merkt sich die Einstellung.
- Bedienbar mit Maus, Touch und Tastatur; responsiv vom Handy bis zum Desktop

## 17. Technik

- **PWA:** TypeScript, Vite, Svelte 5 und vite-plugin-pwa; installierbar und offlinefähig
- **Engine** (`src/engine/`) ohne UI-Abhängigkeit:
  - `GameState` ist ein serialisierbares Objekt
  - `applyAction(state, action)` ist eine reine Funktion; der Monatsabschluss läuft über die Aktion `endTurn` des letzten Spielers
  - Ein Seed-basierter Zufallsgenerator (Zustand liegt im GameState)
- **Spielstände:** Jede Partie hat einen eigenen Speicherplatz und wird nach jedem Zug gesichert; im Hauptmenü lassen sich alle Spielstände laden oder löschen. Die Desktop-App legt sie als JSON-Dateien unter `%LOCALAPPDATA%WinzerAISpielstände` ab (Tauri-Befehle in `src-tauri/src/lib.rs`), im Browser liegen sie in localStorage. Die Bestwerte der Tages-Challenge bleiben in localStorage.
- **Tests** mit Vitest: Engine-Tests, ein serverseitiger Render-Smoke-Test und Klick-Tests im simulierten Browser (jsdom).
- **Balancing-Report:** `npm run sim` lässt jedes KI-Profil in jedem der 13 Gebiete 3 Partien über 15 Jahre spielen und danach alle Profile gegeneinander antreten (`scripts/balance.sim.ts`).
- **Später:** asynchroner Online-Mehrspieler. Durch die reine Engine reicht es, Aktionen zu synchronisieren.

## 18. Meilensteine

| # | Inhalt |
|---|---|
| ✅ **M1 – Kernzyklus** | 1 Spieler, 3 Gebiete, 5 Sorten. Wetter, Reife, Lese, Keller, Fassweinverkauf, AP-Prüfung, Punkte |
| ✅ **M2 – Markt** | Abfüllung, Direktvermarktung, Großhandel, Online-Shop, Bekanntheit, Marketing, Prämierungen, Kellermeister, Tankausbau, Kredit, Insolvenz |
| ✅ **M3 – Gegner** | KI-Gegner mit 4 Profilen, Weinbergversteigerung mit Investorengebot, Lagenqualität, Rangliste, Balancing-Report |
| ✅ **M4 – Würze** | Pflanzenschutz und Krankheiten, Wetter- und Glücksereignisse, Botrytis/BA/TBA, Eiswein-Wette, Sekt, Export, Panschen mit Weinskandal, Sabotage, Personal nach Fläche |
| ✅ **M5 – Feinschliff** | alle 13 Gebiete und 11 Sorten (inkl. PIWI), Klimawandel, Tages-Challenge, Lexikon, Aufgabenliste und Vorspulen, Barrique, Vinothek, Großhandelssättigung, Landschaftsgrafik und Sound |

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

### Balancing-Stand nach M4 (`npm run sim`)

- **Insolvenz:** Weiterhin geht kein KI-Profil in 5 × 3 Partien über 15 Jahre pleite. Dafür waren drei Korrekturen nötig:
  - Spätfrost halbiert: Vorher traf er die Mosel in rund 23 % der Jahre.
  - Personal je 10 ha statt je 8 ha, sonst bräuchte schon das Startweingut zwei Kräfte.
  - Das Schlitzohr panscht nur noch kleine Chargen mit Rücklage. Vorher konnte ein Skandal den ganzen Jahrgang beschlagnahmen und es in die Insolvenz treiben.
- **Spieldauer:** Starke Profile stehen nach 10 Jahren bei 390–780 Punkten, nach 15 Jahren bei 760–1.330. „Normal“ (600) ist nach etwa 9–12 Jahren erreicht.
- **Kräfteverhältnis:** Biopionier (seit M4 mit Kellermeister) und Traditionswinzer teilen sich die Siege. Das Schlitzohr bleibt durch Skandale und Strafen schwankend, der Genossenschafts-Typ ist der leichte Gegner.
- **Offen:** Das Vermögen erreicht nach 15 Jahren weiterhin 2–9 Mio. €. M5 sollte eine echte Geldsenke bringen, zum Beispiel Barrique-Ausbau, Kellerneubau oder eine Marktsättigung im Großhandel.

### Balancing-Stand nach M5 (`npm run sim`, 13 Gebiete × 3 Partien × 15 Jahre)

- **Zählfehler im Report:** Bis M4 zählte der Report Insolvenzen mitten im Jahr nicht mit. Die früheren „0 Pleiten“ waren daher zu optimistisch. Nach der Korrektur ging das Schlitzohr in 13 von 39 Partien pleite.
- **Insolvenz heute:** Mit Sparmodus und anteiligem Personal sind es noch 2 von 39 Partien beim Schlitzohr (beide Sachsen) und 1 von 39 beim Biopionier. Traditionswinzer und Genossenschafts-Typ gehen nie pleite.
- **Personal:** Wird jetzt anteilig berechnet. Vorher kostete eine Erbschaft von 1 ha über 10 ha hinaus sofort eine ganze zweite Stelle, was Rotwein-Betriebe an der Ahr in die Insolvenz trieb.
- **Spieldauer:** Starke Profile erreichen 600 Punkte („Normal“) je nach Gebiet nach etwa 8–12 Jahren. Nach 15 Jahren liegen sie zwischen 650 (Württemberg) und 1.790 Punkten (Bergstraße, Baden).
- **Gebiete:** Warme Riesling- und Burgundergebiete bleiben vorn. Franken (jetzt mit Riesling- und Spätburgunder-Eignung) sowie Sachsen und Saale-Unstrut (eine Wärmestufe mehr) haben aufgeholt.
- **Offen:**
  - Das Vermögen erreicht weiterhin 1–12 Mio. €. Barrique, Vinothek und Großhandelssättigung bremsen das nur. Für den Sieg zählen allein die Punkte, das Vermögen dient nur der Rangliste.
  - Der Genossenschafts-Typ bleibt mit 80–230 Punkten der bewusst leichte Gegner.

## 19. Rechtliches

- **Lizenz:** MIT (siehe `LICENSE`). Die Lizenzhinweise der verwendeten Fremdpakete erzeugt `npm run licenses` nach `public/third-party-licenses.txt`; die Startseite verlinkt sie.
- **Eigenständigkeit:** Code, Grafiken, Klänge und Texte sind eigene Arbeit. Spielprinzipien sind nicht urheberrechtlich geschützt; Namen, Logos, Grafiken und Texte anderer Spiele werden nicht übernommen, und kein anderes Spiel wird namentlich genannt.
- **Erfundene Namen:** Weingüter, Personen, Bio-Siegel (Grünblatt, Terravita, Lunaris) und Prämierungen (Große Rebenkrone) sind frei erfunden. Echte Anbaugebiete, Rebsorten, Lagenbezeichnungen und Fachbegriffe werden beschreibend verwendet.
- **Name:** „WinzerAI“ – vor einer größeren Veröffentlichung im Markenregister (DPMA, EUIPO) prüfen.
