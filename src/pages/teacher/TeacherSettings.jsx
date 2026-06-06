import { LogOut, User, Mail, Phone, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      <span className="w-8 h-8 rounded-lg grid place-items-center bg-white/5 text-slate-400 shrink-0"><Icon size={15} /></span>
      <span className="text-[13px] text-slate-500 w-28">{label}</span>
      <span className="text-[13.5px] text-slate-200 flex-1" dir="auto">{value || '—'}</span>
    </div>
  )
}

export default function TeacherSettings() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)
  const name = profile?.display_name || profile?.full_name || 'المدرّب'

  return (
    <div className="tea-page space-y-5" style={{ maxWidth: 640 }}>
      <div className="tea-pagehead">
        <div className="tea-pagehead__title">الإعدادات</div>
        <div className="tea-pagehead__sub">معلومات حسابك</div>
      </div>

      <div className="tea-card">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-14 h-14 rounded-2xl grid place-items-center font-extrabold text-xl text-[#06121f]" style={{ background: 'linear-gradient(135deg,#38bdf8,#7dd3fc)' }}>{(name || 'م').charAt(0)}</div>
          <div>
            <div className="text-[18px] font-extrabold text-slate-100">{name}</div>
            <div className="text-[12.5px] text-slate-500">مدرّب</div>
          </div>
        </div>
        <Row icon={User} label="الاسم الكامل" value={profile?.full_name} />
        <Row icon={Mail} label="البريد" value={profile?.email} />
        <Row icon={Phone} label="الجوّال" value={profile?.phone} />
        <Row icon={Shield} label="الدور" value="مدرّب" />
      </div>

      <button type="button" onClick={signOut} className="tea-btn w-full !text-rose-300 hover:!text-rose-200 flex items-center justify-center gap-2">
        <LogOut size={16} /> تسجيل الخروج
      </button>

      <div className="text-center text-[12px] text-slate-600">يتم تحديث التطبيق تلقائياً عند فتحه — لا حاجة لإعادة التحميل اليدوي.</div>
    </div>
  )
}
