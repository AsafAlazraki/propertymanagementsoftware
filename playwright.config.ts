import { defineConfig } from '@playwright/test'

/**
 * The smoke suite opens every screen at the six sizes the product promises to
 * work at, against the same build that is deployed (base path included).
 *
 *   npm run build:pages
 *   npm run e2e
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  timeout: 120_000,
  use: {
    baseURL: 'http://localhost:5201/propertymanagementsoftware/',
    // The service worker would swap the page under a test after a rebuild.
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run preview:pages',
    url: 'http://localhost:5201/propertymanagementsoftware/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
