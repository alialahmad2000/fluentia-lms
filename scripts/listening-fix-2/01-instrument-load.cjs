// Instrument the production listening tab page to count:
//  - how many <audio> elements are created (= component remounts)
//  - how many times audio.load() is called on those elements (= effect re-runs)
//  - how many .src setter calls happen
//
// Hypothesis: the source-loading useEffect in ListeningPlayer re-runs ~60×/sec
// on iOS, calling audio.load() repeatedly, which iOS Safari turns into a Range
// 0-1 probe storm.

const { webkit, devices } = require('@playwright/test')
const fs = require('fs')

const PROD_URL = process.env.PROD_URL || 'https://app.fluentia.academy'
const EMAIL    = process.env.TEST_EMAIL    || 'mock-test-a1@fluentia.academy'
const PASSWORD = process.env.TEST_PASSWORD || 'MockTest2025!'
const UNIT_ID  = process.env.UNIT_ID      || '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const PROFILE_ID = 'a82486b6-9472-4aba-b902-a0ec354ca170'

;(async () => {
  const browser = await webkit.launch({ headless: true })
  const ctx = await browser.newContext({ ...devices['iPhone 14'] })
  await ctx.addInitScript(() => {
    // Patch HTMLAudioElement.load + src setter BEFORE any audio is created
    window.__audioMetrics = { creates: 0, loads: 0, srcSets: 0, lastSrc: null, lastSrcAt: null }
    const origCreate = document.createElement.bind(document)
    document.createElement = function (tag, ...rest) {
      const el = origCreate(tag, ...rest)
      if (typeof tag === 'string' && tag.toLowerCase() === 'audio') {
        window.__audioMetrics.creates += 1
        const origLoad = el.load.bind(el)
        el.load = function () {
          window.__audioMetrics.loads += 1
          return origLoad()
        }
        // intercept src setter
        const proto = Object.getPrototypeOf(el)
        const desc = Object.getOwnPropertyDescriptor(proto, 'src') || Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src')
        if (desc) {
          Object.defineProperty(el, 'src', {
            get() { return desc.get.call(this) },
            set(v) {
              window.__audioMetrics.srcSets += 1
              window.__audioMetrics.lastSrc = v
              window.__audioMetrics.lastSrcAt = Date.now()
              desc.set.call(this, v)
            },
            configurable: true,
          })
        }
      }
      return el
    }
  })

  const page = await ctx.newPage()

  // Suppress most network noise; only audio requests will be huge
  let audioReqCount = 0
  page.on('response', (r) => {
    if (r.url().includes('curriculum-audio/listening/') && r.url().endsWith('.mp3')) audioReqCount++
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
  await page.waitForTimeout(5000)

  // Hide mobile bottom nav so we can click play
  await page.evaluate(() => {
    const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
    if (nav) nav.style.display = 'none'
  })

  // Take sample BEFORE click
  const before = await page.evaluate(() => ({
    ...window.__audioMetrics,
    audioCount: document.querySelectorAll('audio').length,
    audioReadyStates: Array.from(document.querySelectorAll('audio')).map(a => ({
      readyState: a.readyState, networkState: a.networkState, currentTime: a.currentTime, paused: a.paused
    })),
  }))
  console.log('BEFORE CLICK:', JSON.stringify({ ...before, audioReqCount }))

  // Click play
  const btn = page.locator('button[aria-label="تشغيل"]').first()
  await btn.click({ force: true })
  console.log('CLICKED at', Date.now())

  // Sample metrics every 2s for 20s
  const samples = []
  for (let i = 0; i < 10; i++) {
    const m = await page.evaluate(() => ({
      ...window.__audioMetrics,
      audioCount: document.querySelectorAll('audio').length,
      audioReadyStates: Array.from(document.querySelectorAll('audio')).map(a => ({
        readyState: a.readyState,
        networkState: a.networkState,
        currentTime: a.currentTime,
        paused: a.paused,
      })),
    }))
    samples.push({ at: Date.now(), audioReqCount, ...m })
    await page.waitForTimeout(2000)
  }
  console.log('SAMPLES:')
  for (const s of samples) {
    console.log(JSON.stringify(s))
  }
  fs.writeFileSync('docs/audits/LISTENING-INSTRUMENT.json', JSON.stringify(samples, null, 2))
  await browser.close()
  console.log('\n=== Sample summary ===')
  console.log('audio el creates:', samples[samples.length-1].creates)
  console.log('audio.load() calls:', samples[samples.length-1].loads)
  console.log('audio.src setter calls:', samples[samples.length-1].srcSets)
  console.log('audio network requests (mp3):', samples[samples.length-1].audioReqCount)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
