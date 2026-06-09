// Prod smoke suite — money paths against the LIVE app (app.fluentia.academy).
// Run:  npx playwright test --config tests/smoke/playwright.config.mjs
// Why prod: a push is not a deploy; these verify what students actually run.
// Uses the dedicated mock student (mock-test-a1@…) — render + console-error
// checks only, no assessment submissions, so reruns never pollute real data.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  retries: 1,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: process.env.SMOKE_BASE_URL || 'https://app.fluentia.academy',
    locale: 'ar',
    viewport: { width: 390, height: 844 }, // iPhone-ish: the real student device
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    // webkit = the engine where Fluentia bugs actually live (Safari/iPhone).
    { name: 'webkit', use: { ...devices['iPhone 13'] } },
  ],
})
