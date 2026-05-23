// Test webkit WITHOUT iPhone 14 emulation — desktop Safari behavior.
// If no storm: bug is Playwright iOS emulation specific, not real Safari.

const { webkit } = require('@playwright/test')

const PROD_URL = 'https://app.fluentia.academy'
const EMAIL    = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const UNIT_ID  = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const PROFILE_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'

;(async () => {
  const browser = await webkit.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 } })  // no iPhone emulation
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

  for (let i = 1; i <= 10; i++) {
    await page.waitForTimeout(1000)
    const snap = await page.evaluate(() => {
      const a = document.querySelector('audio')
      return a ? { readyState: a.readyState, networkState: a.networkState, paused: a.paused, currentTime: a.currentTime, duration: a.duration } : null
    })
    console.log(`+${i}s mp3Reqs=${mp3Reqs} audio=${JSON.stringify(snap)}`)
  }
  await browser.close()
})()
