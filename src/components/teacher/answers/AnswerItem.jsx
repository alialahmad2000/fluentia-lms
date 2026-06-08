import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X, Volume2, FileText, BookOpen, Headphones, PenLine, Mic, Sparkles, ClipboardCheck, SlidersHorizontal } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useGradeSubmission, useRequestRedo } from '@/hooks/teacher/useGrade'
import FeedbackSnippets from '@/components/teacher/answers/FeedbackSnippets'

const SKILL = {
  reading:             { label: 'القراءة',          icon: BookOpen,       color: '#38bdf8' },
  grammar:             { label: 'القواعد',          icon: Sparkles,       color: '#a78bfa' },
  listening:           { label: 'الاستماع',         icon: Headphones,     color: '#4ade80' },
  writing:             { label: 'الكتابة',          icon: PenLine,        color: '#f59e0b' },
  speaking:            { label: 'المحادثة',         icon: Mic,            color: '#fb7185' },
  vocabulary:          { label: 'المفردات',         icon: FileText,       color: '#2dd4bf' },
  vocabulary_exercise: { label: 'تمارين المفردات',  icon: FileText,       color: '#2dd4bf' },
  assessment:          { label: 'التقييم',          icon: ClipboardCheck, color: '#fbbf24' },
  pronunciation:       { label: 'النطق',            icon: Volume2,        color: '#fb7185' },
}

function Mark({ ok }) {
  return ok
    ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 shrink-0"><Check size={13} /></span>
    : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-500/15 text-rose-400 shrink-0"><X size={13} /></span>
}

function QRow({ q, student, correct, ok }) {
  return (
    <div className="flex gap-2.5 py-2 border-b border-white/5 last:border-0">
      <Mark ok={ok} />
      <div className="flex-1 min-w-0">
        {q && <div className="text-[13.5px] text-slate-200 leading-snug mb-1">{q}</div>}
        <div className="text-[12.5px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5" dir="auto">
          <span><span className="text-slate-500">إجابة الطالب: </span><span className={ok ? 'text-emerald-300' : 'text-rose-300'}>{String(student ?? '—')}</span></span>
          {!ok && correct != null && correct !== '' && (
            <span><span className="text-slate-500">الصحيح: </span><span className="text-emerald-300">{String(correct)}</span></span>
          )}
        </div>
      </div>
    </div>
  )
}

function ReadingBody({ answers, readingQ }) {
  const entries = Object.entries(answers || {})
  if (!entries.length) return <Empty />
  const rows = entries.map(([qid, v]) => {
    const q = readingQ?.[qid]
    return { qid, q, v, sort: q?.sort_order ?? 999 }
  }).sort((a, b) => a.sort - b.sort)
  return (
    <div>
      {rows.map(({ qid, q, v }) => (
        <QRow key={qid}
          q={q ? (q.question_ar || q.question_en) : null}
          student={v?.selected}
          correct={q?.correct_answer}
          ok={!!v?.correct} />
      ))}
    </div>
  )
}

function GrammarBody({ answers }) {
  const ex = answers?.exercises || []
  if (!ex.length) return <Empty />
  return <div>{ex.map((e, i) => (
    <QRow key={e.id || i} q={e.type ? `تمرين: ${e.type}` : null} student={e.studentAnswer} correct={e.correctAnswer} ok={!!e.isCorrect} />
  ))}</div>
}

function ListeningBody({ answers }) {
  const qs = answers?.questions || []
  if (!qs.length) return <Empty />
  const fmt = (v) => (typeof v === 'number' ? `الخيار ${v + 1}` : v)
  return <div>{qs.map((e, i) => (
    <QRow key={i} q={e.question} student={fmt(e.studentAnswer)} correct={fmt(e.correctAnswer)} ok={!!e.isCorrect} />
  ))}</div>
}

function WritingBody({ answers, aiFeedback }) {
  const draft = answers?.draft ?? answers?.text ?? answers?.response ?? ''
  const errors = aiFeedback?.errors || []
  return (
    <div className="space-y-3">
      {draft ? (
        <div className="rounded-xl bg-black/25 border border-white/8 p-3 text-[13.5px] leading-relaxed text-slate-200 whitespace-pre-wrap max-h-72 overflow-y-auto" dir="auto">{draft}</div>
      ) : <Empty />}
      {errors.length > 0 && (
        <div>
          <div className="text-[12px] font-bold text-amber-300/90 mb-1.5">ملاحظات الذكاء الاصطناعي ({errors.length})</div>
          <div className="space-y-1.5">
            {errors.slice(0, 12).map((e, i) => (
              <div key={i} className="text-[12.5px] flex flex-wrap gap-x-2 gap-y-0.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/15 px-2.5 py-1.5" dir="auto">
                <span className="line-through text-rose-300/90">{e.original}</span>
                <span className="text-emerald-300">→ {e.correction}</span>
                {e.explanation_ar && <span className="basis-full text-slate-400 text-[12px]">{e.explanation_ar}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SpeakingBody({ item }) {
  const ai = item.ai_feedback || {}
  const scalars = Object.entries(ai).filter(([, v]) => ['string', 'number'].includes(typeof v) && String(v).length < 240).slice(0, 6)
  return (
    <div className="space-y-2.5">
      {item.recording_url
        ? <audio controls preload="none" src={item.recording_url} className="w-full h-9" />
        : <Empty label="لا يوجد تسجيل" />}
      {item.duration ? <div className="text-[12px] text-slate-500">المدة: {Math.round(item.duration)} ثانية</div> : null}
      {scalars.length > 0 && (
        <div className="rounded-lg bg-black/20 border border-white/8 p-2.5 space-y-1">
          {scalars.map(([k, v]) => (
            <div key={k} className="text-[12.5px] flex justify-between gap-3" dir="auto">
              <span className="text-slate-500">{k}</span><span className="text-slate-200">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VocabBody({ item }) {
  const a = item.answers || {}
  if (item.section_type === 'vocabulary') {
    const total = a.totalWords ?? 0
    const reviewed = (a.reviewedWords || []).length
    return <div className="text-[13px] text-slate-300">راجع {reviewed} من {total} كلمة</div>
  }
  // vocabulary_exercise: sum sub-exercise scores
  const ex = a.exercises || {}
  let score = 0, max = 0
  Object.values(ex).forEach((s) => { if (s && typeof s === 'object') { score += s.score || 0; max += s.maxScore || 0 } })
  return <div className="text-[13px] text-slate-300">النتيجة: {score}{max ? ` / ${max}` : ''}{item.score != null ? ` (${item.score}%)` : ''}</div>
}

function GenericBody({ item }) {
  return <div className="text-[13px] text-slate-400">{item.score != null ? `النتيجة: ${item.score}%` : 'تمّ الإنجاز'}</div>
}

function Empty({ label = 'لا توجد تفاصيل لعرضها' }) {
  return <div className="text-[12.5px] text-slate-500 py-1.5">{label}</div>
}

function StatusPill({ status }) {
  const map = {
    completed: ['تم', 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25'],
    reviewed:  ['تمّ التقييم', 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25'],
    in_progress: ['قيد العمل', 'bg-amber-500/12 text-amber-300 border-amber-500/25'],
    submitted: ['بانتظار التقييم', 'bg-sky-500/12 text-sky-300 border-sky-500/25'],
  }
  const [label, cls] = map[status] || [status || '—', 'bg-white/5 text-slate-300 border-white/10']
  return <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
}

function RubricGrader({ writingId, onTotal }) {
  const { data: rubric } = useQuery({
    queryKey: ['writing-rubric', writingId],
    enabled: !!writingId,
    staleTime: 3_600_000,
    queryFn: async () => {
      const { data } = await supabase.from('curriculum_writing').select('rubric').eq('id', writingId).maybeSingle()
      return data?.rubric || null
    },
  })
  const [scores, setScores] = useState({})
  if (!rubric || typeof rubric !== 'object' || !Object.keys(rubric).length) {
    return <div className="text-[12px] text-slate-500">لا توجد معايير محددة لهذه المهمة.</div>
  }
  const criteria = Object.entries(rubric)
  const total = criteria.reduce((s, [k]) => s + (Number(scores[k]) || 0), 0)
  const setC = (k, v, max) => {
    const val = Math.max(0, Math.min(Number(max), Number(v) || 0))
    const next = { ...scores, [k]: val }
    setScores(next)
    onTotal(criteria.reduce((s, [kk]) => s + (Number(next[kk]) || 0), 0))
  }
  return (
    <div className="rounded-lg bg-black/20 border border-white/8 p-2.5 space-y-1.5">
      {criteria.map(([name, max]) => (
        <div key={name} className="flex items-center gap-2 text-[12.5px]">
          <span className="flex-1 text-slate-300" dir="auto">{name}</span>
          <input type="number" min="0" max={max} value={scores[name] ?? ''} onChange={(e) => setC(name, e.target.value, max)}
            className="w-14 text-[12.5px] rounded bg-black/30 border border-white/10 px-1.5 py-0.5 text-slate-200 text-center" />
          <span className="text-slate-500 w-9 text-[11px]">/ {max}</span>
        </div>
      ))}
      <div className="flex justify-between text-[12.5px] font-bold pt-1.5 border-t border-white/8"><span className="text-slate-300">المجموع</span><span className="text-sky-300">{total}</span></div>
    </div>
  )
}

function GradeBox({ item }) {
  const grade = useGradeSubmission()
  const redo = useRequestRedo()
  const type = item.section_type === 'writing' ? 'writing' : 'speaking'
  const [score, setScore] = useState(item.trainer_grade ?? '')
  const [feedback, setFeedback] = useState(item.trainer_feedback ?? '')
  const [rubricOn, setRubricOn] = useState(false)
  const busy = grade.isPending || redo.isPending
  const addSnippet = (s) => setFeedback((f) => (f && f.trim() ? `${f.trim()}\n${s}` : s))

  return (
    <div className="mt-3 pt-3 border-t border-white/8 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11.5px] font-bold text-slate-400">تقييم المدرّب</div>
        {type === 'writing' && item.writing_id && (
          <button type="button" onClick={() => setRubricOn((v) => !v)}
            className="text-[11px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"><SlidersHorizontal size={12} /> {rubricOn ? 'إخفاء المعايير' : 'تقييم بالمعايير'}</button>
        )}
      </div>
      {rubricOn && type === 'writing' && <RubricGrader writingId={item.writing_id} onTotal={(t) => setScore(t)} />}
      <FeedbackSnippets onPick={addSnippet} />
      <textarea
        value={feedback} onChange={(e) => setFeedback(e.target.value)}
        placeholder="اكتب ملاحظتك للطالب…" rows={2} dir="auto"
        className="w-full text-[13px] rounded-lg bg-black/25 border border-white/10 px-2.5 py-2 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 outline-none resize-none"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="number" min="0" max="100" value={score}
          onChange={(e) => setScore(e.target.value)} placeholder="الدرجة"
          className="w-24 text-[13px] rounded-lg bg-black/25 border border-white/10 px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 outline-none"
        />
        <button
          type="button" disabled={busy || score === ''}
          onClick={() => grade.mutate({ type, id: item.id, score: Number(score), feedback })}
          className="tea-btn tea-btn--primary !py-1.5 !px-3 !text-[13px] disabled:opacity-50">
          {grade.isPending ? 'يحفظ…' : 'حفظ التقييم'}
        </button>
        <button
          type="button" disabled={busy}
          onClick={() => redo.mutate({ type, id: item.id, note: feedback })}
          className="tea-btn tea-btn--ghost !py-1.5 !px-3 !text-[13px]">
          طلب إعادة
        </button>
        {grade.isSuccess && <span className="text-[12px] text-emerald-400">تم الحفظ ✓</span>}
        {grade.isError && <span className="text-[12px] text-rose-400">تعذّر الحفظ</span>}
      </div>
    </div>
  )
}

export default function AnswerItem({ item, readingQ }) {
  const meta = SKILL[item.section_type] || { label: item.section_type, icon: FileText, color: '#94a3b8' }
  const Icon = meta.icon
  const gradable = item.section_type === 'writing' || item.section_type === 'speaking'

  let body
  switch (item.section_type) {
    case 'reading': body = <ReadingBody answers={item.answers} readingQ={readingQ} />; break
    case 'grammar': body = <GrammarBody answers={item.answers} />; break
    case 'listening': body = <ListeningBody answers={item.answers} />; break
    case 'writing': body = <WritingBody answers={item.answers} aiFeedback={item.ai_feedback} />; break
    case 'speaking': body = <SpeakingBody item={item} />; break
    case 'vocabulary':
    case 'vocabulary_exercise': body = <VocabBody item={item} />; break
    default: body = <GenericBody item={item} />
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3.5">
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
          style={{ background: `${meta.color}1f`, color: meta.color }}><Icon size={15} /></span>
        <span className="text-[14px] font-bold text-slate-100">{meta.label}</span>
        <div className="flex-1" />
        {item.score != null && item.section_type !== 'speaking' && (
          <span className="text-[12px] font-bold text-slate-300">{item.score}%</span>
        )}
        <StatusPill status={item.status} />
      </div>
      {body}
      {item.trainer_feedback && !gradable && (
        <div className="mt-2.5 text-[12.5px] text-sky-200/90 bg-sky-500/[0.06] border border-sky-500/15 rounded-lg px-2.5 py-1.5" dir="auto">
          <span className="text-slate-500">ملاحظة المدرّب: </span>{item.trainer_feedback}
        </div>
      )}
      {gradable && <GradeBox item={item} />}
    </div>
  )
}
