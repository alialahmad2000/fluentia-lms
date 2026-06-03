// Online presence — overlapping coloured avatar cluster + count.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import SenderAvatar from './SenderAvatar'

export default function ActiveUsersDots({ userIds = [] }) {
  const ids = [...userIds].filter(Boolean)
  const { data: people = [] } = useQuery({
    queryKey: ['presence-profiles', ids.slice(0, 8).sort().join(',')],
    enabled: ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, display_name, avatar_url').in('id', ids.slice(0, 8))
      return data ?? []
    },
  })

  if (!ids.length) return null
  const shown = people.slice(0, 4)
  const extra = ids.length - shown.length

  return (
    <span className="flex items-center gap-1.5" style={{ direction: 'rtl' }}>
      <span className="flex items-center">
        {shown.map((p, i) => (
          <span key={p.id} style={{ marginInlineStart: i === 0 ? 0 : -8, zIndex: 10 - i, boxShadow: '0 0 0 2px var(--ds-bg-elevated)', borderRadius: '50%' }}>
            <SenderAvatar sender={p} senderId={p.id} size={22} />
          </span>
        ))}
        {extra > 0 && (
          <span className="flex items-center justify-center rounded-full text-[10px] font-bold"
            style={{ width: 22, height: 22, marginInlineStart: -8, background: 'var(--ds-surface-2)', color: 'var(--ds-text-secondary)', boxShadow: '0 0 0 2px var(--ds-bg-elevated)' }}>
            +{extra}
          </span>
        )}
      </span>
      <span className="chat-online-dot w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--ds-accent-success)' }} />
      <span className="text-[12px]" style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-accent-success)' }}>
        {ids.length === 1 ? 'متصل الآن' : `${ids.length} متصلين`}
      </span>
    </span>
  )
}
