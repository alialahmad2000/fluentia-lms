// THE perf-pass gate. Every scenario encodes a protected behavior from the
// activity save/submit contract or a historical regression. If any of these
// go red after an optimization, that optimization gets reverted — no debate.
//
// Reading quiz contract under test (ReadingTab.jsx):
//   - answering writes status='in_progress' (INSERT-per-attempt), no score
//   - leaving + returning restores answers, still not submitted
//   - the submit CTA with unanswered questions does NOT submit (guides instead)
//   - explicit submit (تسليم الإجابات → confirm تسليم) is the ONLY completion path
import { test, expect } from '@playwright/test'
import { STUDENT, suppressModals, login, collectFatalErrors } from '../smoke/helpers.mjs'

test.describe.configure({ mode: 'serial' })

let page
let fatalErrors
let unitUrl // discovered once from the curriculum CTA, e.g. /student/curriculum/unit/<id>

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext()
  page = await context.newPage()
  await suppressModals(page)
  fatalErrors = collectFatalErrors(page)
})

test.afterAll(async () => {
  await page?.context()?.close()
})

// Direct goto on `?activity=…` gets interrupted in WebKit (the unit page
// normalizes the URL while loading). Load the unit cleanly, then switch
// activity via an SPA history update — exactly what in-app navigation does.
async function gotoActivity(activity) {
  await page.goto(unitUrl)
  await expect(page.locator('main, h1, h2').first()).toBeVisible({ timeout: 45_000 })
  await page.waitForTimeout(800) // let any mount-time URL normalization settle
  await page.evaluate((url) => {
    window.history.pushState({}, '', url)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }, `${unitUrl}?activity=${activity}`)
}

async function gotoReadingQuiz() {
  await gotoActivity('reading')
  // passage card is the "reading tab is alive" signal
  await expect(page.getByText('أسئلة الفهم')).toBeVisible({ timeout: 45_000 })
  // completed earlier run? start a fresh attempt so assertions are deterministic
  const retry = page.getByRole('button', { name: 'محاولة جديدة' })
  if (await retry.count()) {
    await retry.first().click()
    await expect(page.getByText('محاولة جديدة — أجب على الأسئلة من جديد')).toBeVisible()
  }
}

function questionBlocks() {
  return page.locator('[id^="read-q-"]')
}

// Answer question block `i` by clicking its first choice button.
async function answerQuestion(i) {
  const q = questionBlocks().nth(i)
  await q.scrollIntoViewIfNeeded()
  await q.locator('button[dir="ltr"]').first().click()
}

test('1. login lands on the student dashboard', async () => {
  await login(page, STUDENT)
  await expect(page).toHaveURL(/\/student/)
  await expect(page.locator('main, h1, h2').first()).toBeVisible()
})

test('2. curriculum renders unit access (0-units regression guard)', async () => {
  await page.goto('/student/curriculum')
  // the level page must offer a way into a unit — the continue CTA
  const cta = page.getByRole('button', { name: /ابدأ من حيث توقفت|متابعة/ })
  await expect(cta.first()).toBeVisible({ timeout: 45_000 })
  await cta.first().click()
  await page.waitForURL(/\/student\/curriculum\/unit\//, { timeout: 45_000 })
  unitUrl = new URL(page.url()).pathname
  expect(unitUrl).toMatch(/\/unit\/[0-9a-f-]+$/)
})

test('3. partial answers auto-save and restore — never auto-complete', async () => {
  await gotoReadingQuiz()
  const total = await questionBlocks().count()
  expect(total).toBeGreaterThan(1)

  await answerQuestion(0)
  // autosave fires on answer change; give the INSERT time to land (WebKit is slower)
  await expect(page.getByText(`1/${total} مُجاب عليها`)).toBeVisible()
  await page.waitForTimeout(4500)

  // leave, come back
  await page.goto('/student')
  await expect(page.locator('main, h1, h2').first()).toBeVisible()
  await gotoReadingQuiz()

  // restored: exactly 1 answered, NOT submitted, no score reveal
  await expect(page.getByText(`1/${total} مُجاب عليها`)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/صحيحة/)).toHaveCount(0)
  await expect(page.getByText('تأكيد التسليم')).toHaveCount(0)
})

test('4. submit guard — partial answers cannot submit', async () => {
  // continue from scenario 3's restored partial state
  const total = await questionBlocks().count()
  const guardBtn = page.getByRole('button', { name: /أجب على جميع الأسئلة قبل التسليم/ })
  await guardBtn.scrollIntoViewIfNeeded()
  await expect(guardBtn).toBeVisible()
  await guardBtn.click()
  // clicking must NOT open the submit confirmation nor reveal correctness
  await page.waitForTimeout(1500)
  await expect(page.getByText('تأكيد التسليم')).toHaveCount(0)
  await expect(page.getByText(/صحيحة/)).toHaveCount(0)
  // still partial
  await expect(page.getByText(`1/${total} مُجاب عليها`)).toBeVisible()
})

test('5. explicit submit is the only completion path', async () => {
  const total = await questionBlocks().count()
  for (let i = 1; i < total; i++) await answerQuestion(i)

  const submitBtn = page.getByRole('button', { name: /تسليم الإجابات/ })
  await submitBtn.scrollIntoViewIfNeeded()
  await expect(submitBtn).toBeVisible()
  await submitBtn.click()

  // confirmation dialog → final تسليم
  await expect(page.getByText('تأكيد التسليم')).toBeVisible()
  await page.getByRole('button', { name: 'تسليم', exact: true }).click()

  // completion state: correctness summary appears
  await expect(page.getByText(/صحيحة/).first()).toBeVisible({ timeout: 30_000 })
})

test('6. rapid navigation stays stable (no #310, no blank shell)', async () => {
  const routes = [
    '/student',
    '/student/curriculum',
    '/student/vocabulary',
    '/student/grades',
    '/student/curriculum',
    unitUrl,
    '/student/vocabulary',
    '/student',
  ]
  // SPA navigation (what students actually do) — full reloads race the app's
  // own redirects in WebKit and aren't the behavior under test here.
  await page.goto('/student').catch(() => {})
  await expect(page.locator('main, h1, h2').first()).toBeVisible({ timeout: 45_000 })
  for (const r of routes) {
    await page.evaluate((url) => {
      window.history.pushState({}, '', url)
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, r)
    await expect(page.locator('main, h1, h2').first()).toBeVisible({ timeout: 45_000 })
    await page.waitForTimeout(150)
  }
  // interactive at the end: root has content and no fatal console errors fired
  const rootChildren = await page.locator('#root > *').count()
  expect(rootChildren).toBeGreaterThan(0)
  expect(fatalErrors, `fatal console errors:\n${fatalErrors.join('\n')}`).toHaveLength(0)
})

test('7. listening page mounts its audio element with a src', async () => {
  await gotoActivity('listening')
  const audio = page.locator('audio')
  await expect(audio.first()).toBeAttached({ timeout: 45_000 })
  await expect
    .poll(async () => {
      return page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('audio'))
        return els.some((a) => (a.currentSrc || a.src || a.querySelector('source')?.src || '').length > 0)
      })
    }, { timeout: 30_000 })
    .toBe(true)
})
