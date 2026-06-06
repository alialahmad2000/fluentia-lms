import { useState } from 'react'
import { X, ArrowLeftRight } from 'lucide-react'
import { useTeacherGroups } from '@/hooks/teacher/useTeacherRoster'
import { useMoveStudent } from '@/hooks/teacher/useRosterActions'

export default function MoveStudentDialog({ studentId, currentGroupId, studentName, onClose }) {
  const { data: groups = [] } = useTeacherGroups()
  const move = useMoveStudent()
  const [target, setTarget] = useState('')
  const targets = groups.filter((g) => g.id !== currentGroupId)

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }} style={{ background: 'rgba(2,6,16,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 p-5" style={{ background: '#0a1326' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-slate-100 font-bold"><ArrowLeftRight size={17} className="text-sky-400" /> نقل الطالب</div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300" aria-label="إغلاق"><X size={18} /></button>
        </div>
        <p className="text-[13px] text-slate-400 mb-3">نقل <span className="text-slate-200 font-bold">{studentName}</span> إلى مجموعة أخرى من مجموعاتك.</p>

        {targets.length === 0 ? (
          <div className="text-[13px] text-slate-500 py-4 text-center">لا توجد مجموعة أخرى للنقل إليها.</div>
        ) : (
          <div className="space-y-2 mb-4">
            {targets.map((g) => (
              <label key={g.id} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                target === g.id ? 'border-sky-500/40 bg-sky-500/10' : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}>
                <input type="radio" name="grp" value={g.id} checked={target === g.id} onChange={() => setTarget(g.id)} className="accent-sky-500" />
                <span className="text-[13.5px] text-slate-200">{g.name}</span>
              </label>
            ))}
          </div>
        )}

        {move.isError && <div className="text-[12.5px] text-rose-400 mb-2">تعذّر النقل. تأكّد أن المجموعة من مجموعاتك.</div>}
        <div className="flex gap-2">
          <button type="button" className="tea-btn flex-1" onClick={onClose}>إلغاء</button>
          <button type="button" className="tea-btn tea-btn--primary flex-1 disabled:opacity-50"
            disabled={!target || move.isPending}
            onClick={() => move.mutate({ studentId, toGroup: target }, { onSuccess: onClose })}>
            {move.isPending ? 'ينقل…' : 'تأكيد النقل'}
          </button>
        </div>
      </div>
    </div>
  )
}
