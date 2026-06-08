import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2, Loader2, Sparkles, Star } from 'lucide-react'
import { getStop, addCard, applyRating, RATING } from '@/services/vocab'
import { pronounceWord } from '@/lib/audio/pronounceWord'
import { toArabicNum } from '@/lib/vocabFormat'
import { useAuthStore } from '@/stores/authStore'

// local word-key for de-duping beats (lowercase + strip outer non-letters)
const norm = (s) => String(s || '').toLowerCase().trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')

// safe (no-regex) highlighter — bolds the target word inside the example
function HighlightExample({ text, word }) {
  if (!text) return null
  const w = (word || '').toLowerCase()
  if (!w) return <>{text}</>
  const lower = text.toLowerCase()
  const parts = []
  let i = 0
  let key = 0
  while (i < text.length) {
    const found = lower.indexOf(w, i)
    if (found === -1) {
      parts.push(<span key={key++}>{text.slice(i)}</span>)
      break
    }
    if (found > i) parts.push(<span key={key++}>{text.slice(i, found)}</span>)
    parts.push(
      <strong key={key++} style={{ color: 'var(--vc-gold, #e9b949)', fontWeight: 700 }}>
        {text.slice(found, found + w.length)}
      </strong>
    )
    i = found + w.length
  }
  return <>{parts}</>
}

/**
 * One stop on the Path of Light — a single flowing micro-session that blends
 * the old four modes into one: discover new stars → recall folded-in reviews →
 * repair struggling words → constellation lights up.
 */
export default function JourneyStop({ profileId, unitId, constellationIndex, themeAr, onClose, onComplete }) {
  const [loading, setLoading] = useState(true)
  const [beats, setBeats] = useState([])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [phase, setPhase] = useState('play') // play | done
  const [learned, setLearned] = useState(0)
  const mountedRef = useRef(true)
  // Admin "view as student" is a client-side profile swap — the Supabase session
  // is still the admin's. Writing here would silently fail (RLS) or, worse, save the
  // word onto the ADMIN's own vocab (vocab_add_card derives the student from
  // auth.uid()). So in preview we walk the flow but never persist.
  const impersonating = useAuthStore((s) => !!s.impersonation)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // Lock background scroll while this full-screen stop is open. The stop is
  // portaled to <body> (see the return) so its `fixed inset-0` always covers
  // the viewport instead of getting trapped low in the scrolling page.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // load + assemble the beat queue
  useEffect(() => {
    let alive = true
    setLoading(true)
    getStop(profileId, unitId, constellationIndex)
      .then((stop) => {
        if (!alive) return
        const seen = new Set()
        const out = []
        const push = (b) => {
          const k = norm(b.word)
          if (!k || seen.has(k)) return
          seen.add(k)
          out.push(b)
        }
        // 1) discover — constellation words the student hasn't practiced yet.
        // Already-studied words (learning/mastered) are skipped here; they come
        // back through the recall channel below when they're actually due, so a
        // re-visited constellation surfaces only the genuinely-new words.
        for (const w of stop.new || []) {
          if (w.card && w.card.mastery_level !== 'new') continue
          push({
            kind: 'discover',
            word: w.word,
            meaningAr: w.definition_ar,
            meaningEn: w.definition_en,
            example: w.example_sentence,
            ipa: w.pronunciation_ipa,
            cvId: w.curriculum_vocabulary_id,
            cardId: w.card?.id || null,
          })
        }
        // 2) recall — folded-in due reviews from anywhere
        for (const w of stop.review || []) {
          push({
            kind: 'recall',
            word: w.word,
            meaningAr: w.meaning_ar,
            meaningEn: w.definition_en,
            example: w.example_sentence,
            ipa: w.pronunciation_ipa,
            cvId: w.curriculum_vocabulary_id,
            cardId: w.id,
          })
        }
        // 3) repair — a couple of struggling stars
        for (const w of stop.hard || []) {
          push({
            kind: 'recall',
            word: w.word,
            meaningAr: w.meaning_ar,
            meaningEn: w.definition_en,
            example: w.example_sentence,
            ipa: null,
            cvId: w.curriculum_vocabulary_id,
            cardId: w.id,
          })
        }
        setBeats(out)
        setLoading(false)
        if (out.length === 0) setPhase('done')
      })
      .catch(() => {
        if (alive) { setBeats([]); setLoading(false); setPhase('done') }
      })
    return () => { alive = false }
  }, [profileId, unitId, constellationIndex])

  const beat = beats[idx]
  const progress = beats.length ? (idx) / beats.length : 0

  const playAudio = () => {
    if (!beat?.word) return
    pronounceWord(beat.word, { studentId: profileId }).catch(() => {})
  }
  // auto-play on each new discover beat
  useEffect(() => {
    if (phase === 'play' && beat?.kind === 'discover' && beat?.word) {
      pronounceWord(beat.word, { studentId: profileId }).catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase])

  async function rate(rating) {
    if (saving || !beat) return
    setSaving(true)
    try {
      if (impersonating) {
        // preview only — advance the UI, persist nothing
        if (rating >= RATING.GOOD) setLearned((n) => n + 1)
      } else {
        let cardId = beat.cardId
        if (!cardId) {
          const card = await addCard(profileId, {
            word: beat.word,
            curriculumVocabularyId: beat.cvId,
            meaningAr: beat.meaningAr,
            meaningEn: beat.meaningEn,
            contextSentence: beat.example,
            source: 'curriculum',
          })
          cardId = card?.id
        }
        if (cardId) await applyRating(cardId, rating, profileId)
        if (rating >= RATING.GOOD) setLearned((n) => n + 1)
      }
    } catch {
      // non-blocking — the word simply re-surfaces in a later stop
    } finally {
      if (!mountedRef.current) return
      setSaving(false)
      if (idx + 1 < beats.length) {
        setIdx(idx + 1)
        setRevealed(false)
      } else {
        setPhase('done')
      }
    }
  }

  return createPortal(
    <div
      // NOTE: position/inset/z-index are set INLINE on purpose. The `.vocab-cosmos`
      // class carries `position: relative` (needed for the page starfield), and it
      // loads after Tailwind's utilities — so a `fixed` utility class here loses the
      // specificity tie and the full-screen session collapses to in-flow `relative`,
      // landing far below the fold (invisible). Inline styles win unconditionally.
      className="vocab-cosmos flex flex-col"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 9999,
        background: 'var(--vc-bg, #0a0e27)',
      }}
      dir="rtl"
    >
      {/* starfield */}
      <div className="vc-field" aria-hidden="true">
        <div className="vc-stars" />
        <div className="vc-nebula vc-nebula-a" />
        <div className="vc-nebula vc-nebula-b" />
      </div>

      <div className="vc-content flex flex-col h-full" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* header */}
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(129,140,248,0.14)', color: '#c7d2fe' }}
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
          {/* progress bar */}
          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(129,140,248,0.16)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(to left, #e9b949, #6366f1)' }}
              animate={{ width: `${Math.round((phase === 'done' ? 1 : progress) * 100)}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
          <span className="shrink-0 text-[12px] tabular-nums" style={{ color: 'rgba(199,210,254,0.7)' }}>
            {toArabicNum(Math.min(idx + (phase === 'done' ? 0 : 1), beats.length))}/{toArabicNum(beats.length)}
          </span>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 flex items-center justify-center">
          {loading ? (
            <Loader2 size={28} className="animate-spin" style={{ color: '#a5b4fc' }} />
          ) : phase === 'done' ? (
            <StopComplete themeAr={themeAr} touched={beats.length} learned={learned} onComplete={onComplete} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.28 }}
                className="w-full max-w-md"
              >
                <div className="vc-card" style={{ padding: '28px 22px' }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span
                      className="text-[11.5px] font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        background: beat?.kind === 'discover' ? 'rgba(129,140,248,0.18)' : 'rgba(233,185,73,0.16)',
                        color: beat?.kind === 'discover' ? '#a5b4fc' : '#e9b949',
                      }}
                    >
                      {beat?.kind === 'discover' ? 'كلمة جديدة' : 'مراجعة'}
                    </span>
                  </div>

                  {/* word */}
                  <div className="text-center mt-3">
                    <div className="flex items-center justify-center gap-3">
                      <span className="vc-word" style={{ fontSize: 38, lineHeight: 1.1 }}>{beat?.word}</span>
                      <button
                        type="button"
                        onClick={playAudio}
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(129,140,248,0.16)', color: '#a5b4fc' }}
                        aria-label="استماع"
                      >
                        <Volume2 size={18} />
                      </button>
                    </div>
                    {beat?.ipa && (
                      <p className="text-[14px] mt-1 font-mono" style={{ color: 'rgba(199,210,254,0.6)' }}>
                        {beat.ipa}
                      </p>
                    )}
                  </div>

                  {!revealed ? (
                    <button
                      type="button"
                      onClick={() => setRevealed(true)}
                      className="vc-btn vc-btn-primary w-full mt-7"
                      style={{ height: 50, fontSize: 15, fontWeight: 700 }}
                    >
                      {beat?.kind === 'discover' ? 'اعرفي المعنى' : 'اعرضي الإجابة'}
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="mt-5 text-center">
                        <p
                          className="text-[24px] font-bold leading-snug"
                          style={{ color: 'var(--vc-gold, #e9b949)', fontFamily: "'Tajawal', sans-serif" }}
                        >
                          {beat?.meaningAr || beat?.meaningEn || '—'}
                        </p>
                        {beat?.example && (
                          <p
                            className="text-[14.5px] mt-3 leading-relaxed"
                            dir="ltr"
                            style={{ color: 'rgba(244,245,255,0.82)' }}
                          >
                            <HighlightExample text={beat.example} word={beat.word} />
                          </p>
                        )}
                      </div>

                      {/* ratings */}
                      <div className="mt-6">
                        {beat?.kind === 'discover' ? (
                          <div className="grid grid-cols-2 gap-3">
                            <RateBtn label="صعبة" color="#f59e0b" disabled={saving} onClick={() => rate(RATING.HARD)} />
                            <RateBtn label="عرفتها ✓" color="#34d399" gold disabled={saving} onClick={() => rate(RATING.GOOD)} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2.5">
                            <RateBtn label="نسيت" color="#f87171" disabled={saving} onClick={() => rate(RATING.AGAIN)} />
                            <RateBtn label="صعبة" color="#f59e0b" disabled={saving} onClick={() => rate(RATING.HARD)} />
                            <RateBtn label="جيدة" color="#a5b4fc" disabled={saving} onClick={() => rate(RATING.GOOD)} />
                            <RateBtn label="سهلة" color="#34d399" disabled={saving} onClick={() => rate(RATING.EASY)} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function RateBtn({ label, color, gold, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl flex items-center justify-center transition-transform active:translate-y-px"
      style={{
        height: 50,
        fontSize: 15,
        fontWeight: 700,
        fontFamily: "'Tajawal', sans-serif",
        color: gold ? '#1b1505' : color,
        background: gold
          ? 'linear-gradient(135deg, #fde68a, #e9b949)'
          : `color-mix(in srgb, ${color} 16%, transparent)`,
        border: gold ? 'none' : `1px solid color-mix(in srgb, ${color} 40%, transparent)`,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}

function StopComplete({ themeAr, touched, learned, onComplete }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-sm text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 14 }}
        className="mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #fde68a, #e9b949 70%)',
          boxShadow: '0 0 44px rgba(233,185,73,0.6)',
        }}
      >
        <Star size={44} strokeWidth={2} style={{ color: '#3b2f0b', fill: '#3b2f0b' }} />
      </motion.div>

      <div className="flex items-center justify-center gap-2 mb-1">
        <Sparkles size={16} style={{ color: '#e9b949' }} />
        <span className="text-[14px] font-bold" style={{ color: '#e9b949' }}>كوكبة مضيئة</span>
      </div>
      <h2
        className="text-[24px] font-bold leading-snug"
        style={{ color: 'var(--vc-text, #f4f5ff)', fontFamily: "'Tajawal', sans-serif" }}
      >
        {touched > 0 ? `${themeAr} — أضأتِ نجوماً جديدة` : `${themeAr} مضيئة بالفعل`}
      </h2>
      <p className="text-[14px] mt-2" style={{ color: 'rgba(199,210,254,0.8)' }}>
        {touched > 0
          ? `راجعتِ ${toArabicNum(touched)} كلمة · تثبّت ${toArabicNum(learned)} في سمائك`
          : 'كل كلمات هذه الكوكبة محفوظة — تابعي رحلتك'}
      </p>

      <button
        type="button"
        onClick={onComplete}
        className="vc-btn vc-btn-gold w-full mt-7"
        style={{ height: 52, fontSize: 16, fontWeight: 700 }}
      >
        أكملي الرحلة
      </button>
    </motion.div>
  )
}
