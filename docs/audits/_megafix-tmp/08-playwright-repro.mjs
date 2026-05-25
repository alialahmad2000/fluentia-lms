import { chromium, webkit, devices } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://app.fluentia.academy'
const EMAIL = 'mock-test-a1@fluentia.academy'
const PASS = 'MockTest2025!'
const UNIT = '1de8e161-81eb-416e-af87-c136d93f3930' // L1 Ocean Life, has listening audio

const results = []

async function runOne(label, browserType, contextOpts) {
  const out = { label, login: false, listeningRowsFound: 0, playTests: [], consoleErrors: [], error: null }
  let browser
  try {
    browser = await browserType.launch({ headless: true })
    const ctx = await browser.newContext({ ...contextOpts })
    const page = await ctx.newPage()
    page.on('console', m => { if (m.type() === 'error') out.consoleErrors.push(m.text().slice(0, 160)) })

    // 1. Login
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(2500)
    // Find email + password inputs
    const emailIn = page.locator('input[type="email"], input[name="email"]').first()
    const passIn = page.locator('input[type="password"]').first()
    await emailIn.fill(EMAIL, { timeout: 15000 })
    await passIn.fill(PASS, { timeout: 15000 })
    await page.locator('button[type="submit"], button:has-text("تسجيل"), button:has-text("دخول")').first().click({ timeout: 15000 })
    await page.waitForTimeout(5000)
    out.login = !/\/login/.test(page.url())
    out.urlAfterLogin = page.url()

    if (!out.login) { out.error = 'login failed'; await browser.close(); results.push(out); return }

    // 2. Navigate directly to the unit, then the listening tab
    await page.goto(`${BASE}/student/curriculum/unit/${UNIT}?tab=listening`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(6000)

    // The grid may show first — try clicking a listening mission card if present
    const listenCard = page.locator('text=/الاستماع|listening/i').first()
    if (await listenCard.count()) { try { await listenCard.click({ timeout: 5000 }); await page.waitForTimeout(4000) } catch {} }

    // 3. Look for the player play button (aria-label تشغيل) — count rows
    const playBtns = page.locator('button[aria-label="تشغيل"], button[aria-label="إيقاف"]')
    await page.waitForTimeout(2000)
    out.listeningRowsFound = await playBtns.count()

    // 4. Test play on up to 5 play buttons
    const n = Math.min(5, out.listeningRowsFound)
    for (let i = 0; i < n; i++) {
      const t = { index: i, started: false, uiError: false, errMsg: null }
      try {
        const btn = playBtns.nth(i)
        await btn.scrollIntoViewIfNeeded({ timeout: 4000 })
        await btn.click({ timeout: 5000 })
        // poll the audio element currentTime
        await page.waitForTimeout(1200)
        const advanced = await page.evaluate(() => {
          const audios = [...document.querySelectorAll('audio')]
          return audios.some(a => a.currentTime > 0.1 && !a.paused)
        })
        t.started = advanced
        // check error card text
        const errCard = page.locator('text=/تعذّر تحميل|فشل التشغيل|الصوت لا يصدر|خطأ في/i')
        t.uiError = (await errCard.count()) > 0
        if (t.uiError) t.errMsg = (await errCard.first().textContent())?.slice(0, 80)
      } catch (e) { t.errMsg = String(e.message).slice(0, 80) }
      out.playTests.push(t)
    }
    await browser.close()
  } catch (e) {
    out.error = String(e.message).slice(0, 200)
    try { await browser?.close() } catch {}
  }
  results.push(out)
  console.log(`${label}: login=${out.login} rows=${out.listeningRowsFound} plays=${JSON.stringify(out.playTests.map(t=>t.started))} err=${out.error||''}`)
}

await runOne('chromium-desktop', chromium, { viewport: { width: 1280, height: 900 } })
await runOne('webkit-iphone13', webkit, { ...devices['iPhone 13'] })

writeFileSync('docs/audits/_megafix-tmp/playwright-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote playwright-results.json')
