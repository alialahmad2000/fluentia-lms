import { useNavigate } from 'react-router-dom'
import { Rocket, ArrowRight } from 'lucide-react'

export default function ComingSoon({ featureName }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
        style={{ background: 'var(--accent-amber-glow)' }}
      >
        <Rocket size={36} style={{ color: 'var(--accent-amber)' }} />
      </div>
      <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
        قريباً
      </h1>
      {featureName && (
        <p className="text-base font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          {featureName}
        </p>
      )}
      <p className="text-sm max-w-xs mb-8" style={{ color: 'var(--text-tertiary)' }}>
        نشتغل على هالميزة وبتكون جاهزة قريب إن شاء الله
      </p>
      <button
        onClick={() => navigate('/student')}
        className="btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
      >
        <ArrowRight size={16} />
        الرجوع للرئيسية
      </button>
    </div>
  )
}
