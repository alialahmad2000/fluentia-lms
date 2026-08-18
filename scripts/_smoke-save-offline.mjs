// Proves the two things that were previously impossible:
//   1. a submitted attempt completes atomically (status + score + is_best)
//   2. work answered while the network is DOWN survives, and replays by itself
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '/Users/dr.ali/projects/fluentia-lms/.env' })

const SB   = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY
const BASE = process.env.SMOKE_BASE || 'http://localhost:4188'
const OUT  = '/private/tmp/claude-501/-Users-dr-ali/1f4f426d-0cd9-4cfc-ad96-2a8db247fe09/scratchpad'

const STUDENT = 'a82486b6-9472-4aba-b902-a0ec354ca170'
const UNIT    = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const GRAMMAR = '91c091d2-c56d-4ceb-86c2-164a1dc9a2ae'

const svc = createClient(SB, SVC, { auth: { persistSession: false } })
const clean = () => svc.from('student_curriculum_progress').delete()
  .eq('student_id', STUDENT).eq('grammar_id', GRAMMAR)
const rows = async () => (await svc.from('student_curriculum_progress')
  .select('id,status,score,attempt_number,is_best,is_latest,answers')
  .eq('student_id', STUDENT).eq('grammar_id', GRAMMAR)).data || []
const countAns = r => r?.answers?.exercises?.filter(e => e.studentAnswer != null).length ?? 0

const results = []
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`  ${ok ? 'PASS' : '*** FAIL ***'}  ${name}  ${detail}`) }

;(async () => {
  await clean()
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, locale: 'ar' })
  const page = await ctx.newPage()
  await page.addInitScript(({ id }) => {
    localStorage.setItem(`fluentia_onboarded_${id}`, 'true')
    localStorage.setItem('pwa_install_dismissed_at', String(Date.now()))
  }, { id: STUDENT })

  // the mock account rate-limits — retry like the other smokes do
  let loggedIn = false
  for (let i = 0; i < 4 && !loggedIn; i++) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
    await page.fill('input[type="password"]', 'MockTest2025!')
    await page.getByRole('button', { name: 'دخول', exact: true }).click()
    try { await page.waitForURL(/\/student/, { timeout: 20000 }); loggedIn = true }
    catch { console.log(`  login retry ${i + 1}`); await page.waitForTimeout(8000) }
  }
  if (!loggedIn) throw new Error('login failed after retries')

  const openGrammar = async () => {
    await page.goto(`${BASE}/student/curriculum/unit/${UNIT}?activity=grammar`, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(2500)
    return page.locator('[data-grammar-exercise-card]')
  }

  const answerCards = async (cards, from, to) => {
    for (let q = from; q < to; q++) {
      const card = cards.nth(q)
      await card.scrollIntoViewIfNeeded().catch(() => {})
      const btn = card.locator('button:not([disabled])').first()
      const input = card.locator('input[type="text"], input:not([type]), textarea').first()
      const chips = card.locator('button.grammar-chip:not(.grammar-chip--selected)')
      if (await input.count()) {
        // transform / fill_blank: type, then press «تحقق»
        await input.fill('x').catch(() => {})
        const verify = card.getByRole('button', { name: /تحقق/ }).first()
        if (await verify.count()) await verify.click({ timeout: 4000 }).catch(() => {})
        else await input.press('Enter').catch(() => {})
      } else if (await chips.count()) {
        // reorder: every word chip must be placed before «تحقق» becomes active
        let guard = 0
        while ((await chips.count()) > 0 && guard++ < 20) {
          await chips.first().click({ timeout: 3000 }).catch(() => {})
          await page.waitForTimeout(120)
        }
        const verify = card.getByRole('button', { name: /تحقق/ }).first()
        if (await verify.count()) await verify.click({ timeout: 4000 }).catch(() => {})
      } else if (await btn.count()) {
        await btn.click({ timeout: 4000 }).catch(() => {})
      }
      await page.waitForTimeout(900)
      // did this card actually register an answer? (verdict panel appears once answered)
      const done = await card.locator('.qx-scope, [class*="verdict"], .grammar-explanation-bar').count()
      if (!done) console.log(`    · card ${q} did NOT register an answer`)
    }
  }

  // ── 1 · ONLINE: answer everything, then submit ───────────────────────────
  console.log('\n── online submit ──')
  let cards = await openGrammar()
  const total = await cards.count()
  await answerCards(cards, 0, total)
  await page.waitForTimeout(1500)

  const submitBtn = page.getByRole('button', { name: /تسليم الإجابات/ }).first()
  if (await submitBtn.count()) {
    await submitBtn.scrollIntoViewIfNeeded().catch(() => {})
    await submitBtn.click().catch(() => {})
  }
  await page.waitForTimeout(3500)

  let r = await rows()
  const done = r.find(x => x.status === 'completed')
  check('exactly one row after answering all + submitting', r.length === 1, `rows=${r.length}`)
  check('attempt completed with a score', !!done && done.score != null, `status=${r[0]?.status} score=${r[0]?.score}`)
  check('is_best set on the completed attempt', !!done?.is_best, `is_best=${done?.is_best}`)
  check('all answers stored', countAns(r[0]) === total, `${countAns(r[0])}/${total}`)

  // ── 2 · OFFLINE: the network dies mid-attempt ────────────────────────────
  console.log('\n── offline durability ──')
  await clean()
  cards = await openGrammar()

  // kill every save call — the request never reaches the server
  await page.route('**/rest/v1/rpc/save_activity_attempt', route => route.abort('internetdisconnected'))

  await answerCards(cards, 0, 3)
  await page.waitForTimeout(2000)

  const offlineRows = await rows()
  check('nothing reached the server while offline', offlineRows.length === 0, `rows=${offlineRows.length}`)

  const pillText = await page.locator('[role="status"]').first().innerText().catch(() => '')
  check('student is TOLD it is not on the server yet',
        pillText.includes('محفوظ على جهازك') || pillText.includes('لم يُحفظ'),
        JSON.stringify(pillText.slice(0, 60)))

  const queued = await page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open('fluentia-save-outbox', 1)
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error)
    })
    return await new Promise(res => {
      const tx = db.transaction('pending', 'readonly')
      const q = tx.objectStore('pending').getAll()
      q.onsuccess = () => res(q.result.length)
      q.onerror = () => res(-1)
    })
  }).catch(() => -1)
  check('work is queued on the device', queued > 0, `entries=${queued}`)

  // ── 3 · network returns; the app must hand the work over by itself ───────
  console.log('\n── replay ──')
  await page.unroute('**/rest/v1/rpc/save_activity_attempt')
  await page.reload({ waitUntil: 'domcontentloaded' })      // boot → installSaveRecovery
  await page.waitForTimeout(6000)

  const replayed = await rows()
  check('queued work replayed to the server', replayed.length === 1, `rows=${replayed.length}`)
  check('the answers survived the outage', countAns(replayed[0]) >= 3, `answers=${countAns(replayed[0])}`)

  await page.screenshot({ path: `${OUT}/smoke-offline.png` })
  await browser.close()
  await clean()

  const passed = results.filter(x => x.ok).length
  console.log(`\n${passed}/${results.length} passed`)
  process.exit(passed === results.length ? 0 : 1)
})().catch(async e => { console.error(e); await clean(); process.exit(1) })
