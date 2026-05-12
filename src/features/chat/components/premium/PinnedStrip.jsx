import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pin, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import PinnedCard from './PinnedCard'
import { slideIn } from '../../lib/motion'

const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-elevated) 82%, transparent)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  borderBottom: '1px solid color-mix(in srgb, var(--ds-accent-gold) 18%, transparent)',
  boxShadow: 'inset 0 1px 0 0 color-mix(in srgb, white 4%, transparent)',
}

export default function PinnedStrip({ groupId, onScrollToMessage }) {
  const [expanded, setExpanded] = useState(true)

  const { data: pinned = [] } = useQuery({
    queryKey: ['group-pinned', groupId],
    enabled: !!groupId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('group_messages')
        .select('*, sender:profiles!sender_id(id, full_name, display_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('is_pinned', true)
        .is('deleted_at', null)
        .order('pinned_at', { ascending: false })
        .limit(5)
      if (error) throw error
      return data ?? []
    },
  })

  // Empty case: no reserved space
  if (!pinned.length) return null

  return (
    <div style={{ ...glass, position: 'sticky', top: 56, zIndex: 24, direction: 'rtl' }}>
      {/* Collapse toggle bar */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center justify-center gap-2 w-full px-4 py-1.5 transition-colors hover:bg-[var(--ds-surface-1)]"
      >
        <Pin size={11} style={{ color: 'var(--ds-accent-gold)' }} />
        <span
          className="text-[12px] font-medium"
          style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-accent-gold)', opacity: 0.85 }}
        >
          {pinned.length === 1 ? '١ مثبتة' : `${pinned.length} مثبتات`}
        </span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={13} style={{ color: 'var(--ds-text-muted)' }} />
        </motion.div>
      </button>

      {/* Expanded pin cards */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            {...slideIn}
            className="flex gap-2 px-4 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}
          >
            {pinned.slice(0, 5).map((p) => (
              <div key={p.id} style={{ scrollSnapAlign: 'start' }}>
                <PinnedCard
                  message={p}
                  onScrollTo={onScrollToMessage}
                />
              </div>
            ))}
            {pinned.length > 3 && (
              <button
                className="shrink-0 flex items-center px-3 rounded-xl text-[12px]"
                style={{
                  fontFamily: 'Tajawal, sans-serif',
                  color: 'var(--ds-accent-gold)',
                  background: 'color-mix(in srgb, var(--ds-accent-gold) 8%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--ds-accent-gold) 20%, transparent)',
                  minWidth: 48,
                  whiteSpace: 'nowrap',
                }}
              >
                المزيد
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
