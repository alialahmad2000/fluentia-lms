import { useState } from 'react'
import { Heart } from 'lucide-react'
import EncourageModal from './EncourageModal'
import { useAuthStore } from '../../stores/authStore'

export default function EncourageButton({ studentId, studentName, size = 'sm' }) {
  const [open, setOpen] = useState(false)
  const { profile, impersonation } = useAuthStore()
  const myId = impersonation?.userId ?? profile?.id

  // Don't show button to encourage yourself
  if (myId === studentId) return null

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        aria-label={`شجع ${studentName}`}
        title={`شجع ${studentName}`}
        className="flex items-center gap-1 rounded-full font-bold transition-all"
        style={{
          padding: size === 'sm' ? '3px 8px' : '4px 10px',
          fontSize: size === 'sm' ? 10 : 12,
          background: 'rgba(245,200,66,0.08)',
          border: '1px solid rgba(245,200,66,0.2)',
          color: 'var(--ds-xp-gold-fg, #f5c842)',
          fontFamily: 'Tajawal, sans-serif',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <Heart size={size === 'sm' ? 10 : 12} />
        شجع
      </button>

      {open && (
        <EncourageModal
          studentId={studentId}
          studentName={studentName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
