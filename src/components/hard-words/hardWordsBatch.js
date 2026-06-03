/**
 * Hard-words batch shaping for the unified store.
 *
 * Source of truth is now `vocab_cards` via services/vocab `getHardWords(profileId)`,
 * which returns `VocabCardWithContent[]` — each card has `id` (the vocab_cards id,
 * required for recordDrill), denormalized word/meaning_ar, and a `curriculum_vocabulary`
 * join (audio/IPA/example, may be null).
 *
 * The drill components consume a flat "drill word" shape. We normalize each card into
 * that shape ONCE here, carrying `id` so the recording call can reach the unified store.
 */

export const DRILL_MODES = ['matching', 'context_fill', 'listening', 'typing_recall']

export const DRILL_MODE_AR = {
  matching: 'مطابقة المعاني',
  context_fill: 'كلمة في جملة',
  listening: 'استماع',
  typing_recall: 'كتابة الكلمة',
}

export const DRILL_MODE_DESCRIPTION_AR = {
  matching: 'وَفِّق كل كلمة مع معناها بالعربي',
  context_fill: 'اختر الكلمة المناسبة في الجملة',
  listening: 'استمع للنطق واختر الكلمة الصحيحة',
  typing_recall: 'اكتب الكلمة بالإنجليزي من المعنى',
}

// Session sizes per mode.
export const SESSION_SIZE = {
  matching: 6,
  context_fill: 10,
  listening: 10,
  typing_recall: 10,
}

// Min hard-pool size for a mode to be "available".
export const MIN_HARD_POOL = {
  matching: 6,
  context_fill: 1,
  listening: 1,
  typing_recall: 1,
}

/**
 * Normalize a VocabCardWithContent into the flat drill-word shape.
 * Carries `id` (vocab_cards id) so recordDrill can write to the unified store.
 * Display fields prefer the denormalized card column, falling back to the
 * curriculum_vocabulary join.
 */
export function cardToDrillWord(card) {
  const cv = card?.curriculum_vocabulary || null
  return {
    id: card.id, // vocab_cards id — for recordDrill
    word: card.word || cv?.word || '',
    meaningAr: card.meaning_ar ?? cv?.definition_ar ?? null,
    audioUrl: cv?.audio_url ?? null,
    exampleSentence: card.context_sentence ?? cv?.example_sentence ?? null,
    difficulty: Number(card.difficulty) || 0,
    lapses: card.lapses || 0,
    curriculum_vocabulary: cv,
  }
}

function shuffle(arr) {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Build a drill batch from the hard cards list (already fetched via getHardWords).
 * Distractors are sampled from the hard pool itself (other words) so we keep
 * everything from the unified store and avoid a second query.
 *
 *   { primaryWords, distractorWords, mode }
 */
export function buildBatchFromCards(cards, mode) {
  const words = (cards || []).map(cardToDrillWord)
  const size = SESSION_SIZE[mode] ?? 10
  const primaries = shuffle(words).slice(0, size)

  if (primaries.length === 0) {
    return { primaryWords: [], distractorWords: [], mode }
  }

  if (mode === 'matching' || mode === 'typing_recall') {
    return { primaryWords: primaries, distractorWords: [], mode }
  }

  // context_fill / listening: distractor pool = all hard words minus the primaries,
  // de-duplicated by Arabic meaning. listening also needs audio.
  const primaryIds = new Set(primaries.map((p) => p.id))
  let pool = words.filter((w) => !primaryIds.has(w.id))
  if (mode === 'listening') pool = pool.filter((w) => w.audioUrl)
  return { primaryWords: primaries, distractorWords: shuffle(pool), mode }
}

/**
 * Which modes are usable given the hard-card count + audio availability.
 */
export function deriveAvailableModes(cards) {
  const list = cards || []
  const total = list.length
  const withAudio = list.filter((c) => c?.curriculum_vocabulary?.audio_url).length
  const modes = []
  if (total >= MIN_HARD_POOL.matching) modes.push('matching')
  if (total >= MIN_HARD_POOL.context_fill) modes.push('context_fill')
  if (total >= MIN_HARD_POOL.listening && withAudio >= 1) modes.push('listening')
  if (total >= MIN_HARD_POOL.typing_recall) modes.push('typing_recall')
  return modes
}
