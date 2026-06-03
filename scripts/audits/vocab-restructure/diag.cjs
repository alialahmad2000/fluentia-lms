// Diagnostic: dev-mode (no console drop) — capture the real error on /student/srs.
const { chromium } = require('@playwright/test')
const BASE = process.env.DIAG_BASE || 'http://localhost:4321'
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 300)) })
  page.on('pageerror', (e) => errs.push('PAGEERROR: ' + (e.stack || e.message).slice(0, 500)))

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('input[type="email"]', { timeout: 40000 })
  await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
  await page.fill('input[type="password"]', 'MockTest2025!')
  await page.press('input[type="password"]', 'Enter')
  await page.waitForURL(/\/student/, { timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await page.evaluate(() => {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token'))
      const s = k ? JSON.parse(localStorage.getItem(k)) : null
      const uid = s?.user?.id || s?.currentSession?.user?.id
      if (uid) localStorage.setItem('fluentia_onboarded_' + uid, 'true')
      sessionStorage.setItem('pwa-banner-dismissed', '1')
    } catch {}
  })
  errs.length = 0
  await page.goto(`${BASE}/student/srs`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(4000)
  const bodyText = (await page.evaluate(() => document.body.innerText)).slice(0, 600)
  console.log('=== console/page errors on /student/srs ===')
  console.log(errs.length ? errs.join('\n---\n') : '(none captured)')
  console.log('\n=== visible body text (first 600) ===')
  console.log(bodyText)
  await browser.close()
})().catch((e) => { console.error('DIAG FATAL', e.message); process.exit(1) })
