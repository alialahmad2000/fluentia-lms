/**
 * Pure helpers for vocabulary chunks + quiz generation.
 * No React, no Supabase — just data transforms.
 */

export const CHUNK_SIZE_OPTIONS = [5, 10, 15, 20, 25]
export const DEFAULT_CHUNK_SIZE = 10
export const MASTERY_THRESHOLD = 0.8 // 80% to unlock next chunk

/**
 * Split a sorted word list into sequential chunks.
 * @param {Array<{id: string}>} words  — already sorted by sort_order
 * @param {number} chunkSize
 * @returns {Array<{index, startIdx, endIdx, words}>}
 */
export function splitIntoChunks(words, chunkSize) {
  if (!Array.isArray(words) || words.length === 0) return []
  const size = Number(chunkSize) || DEFAULT_CHUNK_SIZE
  const chunks = []
  for (let i = 0; i < words.length; i += size) {
    chunks.push({
      index: chunks.length,
      startIdx: i,
      endIdx: Math.min(i + size, words.length) - 1,
      words: words.slice(i, i + size),
    })
  }
  return chunks
}

/**
 * A word counts as "mastered" (passing) if its mastery_level is 'learning'
 * or 'mastered'. (The DB has no 'reviewing' state, so we treat anything
 * beyond 'new'/null as progress toward unlock.)
 */
export function isWordPassing(masteryRecord) {
  if (!masteryRecord) return false
  return masteryRecord.mastery_level === 'learning' || masteryRecord.mastery_level === 'mastered'
}

/**
 * A word is "fully mastered" (for the progress bar "X/N متقنة" display)
 * only when mastery_level === 'mastered'.
 */
export function isWordMastered(masteryRecord) {
  return masteryRecord?.mastery_level === 'mastered'
}

/**
 * Compute chunk stats + unlock state for a list of chunks.
 * @param {Array} chunks              — output of splitIntoChunks
 * @param {Object<string, object>} masteryMap  — { [vocab_id]: mastery_row }
 * @returns {Array<{...chunk, masteredCount, passingCount, passingRatio, unlocked, complete, status}>}
 */
export function computeChunkStatus(chunks, masteryMap = {}) {
  let previousPassed = true // chunk 0 is always unlocked
  return chunks.map((chunk) => {
    const masteredCount = chunk.words.filter((w) => isWordMastered(masteryMap[w.id])).length
    const passingCount = chunk.words.filter((w) => isWordPassing(masteryMap[w.id])).length
    const passingRatio = chunk.words.length > 0 ? passingCount / chunk.words.length : 0
    const unlocked = previousPassed
    const complete = passingRatio >= MASTERY_THRESHOLD && chunk.words.length > 0
    const status = !unlocked ? 'locked' : complete ? 'complete' : 'ready'

    // Update previousPassed for the next iteration
    previousPassed = complete

    return {
      ...chunk,
      masteredCount,
      passingCount,
      passingRatio,
      unlocked,
      complete,
      status,
    }
  })
}

/**
 * Filter chunks by student-selected mode.
 * @param {Array} chunks
 * @param {Object} masteryMap
 * @param {'all'|'new'|'difficult'} filter
 * @returns {Array} — chunks annotated with { matchesFilter: boolean }
 */
export function annotateChunksWithFilter(chunks, masteryMap, filter) {
  return chunks.map((chunk) => {
    let matchesFilter = true
    if (filter === 'new') {
      matchesFilter = chunk.words.some((w) => {
        const m = masteryMap[w.id]
        return !m || m.mastery_level === 'new'
      })
    } else if (filter === 'difficult') {
      matchesFilter = chunk.words.some((w) => masteryMap[w.id]?.mastery_level === 'learning')
    }
    return { ...chunk, matchesFilter }
  })
}

// ─── Quiz generation ─────────────────────────────────────────────────────────

const QUESTION_TYPES = ['en_to_ar', 'ar_to_en', 'fill_blank']

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickDistractors(word, pool, field, count = 3) {
  const correct = (word[field] || '').toString().trim()
  const seen = new Set([correct])
  const options = []
  for (const w of shuffle(pool)) {
    if (w.id === word.id) continue
    const val = (w[field] || '').toString().trim()
    if (!val || seen.has(val)) continue
    seen.add(val)
    options.push(val)
    if (options.length >= count) break
  }
  return options
}

/**
 * Generate quiz questions for a set of words.
 * @param {Array} chunkWords   — words from the current chunk
 * @param {Array} unitWords    — all words in the unit (distractor pool)
 * @param {number} count       — target number of questions
 * @returns {Array<{id, type, word, prompt, correctAnswer, options, example}>}
 */
export function generateQuestions(chunkWords, unitWords, count = 10) {
  if (!chunkWords || chunkWords.length === 0) return []

  const maxQuestions = Math.min(count, chunkWords.length)
  const selectedWords = shuffle(chunkWords).slice(0, maxQuestions)
  const pool = unitWords.length >= 4 ? unitWords : chunkWords

  return selectedWords.map((word, i) => {
    const type = QUESTION_TYPES[i % QUESTION_TYPES.length]

    if (type === 'en_to_ar') {
      const correct = word.definition_ar || ''
      const distractors = pickDistractors(word, pool, 'definition_ar', 3)
      return {
        id: `q${i}_${word.id}`,
        type,
        word,
        prompt: word.word,
        promptDir: 'ltr',
        label: 'اختر المعنى الصحيح',
        correctAnswer: correct,
        options: shuffle([correct, ...distractors]),
        example: word.example_sentence || '',
      }
    }

    if (type === 'ar_to_en') {
      const correct = word.word || ''
      const distractors = pickDistractors(word, pool, 'word', 3)
      return {
        id: `q${i}_${word.id}`,
        type,
        word,
        prompt: word.definition_ar || '',
        promptDir: 'rtl',
        label: 'اختر الكلمة الصحيحة بالإنجليزي',
        correctAnswer: correct,
        options: shuffle([correct, ...distractors]),
        example: word.example_sentence || '',
      }
    }

    // fill_blank — fall back to en_to_ar if no example sentence
    const sentence = word.example_sentence || ''
    if (!sentence || !sentence.toLowerCase().includes((word.word || '').toLowerCase())) {
      const correct = word.definition_ar || ''
      const distractors = pickDistractors(word, pool, 'definition_ar', 3)
      return {
        id: `q${i}_${word.id}`,
        type: 'en_to_ar',
        word,
        prompt: word.word,
        promptDir: 'ltr',
        label: 'اختر المعنى الصحيح',
        correctAnswer: correct,
        options: shuffle([correct, ...distractors]),
        example: sentence,
      }
    }

    const escaped = word.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const blanked = sentence.replace(new RegExp(escaped, 'gi'), '_____')
    const correct = word.word
    const distractors = pickDistractors(word, pool, 'word', 3)
    return {
      id: `q${i}_${word.id}`,
      type: 'fill_blank',
      word,
      prompt: blanked,
      promptDir: 'ltr',
      label: 'أكمل الفراغ بالكلمة الصحيحة',
      correctAnswer: correct,
      options: shuffle([correct, ...distractors]),
      example: sentence,
    }
  })
}

/**
 * XP formula for vocabulary quizzes.
 * +2 per correct, +10 bonus if 100%, +5 bonus if ≥80%.
 */
export function calculateQuizXP(correctCount, totalQuestions) {
  if (!totalQuestions) return 0
  let xp = correctCount * 2
  const ratio = correctCount / totalQuestions
  if (ratio === 1) xp += 10
  else if (ratio >= 0.8) xp += 5
  return xp
}
