import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Loader2, RefreshCw, CreditCard, Brain, HardDrive, Link2, Moon } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { XP_VALUES, PACKAGES } from '../../lib/constants'

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  // Load settings from DB
  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('settings')
        .select('key, value')
      const map = {}
      for (const s of data || []) {
        map[s.key] = s.value
      }
      return map
    },
  })

  // Local state for editable values
  const [xpValues, setXpValues] = useState(null)
  const [packagePrices, setPackagePrices] = useState(null)
  const [paymentLink, setPaymentLink] = useState(null)
  const [aiBudget, setAiBudget] = useState(null)

  // Initialize from settings or defaults
  const currentXP = xpValues || settings?.xp_values || XP_VALUES
  const currentPrices = packagePrices || settings?.package_prices || {
    asas: PACKAGES.asas.price,
    talaqa: PACKAGES.talaqa.price,
    tamayuz: PACKAGES.tamayuz.price,
    ielts: PACKAGES.ielts.price,
  }
  const currentPaymentLink = paymentLink ?? settings?.moyasar_payment_link ?? ''
  const currentAiBudget = aiBudget ?? settings?.ai_monthly_budget ?? 50

  function updateXP(key, value) {
    const updated = { ...currentXP, [key]: parseInt(value) || 0 }
    setXpValues(updated)
    setSaved(false)
  }

  function updatePrice(key, value) {
    const updated = { ...currentPrices, [key]: parseInt(value) || 0 }
    setPackagePrices(updated)
    setSaved(false)
  }

  // Save
  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = []
      if (xpValues) upserts.push({ key: 'xp_values', value: JSON.stringify(xpValues) })
      if (packagePrices) upserts.push({ key: 'package_prices', value: JSON.stringify(packagePrices) })
      if (paymentLink !== null) upserts.push({ key: 'moyasar_payment_link', value: JSON.stringify(paymentLink) })
      if (aiBudget !== null) upserts.push({ key: 'ai_monthly_budget', value: JSON.stringify(aiBudget) })

      for (const item of upserts) {
        const { error } = await supabase
          .from('settings')
          .upsert({ key: item.key, value: item.value }, { onConflict: 'key' })
          .select()
        if (error) throw error
      }
    },
    onSuccess: () => {
      setSaved(true)
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
    },
    onError: (err) => {
      console.error('Save settings error:', err)
    },
  })

  const xpLabels = {
    assignment_on_time: 'واجب في الوقت',
    assignment_late: 'واجب متأخر',
    class_attendance: 'حضور حصة',
    correct_answer: 'إجابة صحيحة',
    helped_peer: 'مساعدة زميل',
    shared_summary: 'مشاركة ملخص',
    streak_bonus: 'مكافأة سلسلة',
    achievement: 'إنجاز',
    voice_note_bonus: 'مشاركة صوتية',
    writing_bonus: 'مشاركة كتابية',
    early_bird: 'حضور مبكر',
    daily_challenge: 'تحدي يومي',
    penalty_absent: 'غياب (خصم)',
    penalty_unknown_word: 'كلمة غير معروفة (خصم)',
    penalty_pronunciation: 'نطق خاطئ (خصم)',
  }

  const packageLabels = {
    asas: 'الأساس',
    talaqa: 'الطلاقة',
    tamayuz: 'التميز',
    ielts: 'IELTS',
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">الإعدادات</h1>
          <p className="text-muted text-sm mt-1">إعدادات النظام وقيم النقاط</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-400 text-sm">تم الحفظ</span>}
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Values */}
        <div className="glass-card p-5">
          <h3 className="text-lg font-bold text-white mb-4">قيم نقاط XP</h3>
          <div className="space-y-3">
            {Object.entries(xpLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="text-sm text-muted flex-1">{label}</label>
                <input
                  type="number"
                  value={currentXP[key] ?? 0}
                  onChange={(e) => updateXP(key, e.target.value)}
                  className="input-field py-1 px-2 w-24 text-sm text-center"
                  dir="ltr"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Package Prices */}
        <div className="space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-lg font-bold text-white mb-4">أسعار الباقات (ريال)</h3>
            <div className="space-y-3">
              {Object.entries(packageLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-muted flex-1">{label}</label>
                  <input
                    type="number"
                    value={currentPrices[key] ?? 0}
                    onChange={(e) => updatePrice(key, e.target.value)}
                    className="input-field py-1 px-2 w-24 text-sm text-center"
                    dir="ltr"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Moyasar Payment Link */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Link2 size={18} className="text-sky-400" />
              <h3 className="text-lg font-bold text-white">رابط الدفع (Moyasar)</h3>
            </div>
            <p className="text-muted text-xs mb-3">رابط الدفع الذي يظهر للطلاب في صفحة الفواتير</p>
            <input
              type="url"
              value={currentPaymentLink}
              onChange={(e) => { setPaymentLink(e.target.value); setSaved(false) }}
              placeholder="https://moyasar.com/pay/..."
              className="input-field text-sm"
              dir="ltr"
            />
          </div>

          {/* AI Budget */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-violet-400" />
              <h3 className="text-lg font-bold text-white">ميزانية الذكاء الاصطناعي</h3>
            </div>
            <p className="text-muted text-xs mb-3">الحد الأقصى الشهري لتكاليف API (ريال سعودي)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentAiBudget}
                onChange={(e) => { setAiBudget(parseInt(e.target.value) || 0); setSaved(false) }}
                className="input-field py-1 px-2 w-24 text-sm text-center"
                dir="ltr"
              />
              <span className="text-muted text-sm">ر.س / شهر</span>
            </div>
          </div>

          {/* System Info */}
          <div className="glass-card p-5">
            <h3 className="text-lg font-bold text-white mb-4">معلومات النظام</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">الإصدار</span>
                <span className="text-white">2.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">البيئة</span>
                <span className="text-white">إنتاج</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">قاعدة البيانات</span>
                <span className="text-emerald-400">متصلة</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Edge Functions</span>
                <span className="text-emerald-400">16 دالة</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
