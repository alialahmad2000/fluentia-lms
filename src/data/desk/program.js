// Pro Desk — THE PROGRAM. The spine that turns 13 separate tracks / 59 lessons into
// ONE guided journey with a clear order and a beginning → middle → end.
//
// Sara shouldn't have to choose where to start. This file lays the 13 curriculum
// tracks into 4 STAGES that build on each other, each with a plain-language payoff.
// Everything downstream (the "next step", the stage map, the progress %) reads its
// order from here — so the whole account has ONE studied sequence, not a pile of tabs.
//
// Authored config only (no DB, creditless). It sits on top of curriculum.js — it does
// not duplicate lesson content, it just orders the existing tracks.
import { CURRICULUM_TRACKS } from './curriculum'

const TRACK_BY_ID = Object.fromEntries(CURRICULUM_TRACKS.map((t) => [t.id, t]))

// The 4 stages, in the order Sara should walk them. Each lists its track ids in order.
// Pedagogy: first make her comfortable + clear (base), then her real blocker — calls &
// meetings, then influence & writing, then the human/career layer.
const STAGES_RAW = [
  {
    id: 'base',
    order: 1,
    icon: 'Sprout',
    en: 'Build the Base',
    ar: 'ابني الأساس',
    promise: 'Speak clearly and comfortably about everyday things.',
    promise_ar: 'تتكلمين بوضوح وارتياح عن أمور الشغل اليومية.',
    trackIds: ['foundations', 'everyday', 'clarity', 'wordpower'],
  },
  {
    id: 'calls',
    order: 2,
    icon: 'PhoneCall',
    en: 'On the Phone & in Meetings',
    ar: 'المكالمات والاجتماعات',
    promise: 'Hold a work call and a meeting without freezing.',
    promise_ar: 'تمسكين مكالمة شغل واجتماع بدون ما تتجمّدين.',
    trackIds: ['reflexes', 'meetings', 'technical'],
  },
  {
    id: 'influence',
    order: 3,
    icon: 'Megaphone',
    en: 'Influence & Writing',
    ar: 'التأثير والكتابة',
    promise: 'Present, push back, and write like a senior.',
    promise_ar: 'تعرضين، وتعترضين، وتكتبين باحترافية.',
    trackIds: ['present', 'negotiate', 'writing', 'email'],
  },
  {
    id: 'pro',
    order: 4,
    icon: 'Award',
    en: 'The Complete Professional',
    ar: 'المحترفة المكتملة',
    promise: 'Rapport, cross-cultural ease, and the moments that shape your career.',
    promise_ar: 'علاقات، وارتياح بين الثقافات، واللحظات اللي تبني مسيرتك.',
    trackIds: ['human', 'career'],
  },
]

// Resolve each stage's tracks + lesson count from the real curriculum.
export const PROGRAM_STAGES = STAGES_RAW.map((s) => {
  const tracks = s.trackIds.map((id) => TRACK_BY_ID[id]).filter(Boolean)
  const lessonCount = tracks.reduce((n, t) => n + (t.lessons?.length || 0), 0)
  return { ...s, tracks, lessonCount }
})

// One flat, PROGRAM-ORDERED list of every lesson (stage order → track order → lesson
// order), each carrying its stage + track. This is the canonical sequence the whole
// Desk uses for "what's next" and overall progress.
export const PROGRAM_LESSONS = PROGRAM_STAGES.flatMap((stage) =>
  stage.trackIds.flatMap((tid, ti) => {
    const t = TRACK_BY_ID[tid]
    if (!t) return []
    return (t.lessons || []).map((l, li) => ({
      ...l,
      trackId: tid,
      trackEn: t.en,
      trackAr: t.ar,
      trackIcon: t.icon,
      stageId: stage.id,
      stageOrder: stage.order,
      stageEn: stage.en,
      programLabel: `${stage.order}.${ti + 1}.${li + 1}`,
    }))
  })
)

export const TOTAL_PROGRAM_LESSONS = PROGRAM_LESSONS.length
export const TOTAL_STAGES = PROGRAM_STAGES.length

export const getStage = (stageId) => PROGRAM_STAGES.find((s) => s.id === stageId) || null
export const stageOfLesson = (lessonId) => PROGRAM_LESSONS.find((l) => l.id === lessonId)?.stageId || null

// Dev-time guard: every curriculum track must live in exactly one stage (no orphans,
// no duplicates). Throws loudly in dev if the mapping drifts from curriculum.js.
const _mapped = PROGRAM_STAGES.flatMap((s) => s.trackIds)
const _all = CURRICULUM_TRACKS.map((t) => t.id)
const _missing = _all.filter((id) => !_mapped.includes(id))
const _dupes = _mapped.filter((id, i) => _mapped.indexOf(id) !== i)
if ((_missing.length || _dupes.length) && typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  // eslint-disable-next-line no-console
  console.error('[program.js] track mapping drift — missing:', _missing, 'duplicated:', _dupes)
}
