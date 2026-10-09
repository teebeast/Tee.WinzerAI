/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Winzer',
        short_name: 'Winzer',
        description: 'Rundenbasierte Weingut-Simulation',
        lang: 'de',
        theme_color: '#5b1a33',
        background_color: '#faf6f0',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  // Klick-Tests (jsdom) brauchen die Browser-Variante von Svelte statt der Server-Variante.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    include: ['src/**/*.test.ts'],
  },
})
