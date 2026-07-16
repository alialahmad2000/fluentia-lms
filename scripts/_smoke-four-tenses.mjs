// B5 UI smoke as ظافر on PROD: nav item visible → learn renders → per-question checks work
// (expanded contraction, WH ?, 's variant, wrong answer preserved). Does NOT submit the real task.
// Temporarily clears must_change_password (modal would block), restores it after.
import { webkit } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '/Users/dr.ali/projects/fluentia-lms/.env' })

const URL_ = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const ID = 'f1ebe336-fe3f-428f-957e-051458c516f5'
const OUT = '/private/tmp/claude-501/-Users-dr-ali/01e1f9dc-b087-4844-a651-c08fa6fac786/scratchpad'
const svc = createClient(URL_, SVC, { auth: { persistSession: false } })

async function safeGoto(page, url) {
  try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }) } catch { /* webkit interruption */ }
  await page.waitForLoadState('networkidle').catch(() => {})
}

const results = []
const check = (name, ok) => { results.push([name, ok]); console.log(`${ok ? '✅' : '❌'} ${name}`) }

;(async () => {
  const { error: e1 } = await svc.from('profiles').update({ must_change_password: false }).eq('id', ID).select('id')
  if (e1) throw e1
  console.log('must_change_password temporarily cleared')

  const browser = await webkit.launch()
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar' })
    const page = await ctx.newPage()
    await page.addInitScript(({ id }) => {
      localStorage.setItem(`fluentia_onboarded_${id}`, 'true')
      localStorage.setItem('pwa_install_dismissed_at', String(Date.now()))
    }, { id: ID })

    await safeGoto(page, 'https://app.fluentia.academy/login')
    await page.fill('input[type="email"]', 'al-quhidan@hotmail.com')
    await page.fill('input[type="password"]', 'Fluentia2025!')
    await page.getByRole('button', { name: 'دخول', exact: true }).click()
    await page.waitForURL(/\/student/, { timeout: 25000 })
    console.log('logged in as ظافر')
    await page.waitForTimeout(2500)

    // 1. nav item visible (count-gated)
    const navItem = page.getByText('تمارين مخصّصة').first()
    check('nav «تمارين مخصّصة» visible', await navItem.isVisible().catch(() => false))

    // 2. exercises list shows the task
    await safeGoto(page, 'https://app.fluentia.academy/student/exercises')
    await page.waitForTimeout(2000)
    check('task card in list', await page.getByText('الأزمنة الأربعة — تحويل الجُمل').first().isVisible().catch(() => false))
    await page.screenshot({ path: `${OUT}/ft-list.png` })

    // 3. open → learn stage renders
    await page.getByText('الأزمنة الأربعة — تحويل الجُمل').first().click()
    await page.waitForTimeout(1500)
    check('learn: الصيغ الأربع', await page.getByText('الصيغ الأربع').first().isVisible().catch(() => false))
    check('learn: worked example', await page.getByText('مثال محلول (Worked Example)').first().isVisible().catch(() => false))
    check('learn: formation table', await page.locator('table').first().isVisible().catch(() => false))
    await page.screenshot({ path: `${OUT}/ft-learn.png` })

    // 4. start test
    await page.getByRole('button', { name: /ابدأ الاختبار/ }).click()
    await page.waitForTimeout(1200)
    check('test: 36 inputs', (await page.locator('input[dir="ltr"]').count()) === 36)
    check('test: seed context q1', await page.getByText('She teaches English at a university.').first().isVisible().catch(() => false))
    await page.screenshot({ path: `${OUT}/ft-test.png` })

    const inputs = page.locator('input[dir="ltr"]')
    // check button scoped to the SAME row as the input (buttons unmount after checking)
    const rowCheck = (i) => inputs.nth(i).locator('xpath=..').locator('button:has-text("تحقق")')

    // 5. q1 — expanded "does not" variant (accepted list also has contracted)
    await inputs.nth(0).fill('She does not teach English at a university.')
    await rowCheck(0).click(); await page.waitForTimeout(400)
    check('q1 expanded-negative accepted', await page.getByText('إجابة صحيحة ✓').first().isVisible().catch(() => false))

    // 6. q2 — Yes/No question with ?
    await inputs.nth(1).fill('Does she teach English at a university?')
    await rowCheck(1).click(); await page.waitForTimeout(400)
    check('q2 yes/no accepted', (await page.getByText('إجابة صحيحة ✓').count()) >= 2)

    // 7. q3 — WH WITHOUT question mark (punctuation tolerance)
    await inputs.nth(2).fill('Where does she teach English')
    await rowCheck(2).click(); await page.waitForTimeout(400)
    check('q3 WH without ? accepted', (await page.getByText('إجابة صحيحة ✓').count()) >= 3)

    // 8. q13 — Present Continuous 's contraction (item 5 affirmative)
    await inputs.nth(12).fill("She's cooking dinner right now.")
    await rowCheck(12).click(); await page.waitForTimeout(400)
    check("q13 's variant accepted", (await page.getByText('إجابة صحيحة ✓').count()) >= 4)

    // 9. q4 — WRONG answer (kept the question form): shows correct answer, input preserved
    await inputs.nth(3).fill('Do they travel to Jeddah every summer?')
    await rowCheck(3).click(); await page.waitForTimeout(400)
    const correctBlock = await page.getByText('الإجابة الصحيحة:').first().isVisible().catch(() => false)
    const preserved = (await inputs.nth(3).inputValue()) === 'Do they travel to Jeddah every summer?'
    check('q4 wrong → correct shown separately', correctBlock)
    check('q4 wrong → student answer preserved', preserved)
    await page.screenshot({ path: `${OUT}/ft-checked.png` })

    // 10. submit still gated (not all checked)
    check('submit gated until all checked', await page.getByText(/تحقق من جميع الأسئلة أولًا/).first().isVisible().catch(() => false))
  } finally {
    await browser.close()
    const { error: e2 } = await svc.from('profiles').update({ must_change_password: true }).eq('id', ID).select('id')
    console.log('must_change_password restored:', e2 ? e2.message : '✅')
    // his real task must still be pristine
    const { data: t } = await svc.from('targeted_exercises').select('status, student_answers').eq('student_id', ID).eq('skill', 'grammar')
    console.log('real task still pristine:', t?.[0]?.status === 'pending' && t?.[0]?.student_answers == null ? '✅ pending/no answers' : JSON.stringify(t))
  }
  const failed = results.filter(([, ok]) => !ok)
  console.log(`\n${results.length - failed.length}/${results.length} UI checks passed`)
  if (failed.length) process.exit(1)
})().catch((e) => { console.error('💥', e.message); process.exit(1) })
