// Responsive / overlap verification of the redesigned المحادثة chat.
// Logs in as the mock student, opens /chat at phone / iPad / laptop sizes,
// measures geometry, screenshots, and asserts no overlap with header /
// sidebar / mobile-nav and no horizontal overflow.
import { chromium, webkit } from 'playwright'

const BASE = 'http://localhost:4173'
const PID = 'a82486b6-9472-4aba-b902-a0ec354ca170'
const D = 'docs/audits/chat-redesign/'

const VIEWPORTS = [
  { name: 'iphone',  w: 390,  h: 844,  engine: 'webkit' },
  { name: 'ipad-portrait',  w: 768,  h: 1024, engine: 'chromium' },
  { name: 'ipad-landscape', w: 1024, h: 768,  engine: 'chromium' },
  { name: 'laptop',  w: 1440, h: 900,  engine: 'chromium' },
]

const out = { base: BASE, results: {} }

// ── login once with chromium, reuse storage state ──
const chrome = await chromium.launch({ headless: true })
const loginCtx = await chrome.newContext()
await loginCtx.addInitScript((pid) => {
  try {
    localStorage.setItem('fluentia_onboarded_' + pid, 'true')
    localStorage.setItem('pwa_install_dismissed_at', Date.now().toString())
  } catch {}
}, PID)
const lp = await loginCtx.newPage()
await lp.goto(BASE + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 })
await lp.waitForSelector('input[type="email"]', { timeout: 20000 })
await lp.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
await lp.fill('input[type="password"]', 'MockTest2025!')
await lp.click('button[type="submit"]')
await lp.waitForTimeout(5000)
out.login = { url: lp.url(), ok: !lp.url().includes('/login') }
const storageState = await loginCtx.storageState()
await loginCtx.close()

const MEASURE = () => {
  const vw = window.innerWidth, vh = window.innerHeight
  const box = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) } }
  const shell = box('.chat-shell')
  const appHeader = box('[data-app-header]')
  const sidebar = box('[data-sidebar-root]')
  const mobileNav = box('[data-role="mobile-bottom-nav"]')
  const textarea = box('.chat-shell textarea')
  let composerRow = null
  const ta = document.querySelector('.chat-shell textarea')
  if (ta) { let el = ta; while (el && !(el.classList && el.classList.contains('chat-row'))) el = el.parentElement; if (el) { const r = el.getBoundingClientRect(); composerRow = { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), h: +r.height.toFixed(1) } } }
  let composerHit = null
  if (textarea) { const cx = textarea.left + textarea.w / 2, cy = textarea.top + textarea.h / 2; const el = document.elementFromPoint(cx, cy); composerHit = el ? (el.tagName + '|' + String(el.className).slice(0, 30)) : 'none' }
  // hit-test composer buttons (must be topmost, i.e. inside .chat-shell, not a FAB)
  const inShell = (x, y) => { const el = document.elementFromPoint(x, y); return el ? !!el.closest('.chat-shell') : false }
  let sendInShell = null, attachInShell = null
  if (ta) { let row = ta; while (row && !(row.classList && row.classList.contains('chat-row'))) row = row.parentElement
    if (row) { const btns = [...row.querySelectorAll('button')]; const last = btns[btns.length - 1], first = btns[0]
      if (last) { const r = last.getBoundingClientRect(); sendInShell = inShell(r.left + r.width / 2, r.top + r.height / 2) }
      if (first) { const r = first.getBoundingClientRect(); attachInShell = inShell(r.left + r.width / 2, r.top + r.height / 2) } } }
  const f998 = document.querySelector('.z-\\[998\\]'), f997 = document.querySelector('.z-\\[997\\]')
  const fabsHidden = (!f998 || getComputedStyle(f998).display === 'none') && (!f997 || getComputedStyle(f997).display === 'none')
  const sidebarActive = !!sidebar && sidebar.w > 1 && sidebar.h > 1
  const navActive = !!mobileNav && mobileNav.h > 1
  return {
    vw, vh, aurora: !!document.querySelector('.chat-aurora'),
    shell, appHeader, sidebar, mobileNav, textarea, composerRow, composerHit,
    sendInShell, attachInShell, fabsHidden,
    sidebarActive, navActive,
    noHorizontalOverflow: document.documentElement.scrollWidth <= vw + 1,
    scrollWidth: document.documentElement.scrollWidth,
  }
}

for (const vp of VIEWPORTS) {
  const engine = vp.engine === 'webkit' ? webkit : chromium
  const browser = vp.engine === 'webkit' ? await webkit.launch({ headless: true }) : chrome
  const ctx = await browser.newContext({ storageState, viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message.slice(0, 140)))
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 140)) })
  const r = { viewport: `${vp.w}x${vp.h}`, engine: vp.engine }
  try {
    await page.goto(BASE + '/chat', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(6000) // redirect + load + realtime
    await page.waitForSelector('.chat-shell', { timeout: 8000 }).catch(() => {})
    const m = await page.evaluate(MEASURE)
    r.m = m
    // assertions
    const checks = {}
    checks.shellPresent = !!m.shell
    checks.auroraPresent = m.aurora
    checks.shellBelowHeader = m.shell && m.appHeader ? m.shell.top >= m.appHeader.bottom - 1 : null
    checks.shellRightOfSidebar = m.sidebarActive && m.shell ? m.shell.right <= m.sidebar.left + 1 : 'n/a'
    checks.composerAboveNav = m.navActive && m.composerRow ? m.composerRow.bottom <= m.mobileNav.top + 1 : 'n/a'
    checks.composerInViewport = m.textarea ? (m.textarea.bottom <= m.vh + 1 && m.textarea.top >= 0) : null
    checks.composerNotCovered = m.composerHit ? /TEXTAREA/.test(m.composerHit) : null
    checks.fabsHidden = m.fabsHidden
    checks.sendBtnHittable = m.sendInShell
    checks.attachBtnHittable = m.attachInShell
    checks.noHorizontalOverflow = m.noHorizontalOverflow
    r.checks = checks
    r.errors = errors.slice(0, 8)
    await page.screenshot({ path: `${D}${vp.name}.png`, fullPage: false }).catch(() => {})
  } catch (e) { r.error = e.message.slice(0, 160); r.errors = errors.slice(0, 8) }
  out.results[vp.name] = r
  await ctx.close()
  if (vp.engine === 'webkit') await browser.close()
}

await chrome.close()
console.log(JSON.stringify(out, null, 2))
