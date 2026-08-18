// End-to-end proof that a student's answer reaches the database through the new
// single write path — driven in a real browser against a production build.
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
const errors = []
const rpcCalls = []

const clean = () => svc.from('student_curriculum_progress').delete()
  .eq('student_id', STUDENT).eq('grammar_id', GRAMMAR)

;(async () => {
  await clean()

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 414, height: 896 }, locale: 'ar' })
  const page = await ctx.newPage()

  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 220)) })
  page.on('response', async r => {
    if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.request().method()} ${r.url().replace(/https?:\/\/[^/]+/, '').slice(0, 150)}`)
  })
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 220)))
  page.on('request', r => {
    if (r.url().includes('/rest/v1/rpc/save_activity_attempt')) {
      rpcCalls.push({ method: r.method(), body: r.postData()?.slice(0, 120) })
    }
    // Anything still writing to the table directly is a save path I missed.
    if (r.url().includes('/rest/v1/student_curriculum_progress') && r.method() !== 'GET' && r.method() !== 'HEAD') {
      errors.push(`DIRECT TABLE WRITE: ${r.method()} ${r.url().slice(0, 100)}`)
    }
  })

  await page.addInitScript(({ id }) => {
    localStorage.setItem(`fluentia_onboarded_${id}`, 'true')
    localStorage.setItem('pwa_install_dismissed_at', String(Date.now()))
    localStorage.setItem('fluentia_force_refresh_applied', '9999999999')
  }, { id: STUDENT })

  // login
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
  await page.fill('input[type="password"]', 'MockTest2025!')
  await page.getByRole('button', { name: 'دخول', exact: true }).click()
  await page.waitForURL(/\/student/, { timeout: 30000 })
  console.log('· logged in')

  // straight into the grammar section
  await page.goto(`${BASE}/student/curriculum/unit/${UNIT}?activity=grammar`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(2500)

  const cards = page.locator('[data-grammar-exercise-card]')
  const cardCount = await cards.count()
  console.log(`· grammar cards on page: ${cardCount}`)
  if (cardCount === 0) {
    console.log('· PAGE TEXT:', (await page.locator('body').innerText()).slice(0, 400))
  }

  let answered = 0
  for (let q = 0; q < Math.min(3, cardCount); q++) {
    const card = cards.nth(q)
    await card.scrollIntoViewIfNeeded().catch(() => {})
    const btn = card.locator('button:not([disabled])').first()
    const input = card.locator('input[type="text"], input:not([type])').first()
    if (await btn.count()) {
      await btn.click({ timeout: 5000 }).catch(e => console.log('  click failed', e.message))
      answered++
    } else if (await input.count()) {
      await input.fill('test').catch(() => {})
      await input.press('Enter').catch(() => {})
      answered++
    }
    await page.waitForTimeout(1500)   // 700ms debounce + RPC round-trip
  }
  console.log(`· clicked ${answered} answers`)
  await page.waitForTimeout(2500)

  await page.screenshot({ path: `${OUT}/smoke-grammar-save.png`, fullPage: false })
  // capture the pill while it is actively saving
  const card4 = cards.nth(3)
  await card4.scrollIntoViewIfNeeded().catch(() => {})
  const b4 = card4.locator('button:not([disabled])').first()
  if (await b4.count()) { await b4.click().catch(() => {}) }
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${OUT}/smoke-saving-pill.png` })
  await page.waitForTimeout(1600)
  await page.screenshot({ path: `${OUT}/smoke-saved-pill.png` })

  // what actually landed
  const { data: rows } = await svc.from('student_curriculum_progress')
    .select('id,status,attempt_number,is_latest,is_best,answers,updated_at')
    .eq('student_id', STUDENT).eq('grammar_id', GRAMMAR)

  const stored = rows?.[0]
  const nAns = stored?.answers?.exercises?.filter(e => e.studentAnswer != null).length ?? 0

  console.log('\n─────── RESULT ───────')
  console.log('rpc calls        :', rpcCalls.length)
  console.log('rows created     :', rows?.length ?? 0)
  console.log('status           :', stored?.status)
  console.log('answers stored   :', nAns)
  console.log('updated_at moved :', stored ? (stored.updated_at !== null) : false)
  console.log('console errors   :', errors.length)
  errors.slice(0, 6).forEach(e => console.log('   !', e))

  const pass = rpcCalls.length > 0 && rows?.length === 1 && nAns >= 1 &&
               !errors.some(e => e.startsWith('DIRECT TABLE WRITE'))
  console.log('\n', pass ? 'PASS — answers reach the DB through save_activity_attempt only'
                         : 'FAIL')

  await browser.close()
  await clean()
  process.exit(pass ? 0 : 1)
})().catch(async e => { console.error(e); await clean(); process.exit(1) })
