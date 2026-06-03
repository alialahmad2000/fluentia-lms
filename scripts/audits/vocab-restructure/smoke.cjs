// Headless smoke of the 4 vocab surfaces as the test student, at iPhone width.
// Asserts each renders the .vocab-cosmos constellation shell with no page crash.
const { chromium } = require('@playwright/test')
const BASE = process.env.SMOKE_BASE || 'http://localhost:4319'
const EMAIL = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const ROUTES = [
  ['srs', '/student/srs'],
  ['flashcards', '/student/flashcards'],
  ['hard-words', '/student/hard-words'],
  ['spelling-lab', '/student/spelling-lab'],
]

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const bucket = []
  page.on('console', (m) => { if (m.type() === 'error') bucket.push(m.text().slice(0, 200)) })
  page.on('pageerror', (e) => bucket.push('PAGEERROR: ' + e.message.slice(0, 200)))

  // login
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForSelector('input[type="email"]', { timeout: 30000 })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.press('input[type="password"]', 'Enter')
  await page.waitForURL(/\/student/, { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(2500)

  // dismiss the first-login onboarding modal (gated on localStorage) so we can see the surfaces
  await page.evaluate(() => {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token'))
      const s = k ? JSON.parse(localStorage.getItem(k)) : null
      const uid = s?.user?.id || s?.currentSession?.user?.id
      if (uid) localStorage.setItem('fluentia_onboarded_' + uid, 'true')
      sessionStorage.setItem('pwa-banner-dismissed', '1')
      localStorage.setItem('device_install_widget_hidden', 'true')
      localStorage.setItem('device_install_widget_hidden_at', String(Date.now()))
    } catch {}
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const results = []
  for (const [name, route] of ROUTES) {
    bucket.length = 0
    await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(3500) // queries + entrance animation settle
    // strip the pre-existing PWA install prompt overlay for a clean screenshot only
    await page.evaluate(() => {
      document.querySelectorAll('div,section,aside').forEach((el) => {
        const pos = getComputedStyle(el).position
        const t = el.textContent || ''
        if ((pos === 'fixed' || pos === 'sticky') && t.length < 400 && /تثبيت التطبيق|ثبّت تطبيق|قائمة المشاركة/.test(t)) el.remove()
      })
    })
    await page.waitForTimeout(300)
    const shot = `/tmp/vocab-smoke-${name}.png`
    await page.screenshot({ path: shot })
    const cosmos = await page.locator('.vocab-cosmos').count()
    const crashed = await page.locator('text=/تعذّر|حدث خطأ|إعادة المحاولة/').count()
    results.push({ name, route, cosmosShell: cosmos > 0, errorBoundaryVisible: crashed > 0, consoleErrors: [...bucket], shot })
  }
  console.log(JSON.stringify(results, null, 2))
  await browser.close()

  const bad = results.filter((r) => !r.cosmosShell || r.errorBoundaryVisible)
  if (bad.length) { console.error('SMOKE FAIL on:', bad.map((b) => b.name).join(', ')); process.exit(2) }
  console.log('SMOKE PASS — all 4 surfaces rendered the constellation shell, no crash.')
})().catch((e) => { console.error('SMOKE FATAL', e.message); process.exit(1) })
