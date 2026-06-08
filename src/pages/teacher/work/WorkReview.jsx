import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PenLine, Mic, Clock, CheckCircle2, ExternalLink, Inbox } from 'lucide-react'
import { useGradingQueue } from '@/hooks/trainer/useGradingQueue'
import { useGradeSubmission, useRequestRedo } from '@/hooks/teacher/useGrade'
import FeedbackSnippets from '@/components/teacher/answers/FeedbackSnippets'

const TYPE_META = {
  writing: { label: 'كتابة', icon: PenLine, color: '#f59e0b' },
  speaking: { label: 'محادثة', icon: Mic, color: '#fb7185' },
}

function QueueCard({ row }) {
  const meta = TYPE_META[row.submission_type] || TYPE_META.writing
  const Icon = meta.icon
  const grade = useGradeSubmission()
  const redo = useRequestRedo()
  const [score, setScore] = useState(row.ai_score ? Math.round(row.ai_score) : '')
  const [feedback, setFeedback] = useState('')
  const done = grade.isSuccess
  const busy = grade.isPending || redo.isPending

  return (
    <div className={`tea-card ${done ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0" style={{ background: `${meta.color}1f`, color: meta.color }}><Icon size={15} /></span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[14.5px] text-slate-100 truncate">{row.student_name || 'طالب'}</div>
          <div className="text-[11.5px] text-slate-500 truncate">{row.group_name || ''}{row.unit_title ? ` · ${row.unit_title}` : ''}</div>
        </div>
        {row.is_urgent && <span className="tea-pill tea-pill--rose !py-0.5 !px-2 !text-[10.5px]">عاجل</span>}
        <span className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0"><Clock size={12} />{Math.round(row.hours_pending || 0)}س</span>
      </div>

      {row.ai_feedback_summary && (
        <div className="text-[12.5px] text-slate-400 bg-black/20 border border-white/8 rounded-lg px-2.5 py-1.5 mb-2.5 line-clamp-3" dir="auto">
          <span className="text-amber-300/80 font-bold text-[11px]">الذكاء: </span>{row.ai_feedback_summary}
          {row.ai_score ? <span className="text-slate-500"> ({Math.round(row.ai_score)})</span> : null}
        </div>
      )}

      {done ? (
        <div className="flex items-center gap-1.5 text-[13px] text-emerald-400 font-bold"><CheckCircle2 size={16} /> تمّ التقييم</div>
      ) : (
        <>
          <div className="mb-2"><FeedbackSnippets onPick={(s) => setFeedback((f) => (f && f.trim() ? `${f.trim()}\n${s}` : s))} /></div>
          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="ملاحظة للطالب…" rows={2} dir="auto"
            className="w-full text-[13px] rounded-lg bg-black/25 border border-white/10 px-2.5 py-2 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 outline-none resize-none mb-2" />
          <div className="flex items-center gap-2 flex-wrap">
            <input type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)} placeholder="درجة"
              className="w-20 text-[13px] rounded-lg bg-black/25 border border-white/10 px-2.5 py-1.5 text-slate-200 placeholder:text-slate-600 focus:border-sky-500/40 outline-none" />
            <button type="button" disabled={busy || score === ''}
              onClick={() => grade.mutate({ type: row.submission_type, id: row.submission_id, score: Number(score), feedback })}
              className="tea-btn tea-btn--primary !py-1.5 !px-3 !text-[13px] disabled:opacity-50">{grade.isPending ? 'يحفظ…' : 'اعتماد'}</button>
            <button type="button" disabled={busy}
              onClick={() => redo.mutate({ type: row.submission_type, id: row.submission_id, note: feedback })}
              className="tea-btn tea-btn--ghost !py-1.5 !px-3 !text-[13px]">إعادة</button>
            <Link to={`/trainer/students/${row.student_id}/answers`} className="text-[12px] text-sky-400 hover:text-sky-300 flex items-center gap-1 ms-auto"><ExternalLink size={13} /> العمل كاملاً</Link>
          </div>
          {grade.isError && <div className="text-[12px] text-rose-400 mt-1.5">تعذّر الحفظ.</div>}
        </>
      )}
    </div>
  )
}

export default function WorkReview() {
  const { data: queue = [], isLoading, error } = useGradingQueue(80)
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => (filter === 'all' ? queue : queue.filter((r) => r.submission_type === filter)), [queue, filter])
  const counts = useMemo(() => ({
    all: queue.length,
    writing: queue.filter((r) => r.submission_type === 'writing').length,
    speaking: queue.filter((r) => r.submission_type === 'speaking').length,
  }), [queue])

  return (
    <div className="tea-page">
      <div className="tea-pagehead">
        <div className="tea-pagehead__title">الأعمال والتقييم</div>
        <div className="tea-pagehead__sub">كل ما ينتظر تقييمك من طلابك في مكان واحد</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {[['all', 'الكل'], ['writing', 'كتابة'], ['speaking', 'محادثة']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold border transition-colors ${
              filter === k ? 'bg-sky-500/15 border-sky-500/35 text-sky-200' : 'bg-white/[0.03] border-white/8 text-slate-400 hover:text-slate-200'
            }`}>{label} <span className="text-slate-500">{counts[k] ?? 0}</span></button>
        ))}
      </div>

      {isLoading && <div className="grid gap-3 lg:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="tea-skel h-44" />)}</div>}
      {error && <div className="tea-empty">تعذّر تحميل قائمة التقييم.</div>}
      {!isLoading && !error && rows.length === 0 && (
        <div className="tea-empty">
          <Inbox size={32} className="tea-empty__icon" />
          <div className="font-bold text-slate-200 mb-1">لا يوجد عمل بانتظار التقييم</div>
          <div className="text-[13px]">أحسنت — صندوقك فارغ ✨</div>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => <QueueCard key={`${r.submission_type}-${r.submission_id}`} row={r} />)}
      </div>
    </div>
  )
}
