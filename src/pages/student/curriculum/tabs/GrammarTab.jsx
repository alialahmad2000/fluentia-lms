import { PenLine } from 'lucide-react'

export default function GrammarTab({ unitId }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
        <PenLine size={28} className="text-emerald-400" />
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">القواعد</h3>
      <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">قريباً إن شاء الله</p>
    </div>
  )
}
