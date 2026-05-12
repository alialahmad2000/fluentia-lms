import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

export default function ReactionDetailsSheet({ messageId, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const { data = [], isLoading } = useQuery({
    queryKey: ['reaction-details', messageId],
    enabled: !!messageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_reactions')
        .select('emoji, created_at, user:profiles!user_id(id, first_name_ar, last_name_ar, avatar_url, role)')
        .eq('message_id', messageId)
        .order('created_at')
      if (error) throw error
      return data ?? []
    },
  })

  // Group by emoji, then sort by count desc
  const grouped = data.reduce((acc, r) => {
    acc[r.emoji] = acc[r.emoji] ?? { emoji: r.emoji, rows: [] }
    acc[r.emoji].rows.push(r)
    return acc
  }, {})
  const groups = Object.values(grouped).sort((a, b) => b.rows.length - a.rows.length)

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[var(--bg-card)] border-t border-[var(--border)] shadow-2xl"
        style={{ direction: 'rtl', maxHeight: '60dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        {/* Handle + header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] shrink-0">
          <span className="flex-1 font-semibold text-[var(--text-primary)] text-sm" style={{ fontFamily: 'Tajawal, sans-serif' }}>
            من تفاعل
          </span>
          <button onClick={onClose} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {groups.map(({ emoji, rows }) => (
            <div key={emoji}>
              <div className="px-4 py-2 flex items-center gap-2 bg-[var(--surface)]">
                <span className="text-xl">{emoji}</span>
                <span className="text-sm text-[var(--text-muted)]">{rows.length}</span>
              </div>
              {rows.map((r) => {
                const name = `${r.user?.first_name_ar ?? ''} ${r.user?.last_name_ar ?? ''}`.trim()
                return (
                  <div key={r.user?.id ?? Math.random()} className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)]">
                    <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-sm shrink-0 overflow-hidden">
                      {r.user?.avatar_url
                        ? <img src={r.user.avatar_url} alt="" className="w-full h-full object-cover" />
                        : (r.user?.first_name_ar?.[0] ?? '?')
                      }
                    </div>
                    <span className="flex-1 text-sm text-[var(--text-primary)]" style={{ fontFamily: 'Tajawal, sans-serif' }}>
                      {name}
                    </span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      r.user?.role === 'trainer'
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-sky-500/10 text-sky-400'
                    }`} style={{ fontFamily: 'Tajawal' }}>
                      {r.user?.role === 'trainer' ? 'مدرب' : 'طالب'}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}

          {!isLoading && groups.length === 0 && (
            <p className="text-center text-sm text-[var(--text-muted)] py-8" style={{ fontFamily: 'Tajawal' }}>لا توجد تفاعلات</p>
          )}
        </div>
      </div>
    </>
  )
}
