// BUG 3 probe — reproduce "click ابدئي → nothing visible" against PRODUCTION.
// No purge (unlike journey-smoke) so we see exactly what the real user sees.
const { chromium } = require('@playwright/test')
const BASE = process.env.SMOKE_BASE || 'https://app.fluentia.academy'
;(async () => {
  const browser = await chromium.launch({ headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push('CON: ' + m.text().slice(0, 200)) })
  page.on('pageerror', (e) => errs.push('PAGEERR: ' + (e.message || '').slice(0, 200)))

  const out = {}
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('input[type="email"]', { timeout: 40000 })
    await page.fill('input[type="email"]', 'mock-test-a1@fluentia.academy')
    await page.fill('input[type="password"]', 'MockTest2025!')
    await page.press('input[type="password"]', 'Enter')
    await page.waitForURL(/\/student/, { timeout: 40000 }).catch(() => {})
    await page.waitForTimeout(2000)
    // mark onboarded + PWA dismissed so the page is clean like a normal active student
    await page.evaluate(() => {
      try {
        const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token'))
        const s = k ? JSON.parse(localStorage.getItem(k)) : null
        const uid = s?.user?.id || s?.currentSession?.user?.id
        if (uid) localStorage.setItem('fluentia_onboarded_' + uid, 'true')
        sessionStorage.setItem('pwa-banner-dismissed', '1')
      } catch {}
    })

    await page.goto(`${BASE}/student/vocab-journey`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(3500)
    out.startBtn = await page.locator('button:has-text("ابدئي")').count()

    // snapshot fixed/overlay elements BEFORE click (with their identifying text)
    const overlaysBefore = await page.evaluate(() => {
      const list = []
      document.querySelectorAll('body *').forEach((d) => {
        const s = getComputedStyle(d)
        if ((s.position === 'fixed' || s.position === 'absolute') && parseInt(s.zIndex || '0', 10) >= 40) {
          const r = d.getBoundingClientRect()
          if (r.width > 200 && r.height > 200) list.push({ z: s.zIndex, pos: s.position, cls: (d.className||'').toString().slice(0,60), w: Math.round(r.width), h: Math.round(r.height), text: (d.innerText||'').replace(/\s+/g,' ').slice(0,90) })
        }
      })
      return list.sort((a,b)=>parseInt(b.z)-parseInt(a.z))
    })
    out.bigOverlaysBefore = overlaysBefore

    // Remove only the PWA prompt node so we can click ابدئي (the real user has no such prompt).
    await page.evaluate(() => {
      document.querySelectorAll('body *').forEach((d) => {
        if ((d.innerText || '').includes('ثبّت تطبيق')) {
          const s = getComputedStyle(d)
          if (s.position === 'fixed' && parseInt(s.zIndex || '0', 10) >= 900) d.remove()
        }
      })
    })
    await page.waitForTimeout(300)

    // click WITHOUT purge — exactly what the user does
    if (out.startBtn > 0) {
      await page.locator('button:has-text("ابدئي")').first().click()
      await page.waitForTimeout(2800)

      out.afterClick = await page.evaluate(() => {
        const stop = Array.from(document.querySelectorAll('.vocab-cosmos')).find(e=>getComputedStyle(e).position==='fixed')
        const info = { stopMounted: !!stop }
        if (stop) {
          const s = getComputedStyle(stop)
          const r = stop.getBoundingClientRect()
          info.stopZ = s.zIndex
          info.stopPosition = s.position
          info.stopVisible = s.visibility
          info.stopOpacity = s.opacity
          info.stopDisplay = s.display
          info.stopRect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
          info.stopParentTag = stop.parentElement?.tagName
          info.stopParentCls = (stop.parentElement?.className || '').toString().slice(0, 60)
          info.stopIsDirectBodyChild = stop.parentElement === document.body
          info.stopInsideRoot = !!stop.closest('#root')
          // walk ancestors: which one creates the containing block (transform/filter/contain/perspective)?
          const culprits = []
          let el = stop.parentElement
          while (el) {
            const cs = getComputedStyle(el)
            if (cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none' ||
                (cs.contain && /paint|layout|strict|content/.test(cs.contain)) || cs.willChange === 'transform') {
              culprits.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,50), transform: cs.transform.slice(0,40), filter: cs.filter.slice(0,30), contain: cs.contain, willChange: cs.willChange })
            }
            el = el.parentElement
          }
          info.containingBlockCulprits = culprits
        }
        // what is actually painted at the viewport center?
        const cx = Math.round(window.innerWidth / 2), cy = Math.round(window.innerHeight / 2)
        const top = document.elementFromPoint(cx, cy)
        const chain = []
        let el = top
        while (el && chain.length < 6) {
          const s = getComputedStyle(el)
          chain.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,50), z: s.zIndex, pos: s.position })
          el = el.parentElement
        }
        info.elementAtCenterChain = chain
        info.stopIsAtCenter = !!(top && top.closest && top.closest('.vocab-cosmos'))
        // list everything fixed/absolute with z>=40 and big
        const big = []
        document.querySelectorAll('body *').forEach((d) => {
          const cs = getComputedStyle(d)
          if ((cs.position === 'fixed' || cs.position === 'absolute') && parseInt(cs.zIndex || '0', 10) >= 40) {
            const rr = d.getBoundingClientRect()
            if (rr.width > 200 && rr.height > 200) big.push({ z: cs.zIndex, pos: cs.position, cls: (d.className||'').toString().slice(0,60), w: Math.round(rr.width), h: Math.round(rr.height) })
          }
        })
        info.bigOverlaysAfter = big.sort((a,b)=>parseInt(b.z)-parseInt(a.z))
        info.bodyText = Array.from(document.querySelectorAll('.vocab-cosmos')).find(e=>getComputedStyle(e).position==='fixed')?.innerText?.slice(0,120) || null
        return info
      })
    }
    out.consoleErrors = errs.slice(0, 8)
    await page.screenshot({ path: '/tmp/fl-vocab-fix/probe-bug3.png', fullPage: false })
  } catch (e) {
    out.fatal = e.message
  }
  console.log(JSON.stringify(out, null, 2))
  await browser.close()
})().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
