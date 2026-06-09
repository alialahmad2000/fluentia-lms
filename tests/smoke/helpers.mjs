// Shared smoke helpers: login + the modal-suppression recipe that unblocks
// headless runs (global Onboarding/PWA modals otherwise eat every click).
import { expect } from '@playwright/test'

export const STUDENT = {
  email: 'mock-test-a1@fluentia.academy',
  password: 'MockTest2025!',
  profileId: 'a82486b6-9472-4aba-b902-a0ec354ca170',
}

// Console errors that indicate REAL breakage (the classes that have bitten us),
// vs noise we tolerate in a smoke.
const FATAL_PATTERNS = [
  /ReferenceError/i,
  /is not defined/i,
  /is not a function/i,
  /not a valid JavaScript MIME type/i,
  /Minified React error/i,
]

export function collectFatalErrors(page) {
  const errors = []
  page.on('pageerror', (err) => {
    if (FATAL_PATTERNS.some((p) => p.test(String(err)))) errors.push(`pageerror: ${err}`)
  })
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const t = msg.text()
    if (FATAL_PATTERNS.some((p) => p.test(t))) errors.push(`console: ${t}`)
  })
  return errors
}

export async function suppressModals(page, profileId = STUDENT.profileId) {
  await page.addInitScript(([id]) => {
    try {
      // OnboardingModal: fluentia_onboarded_<profileId> === 'true'
      localStorage.setItem(`fluentia_onboarded_${id}`, 'true')
      // usePWAInstall: DISMISS_KEY = 'pwa_install_dismissed_at' (epoch ms)
      localStorage.setItem('pwa_install_dismissed_at', String(Date.now()))
    } catch {}
  }, [profileId])
}

export async function login(page, { email, password } = STUDENT) {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  await expect(emailInput).toBeVisible({ timeout: 20_000 })
  await emailInput.fill(email)
  await page.locator('input[type="password"]').first().fill(password)
  // NOT .first() on generic buttons — the first button on /login is the
  // "الدخول باسم المستخدم" mode switch, not the submit.
  await page.getByRole('button', { name: 'دخول', exact: true }).click()
  // landed on an authed surface (student or admin home)
  await page.waitForURL(/\/(student|admin|trainer)/, { timeout: 30_000 })
}
