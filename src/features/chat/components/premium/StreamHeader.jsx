import { motion } from 'framer-motion'
import { Search, ChevronRight, Images, Bell, BellOff } from 'lucide-react'
import { useChatMutes, useToggleChatMute, muteActive } from '../../queries/useChatMute'

// المجلس — quiet centered wordmark header (matches the prototype). The presence
// circle below owns identity + who's-here, so the header stays minimal.
const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-elevated) 55%, transparent)',
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  borderBottom: '1px solid color-mix(in srgb, var(--ds-accent-gold) 10%, var(--ds-border-subtle))',
}

function IconBtn({ onClick, label, children }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="rounded-full flex items-center justify-center shrink-0 transition-colors"
      style={{ width: 38, height: 38, color: 'var(--ds-text-secondary)', border: '1px solid transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-surface-1)'; e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'; e.currentTarget.style.color = 'var(--ds-text-primary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--ds-text-secondary)' }}>
      {children}
    </button>
  )
}

const ORD = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس']

export default function StreamHeader({ groupName, groupLevel, groupId, onSearchOpen, onOpenMedia, onBack }) {
  const { data: mutes } = useChatMutes()
  const toggleMute = useToggleChatMute()
  const muted = muteActive(mutes, 'group', groupId)
  const sub = groupLevel ? `حلقة المحادثة · المستوى ${ORD[Number(groupLevel)] || groupLevel}` : 'حلقة المحادثة'

  return (
    <motion.header layout style={{ ...glass, direction: 'rtl', position: 'relative', zIndex: 3 }} className="px-2.5">
      <div className="flex items-center justify-between" style={{ paddingTop: 10, paddingBottom: 10 }}>
        <div className="flex items-center" style={{ minWidth: 72 }}>
          {onBack && <IconBtn onClick={onBack} label="رجوع"><ChevronRight size={22} /></IconBtn>}
        </div>

        <div className="text-center leading-tight px-1 flex-1 min-w-0">
          <div className="font-bold flex items-center justify-center gap-1.5"
            style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15, letterSpacing: '0.01em' }}>
            <span style={{ color: 'var(--ds-accent-gold)', whiteSpace: 'nowrap' }}>المجلس</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ds-accent-gold)', display: 'inline-block', flexShrink: 0 }} />
            <span className="truncate" style={{ color: 'var(--ds-text-primary)', fontWeight: 500, maxWidth: 210 }}>{groupName || 'المجموعة'}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ds-text-muted)', marginTop: 3, fontFamily: 'Tajawal, sans-serif', letterSpacing: '0.02em' }}>
            {sub}
          </div>
        </div>

        <div className="flex items-center gap-0.5" style={{ minWidth: 88, justifyContent: 'flex-end' }}>
          <IconBtn onClick={() => { if (groupId) toggleMute.mutate({ scope: 'group', target: groupId, muted: !muted }) }}
            label={muted ? 'تشغيل إشعارات المجلس' : 'كتم إشعارات المجلس'}>
            {muted ? <BellOff size={18} style={{ color: 'var(--ds-accent-gold)' }} /> : <Bell size={18} />}
          </IconBtn>
          {onOpenMedia && <IconBtn onClick={onOpenMedia} label="الوسائط المشتركة"><Images size={18} /></IconBtn>}
          <IconBtn onClick={onSearchOpen} label="بحث"><Search size={18} /></IconBtn>
        </div>
      </div>
    </motion.header>
  )
}
