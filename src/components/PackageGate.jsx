import { Lock } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { PACKAGES } from '../lib/constants'

// Package hierarchy: asas (1) < talaqa (2) < tamayuz (3) < ielts (4)
const PACKAGE_RANK = { asas: 1, talaqa: 2, tamayuz: 3, ielts: 4 }

export function hasPackageAccess(studentPackage, requiredPackage) {
  const studentRank = PACKAGE_RANK[studentPackage] || 0
  const requiredRank = PACKAGE_RANK[requiredPackage] || 0
  return studentRank >= requiredRank
}

export function usePackageAccess(requiredPackage) {
  const { studentData, profile } = useAuthStore()
  // Non-students (admin/trainer) always have access
  if (profile?.role !== 'student') return true
  return hasPackageAccess(studentData?.package, requiredPackage)
}

export default function PackageGate({ requiredPackage, featureName, children }) {
  const { studentData, profile } = useAuthStore()

  // Non-students always see content
  if (profile?.role !== 'student') return children

  const hasAccess = hasPackageAccess(studentData?.package, requiredPackage)
  if (hasAccess) return children

  const requiredInfo = PACKAGES[requiredPackage]

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[200px]">
      {/* Blurred background hint */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        {children}
      </div>
      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
        style={{
          background: 'var(--package-gate-bg, rgba(0,0,0,0.5))',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          <Lock size={24} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p className="text-sm font-medium text-center px-4" style={{ color: 'var(--text-secondary)' }}>
          {featureName ? `${featureName} — ` : ''}متاحة لـ{requiredInfo?.name_ar || requiredPackage} وأعلى
        </p>
        <span
          className="text-xs px-3 py-1.5 rounded-full cursor-default"
          style={{ background: 'var(--accent-gold-glow)', color: 'var(--accent-gold)' }}
        >
          رقّي باقتك
        </span>
      </div>
    </div>
  )
}
