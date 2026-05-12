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

const player = readFileSync('src/components/audio/SmartAudioPlayer.jsx', 'utf8')
const reading = readFileSync('src/pages/student/curriculum/tabs/ReadingTab.jsx', 'utf8')
const listening = readFileSync('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
const karaoke = readFileSync('src/components/audio/parts/KaraokeText.jsx', 'utf8')
const progress = readFileSync('src/components/audio/parts/ProgressBar.jsx', 'utf8')

// 1. SmartAudioPlayer has both default and bottom-bar variants
test('SmartAudioPlayer has default variant branch', () => player.includes('Default variant'))
test('SmartAudioPlayer keeps bottom-bar variant', () => player.includes("variant === 'bottom-bar'"))
test('PLAYER_VARIANTS constant exported', () => player.includes('PLAYER_VARIANTS'))

// 2. Tabs use default
test('ReadingTab uses variant="default"', () => reading.includes('variant="default"') && !reading.includes('variant="bottom-bar"'))
test('ListeningTab uses variant="default"', () => listening.includes('variant="default"') && !listening.includes('variant="bottom-bar"'))

// 3. No bottom-bar-specific clearance in tabs
test('ReadingTab has no pb-32/pb-40 clearance', () => !reading.includes('pb-32') && !reading.includes('pb-40'))
test('ListeningTab has no min-h-screen pb-36', () => !listening.includes('min-h-screen pb-36'))

// 4. KaraokeText unchanged (no variant-specific logic)
test('KaraokeText has no variant-specific code', () => !karaoke.includes("variant ==="))

// 5. ProgressBar still has RTL fix
test('ProgressBar has dir="ltr" on bar container', () => progress.includes('dir="ltr"') && progress.includes('h-2 rounded-full'))

// 6. Default variant wires all features
test('Default variant wires highlightLookup to KaraokeText', () => {
  const defaultSection = player.substring(player.indexOf('Default variant'))
  return defaultSection.includes('highlightLookup={highlightLookup}')
})
test('Default variant wires vocabSet to KaraokeText', () => {
  const defaultSection = player.substring(player.indexOf('Default variant'))
  return defaultSection.includes('vocabSet={vocabSet}')
})
test('Default variant renders WordTooltip', () => {
  const defaultSection = player.substring(player.indexOf('Default variant'))
  return defaultSection.includes('WordTooltip')
})
test('Default variant has hero play button (w-16 h-16)', () => {
  const defaultSection = player.substring(player.indexOf('Default variant'))
  return defaultSection.includes('w-16 h-16')
})
test('Default variant shows progress bar + A-B + bookmarks + speed', () => {
  const defaultSection = player.substring(player.indexOf('Default variant'))
  return defaultSection.includes('ProgressBar') &&
    defaultSection.includes('abLoop') &&
    defaultSection.includes('bookmarks') &&
    defaultSection.includes('playbackRate')
})

// 7. useWordHighlights + WordTooltip imports still in tabs
test('ReadingTab imports useWordHighlights', () => reading.includes('useWordHighlights'))
test('ListeningTab imports useWordHighlights', () => listening.includes('useWordHighlights'))

// 8. No hex codes in new player card (only Tailwind or rgba)
test('New player card has no hex color codes (uses Tailwind/rgba)', () => {
  const defaultSection = player.substring(player.indexOf('Premium player card'))
  // No #RRGGBB patterns
  return !/#[0-9a-fA-F]{6}/.test(defaultSection)
})

console.log('\n=== INLINE PLAYER TESTS ===')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
