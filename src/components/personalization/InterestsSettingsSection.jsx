import { useEffect, useState } from 'react'
import { Check, Pencil } from 'lucide-react'
import { INTEREST_BUCKETS, MAX_INTERESTS, getBucketByKey } from '@/lib/personalization/interest-buckets'
import { useUserInterests, useUpdateUserInterests } from '@/hooks/useUserInterests'

export default function InterestsSettingsSection() {
  const [isEditing, setIsEditing] = useState(false)
  const [selected, setSelected] = useState([])
  const { data: interestsRow, isLoading } = useUserInterests()
  const updateMutation = useUpdateUserInterests()

  useEffect(() => {
    if (interestsRow?.interests) setSelected(interestsRow.interests)
  }, [interestsRow?.interests])

  if (isLoading) return null
  const currentInterests = interestsRow?.interests ?? []

  const toggle = (key) => {
    setSelected(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key)
      if (prev.length >= MAX_INTERESTS) return prev
      return [...prev, key]
    })
  }

  const handleSave = async () => {
    await updateMutation.mutateAsync({ interests: selected, completed: true })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setSelected(currentInterests)
    setIsEditing(false)
  }

  return (
    <section className="rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
      <header className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white font-['Tajawal']">اهتماماتي</h2>
          <p className="text-sm mt-0.5 font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.6)' }}>
            تستخدم هذه الاهتمامات لتخصيص النسخ البديلة من القراءات.
          </p>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="font-['Tajawal']">تعديل</span>
          </button>
        )}
      </header>

      {!isEditing ? (
        currentInterests.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {currentInterests.map(key => {
              const b = getBucketByKey(key)
              if (!b) return null
              const Icon = b.icon
              return (
                <span key={key} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white font-['Tajawal']"
                  style={{ background: 'rgba(212,165,116,0.15)' }}>
                  <Icon className="h-3.5 w-3.5" style={{ color: 'var(--vm-accent,#d4a574)' }} />
                  {b.labelAr}
                </span>
              )
            })}
          </div>
        ) : (
          <p className="text-sm italic font-['Tajawal']" style={{ color: 'rgba(255,255,255,0.5)' }}>
            لم تختر أي اهتمامات بعد. اضغط "تعديل" للبدء.
          </p>
        )
      ) : (
        <>
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
                onClick={handleCancel}
                className="rounded-xl px-3 py-2 text-sm transition-colors font-['Tajawal']"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="rounded-xl px-4 py-2 text-sm font-semibold transition-transform duration-200 hover:scale-[1.03] font-['Tajawal']"
                style={{ background: 'var(--vm-accent,#d4a574)', color: 'var(--vm-surface,#0f0a1f)' }}
              >
                {updateMutation.isPending ? 'جاري الحفظ…' : 'حفظ'}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
