// Regression probe for the 2026-08-08 report: "on my phone I can't see the
// listening bar to play the audio".
//
// The bug was a STACKING one, not a rendering one — the bar rendered, it just
// painted under the mobile bottom nav (LayoutShell's [data-content-shell] is
// position:relative;z-index:1, so nothing inside the page can out-layer a z-40
// sibling; raising the bar's own z-index cannot fix it). So "is it in the DOM"
// and even "is it visible" are NOT sufficient assertions: this hit-tests the
// play button at its own centre, which is the only check the old bug fails.
import { test, expect } from '@playwright/test'
import { login, suppressModals, collectFatalErrors } from './helpers.mjs'

// L1 U1 — has audio (verified in curriculum_listening).
const UNIT_ID = '49ed7c2c-fa1b-47b2-bb5c-34074beeafdc'
const LISTENING_URL = `/student/curriculum/unit/${UNIT_ID}?activity=listening`

async function probeBar(page) {
  const play = page.getByRole('button', { name: /تشغيل|إيقاف|جارٍ التحميل/ }).first()
  await expect(play).toBeVisible({ timeout: 30_000 })
  await page.waitForTimeout(500) // let the sidebar-width transition settle

  return page.evaluate(() => {
    const nav = document.querySelector('[data-role="mobile-bottom-nav"]')
    // NOT offsetParent — that is null for every position:fixed element.
    const navVisible = !!nav && getComputedStyle(nav).display !== 'none'
    const btn = [...document.querySelectorAll('button[aria-label]')]
      .find((b) => /^(تشغيل|إيقاف|جارٍ التحميل)$/.test(b.getAttribute('aria-label')))
    if (!btn) return { found: false }
    const r = btn.getBoundingClientRect()
    const hit = document.elementFromPoint(
      Math.round(r.left + r.width / 2),
      Math.round(r.top + r.height / 2),
    )
    const bar = btn.closest('div.fixed')
    const fab = document.querySelector('[aria-label="أبلغ عن مشكلة"]')
    return {
      found: true,
      navVisible,
      navTop: navVisible ? Math.round(nav.getBoundingClientRect().top) : null,
      btn: { top: Math.round(r.top), bottom: Math.round(r.bottom) },
      bar: bar ? { top: Math.round(bar.getBoundingClientRect().top), bottom: Math.round(bar.getBoundingClientRect().bottom) } : null,
      fabBottom: fab ? Math.round(fab.getBoundingClientRect().bottom) : null,
      viewportH: window.innerHeight,
      // true only when a tap at the button's centre actually lands on it
      hitIsPlay: !!hit && (hit === btn || btn.contains(hit)),
      hitTag: hit ? `${hit.tagName}.${hit.className?.toString().slice(0, 40)}` : null,
    }
  })
}

test('play button is reachable and clears the mobile nav (phone)', async ({ page }) => {
  const fatals = collectFatalErrors(page)
  await suppressModals(page)
  await login(page)
  await page.goto(LISTENING_URL)

  const probe = await probeBar(page)
  console.log('PHONE:', JSON.stringify(probe, null, 2))

  expect(probe.found).toBe(true)
  expect(probe.btn.top).toBeGreaterThanOrEqual(0)
  expect(probe.btn.bottom).toBeLessThanOrEqual(probe.viewportH)
  expect(probe.hitIsPlay).toBe(true)
  expect(probe.navVisible).toBe(true)
  // The bar sits entirely above the nav — no overlap at all.
  expect(probe.bar.bottom).toBeLessThanOrEqual(probe.navTop)
  // The bug-report FAB must not sit on top of the bar's controls.
  expect(probe.fabBottom).toBeLessThanOrEqual(probe.bar.top)
  expect(fatals).toEqual([])
})

test('bar still anchors to the viewport bottom on desktop (no nav)', async ({ page }) => {
  const fatals = collectFatalErrors(page)
  await suppressModals(page)
  await login(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(LISTENING_URL)

  const probe = await probeBar(page)
  console.log('DESKTOP:', JSON.stringify(probe, null, 2))

  expect(probe.found).toBe(true)
  expect(probe.navVisible).toBe(false) // lg:hidden
  expect(probe.hitIsPlay).toBe(true)
  // Nothing to clear, so the bar goes all the way down.
  expect(probe.bar.bottom).toBe(probe.viewportH)
  expect(probe.fabBottom).toBeLessThanOrEqual(probe.bar.top)
  expect(fatals).toEqual([])
})
