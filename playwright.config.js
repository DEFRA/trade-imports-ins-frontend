import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PORT ?? 3002)

export default defineConfig({
  testDir: './fit',
  testMatch: '**/*.fit.spec.js',
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'smoke',
      testMatch: '**/smoke.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure'
      }
    },
    {
      name: 'features',
      testDir: './src/server/app/features',
      testMatch: '**/*.fit.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${port}`,
        video: 'off',
        trace: 'retain-on-failure'
      }
    }
  ],
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
