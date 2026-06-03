// Smoke the Path of Light journey end-to-end (dev server → real runtime errors).
const { chromium } = require('@playwright/test')
const BASE = process.env.SMOKE_BASE || 'http://localhost:4321'
const sel = (t) => `text=${t}`
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CON: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + (e.message || '').slice(0, 200)))
  const bad = []
  const vocabTraffic = []
  page.on('response', (r) => {
    const u = r.url()
    if (r.status() >= 400) bad.push(`${r.status()} ${r.request().method()} ${u.slice(0, 120)}`)
    if (/vocab_add_card|vocab_get_stop|vocab_apply|apply_rating|\/vocab_cards/.test(u)) {
      vocabTraffic.push(`${r.status()} ${r.request().method()} ${u.split('/rest/v1/')[1]?.slice(0, 60) || u.slice(-50)}`)
    }
  })

  const out = {}
  try {
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
    out.errorBoundary = await page.locator('text=/تعذّر|حدث خطأ|إعادة المحاولة/').count()
    out.headerPresent = await page.locator(sel('رحلة النور')).count()
    out.nextStopPresent = await page.locator(sel('المحطة التالية')).count()
    out.startBtn = await page.locator('button:has-text("ابدئي")').count()
    out.trailPresent = await page.locator(sel('الرحلات')).count()

    // purge any high-z modal overlay (onboarding/PWA) blocking interaction — NOT the journey stop (z-80)
    const purge = () => page.evaluate(() => {
      document.querySelectorAll('div,section,aside').forEach((d) => {
        const s = getComputedStyle(d)
        if (s.position === 'fixed' && parseInt(s.zIndex || '0', 10) >= 900) d.remove()
      })
    })
    await purge()

    // open a stop
    if (out.startBtn > 0) {
      await page.locator('button:has-text("ابدئي")').first().click({ force: true })
      await page.waitForTimeout(2500)
      out.stopOpened = await page.locator('text=/كلمة جديدة|مراجعة/').count()
      out.revealBtn = await page.locator('button:has-text("اعرفي المعنى")').count()
      // reveal + rate one beat (exercises addCard + applyRating)
      if (out.revealBtn > 0) {
        await purge()
        await page.locator('button:has-text("اعرفي المعنى")').first().click({ force: true })
        await page.waitForTimeout(900)
        out.ratingVisible = await page.locator('button:has-text("عرفتها")').count()
        if (out.ratingVisible > 0) {
          await purge()
          await page.locator('button:has-text("عرفتها")').first().click({ force: true })
          await page.waitForTimeout(3000) // addCard + applyRating round-trip
          out.advancedNoCrash = (await page.locator('text=/تعذّر|حدث خطأ/').count()) === 0
          out.stillInStop = await page.locator('text=/كلمة جديدة|مراجعة|أضأتِ|مضيئة/').count()
        }
      }
    }
    out.consoleErrors = errs.filter(e=>/JRATE/.test(e)).concat(errs.filter(e=>!/JRATE/.test(e)).slice(0,4)).slice(0,12)
    out.badResponses = bad.filter((b) => !/\/login|favicon|\.png|\.svg|version\.json/.test(b)).slice(0, 12)
    out.vocabTraffic = vocabTraffic.slice(0, 12)
  } catch (e) {
    out.fatal = e.message
  }
  console.log(JSON.stringify(out, null, 2))
  const pass =
    out.errorBoundary === 0 &&
    out.headerPresent > 0 &&
    out.nextStopPresent > 0 &&
    out.stopOpened > 0 &&
    out.advancedNoCrash !== false &&
    (out.consoleErrors || []).length === 0
  console.log(pass ? '\nJOURNEY SMOKE PASS ✓' : '\nJOURNEY SMOKE FAIL ✗')
  await browser.close()
  process.exit(pass ? 0 : 1)
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
