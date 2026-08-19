import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Sparkles, RotateCcw, PartyPopper, ChevronLeft } from 'lucide-react'
import { useUnitVocabStatus } from '../../../hooks/useUnitVocabStatus'
import { useG } from '../../../i18n/gender'
import WordArtPlate from './WordArtPlate'

/**
 * VocabStudyBand — the ONE surface at the top of the vocabulary section.
 *
 * WHY THIS REPLACED THREE PANELS
 * The section used to open with a sticky hero (a 200px ring reading «٠%»), then a
 * «رحلة المفردات» lane (a chunk-size selector plus locked, padlocked group cards),
 * then a filter bar — 1.2 screens on a laptop and 1.55 on a phone before the
 * student reached a single word. Those panels also disagreed with each other:
 * four different counts of the same 32 words, and three separate progress rings.
 *
 * A vocabulary section is not a dashboard, it is a queue. So this band answers
 * exactly three questions, once each:
 *   what is here      → one count line
 *   where am I        → one segmented meter, the three states in their real shares
 *   what do I do now  → one primary action, with the next word shown as itself
 *
 * The next word is drawn as a real specimen plate rather than named in a 12px
 * subtitle under the button — the old CTA rendered as «ابدأ كلمة جديدة» with a
 * bare, unexplained "goal" beneath it, which reads as broken copy rather than as
 * the word you are about to learn.
 */
export default function VocabStudyBand({
  unitId,
  studentId,
  totalWords,
  masteredCount,
  learningCount,
  sessionSize = 10,
  session,
  onEndSession,
  getWordById,
  fallbackNextWord,
  onStartSession,
  onOpenWord,
}) {
  const g = useG()
  const navigate = useNavigate()
  const { data: status } = useUnitVocabStatus(unitId, studentId)

  const total = totalWords || status?.totalWords || 0
  const mastered = masteredCount ?? status?.masteredWords ?? 0
  const learning = learningCount ?? status?.learningWords ?? 0
  const fresh = Math.max(total - mastered - learning, 0)
  const due = status?.dueForReviewToday ?? 0
  const done = total > 0 && mastered >= total

  const action = status?.continueAction
  // The status hook returns only { vocabularyId, word }; the plate is hued by
  // part of speech, so enrich from the list the tab already holds in memory.
  // The hook only names a word when its own decision tree lands on 'next_word'
  // (it returns 'start_exploration' once the daily new-card allowance is used).
  // The band must still show WHICH word is next, so fall back to the first word
  // the student has not mastered — the same one «ابدأ جلسة» will open.
  // The plate must show the word the CTA will actually open, so the word the
  // session picks wins over the hook's own suggestion — otherwise the band
  // promises «التالية: dolphin» and the button opens «creature».
  const rawNext = action?.target === 'next_word' ? action.payload : null
  const nextFull = fallbackNextWord || (rawNext?.vocabularyId ? getWordById?.(rawNext.vocabularyId) : null)
  const nextWord = nextFull ? { vocabularyId: nextFull.id, word: nextFull.word, part_of_speech: nextFull.part_of_speech } : null
  const remaining = Math.max(total - mastered, 0)
  const batch = Math.min(sessionSize, remaining)

  const pct = (n) => (total > 0 ? (n / total) * 100 : 0)

  // A session has to end somewhere. Rather than adding another panel, the band
  // itself reports the session it just ran — same slot, no layout shift.
  const justFinished = session?.finished
  const covered = justFinished ? Math.min(session.i + 1, session.ids.length) : 0
  const gained = justFinished ? Math.max(mastered - (session.startMastered ?? mastered), 0) : 0

  const headline = done
    ? g('أتقنت كل كلمات الوحدة', 'أتقنتِ كل كلمات الوحدة')
    : mastered === 0
      ? `${total} كلمة في هذه الوحدة`
      : `${g('أتقنت', 'أتقنتِ')} ${mastered} من ${total} كلمة`

  return (
    <div
      dir="rtl"
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(56,189,248,0.07) 0%, rgba(129,140,248,0.05) 55%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* One quiet bloom so the band reads as lit glass, never as a flat panel. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 88% 8%, rgba(56,189,248,0.16) 0%, transparent 58%)' }}
      />

      {justFinished ? (
        <div className="relative p-5 flex flex-col md:flex-row md:items-center gap-4" dir="rtl">
          <span
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(34,197,94,0.14)', color: '#4ade80' }}
          >
            <PartyPopper size={22} />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white font-['Tajawal']">{g('خلصت الجلسة', 'خلّصتِ الجلسة')}</h3>
            <p className="text-[13px] text-white/55 font-['Tajawal'] mt-0.5">
              {g('راجعت', 'راجعتِ')} <span className="text-white font-bold tabular-nums">{covered}</span>{' '}
              {covered === 1 ? 'كلمة' : covered === 2 ? 'كلمتين' : covered <= 10 ? 'كلمات' : 'كلمة'}
              {gained > 0 && (
                <> · {g('أتقنت', 'أتقنتِ')} <span className="text-emerald-300 font-bold tabular-nums">{gained}</span> {g('جديدة', 'جديدة')}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {remaining > 0 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => { onEndSession?.(); onStartSession?.() }}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold font-['Tajawal']"
                style={{ background: 'linear-gradient(135deg,#38bdf8 0%,#6366f1 100%)', color: '#04121f' }}
              >
                <Sparkles size={16} /> {g('جلسة أخرى', 'جلسة أخرى')}
              </motion.button>
            )}
            <button
              type="button"
              onClick={onEndSession}
              className="h-11 px-4 rounded-xl text-[13px] font-bold font-['Tajawal'] transition-colors hover:bg-white/[0.06]"
              style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {g('تمام', 'تمام')}
            </button>
          </div>
        </div>
      ) : (
      <div className="relative flex flex-col-reverse md:flex-row md:items-stretch gap-4 p-4 md:p-5">
        {/* ── the words ── */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-wide text-sky-300/70 font-['Tajawal']">مفردات الوحدة</p>
            <h3 className="text-lg md:text-xl font-bold text-white font-['Tajawal'] leading-snug mt-0.5">
              {headline}
            </h3>

            {/* One meter, three real shares — replaces three separate rings that
                each showed a different denominator. On an untouched unit every
                segment is zero, so the bar would render as a bare grey rule
                saying nothing; there the three counts below carry it alone. */}
            {(mastered > 0 || learning > 0) && (
            <div
              className="mt-3 h-2.5 rounded-full overflow-hidden flex"
              style={{ background: 'rgba(255,255,255,0.09)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.35)' }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(mastered)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{ background: 'linear-gradient(90deg,#22c55e,#4ade80)' }}
              />
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct(learning)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                style={{ background: 'linear-gradient(90deg,#f59e0b,#fbbf24)' }}
              />
            </div>
            )}
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              {[
                { n: mastered, label: g('أتقنتها', 'أتقنتِها'), c: '#4ade80' },
                { n: learning, label: g('تتعلمها', 'تتعلمينها'), c: '#fbbf24' },
                { n: fresh, label: 'جديدة', c: 'rgba(255,255,255,0.25)' },
              ].map((s) => (
                <span key={s.label} className="flex items-center gap-1.5 text-[11px] font-['Tajawal'] text-white/45">
                  <i className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }} />
                  <span className="tabular-nums text-white/70 font-bold">{s.n}</span> {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── the one action ── */}
          <div className="flex items-center gap-2 flex-wrap">
            {done ? (
              <span
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-sm font-bold font-['Tajawal']"
                style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}
              >
                <PartyPopper size={16} /> {g('أنهيت الوحدة', 'أنهيتِ الوحدة')}
              </span>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                whileHover={{ y: -1 }}
                onClick={onStartSession}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-bold font-['Tajawal'] flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg,#38bdf8 0%,#6366f1 100%)',
                  color: '#04121f',
                  boxShadow: '0 10px 26px rgba(56,189,248,0.28)',
                }}
              >
                <Sparkles size={16} />
                {g('ابدأ جلسة', 'ابدئي جلسة')} · {batch} {batch === 2 ? 'كلمتان' : batch <= 10 ? 'كلمات' : 'كلمة'}
              </motion.button>
            )}

            {due > 0 && (
              <button
                type="button"
                onClick={() => navigate('/student/srs')}
                className="inline-flex items-center gap-2 h-11 px-4 rounded-xl text-[13px] font-bold font-['Tajawal'] flex-shrink-0 transition-colors hover:bg-white/[0.06]"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <RotateCcw size={15} /> {g('راجع', 'راجعي')} {due}
              </button>
            )}
          </div>
        </div>

        {/* ── the next word, as itself ── */}
        {nextWord?.word && !done && (
          <button
            type="button"
            onClick={() => onOpenWord?.(nextWord.vocabularyId)}
            aria-label={`ابدأ بكلمة ${nextWord.word}`}
            className="group relative rounded-xl overflow-hidden flex-shrink-0 w-full md:w-[240px] aspect-[21/9] md:aspect-[16/11]"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <WordArtPlate
              word={nextWord.word}
              partOfSpeech={nextWord.part_of_speech}
              style={{ position: 'absolute', inset: 0 }}
            />
            <span
              className="absolute bottom-0 inset-x-0 flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-bold font-['Tajawal'] text-white/85"
              style={{ background: 'linear-gradient(transparent, rgba(4,12,24,0.85))' }}
            >
              {g('التالية', 'التالية')}
              <ChevronLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            </span>
          </button>
        )}
      </div>
      )}
    </div>
  )
}
