import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Save, AlertTriangle, LogOut } from 'lucide-react'

export default function PartnerSettings() {
  const { affiliate } = useOutletContext()
  const qc = useQueryClient()

  const [fullName, setFullName] = useState(affiliate.full_name || '')
  const [phone, setPhone] = useState(affiliate.phone || '')
  const [city, setCity] = useState(affiliate.city || '')
  const [twitter, setTwitter] = useState(affiliate.social_handles?.twitter || '')
  const [instagram, setInstagram] = useState(affiliate.social_handles?.instagram || '')
  const [tiktok, setTiktok] = useState(affiliate.social_handles?.tiktok || '')
  const [showClose, setShowClose] = useState(false)

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('affiliates').update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        social_handles: { twitter: twitter.trim(), instagram: instagram.trim(), tiktok: tiktok.trim() },
      }).eq('id', affiliate.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-affiliate'] }),
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('affiliates').update({
        status: 'suspended',
        notes: (affiliate.notes || '') + '\n[طلب إغلاق ذاتي ' + new Date().toISOString() + ']',
      }).eq('id', affiliate.id)
      if (error) throw error
      await supabase.auth.signOut()
      window.location.href = '/login'
    },
  })

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-lg font-bold text-white font-['Tajawal']">الإعدادات</h1>

      {/* Profile */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="font-bold text-white font-['Tajawal']">معلوماتك</h2>
        <Field label="الاسم الكامل" value={fullName} onChange={setFullName} />
        <Field label="البريد الإلكتروني" value={affiliate.email} readOnly hint="للتغيير تواصل مع الدعم" />
        <Field label="الجوال" value={phone} onChange={setPhone} />
        <Field label="المدينة" value={city} onChange={setCity} />
        <Field label="كود الإحالة" value={affiliate.ref_code} readOnly />
      </div>

      {/* Social */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <h2 className="font-bold text-white font-['Tajawal']">حسابات التواصل</h2>
        <Field label="تويتر" value={twitter} onChange={setTwitter} placeholder="@username" dir="ltr" />
        <Field label="إنستقرام" value={instagram} onChange={setInstagram} placeholder="@username" dir="ltr" />
        <Field label="تيك توك" value={tiktok} onChange={setTiktok} placeholder="@username" dir="ltr" />
      </div>

      {saveMutation.isError && <p className="text-xs text-red-400 font-['Tajawal']">{saveMutation.error?.message}</p>}
      {saveMutation.isSuccess && <p className="text-xs text-emerald-400 font-['Tajawal']">تم الحفظ بنجاح</p>}

      <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold font-['Tajawal'] transition disabled:opacity-50">
        <Save size={16} /> حفظ التغييرات
      </button>

      {/* Danger Zone */}
      <div className="rounded-xl p-5 space-y-3 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.05)' }}>
        <h2 className="font-bold text-red-400 font-['Tajawal'] flex items-center gap-2"><AlertTriangle size={16} /> منطقة الخطر</h2>
        {!showClose ? (
          <button onClick={() => setShowClose(true)} className="text-sm text-red-400/70 hover:text-red-400 font-['Tajawal'] transition">إغلاق حساب الشريك</button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-400/70 font-['Tajawal']">هل أنت متأكد؟ سيتم إيقاف حسابك وستفقد إمكانية الوصول. العمولات المؤكدة ستُصرف.</p>
            <div className="flex gap-2">
              <button onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-bold font-['Tajawal']">
                نعم، أغلق حسابي
              </button>
              <button onClick={() => setShowClose(false)} className="px-4 py-2 rounded-lg bg-white/5 text-white/60 text-sm font-['Tajawal']">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, readOnly, hint, placeholder, dir }) {
  return (
    <div>
      <label className="text-xs text-white/50 font-['Tajawal']">{label}</label>
      <input
        value={value}
        onChange={onChange ? e => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        dir={dir}
        className={`w-full mt-1 px-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white font-['Tajawal'] ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
      />
      {hint && <p className="text-xs text-white/30 font-['Tajawal'] mt-1">{hint}</p>}
    </div>
  )
}
