// Headless capture of the individual-track surfaces for the design loop.
// Usage: node scripts/indiv/_capture.mjs [baseUrl]
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:4321'
const OUT = '.design-loop/indiv'
fs.mkdirSync(OUT, { recursive: true })

const EMAIL = 'indiv-demo-marketing@fluentia.academy'
const PASS = 'Fluentia2025!'
const UID = '84141e67-0dec-47c3-a295-3fec5adec1ab'

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.evaluate((uid) => {
    localStorage.setItem('pwa_install_dismissed_at', String(Date.now()))
    localStorage.setItem(`fluentia_onboarded_${uid}`, 'true')
    localStorage.setItem('fluentia:onboarded', 'true')
  }, UID)
  await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL)
  await page.locator('input[type="password"]').first().fill(PASS)
  // the EXACT submit button — the first form button is the username-mode switch
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL('**/student**', { timeout: 25000 })
  await page.evaluate((uid) => {
    localStorage.setItem(`fluentia_onboarded_${uid}`, 'true')
    localStorage.setItem('fluentia:onboarded', 'true')
  }, UID)
}

async function shoot(page, path, name) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2200)
  // kill any global modal that survived
  await page.evaluate(() => {
    document.querySelectorAll('[role="dialog"] button').forEach((b) => {
      if (/لاحق|تخط|إغلاق|×/.test(b.textContent || '')) b.click()
    })
  })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
  console.log('shot:', name)
}

const errors = []
const run = async () => {
  const browser = await chromium.launch()
  // desktop
  let ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  let page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[desktop] ${m.text()}`) })
  await login(page)
  await shoot(page, '/student', 'dashboard-desktop')
  await shoot(page, '/student/track', 'track-desktop')
  // first module
  const moduleId = await page.evaluate(async () => {
    const el = document.querySelector('.iv-step--open, .iv-step--current')
    return null
  })
  // navigate via click on the current step
  await page.goto(`${BASE}/student/track`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1500)
  await page.locator('.iv-step--current, .iv-step--open').first().click()
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/module-brief-desktop.png`, fullPage: true })
  console.log('shot: module-brief-desktop  url=', page.url())
  const modUrl = page.url()
  // vocab + phrases + writing tabs
  for (const [label, name] of [['المفردات', 'module-vocab-desktop'], ['العبارات', 'module-phrases-desktop'], ['الكتابة', 'module-writing-desktop'], ['المحادثة', 'module-roleplay-desktop']]) {
    await page.locator('.iv-stage-tab', { hasText: label }).first().click()
    await page.waitForTimeout(1600)
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true })
    console.log('shot:', name)
  }
  await ctx.close()

  // mobile
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[mobile] ${m.text()}`) })
  await login(page)
  await shoot(page, '/student', 'dashboard-mobile')
  await shoot(page, '/student/track', 'track-mobile')
  await page.goto(modUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/module-brief-mobile.png`, fullPage: true })
  console.log('shot: module-brief-mobile')
  await ctx.close()
  await browser.close()

  console.log('\nconsole errors:', errors.length)
  errors.slice(0, 10).forEach((e) => console.log(' -', e.slice(0, 200)))
}

run().catch((e) => { console.error(e); process.exit(1) })
