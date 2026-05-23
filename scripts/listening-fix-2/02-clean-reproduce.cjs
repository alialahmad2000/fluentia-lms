// MINIMAL clean reproduction — no instrumentation, no localStorage, no DOM
// hacks, no click. Just login, navigate, observe.

const { webkit, chromium, devices } = require('@playwright/test')
const fs = require('fs')

const PROD_URL = process.env.PROD_URL || 'https://app.fluentia.academy'
const EMAIL    = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const UNIT_ID  = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const PROFILE_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'

async function run(browserName) {
  const launcher = browserName === 'webkit' ? webkit : chromium
  const browser = await launcher.launch({ headless: true })
  const ctx = browserName === 'webkit'
    ? await browser.newContext({ ...devices['iPhone 14'] })
    : await browser.newContext({ viewport: { width: 1366, height: 800 } })
  const page = await ctx.newPage()

  let mp3Reqs = 0
  page.on('response', (r) => {
    if (r.url().includes('curriculum-audio/listening/') && r.url().endsWith('.mp3')) mp3Reqs++
  })

  await page.goto(`${PROD_URL}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/student/, { timeout: 20000 })
  await page.waitForTimeout(2500)

  // Dismiss onboarding + PWA gate via localStorage
  await page.evaluate((pid) => {
    localStorage.setItem(`fluentia_onboarded_${pid}`, 'true')
    localStorage.setItem('pwa_install_dismissed_at', Date.now().toString())
  }, PROFILE_ID)

  await page.goto(`${PROD_URL}/student/curriculum/unit/${UNIT_ID}?activity=listening`)
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})

  // Sample every 1s for 15s — observe whether probe storm starts on its own
  const samples = []
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1000)
    const snap = await page.evaluate(() => {
      const a = document.querySelector('audio')
      return a ? {
        readyState: a.readyState, networkState: a.networkState,
        paused: a.paused, currentTime: a.currentTime, duration: a.duration,
      } : null
    })
    samples.push({ t: i + 1, mp3Reqs, audio: snap })
  }

  console.log(`${browserName} samples:`)
  for (const s of samples) console.log(`  +${s.t}s: mp3Reqs=${s.mp3Reqs} audio=${JSON.stringify(s.audio)}`)
  await browser.close()
}

;(async () => {
  await run('chromium')
  console.log('---')
  await run('webkit')
})()
