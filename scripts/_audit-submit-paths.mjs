#!/usr/bin/env node
/**
 * Submit-path audit — drives every student surface that takes an answer and proves,
 * in a real browser, that the student can actually hand work in.
 *
 * This exists because a submit path can die SILENTLY in three different ways, none of
 * which throws anything a log would catch:
 *   1. a remount eats the keystrokes, so the "all answered" gate never opens and the
 *      submit button stays disabled  (ClassRecaps, 080c05b0 — cost ملاك 4 whole recaps)
 *   2. RLS rejects the write and the client swallows the error, so it looks saved
 *   3. the button fires but nothing is ever persisted
 * Only driving the real UI and then re-reading the database catches all three.
 *
 * Usage:
 *   node scripts/_audit-submit-paths.mjs --email x@y.z --password '…' [--base https://app.fluentia.academy]
 * Run it against any NEW account before handing the credentials to a student.
 */
import { chromium } from 'playwright'

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > -1 ? process.argv[i + 1] : d }
const BASE = arg('base', 'https://app.fluentia.academy')
const EMAIL = arg('email'), PASSWORD = arg('password')
const HEADED = process.argv.includes('--headed')
if (!EMAIL || !PASSWORD) { console.error('need --email and --password'); process.exit(1) }

// Anything that reads as "hand this in".
// NOT «تحقق» — that is the PER-QUESTION check inside a grammar exercise, not a submit.
// Clicking it leaves an autosaved in_progress row and looks exactly like a failed
// submission if you only read the row's existence (ExerciseSection.jsx: "Always save as
// in_progress. Completion is only via handleFinish."). Matching it produced a false
// "grammar is broken" reading on the first run of this script.
const SUBMIT_RE = /تسليم|إرسال|أرسل|أنهِ|إنهاء|سلّم|أنهيت/
const RESULT_SEL = '.cr-result, .pw-result, [class*="result"], [class*="score"], [class*="Result"]'

/**
 * The only verdict that counts: did a row actually land?
 *
 * A result panel on screen proves nothing — the ClassRecaps bug rendered fine while
 * the write was rejected, and an autosaved DRAFT (status in_progress, score null) looks
 * identical to a finished submission unless you read the row back. So we query PostgREST
 * with the student's own access token (their RLS lets them read their own work) and
 * count only rows that represent COMPLETED work.
 */
async function countCompleted(page, table, filter) {
  return page.evaluate(async ([tbl, f]) => {
    let token = null
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (/auth-token/.test(k)) { try { token = JSON.parse(localStorage.getItem(k))?.access_token } catch {} }
    }
    if (!token) return { error: 'no access token in localStorage' }
    const url = `${window.__SB_URL__}/rest/v1/${tbl}?${f}&select=*`
    const r = await fetch(url, { headers: { apikey: window.__SB_KEY__, Authorization: `Bearer ${token}` } })
    if (!r.ok) return { error: `HTTP ${r.status} ${(await r.text()).slice(0, 120)}` }
    const rows = await r.json()
    return { count: rows.length, sample: rows[0] || null }
  }, [table, filter])
}

const SURFACES = [
  { key: 'exercises',    path: '/student/exercises',          enter: ['.pw-wcard button, .pw-wcard'] },
  { key: 'class-recaps', path: '/student/class-recaps',       enter: ['.cr-card', '.cr-scard button.primary'] },
  { key: 'srs',          path: '/student/srs' },
  { key: 'flashcards',   path: '/student/flashcards' },
  { key: 'verbs',        path: '/student/verbs' },
  { key: 'spelling-lab', path: '/student/spelling-lab' },
  { key: 'library',      path: '/student/library' },
  { key: 'homework',     path: '/student/retention/homework' },
  { key: 'curriculum',   path: '/student/curriculum' },
]

const log = (...a) => console.log(...a)

async function fillEverything(page) {
  // pick an option in each choice group
  const groups = await page.$$('.cr-opts, .pw-opts, [class*="opts"], [role="radiogroup"]')
  for (const g of groups) {
    const opts = await g.$$('button:not([disabled])')
    if (opts.length) { try { await opts[0].click({ timeout: 1500 }) } catch {} }
  }
  // type into every free-text field
  for (const inp of await page.$$('input[type="text"]:not([disabled]), textarea:not([disabled])')) {
    try { await inp.click({ timeout: 1500 }); await inp.type('test answer', { delay: 12 }) } catch {}
  }
  return { groups: groups.length, inputs: (await page.$$('input[type="text"], textarea')).length }
}

async function auditSurface(page, s, errors) {
  const out = { key: s.key, reached: false, answerable: 0, submitFound: false, submitEnabled: null, resultShown: null, note: '' }
  try {
    await page.goto(BASE + s.path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3500)
    if (/\/login/.test(page.url())) { out.note = 'bounced to /login'; return out }
    out.reached = true
    // drill inward if the surface needs a card opened first
    for (const sel of s.enter || []) {
      const el = await page.$(sel)
      if (el) { try { await el.click({ timeout: 2500 }); await page.waitForTimeout(2200) } catch {} }
    }
    const filled = await fillEverything(page)
    out.answerable = filled.groups + filled.inputs
    const buttons = await page.$$('button')
    let submit = null
    for (const b of buttons) {
      const t = ((await b.innerText().catch(() => '')) || '').trim()
      if (t && SUBMIT_RE.test(t)) { submit = b; out.submitLabel = t.slice(0, 30); break }
    }
    if (!submit) { out.note = out.answerable ? 'answerable but NO submit control found' : 'nothing answerable here'; return out }
    out.submitFound = true
    out.submitEnabled = await submit.isEnabled()
    if (!out.submitEnabled) { out.note = 'SUBMIT DISABLED after answering everything'; return out }
    await submit.click({ timeout: 3000 })
    await page.waitForTimeout(3500)
    out.resultShown = !!(await page.$(RESULT_SEL))
    if (!out.resultShown) out.note = 'clicked submit, no result/score appeared'
  } catch (e) { out.note = 'ERROR: ' + String(e.message || e).slice(0, 110) }
  return out
}

const SB_URL = arg('supabase-url', process.env.VITE_SUPABASE_URL)
const SB_KEY = arg('supabase-key', process.env.VITE_SUPABASE_ANON_KEY)
const browser = await chromium.launch({ headless: !HEADED })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
if (SB_URL && SB_KEY) await ctx.addInitScript(([u, k]) => { window.__SB_URL__ = u; window.__SB_KEY__ = k }, [SB_URL, SB_KEY])
const page = await ctx.newPage()
const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${String(e).slice(0, 160)}`))
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`) })

// Supabase rate-limits repeated sign-ins; back off rather than reporting a false failure.
let logged = false
for (let attempt = 1; attempt <= 4 && !logged; attempt++) {
  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL)
    await page.locator('input[type="password"]').first().fill(PASSWORD)
    await page.getByRole('button', { name: 'دخول', exact: true }).click()
    await page.waitForFunction(() => /\/(student|admin|trainer)/.test(location.pathname), null, { timeout: 45000 })
    logged = true
  } catch {
    const wait = attempt * 60
    log(`login attempt ${attempt} failed (rate limit?) — waiting ${wait}s`)
    await page.waitForTimeout(wait * 1000)
  }
}
if (!logged) { console.error('could not log in after 4 attempts'); process.exit(2) }
const profileId = await page.evaluate(() => {
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (/auth-token/.test(k)) { try { return JSON.parse(localStorage.getItem(k))?.user?.id } catch {} }
  }
})
log(`\nlogged in as ${EMAIL}  profile=${profileId}\nauditing on ${BASE}\nRUN_START=${new Date().toISOString()}\n`)
// The onboarding + PWA modals sit ON TOP of everything and eat every click, so a
// surface looks empty when it is merely covered. Set the flags, then RELOAD so the
// modals never mount in the first place.
await ctx.addInitScript((id) => {
  try { localStorage.setItem(`fluentia_onboarded_${id}`, 'true'); localStorage.setItem('pwa_install_dismissed_at', String(Date.now())) } catch {}
}, profileId)
await page.evaluate((id) => { try { localStorage.setItem(`fluentia_onboarded_${id}`, 'true'); localStorage.setItem('pwa_install_dismissed_at', String(Date.now())) } catch {} }, profileId)
await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000)

const results = []
for (const s of SURFACES) results.push(await auditSurface(page, s, errors))

// ── unit sections: the actual "sections of units" a student complains about ──
const UNIT = arg('unit')
if (UNIT) {
  const ACTIVITIES = ['القراءة', 'القواعد', 'المفردات', 'الاستماع', 'الكتابة', 'التحدث']
  for (const name of ACTIVITIES) {
    const r = { key: `unit:${name}`, reached: false, answerable: 0, submitFound: false, submitEnabled: null, resultShown: null, note: '' }
    try {
      await page.goto(`${BASE}/student/curriculum/unit/${UNIT}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(3800)
      const card = page.locator(`text=${name}`).first()
      if (!(await card.count())) { r.note = 'activity not offered in this unit'; results.push(r); continue }
      await card.click({ timeout: 4000 }); await page.waitForTimeout(4200)
      r.reached = true
      // some sections put the questions behind a "start" step
      for (const lbl of [/ابدئي|ابدأ|التالي/]) {
        const b = page.getByRole('button', { name: lbl }).first()
        if (await b.count()) { try { await b.click({ timeout: 1800 }); await page.waitForTimeout(2200) } catch {} }
      }
      const f = await fillEverything(page)
      r.answerable = f.groups + f.inputs
      let submit = null
      for (const b of await page.$$('button')) {
        const t = ((await b.innerText().catch(() => '')) || '').trim()
        if (t && SUBMIT_RE.test(t)) { submit = b; r.submitLabel = t.slice(0, 30); break }
      }
      if (!submit) { r.note = r.answerable ? 'answerable but NO submit control' : 'nothing answerable'; results.push(r); continue }
      r.submitFound = true
      r.submitEnabled = await submit.isEnabled()
      if (!r.submitEnabled) { r.note = 'SUBMIT DISABLED after answering everything'; results.push(r); continue }
      await submit.click({ timeout: 3000 }); await page.waitForTimeout(5000)
      r.resultShown = !!(await page.$(RESULT_SEL))
      // The verdict: a COMPLETED row, not a draft. status=in_progress with score null is
      // what autosave leaves behind and is NOT a submission.
      const sec = { 'القراءة': 'reading', 'القواعد': 'grammar', 'المفردات': 'vocabulary',
                    'الاستماع': 'listening', 'الكتابة': 'writing', 'التحدث': 'speaking' }[name]
      const done = await countCompleted(page, 'student_curriculum_progress',
        `student_id=eq.${profileId}&section_type=eq.${sec}&status=eq.completed`)
      const draft = await countCompleted(page, 'student_curriculum_progress',
        `student_id=eq.${profileId}&section_type=eq.${sec}&status=eq.in_progress`)
      r.persisted = done.count ?? `ERR(${done.error})`
      if (done.count > 0) r.note = 'submitted and stored'
      else if (draft.count > 0) r.note = 'ONLY A DRAFT STORED — submit did not complete the section'
      else r.note = 'NOTHING PERSISTED after submit'
    } catch (e) { r.note = 'ERROR: ' + String(e.message || e).slice(0, 110) }
    results.push(r)
  }
}

log('surface           reached answerable submit enabled result  saved  note')
log('─'.repeat(104))
for (const r of results) {
  log(`${r.key.padEnd(17)} ${String(r.reached).padEnd(7)} ${String(r.answerable).padEnd(10)} ` +
      `${String(r.submitFound).padEnd(6)} ${String(r.submitEnabled ?? '-').padEnd(7)} ${String(r.resultShown ?? '-').padEnd(6)} ${String(r.persisted ?? '-').padEnd(6)} ${r.note}`)
}
const bad = results.filter(r => /DISABLED|NOTHING PERSISTED|ONLY A DRAFT|^ERROR|NO submit/.test(r.note))
log(`\n${bad.length ? '⚠️  ' + bad.length + ' surface(s) need a look: ' + bad.map(b => b.key).join(', ') : '✅ no blocked submit path found'}`)
if (errors.length) { log(`\nconsole/page errors (${errors.length}):`); [...new Set(errors)].slice(0, 15).forEach(e => log('  ' + e)) }
await browser.close()
