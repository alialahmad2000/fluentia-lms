import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pin, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import PinnedCard from './PinnedCard'
import { slideIn } from '../../lib/motion'

const glass = {
  background: 'color-mix(in srgb, var(--ds-bg-elevated) 80%, transparent)',
  backdropFilter: 'blur(20px) saturate(140%)',
  WebkitBackdropFilter: 'blur(20px) saturate(140%)',
  borderBottom: '1px solid color-mix(in srgb, var(--ds-accent-gold) 15%, transparent)',
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

  if (!pinned.length) return null

  return (
    <div style={{ ...glass, position: 'sticky', top: 88, zIndex: 24, direction: 'rtl' }}>
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 w-full px-4 py-2 hover:bg-[var(--ds-surface-1)] transition-colors"
      >
        <Pin size={12} style={{ color: 'var(--ds-accent-gold)' }} />
        <span
          className="flex-1 text-xs text-right"
          style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-secondary)' }}
        >
          {pinned.length === 1 ? '١ مثبتة' : `${pinned.length} مثبتات`}
        </span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} style={{ color: 'var(--ds-text-muted)' }} />
        </motion.div>
      </button>

      {/* Expanded pin cards */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            {...slideIn}
            className="flex gap-2 px-4 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {pinned.slice(0, 5).map((p) => (
              <PinnedCard
                key={p.id}
                message={p}
                onScrollTo={onScrollToMessage}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
