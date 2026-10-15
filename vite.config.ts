/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Tauri setzt diese Variable beim Desktop-Build; dort braucht es keinen Service Worker.
const isTauri = !!process.env.TAURI_ENV_PLATFORM

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      disable: isTauri,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'WinzerAI',
        short_name: 'WinzerAI',
        description: 'Rundenbasierte Weingut-Simulation',
        lang: 'de',
        theme_color: '#5b1a33',
        background_color: '#faf6f0',
        display: 'standalone',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  // Tauri erwartet den Dev-Server fest auf dem in tauri.conf.json eingetragenen Port.
  clearScreen: false,
  server: { strictPort: true },
  // Klick-Tests (jsdom) brauchen die Browser-Variante von Svelte statt der Server-Variante.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    include: ['src/**/*.test.ts'],
  },
})
