import { BookOpen } from 'lucide-react'

export default function ReadingTab({ unitId }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
        <BookOpen size={28} className="text-sky-400" />
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">القراءة</h3>
      <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">قريباً إن شاء الله</p>
    </div>
  )
}
