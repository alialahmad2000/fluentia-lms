// What CSS is making audio display:none?
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

  const audioInfo = await page.evaluate(() => {
    const a = document.querySelector('audio')
    if (!a) return null
    const cs = getComputedStyle(a)
    return {
      inlineStyle: a.getAttribute('style'),
      computedDisplay: cs.display,
      computedVisibility: cs.visibility,
      computedPosition: cs.position,
      computedWidth: cs.width,
      computedHeight: cs.height,
      parentStyle: getComputedStyle(a.parentElement).display,
      tagName: a.tagName,
      preload: a.preload,
      src: a.src,
      readyState: a.readyState,
      networkState: a.networkState,
      // walk up parents
      parents: (() => {
        const arr = []
        let e = a
        while (e && arr.length < 6) {
          arr.push({ tag: e.tagName, display: getComputedStyle(e).display, position: getComputedStyle(e).position, classes: e.className || '' })
          e = e.parentElement
        }
        return arr
      })(),
    }
  })
  console.log(JSON.stringify(audioInfo, null, 2))
  await browser.close()
})()
