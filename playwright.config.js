import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright config for this app's feature coverage (address book, dashboard).
 * Fully self-contained - STUB_MODE=true is set for the webServer below, which
 * serves stub data and skips the Defra ID OIDC exchange, so no other service
 * needs to be running.
 */
const port = Number(process.env.PORT ?? 3050)

export default defineConfig({
  testDir: './src/server',
  testMatch: '**/*.fit.spec.js',
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
    video: 'off',
    ...devices['Desktop Chrome']
  },
  webServer: [
    {
      command: 'npm run fit:start',
      url: `http://localhost:${port}/health`,
      env: { PORT: String(port), STUB_MODE: 'true' },
      timeout: 60_000,
      reuseExistingServer: false
    }
  ]
})
