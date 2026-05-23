// Try Playwright's webkit with channel options OR a slow connection profile.
// Hypothesis: Playwright bundled WebKit is buggier than real iOS Safari.

const { webkit, devices } = require('@playwright/test')

const PROD_URL = 'https://app.fluentia.academy'
const EMAIL    = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const UNIT_ID  = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const PROFILE_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'

;(async () => {
  // Test 1: standard webkit, fast (default) network — should still show storm
  // Test 2: standard webkit, throttled network (3G) — should also storm if our hypothesis holds
  for (const profile of [
    { name: 'webkit-fast', ctx: { viewport: { width: 1366, height: 800 } } },
    { name: 'webkit-iphone14', ctx: { ...devices['iPhone 14'] } },
    { name: 'webkit-iphone14-fast3g', ctx: { ...devices['iPhone 14'] }, throttle: { downloadThroughput: 1500*1024/8, uploadThroughput: 750*1024/8, latency: 150 } },
  ]) {
    console.log(`\n=== ${profile.name} ===`)
    const browser = await webkit.launch({ headless: true })
    const ctx = await browser.newContext(profile.ctx)
    const page = await ctx.newPage()
    if (profile.throttle) {
      const client = await ctx.newCDPSession?.(page).catch(() => null)
      if (client) await client.send('Network.emulateNetworkConditions', { offline: false, ...profile.throttle })
    }
    let mp3 = 0
    page.on('response', r => { if (r.url().includes('curriculum-audio/listening/')) mp3++ })
    await page.goto(`${PROD_URL}/login`)
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/student/, { timeout: 20000 })
    await page.waitForTimeout(2000)
    await page.evaluate((pid) => {
      localStorage.setItem(`fluentia_onboarded_${pid}`, 'true')
      localStorage.setItem('pwa_install_dismissed_at', Date.now().toString())
    }, PROFILE_ID)
    await page.goto(`${PROD_URL}/student/curriculum/unit/${UNIT_ID}?activity=listening`)
    await page.waitForTimeout(8000)
    const snap = await page.evaluate(() => {
      const a = document.querySelector('audio')
      return a ? { readyState: a.readyState, networkState: a.networkState, paused: a.paused, duration: a.duration } : null
    })
    console.log(`  mp3Reqs after 8s: ${mp3}  audio: ${JSON.stringify(snap)}`)
    await browser.close()
  }
})()
