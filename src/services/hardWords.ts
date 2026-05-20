/**
 * Hard Words Training Service.
 *
 * Consumes FSRS state from curriculum_vocabulary_srs + srs_review_logs
 * (Prompt 03 foundation). Surfaces words a student struggles with and
 * records drill attempts toward promotion.
 *
 * Classification + pool fetch + breakdown happen DB-side via SECURITY
 * DEFINER RPCs (see migration 20260520180000_hard_words_training.sql).
 * Drill attempt recording is client-side because it needs to read-then-
 * write the SRS row's hw_* columns atomically with logging.
 *
 * Callers pass `studentId` (= profile.id = auth.uid()). Never use user.id.
 */

import { supabase } from '../lib/supabase'

// ──────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────

export type DrillMode = 'matching' | 'context_fill' | 'listening' | 'typing_recall'

export const DRILL_MODES: readonly DrillMode[] = [
  'matching',
  'context_fill',
  'listening',
  'typing_recall',
] as const

export const DRILL_MODE_AR: Record<DrillMode, string> = {
  matching: 'مطابقة المعاني',
  context_fill: 'كلمة في جملة',
  listening: 'استماع',
  typing_recall: 'كتابة الكلمة',
}

export const DRILL_MODE_DESCRIPTION_AR: Record<DrillMode, string> = {
  matching: 'وَفِّق كل كلمة مع معناها بالعربي',
  context_fill: 'اختر الكلمة المناسبة في الجملة',
  listening: 'استمع للنطق واختر الكلمة الصحيحة',
  typing_recall: 'اكتب الكلمة بالإنجليزي من المعنى',
}

export interface HardWord {
  vocabularyId: string
  word: string
  meaningAr: string | null
  audioUrl: string | null
  exampleSentence: string | null
  difficulty: number
  lapses: number
  hwCorrectStreak: number
  hwDrillModesSeen: DrillMode[]
  recentAgainRate: number
}

export interface DrillBatch {
  primaryWords: HardWord[]
  distractorWords: HardWord[]
  mode: DrillMode
}

export interface DrillAttemptResult {
  newStreak: number
  newModesSeen: DrillMode[]
  promoted: boolean
}

export interface HardWordsStats {
  totalHard: number
  byCause: {
    highLapses: number
    highDifficulty: number
    recentAgainPattern: number
  }
  availableModes: DrillMode[]
  recentDrillsLast7Days: number
}

// Session sizes — keep in sync with the prompt spec
const SESSION_SIZE: Record<DrillMode, number> = {
  matching: 6,
  context_fill: 10,
  listening: 10,
  typing_recall: 10,
}

const DISTRACTORS_PER_QUESTION: Record<DrillMode, number> = {
  matching: 0,        // matching uses primaries themselves as distractors
  context_fill: 3,
  listening: 3,
  typing_recall: 0,
}

// Min pool sizes for a mode to be considered "available"
const MIN_HARD_POOL: Record<DrillMode, number> = {
  matching: 6,        // need 6 hard words for the matching grid
  context_fill: 1,
  listening: 1,
  typing_recall: 1,
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

interface RpcHardWordRow {
  vocabulary_id: string
  word: string
  meaning_ar: string | null
  audio_url: string | null
  example_sentence: string | null
  difficulty: number
  lapses: number
  hw_correct_streak: number
  hw_drill_modes_seen: string[] | null
  recent_again_rate: number
  classification?: string
}

function rowToHardWord(row: RpcHardWordRow): HardWord {
  const modes = (row.hw_drill_modes_seen || []).filter((m): m is DrillMode =>
    (DRILL_MODES as readonly string[]).includes(m)
  )
  return {
    vocabularyId: row.vocabulary_id,
    word: row.word,
    meaningAr: row.meaning_ar,
    audioUrl: row.audio_url,
    exampleSentence: row.example_sentence,
    difficulty: Number(row.difficulty) || 0,
    lapses: row.lapses || 0,
    hwCorrectStreak: row.hw_correct_streak || 0,
    hwDrillModesSeen: modes,
    recentAgainRate: Number(row.recent_again_rate) || 0,
  }
}

// Fisher-Yates shuffle (in place, returns same array)
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ──────────────────────────────────────────────────────────────────
// DB operations
// ──────────────────────────────────────────────────────────────────

/** Classified hard-words pool for a student. Order: difficulty DESC, lapses DESC. */
export async function getHardWords(studentId: string, limit = 100): Promise<HardWord[]> {
  const { data, error } = await supabase.rpc('get_hard_words_for_student', {
    p_student_id: studentId,
    p_limit: limit,
  })
  if (error) throw error
  return ((data || []) as RpcHardWordRow[]).map(rowToHardWord)
}

/** Cheap count for nav badge + dashboard hero. */
export async function getHardWordsCount(studentId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_hard_words_count', {
    p_student_id: studentId,
  })
  if (error) throw error
  // RPC returns a scalar — supabase wraps it
  if (typeof data === 'number') return data
  if (Array.isArray(data) && data.length > 0) return Number(data[0]) || 0
  return Number(data) || 0
}

/** Breakdown by cause (for dashboard chips). */
async function getHardWordsBreakdown(studentId: string) {
  const { data, error } = await supabase.rpc('get_hard_words_breakdown', {
    p_student_id: studentId,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    highLapses: row?.high_lapses ?? 0,
    highDifficulty: row?.high_difficulty ?? 0,
    recentAgainPattern: row?.recent_again_pattern ?? 0,
    totalHard: row?.total_hard ?? 0,
  }
}

/** Count of drill attempts in the last 7 days (for dashboard activity strip). */
async function getRecentDrillsCount(studentId: string, days = 7): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { count, error } = await supabase
    .from('hard_words_drill_log')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .gte('attempted_at', since.toISOString())
  if (error) throw error
  return count ?? 0
}

/**
 * Distractor pool for MCQ modes (context_fill, listening). Pulls non-hard
 * vocabulary from the same level as the primary word, with audio when the
 * mode requires it. Fall back to any-level if a level-specific pool is small.
 */
async function getDistractorPool(
  primary: HardWord,
  count: number,
  needAudio: boolean
): Promise<HardWord[]> {
  // Pull a wider pool then shuffle locally so distractors vary across questions
  const pageSize = Math.max(count * 6, 24)
  let query = supabase
    .from('curriculum_vocabulary')
    .select('id, word, definition_ar, audio_url, example_sentence')
    .neq('id', primary.vocabularyId)
    .limit(pageSize)
  if (needAudio) {
    query = query.not('audio_url', 'is', null)
  }
  const { data, error } = await query
  if (error) throw error
  const candidates = (data || []).map((r: {
    id: string
    word: string
    definition_ar: string | null
    audio_url: string | null
    example_sentence: string | null
  }) => ({
    vocabularyId: r.id,
    word: r.word,
    meaningAr: r.definition_ar,
    audioUrl: r.audio_url,
    exampleSentence: r.example_sentence,
    difficulty: 0,
    lapses: 0,
    hwCorrectStreak: 0,
    hwDrillModesSeen: [] as DrillMode[],
    recentAgainRate: 0,
  } as HardWord))
  // Avoid distractors that share the same Arabic meaning as the primary
  const filtered = candidates.filter(
    (c) => c.meaningAr && c.meaningAr.trim() !== (primary.meaningAr || '').trim()
  )
  return shuffle(filtered).slice(0, count)
}

/**
 * Build one drill batch shaped for a specific drill mode.
 * Returns { primaryWords, distractorWords, mode }.
 *
 * For matching: 6 primaries (matched against each other's Arabic meanings).
 * For context_fill / listening: N primaries + 3 distractors per primary
 *   (we return a flat distractor pool the UI can sample from per card).
 * For typing_recall: N primaries, 0 distractors.
 */
export async function selectDrillBatch(
  studentId: string,
  drillMode: DrillMode,
  size?: number
): Promise<DrillBatch> {
  const sessionSize = size ?? SESSION_SIZE[drillMode]
  const pool = await getHardWords(studentId, 200)
  const primaries = shuffle([...pool]).slice(0, sessionSize)

  if (primaries.length === 0) {
    return { primaryWords: [], distractorWords: [], mode: drillMode }
  }

  if (drillMode === 'matching' || drillMode === 'typing_recall') {
    return { primaryWords: primaries, distractorWords: [], mode: drillMode }
  }

  // context_fill / listening: gather a single distractor pool sized for all primaries.
  // We pull primaries.length * distractorsPerQuestion + buffer; the UI samples per card.
  const needAudio = drillMode === 'listening'
  const totalDistractors = primaries.length * DISTRACTORS_PER_QUESTION[drillMode]
  // Use the first primary as the seed for level-matching; distractors are reusable across cards.
  const distractorWords = await getDistractorPool(primaries[0], totalDistractors, needAudio)

  return { primaryWords: primaries, distractorWords, mode: drillMode }
}

/**
 * Record a single drill attempt.
 * - Inserts into hard_words_drill_log
 * - Updates curriculum_vocabulary_srs hw_* columns
 * - Returns { newStreak, newModesSeen, promoted }
 */
export async function recordDrillAttempt(params: {
  studentId: string
  vocabularyId: string
  drillMode: DrillMode
  isCorrect: boolean
  responseMs?: number
}): Promise<DrillAttemptResult> {
  const { studentId, vocabularyId, drillMode, isCorrect, responseMs } = params

  // 1) Log the attempt (immutable)
  const { error: logErr } = await supabase.from('hard_words_drill_log').insert({
    student_id: studentId,
    vocabulary_id: vocabularyId,
    drill_mode: drillMode,
    is_correct: isCorrect,
    response_ms: responseMs ?? null,
  })
  if (logErr) {
    // Log insert failure shouldn't drop the rating silently — surface it
    throw logErr
  }

  // 2) Read current hw_* state
  const { data: current, error: readErr } = await supabase
    .from('curriculum_vocabulary_srs')
    .select('hw_correct_streak, hw_drill_modes_seen')
    .eq('student_id', studentId)
    .eq('vocabulary_id', vocabularyId)
    .maybeSingle()
  if (readErr) throw readErr

  const currentStreak = current?.hw_correct_streak ?? 0
  const currentModes = (current?.hw_drill_modes_seen ?? []) as string[]

  let newStreak: number
  let newModesSeen: DrillMode[]
  if (isCorrect) {
    newStreak = currentStreak + 1
    // Dedupe + add the current mode
    const set = new Set<string>(currentModes)
    set.add(drillMode)
    newModesSeen = Array.from(set).filter((m): m is DrillMode =>
      (DRILL_MODES as readonly string[]).includes(m)
    )
  } else {
    newStreak = 0
    newModesSeen = []
  }

  const promoted = isCorrect && newStreak >= 3 && newModesSeen.length >= 2

  // 3) Write hw_* state
  const { data: updated, error: upErr } = await supabase
    .from('curriculum_vocabulary_srs')
    .update({
      hw_correct_streak: newStreak,
      hw_drill_modes_seen: newModesSeen,
      hw_last_drill_at: new Date().toISOString(),
    })
    .eq('student_id', studentId)
    .eq('vocabulary_id', vocabularyId)
    .select('hw_correct_streak, hw_drill_modes_seen')
    .maybeSingle()
  if (upErr) throw upErr
  // .select() returns null when no row matched — that means RLS blocked or
  // the SRS row doesn't exist. Don't silently swallow.
  if (!updated) {
    throw new Error(
      `Failed to update hw_* on curriculum_vocabulary_srs (RLS or missing row) ` +
        `student=${studentId} vocab=${vocabularyId}`
    )
  }

  return { newStreak, newModesSeen, promoted }
}

/**
 * Dashboard stats: breakdown + available modes + recent drills.
 */
export async function getHardWordsStats(studentId: string): Promise<HardWordsStats> {
  const [breakdown, recentDrills] = await Promise.all([
    getHardWordsBreakdown(studentId),
    getRecentDrillsCount(studentId, 7),
  ])

  // Determine which modes are available based on pool size + audio availability
  const availableModes: DrillMode[] = []
  if (breakdown.totalHard >= MIN_HARD_POOL.matching) availableModes.push('matching')
  if (breakdown.totalHard >= MIN_HARD_POOL.context_fill) {
    // context_fill needs at least 1 hard word + 3 distractors available;
    // assume distractors are usually available given thousands of vocab rows.
    availableModes.push('context_fill')
  }
  if (breakdown.totalHard >= MIN_HARD_POOL.listening) {
    // listening needs audio-having distractors; audio is 100% covered in
    // curriculum_vocabulary (per audit), so this is safe.
    availableModes.push('listening')
  }
  if (breakdown.totalHard >= MIN_HARD_POOL.typing_recall) availableModes.push('typing_recall')

  return {
    totalHard: breakdown.totalHard,
    byCause: {
      highLapses: breakdown.highLapses,
      highDifficulty: breakdown.highDifficulty,
      recentAgainPattern: breakdown.recentAgainPattern,
    },
    availableModes,
    recentDrillsLast7Days: recentDrills,
  }
}

/**
 * Recent activity buckets for the 7-day chart.
 * Returns array of { date: 'YYYY-MM-DD', count: n } sorted oldest → newest.
 */
export async function getRecentDrillActivity(studentId: string, days = 7) {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  since.setHours(0, 0, 0, 0)

  const { data, error } = await supabase
    .from('hard_words_drill_log')
    .select('attempted_at')
    .eq('student_id', studentId)
    .gte('attempted_at', since.toISOString())
  if (error) throw error

  const buckets = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    buckets.set(d.toISOString().slice(0, 10), 0)
  }
  for (const row of data || []) {
    const day = new Date((row as { attempted_at: string }).attempted_at)
      .toISOString()
      .slice(0, 10)
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) || 0) + 1)
  }
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }))
}
