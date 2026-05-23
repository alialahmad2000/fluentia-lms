// Reproduction-gated test for L1 (Listening audio doesn't play).
//
// Usage:
//   PROD_URL=https://app.fluentia.academy \
//     UNIT_ID=<from-phase-0> LISTENING_ID=<from-phase-0> \
//     TEST_EMAIL=<email> TEST_PASSWORD=<pw> \
//     node scripts/reproduce-listening-bug.cjs
//
// Defaults are wired for the mock-test-a1 fixture (see Phase 0 of
// docs/audits/LISTENING-EVIDENCE.md).
//
// Captures: console logs, page errors, all network failures, every audio/storage
// response, before/after <audio> element snapshot, screenshot.

const { chromium, webkit, devices } = require('@playwright/test')
const fs = require('fs')
const path = require('path')

const PROD_URL = process.env.PROD_URL || 'https://app.fluentia.academy'
const EMAIL    = process.env.TEST_EMAIL    || 'mock-test-a1@fluentia.academy'
const PASSWORD = process.env.TEST_PASSWORD || 'MockTest2025!'
const UNIT_ID      = process.env.UNIT_ID      || '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const LISTENING_ID = process.env.LISTENING_ID || '2992edc4-d68d-4f16-99d1-ab7b7a2683c3'
const PROFILE_ID   = process.env.PROFILE_ID   || 'a82486b6-9472-4aba-b902-a0ec354ca170' // mock-test-a1
const OUT_DIR = process.env.OUT_DIR || 'docs/audits'

const EVIDENCE = []
const log = (label, data) => {
  const entry = { t: new Date().toISOString(), label, data }
  EVIDENCE.push(entry)
  try { console.log(JSON.stringify(entry)) } catch { console.log(label, '[unserializable]') }
}

async function runScenario(browserName) {
  const launcher = browserName === 'webkit' ? webkit : chromium
  const browser = await launcher.launch({ headless: true })
  const ctx = browserName === 'webkit'
    ? await browser.newContext({ ...devices['iPhone 14'] })
    : await browser.newContext({ viewport: { width: 1366, height: 800 } })
  const page = await ctx.newPage()

  // Capture EVERYTHING
  page.on('console', m => log(`${browserName}:console:${m.type()}`, m.text().slice(0, 1000)))
  page.on('pageerror', e => log(`${browserName}:pageerror`, (e.message || '') + '\n' + (e.stack || '').slice(0, 2000)))
  page.on('requestfailed', r => log(`${browserName}:requestfailed`, {
    url: r.url(), method: r.method(), failure: r.failure()?.errorText,
  }))
  page.on('response', async (r) => {
    const url = r.url()
    const ct = (r.headers()['content-type'] || '').toLowerCase()
    if (ct.startsWith('audio/') || url.includes('/curriculum-audio/') || url.includes('/storage/v1/object/')) {
      log(`${browserName}:audio-response`, {
        url, status: r.status(), ct, length: r.headers()['content-length'], range: r.headers()['content-range'],
      })
    }
  })

  try {
    // Login
    log(`${browserName}:nav`, `${PROD_URL}/login`)
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/student|curriculum|dashboard|profile/i, { timeout: 20000 })
    log(`${browserName}:logged-in`, page.url())

    // Settle after redirect so the SPA finishes its initial dashboard render
    await page.waitForTimeout(2500)

    // Skip the welcome AND PWA-install gates (both localStorage-keyed). The PWA
    // gate uses `pwa_install_dismissed_at` (any timestamp within 14 days suppresses
    // it). The welcome modal uses `fluentia_onboarded_<profileId>`.
    await page.evaluate((pid) => {
      try {
        localStorage.setItem(`fluentia_onboarded_${pid}`, 'true')
        localStorage.setItem('pwa_install_dismissed_at', Date.now().toString())
      } catch {}
    }, PROFILE_ID)

    // URL: unit-v2 uses ?activity=<key>, not ?tab=<key>
    const listenUrl = `${PROD_URL}/student/curriculum/unit/${UNIT_ID}?activity=listening`
    log(`${browserName}:nav`, listenUrl)
    await page.goto(listenUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => log(`${browserName}:networkidle-timeout`, 'continuing anyway'))
    log(`${browserName}:on-listening-tab`, page.url())

    // Lazy-chunk + initial fetches need extra room on real device profiles
    await page.waitForTimeout(5000)

    // Snapshot the audio element BEFORE click
    const beforeClick = await page.evaluate(() => {
      const all = document.querySelectorAll('audio')
      return Array.from(all).map((a, i) => ({
        index: i,
        src: a.src, currentSrc: a.currentSrc,
        readyState: a.readyState, networkState: a.networkState,
        paused: a.paused, error: a.error?.code,
        duration: a.duration, currentTime: a.currentTime,
        muted: a.muted, autoplay: a.autoplay, preload: a.preload,
      }))
    })
    log(`${browserName}:audio-before-click`, beforeClick)

    // Find the listening play button — selector: aria-label="تشغيل" (Arabic play)
    // ListeningPlayer's button toggles aria-label="إيقاف"|"تشغيل" based on state.
    const candidates = [
      'button[aria-label="تشغيل"]',
      'button[aria-label*="تشغيل"]',
      'button[aria-label*="play" i]',
      '[data-testid="listening-play"]',
    ]
    let playButton = null
    let usedSelector = null
    for (const sel of candidates) {
      const loc = page.locator(sel).first()
      const ok = await loc.isVisible().catch(() => false)
      if (ok) { playButton = loc; usedSelector = sel; break }
    }
    log(`${browserName}:play-button-found`, { usedSelector, visible: !!playButton })

    if (!playButton) {
      // Save full page screenshot + HTML for diagnosis
      await page.screenshot({ path: path.join(OUT_DIR, `listening-no-play-button-${browserName}.png`), fullPage: true })
      const html = await page.content()
      fs.writeFileSync(path.join(OUT_DIR, `listening-page-html-${browserName}.html`), html)
      log(`${browserName}:FATAL`, 'no play button visible after 2s wait — saved screenshot + HTML')
      await browser.close()
      return
    }

    // Pre-screenshot for visual record
    await page.screenshot({ path: path.join(OUT_DIR, `listening-before-click-${browserName}.png`), fullPage: false })

    // On mobile webkit the play button sits behind the bottom-nav. Hide the nav
    // via DOM injection so the click reaches the button. (We are testing the
    // PLAY/audio path, not the nav layout.)
    await page.evaluate(() => {
      const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
      if (nav) nav.style.display = 'none'
      // Also hide any PWA install gate that re-renders
      document.querySelectorAll('[class*="z-[9998]"], [class*="z-[100"]').forEach(el => {
        if (el.querySelector('button') && el.textContent.includes('تثبيت')) el.style.display = 'none'
      })
    })

    // Click — fall back to force:true if the standard click still fails
    let clicked = false
    try {
      await playButton.click({ timeout: 5000 })
      clicked = true
      log(`${browserName}:play-clicked`, 'standard click ok')
    } catch (e) {
      log(`${browserName}:standard-click-failed`, e.message.slice(0, 200))
      try {
        await playButton.click({ force: true, timeout: 5000 })
        clicked = true
        log(`${browserName}:play-clicked`, 'force click ok')
      } catch (e2) {
        log(`${browserName}:force-click-also-failed`, e2.message.slice(0, 200))
        // Last resort: dispatch click event via JS
        try {
          await page.evaluate(() => {
            const b = document.querySelector('button[aria-label="تشغيل"]')
            if (b) b.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
          })
          clicked = true
          log(`${browserName}:play-clicked`, 'dispatched via JS')
        } catch (e3) {
          log(`${browserName}:js-dispatch-failed`, e3.message.slice(0, 200))
        }
      }
    }
    if (!clicked) {
      log(`${browserName}:FATAL`, 'all click strategies failed')
      await browser.close()
      return
    }
    await page.waitForTimeout(3500)

    // Snapshot the audio element AFTER click
    const afterClick = await page.evaluate(() => {
      const all = document.querySelectorAll('audio')
      return Array.from(all).map((a, i) => ({
        index: i,
        src: a.src, currentSrc: a.currentSrc,
        readyState: a.readyState, networkState: a.networkState,
        paused: a.paused, error: a.error?.code, errorMessage: a.error?.message,
        duration: a.duration, currentTime: a.currentTime,
        muted: a.muted, volume: a.volume, autoplay: a.autoplay, preload: a.preload,
      }))
    })
    log(`${browserName}:audio-after-click`, afterClick)

    // Take post-screenshot
    await page.screenshot({ path: path.join(OUT_DIR, `listening-after-click-${browserName}.png`), fullPage: false })

    // Wait another 2s and re-check currentTime to confirm advancement
    await page.waitForTimeout(2000)
    const afterPlus2s = await page.evaluate(() => {
      const all = document.querySelectorAll('audio')
      return Array.from(all).map((a, i) => ({ index: i, currentTime: a.currentTime, paused: a.paused, error: a.error?.code }))
    })
    log(`${browserName}:audio-after-2s-more`, afterPlus2s)

    // Verdict
    const a0 = afterClick[0]
    const verdict = {
      hasAudioEl: afterClick.length > 0,
      srcAfterClick: a0?.src || null,
      pausedAfterClick: a0?.paused,
      currentTimeAfterClick: a0?.currentTime,
      errorAfterClick: a0?.error,
      currentTimeAfterPlus2s: afterPlus2s[0]?.currentTime,
      verdict:
        !afterClick.length ? 'NO_AUDIO_ELEMENT' :
        a0?.error ? `MEDIA_ERROR_${a0.error}` :
        a0?.paused ? 'PLAY_REJECTED_OR_NOT_STARTED' :
        a0?.currentTime > 0 && (afterPlus2s[0]?.currentTime || 0) > a0.currentTime ? 'PLAYING' :
        a0?.currentTime === 0 ? 'PAUSED_AT_ZERO' : 'NOT_ADVANCING',
    }
    log(`${browserName}:VERDICT`, verdict)
  } catch (e) {
    log(`${browserName}:scenario-error`, e.message + '\n' + (e.stack || '').slice(0, 1500))
    try {
      await page.screenshot({ path: path.join(OUT_DIR, `listening-error-${browserName}.png`), fullPage: true })
    } catch {}
  } finally {
    await browser.close()
  }
}

;(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  log('start', { PROD_URL, EMAIL, UNIT_ID, LISTENING_ID, OUT_DIR })
  try {
    await runScenario('chromium')
    await runScenario('webkit')
  } catch (e) {
    log('script-error', e.message + '\n' + (e.stack || '').slice(0, 1500))
  }
  fs.writeFileSync(path.join(OUT_DIR, 'LISTENING-EVIDENCE.json'), JSON.stringify(EVIDENCE, null, 2))
  console.log(`\n=== Evidence written to ${path.join(OUT_DIR, 'LISTENING-EVIDENCE.json')} ===`)
})()
