// Admin money paths: the surfaces Ali runs the academy from.
import { test, expect } from '@playwright/test'
import { login, suppressModals, collectFatalErrors } from './helpers.mjs'

// The CLAUDE.md admin password is stale on prod — supply real creds via env:
//   SMOKE_ADMIN_EMAIL=… SMOKE_ADMIN_PASSWORD=… npx playwright test …
const ADMIN = {
  email: process.env.SMOKE_ADMIN_EMAIL || 'admin@fluentia.academy',
  password: process.env.SMOKE_ADMIN_PASSWORD || '',
}

test.describe('admin paths', () => {
  let errors

  test.skip(!ADMIN.password, 'set SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD to run admin smokes')

  test.beforeEach(async ({ page }) => {
    await suppressModals(page)
    errors = collectFatalErrors(page)
    await login(page, ADMIN)
  })

  test.afterEach(async () => {
    expect(errors, `fatal client errors:\n${errors.join('\n')}`).toEqual([])
  })

  test('admin dashboard renders', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('تعذر إظهار الصفحة')
  })

  test('curriculum quality (mistake detector) shows flags', async ({ page }) => {
    await page.goto('/admin/curriculum-quality')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/جودة المنهج/, { timeout: 20_000 })
    await expect(page.locator('body')).toContainText(/بانتظار المراجعة/)
  })

  test('system diagnostics (client errors) renders', async ({ page }) => {
    await page.goto('/admin/system')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/تشخيص النظام/, { timeout: 20_000 })
  })

  test('students roster renders', async ({ page }) => {
    await page.goto('/admin/users')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('تعذر إظهار الصفحة')
  })

  test('reports hub renders with tabs + live data', async ({ page }) => {
    await page.goto('/admin/reports')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/مركز التقارير/, { timeout: 20_000 })
    await expect(page.locator('body')).toContainText(/النبض/)
    await expect(page.locator('body')).toContainText(/الطلاب/)
  })

  test('reports hub students tab → student deep-dive', async ({ page }) => {
    await page.goto('/admin/reports?tab=students')
    await page.waitForLoadState('networkidle')
    // desktop table OR mobile cards — click the first student entry
    const row = page.locator('tbody tr, [role="button"].rounded-2xl').first()
    await row.click()
    await page.waitForURL(/\/admin\/reports\/student\//, { timeout: 20_000 })
    await expect(page.locator('body')).toContainText(/دقائق التعلّم/, { timeout: 20_000 })
  })

  test('legacy reports archived at /admin/reports-legacy', async ({ page }) => {
    await page.goto('/admin/reports-legacy')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/توقع الانسحاب/, { timeout: 20_000 })
  })
})
