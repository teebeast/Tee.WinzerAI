# Winzer (Arbeitstitel)

Rundenbasierte Weingut-Simulation als Browsergame (PWA), nachempfunden dem Starbyte-Klassiker *Winzer* (1991/92).

Spielregeln, Zahlenwerte und Meilensteine stehen in [docs/spieldesign.md](docs/spieldesign.md).

## Entwicklung

```sh
npm install
npm run dev      # Entwicklungsserver
npm test         # Engine-Tests (Vitest)
npm run check    # Typprüfung
npm run sim      # Balancing-Report: KI-Profile über 15 Jahre
npm run build    # Produktions-Build inkl. Service Worker
```

## Aufbau

- `src/engine/` enthält die Spiellogik ohne UI-Abhängigkeit. `applyAction(state, action)` ist eine reine Funktion, der Zufall ist Seed-basiert.
- `src/engine/ai.ts` enthält die KI-Gegner (vier Profile), `src/engine/auction.ts` die Weinbergversteigerung, `src/engine/simulate.ts` reine KI-Partien für Tests und Balancing.
- `src/engine/market.ts` enthält reine Berechnungen: Preise, Nachfrage, Kreditrahmen, Prämierungswertung.
- `src/engine/data/` enthält Anbaugebiete, Rebsorten, Qualitätsstufen und in `economy.ts` alle Kosten- und Balancing-Werte.
- `src/ui/` enthält die Svelte-5-Komponenten, je Bereich eine Karte. Ein Smoke-Test rendert die Oberfläche serverseitig.
- `src/save.ts` speichert den Spielstand (aktuell localStorage).
