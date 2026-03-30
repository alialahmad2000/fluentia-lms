import { useNavigate } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'

export default function ImpersonateButton({ userId, role, name, variant = 'icon' }) {
  const { startImpersonation, impersonation } = useAuthStore()
  const navigate = useNavigate()

  // Don't show while already impersonating
  if (impersonation) return null

  const handleClick = async (e) => {
    e.stopPropagation()
    await startImpersonation(userId, role, name)
    navigate(role === 'student' ? '/student' : '/trainer')
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
