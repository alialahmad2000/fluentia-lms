// Verify: sidebar unread badge, tightened contacts, DM read-receipt (✓✓).
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:4173'
const PID = 'a82486b6-9472-4aba-b902-a0ec354ca170'
const THREAD = fs.readFileSync('/tmp/dm_thread_id.txt', 'utf8').trim()
const out = { thread: THREAD }

const b = await chromium.launch({ headless: true })
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addInitScript((pid) => { try { localStorage.setItem('fluentia_onboarded_' + pid, 'true'); localStorage.setItem('pwa_install_dismissed_at', Date.now().toString()) } catch {} }, PID)
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('400') && !m.text().includes('interactive-widget')) errors.push(m.text().slice(0, 120)) })

await page.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
await page.waitForSelector('input[type="email"]')
await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
await page.fill('input[type="password"]', 'MockTest2025!')
await page.click('button[type="submit"]')
await page.waitForTimeout(5500)

// 1) Sidebar badge on the chat nav item
await page.goto(BASE + '/student', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
out.sidebarBadge = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href="/chat"]')]
  for (const a of links) {
    const r = a.getBoundingClientRect()
    if (r.width < 1) continue // hidden (mobile)
    const txt = a.textContent || ''
    const badge = a.querySelector('span[style*="ds-accent-danger"], span[aria-label*="غير مقروءة"]')
    return { found: true, text: txt.replace(/\s+/g, ' ').trim().slice(0, 40), badge: badge ? badge.textContent.trim() : null }
  }
  return { found: false }
})

// 2) Contact picker — staff list (tightened)
await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
await page.locator('button[aria-label="رسالة جديدة"]').first().click().catch(() => {})
await page.waitForTimeout(2500)
out.contacts = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('[style*="z-index: 79"] button, .fixed button')]
  // staff = rows showing مدرب/الإدارة
  const all = [...document.querySelectorAll('button')].map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean)
  const staff = all.filter((t) => /مدرب|الإدارة/.test(t))
  const peers = all.filter((t) => /زميل · المستوى/.test(t))
  return { staffCount: staff.length, staffSample: staff.slice(0, 4), peerCount: peers.length }
})
await page.keyboard.press('Escape'); await page.waitForTimeout(400)

// 3) DM read receipt — a1's own message should show ✓✓ (read by b1)
await page.goto(BASE + '/chat/dm/' + THREAD, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5000)
out.dmReceipt = {
  myMsgVisible: await page.getByText('مرحبا كيف حالك').first().isVisible().catch(() => false),
  theirMsgVisible: await page.getByText('أهلا بك تمام').first().isVisible().catch(() => false),
  readDoubleCheck: await page.locator('[aria-label="تمت القراءة"]').first().isVisible().catch(() => false),
}
await page.screenshot({ path: 'docs/audits/chat-redesign/dm-receipts.png' }).catch(() => {})

out.errors = errors.slice(0, 6)
console.log(JSON.stringify(out, null, 2))
await b.close()
