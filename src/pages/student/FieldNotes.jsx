// «دفتر الميدان» — Field Notes.
//
// Every note here is one real correction from the student's OWN working life — a
// client thread, a meeting, a work email — captured by her trainer. Not curriculum.
// The engine is generic and owner-scoped (students.uses_field_notes + RLS); this
// file contains no per-student anything.
//
// Grading is 100% local: the app's existing validateAnswer(). There is no runtime
// model call anywhere in this feature — every rule, hint and alternative was written
// in advance and lives in the row.
//
// Tone rule: no timers, no streaks, no red scores. This is her own mistake from her
// own job; the surface stays calm and adult.
import { useState, useMemo, useCallback } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  NotebookPen, ChevronDown, ArrowLeft, Check, Target, Sparkles, Lightbulb, Inbox,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useG } from '../../i18n/gender'
import { validateAnswer } from '../../utils/answerValidator'
import './fieldNotes.css'

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

const STATUS_AR = { new: 'جديدة', practicing: 'تحت التمرين', mastered: 'أتقنتها' }

// Trainer-written Arabic routinely embeds English fragments ("films are",
// "consider + -ing"). Left bare inside an RTL paragraph the bidi algorithm drags
// the neutral characters around them — arrows, colons, brackets — to the wrong
// edge, which is how «أكثر → are» rendered as «are ←» alone on the next line.
// Isolating each Latin run in <bdi> pins it, and fixes every future note without
// the trainer ever having to think about text direction.
const LATIN_RUN = /([A-Za-z][A-Za-z0-9'’\-.,+/()]*(?:\s+[A-Za-z][A-Za-z0-9'’\-.,+/()]*)*)/g
function Bidi({ text }) {
  if (!text) return null
  return String(text).split(LATIN_RUN).map((part, i) => (
    i % 2 === 1 ? <bdi key={i}>{part}</bdi> : <span key={i}>{part}</span>
  ))
}

/** A note is waiting for her when it isn't mastered and isn't resting. */
export function isNoteDue(n) {
  if (!n || n.status === 'mastered') return false
  return !n.next_review_at || new Date(n.next_review_at) <= new Date()
}

const byOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)

// Gregorian month names written out, not Intl: ar-SA resolves to the Hijri
// calendar by default, and this platform is Gregorian everywhere.
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
function arDate(iso) {
  if (!iso) return null
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return `${toAr(d)} ${MONTHS_AR[m - 1]} ${toAr(y)}`
}

/** Arabic counted-noun agreement: 1 ملاحظة · 2 ملاحظتان · 3–10 ملاحظات · 11+ ملاحظة */
function countNotes(n) {
  if (n === 1) return 'ملاحظة واحدة'
  if (n === 2) return 'ملاحظتان'
  if (n <= 10) return `${toAr(n)} ملاحظات`
  return `${toAr(n)} ملاحظة`
}

/** One field session = one real conversation. Group by it instead of repeating
 *  the same context line under all ten cards. */
function groupByContext(notes) {
  const map = new Map()
  for (const n of notes) {
    const key = `${n.context_label || ''}|${n.occurred_on || ''}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: n.context_label || 'ملاحظات من شغلك',
        date: arDate(n.occurred_on),
        items: [],
      })
    }
    map.get(key).items.push(n)
  }
  return [...map.values()]
}

// ── module scope on purpose ────────────────────────────────────────────────
// Declared inside FieldNotes() these would be a brand-new component type on every
// render, so React would unmount and remount the runner on each keystroke — eating
// the input. Same bug class that broke the class-recap answer inputs.

// Exported so the trainer console can preview a note with the EXACT markup and CSS
// the student gets — a preview built from a second copy of the markup drifts.
export function NoteCard({ note, open, onToggle, onPractice, g }) {
  const exercises = [...(note.field_note_exercises || [])].sort(byOrder)
  return (
    <div className="fnx-note" data-open={open}>
      <button
        className="fnx-note__head"
        onClick={onToggle}
        aria-expanded={open}
      >
        <div className="fnx-note__t">
          <h3>{note.rule_title_ar}</h3>
          {/* Collapsed, a card used to show only a grammar label — a table of
              contents with no substance. The correction itself is the content. */}
          {!open && (
            <span className="fnx-note__prev" dir="ltr">
              {note.original_text && <s>{note.original_text}</s>}
              <b>{note.corrected_text}</b>
            </span>
          )}
        </div>
        <span className="fnx-pill" data-s={note.status}>{STATUS_AR[note.status] || ''}</span>
        <ChevronDown size={17} className="fnx-note__chev" aria-hidden="true" />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="fnx-note__body">
              {note.original_text && (
                <div className="fnx-row fnx-row--wrong">
                  <span className="fnx-row__k">{g('ما كتبتَه', 'ما كتبتِه')}</span>
                  <p className="fnx-row__v fnx-en">{note.original_text}</p>
                </div>
              )}

              <div className="fnx-row fnx-row--right">
                <span className="fnx-row__k">الصح</span>
                <p className="fnx-row__v fnx-en">{note.corrected_text}</p>
              </div>

              {note.natural_text && (
                <div className="fnx-row fnx-row--natural">
                  <span className="fnx-row__k">الأطبع — الأقرب للناطق الأصلي</span>
                  <p className="fnx-row__v fnx-en">{note.natural_text}</p>
                </div>
              )}

              <div className="fnx-rule">
                <h4>{note.rule_title_ar}</h4>
                <p><Bidi text={note.rule_explanation_ar} /></p>
                {note.why_it_matters_ar && (
                  <p className="fnx-why">ليه يفرق: <Bidi text={note.why_it_matters_ar} /></p>
                )}
              </div>

              {exercises.length > 0 && (
                <button className="fnx-cta" onClick={() => onPractice(note)}>
                  <Target size={16} aria-hidden="true" />
                  تمرين
                  {/* NOT «تمرين · ٤» — a middot next to an Arabic-Indic numeral
                      reads as part of it, so that rendered as «تمرين ٤٠». */}
                  <b className="fnx-cta__n">{toAr(exercises.length)}</b>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Runner({ note, onExit, onRecord, g }) {
  const exercises = useMemo(
    () => [...(note.field_note_exercises || [])].sort(byOrder),
    [note],
  )
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [picked, setPicked] = useState(null)
  const [phase, setPhase] = useState('answer')   // answer | retry | reveal | right | done
  const [finalStatus, setFinalStatus] = useState(null)

  const ex = exercises[idx]
  const options = Array.isArray(ex?.options) ? ex.options : null

  const settle = useCallback(async (response, correct) => {
    const res = await onRecord({ exerciseId: ex.id, response, correct })
    if (idx === exercises.length - 1) setFinalStatus(res?.status ?? null)
  }, [ex, idx, exercises.length, onRecord])

  const check = useCallback(async (raw) => {
    const response = (raw ?? value ?? '').trim()
    if (!response) return
    // TYPED answers go through the app's validateAnswer (tolerant of spacing,
    // separators, contractions — the behaviour every other exercise surface has).
    //
    // A PICKED answer is graded by identity instead, and deliberately so: the
    // options are the exact stored strings, and validateAnswer is punctuation- and
    // case-insensitive, so it scores "dont" as a correct pick for "don't" — which
    // would silently pass the very notes that exist to teach apostrophes and
    // capitals. Choosing is a selection, not a typing test; identity is the
    // correct comparison for it.
    const correct = options
      ? response === ex.answer
      : validateAnswer(response, ex.answer, {
        allowPartial: ex.kind === 'correct_the_error',
        originalSentence: ex.kind === 'correct_the_error' ? ex.prompt : undefined,
      })
    if (options) setPicked(response)
    await settle(response, correct)
    if (correct) setPhase('right')
    else setPhase(phase === 'answer' ? 'retry' : 'reveal')
  }, [value, ex, options, phase, settle])

  const retry = useCallback(() => { setValue(''); setPicked(null); setPhase('retry_open') }, [])

  const next = useCallback(() => {
    if (idx < exercises.length - 1) {
      setIdx((i) => i + 1); setValue(''); setPicked(null); setPhase('answer')
    } else {
      setPhase('done')
    }
  }, [idx, exercises.length])

  // ── all hooks above every conditional return ──
  if (!ex && phase !== 'done') return null

  if (phase === 'done') {
    return (
      <div className="fnx-run">
        <div className="fnx-done">
          <div className="fnx-done__ico"><Check size={26} aria-hidden="true" /></div>
          <h3>{g('أنهيت التمرين', 'أنهيتِ التمرين')}</h3>
          <p>
            {finalStatus === 'mastered'
              ? 'هذي الملاحظة صارت في «أتقنتها». بتبقى موجودة في دفترك — ما تنحذف أبداً.'
              : 'بترجع لك هذي الملاحظة بعد كم يوم عشان تثبت. التكرار على فترات هو اللي يثبّتها فعلاً.'}
          </p>
          <div className="fnx-actions" style={{ justifyContent: 'center' }}>
            <button className="fnx-cta" onClick={onExit}>رجوع للدفتر</button>
          </div>
        </div>
      </div>
    )
  }

  const answering = phase === 'answer' || phase === 'retry_open'
  const pct = Math.round((idx / exercises.length) * 100)

  return (
    <div className="fnx-run">
      <div className="fnx-run__top">
        <button className="fnx-cta fnx-cta--ghost" onClick={onExit}>
          <ArrowLeft size={15} aria-hidden="true" /> رجوع
        </button>
        <span className="fnx-run__step">{toAr(idx + 1)} من {toAr(exercises.length)}</span>
      </div>
      <div className="fnx-run__bar"><i style={{ width: `${pct}%` }} /></div>

      <h3>{note.rule_title_ar}</h3>
      <p className="fnx-run__prompt" dir={/[A-Za-z]/.test(ex.prompt[0]) ? 'ltr' : 'rtl'}>{ex.prompt}</p>

      {options ? (
        <div className="fnx-opts">
          {options.map((opt) => {
            let state = null
            if (!answering && picked === opt) state = phase === 'right' ? 'right' : 'wrong'
            if (phase === 'reveal' && opt === ex.answer) state = 'right'
            return (
              <button
                key={opt}
                className="fnx-opt"
                data-state={state || undefined}
                disabled={!answering}
                onClick={() => check(opt)}
              >
                {opt}
              </button>
            )
          })}
        </div>
      ) : (
        <input
          className="fnx-input"
          value={value}
          disabled={!answering}
          placeholder={g('اكتب إجابتك بالإنجليزي', 'اكتبي إجابتك بالإنجليزي')}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && answering) check() }}
        />
      )}

      {phase === 'right' && (
        <div className="fnx-verdict" data-v="right">{g('أحسنت', 'أحسنتِ')} — هذي هي.</div>
      )}

      {phase === 'retry' && (
        <div className="fnx-verdict" data-v="wrong">
          <Lightbulb size={15} aria-hidden="true" style={{ verticalAlign: '-2px', marginInlineEnd: 6 }} />
          <Bidi text={ex.hint_ar || 'راجعي القاعدة فوق وجربي مرة ثانية.'} />
        </div>
      )}

      {phase === 'reveal' && (
        <div className="fnx-verdict" data-v="reveal">
          الإجابة:
          <b dir="ltr">{ex.answer}</b>
          <em><Bidi text={`${note.rule_title_ar} — ${note.rule_explanation_ar.split('.')[0]}.`} /></em>
        </div>
      )}

      <div className="fnx-actions">
        {answering && !options && (
          <button className="fnx-cta" onClick={() => check()} disabled={!value.trim()}>
            {g('تحقّق', 'تحقّقي')}
          </button>
        )}
        {phase === 'retry' && (
          <button className="fnx-cta" onClick={retry}>{g('جرّب مرة ثانية', 'جرّبي مرة ثانية')}</button>
        )}
        {(phase === 'right' || phase === 'reveal') && (
          <button className="fnx-cta" onClick={next}>
            {idx < exercises.length - 1 ? 'التالي' : 'إنهاء'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function FieldNotes() {
  // profile.id — NOT user.id. Under admin impersonation the profile is swapped to
  // the viewed student while user.id stays the admin's, so user.id would read the
  // admin's (empty) notebook and, worse, write attempts against the wrong owner.
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const g = useG()
  const qc = useQueryClient()
  const [tab, setTab] = useState('due')
  const [openId, setOpenId] = useState(null)
  const [running, setRunning] = useState(null)

  const { data: notes, isLoading } = useQuery({
    queryKey: ['field-notes', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_notes')
        .select('*, field_note_exercises(*)')
        .eq('student_id', profile.id)
        .eq('is_published', true)
        .order('occurred_on', { ascending: false, nullsFirst: false })
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  const record = useMutation({
    mutationFn: async ({ exerciseId, response, correct }) => {
      const { data, error } = await supabase.rpc('record_field_note_attempt', {
        p_exercise_id: exerciseId, p_response: response, p_is_correct: correct,
      })
      if (error) throw error
      return Array.isArray(data) ? data[0] : data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['field-notes', profile?.id] }),
  })

  const onRecord = useCallback(async (payload) => {
    try { return await record.mutateAsync(payload) } catch { return null }
  }, [record])

  const all = useMemo(() => notes || [], [notes])
  const due = useMemo(() => all.filter(isNoteDue), [all])
  const mastered = useMemo(() => all.filter((n) => n.status === 'mastered'), [all])
  const shown = tab === 'due' ? due : tab === 'mastered' ? mastered : all
  const pct = all.length ? Math.round((mastered.length / all.length) * 100) : 0

  const onPractice = useCallback((note) => {
    setRunning(note)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const exitRunner = useCallback(() => setRunning(null), [])

  // ── all hooks above every conditional return ──
  const live = running ? (all.find((n) => n.id === running.id) || running) : null

  return (
    <div className="fnx-root">
      <div className="fnx-world" aria-hidden="true"><i /><i /><i /></div>

      <div className="fnx-wrap">
        {live ? (
          <Runner key={live.id} note={live} onExit={exitRunner} onRecord={onRecord} g={g} />
        ) : (
          <>
            <header className="fnx-hero">
              <span className="fnx-hero__k"><NotebookPen size={13} aria-hidden="true" /> من ميدانك</span>
              <h1>دفتر الميدان</h1>
              <p>ملاحظاتك من محادثاتك الحقيقية — كل ملاحظة غلط أو تحسين صار فعلاً في شغلك، مع القاعدة وتمرين عليها.</p>

            </header>

            {/* One control, not two. The hero used to carry a three-number strip
                that repeated these exact counts a row above the tabs. */}
            <div className="fnx-controls">
              <div className="fnx-tabs" role="tablist">
                {[
                  ['due', 'للمراجعة', due.length],
                  ['all', 'الكل', all.length],
                  ['mastered', 'أتقنتها', mastered.length],
                ].map(([k, label, n]) => (
                  <button
                    key={k} className="fnx-tab" role="tab"
                    aria-selected={tab === k} onClick={() => setTab(k)}
                  >
                    {label}<b>{toAr(n)}</b>
                  </button>
                ))}
              </div>

              {mastered.length > 0 && (
                <div className="fnx-meter">
                  <div className="fnx-ring" style={{ '--p': pct }}><span>{toAr(pct)}٪</span></div>
                  <span>أتقنتِ {toAr(mastered.length)} من {toAr(all.length)}</span>
                </div>
              )}
            </div>

            {isLoading ? null : shown.length === 0 ? (
              <div className="fnx-empty">
                {tab === 'due'
                  ? <><Sparkles size={30} aria-hidden="true" /><p>ما في شي للمراجعة اليوم. كل ملاحظاتك ترتاح الحين — بترجع لك في وقتها.</p></>
                  : tab === 'mastered'
                    ? <><Target size={30} aria-hidden="true" /><p>ما أتقنتِ ملاحظة كاملة بعد. الملاحظة تنتقل هنا بعد جلستين نظيفتين بينهما أيام.</p></>
                    : <><Inbox size={30} aria-hidden="true" /><p>دفترك فاضي الحين. أول ما يرصد مدربك ملاحظة من شغلك، بتلقينها هنا.</p></>}
              </div>
            ) : (
              groupByContext(shown).map((grp) => (
                <section className="fnx-group" key={grp.key}>
                  <header className="fnx-group__h">
                    <span className="fnx-group__dot" aria-hidden="true" />
                    <div className="fnx-group__t">
                      <h2>{grp.label}</h2>
                      {grp.date && <span>{grp.date}</span>}
                    </div>
                    <span className="fnx-group__rule" aria-hidden="true" />
                    <span className="fnx-group__n">{countNotes(grp.items.length)}</span>
                  </header>
                  <div className="fnx-list">
                    {grp.items.map((n) => (
                      <NoteCard
                        key={n.id} note={n} g={g}
                        open={openId === n.id}
                        onToggle={() => setOpenId(openId === n.id ? null : n.id)}
                        onPractice={onPractice}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
