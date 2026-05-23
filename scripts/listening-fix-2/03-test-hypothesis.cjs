// Before changing prod code: verify hypothesis by toggling `display:none` off
// at runtime on iOS WebKit and observing whether the probe storm stops.

const { webkit, devices } = require('@playwright/test')

const PROD_URL = 'https://app.fluentia.academy'
const EMAIL    = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const UNIT_ID  = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const PROFILE_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'

;(async () => {
  const browser = await webkit.launch({ headless: true })
  const ctx = await browser.newContext({ ...devices['iPhone 14'] })
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
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2000)

  console.log('=== INITIAL (with display:none from prod build) ===')
  let beforeFix = mp3Reqs
  await page.waitForTimeout(4000)
  let duringStorm = mp3Reqs - beforeFix
  let snap = await page.evaluate(() => {
    const a = document.querySelector('audio')
    return a ? { readyState: a.readyState, networkState: a.networkState, currentTime: a.currentTime, duration: a.duration, displayStyle: getComputedStyle(a).display } : null
  })
  console.log('In 4s with display:none — new mp3 requests:', duringStorm, 'audio:', snap)

  console.log('\n=== APPLY FIX: switch audio from display:none → off-screen positioning ===')
  await page.evaluate(() => {
    const a = document.querySelector('audio')
    if (!a) return
    a.style.display = ''  // clear display:none
    // Off-screen positioning so it stays invisible but layout-real
    a.style.position = 'absolute'
    a.style.left = '-9999px'
    a.style.width = '1px'
    a.style.height = '1px'
    a.style.opacity = '0'
    a.style.pointerEvents = 'none'
  })
  const beforeMonitor = mp3Reqs
  await page.waitForTimeout(8000)  // 8s observation window
  const newReqs = mp3Reqs - beforeMonitor
  snap = await page.evaluate(() => {
    const a = document.querySelector('audio')
    return a ? { readyState: a.readyState, networkState: a.networkState, currentTime: a.currentTime, duration: a.duration, displayStyle: getComputedStyle(a).display } : null
  })
  console.log('In 8s after fix — new mp3 requests:', newReqs, 'audio:', snap)

  // Now try clicking play to see if audio actually advances
  await page.evaluate(() => {
    const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
    if (nav) nav.style.display = 'none'
  })
  await page.locator('button[aria-label="تشغيل"]').first().click({ force: true })
  await page.waitForTimeout(3500)
  snap = await page.evaluate(() => {
    const a = document.querySelector('audio')
    return a ? { readyState: a.readyState, networkState: a.networkState, currentTime: a.currentTime, paused: a.paused, duration: a.duration } : null
  })
  console.log('After click — audio:', snap)
  await page.waitForTimeout(2000)
  snap = await page.evaluate(() => {
    const a = document.querySelector('audio')
    return a ? { currentTime: a.currentTime, paused: a.paused } : null
  })
  console.log('After click + 2s more — audio:', snap)

  await browser.close()
})()
