// Test if changing Cache-Control on the audio response stops the iOS storm.
// Intercept the storage URL and rewrite headers.

const { webkit, devices } = require('@playwright/test')

const PROD_URL = 'https://app.fluentia.academy'
const EMAIL    = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const UNIT_ID  = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const PROFILE_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'

;(async () => {
  const browser = await webkit.launch({ headless: true })
  const ctx = await browser.newContext({ ...devices['iPhone 14'] })

  // Intercept the audio URL responses and rewrite Cache-Control
  await ctx.route('**/curriculum-audio/listening/**/*.mp3', async (route) => {
    const response = await route.fetch()
    const headers = response.headers()
    // Override cache-control to be aggressively cacheable
    headers['cache-control'] = 'public, max-age=31536000, immutable'
    await route.fulfill({
      response,
      headers,
    })
  })

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
  await page.evaluate((pid) => {
    localStorage.setItem(`fluentia_onboarded_${pid}`, 'true')
    localStorage.setItem('pwa_install_dismissed_at', Date.now().toString())
  }, PROFILE_ID)

  await page.goto(`${PROD_URL}/student/curriculum/unit/${UNIT_ID}?activity=listening`)
  await page.waitForTimeout(5000)

  for (let i = 1; i <= 5; i++) {
    await page.waitForTimeout(1000)
    const snap = await page.evaluate(() => {
      const a = document.querySelector('audio')
      return a ? { readyState: a.readyState, networkState: a.networkState, paused: a.paused, currentTime: a.currentTime, duration: a.duration } : null
    })
    console.log(`+${i}s mp3Reqs=${mp3Reqs} audio=${JSON.stringify(snap)}`)
  }

  // Click play (hide mobile nav first so it doesn't intercept)
  await page.evaluate(() => {
    const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
    if (nav) nav.style.display = 'none'
  })
  console.log('\n--- Click play ---')
  await page.locator('button[aria-label="تشغيل"]').first().click({ force: true })
  await page.waitForTimeout(3000)
  const after = await page.evaluate(() => {
    const a = document.querySelector('audio')
    return { readyState: a.readyState, networkState: a.networkState, paused: a.paused, currentTime: a.currentTime, duration: a.duration }
  })
  console.log('AFTER CLICK +3s:', JSON.stringify(after), 'mp3Reqs:', mp3Reqs)
  await page.waitForTimeout(2000)
  const after2 = await page.evaluate(() => {
    const a = document.querySelector('audio')
    return { currentTime: a.currentTime, paused: a.paused, readyState: a.readyState }
  })
  console.log('AFTER CLICK +5s:', JSON.stringify(after2), 'mp3Reqs:', mp3Reqs)

  await browser.close()
})()
