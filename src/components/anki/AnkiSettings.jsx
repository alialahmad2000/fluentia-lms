import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Save, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const NEW_OPTIONS = [10, 20, 30, 50]
const MAX_OPTIONS = [100, 200, 500]
const ORDER_OPTIONS = [
  { value: 'by_level', label: 'حسب المستوى' },
  { value: 'random', label: 'عشوائي' },
  { value: 'by_unit', label: 'حسب الوحدة' },
]

export default function AnkiSettings({ studentId, settings, onBack, onSaved }) {
  const [daily, setDaily] = useState(settings?.daily_new_cards || 20)
  const [maxR, setMaxR] = useState(settings?.daily_max_reviews || 200)
  const [order, setOrder] = useState(settings?.review_order || 'by_level')
  const [autoplay, setAutoplay] = useState(!!settings?.autoplay_audio)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    if (!studentId) return
    setSaving(true)
    const { error } = await supabase
      .from('students')
      .update({
        anki_daily_new_cards: daily,
        anki_daily_max_reviews: maxR,
        anki_review_order: order,
        anki_autoplay_audio: autoplay,
      })
      .eq('id', studentId)
    setSaving(false)
    if (!error) {
      setSaved(true)
      onSaved?.({
        daily_new_cards: daily,
        daily_max_reviews: maxR,
        review_order: order,
        autoplay_audio: autoplay,
      })
      setTimeout(() => setSaved(false), 1500)
    }
  }

  return (
    <div dir="rtl" className="max-w-xl mx-auto flex flex-col gap-4">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors w-fit"
      >
        <ArrowRight size={16} />
        <span className="font-['Tajawal']">رجوع</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 space-y-5"
      >
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Tajawal']">
          إعدادات المراجعة اليومية
        </h2>

        {/* Daily new cards */}
        <Field label="كلمات جديدة يوميًا">
          <div className="flex flex-wrap gap-2">
            {NEW_OPTIONS.map((n) => (
              <Pill key={n} active={daily === n} onClick={() => setDaily(n)}>
                {n}
              </Pill>
            ))}
          </div>
        </Field>

        {/* Max reviews */}
        <Field label="الحد الأقصى للمراجعات">
          <div className="flex flex-wrap gap-2">
            {MAX_OPTIONS.map((n) => (
              <Pill key={n} active={maxR === n} onClick={() => setMaxR(n)}>
                {n}
              </Pill>
            ))}
          </div>
        </Field>

        {/* Review order */}
        <Field label="ترتيب المراجعة">
          <div className="flex flex-wrap gap-2">
            {ORDER_OPTIONS.map((o) => (
              <Pill key={o.value} active={order === o.value} onClick={() => setOrder(o.value)}>
                {o.label}
              </Pill>
            ))}
          </div>
        </Field>

        {/* Autoplay */}
        <Field label="تشغيل النطق تلقائيًا">
          <button
            type="button"
            onClick={() => setAutoplay((v) => !v)}
            className={[
              'w-14 h-8 rounded-full relative transition-colors',
              autoplay ? 'bg-emerald-500' : 'bg-slate-700',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1 w-6 h-6 bg-white rounded-full transition-all',
                autoplay ? 'right-1' : 'right-7',
              ].join(' ')}
            />
          </button>
        </Field>

        <button
          onClick={save}
          disabled={saving}
          className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold font-['Tajawal'] flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saved ? <Check size={18} /> : <Save size={16} />}
          {saved ? 'تم الحفظ' : saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </motion.div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-[var(--text-secondary)] font-['Tajawal']">
        {label}
      </div>
      {children}
    </div>
  )
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-4 h-10 rounded-xl border text-sm font-["Tajawal"] transition-colors',
        active
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
