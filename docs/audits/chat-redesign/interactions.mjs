// Smoke-test the new interactions (double-tap react, right-click action sheet,
// @mention picker) with mocked messages. Verifies they render without crashing.
import { chromium } from 'playwright'

const BASE = 'http://localhost:4173'
const PID = 'a82486b6-9472-4aba-b902-a0ec354ca170'
const SARA = '11111111-1111-1111-1111-111111111111'
const t = (m) => new Date(Date.now() - m * 60000).toISOString()
const rows = [
  { id: 'm6', sender_id: SARA, body: 'تمام نراجعها بالحصة ✨', created_at: t(6), type: 'text', content: 'x', deleted_at: null, is_pinned: false, is_edited: false },
  { id: 'm3', sender_id: PID, body: 'خلّصته أمس 🌟', created_at: t(34), type: 'text', content: 'x', deleted_at: null, is_pinned: false, is_edited: false },
  { id: 'm1', sender_id: SARA, body: 'السلام عليكم 👋', created_at: t(40), type: 'text', content: 'x', deleted_at: null, is_pinned: false, is_edited: false },
]
const profiles = [{ id: SARA, display_name: 'سارة الحربي', full_name: 'سارة الحربي', first_name_ar: 'سارة', last_name_ar: 'الحربي', avatar_url: null, role: 'student' }]

const b = await chromium.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } })
await ctx.addInitScript((pid) => { try { localStorage.setItem('fluentia_onboarded_' + pid, 'true'); localStorage.setItem('pwa_install_dismissed_at', Date.now().toString()) } catch {} }, PID)
const page = await ctx.newPage()
const errors = []
const bad = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 160)) })
page.on('response', (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url().slice(0, 90)) })

// routes
await page.route('**/rest/v1/rpc/get_group_messages', (r) => {
  let before = null; try { before = JSON.parse(r.request().postData() || '{}').p_before } catch {}
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(before ? [] : rows) })
})
await page.route('**/rest/v1/rpc/get_group_lens_counts', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '[{"cnt_all":3}]' }))
await page.route('**/rest/v1/profiles**', (r) => (r.request().method() === 'GET' && r.request().url().includes('id=in'))
  ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profiles) }) : r.continue())
await page.route('**/rest/v1/message_reactions**', (r) => r.request().method() === 'POST'
  ? r.fulfill({ status: 201, contentType: 'application/json', body: '[]' }) : r.continue())

const out = {}
// login
await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="email"]')
await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
await page.fill('input[type="password"]', 'MockTest2025!')
await page.click('button[type="submit"]')
await page.waitForTimeout(5000)
await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(6000)
await page.waitForSelector('[id^="msg-"]', { timeout: 8000 }).catch(() => {})

// target the ACTUAL bubble text (m6 floats right; click it, not empty row space)
const target = page.getByText('تمام نراجعها بالحصة ✨').first()

// 1) double-tap react (should not crash; burst fires)
errors.length = 0
try { await target.dblclick(); await page.waitForTimeout(900) } catch (e) { out.dblclickErr = e.message.slice(0, 100) }
out.doubleTap = { errors: [...errors] }

// 2) LONG-PRESS (primary mobile path) → action sheet
errors.length = 0
try {
  const box = await target.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(520)            // exceed 380ms long-press threshold
  await page.mouse.up()
  await page.waitForTimeout(500)
} catch (e) { out.lpErr = e.message.slice(0, 100) }
out.actionSheet = {
  replyVisible: await page.getByText('رد', { exact: true }).first().isVisible().catch(() => false),
  copyVisible: await page.getByText('نسخ', { exact: true }).first().isVisible().catch(() => false),
  errors: [...errors],
}
await page.screenshot({ path: 'docs/audits/chat-redesign/action-sheet.png' }).catch(() => {})
await page.keyboard.press('Escape'); await page.waitForTimeout(300)

// 3) @mention picker
errors.length = 0
try {
  const ta = page.locator('.chat-shell textarea')
  await ta.click(); await ta.type('@', { delay: 50 }); await page.waitForTimeout(2500)
} catch (e) { out.mentionErr = e.message.slice(0, 100) }
out.mentionPicker = {
  listboxVisible: await page.locator('[role="listbox"]').first().isVisible().catch(() => false),
  memberVisible: await page.getByText('سارة الحربي').first().isVisible().catch(() => false),
  errors: [...errors],
}
await page.screenshot({ path: 'docs/audits/chat-redesign/interactions.png' }).catch(() => {})

out.badResponses = [...new Set(bad)].slice(0, 8)
console.log(JSON.stringify(out, null, 2))
await b.close()
