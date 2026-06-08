// E2E: as a REAL student, study the whole current constellation and prove the
// journey advances to the NEXT one (the "same words again" bug).
const { chromium } = require('@playwright/test')
const BASE = process.env.SMOKE_BASE || 'http://localhost:4321'
const AR = '٠١٢٣٤٥٦٧٨٩'
const arToInt = (s) => parseInt(String(s).replace(/[٠-٩]/g, d => AR.indexOf(d)), 10)

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + (e.message || '').slice(0, 160)))
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CON: ' + m.text().slice(0, 160)) })
  const out = {}
  const purge = () => page.evaluate(() => {
    document.querySelectorAll('div,section,aside').forEach((d) => {
      const s = getComputedStyle(d)
      if (d.classList.contains('vocab-cosmos')) return
      if (s.position === 'fixed' && parseInt(s.zIndex || '0', 10) >= 900) d.remove()
    })
  })
  // read the "الكوكبة X من Y" line from the NextStopCard
  const readStop = async () => page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('p')).find(p => /الكوكبة/.test(p.textContent))
    const theme = document.querySelector('h2')?.textContent?.trim() || null
    return { line: el?.textContent?.trim() || null, theme }
  })

  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('input[type="email"]', { timeout: 40000 })
    await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
    await page.fill('input[type="password"]', 'MockTest2025!')
    await page.press('input[type="password"]', 'Enter')
    await page.waitForURL(/\/student/, { timeout: 40000 }).catch(() => {})
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      try {
        const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token'))
        const s = k ? JSON.parse(localStorage.getItem(k)) : null
        const uid = s?.user?.id || s?.currentSession?.user?.id
        if (uid) localStorage.setItem('fluentia_onboarded_' + uid, 'true')
        sessionStorage.setItem('pwa-banner-dismissed', '1')
      } catch {}
    })

    await page.goto(`${BASE}/student/vocab-journey`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3000)
    await purge()
    out.before = await readStop()

    // open the stop
    await page.locator('button:has-text("ابدئي")').first().click({ force: true })
    await page.waitForTimeout(2000)

    // study every beat: reveal then pick a positive rating, until the stop completes
    let done = false
    for (let i = 0; i < 30 && !done; i++) {
      await purge()
      // completion screen?
      if (await page.locator('button:has-text("أكملي الرحلة")').count() > 0) { done = true; break }
      // reveal
      const reveal = page.locator('button:has-text("اعرفي المعنى"), button:has-text("اعرضي الإجابة")')
      if (await reveal.count() > 0) { await reveal.first().click({ force: true }); await page.waitForTimeout(500) }
      await purge()
      // rate "known": prefer عرفتها / سهلة / جيدة
      const rate = page.locator('button:has-text("عرفتها"), button:has-text("سهلة"), button:has-text("جيدة")')
      if (await rate.count() > 0) { await rate.first().click({ force: true }); await page.waitForTimeout(900) }
      else { await page.waitForTimeout(400) }
    }
    out.reachedComplete = done
    out.learnedLine = await page.locator('text=/راجعت|تثبّت|أضأت|مضيئة/').count()

    // finish + back to journey
    await purge()
    if (await page.locator('button:has-text("أكملي الرحلة")').count() > 0) {
      await page.locator('button:has-text("أكملي الرحلة")').first().click({ force: true })
    }
    await page.waitForTimeout(3500) // refetch journey
    await purge()
    out.after = await readStop()

    out.beforeIdx = out.before?.line ? arToInt(out.before.line.match(/الكوكبة\s*([٠-٩]+)/)?.[1]) : null
    out.afterIdx = out.after?.line ? arToInt(out.after.line.match(/الكوكبة\s*([٠-٩]+)/)?.[1]) : null
    out.advanced = (out.afterIdx != null && out.beforeIdx != null && out.afterIdx > out.beforeIdx)
      || (out.after?.theme && out.before?.theme && out.after.theme !== out.before.theme)
      || (out.after?.line == null) // all-lit screen
    out.errs = errs.slice(0, 6)
    await page.screenshot({ path: '/tmp/fl-journey/advance-after.png' })
  } catch (e) { out.fatal = e.message }
  console.log(JSON.stringify(out, null, 2))
  await browser.close()
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
