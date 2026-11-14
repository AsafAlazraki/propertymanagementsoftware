import { defineConfig } from 'vitest/config'
import { URL, fileURLToPath } from 'node:url'

/**
 * The domain layer is pure TypeScript, so its tests run in node with no DOM.
 * The suite runs on the launch market's clock: a statutory date is a calendar
 * date in New Zealand, and GitHub's runners are on UTC.
 */
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    env: { TZ: 'Pacific/Auckland' },
    include: ['src/**/*.test.ts'],
    testTimeout: 20_000,
  },
})
