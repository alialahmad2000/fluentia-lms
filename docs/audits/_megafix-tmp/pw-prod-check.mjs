import { chromium, devices } from 'playwright'
const errors = []
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext(devices['iPhone 13'])
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
const resp = await page.goto('https://app.fluentia.academy/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)
const bodyLen = (await page.textContent('body'))?.trim().length || 0
const react310 = errors.filter(e => /Minified React error #310|Rendered fewer hooks|cannot read|undefined is not|null is not/i.test(e))
console.log('HTTP', resp?.status())
console.log('body text length:', bodyLen)
console.log('console errors:', errors.length)
errors.slice(0,8).forEach(e => console.log('  -', e.slice(0,160)))
console.log('CRITICAL (react#310/hook/null):', react310.length)
await browser.close()
process.exit(react310.length === 0 && bodyLen > 0 ? 0 : 1)
