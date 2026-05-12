import { readFileSync } from 'fs'

let passed = 0, failed = 0
const results = []
function test(name, fn) {
  try {
    const ok = fn()
    if (ok) { passed++; results.push(`  ✅ ${name}`) }
    else     { failed++; results.push(`  ❌ ${name}`) }
  } catch(e) { failed++; results.push(`  ❌ ${name}: ${e.message}`) }
}

const bar   = readFileSync('src/components/audio/parts/BottomBarControls.jsx', 'utf8')
const player= readFileSync('src/components/audio/SmartAudioPlayer.jsx', 'utf8')
const reading= readFileSync('src/pages/student/curriculum/tabs/ReadingTab.jsx', 'utf8')
const listening= readFileSync('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
const karaoke= readFileSync('src/components/audio/parts/KaraokeText.jsx', 'utf8')
const tooltip= readFileSync('src/components/audio/parts/WordTooltip.jsx', 'utf8')
const progress= readFileSync('src/components/audio/parts/ProgressBar.jsx', 'utf8')
const navPause= readFileSync('src/components/audio/hooks/useAudioNavigationPause.js', 'utf8')
const vocabHook= readFileSync('src/hooks/useUnitVocabSet.js', 'utf8')

// 1. BottomBarControls single-row h-[60px]
test('BottomBarControls has 60px content row', () => bar.includes('h-[60px]'))
// 2. Slim bar: no expand/collapse state
test('BottomBarControls has no expand/collapse state', () => !bar.includes('setExpanded') && !bar.includes('expanded ? 200'))
// 3+4. Tabs use bottom-bar
test('ReadingTab uses variant="bottom-bar"', () => reading.includes('variant="bottom-bar"') && !reading.includes('variant="default"'))
test('ListeningTab uses variant="bottom-bar"', () => listening.includes('variant="bottom-bar"'))
// 5. Default variant still exists
test('SmartAudioPlayer keeps default variant', () => player.includes('Default variant'))
// 6. useAudioNavigationPause exists + wired
test('useAudioNavigationPause hook exists', () => navPause.includes('useAudioNavigationPause') && navPause.includes('useLocation'))
test('SmartAudioPlayer calls useAudioNavigationPause', () => player.includes('useAudioNavigationPause'))
// 7. SettingsPopover has bg playback toggle
test('SettingsPopover.jsx has background playback toggle', () => {
  try {
    const sp = readFileSync('src/components/audio/parts/SettingsPopover.jsx', 'utf8')
    return sp.includes('متابعة التشغيل') && sp.includes('getBackgroundPlaybackPref')
  } catch { return false }
})
// 8. useUnitVocabSet exists
test('useUnitVocabSet hook exists', () => vocabHook.includes('useUnitVocabSet') && vocabHook.includes('isMounted'))
// 9+10. Tabs wire vocabSet + onVocabWordTap
test('ReadingTab passes onVocabWordTap to SmartAudioPlayer', () => reading.includes('onVocabWordTap'))
test('ListeningTab passes onVocabWordTap to SmartAudioPlayer', () => listening.includes('onVocabWordTap'))
// 11. WordTooltip has audio button
test('WordTooltip has audio play button', () => tooltip.includes('handlePlayWord') && tooltip.includes('audio_url'))
// 12. Vocab words have data-is-vocab + dotted underline
test('KaraokeText has data-is-vocab + dotted underline for vocab words', () =>
  karaoke.includes('data-is-vocab') && karaoke.includes('decoration-dotted'))
// 13. KaraokeText differentiates vocab tap vs regular tap
test('KaraokeText: vocab tap → onVocabWordTap, regular → onWordTap', () =>
  karaoke.includes('onVocabWordTap') && karaoke.includes('isVocabWord'))
// 14. ProgressBar hairline variant
test('ProgressBar has hairline variant', () => progress.includes('hairline'))
// 15. Tabs have pb-[100px] clearance
test('ReadingTab has pb-[100px] clearance', () => reading.includes('pb-[100px]'))
test('ListeningTab has pb-[100px] clearance', () => listening.includes('pb-[100px]'))

console.log('\n=== STICKY V2 TESTS ===')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
