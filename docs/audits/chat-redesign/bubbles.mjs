// Visual check of the redesigned bubbles WITHOUT touching the DB — intercepts
// the get_group_messages RPC and profiles fetch with realistic fake messages.
import { chromium, webkit } from 'playwright'

const BASE = 'http://localhost:4173'
const PID = 'a82486b6-9472-4aba-b902-a0ec354ca170'
const SARA = '11111111-1111-1111-1111-111111111111'
const NOURA = '22222222-2222-2222-2222-222222222222'
const D = 'docs/audits/chat-redesign/'
const t = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString()

// oldest → newest
const seq = [
  { id: 'm1', sender_id: SARA,  body: 'السلام عليكم 👋', created_at: t(40) },
  { id: 'm2', sender_id: SARA,  body: 'كيف كان واجب القراءة هذا الأسبوع؟', created_at: t(39) },
  { id: 'm3', sender_id: PID,   body: 'وعليكم السلام 🌟 خلّصته أمس، كان ممتعاً', created_at: t(34) },
  { id: 'm4', sender_id: NOURA, body: 'أنا لسّا ما خلّصت الجزء الأخير، صعب شوي', created_at: t(20) },
  { id: 'm5', sender_id: PID,   body: 'أبشري، الفقرة الثالثة أسهل مما تبدو — ركّزي على الكلمات الذهبية', created_at: t(18),
    reply_message: { sender: { display_name: 'نورة' }, body: 'أنا لسّا ما خلّصت الجزء الأخير، صعب شوي' } },
  { id: 'm6', sender_id: SARA,  body: 'تمام نراجعها بالحصة القادمة ✨', created_at: t(6) },
]
const rows = seq.map((m) => ({
  group_id: 'g', channel_id: 'c', type: 'text', content: m.body,
  deleted_at: null, is_pinned: false, is_edited: false, ...m,
})).reverse() // RPC returns DESC

const profiles = [
  { id: SARA,  display_name: 'سارة الحربي', full_name: 'سارة الحربي', avatar_url: null, role: 'student' },
  { id: NOURA, display_name: 'نورة القحطاني', full_name: 'نورة القحطاني', avatar_url: null, role: 'student' },
  { id: PID,   display_name: 'أنت', full_name: 'أنت', avatar_url: null, role: 'student' },
]
const counts = [{ cnt_all: 6, cnt_important: 1, cnt_voice: 0, cnt_files: 0, cnt_mentions: 0, cnt_questions: 1 }]

async function setupRoutes(page) {
  await page.route('**/rest/v1/rpc/get_group_messages', async (route) => {
    let before = null
    try { before = JSON.parse(route.request().postData() || '{}').p_before } catch {}
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(before ? [] : rows) })
  })
  await page.route('**/rest/v1/rpc/get_group_lens_counts', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(counts) }))
  await page.route('**/rest/v1/profiles**', (route) => {
    const url = route.request().url()
    if (route.request().method() === 'GET' && url.includes('id=in')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(profiles) })
    }
    return route.continue()
  })
}

// login (chromium) → reuse storage
const chrome = await chromium.launch({ headless: true })
const lctx = await chrome.newContext()
await lctx.addInitScript((pid) => { try { localStorage.setItem('fluentia_onboarded_' + pid, 'true'); localStorage.setItem('pwa_install_dismissed_at', Date.now().toString()) } catch {} }, PID)
const lp = await lctx.newPage()
await lp.goto(BASE + '/login', { waitUntil: 'domcontentloaded' })
await lp.waitForSelector('input[type="email"]')
await lp.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
await lp.fill('input[type="password"]', 'MockTest2025!')
await lp.click('button[type="submit"]')
await lp.waitForTimeout(5000)
const storageState = await lctx.storageState()
await lctx.close()

for (const vp of [
  { name: 'bubbles-laptop', w: 1440, h: 900, engine: 'chromium' },
  { name: 'bubbles-iphone', w: 390, h: 844, engine: 'webkit' },
]) {
  const browser = vp.engine === 'webkit' ? await webkit.launch({ headless: true }) : chrome
  const ctx = await browser.newContext({ storageState, viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  await setupRoutes(page)
  await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(6000)
  await page.screenshot({ path: `${D}${vp.name}.png`, fullPage: false })
  const bubbleCount = await page.evaluate(() => document.querySelectorAll('[id^="msg-"]').length)
  console.log(vp.name, 'bubbles rendered:', bubbleCount)
  await ctx.close()
  if (vp.engine === 'webkit') await browser.close()
}
await chrome.close()
