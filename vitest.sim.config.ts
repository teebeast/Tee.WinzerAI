import { defineConfig } from 'vitest/config'

// Balancing-Report, getrennt von den normalen Tests: npm run sim
export default defineConfig({
  test: {
    include: ['scripts/**/*.sim.ts'],
    testTimeout: 300_000,
  },
})
