// DM smoke test: ChatHome list, ContactPicker, and a real DM send between the
// two mock accounts (no real student is messaged).
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:4173'
const PID = 'a82486b6-9472-4aba-b902-a0ec354ca170'
const THREAD = fs.readFileSync('/tmp/dm_thread_id.txt', 'utf8').trim()
const D = 'docs/audits/chat-redesign/'
const out = { thread: THREAD }

const b = await chromium.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: 1024, height: 768 } })
await ctx.addInitScript((pid) => { try { localStorage.setItem('fluentia_onboarded_' + pid, 'true'); localStorage.setItem('pwa_install_dismissed_at', Date.now().toString()) } catch {} }, PID)
const page = await ctx.newPage()
const errors = []
const bad = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 160)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 140)) })
page.on('response', async (r) => {
  if (r.status() >= 400 && r.url().includes('/rest/v1/')) {
    try { bad.push(r.status() + ' ' + r.url().split('/rest/v1/')[1].slice(0, 50) + ' :: ' + (await r.text()).slice(0, 180)) } catch {}
  }
})

await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="email"]')
await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
await page.fill('input[type="password"]', 'MockTest2025!')
await page.click('button[type="submit"]')
await page.waitForTimeout(5000)

// 1) ChatHome
errors.length = 0
await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
out.chatHome = {
  title: await page.getByText('المحادثات', { exact: true }).first().isVisible().catch(() => false),
  groupsSection: await page.getByText('المجموعات', { exact: true }).first().isVisible().catch(() => false),
  dmSection: await page.getByText('الرسائل الخاصة', { exact: true }).first().isVisible().catch(() => false),
  newBtn: await page.locator('button[aria-label="رسالة جديدة"]').first().isVisible().catch(() => false),
  errors: [...errors],
}
await page.screenshot({ path: D + 'dm-home.png' }).catch(() => {})

// 2) ContactPicker
errors.length = 0
await page.locator('button[aria-label="رسالة جديدة"]').first().click().catch(() => {})
await page.waitForTimeout(2500)
out.contactPicker = {
  heading: await page.getByText('رسالة جديدة', { exact: true }).first().isVisible().catch(() => false),
  staffSection: await page.getByText('المدربون والإدارة', { exact: true }).first().isVisible().catch(() => false),
  peersSection: await page.getByText('زملاء نفس المستوى', { exact: true }).first().isVisible().catch(() => false),
  errors: [...errors],
}
await page.screenshot({ path: D + 'dm-contacts.png' }).catch(() => {})
await page.keyboard.press('Escape'); await page.waitForTimeout(400)

// 3) DM thread — open + send
errors.length = 0
await page.goto(BASE + '/chat/dm/' + THREAD, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
const ta = page.locator('.chat-shell textarea')
out.dmPage = {
  composerVisible: await ta.isVisible().catch(() => false),
  headerName: await page.locator('.chat-shell').getByText(/تجريبي|b1|B1|طالب|محادثة/).first().isVisible().catch(() => false),
  errors: [...errors],
}
const msg = 'اختبار الرسائل الخاصة ✨ ' + Date.now()
try {
  await ta.click(); await ta.fill(msg)
  await page.locator('button[aria-label="إرسال"]').first().click()
  await page.waitForTimeout(3500)
} catch (e) { out.sendErr = e.message.slice(0, 100) }
out.sent = {
  appears: await page.getByText(msg).first().isVisible().catch(() => false),
  errors: [...errors],
}
await page.screenshot({ path: D + 'dm-thread.png' }).catch(() => {})

out.badResponses = [...new Set(bad)]
console.log(JSON.stringify(out, null, 2))
await b.close()
