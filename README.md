# WinzerAI

Rundenbasierte Weingut-Simulation als Browsergame (PWA), nachempfunden dem Starbyte-Klassiker *Winzer* (1991/92).

Spielregeln, Zahlenwerte und Meilensteine stehen in [docs/spieldesign.md](docs/spieldesign.md).

## Entwicklung

```sh
npm install
npm run dev      # Entwicklungsserver
npm test         # Engine-, Render- und Klick-Tests (Vitest, jsdom)
npm run check    # Typprüfung
npm run sim      # Balancing-Report: KI-Profile über 15 Jahre
npm run build    # Produktions-Build inkl. Service Worker
```

## Aufbau

- `src/engine/` enthält die Spiellogik ohne UI-Abhängigkeit. `applyAction(state, action)` ist eine reine Funktion, der Zufall ist Seed-basiert.
- `src/engine/ai.ts` enthält die KI-Gegner (vier Profile), `src/engine/auction.ts` die Live-Versteigerung von Weinbergen, `src/engine/simulate.ts` reine KI-Partien für Tests und Balancing.
- `src/engine/rules.ts` enthält gemeinsame Regeln (Güte, Tanks, Bekanntheit). `vineyard.ts` regelt Reife, Krankheiten, Wetterereignisse, Botrytis und Eiswein. `cellar.ts` regelt Abfüllung und Sekt, `intrigue.ts` Panschen und Sabotage, `exports.ts` die Exportverträge und `events.ts` den Ereigniskatalog mit Seltenheitsstufen und befristeten Effekten.
- `src/engine/advisor.ts` liefert die Aufgabenliste „Diesen Monat“ und das Vorspulen, `src/engine/challenge.ts` die Tages-Challenge.
- `src/engine/market.ts` enthält reine Berechnungen: Preise, Nachfrage, Kreditrahmen, Prämierungswertung.
- `src/engine/data/` enthält Anbaugebiete, Rebsorten, Qualitätsstufen und in `economy.ts` alle Kosten- und Balancing-Werte.
- `src/ui/` enthält die Svelte-5-Oberfläche: `Game.svelte` mit Reitern, je Unterseite eine Datei in `pages/` (Hof, Weinberg, Keller, Betrieb, Rangliste; erreichbar auch per Adresse wie `#keller`), SVG-Grafiken in `gfx/` (Parzelle, Tank/Fass, Flasche, Wetter, Fortschrittsring), dazu Lexikon (`lexicon.ts`), Gutspanorama (`SeasonScene.svelte`) und Klänge per Web Audio (`sound.ts`). Die Hof-Seite zeigt, was diesen Monat zu tun ist, und verlinkt auf die passende Unterseite.
- `src/save.ts` verwaltet die Spielstände: Desktop-App unter `%LOCALAPPDATA%WinzerAISpielstände`, im Browser in localStorage.
