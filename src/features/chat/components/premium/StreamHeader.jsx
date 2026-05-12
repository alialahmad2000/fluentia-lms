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

export default function StreamHeader({
  groupName,
  groupId,
  onlineUserIds = [],
  onSearchOpen,
  isTrainer = false,
  collapsed = false,
}) {
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
              <GroupAvatar name={groupName} size={28} />
              <span
                className="font-semibold text-[var(--ds-text-primary)] text-sm"
                style={{ fontFamily: 'Tajawal, sans-serif' }}
              >
                {groupName}
              </span>
              {onlineUserIds.length > 0 && (
                <span className="text-[11px] text-[var(--ds-accent-success)] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-accent-success)] animate-pulse" />
                  {onlineUserIds.length} متصل
                </span>
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
              <GroupAvatar name={groupName} size={36} />
              <div>
                <p
                  className="font-semibold text-[var(--ds-text-primary)] leading-tight"
                  style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 16 }}
                >
                  {groupName || 'المجموعة'}
                </p>
                {onlineUserIds.length > 0 ? (
                  <div className="mt-0.5">
                    <ActiveUsersDots userIds={onlineUserIds} profiles={[]} />
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--ds-text-muted)] mt-0.5" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                    محادثة المجموعة
                  </p>
                )}
              </div>
            </div>
            <HeaderActions onSearchOpen={onSearchOpen} isTrainer={isTrainer} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

function GroupAvatar({ name, size }) {
  const initial = name?.trim()?.[0] ?? 'م'
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-bold"
      style={{
        width: size,
        height: size,
        background: 'var(--ds-accent-primary)',
        color: 'var(--ds-bg-base)',
        fontSize: size * 0.45,
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      {initial}
    </div>
  )
}

function HeaderActions({ onSearchOpen, isTrainer }) {
  return (
    <div className="flex items-center gap-1 pt-1">
      <button
        onClick={onSearchOpen}
        className="p-2 rounded-xl text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-1)] transition-colors"
        style={{ minWidth: 36, minHeight: 36 }}
        aria-label="بحث"
      >
        <Search size={18} />
      </button>
      {isTrainer && (
        <button
          className="p-2 rounded-xl text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] hover:bg-[var(--ds-surface-1)] transition-colors"
          style={{ minWidth: 36, minHeight: 36 }}
          aria-label="القائمة"
        >
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  )
}
