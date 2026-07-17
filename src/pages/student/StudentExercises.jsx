import { useState, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ClipboardList, CheckCircle2, Zap, ArrowLeft, ArrowUpRight, BookOpen,
  Loader2, Send, Sparkles,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { validateAnswer } from '../../utils/answerValidator'
import { useG } from '../../i18n/gender'
import WorksheetView from './exercises/WorksheetView'
import { GENERAL_EXERCISES, SKILL_LABELS, DIFFICULTY_LABELS } from './exercises/generalExercises'
import './studentExercises.css'

// Western → Arabic-Indic digits (this student reads Arabic-Indic).
const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

// localStorage tracking for general (extra-practice) completions
const GENERAL_KEY = 'fluentia_general_exercises_completed'
function getCompletedGeneral() {
  try { return JSON.parse(localStorage.getItem(GENERAL_KEY) || '{}') } catch { return {} }
}
function markGeneralCompleted(id, data) {
  const c = getCompletedGeneral(); c[id] = { ...data, completedAt: new Date().toISOString() }
  localStorage.setItem(GENERAL_KEY, JSON.stringify(c))
}

// worksheet total blanks (for the meta line on the card)
const worksheetCounts = (ex) => {
  const qs = ex?.content?.questions?.length || 0
  const rows = (ex?.content?.worksheet?.tenses || []).reduce((a, t) => a + (t.rows?.length || 0), 0)
  return { blanks: qs, rows }
}

export default function StudentExercises() {
  const { profile } = useAuthStore(useShallow((s) => ({ profile: s.profile })))
  const g = useG()
  const queryClient = useQueryClient()
  const [activeExercise, setActiveExercise] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [isGeneral, setIsGeneral] = useState(false)
  const [completedGeneral, setCompletedGeneral] = useState(() => getCompletedGeneral())

  const { data: exercises, isLoading } = useQuery({
    queryKey: ['student-exercises'],
    queryFn: async () => {
      const { data } = await supabase
        .from('targeted_exercises')
        .select('*, error_patterns(pattern_type, description, skill)')
        .eq('student_id', profile?.id)
        .order('created_at', { ascending: false })
      return data || []
    },
    enabled: !!profile?.id,
  })

  const stats = useMemo(() => {
    const all = exercises || []
    const scored = all.filter((e) => e.score != null)
    return {
      total: all.length,
      completed: all.filter((e) => e.status === 'completed').length,
      pending: all.filter((e) => e.status === 'pending').length,
      avgScore: scored.length ? Math.round(scored.reduce((a, e) => a + Number(e.score), 0) / scored.length) : null,
      totalXp: all.reduce((a, e) => a + (e.xp_awarded || 0), 0),
    }
  }, [exercises])

  // ── grading: targeted exercises ──
  const submitMutation = useMutation({
    mutationFn: async ({ exerciseId, answers: sa }) => {
      const ex = exercises.find((e) => e.id === exerciseId)
      const questions = ex.content?.questions || []
      let correct = 0
      for (const q of questions) if (validateAnswer(sa[q.id], q.accepted_answers || [q.correct_answer])) correct++
      const score = Math.round((correct / (questions.length || 1)) * 100)
      const xp = score >= 80 ? 15 : score >= 60 ? 10 : 5
      await supabase.from('targeted_exercises').update({
        status: 'completed', score, student_answers: sa, xp_awarded: xp, completed_at: new Date().toISOString(),
      }).eq('id', exerciseId)
      await supabase.from('xp_transactions').insert({
        student_id: profile?.id, amount: xp, reason: 'custom', description: `إكمال ورقة مخصّصة: ${ex.title}`,
      })
      return { score, xp, correct, total: questions.length }
    },
    onSuccess: (data) => { setResult(data); setSubmitted(true); queryClient.invalidateQueries({ queryKey: ['student-exercises'] }) },
  })

  // ── grading: general practice (XP only) ──
  const submitGeneralMutation = useMutation({
    mutationFn: async ({ exerciseId, answers: sa }) => {
      const ex = GENERAL_EXERCISES.find((e) => e.id === exerciseId)
      const questions = ex.content?.questions || []
      let correct = 0
      for (const q of questions) if (validateAnswer(sa[q.id], q.accepted_answers || [q.correct_answer])) correct++
      const score = Math.round((correct / (questions.length || 1)) * 100)
      const base = ex.xp_reward || 10
      const xp = score >= 80 ? base : score >= 60 ? Math.round(base * 0.7) : Math.round(base * 0.4)
      await supabase.from('xp_transactions').insert({
        student_id: profile?.id, amount: xp, reason: 'custom', description: `تدريب إضافي: ${ex.title_ar}`,
      })
      return { score, xp, correct, total: questions.length }
    },
    onSuccess: (data) => {
      setResult(data); setSubmitted(true)
      if (activeExercise) { markGeneralCompleted(activeExercise.id, data); setCompletedGeneral(getCompletedGeneral()) }
    },
  })

  const handleSubmit = () => {
    if (!activeExercise) return
    if (isGeneral) submitGeneralMutation.mutate({ exerciseId: activeExercise.id, answers })
    else submitMutation.mutate({ exerciseId: activeExercise.id, answers })
  }
  const reset = () => { setActiveExercise(null); setAnswers({}); setSubmitted(false); setResult(null); setIsGeneral(false) }
  const openTargeted = (ex) => { setActiveExercise(ex); setIsGeneral(false); setAnswers({}); setSubmitted(false); setResult(null) }
  const openGeneral = (ex) => { setActiveExercise(ex); setIsGeneral(true); setAnswers({}); setSubmitted(false); setResult(null) }

  const pending = (exercises || []).filter((e) => e.status === 'pending')
  const completed = (exercises || []).filter((e) => e.status === 'completed')
  const hasNoTasks = pending.length === 0 && completed.length === 0
  const submitting = isGeneral ? submitGeneralMutation.isPending : submitMutation.isPending

  // ── active exercise → worksheet or compact runner ──
  if (activeExercise) {
    if (activeExercise.content?.render === 'worksheet') {
      return (
        <WorksheetView
          exercise={activeExercise} answers={answers} setAnswers={setAnswers}
          submitted={submitted} result={result} onSubmit={handleSubmit} onBack={reset} submitting={submitting}
        />
      )
    }
    return (
      <ExerciseRunner
        exercise={activeExercise} answers={answers} setAnswers={setAnswers}
        submitted={submitted} result={result} onSubmit={handleSubmit} onBack={reset} submitting={submitting}
      />
    )
  }

  // ── ledger figures ──
  const total = pending.length + completed.length
  const pct = total > 0 ? Math.round((stats.completed / total) * 100) : 0
  const CIRC = 151
  const dash = CIRC - CIRC * (pct / 100)

  return (
    <div className="pw-root" dir="rtl">
      <div className="pw-world" aria-hidden><div className="pw-world__blooms" /><div className="pw-world__grain" /></div>

      <div className="pw-wrap">
        {/* Masthead */}
        <motion.header
          className="pw-mast"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="pw-brand">طلاقة · Fluentia</div>
          <h1 className="pw-title">تمارين مخصّصة</h1>
          <div className="pw-title-en" dir="ltr">Your Worksheets</div>
          <p className="pw-lead">
            {g('أوراق تدريب اختارها لك مدرّبك لتقوية مهارات محدّدة — أنجِزها ورقةً تلو الأخرى، وتُصحَّح نتيجتك فورًا.',
               'أوراق تدريب اختارها لكِ مدرّبكِ لتقوية مهارات محدّدة — أنجِزيها ورقةً تلو الأخرى، وتُصحَّح نتيجتكِ فورًا.')}
          </p>
        </motion.header>

        {/* Ledger */}
        <div className="pw-ledger">
          <div className="pw-tile ring">
            <div className="pw-ring">
              <svg width="56" height="56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(178,106,27,.14)" strokeWidth="5" />
                <circle cx="28" cy="28" r="24" fill="none" stroke="#b26a1b" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={dash} />
              </svg>
              <div className="pw-ring__txt" dir="ltr">{toAr(pct)}٪</div>
            </div>
            <div className="pw-ring-meta"><div className="k">التقدّم</div><div className="v">{toAr(stats.completed)} من {toAr(total)} ورقة</div></div>
          </div>
          <div className="pw-tile"><div className="pw-tile__k">أوراق بانتظارك</div><div className="pw-tile__v amber">{toAr(pending.length)}</div></div>
          <div className="pw-tile">
            <div className="pw-tile__k">متوسط الدرجة</div>
            {stats.avgScore == null
              ? <div className="pw-tile__chip">لم تُقيَّم بعد</div>
              : <div className="pw-tile__v" dir="ltr">{toAr(stats.avgScore)}٪</div>}
          </div>
          <div className="pw-tile"><div className="pw-tile__k">نقاط الخبرة</div><div className="pw-tile__v teal">{toAr(stats.totalXp)}</div></div>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '80px 0' }}>
            <Loader2 size={26} className="pw-spin" style={{ color: '#b26a1b' }} />
          </div>
        ) : hasNoTasks ? (
          <EmptyState g={g} completedGeneral={completedGeneral} onOpen={openGeneral} />
        ) : (
          <>
            {/* Assigned worksheets (pending) */}
            {pending.length > 0 && (
              <>
                <div className="pw-shead"><span className="dot" /><h2>أوراقك</h2><span className="count" dir="ltr">{toAr(pending.length)}</span><span className="rule" /></div>
                <div className="pw-grid">
                  {pending.map((ex, i) => (
                    ex.content?.render === 'worksheet'
                      ? <WorksheetCard key={ex.id} i={i} ex={ex} onOpen={() => openTargeted(ex)} />
                      : <TaskCard key={ex.id} i={i} skill={ex.skill} difficulty={ex.difficulty} titleAr={ex.title} onOpen={() => openTargeted(ex)} />
                  ))}
                </div>
              </>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <>
                <div className="pw-shead"><span className="dot teal" /><h2>مكتملة</h2><span className="count" dir="ltr">{toAr(completed.length)}</span><span className="rule" /></div>
                <div>
                  {completed.slice(0, 12).map((ex) => {
                    const good = ex.score >= 80, ok = ex.score >= 60
                    const c = good ? '#2f7d72' : ok ? '#b26a1b' : '#b0543f'
                    const bg = good ? 'rgba(47,125,114,.1)' : ok ? 'rgba(178,106,27,.1)' : 'rgba(176,84,63,.1)'
                    return (
                      <div key={ex.id} className="pw-drow">
                        <div className="pw-drow__l">
                          <CheckCircle2 size={16} style={{ color: '#2f7d72', flexShrink: 0 }} />
                          <span className="pw-drow__t">{ex.title}</span>
                          <span className="pw-drow__s">{SKILL_LABELS[ex.skill] || ex.skill}</span>
                        </div>
                        <div className="pw-drow__r">
                          <span className="pw-badge-score" dir="ltr" style={{ color: c, background: bg, border: `1px solid ${c}55` }}>{toAr(ex.score)}٪</span>
                          <span className="pw-wmeta"><span className="xp"><Zap size={12} /> +{toAr(ex.xp_awarded)}</span></span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Big worksheet task card (with a real mini-worksheet thumbnail) ──
function WorksheetCard({ i, ex, onOpen }) {
  const g = useG()
  const { blanks, rows } = worksheetCounts(ex)
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }
  // varied given positions for the thumbnail (visual echo of the sheet)
  const thumbRows = [0, 3, 1, 2]
  return (
    <motion.div
      className="pw-wcard" role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKey}
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05, duration: 0.45 }}
    >
      <div className="pw-thumb" aria-hidden>
        <div className="pw-thumb__hd">
          {[0, 1, 2, 3, 4].map((k) => <span key={k} className="pw-thumb__hc" />)}
        </div>
        {thumbRows.map((gpos, ri) => (
          <div className="pw-thumb__row" key={ri}>
            <span className="pw-thumb__n" />
            {[0, 1, 2, 3].map((cp) => <span key={cp} className={`pw-thumb__c${cp === gpos ? ' g' : ''}`} />)}
          </div>
        ))}
        <div className="pw-thumb__cap">Tense Transformation</div>
      </div>
      <div className="pw-wbody">
        <div className="pw-tags">
          <span className="pw-tag skill">{SKILL_LABELS[ex.skill] || ex.skill}</span>
          {ex.difficulty && <span className="pw-tag diff">{DIFFICULTY_LABELS[ex.difficulty] || ex.difficulty}</span>}
          <span className="pw-tag status">جديدة</span>
        </div>
        <h3>{ex.title}</h3>
        {ex.content?.title_en && <div className="en" dir="ltr">{ex.content.title_en}</div>}
        <p className="desc">في كل صف خانة واحدة محلولة — قد تكون مُثبتة أو منفية أو سؤالًا، وتختلف من صف لآخر. {g('أكمِل', 'أكمِلي')} الصيغ الثلاث الباقية عبر الأزمنة الأربعة.</p>
        <div className="pw-wfoot">
          <div className="pw-wmeta">
            {rows > 0 && <span><b dir="ltr">{toAr(rows)}</b> صفًّا</span>}
            {blanks > 0 && <span><b dir="ltr">{toAr(blanks)}</b> تحويلًا</span>}
            <span className="xp"><Sparkles size={13} /> خبرة عند الإتمام</span>
          </div>
          <button className="pw-cta" onClick={(e) => { e.stopPropagation(); onOpen() }}>{g('ابدأ الورقة', 'ابدئي الورقة')} <span className="arw">←</span></button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Compact task card (general practice + non-worksheet targeted) ──
function TaskCard({ i, skill, difficulty, xp, titleAr, titleEn, done, doneScore, onOpen }) {
  const g = useG()
  const onKey = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }
  return (
    <motion.div
      className={`pw-wcard${done ? ' is-done' : ''}`} role="button" tabIndex={0} onClick={onOpen} onKeyDown={onKey}
      style={{ gridTemplateColumns: '1fr' }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04, duration: 0.4 }}
    >
      <div className="pw-wbody" style={{ padding: '18px 20px' }}>
        <div className="pw-tags">
          <span className="pw-tag skill">{SKILL_LABELS[skill] || skill}</span>
          {difficulty && <span className="pw-tag diff">{DIFFICULTY_LABELS[difficulty] || difficulty}</span>}
          {xp != null && <span className="pw-tag status" style={{ paddingLeft: 10 }}><Zap size={11} /> {toAr(xp)} خبرة</span>}
          {done && doneScore != null && <span className="pw-tag done"><CheckCircle2 size={11} /> {toAr(doneScore)}٪</span>}
        </div>
        <h3 style={{ fontSize: '1.2rem' }}>{titleAr}</h3>
        {titleEn && <div className="en" dir="ltr">{titleEn}</div>}
        <div className="pw-wfoot" style={{ marginTop: 12 }}>
          <span className="pw-wmeta" />
          <button className="pw-cta" style={{ padding: '10px 20px' }} onClick={(e) => { e.stopPropagation(); onOpen() }}>
            {done ? g('أعِد المحاولة', 'أعيدي المحاولة') : g('ابدأ', 'ابدئي')} <ArrowUpRight size={16} style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ── Empty state: no assigned worksheets yet → warm note + extra-practice bank ──
function EmptyState({ g, completedGeneral, onOpen }) {
  return (
    <>
      <motion.div className="pw-note" style={{ marginTop: 24 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="pw-note__ic"><ClipboardList size={26} /></div>
        <h3 className="pw-note__t">{g('لم يُسنِد لك مدرّبك أوراقًا بعد', 'لم يُسنِد لكِ مدرّبكِ أوراقًا بعد')}</h3>
        <p className="pw-note__x">
          {g('ستظهر أوراقك المخصّصة هنا فور إسنادها. حتى ذلك الحين، يمكنك التدرّب بتمارين إضافية:',
             'ستظهر أوراقكِ المخصّصة هنا فور إسنادها. حتى ذلك الحين، يمكنكِ التدرّب بتمارين إضافية:')}
        </p>
      </motion.div>
      <div className="pw-shead"><span className="dot teal" /><h2>تدريب إضافي</h2><span className="count" dir="ltr">{toAr(GENERAL_EXERCISES.length)}</span><span className="rule" /></div>
      <div className="pw-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {GENERAL_EXERCISES.map((ex, i) => (
          <TaskCard
            key={ex.id} i={i} skill={ex.skill} difficulty={ex.difficulty} xp={ex.xp_reward}
            titleAr={ex.title_ar} titleEn={ex.title}
            done={!!completedGeneral[ex.id]} doneScore={completedGeneral[ex.id]?.score}
            onOpen={() => onOpen(ex)}
          />
        ))}
      </div>
    </>
  )
}

// ── Compact warm runner for MC / text exercises (general + non-worksheet targeted) ──
function ExerciseRunner({ exercise, answers, setAnswers, submitted, result, onSubmit, onBack, submitting }) {
  const g = useG()
  const questions = exercise.content?.questions || []
  const allAnswered = questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== '')
  const score = result?.score ?? 0
  const tone = score >= 80 ? 'good' : score >= 60 ? 'mid' : 'low'

  return (
    <div className="pw-root" dir="rtl">
      <div className="pw-world" aria-hidden><div className="pw-world__blooms" /><div className="pw-world__grain" /></div>
      <div className="pw-run">
        <button className="pw-back" onClick={onBack}>→ العودة</button>
        <header className="pw-mast" style={{ textAlign: 'start', paddingTop: 0 }}>
          <h1 className="pw-title" style={{ fontSize: 'clamp(1.6rem,4vw,2.3rem)' }}>{exercise.title_ar || exercise.title}</h1>
          {exercise.title && exercise.title_ar && <div className="pw-title-en" dir="ltr" style={{ textAlign: 'left' }}>{exercise.title}</div>}
          {exercise.instructions && <p className="pw-lead" style={{ margin: '4px 0 0', maxWidth: 560 }}>{exercise.instructions}</p>}
        </header>

        {submitted && result && (
          <motion.div className={`pw-result ${tone}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="pw-result__score" dir="ltr">{toAr(result.score)}٪</div>
            <div className="pw-result__sub">{toAr(result.correct)} من {toAr(result.total)} صحيحة</div>
            <div className="pw-result__xp"><Zap size={15} /> +{toAr(result.xp)} نقطة خبرة</div>
          </motion.div>
        )}

        <div>
          {questions.map((q, i) => {
            const val = answers[q.id]
            const accepted = q.accepted_answers || [q.correct_answer]
            const isCorrect = submitted && validateAnswer(val, accepted)
            const isWrong = submitted && val && !isCorrect
            return (
              <div key={q.id} className={`pw-qcard${isCorrect ? ' ok' : isWrong ? ' no' : ''}`}>
                <p className="pw-qcard__q"><span className="pw-qnum">{toAr(i + 1)}</span><span>{q.question}</span></p>
                {q.options ? (
                  <div className="pw-opts">
                    {q.options.map((opt, oi) => {
                      const sel = val === opt
                      const correctOpt = submitted && validateAnswer(opt, accepted)
                      let cls = 'pw-opt'
                      if (correctOpt) cls += ' correct'
                      else if (sel && isWrong) cls += ' wrong'
                      else if (sel) cls += ' sel'
                      return (
                        <button key={oi} className={cls} disabled={submitted}
                          onClick={() => !submitted && setAnswers((p) => ({ ...p, [q.id]: opt }))}>{opt}</button>
                      )
                    })}
                  </div>
                ) : (
                  <input className={`pw-ans${isCorrect ? ' ok' : isWrong ? ' no' : ''}`} dir="ltr"
                    value={val || ''} disabled={submitted}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder={g('اكتب إجابتك…', 'اكتبي إجابتكِ…')} />
                )}
                {submitted && q.explanation && (
                  <div className="pw-explain">{isWrong && <b dir="ltr">{q.correct_answer} · </b>}{q.explanation}</div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pw-bar" style={{ position: 'static', marginTop: 8 }}>
          {!submitted ? (
            <button className="pw-btn primary" onClick={onSubmit} disabled={!allAnswered || submitting}>
              {submitting ? <><Loader2 size={15} className="pw-spin" /> جارٍ التصحيح…</> : <><Send size={15} /> تسليم الإجابات</>}
            </button>
          ) : (
            <button className="pw-btn primary" onClick={onBack}><ArrowLeft size={15} /> العودة</button>
          )}
        </div>
      </div>
    </div>
  )
}
