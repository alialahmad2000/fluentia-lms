import { Lock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { PACKAGES } from '../../lib/constants'

export default function LockedFeature({ requiredPackage, featureName }) {
  const navigate = useNavigate()
  const { studentData } = useAuthStore()
  const currentPkg = PACKAGES[studentData?.package] || PACKAGES.asas
  const requiredPkg = PACKAGES[requiredPackage]

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6" dir="rtl">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 0 30px var(--accent-gold-glow, rgba(245,158,11,0.1))',
        }}
      >
        <Lock size={32} style={{ color: 'var(--accent-gold)' }} />
      </div>

      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        {featureName || 'هذه الميزة'} مقفلة
      </h1>

      <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-secondary)' }}>
        هذه الميزة متاحة لباقة {requiredPkg?.name_ar || requiredPackage} وأعلى.
        {currentPkg && (
          <> باقتك الحالية: <strong style={{ color: 'var(--accent-sky)' }}>{currentPkg.name_ar}</strong></>
        )}
      </p>

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium min-h-[44px] transition-all"
        style={{
          background: 'var(--glass-card)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        <ArrowRight size={16} />
        رجوع
      </button>
    </div>
  )
}
