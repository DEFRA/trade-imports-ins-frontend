import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for the Address book feature coverage.
 * Fully self-contained - both INS_MODE=stub (Address Book + Reference Data
 * clients) and AUTH_STUB_MODE=true (skip the real Defra ID OIDC exchange) are
 * set for the webServer below, so no other service needs to be running.
 */
const port = Number(process.env.PORT ?? 3050)

export default defineConfig({
  testDir: './src/server/address-book',
  testMatch: '**/*.e2e.spec.js',
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome']
  },
  webServer: [
    {
      command: 'npm run e2e:start',
      url: `http://localhost:${port}/health`,
      env: {
        PORT: String(port),
        INS_MODE: 'stub',
        AUTH_STUB_MODE: 'true'
      },
      timeout: 60_000,
      reuseExistingServer: false
    }
  ]
})
