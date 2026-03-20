import { ClipboardCheck } from 'lucide-react'

export default function AssessmentTab({ unitId }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
        <ClipboardCheck size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">التقييم</h3>
      <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">قريباً إن شاء الله</p>
    </div>
  )
}
