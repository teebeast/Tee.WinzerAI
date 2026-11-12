import { defineConfig } from 'vitest/config'

// Vergleichsprotokolle für die .NET-Portierung, getrennt von den normalen Tests: npm run trace
export default defineConfig({
  test: {
    include: ['scripts/**/*.trace.ts'],
    testTimeout: 900_000,
  },
})
