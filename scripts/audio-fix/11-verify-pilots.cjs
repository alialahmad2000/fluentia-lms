// Phase 1.2 — Programmatic multi-browser pilot verification.
//
// For each pilot (A and B) and each version (original, re-encoded), run a
// 60-second playback test under chromium + webkit + firefox. Records per-second
// audio state, performs 4 seeks (25/50/75/10%), and captures console / network
// errors. Writes per-run JSON to docs/audits/phase1-verify/.
//
// PASS: currentTime advances monotonically for >= 80% of the watched seconds,
//       NO MediaError, audio NOT paused unexpectedly during play, < 8 Range
//       requests total (probe storm sentinel), all 4 seeks resume play within 3s.

const fs = require('fs')
const path = require('path')
const { chromium, webkit, firefox } = require('@playwright/test')

const OUT_DIR = path.resolve(__dirname, '../../docs/audits/phase1-verify')
fs.mkdirSync(OUT_DIR, { recursive: true })

const PILOTS = {
  A: {
    id: '896ab711-ea14-47bc-9e36-f4d09931ffab',
    original_url: 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L1/896ab711-ea14-47bc-9e36-f4d09931ffab/combined.mp3',
    reencoded_url: 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/_pilot_reencoded_896ab711-ea14-47bc-9e36-f4d09931ffab.mp3',
  },
  B: {
    id: '7dc526f8-069e-4fae-b842-9af82a585a97',
    original_url: 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L4/7dc526f8-069e-4fae-b842-9af82a585a97/combined.mp3',
    reencoded_url: 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/_pilot_reencoded_7dc526f8-069e-4fae-b842-9af82a585a97.mp3',
  },
}

const BROWSERS = { chromium, webkit, firefox }

// Raw <audio> harness page — no Fluentia code involved.
function harnessHtml(audioUrl) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>audio harness</title></head>
<body>
<audio id="a" preload="auto" crossorigin="anonymous" src="${audioUrl}"></audio>
<script>
  window.__audioEvents = []
  const a = document.getElementById('a')
  for (const ev of ['loadstart','loadedmetadata','canplay','canplaythrough','play','playing','pause','waiting','stalled','suspend','seeking','seeked','ended','error','abort','emptied']) {
    a.addEventListener(ev, () => {
      window.__audioEvents.push({ ev, t: Date.now(), currentTime: a.currentTime, readyState: a.readyState, errCode: a.error?.code ?? null })
    })
  }
</script>
</body></html>`
}

async function runOne(browserName, label, url) {
  const tag = `${label}-${browserName}`
  console.log(`\n=== ${tag} ===`)
  const launchOpts = browserName === 'chromium'
    ? { args: ['--autoplay-policy=no-user-gesture-required'] }
    : {}
  const browser = await BROWSERS[browserName].launch(launchOpts)
  const ctx = await browser.newContext()
  const page = await ctx.newPage()

  const consoleErrors = []
  const requestFailures = []
  const rangeRequests = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), location: msg.location() })
  })
  page.on('requestfailed', (req) => {
    requestFailures.push({ url: req.url(), failure: req.failure() })
  })
  page.on('request', (req) => {
    const range = req.headers()['range']
    if (range && req.url().includes('mp3')) rangeRequests.push({ url: req.url(), range })
  })

  await page.setContent(harnessHtml(url), { waitUntil: 'load' })
  // Wait up to 15s for metadata so we know the duration; if it never comes,
  // treat that as a failure mode (not a script crash).
  const metadataOk = await page.evaluate(async () => {
    const a = document.getElementById('a')
    return await new Promise((resolve) => {
      if (Number.isFinite(a.duration) && a.duration > 0) return resolve(true)
      const tEvt = () => { cleanup(); resolve(Number.isFinite(a.duration) && a.duration > 0) }
      const tErr = () => { cleanup(); resolve(false) }
      const tTimeout = setTimeout(() => { cleanup(); resolve(false) }, 15000)
      function cleanup() {
        clearTimeout(tTimeout)
        a.removeEventListener('loadedmetadata', tEvt)
        a.removeEventListener('error', tErr)
      }
      a.addEventListener('loadedmetadata', tEvt)
      a.addEventListener('error', tErr)
    })
  })
  // Trigger play
  await page.evaluate(async () => {
    const a = document.getElementById('a')
    try { await a.play() } catch (e) { window.__playRejection = { name: e.name, msg: e.message } }
  })

  // Watch for 60 seconds
  const samples = []
  for (let s = 0; s < 60; s++) {
    await new Promise(r => setTimeout(r, 1000))
    const snap = await page.evaluate(() => {
      const a = document.getElementById('a')
      return {
        currentTime: a.currentTime,
        paused: a.paused,
        readyState: a.readyState,
        errorCode: a.error?.code ?? null,
        duration: Number.isFinite(a.duration) ? a.duration : null,
        buffered: a.buffered.length ? a.buffered.end(a.buffered.length - 1) : 0,
      }
    })
    samples.push({ t: s, ...snap })
  }

  // Perform 4 seeks (skip if no duration)
  const seekResults = []
  if (metadataOk) {
    for (const pct of [0.25, 0.50, 0.75, 0.10]) {
      const result = await page.evaluate(async (p) => {
        const a = document.getElementById('a')
        if (!Number.isFinite(a.duration) || a.duration <= 0) {
          return { ok: false, err: 'no_duration', errorCode: a.error?.code ?? null }
        }
        const target = a.duration * p
        try {
          a.currentTime = target
        } catch (e) {
          return { ok: false, err: `seek_assign_${e.name}`, errorCode: a.error?.code ?? null }
        }
        try { await a.play() } catch (e) { return { ok: false, err: e.name, errorCode: a.error?.code ?? null } }
        const start = a.currentTime
        await new Promise(r => setTimeout(r, 3500))
        return {
          ok: true,
          seekedTo: target,
          startCurrentTime: start,
          endCurrentTime: a.currentTime,
          advanced: a.currentTime - start,
          paused: a.paused,
          errorCode: a.error?.code ?? null,
        }
      }, pct)
      seekResults.push({ pct, ...result })
    }
  } else {
    for (const pct of [0.25, 0.50, 0.75, 0.10]) {
      seekResults.push({ pct, ok: false, err: 'no_metadata' })
    }
  }

  const events = await page.evaluate(() => window.__audioEvents)
  const playRejection = await page.evaluate(() => window.__playRejection || null)

  await browser.close()

  // === Verdict ===
  const finalSample = samples[samples.length - 1]
  const monotonicSecs = samples.filter((s, i) => i > 0 && s.currentTime > samples[i - 1].currentTime).length
  const monotonicPct = monotonicSecs / (samples.length - 1)
  const hadError = samples.some(s => s.errorCode !== null) || finalSample.errorCode !== null
  const seekFailures = seekResults.filter(s => !s.ok || s.advanced < 1 || s.errorCode !== null).length
  const probeStorm = rangeRequests.length > 8

  const pass = !hadError && !playRejection && monotonicPct >= 0.8 && seekFailures === 0 && !probeStorm

  const report = {
    label,
    browser: browserName,
    url,
    metadata_ok: metadataOk,
    final_time: finalSample.currentTime,
    duration: finalSample.duration,
    monotonic_secs: monotonicSecs,
    monotonic_pct: monotonicPct,
    play_rejection: playRejection,
    had_media_error: hadError,
    error_codes_seen: [...new Set(samples.map(s => s.errorCode).filter(Boolean))],
    seek_results: seekResults,
    seek_failures: seekFailures,
    range_request_count: rangeRequests.length,
    probe_storm: probeStorm,
    console_errors: consoleErrors.slice(0, 20),
    request_failures: requestFailures.slice(0, 20),
    event_summary: events.reduce((acc, e) => { acc[e.ev] = (acc[e.ev] || 0) + 1; return acc }, {}),
    pass,
  }
  fs.writeFileSync(path.join(OUT_DIR, `${tag}.json`), JSON.stringify(report, null, 2))
  console.log(`  ${pass ? '✓ PASS' : '✗ FAIL'}  monotonic=${monotonicPct.toFixed(2)} seek_fails=${seekFailures} ranges=${rangeRequests.length} errors=${hadError}`)
  return report
}

;(async () => {
  const matrix = []
  for (const [pilot, urls] of Object.entries(PILOTS)) {
    for (const [version, urlKey] of [['original', 'original_url'], ['reencoded', 'reencoded_url']]) {
      for (const browser of Object.keys(BROWSERS)) {
        const label = `pilot${pilot}-${version}`
        try {
          const r = await runOne(browser, label, urls[urlKey])
          matrix.push(r)
        } catch (e) {
          console.error(`  FATAL ${label} ${browser}:`, e.message)
          matrix.push({ label, browser, url: urls[urlKey], pass: false, fatal: e.message })
        }
      }
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, '_matrix.json'), JSON.stringify(matrix, null, 2))
  console.log(`\nWrote ${matrix.length} run reports to ${OUT_DIR}`)
})().catch(e => { console.error('FATAL', e); process.exit(1) })
