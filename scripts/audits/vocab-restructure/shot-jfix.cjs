const { chromium } = require('@playwright/test')
const BASE = process.env.SHOT_BASE || 'http://localhost:4322'
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 900 } })).newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + (e.message || '').slice(0, 160)))

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('input[type="email"]', { timeout: 40000 })
  await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
  await page.fill('input[type="password"]', 'MockTest2025!')
  await page.press('input[type="password"]', 'Enter')
  await page.waitForURL(/\/student/, { timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(2000)
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
  await page.goto(`${BASE}/student/vocab-journey`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(3500)
  await page.evaluate(() => {
    document.querySelectorAll('div,section,aside').forEach((d) => {
      const s = getComputedStyle(d)
      if (s.position === 'fixed' && parseInt(s.zIndex || '0', 10) >= 900) d.remove()
    })
  })
  await page.waitForTimeout(400)

  // measure the first card height (was ~620px due to the nebula bug)
  const firstCardH = await page.evaluate(() => {
    const c = document.querySelector('.vc-card')
    return c ? Math.round(c.getBoundingClientRect().height) : null
  })
  const choiceCards = await page.locator('a:has-text("تصفّح وتدرّب"), a:has-text("مراجعة اليوم"), a:has-text("الكلمات الصعبة"), a:has-text("مختبر الإملاء")').count()
  const startBtn = await page.locator('button:has-text("ابدئي")').count()
  await page.screenshot({ path: '/tmp/vocab-hub-laptop.png', fullPage: true })

  console.log(JSON.stringify({
    firstCardHeight: firstCardH,
    choiceCards,
    startBtn,
    consoleErrors: errs.slice(0, 6),
    screenshot: '/tmp/vocab-hub-laptop.png',
  }, null, 2))
  await browser.close()
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
