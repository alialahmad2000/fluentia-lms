import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles, Check } from 'lucide-react'
import { INTEREST_BUCKETS, MAX_INTERESTS } from '@/lib/personalization/interest-buckets'
import { useUserInterests, useUpdateUserInterests, shouldShowInterestSurvey } from '@/hooks/useUserInterests'

export default function InterestSurveyCard() {
  const [selected, setSelected] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: interestsRow, isLoading } = useUserInterests()
  const updateMutation = useUpdateUserInterests()

  if (isLoading) return null
  if (!shouldShowInterestSurvey(interestsRow)) return null

  const toggle = (key) => {
    setSelected(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, key]
    })
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({ interests: selected, completed: true })
  }

  const handleDismiss = async () => {
    await updateMutation.mutateAsync({ interests: [], dismissed: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 p-5 sm:p-6 mb-6"
      style={{ background: 'linear-gradient(135deg, var(--vm-surface-elevated,#1a1530), var(--vm-surface,#0f0a1f))' }}
    >
      <div className="pointer-events-none absolute -top-12 -end-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: 'rgba(212,165,116,0.1)' }} />

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="إخفاء"
        className="absolute top-3 end-3 rounded-lg p-1.5 transition-colors"
        style={{ color: 'rgba(255,255,255,0.4)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5" style={{ color: 'var(--vm-accent,#d4a574)' }} />
          <span className="text-[11px] font-semibold tracking-wide font-['Tajawal']"
            style={{ color: 'var(--vm-accent,#d4a574)' }}>
            ميزة جديدة
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-white mb-1 font-['Tajawal']">
          خلِّ القصص تنكتب على مقاسك
        </h3>
        <p className="text-sm leading-relaxed mb-5 font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.7)' }}>
          اختر حتى {MAX_INTERESTS} اهتمامات — ونعطيك نسخة من كل قراءة بسياق يخصّك،
          بجانب القراءة الأصلية اللي تأخذها مع المعلّم.
        </p>

        {!isExpanded ? (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:scale-[1.03] font-['Tajawal']"
            style={{ background: 'var(--vm-accent,#d4a574)', color: 'var(--vm-surface,#0f0a1f)' }}
          >
            اختر اهتماماتي
          </button>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key="picker"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                {INTEREST_BUCKETS.map(bucket => {
                  const isSelected = selected.includes(bucket.key)
                  const Icon = bucket.icon
                  const atCap = selected.length >= MAX_INTERESTS && !isSelected
                  return (
                    <button
                      key={bucket.key}
                      type="button"
                      onClick={() => toggle(bucket.key)}
                      disabled={atCap}
                      className="relative rounded-xl border p-3 text-center transition-all duration-200"
                      style={{
                        borderColor: isSelected ? 'var(--vm-accent,#d4a574)' : atCap ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.1)',
                        background: isSelected ? 'rgba(212,165,116,0.12)' : atCap ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                        opacity: atCap ? 0.4 : 1,
                        cursor: atCap ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 end-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                          style={{ background: 'var(--vm-accent,#d4a574)' }}>
                          <Check className="h-2.5 w-2.5" style={{ color: 'var(--vm-surface,#0f0a1f)' }} strokeWidth={3} />
                        </div>
                      )}
                      <Icon className="mx-auto mb-1.5 h-5 w-5"
                        style={{ color: isSelected ? 'var(--vm-accent,#d4a574)' : 'rgba(255,255,255,0.7)' }} />
                      <span className="block text-[12px] font-medium leading-tight font-['Tajawal']"
                        style={{ color: isSelected ? '#fff' : 'rgba(255,255,255,0.8)' }}>
                        {bucket.labelAr}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {selected.length}/{MAX_INTERESTS} اختيارات
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={updateMutation.isPending}
                    className="rounded-xl px-3 py-2 text-sm transition-colors font-['Tajawal']"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    ليس الآن
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={selected.length === 0 || updateMutation.isPending}
                    className="rounded-xl px-4 py-2 text-sm font-semibold transition-transform duration-200 hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100 font-['Tajawal']"
                    style={{ background: 'var(--vm-accent,#d4a574)', color: 'var(--vm-surface,#0f0a1f)' }}
                  >
                    {updateMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
