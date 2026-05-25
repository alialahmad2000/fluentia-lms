import { chromium, webkit, devices } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://app.fluentia.academy'
const EMAIL = 'mock-test-a1@fluentia.academy'
const PASS = 'MockTest2025!'
const UNIT = '1de8e161-81eb-416e-af87-c136d93f3930'

const results = []

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2500)
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASS)
  await page.locator('button[type="submit"]').first().click()
  await page.waitForTimeout(5000)
  return !/\/login/.test(page.url())
}

async function openListening(page) {
  await page.goto(`${BASE}/student/curriculum/unit/${UNIT}?tab=listening`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(5000)
  // dismiss debrief / "later" popups
  for (const t of ['تذكيرني لاحقاً']) {
    const b = page.locator(`button:has-text("${t}")`).first()
    if (await b.count()) { try { await b.click({ timeout: 3000 }) } catch {} }
  }
  // click "Start journey" if present to enter the tabs view
  const start = page.locator('button:has-text("ابدأ رحلة")').first()
  if (await start.count()) { try { await start.click({ timeout: 4000 }); await page.waitForTimeout(3000) } catch {} }
  // click the الاستماع mission card / tab
  const listen = page.locator('text=الاستماع').first()
  if (await listen.count()) { try { await listen.click({ timeout: 4000 }); await page.waitForTimeout(4000) } catch {} }
  await page.waitForTimeout(3000)
}

async function runOne(label, browserType, ctxOpts) {
  const out = { label, login: false, playBtns: 0, audioEls: 0, playTests: [], consoleErrors: [], error: null }
  let browser
  try {
    browser = await browserType.launch({ headless: true })
    const ctx = await browser.newContext(ctxOpts)
    const page = await ctx.newPage()
    page.on('console', m => { if (m.type() === 'error') out.consoleErrors.push(m.text().slice(0, 140)) })

    out.login = await login(page)
    if (!out.login) { out.error = 'login failed'; await browser.close(); results.push(out); return }
    await openListening(page)

    out.audioEls = await page.locator('audio').count()
    const playBtns = page.locator('button[aria-label="تشغيل"], button[aria-label="إيقاف"]')
    out.playBtns = await playBtns.count()
    await page.screenshot({ path: `docs/audits/_megafix-tmp/listen-${label}.png` })

    const n = Math.min(5, out.playBtns)
    for (let i = 0; i < n; i++) {
      const t = { index: i, started: false, uiError: false, errMsg: null }
      try {
        const btn = playBtns.nth(i)
        await btn.scrollIntoViewIfNeeded({ timeout: 4000 })
        await btn.click({ timeout: 5000 })
        await page.waitForTimeout(1300)
        t.started = await page.evaluate(() =>
          [...document.querySelectorAll('audio')].some(a => a.currentTime > 0.1 && !a.paused))
        const errCard = page.locator('text=/تعذّر تحميل|فشل التشغيل|الصوت لا يصدر|خطأ في الشبكة|خطأ في فك/i')
        t.uiError = (await errCard.count()) > 0
        if (t.uiError) t.errMsg = (await errCard.first().textContent())?.trim().slice(0, 80)
        // pause it so next test is clean
        try { await btn.click({ timeout: 2000 }) } catch {}
      } catch (e) { t.errMsg = String(e.message).slice(0, 80) }
      out.playTests.push(t)
    }
    await browser.close()
  } catch (e) {
    out.error = String(e.message).slice(0, 200)
    try { await browser?.close() } catch {}
  }
  results.push(out)
  console.log(`${label}: login=${out.login} audioEls=${out.audioEls} playBtns=${out.playBtns} started=${JSON.stringify(out.playTests.map(t=>t.started))} uiErr=${JSON.stringify(out.playTests.map(t=>t.uiError))} err=${out.error||''}`)
}

await runOne('chromium', chromium, { viewport: { width: 1280, height: 900 } })
await runOne('iphone13', webkit, { ...devices['iPhone 13'] })

writeFileSync('docs/audits/_megafix-tmp/playwright-results.json', JSON.stringify(results, null, 2))
console.log('\nWrote playwright-results.json')
