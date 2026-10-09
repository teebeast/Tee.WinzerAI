# Winzer (Arbeitstitel)

Rundenbasierte Weingut-Simulation als Browsergame (PWA), nachempfunden dem Starbyte-Klassiker *Winzer* (1991/92).

Spielregeln, Zahlenwerte und Meilensteine stehen in [docs/spieldesign.md](docs/spieldesign.md).

## Entwicklung

```sh
npm install
npm run dev      # Entwicklungsserver
npm test         # Engine-Tests (Vitest)
npm run check    # Typprüfung
npm run build    # Produktions-Build inkl. Service Worker
```

## Aufbau

- `src/engine/` enthält die Spiellogik ohne UI-Abhängigkeit. `applyAction(state, action)` ist eine reine Funktion, der Zufall ist Seed-basiert.
- `src/engine/data/` enthält Anbaugebiete, Rebsorten und Qualitätsstufen (die Balancing-Werte).
- `src/ui/` enthält die Svelte-5-Komponenten.
- `src/save.ts` speichert den Spielstand (aktuell localStorage).
