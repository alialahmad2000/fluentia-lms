import { ClipboardCheck } from 'lucide-react'

export default function InteractiveAssessmentTab({ unitId, groupId, students = [] }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
        <ClipboardCheck size={28} className="text-sky-400" />
      </div>
      <p className="text-[var(--text-muted)] font-['Tajawal'] text-center">
        التقييم لم يُفعّل بعد — سيتم إضافته قريبًا إن شاء الله
      </p>
    </div>
  )
}
