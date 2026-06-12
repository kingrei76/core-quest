import { defineConfig } from 'vitest/config'

// Vitest config kept separate from vite.config.js so tests run hermetically
// (without loading the PWA service-worker plugin). Pure-logic tests run in the
// fast Node environment; tests that need a fake browser can opt in per-file
// with a `// @vitest-environment jsdom` comment at the top.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
