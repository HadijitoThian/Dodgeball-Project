/// <reference types="vitest/config" />
import { defineConfig } from 'vite'

// Vite is the dev server + bundler. `base: './'` keeps asset paths relative so the
// built game works from any folder — including inside a Capacitor Android app later.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
