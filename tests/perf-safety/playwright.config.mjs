// Perf-safety gate: encodes the protected student behaviors (auto-save/submit
// invariants, curriculum render, navigation stability, listening render).
// Runs against a LOCAL `vite preview` of the production build by default —
// point PERF_BASE_URL elsewhere deliberately, never casually at prod.
// Writes are confined to the standing test student (mock-test-a1), same account
// the smoke suite uses.
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  // ONE worker, serial: scenarios share the test student's attempt state and
  // must not race each other (or the other browser project).
  workers: 1,
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PERF_BASE_URL || 'http://localhost:4731',
    serviceWorkers: 'block', // measure/exercise the app, not the SW cache
    viewport: { width: 1280, height: 800 },
    actionTimeout: 30_000,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
})
