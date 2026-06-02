// Authenticated app test (prompt 10, Phase A.4) — does the REAL listening tab
// play in WebKit (iPhone 13 emulation) vs Chromium? Raw file already plays in
// both; this exercises the app's player code path end-to-end.
//
// Usage: TEST_STUDENT_EMAIL=.. TEST_STUDENT_PASSWORD=.. node scripts/audits/listening-webkit/02-app-listening.cjs
const { webkit, chromium, devices } = require('playwright')
const fs = require('fs')

const BASE = 'https://app.fluentia.academy'
const EMAIL = process.env.TEST_STUDENT_EMAIL
const PWD = process.env.TEST_STUDENT_PASSWORD
const UNIT = process.env.UNIT_ID || '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc' // L1 U1 (has listening)
const OUT = 'docs/audits/listening-webkit'

const MATRIX = [
  { name: 'webkit_iphone13', engine: webkit, ctx: { ...devices['iPhone 13'] } },
  { name: 'chromium_desktop', engine: chromium, ctx: { viewport: { width: 1280, height: 900 } } },
]

async function run(cfg) {
  const browser = await cfg.engine.launch({ headless: true })
  const ctx = await browser.newContext(cfg.ctx)
  const page = await ctx.newPage()
  const console_ = []
  const audioNet = []
  page.on('console', (m) => console_.push(`${m.type()}: ${m.text()}`.slice(0, 200)))
  page.on('pageerror', (e) => console_.push(`pageerror: ${e.message}`.slice(0, 200)))
  page.on('response', (r) => {
    if (r.url().includes('.mp3') || (r.url().includes('/storage/') && r.url().includes('audio'))) {
      audioNet.push({ status: r.status(), url: r.url().slice(0, 90), aco: r.headers()['access-control-allow-origin'] })
    }
  })

  const step = { login: 'pending', nav: 'pending', tab: 'pending', play: 'pending' }
  try {
    // login
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PWD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/student/, { timeout: 30000 })
    step.login = 'ok'
    await page.screenshot({ path: `${OUT}/${cfg.name}-1-login.png` })

    // navigate to the unit
    await page.goto(`${BASE}/student/curriculum/unit/${UNIT}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)
    step.nav = 'ok'
    await page.screenshot({ path: `${OUT}/${cfg.name}-2-unit.png` })

    // open the listening tab (label is a <p> inside a clickable tab — force-click,
    // the event bubbles to the tab's onClick handler)
    const tab = page.getByText('الاستماع', { exact: true }).first()
    await tab.scrollIntoViewIfNeeded().catch(() => {})
    await tab.click({ timeout: 8000, force: true })
    await page.waitForTimeout(3000)
    // wait for the listening player's <audio> to mount
    await page.waitForSelector('audio', { timeout: 8000 }).catch(() => {})
    step.tab = 'ok'
    await page.screenshot({ path: `${OUT}/${cfg.name}-3-listening.png` })

    // press play (aria-label "تشغيل")
    const playBtn = page.locator('button[aria-label="تشغيل"], button[aria-label="جارٍ التحميل"]').first()
    await playBtn.scrollIntoViewIfNeeded().catch(() => {})
    await playBtn.click({ timeout: 8000, force: true })
    step.play = 'clicked'
    await page.waitForTimeout(4500)
    await page.screenshot({ path: `${OUT}/${cfg.name}-4-afterplay.png` })
  } catch (e) {
    console_.push(`STEP_ERROR: ${e.message}`.slice(0, 250))
  }

  const audioState = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('audio'))
    return els.map((a) => ({
      src: (a.currentSrc || a.src || '').slice(-50),
      readyState: a.readyState, networkState: a.networkState,
      paused: a.paused, currentTime: a.currentTime, duration: a.duration,
      error: a.error ? { code: a.error.code, message: a.error.message } : null,
      crossOrigin: a.crossOrigin,
    }))
  }).catch(() => [])

  await browser.close()
  return { name: cfg.name, step, audioState, audioNet, console: console_.slice(-12) }
}

;(async () => {
  if (!EMAIL || !PWD) { console.error('set TEST_STUDENT_EMAIL + TEST_STUDENT_PASSWORD'); process.exit(1) }
  const out = []
  for (const cfg of MATRIX) out.push(await run(cfg))
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(`${OUT}/app-listening-results.json`, JSON.stringify(out, null, 2))
  console.log('\n=== AUTHENTICATED APP LISTENING TEST ===')
  for (const r of out) {
    const playing = r.audioState.some((a) => a.currentTime > 0)
    console.log(`\n${r.name}: steps=${JSON.stringify(r.step)} → ${playing ? '✅ AUDIO ADVANCED' : '❌ NO ADVANCE'}`)
    console.log('  audio:', JSON.stringify(r.audioState))
    if (r.audioNet.length) console.log('  net:', JSON.stringify(r.audioNet.slice(0, 3)))
    console.log('  console tail:', JSON.stringify(r.console.slice(-5)))
  }
})().catch((e) => { console.error(e); process.exit(1) })
