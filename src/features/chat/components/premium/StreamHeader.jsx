import { motion, AnimatePresence } from 'framer-motion'
import { Search, MoreVertical } from 'lucide-react'
import { fadeRise } from '../../lib/motion'
import ActiveUsersDots from './ActiveUsersDots'

const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-elevated) 80%, transparent)',
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  borderBottom: '1px solid var(--ds-border-subtle)',
  boxShadow: '0 8px 32px -8px rgba(0,0,0,0.4), inset 0 1px 0 0 color-mix(in srgb, white 6%, transparent)',
}

// Level → gradient + shadow color
function getLevelGradient(level) {
  const l = Number(level) || 0
  if (l <= 1)  return { grad: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', glow: 'rgba(59,130,246,0.30)' }
  if (l === 2) return { grad: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', glow: 'rgba(251,191,36,0.30)' }
  if (l === 3) return { grad: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', glow: 'rgba(124,58,237,0.30)' }
  // IELTS / 4+
  return { grad: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)', glow: 'rgba(16,185,129,0.30)' }
}

export default function StreamHeader({
  groupName,
  groupLevel,
  groupId,
  onlineUserIds = [],
  onSearchOpen,
  isTrainer = false,
  collapsed = false,
}) {
  const { grad, glow } = getLevelGradient(groupLevel)
  const initial = groupName?.trim()?.slice(0, 2) ?? 'م'

  return (
    <motion.header
      layout
      style={{ ...glass, direction: 'rtl', position: 'sticky', top: 0, zIndex: 30 }}
      className="px-4"
    >
      <AnimatePresence mode="wait">
        {collapsed ? (
          <motion.div
            key="collapsed"
            {...fadeRise}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-2">
              <GroupAvatar initial={initial} size={28} grad={grad} glow={glow} />
              <span
                className="font-bold text-[var(--ds-text-primary)]"
                style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15 }}
              >
                {groupName}
              </span>
              {onlineUserIds.length > 0 && (
                <OnlineChip count={onlineUserIds.length} />
              )}
            </div>
            <HeaderActions onSearchOpen={onSearchOpen} isTrainer={isTrainer} />
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            {...fadeRise}
            className="flex items-start justify-between py-3"
          >
            <div className="flex items-center gap-3">
              <GroupAvatar initial={initial} size={40} grad={grad} glow={glow} />
              <div>
                <p
                  className="font-bold leading-tight text-[var(--ds-text-primary)]"
                  style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 18 }}
                >
                  {groupName || 'المجموعة'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {onlineUserIds.length > 0 ? (
                    <OnlineChip count={onlineUserIds.length} />
                  ) : (
                    <span className="text-[12px]" style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-muted)' }}>
                      محادثة المجموعة
                    </span>
                  )}
                </div>
              </div>
            </div>
            <HeaderActions onSearchOpen={onSearchOpen} isTrainer={isTrainer} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

function GroupAvatar({ initial, size, grad, glow }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold select-none"
      style={{
        width: size,
        height: size,
        background: grad,
        color: 'rgba(255,255,255,0.92)',
        fontSize: Math.round(size * 0.38),
        fontFamily: 'Tajawal, sans-serif',
        fontWeight: 700,
        boxShadow: `0 4px 16px -4px ${glow}, inset 0 1px 0 0 rgba(255,255,255,0.15)`,
        transition: 'all 0.24s',
      }}
    >
      {initial}
    </div>
  )
}

function OnlineChip({ count }) {
  return (
    <span
      className="flex items-center gap-1 text-[12px]"
      style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-accent-success)' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: 'var(--ds-accent-success)', animation: 'pulse 2s ease-in-out infinite' }}
      />
      {count === 1 ? 'متصل الآن' : `${count} متصلين الآن`}
    </span>
  )
}

function HeaderActions({ onSearchOpen, isTrainer }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onSearchOpen}
        className="rounded-full transition-all"
        style={{
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--ds-text-secondary)',
          border: '1px solid transparent',
          transition: 'all 0.12s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--ds-surface-1)'
          e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'
          e.currentTarget.style.color = 'var(--ds-text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
          e.currentTarget.style.color = 'var(--ds-text-secondary)'
        }}
        aria-label="بحث"
      >
        <Search size={18} />
      </button>
      {isTrainer && (
        <button
          className="rounded-full transition-all"
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ds-text-secondary)',
            border: '1px solid transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--ds-surface-1)'
            e.currentTarget.style.borderColor = 'var(--ds-border-subtle)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
          }}
          aria-label="القائمة"
        >
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  )
}
