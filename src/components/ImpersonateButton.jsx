import { Eye } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAuthStore } from '../stores/authStore'
import { queryClient } from '../lib/queryClient'

export default function ImpersonateButton({ userId, role, name, variant = 'icon' }) {
  const { startImpersonation, impersonation } = useAuthStore(useShallow((s) => ({ startImpersonation: s.startImpersonation, impersonation: s.impersonation })))

  // Don't show while already impersonating
  if (impersonation) return null

  const handleClick = async (e) => {
    e.stopPropagation()
    try {
      await startImpersonation(userId, role, name)
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert(`تعذّر بدء المعاينة: ${err?.message || 'حدث خطأ'}`)
      return
    }
    // Clear all cached queries so the impersonated user's data is fetched fresh
    queryClient.clear()
    // Full page load forces all components to remount with new user context.
    // Route to the impersonated role's home (agents → /team, admins → /admin).
    // Pro Desk students land straight in their /desk surface (Operations Room), not the
    // normal student home. studentData was loaded by startImpersonation above.
    const usesDesk = useAuthStore.getState().studentData?.uses_pro_desk === true
    const dest = role === 'student' ? (usesDesk ? '/desk' : '/student') : role === 'agent' ? '/team' : role === 'admin' ? '/admin' : role === 'coordinator' ? '/coordinator' : '/trainer'
    window.location.href = dest
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        title={`تصفح كـ ${name}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 hover:translate-y-[-1px]"
        style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          color: '#f59e0b',
        }}
      >
        <Eye size={14} />
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 hover:translate-y-[-1px] min-h-[36px]"
      style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        color: '#f59e0b',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      <Eye size={13} />
      تصفح كـ {name}
    </button>
  )
}
