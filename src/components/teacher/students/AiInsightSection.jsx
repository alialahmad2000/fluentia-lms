import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useStudentInsight } from '@/hooks/teacher/useInsights'

const TONE = {
  urgent:    ['عاجل',   'tea-pill--rose'],
  celebrate: ['إنجاز',  'tea-pill--green'],
  nurture:   ['دعم',    'tea-pill--amber'],
  observe:   ['ملاحظة', 'tea-pill--sky'],
}

function Body({ studentId }) {
  const { data, isLoading, error } = useStudentInsight(studentId)
  if (isLoading) return <div className="tea-skel h-24" />
  if (error) return <div className="text-[13px] text-slate-500">تعذّر توليد التحليل الآن — حاول لاحقاً.</div>
  if (!data || (!data.diagnosis && !data.recommended_action)) return <div className="text-[13px] text-slate-500">لا توجد بيانات كافية للتحليل بعد.</div>
  const tone = TONE[data.tone] || TONE.observe
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className={`tea-pill ${tone[1]} !text-[11px]`}>{tone[0]}</span>
        {data.cached && <span className="text-[11px] text-slate-500">محفوظ</span>}
      </div>
      {data.diagnosis && <p className="text-[13.5px] text-slate-200 leading-relaxed" dir="rtl">{data.diagnosis}</p>}
      {data.recommended_action && (
        <div className="rounded-lg bg-sky-500/[0.07] border border-sky-500/15 px-3 py-2 text-[13px] text-sky-100" dir="rtl">
          <span className="text-sky-400 font-bold">الإجراء المقترح: </span>{data.recommended_action}
        </div>
      )}
      {Array.isArray(data.evidence) && data.evidence.length > 0 && (
        <ul className="text-[12.5px] text-slate-400 space-y-0.5 list-disc ps-5" dir="rtl">
          {data.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  )
}

export default function AiInsightSection({ studentId }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="tea-card">
      <div className="tea-section-title"><Sparkles size={15} /> تحليل ذكي</div>
      {open ? <Body studentId={studentId} /> : (
        <button type="button" onClick={() => setOpen(true)} className="tea-btn tea-btn--primary !text-[13px] flex items-center gap-2">
          <Sparkles size={14} /> توليد تحليل الطالب
        </button>
      )}
    </div>
  )
}
