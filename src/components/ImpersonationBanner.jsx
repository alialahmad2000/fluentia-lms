import { Eye, X } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { queryClient } from '../lib/queryClient'

export default function ImpersonationBanner() {
  const { impersonation, stopImpersonation } = useAuthStore()

  if (!impersonation) return null

  const roleLabel = impersonation.role === 'student' ? 'طالب' : 'مدرب'

  const handleExit = () => {
    const returnPath = stopImpersonation()
    // Clear all cached queries so admin's own data is fetched fresh
    queryClient.clear()
    // Full page load forces all components to remount with admin context
    window.location.href = returnPath
  }

  return (
    <div
      dir="rtl"
      className="fixed top-[var(--sat)] left-0 right-0 z-[9999] flex items-center justify-between px-5 py-2"
      style={{
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: '#0a1225',
        fontFamily: 'Tajawal, sans-serif',
        boxShadow: '0 2px 12px rgba(245, 158, 11, 0.3)',
      }}
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        <Eye size={16} />
        <span>أنت تتصفح كـ <span className="underline">{impersonation.name}</span> ({roleLabel})</span>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold min-h-[36px]"
        style={{
          background: '#0a1225',
          color: '#f59e0b',
          border: 'none',
          fontFamily: 'Tajawal, sans-serif',
        }}
      >
        <X size={14} />
        خروج
      </button>
    </div>
  )
}
