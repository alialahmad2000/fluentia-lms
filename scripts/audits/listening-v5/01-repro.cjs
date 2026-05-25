/* eslint-disable */
// Listening Forensic V5 — focused WebKit vs Chromium reproduction.
// Probes audio.readyState at tap time + play() outcome on the REAL prod
// listening page. WebKit can't faithfully enforce iOS autoplay-gesture
// rejection in headless (no audio device, .click() = gesture), so a "PLAYS"
// is NOT proof real iOS works — but readyState at tap reliably reveals whether
// the buggy `readyState<2 -> defer play() to canplay` branch fires.

const { chromium, webkit, devices } = require('playwright')
const fs = require('fs')

const BASE = 'https://app.fluentia.academy'
const EMAIL = 'mock-test-a1@fluentia.academy'
const PASSWORD = 'MockTest2025!'
const UNIT = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc' // L1 unit 1, has listening audio
const ART = 'docs/audits/listening-v5/artifacts'

const MATRIX = [
  { name: 'ios_safari_iphone13', engine: webkit, device: devices['iPhone 13'] },
  { name: 'desktop_chrome', engine: chromium, device: null, viewport: { width: 1440, height: 900 } },
]

const snapshotAudio = `() => {
  const a = document.querySelector('audio');
  if (!a) return { exists: false };
  return { exists: true, src: (a.src||'').slice(0,80), readyState: a.readyState, networkState: a.networkState,
    paused: a.paused, currentTime: a.currentTime, duration: a.duration,
    error: a.error ? { code: a.error.code, message: a.error.message } : null,
    preload: a.preload, crossOrigin: a.crossOrigin };
}`

;(async () => {
  const results = []
  for (const cfg of MATRIX) {
    const out = { device: cfg.name, steps: [], console: [] }
    let browser
    try {
      browser = await cfg.engine.launch({ headless: true })
      const ctx = await browser.newContext({
        ...(cfg.device || {}),
        ...(cfg.viewport ? { viewport: cfg.viewport } : {}),
        recordHar: { path: `${ART}/${cfg.name}.har` },
      })
      const page = await ctx.newPage()
      page.on('console', m => out.console.push(`${m.type()}: ${m.text()}`.slice(0, 300)))
      page.on('pageerror', e => out.console.push(`pageerror: ${e.message}`.slice(0, 300)))

      const snap = async () => { try { return await page.evaluate(snapshotAudio) } catch { return { exists: false, evalErr: true } } }

      // Login
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
      await page.fill('input[type="email"]', EMAIL)
      await page.fill('input[type="password"]', PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL(/student/, { timeout: 45000 }).catch(() => {})
      // Let auth + dashboard fully settle so the unit route doesn't bounce to /student
      await page.waitForTimeout(6000)
      out.steps.push({ step: 'login', url: page.url() })

      // Go to the unit — retry once if the app bounces us back to /student
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await page.goto(`${BASE}/student/curriculum/unit/${UNIT}`, { waitUntil: 'networkidle', timeout: 45000 })
        } catch (e) { out.steps.push({ step: `nav-attempt-${attempt}-err`, err: e.message.slice(0,100) }) }
        await page.waitForTimeout(3000)
        if (page.url().includes(`/unit/${UNIT}`)) break
        out.steps.push({ step: `nav-attempt-${attempt}-bounced`, url: page.url() })
        await page.waitForTimeout(3000)
      }
      out.steps.push({ step: 'unit-loaded', url: page.url() })

      // Click the listening tab (try Arabic label + fallbacks)
      const tab = page.locator('text=/الاستماع|استماع|Listening/i').first()
      await tab.click({ timeout: 8000 }).catch(e => out.steps.push({ step: 'tab-click-fail', err: e.message.slice(0,120) }))
      await page.waitForTimeout(2500)

      // Snapshot audio element BEFORE the play click
      const before = await snap()
      out.steps.push({ step: 'before-click', audio: before })

      // Find + click the play button
      const playBtn = page.locator('button[aria-label*="تشغيل"], button[aria-label*="play"], button[aria-label*="استمع"], button:has-text("استمعي"), button:has-text("استمع")').first()
      const visible = await playBtn.isVisible().catch(() => false)
      out.steps.push({ step: 'play-btn-visible', visible })
      if (visible) {
        await playBtn.click({ timeout: 5000 }).catch(e => out.steps.push({ step: 'play-click-err', err: e.message.slice(0,120) }))
      } else {
        // fallback: click any button inside the audio player region
        await page.locator('audio ~ * button, button:near(audio)').first().click({ timeout: 4000 }).catch(()=>{})
      }

      // Snapshot immediately + after 3.5s (to catch the silent-fail watchdog window)
      const t0 = await snap()
      await page.waitForTimeout(3500)
      const after = await snap()
      out.steps.push({ step: 'after-click-immediate', audio: t0 })
      out.steps.push({ step: 'after-click-3.5s', audio: after })

      await page.screenshot({ path: `${ART}/${cfg.name}-listening.png`, fullPage: false }).catch(()=>{})

      // Classify
      let outcome = 'UNKNOWN'
      if (!before.exists && !after.exists) outcome = 'NO_AUDIO_ELEMENT'
      else if (after.error) outcome = `AUDIO_ERROR_${after.error.code}`
      else if (after.currentTime > 0.1) outcome = 'PLAYS'
      else if (after.paused && after.currentTime === 0) outcome = 'SILENT_FAIL'
      out.outcome = outcome
      out.readyStateAtTap = before.exists ? before.readyState : 'no-audio-el'
      out.deferralBranchHit = before.exists && before.readyState < 2 // the buggy path trigger
      await ctx.close()
    } catch (e) {
      out.fatal = e.message.slice(0, 300)
    } finally {
      if (browser) await browser.close().catch(()=>{})
    }
    results.push(out)
    console.log(`[${cfg.name}] outcome=${out.outcome||'(fatal)'} readyStateAtTap=${out.readyStateAtTap} deferralHit=${out.deferralBranchHit} ${out.fatal?'FATAL: '+out.fatal:''}`)
  }
  fs.writeFileSync(`${ART}/repro-matrix.json`, JSON.stringify(results, null, 2))
  console.log('wrote ' + ART + '/repro-matrix.json')
})()
