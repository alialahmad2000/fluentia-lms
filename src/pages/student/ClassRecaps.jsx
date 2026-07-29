import { useState, useMemo, useEffect } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  NotebookText, ArrowLeft, Check, Send, Loader2, CalendarDays, CheckCircle2, RotateCcw,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { validateAnswer } from '../../utils/answerValidator'
import { useG } from '../../i18n/gender'
import LessonSection from './exercises/LessonSection'
import './classRecaps.css'

const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

const acceptedOf = (q) => (q.accepted_answers?.length ? q.accepted_answers : [q.correct_answer])

// Drafts survive a refresh — a 30-question section is long enough that losing
// answers mid-way would be the difference between finishing and abandoning.
const draftKey = (sid, rid, key) => `fluentia_recap_${sid || 'anon'}_${rid}_${key}`

/**
 * «ملخّص الحصص» — one entry per live class, split into sections. Each section
 * teaches (LessonSection, the same renderer the targeted worksheets use) and then
 * tests, graded locally by validateAnswer — no AI, so it can never fail or cost.
 */
export default function ClassRecaps() {
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const g = useG()
  const qc = useQueryClient()
  const [openRecap, setOpenRecap] = useState(null)
  const [openSection, setOpenSection] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['class-recaps', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [{ data: recaps, error }, { data: progress }] = await Promise.all([
        supabase.from('class_recaps').select('*').eq('student_id', profile.id).order('class_no'),
        supabase.from('class_recap_progress').select('*').eq('student_id', profile.id),
      ])
      if (error) throw error
      const byKey = {}
      for (const r of progress || []) byKey[`${r.recap_id}::${r.section_key}`] = r
      return { recaps: recaps || [], progress: byKey }
    },
  })

  const recap = useMemo(
    () => (data?.recaps || []).find((r) => r.id === openRecap) || null,
    [data, openRecap],
  )
  const section = useMemo(
    () => (recap?.content?.sections || []).find((s) => s.key === openSection) || null,
    [recap, openSection],
  )

  // restore a saved draft when a section is opened
  useEffect(() => {
    if (!section || !recap) return
    try {
      const raw = localStorage.getItem(draftKey(profile?.id, recap.id, section.key))
      if (raw) setAnswers(JSON.parse(raw))
    } catch { /* a missing draft is not an error */ }
  }, [section, recap, profile?.id])

  // persist on every change while un-submitted
  useEffect(() => {
    if (!section || !recap || submitted) return
    try { localStorage.setItem(draftKey(profile?.id, recap.id, section.key), JSON.stringify(answers)) } catch {}
  }, [answers, section, recap, submitted, profile?.id])

  const submit = useMutation({
    mutationFn: async () => {
      const qs = section.questions || []
      let correct = 0
      for (const q of qs) if (validateAnswer(answers[q.id], acceptedOf(q))) correct++
      const score = Math.round((correct / (qs.length || 1)) * 100)
      const { error } = await supabase.from('class_recap_progress').upsert({
        student_id: profile.id, recap_id: recap.id, section_key: section.key,
        score, correct_count: correct, total_count: qs.length,
        answers, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'student_id,recap_id,section_key' })
      if (error) throw error
      return { score, correct, total: qs.length }
    },
    onSuccess: (r) => {
      setResult(r); setSubmitted(true)
      try { localStorage.removeItem(draftKey(profile?.id, recap.id, section.key)) } catch {}
      qc.invalidateQueries({ queryKey: ['class-recaps', profile?.id] })
    },
  })

  const openSectionFresh = (key) => { setOpenSection(key); setAnswers({}); setSubmitted(false); setResult(null) }
  const reviewSection = (key, saved) => {
    setOpenSection(key); setAnswers(saved.answers || {}); setSubmitted(true)
    setResult({ score: Math.round(Number(saved.score) || 0), correct: saved.correct_count || 0, total: saved.total_count || 0 })
  }
  const backToSections = () => { setOpenSection(null); setAnswers({}); setSubmitted(false); setResult(null) }

  const Shell = ({ children, narrow }) => (
    <div className="cr-root" dir="rtl">
      <div className="cr-world" aria-hidden><i /><i /><i /></div>
      <div className={`cr-wrap${narrow ? ' cr-wrap--narrow' : ''}`}>{children}</div>
    </div>
  )

  if (isLoading) {
    return <Shell><div className="cr-skel" /><div className="cr-skel sm" /><div className="cr-skel sm" /></Shell>
  }

  if (!data?.recaps?.length) {
    return (
      <Shell>
        <div className="cr-empty">
          <NotebookText size={30} />
          <h2>لا توجد ملخّصات بعد</h2>
          <p>سيظهر هنا ملخّص كل حصة تحضرينها، بالشرح والتمارين.</p>
        </div>
      </Shell>
    )
  }

  // ── section view: lesson + practice ───────────────────────────────────────
  if (recap && section) {
    const qs = section.questions || []
    const answeredCount = qs.filter((q) => answers[q.id] !== undefined && answers[q.id] !== '').length
    const allAnswered = qs.length > 0 && answeredCount === qs.length
    const tone = (result?.score ?? 0) >= 80 ? 'good' : (result?.score ?? 0) >= 60 ? 'mid' : 'low'

    return (
      <Shell narrow>
        <button className="cr-back" onClick={backToSections}>→ أقسام الحصة</button>
        <header className="cr-shead">
          <h1>{section.title_ar}</h1>
          {section.title_en && <div className="en" dir="ltr">{section.title_en}</div>}
          {section.blurb_ar && <p className="lead">{section.blurb_ar}</p>}
        </header>

        <LessonSection learn={section.learn} g={g} />

        {submitted && result && (
          <motion.div className={`cr-result ${tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="cr-result__score" dir="ltr">{toAr(result.score)}٪</div>
            <div className="cr-result__sub">{toAr(result.correct)} من {toAr(result.total)} صحيحة</div>
            <p className="cr-result__msg">
              {result.score >= 90 ? 'إتقان واضح — أحسنتِ. 👏'
                : result.score >= 70 ? 'أداء قوي. راجعي الحمراء وستكتمل الصورة.'
                : result.score >= 50 ? 'تقدّم جيد — أعيدي قراءة الشرح بالأعلى ثم كرّري التمرين.'
                : 'لا بأس — الشرح فوق يفسّر كل خطأ، والإعادة هي التي ترسّخ.'}
            </p>
          </motion.div>
        )}

        <div className="cr-qhead">
          <span>التمارين</span>
          <span className="cnt">{toAr(answeredCount)} من {toAr(qs.length)}</span>
        </div>

        {qs.map((q, i) => {
          const val = answers[q.id]
          const accepted = acceptedOf(q)
          const isCorrect = submitted && validateAnswer(val, accepted)
          const isWrong = submitted && !isCorrect
          return (
            <div key={q.id} className={`cr-q${isCorrect ? ' ok' : isWrong ? ' no' : ''}`}>
              <p className="cr-q__t">
                <span className="cr-qn">{toAr(i + 1)}</span>
                <span dir="auto">{q.question}</span>
              </p>
              {q.options ? (
                <div className={`cr-opts${q.options.every((o) => String(o).length <= 14) ? ' cr-opts--inline' : ''}`}>
                  {q.options.map((opt, oi) => {
                    const sel = val === opt
                    const correctOpt = submitted && validateAnswer(opt, accepted)
                    let cls = 'cr-opt'
                    if (correctOpt) cls += ' correct'
                    else if (sel && isWrong) cls += ' wrong'
                    else if (sel) cls += ' sel'
                    return (
                      <button key={oi} className={cls} disabled={submitted} dir="auto"
                        onClick={() => !submitted && setAnswers((p) => ({ ...p, [q.id]: opt }))}>{opt}</button>
                    )
                  })}
                </div>
              ) : (
                <input className={`cr-ans${isCorrect ? ' ok' : isWrong ? ' no' : ''}`} dir="ltr"
                  value={val || ''} disabled={submitted} type="text"
                  autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                  onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="اكتبي إجابتكِ…" />
              )}
              {submitted && (
                <div className="cr-why">
                  {isWrong && <b dir="ltr">{q.correct_answer}</b>}
                  <span>{q.explanation}</span>
                </div>
              )}
            </div>
          )
        })}

        <div className="cr-bar">
          {!submitted ? (
            <button className="cr-btn primary" onClick={() => submit.mutate()} disabled={!allAnswered || submit.isPending}>
              {submit.isPending ? <><Loader2 size={15} className="cr-spin" /> جارٍ التصحيح…</> : <><Send size={15} /> تسليم الإجابات</>}
            </button>
          ) : (
            <>
              <button className="cr-btn primary" onClick={() => openSectionFresh(section.key)}><RotateCcw size={15} /> إعادة التمرين</button>
              <button className="cr-btn" onClick={backToSections}><ArrowLeft size={15} /> العودة</button>
            </>
          )}
          {!submitted && !allAnswered && (
            <span className="cr-hint">أجيبي عن كل الأسئلة ({toAr(qs.length - answeredCount)} متبقية)</span>
          )}
        </div>
      </Shell>
    )
  }

  // ── sections list for one class ───────────────────────────────────────────
  if (recap) {
    const sections = recap.content?.sections || []
    const doneCount = sections.filter((s) => data.progress[`${recap.id}::${s.key}`]?.completed_at).length
    return (
      <Shell>
        <button className="cr-back" onClick={() => setOpenRecap(null)}>→ كل الحصص</button>
        <header className="cr-rhead">
          <span className="cr-k"><CalendarDays size={13} /> الحصة {toAr(recap.class_no)}
            {recap.class_date ? ` · ${recap.class_date}` : ''}</span>
          <h1>{recap.title}</h1>
          {recap.subtitle && <div className="en" dir="ltr">{recap.subtitle}</div>}
          <div className="cr-rbar"><span style={{ width: `${(doneCount / (sections.length || 1)) * 100}%` }} /></div>
          <p className="cr-rmeta">{toAr(doneCount)} من {toAr(sections.length)} أقسام مكتملة</p>
        </header>

        <div className="cr-sgrid">
          {sections.map((s, i) => {
            const saved = data.progress[`${recap.id}::${s.key}`]
            const done = !!saved?.completed_at
            return (
              <motion.div
                key={s.key} className={`cr-scard${done ? ' done' : ''}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.38 }}
              >
                <div className="cr-scard__n" dir="ltr">{toAr(i + 1)}</div>
                <div className="cr-scard__body">
                  <h3>{s.title_ar}</h3>
                  {s.title_en && <div className="en" dir="ltr">{s.title_en}</div>}
                  {s.blurb_ar && <p>{s.blurb_ar}</p>}
                  <div className="cr-scard__foot">
                    <span className="cr-scard__meta">
                      {toAr((s.questions || []).length)} تمرينًا
                      {done && <b className="ok"><CheckCircle2 size={12} /> {toAr(Math.round(Number(saved.score) || 0))}٪</b>}
                    </span>
                    <div className="cr-scard__acts">
                      {done && <button className="cr-btn sm" onClick={() => reviewSection(s.key, saved)}>مراجعة</button>}
                      <button className="cr-btn sm primary" onClick={() => openSectionFresh(s.key)}>
                        {done ? 'إعادة' : 'ابدئي'} <span className="arw">←</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </Shell>
    )
  }

  // ── all classes ───────────────────────────────────────────────────────────
  return (
    <Shell>
      <header className="cr-hero">
        <span className="cr-k"><NotebookText size={13} /> ملخّص الحصص</span>
        <h1>ما أخذتِه في الحصة، بين يديكِ</h1>
        <p>كل حصة تحضرينها تُلخَّص هنا: الشرح بالعربية والإنجليزية، ثم تمارين تثبّت ما تعلّمتِه.</p>
      </header>

      <div className="cr-list">
        {data.recaps.map((r, i) => {
          const sections = r.content?.sections || []
          const doneCount = sections.filter((s) => data.progress[`${r.id}::${s.key}`]?.completed_at).length
          const qCount = sections.reduce((n, s) => n + (s.questions || []).length, 0)
          return (
            <motion.button
              key={r.id} className="cr-card" onClick={() => setOpenRecap(r.id)}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 6) * 0.05, duration: 0.4 }}
            >
              <div className="cr-card__no" dir="ltr">{toAr(r.class_no)}</div>
              <div className="cr-card__body">
                <h3>{r.title}</h3>
                {r.subtitle && <div className="en" dir="ltr">{r.subtitle}</div>}
                <div className="cr-card__bar"><span style={{ width: `${(doneCount / (sections.length || 1)) * 100}%` }} /></div>
                <div className="cr-card__meta">
                  {/* Two spans, not one string with a «·». A bidi-neutral separator
                      between two Arabic-Indic numerals gets reordered, so «٥ أقسام ·
                      ٧٢ تمرينًا» rendered as «٥ أقسام ٧٢٠ تمرينًا» — the dot read as a
                      zero glued to the count. Separate elements keep each run intact. */}
                  <span className="cr-card__facts">
                    <span>{toAr(sections.length)} أقسام</span>
                    <span>{toAr(qCount)} تمرينًا</span>
                  </span>
                  {doneCount === sections.length && sections.length > 0
                    ? <b className="ok"><Check size={12} /> مكتملة</b>
                    : <b>{toAr(doneCount)} مكتمل</b>}
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </Shell>
  )
}
