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

const karaoke   = readFileSync('src/components/audio/parts/KaraokeText.jsx', 'utf8')
const focus     = readFileSync('src/components/audio/parts/ListeningFocusMode.jsx', 'utf8')
const player    = readFileSync('src/components/audio/SmartAudioPlayer.jsx', 'utf8')
const listening = readFileSync('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')
const reading   = readFileSync('src/pages/student/curriculum/tabs/ReadingTab.jsx', 'utf8')
const tooltip   = readFileSync('src/components/audio/parts/WordTooltip.jsx', 'utf8')
const anim      = readFileSync('src/styles/animations.css', 'utf8')

// 1. KaraokeText parity: no more renderInlineNoKaraoke early-exit path
test('KaraokeText: renderInlineNoKaraoke removed (no two render paths)', () =>
  !karaoke.includes('renderInlineNoKaraoke'))

// 2. KaraokeText: no early return gated on !karaokeEnabled
test('KaraokeText: no early return for !karaokeEnabled', () => {
  // The old early return was: "if (!karaokeEnabled || timestamps.length === 0) { return ... }"
  // New code should not have this pattern
  const hasOldEarlyReturn = /if\s*\(\s*!karaokeEnabled/.test(karaoke)
  return !hasOldEarlyReturn
})

// 3. KaraokeText: onPointerDown always in unified render
test('KaraokeText: onPointerDown in unified render path', () =>
  karaoke.includes('onPointerDown'))

// 4. KaraokeText: data-is-vocab always rendered
test('KaraokeText: data-is-vocab always present in spans', () =>
  karaoke.includes('data-is-vocab'))

// 5. KaraokeText: highlights rendered regardless of karaoke
test('KaraokeText: highlightLookup used in unified render', () =>
  karaoke.includes('highlightLookup'))

// 6. KaraokeText: vocab dotted underline always rendered
test('KaraokeText: vocab dotted underline in unified render', () =>
  karaoke.includes('decoration-dotted') && karaoke.includes('isVocab'))

// 7. KaraokeText: hover handlers always attached
test('KaraokeText: onMouseEnter/onMouseLeave always attached', () =>
  karaoke.includes('onMouseEnter') && karaoke.includes('onMouseLeave'))

// 8. ListeningFocusMode: component exists with required props
test('ListeningFocusMode: file exists and non-empty', () => focus.length > 200)
test('ListeningFocusMode: has onRevealText prop', () => focus.includes('onRevealText'))
test('ListeningFocusMode: has isPlaying prop', () => focus.includes('isPlaying'))
test('ListeningFocusMode: has canReveal prop', () => focus.includes('canReveal'))

// 9. AudioWaveform: animation defined
test('AudioWaveform: waveformBar keyframe in animations.css', () => anim.includes('waveformBar'))
test('AudioWaveform: .animate-waveform class defined', () => anim.includes('animate-waveform'))
test('ListeningFocusMode: uses AudioWaveform component', () => focus.includes('AudioWaveform'))

// 10. ListeningTab: transcript hidden by default
test('ListeningTab: showTranscriptByDefault={false} (hidden)', () =>
  listening.includes('showTranscriptByDefault={false}'))

// 11. ReadingTab: transcript default UNCHANGED (not set to false)
test('ReadingTab: showTranscriptByDefault not set to false (unchanged)', () =>
  !reading.includes('showTranscriptByDefault={false}'))

// 12. SmartAudioPlayer: hasPlayedComplete state tracks completion
test('SmartAudioPlayer: hasPlayedComplete state', () =>
  player.includes('hasPlayedComplete'))

// 13. SmartAudioPlayer: imports ListeningFocusMode
test('SmartAudioPlayer: imports ListeningFocusMode', () =>
  player.includes('ListeningFocusMode'))

// 14. SmartAudioPlayer: bottom-bar variant uses showTranscript
test('SmartAudioPlayer: bottom-bar renders KaraokeText or ListeningFocusMode conditionally', () => {
  const bbStart = player.indexOf("variant === 'bottom-bar'")
  const defaultStart = player.indexOf('// ── Default variant')
  const bbSection = player.slice(bbStart, defaultStart > bbStart ? defaultStart : player.length)
  return bbSection.includes('showTranscript') && bbSection.includes('ListeningFocusMode')
})

// 15. SmartAudioPlayer: auto-reveal after completion
test('SmartAudioPlayer: auto-reveal useEffect with autoRevealedOnce guard', () =>
  player.includes('autoRevealedOnce') && player.includes('hasPlayedComplete') && player.includes('1500'))

// 16. SmartAudioPlayer: localStorage per contentId
test('SmartAudioPlayer: localStorage transcript-visible per contentId', () =>
  player.includes('fluentia:listening:transcript-visible'))

// 17. Context audio: 🎤 works regardless of karaoke (no karaokeEnabled gate in WordTooltip)
test('WordTooltip: inContextAudio not gated by karaokeEnabled', () =>
  tooltip.includes('inContextAudio') && !tooltip.includes('karaokeEnabled'))

// 18. canRevealText respects onePlayMode
test('SmartAudioPlayer: canRevealText defined', () =>
  player.includes('canRevealText'))

console.log('\n=== KARAOKE PARITY + LISTENING UX TESTS ===')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
