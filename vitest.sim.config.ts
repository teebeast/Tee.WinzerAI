import { defineConfig } from 'vitest/config'

// Balancing-Report, getrennt von den normalen Tests: npm run sim
export default defineConfig({
  test: {
    include: ['scripts/**/*.sim.ts'],
    // Der Abschnitt zu den Schwierigkeitsgraden spielt 624 Partien über 15 Jahre
    testTimeout: 900_000,
  },
})
