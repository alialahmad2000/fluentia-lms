import { Headphones } from 'lucide-react'

export default function ListeningTab({ unitId }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center">
        <Headphones size={28} className="text-purple-400" />
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">الاستماع</h3>
      <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">قريباً إن شاء الله</p>
    </div>
  )
}
