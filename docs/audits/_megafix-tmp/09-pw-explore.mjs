import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'https://app.fluentia.academy'
const EMAIL = 'mock-test-a1@fluentia.academy'
const PASS = 'MockTest2025!'
const UNIT = '1de8e161-81eb-416e-af87-c136d93f3930'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(2500)
await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL)
await page.locator('input[type="password"]').first().fill(PASS)
await page.locator('button[type="submit"]').first().click()
await page.waitForTimeout(5000)
console.log('after login url:', page.url())

await page.goto(`${BASE}/student/curriculum/unit/${UNIT}?tab=listening`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(6000)
console.log('unit url:', page.url())

// Dump all visible button labels + texts containing الاستماع
const buttons = await page.evaluate(() => {
  const out = []
  document.querySelectorAll('button').forEach(b => {
    const txt = (b.textContent || '').trim().slice(0, 30)
    const aria = b.getAttribute('aria-label') || ''
    if (txt || aria) out.push({ txt, aria })
  })
  return out.slice(0, 60)
})
console.log('Buttons:', JSON.stringify(buttons, null, 1))

// Any element mentioning الاستماع
const listen = await page.evaluate(() => {
  const els = []
  document.querySelectorAll('*').forEach(e => {
    if (e.children.length === 0 && /الاستماع/.test(e.textContent||'')) els.push(e.textContent.trim().slice(0,40))
  })
  return [...new Set(els)].slice(0,10)
})
console.log('الاستماع mentions:', JSON.stringify(listen))

await page.screenshot({ path: 'docs/audits/_megafix-tmp/unit-page.png', fullPage: false })
await browser.close()
console.log('screenshot saved')
