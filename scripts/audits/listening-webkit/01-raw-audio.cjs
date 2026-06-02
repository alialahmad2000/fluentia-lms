// Cross-engine raw-audio test (prompt 10, Phase A.1) — the killer test.
// Tests a real curriculum-audio URL in WebKit vs Chromium, WITH and WITHOUT
// crossOrigin="anonymous", in isolation from app code. The bug is whatever
// WebKit does that Chromium doesn't.
//
// Usage: node scripts/audits/listening-webkit/01-raw-audio.cjs "<audio_url>"
const { webkit, chromium } = require('playwright')
const fs = require('fs')

const AUDIO_URL = process.argv[2]
if (!AUDIO_URL) { console.error('pass an audio URL'); process.exit(1) }

const page = (url, co) => `<!DOCTYPE html><html><body>
  <audio id="a" ${co ? 'crossorigin="anonymous"' : ''} src="${url}" preload="auto"></audio>
  <script>
    window.__r = { events: [] };
    const a = document.getElementById('a');
    ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','playing','error','stalled','suspend','waiting']
      .forEach(ev => a.addEventListener(ev, () => window.__r.events.push(ev)));
    window.tryPlay = async () => {
      try { await a.play(); window.__r.playResolved = true; }
      catch(e) { window.__r.playError = e.name + ': ' + e.message; }
      return true;
    };
  </script>
</body></html>`

async function runOne(engine, engineName, co) {
  const browser = await engine.launch({ headless: true })
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  const net = []
  p.on('response', (r) => {
    const u = r.url()
    if (u.includes('.mp3') || u.includes('/storage/')) {
      net.push({ status: r.status(), aco: r.headers()['access-control-allow-origin'], ar: r.headers()['accept-ranges'], cr: r.headers()['content-range'] })
    }
  })
  await p.setContent(page(AUDIO_URL, co), { waitUntil: 'load' })
  await p.evaluate(() => document.body.click())
  await p.evaluate(() => window.tryPlay())
  await p.waitForTimeout(2800)
  const final = await p.evaluate(() => {
    const a = document.getElementById('a')
    return {
      readyState: a.readyState, currentTime: a.currentTime,
      paused: a.paused, events: window.__r.events,
      playError: window.__r.playError || null,
      error: a.error ? { code: a.error.code, message: a.error.message } : null,
    }
  })
  await browser.close()
  return { engineName, variant: co ? 'with-crossOrigin' : 'without-crossOrigin', final, net }
}

;(async () => {
  const out = []
  out.push(await runOne(webkit, 'WebKit', true))
  out.push(await runOne(webkit, 'WebKit', false))
  out.push(await runOne(chromium, 'Chromium', true))
  out.push(await runOne(chromium, 'Chromium', false))

  fs.mkdirSync('docs/audits/listening-webkit/', { recursive: true })
  fs.writeFileSync('docs/audits/listening-webkit/raw-audio-results.json', JSON.stringify({ url: AUDIO_URL, out }, null, 2))

  console.log('\n=== RAW AUDIO CROSS-ENGINE TEST ===')
  console.log('url:', AUDIO_URL, '\n')
  for (const r of out) {
    const played = r.final.currentTime > 0 ? '✅ PLAYS' : '❌ FAILS'
    console.log(
      `${r.engineName.padEnd(9)} ${r.variant.padEnd(20)} ${played}  ` +
      `rs=${r.final.readyState} t=${r.final.currentTime.toFixed(2)} ` +
      `err=${JSON.stringify(r.final.error)} playErr=${r.final.playError || '-'}`
    )
  }
})().catch((e) => { console.error(e); process.exit(1) })
