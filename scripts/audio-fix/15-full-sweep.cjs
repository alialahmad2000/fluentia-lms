// Phase 5.1 — Full sweep: 72 listening files × 3 browsers = 216 runs.
//
// Worker pool keeps wall time reasonable but does not skip any file. Writes
// docs/audits/phase5-full-sweep.json. Halt if any failure surfaces.
//
// Lighter watch loop than 11-verify-pilots.cjs — 20 seconds of playback + 2
// seeks instead of 60s + 4 seeks. Goal: catch decode/load failures across
// every file × browser without taking 3+ hours.

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { chromium, webkit, firefox } = require('@playwright/test')

function loadEnv() {
  const env = {}
  fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8').split('\n').forEach(l => {
    const i = l.indexOf('='); if (i <= 0) return
    let v = l.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    v = v.replace(/\\n$/, '')
    env[l.slice(0, i).trim()] = v
  })
  return env
}
const env = loadEnv()
const sb = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const OUT = path.resolve(__dirname, '../../docs/audits/phase5-full-sweep.json')
const BROWSERS = { chromium, webkit, firefox }
const POOL_SIZE = 3 // parallel pages per browser
const WATCH_SECONDS = 20

function harnessHtml(url) {
  return `<!doctype html><html><head><meta charset="utf-8"></head>
<body><audio id="a" preload="auto" crossorigin="anonymous" src="${url}"></audio>
<script>
  window.__evts = []
  const a = document.getElementById('a')
  for (const ev of ['error','play','playing','pause','waiting','stalled','ended','loadedmetadata']) {
    a.addEventListener(ev, () => window.__evts.push({ev, t:Date.now(), errCode: a.error?.code ?? null, ct: a.currentTime}))
  }
</script></body></html>`
}

async function testOne(browserName, browser, fileId, url) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  try {
    await page.setContent(harnessHtml(url), { waitUntil: 'load' })
    // metadata
    const metaOk = await page.evaluate(async () => {
      const a = document.getElementById('a')
      return await new Promise(r => {
        if (Number.isFinite(a.duration) && a.duration > 0) return r(true)
        const tO = setTimeout(() => r(false), 10000)
        const ok = () => { clearTimeout(tO); r(true) }
        const er = () => { clearTimeout(tO); r(false) }
        a.addEventListener('loadedmetadata', ok, { once: true })
        a.addEventListener('error', er, { once: true })
      })
    })
    let playErr = null
    if (metaOk) {
      playErr = await page.evaluate(async () => {
        const a = document.getElementById('a')
        try { await a.play(); return null } catch (e) { return e.name + ':' + e.message }
      })
    }
    // Watch
    const samples = []
    for (let s = 0; s < WATCH_SECONDS; s++) {
      await new Promise(r => setTimeout(r, 1000))
      const snap = await page.evaluate(() => {
        const a = document.getElementById('a')
        return { ct: a.currentTime, paused: a.paused, errCode: a.error?.code ?? null }
      })
      samples.push(snap)
    }
    // 2 seeks
    const seekResults = []
    if (metaOk) {
      for (const pct of [0.5, 0.85]) {
        const r = await page.evaluate(async (p) => {
          const a = document.getElementById('a')
          if (!Number.isFinite(a.duration) || a.duration <= 0) return { ok: false, err: 'no_dur' }
          try { a.currentTime = a.duration * p } catch (e) { return { ok: false, err: e.name } }
          try { await a.play() } catch (e) { return { ok: false, err: e.name } }
          const start = a.currentTime
          await new Promise(r => setTimeout(r, 2500))
          return { ok: true, advanced: a.currentTime - start, errCode: a.error?.code ?? null }
        }, pct)
        seekResults.push({ pct, ...r })
      }
    }
    const finalErr = samples.find(s => s.errCode) || null
    const monotonicSec = samples.filter((s, i) => i > 0 && s.ct > samples[i - 1].ct).length
    const pass = metaOk && !playErr && !finalErr && monotonicSec >= WATCH_SECONDS * 0.6 && seekResults.every(r => r.ok && r.advanced > 0.5 && !r.errCode)
    return {
      file_id: fileId, browser: browserName, url,
      meta_ok: metaOk, play_err: playErr, final_err_code: finalErr?.errCode ?? null,
      monotonic_sec: monotonicSec, watch_sec: WATCH_SECONDS,
      seek_results: seekResults, pass,
    }
  } finally {
    await page.close().catch(() => {})
    await ctx.close().catch(() => {})
  }
}

;(async () => {
  const argv = process.argv.slice(2)
  const networkPattern = argv.find(a => a.startsWith('--network='))?.slice(10)
  const fileIdsArg = argv.find(a => a.startsWith('--file-ids='))?.slice(11)
  let rows
  if (fileIdsArg) {
    const ids = fileIdsArg.split(',').map(s => s.trim()).filter(Boolean)
    const { data, error } = await sb.from('curriculum_listening')
      .select('id, audio_url').in('id', ids).not('audio_url', 'is', null)
    if (error) throw error
    rows = data
  } else {
    const { data, error } = await sb.from('curriculum_listening')
      .select('id, audio_url').not('audio_url', 'is', null).order('id')
    if (error) throw error
    rows = data
  }
  console.log(`Sweeping ${rows.length} files × 3 browsers = ${rows.length * 3} runs (pool=${POOL_SIZE})`)

  const results = []
  for (const browserName of Object.keys(BROWSERS)) {
    const launchOpts = browserName === 'chromium' ? { args: ['--autoplay-policy=no-user-gesture-required'] } : {}
    const browser = await BROWSERS[browserName].launch(launchOpts)
    console.log(`\n=== ${browserName} ===`)
    // Pool
    const queue = rows.slice()
    let inFlight = 0
    let completed = 0
    await new Promise((resolve, reject) => {
      const tick = async () => {
        if (queue.length === 0 && inFlight === 0) return resolve()
        while (inFlight < POOL_SIZE && queue.length > 0) {
          const row = queue.shift()
          inFlight++
          ;(async () => {
            try {
              const r = await testOne(browserName, browser, row.id, row.audio_url)
              results.push(r)
              completed++
              process.stdout.write(`\r  ${browserName}: ${completed}/${rows.length}   `)
            } catch (e) {
              results.push({ file_id: row.id, browser: browserName, url: row.audio_url, fatal: e.message, pass: false })
              completed++
            } finally {
              inFlight--
              tick().catch(reject)
            }
          })().catch(reject)
        }
      }
      tick().catch(reject)
    })
    await browser.close()
    console.log()
  }

  const failed = results.filter(r => !r.pass)
  const summary = {
    completed_at: new Date().toISOString(),
    total_files: rows.length,
    total_runs: results.length,
    passed: results.filter(r => r.pass).length,
    failed: failed.length,
    network_pattern: networkPattern || null,
    failures: failed,
    results,
  }
  // Apply suffix to output if running a subset / network pass
  const suffix = networkPattern ? `-${networkPattern}` : (fileIdsArg ? '-subset' : '')
  const outPath = OUT.replace(/\.json$/, `${suffix}.json`)
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2))
  console.log(`\nTotal: ${results.length}  Passed: ${summary.passed}  Failed: ${failed.length}`)
  console.log(`Wrote ${outPath}`)
  if (failed.length > 0) {
    console.error('\nFailing combinations:')
    for (const f of failed.slice(0, 20)) {
      console.error(`  ${f.browser}  ${f.file_id}  ${f.fatal || `metaOk=${f.meta_ok} playErr=${f.play_err}`}`)
    }
    process.exit(1)
  }
})().catch(e => { console.error('FATAL', e); process.exit(2) })
