// Direct repro: inject the exact player audio-load + play() race in a real browser
// against the real prod audio URL, to confirm whether AbortError occurs when
// load() is called close to play() (the suspected root cause of code=0 failures).
import { chromium, webkit, devices } from 'playwright'

const AUDIO = 'https://nmjexpuycmqcxuxljier.supabase.co/storage/v1/object/public/curriculum-audio/listening/L5/0767ef9b-5f6a-48e0-9f47-94bd590ac608/combined.mp3'

async function test(label, bt, ctxOpts) {
  const browser = await bt.launch({ headless: true })
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  await page.goto('about:blank')
  // Simulate the player: set src, call load(), then immediately play() (the race)
  const res = await page.evaluate(async (url) => {
    const out = {}
    const a = document.createElement('audio')
    a.preload = 'metadata'; a.setAttribute('playsinline',''); a.style.display='none'
    document.body.appendChild(a)
    let mediaErr = null
    a.addEventListener('error', () => { mediaErr = a.error?.code })
    a.src = url
    a.load()
    // race: play almost immediately after load() — mimics rapid re-render / tab switch
    try {
      await a.play()
      await new Promise(r => setTimeout(r, 1500))
      out.playResolved = true
      out.currentTime = a.currentTime
      out.advanced = a.currentTime > 0.1
      out.paused = a.paused
      out.readyState = a.readyState
    } catch (e) {
      out.playResolved = false
      out.playError = e.name + ': ' + e.message
    }
    out.mediaErrorCode = mediaErr
    return out
  }, AUDIO)
  console.log(`${label}:`, JSON.stringify(res))
  await browser.close()
}

// NOTE: headless browsers have NO autoplay user-gesture by default → play() rejects with
// NotAllowedError, which is EXPECTED and different from the student AbortError. This test
// mainly checks decode (mediaErrorCode 4) on each engine, esp. WebKit (iOS proxy).
await test('chromium', chromium, {})
await test('webkit', webkit, {})
await test('webkit-iphone13', webkit, { ...devices['iPhone 13'] })
