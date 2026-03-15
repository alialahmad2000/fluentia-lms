import { useState, lazy, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, Save, Loader2, CreditCard, Brain, Link2, MessageCircle, Bell, Zap, DollarSign, Server, Shield, Database, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { XP_VALUES, PACKAGES } from '../../lib/constants'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import SubTabs from '../../components/common/SubTabs'

// Lazy-load sub-tab content
const AdminAuditLog = lazy(() => import('./AdminAuditLog'))
const AdminDataExport = lazy(() => import('./AdminDataExport'))

const TABS = [
  { key: 'settings', label: 'الإعدادات', icon: Settings },
  { key: 'audit', label: 'سجل المراجعة', icon: Shield },
  { key: 'export', label: 'تصدير البيانات', icon: Database },
]

const TabFallback = () => <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('settings')

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Settings size={22} className="text-violet-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>الإعدادات</h1>
          <p className="text-muted text-sm mt-1">إعدادات النظام وقيم النقاط</p>
        </div>
      </div>

      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accent="gold" />

      <Suspense fallback={<TabFallback />}>
        {activeTab === 'settings' && <SettingsContent />}
        {activeTab === 'audit' && <AdminAuditLog />}
        {activeTab === 'export' && <AdminDataExport />}
      </Suspense>
    </div>
  )
}

function SettingsContent() {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('settings').select('key, value')
      const map = {}
      for (const s of data || []) map[s.key] = s.value
      return map
    },
  })

  const [xpValues, setXpValues] = useState(null)
  const [packagePrices, setPackagePrices] = useState(null)
  const [paymentLink, setPaymentLink] = useState(null)
  const [aiBudget, setAiBudget] = useState(null)
  const [whatsappApiKey, setWhatsappApiKey] = useState(null)
  const [whatsappInstanceId, setWhatsappInstanceId] = useState(null)
  const [paymentReminderDays, setPaymentReminderDays] = useState(null)

  const currentXP = xpValues || settings?.xp_values || XP_VALUES
  const currentPrices = packagePrices || settings?.package_prices || {
    asas: PACKAGES.asas.price, talaqa: PACKAGES.talaqa.price, tamayuz: PACKAGES.tamayuz.price, ielts: PACKAGES.ielts.price,
  }
  const currentPaymentLink = paymentLink ?? settings?.moyasar_payment_link ?? ''
  const currentAiBudget = aiBudget ?? settings?.ai_monthly_budget ?? 50
  const currentWhatsappApiKey = whatsappApiKey ?? settings?.whatsapp_api_key ?? ''
  const currentWhatsappInstanceId = whatsappInstanceId ?? settings?.whatsapp_instance_id ?? ''
  const currentPaymentReminderDays = paymentReminderDays ?? settings?.payment_reminder_days ?? 3

  function updateXP(key, value) { setXpValues({ ...currentXP, [key]: parseInt(value) || 0 }); setSaved(false) }
  function updatePrice(key, value) { setPackagePrices({ ...currentPrices, [key]: parseInt(value) || 0 }); setSaved(false) }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const upserts = []
      if (xpValues) upserts.push({ key: 'xp_values', value: xpValues })
      if (packagePrices) upserts.push({ key: 'package_prices', value: packagePrices })
      if (paymentLink !== null) upserts.push({ key: 'moyasar_payment_link', value: paymentLink })
      if (aiBudget !== null) upserts.push({ key: 'ai_monthly_budget', value: aiBudget })
      if (whatsappApiKey !== null) upserts.push({ key: 'whatsapp_api_key', value: whatsappApiKey })
      if (whatsappInstanceId !== null) upserts.push({ key: 'whatsapp_instance_id', value: whatsappInstanceId })
      if (paymentReminderDays !== null) upserts.push({ key: 'payment_reminder_days', value: paymentReminderDays })
      for (const item of upserts) {
        const { error } = await supabase.from('settings').upsert({ key: item.key, value: item.value }, { onConflict: 'key' }).select()
        if (error) throw error
      }
    },
    onSuccess: () => { setSaved(true); queryClient.invalidateQueries({ queryKey: ['admin-settings'] }) },
  })

  // ─── Data Reset ───────────────────────────────────────────
  const [resetStep, setResetStep] = useState(0) // 0=hidden, 1=confirm1, 2=confirm2
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetResult, setResetResult] = useState(null)

  async function handleDataReset() {
    setResetting(true)
    setResetResult(null)
    try {
      const res = await invokeWithRetry('reset-all-data', {
        body: { confirm: 'RESET' },
        
      }, { timeoutMs: 60000, retries: 0 })

      if (res.error) {
        setResetResult({ success: false, message: typeof res.error === 'object' ? res.error.message : String(res.error) })
      } else {
        setResetResult({ success: true, message: res.data?.message || 'تم إعادة التعيين بنجاح' })
        setResetStep(0)
        setResetConfirmText('')
      }
    } catch {
      setResetResult({ success: false, message: 'خطأ في الاتصال' })
    } finally {
      setResetting(false)
    }
  }

  const xpLabels = {
    assignment_on_time: 'واجب في الوقت', assignment_late: 'واجب متأخر', class_attendance: 'حضور حصة',
    correct_answer: 'إجابة صحيحة', helped_peer: 'مساعدة زميل', shared_summary: 'مشاركة ملخص',
    streak_bonus: 'مكافأة سلسلة', achievement: 'إنجاز', voice_note_bonus: 'مشاركة صوتية',
    writing_bonus: 'مشاركة كتابية', early_bird: 'حضور مبكر', daily_challenge: 'تحدي يومي',
    penalty_absent: 'غياب (خصم)', penalty_unknown_word: 'كلمة غير معروفة (خصم)', penalty_pronunciation: 'نطق خاطئ (خصم)',
  }
  const packageLabels = { asas: 'الأساس', talaqa: 'الطلاقة', tamayuz: 'التميز', ielts: 'IELTS' }

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" size={24} /></div>

  return (
    <div className="space-y-8">
      {/* Save button */}
      <div className="flex items-center gap-3 justify-end">
        {saved && <span className="badge-green">تم الحفظ</span>}
        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="btn-primary text-sm py-2 flex items-center gap-2">
          {saveMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ الإعدادات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* XP Values */}
        <div className="fl-card-static p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 flex items-center justify-center"><Zap size={18} className="text-gold-400" /></div>
            <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>قيم نقاط XP</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(xpLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <label className="input-label flex-1 mb-0">{label}</label>
                <input type="number" value={currentXP[key] ?? 0} onChange={(e) => updateXP(key, e.target.value)} className="input-field py-1 px-2 w-24 text-sm text-center" dir="ltr" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Package Prices */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><DollarSign size={18} className="text-emerald-400" /></div>
              <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>أسعار الباقات (ريال)</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(packageLabels).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="input-label flex-1 mb-0">{label}</label>
                  <input type="number" value={currentPrices[key] ?? 0} onChange={(e) => updatePrice(key, e.target.value)} className="input-field py-1 px-2 w-24 text-sm text-center" dir="ltr" />
                </div>
              ))}
            </div>
          </div>

          {/* Payment Link */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center"><Link2 size={18} className="text-sky-400" /></div>
              <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>رابط الدفع</h3>
            </div>
            <input type="url" value={currentPaymentLink} onChange={(e) => { setPaymentLink(e.target.value); setSaved(false) }} placeholder="https://moyasar.com/pay/..." className="input-field text-sm" dir="ltr" />
          </div>

          {/* AI Budget */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center"><Brain size={18} className="text-violet-400" /></div>
              <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>ميزانية الذكاء الاصطناعي</h3>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={currentAiBudget} onChange={(e) => { setAiBudget(parseInt(e.target.value) || 0); setSaved(false) }} className="input-field py-1 px-2 w-24 text-sm text-center" dir="ltr" />
              <span className="text-muted text-sm">ر.س / شهر</span>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><MessageCircle size={18} className="text-emerald-400" /></div>
              <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>تكامل واتساب</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="input-label">API Key</label>
                <input type="password" value={currentWhatsappApiKey} onChange={(e) => { setWhatsappApiKey(e.target.value); setSaved(false) }} className="input-field text-sm" dir="ltr" />
              </div>
              <div>
                <label className="input-label">Instance ID</label>
                <input type="text" value={currentWhatsappInstanceId} onChange={(e) => { setWhatsappInstanceId(e.target.value); setSaved(false) }} className="input-field text-sm" dir="ltr" />
              </div>
            </div>
          </div>

          {/* Payment Reminders */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center"><Bell size={18} className="text-amber-400" /></div>
              <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>تذكير المدفوعات</h3>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" value={currentPaymentReminderDays} onChange={(e) => { setPaymentReminderDays(parseInt(e.target.value) || 0); setSaved(false) }} className="input-field py-1 px-2 w-24 text-sm text-center" dir="ltr" min="1" max="30" />
              <span className="text-muted text-sm">يوم قبل الموعد</span>
            </div>
          </div>

          {/* System Info */}
          <div className="fl-card-static p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center"><Server size={18} className="text-sky-400" /></div>
              <h3 className="text-section-title" style={{ color: 'var(--text-primary)' }}>معلومات النظام</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">الإصدار</span><span className="badge-blue">3.0.0</span></div>
              <div className="flex justify-between"><span className="text-muted">البيئة</span><span style={{ color: 'var(--text-primary)' }}>إنتاج</span></div>
              <div className="flex justify-between"><span className="text-muted">قاعدة البيانات</span><span className="badge-green">متصلة</span></div>
              <div className="flex justify-between"><span className="text-muted">Edge Functions</span><span className="badge-green">24 دالة</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Danger Zone ───────────────────────────────────── */}
      <div className="fl-card-static p-6 border-red-500/30 border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <h3 className="text-section-title text-red-400">منطقة الخطر</h3>
            <p className="text-xs text-muted mt-0.5">عمليات لا يمكن التراجع عنها</p>
          </div>
        </div>

        {resetResult && (
          <div className={`rounded-xl p-3 mb-4 text-sm ${resetResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {resetResult.message}
          </div>
        )}

        {resetStep === 0 && (
          <button onClick={() => setResetStep(1)} className="px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-all duration-200">
            إعادة تعيين جميع بيانات الطلاب
          </button>
        )}

        {resetStep === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-red-400">هل أنت متأكد؟ سيتم حذف جميع بيانات النشاط (الواجبات، المهام، النقاط، الحضور) مع الإبقاء على حسابات الطلاب والمجموعات.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setResetStep(2)} className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm border border-red-500/30 hover:bg-red-500/30 transition-all">
                نعم، متأكد
              </button>
              <button onClick={() => setResetStep(0)} className="btn-ghost text-sm">إلغاء</button>
            </div>
          </div>
        )}

        {resetStep === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-red-400">اكتب <span className="font-bold font-mono">RESET</span> للتأكيد النهائي:</p>
            <input
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="اكتب RESET"
              className="input-field text-sm w-48 border-red-500/30"
              dir="ltr"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleDataReset}
                disabled={resetConfirmText !== 'RESET' || resetting}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {resetting ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                تنفيذ إعادة التعيين
              </button>
              <button onClick={() => { setResetStep(0); setResetConfirmText('') }} className="btn-ghost text-sm">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
