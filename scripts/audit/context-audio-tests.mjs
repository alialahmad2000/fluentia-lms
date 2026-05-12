import { readFileSync } from 'fs'
import { findWordTimestamp, resolveVoiceLabel, VOICE_LABELS } from '../../src/lib/findWordTimestamp.js'
import { playAudioSlice } from '../../src/lib/playAudioSlice.js'

let passed = 0, failed = 0
const results = []
function test(name, fn) {
  try {
    const ok = fn()
    if (ok) { passed++; results.push(`  ✅ ${name}`) }
    else     { failed++; results.push(`  ❌ ${name}`) }
  } catch(e) { failed++; results.push(`  ❌ ${name}: ${e.message}`) }
}

const slice   = readFileSync('src/lib/playAudioSlice.js', 'utf8')
const finder  = readFileSync('src/lib/findWordTimestamp.js', 'utf8')
const tooltip = readFileSync('src/components/audio/parts/WordTooltip.jsx', 'utf8')
const reading = readFileSync('src/pages/student/curriculum/tabs/ReadingTab.jsx', 'utf8')
const listening= readFileSync('src/pages/student/curriculum/tabs/ListeningTab.jsx', 'utf8')

// 1. playAudioSlice exports correctly
test('playAudioSlice is a function', () => typeof playAudioSlice === 'function')
// 2. findWordTimestamp exports correctly
test('findWordTimestamp is a function', () => typeof findWordTimestamp === 'function')
test('VOICE_LABELS has 5+ entries', () => Object.keys(VOICE_LABELS).length >= 5)
// 3. playAudioSlice safety attrs
test('playAudioSlice: playsInline=true', () => slice.includes('playsInline = true'))
test('playAudioSlice: crossOrigin=anonymous', () => slice.includes("crossOrigin = 'anonymous'"))
test('playAudioSlice: canplay event handling', () => slice.includes("addEventListener('canplay'"))
test('playAudioSlice: paddingMs default 60', () => slice.includes('paddingMs = 60'))
test('playAudioSlice: dual stop (timeout + timeupdate)', () => slice.includes('setTimeout') && slice.includes('timeupdate'))
test('playAudioSlice: cleanup on unmount', () => slice.includes('cleanup'))
// 4. WordTooltip inContextAudio prop
test('WordTooltip accepts inContextAudio prop', () => tooltip.includes('inContextAudio'))
test('WordTooltip has context audio button (🎤)', () => tooltip.includes('🎤'))
test('WordTooltip has standard audio button (🔊)', () => tooltip.includes('🔊'))
test('WordTooltip calls playAudioSlice', () => tooltip.includes('playAudioSlice'))
test('WordTooltip: playing state tracked (context|standard|null)', () => tooltip.includes("'context'") && tooltip.includes("'standard'"))
test('WordTooltip: stopAll cleanup in useEffect', () => tooltip.includes('stopAll') && tooltip.includes('useEffect'))
// 5. Tabs wire findWordTimestamp
test('ReadingTab imports findWordTimestamp', () => reading.includes('findWordTimestamp'))
test('ListeningTab imports findWordTimestamp', () => listening.includes('findWordTimestamp'))
test('ReadingTab uses findWordTimestamp in handleVocabWordTap', () => reading.includes('findWordTimestamp(audioData.segments'))
test('ListeningTab uses findWordTimestamp in handleVocabWordTap', () => listening.includes('findWordTimestamp(segments'))
test('ReadingTab passes inContextAudio to WordTooltip', () => reading.includes('inContextAudio={wordTooltip.inContextAudio'))
test('ListeningTab passes inContextAudio to WordTooltip', () => listening.includes('inContextAudio={wordTooltip.inContextAudio'))
// 6. findWordTimestamp logic check (unit test)
test('findWordTimestamp: returns null for empty segments', () => findWordTimestamp([], 0, 0) === null)
test('findWordTimestamp: returns correct entry', () => {
  const segs = [{ audio_url: 'x.mp3', speaker_label: 'Alice', voice_id: 'v1', word_timestamps: [
    { word: 'Hello', start_ms: 0, end_ms: 400 },
    { word: 'world', start_ms: 450, end_ms: 800 },
  ]}]
  const r = findWordTimestamp(segs, 0, 1)
  return r?.word === 'world' && r?.startMs === 450 && r?.endMs === 800 && r?.audioUrl === 'x.mp3'
})
test('resolveVoiceLabel: prefers speakerLabel', () => resolveVoiceLabel('v1', 'Fatima') === 'Fatima')
test('resolveVoiceLabel: falls back to voice ID', () => resolveVoiceLabel('Xb7hH8MSUJpSbSDYk0k2', null) === 'Alice')

console.log('\n=== CONTEXT AUDIO TESTS ===')
results.forEach(r => console.log(r))
console.log(`\nResult: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
