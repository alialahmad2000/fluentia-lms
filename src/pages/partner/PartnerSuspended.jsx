import { AlertOctagon, LogOut, MessageCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function PartnerSuspended() {
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6" dir="rtl" style={{ background: '#050c18' }}>
      <div className="text-center max-w-md space-y-6">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <AlertOctagon size={36} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-white font-['Tajawal']">تم إيقاف حسابك كشريك</h1>
        <p className="text-white/60 font-['Tajawal']">للاستفسار أو طلب إعادة التفعيل، تواصل مع الدعم.</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://wa.me/966558669974"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold font-['Tajawal'] transition"
          >
            <MessageCircle size={18} />
            راسلنا على الواتساب
          </a>
          <button onClick={handleSignOut} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 font-['Tajawal'] hover:bg-white/10 transition">
            <LogOut size={18} />
            خروج
          </button>
        </div>
      </div>
    </div>
  )
}
