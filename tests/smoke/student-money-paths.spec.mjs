// Student money paths: login → dashboard → curriculum unit tabs → the surfaces
// revenue depends on. Render + fatal-console checks only (no submissions).
import { test, expect } from '@playwright/test'
import { login, suppressModals, collectFatalErrors, STUDENT } from './helpers.mjs'

test.describe('student money paths', () => {
  let errors

  test.beforeEach(async ({ page }) => {
    await suppressModals(page)
    errors = collectFatalErrors(page)
    await login(page)
  })

  test.afterEach(async () => {
    expect(errors, `fatal client errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('dashboard renders', async ({ page }) => {
    await page.goto('/student')
    await expect(page.locator('body')).toContainText(/طلاقة|الرئيسية|مرحبا|أهلا/, { timeout: 20_000 })
  })

  test('curriculum → first unit reading tab loads without save-crash', async ({ page }) => {
    await page.goto('/student/curriculum')
    await page.waitForLoadState('networkidle')
    // units render as BUTTONS on the level page; "ابدأ من حيث توقفت" jumps to
    // the current unit, first unit button is the fallback
    const continueBtn = page.getByRole('button', { name: /ابدأ من حيث توقفت/ })
    if (await continueBtn.count()) {
      await continueBtn.first().click()
    } else {
      await page.locator('button:has(h3)').first().click()
    }
    await page.waitForURL(/\/unit\//, { timeout: 20_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('تعذر إظهار الصفحة')
  })

  test('listening tab renders without crash', async ({ page }) => {
    await page.goto('/student/curriculum')
    await page.waitForLoadState('networkidle')
    const continueBtn = page.getByRole('button', { name: /ابدأ من حيث توقفت/ })
    if (await continueBtn.count()) {
      await continueBtn.first().click()
    } else {
      await page.locator('button:has(h3)').first().click()
    }
    await page.waitForURL(/\/unit\//, { timeout: 20_000 })
    const unitUrl = new URL(page.url())
    await page.goto(`${unitUrl.pathname}?activity=listening`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('تعذر إظهار الصفحة')
  })

  test('SRS daily review loads', async ({ page }) => {
    await page.goto('/student/srs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('تعذر إظهار الصفحة')
  })

  test('phrasebook (دفتر عباراتي) renders', async ({ page }) => {
    await page.goto('/student/phrasebook')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/دفتر عباراتي/, { timeout: 20_000 })
  })

  test('chat loads', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('تعذر إظهار الصفحة')
  })

  test('my bug reports page renders (gendered copy path)', async ({ page }) => {
    await page.goto('/student/my-reports')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/بلاغ/, { timeout: 20_000 })
  })
})
