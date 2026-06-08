// Forward a message to another group or DM. Re-sends the same content/media
// (media reuses the original storage path) into the chosen target.
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useShallow } from 'zustand/react/shallow'
import { X, Search, Hash, Check, Loader2 } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'
import { useAuthStore } from '../../../../stores/authStore'
import { toast } from '../../../../components/ui/FluentiaToast'
import { useDMThreads } from '../../queries/useDM'
import { senderColor } from '../../lib/senderColors'
import SenderAvatar from './SenderAvatar'

function buildContent(m) {
  switch (m.type) {
    case 'image': return { type: 'image', image_url: m.image_url, image_width: m.image_width ?? null, image_height: m.image_height ?? null }
    case 'video': return { type: 'video', file_url: m.file_url, file_name: m.file_name ?? null, file_size: m.file_size ?? null, file_mime: m.file_mime ?? null }
    case 'file':  return { type: 'file', file_url: m.file_url, file_name: m.file_name ?? null, file_size: m.file_size ?? null, file_mime: m.file_mime ?? null }
    case 'voice': return { type: 'voice', voice_url: m.voice_url, voice_duration_ms: m.voice_duration_ms ?? null, voice_waveform: m.voice_waveform ?? null, voice_transcript: m.voice_transcript ?? null }
    default:      return { type: 'text', body: m.body ?? m.content ?? '', content: m.content ?? m.body ?? '' }
  }
}

export default function ForwardSheet({ message, onClose }) {
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [doneId, setDoneId] = useState(null)

  const { data: groups = [] } = useQuery({
    queryKey: ['forward-groups', profile?.id, profile?.role, studentData?.group_id],
    enabled: !!profile?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (profile.role === 'student') {
        if (!studentData?.group_id) return []
        const { data } = await supabase.from('groups').select('id, name, level').eq('id', studentData.group_id)
        return data || []
      }
      let qb = supabase.from('groups').select('id, name, level').eq('is_active', true).order('level')
      if (profile.role === 'trainer') qb = qb.eq('trainer_id', profile.id)
      const { data } = await qb
      return data || []
    },
  })
  const { data: threads = [] } = useDMThreads()

  const ql = q.trim().toLowerCase()
  const fGroups = useMemo(() => groups.filter((g) => !ql || (g.name || '').toLowerCase().includes(ql)), [groups, ql])
  const fThreads = useMemo(() => threads.filter((t) => !ql || (t.other_name || '').toLowerCase().includes(ql)), [threads, ql])

  async function send(targetKey, payloadExtra) {
    if (busyId) return
    setBusyId(targetKey)
    try {
      const { error } = await supabase.from('group_messages').insert({ sender_id: profile.id, ...payloadExtra, ...buildContent(message) })
      if (error) throw error
      setDoneId(targetKey)
      toast({ type: 'success', title: 'تمت إعادة التوجيه' })
      setTimeout(onClose, 650)
    } catch (e) {
      console.error('[forward]', e)
      toast({ type: 'error', title: 'تعذّرت إعادة التوجيه', description: 'حاولي مرة أخرى' })
      setBusyId(null)
    }
  }

  async function forwardToGroup(g) {
    const { data: ch } = await supabase.from('group_channels').select('id').eq('group_id', g.id).eq('slug', 'general').maybeSingle()
    return send(`g:${g.id}`, { group_id: g.id, channel_id: ch?.id ?? null })
  }
  const forwardToThread = (t) => send(`t:${t.thread_id}`, { dm_thread_id: t.thread_id })

  const State = ({ k }) => busyId === k
    ? (doneId === k ? <Check size={18} style={{ color: 'var(--ds-accent-success)' }} /> : <Loader2 size={16} className="animate-spin" style={{ color: 'var(--ds-text-tertiary)' }} />)
    : null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" dir="rtl" style={{ background: 'var(--ds-bg-base)' }}>
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}>
        <span className="font-bold" style={{ fontFamily: 'Tajawal, sans-serif', color: 'var(--ds-text-primary)', fontSize: 16 }}>إعادة التوجيه إلى…</span>
        <button onClick={onClose} aria-label="إغلاق" className="rounded-full p-1.5 transition-colors hover:bg-[var(--ds-surface-1)]" style={{ color: 'var(--ds-text-secondary)' }}><X size={22} /></button>
      </div>

      <div className="px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 px-3 rounded-xl" style={{ background: 'var(--ds-surface-1)', border: '1px solid var(--ds-border-subtle)', height: 40 }}>
          <Search size={16} style={{ color: 'var(--ds-text-tertiary)' }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث…" className="flex-1 bg-transparent outline-none text-sm" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {fGroups.length > 0 && (
          <>
            <p className="px-2 py-1.5 text-[12px] font-semibold" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>المجموعات</p>
            {fGroups.map((g) => (
              <button key={g.id} onClick={() => forwardToGroup(g)} disabled={!!busyId}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-[var(--ds-surface-1)] text-start">
                <span className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--ds-surface-2)', color: 'var(--ds-accent-primary)' }}><Hash size={18} /></span>
                <span className="flex-1 truncate font-medium" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>{g.name}</span>
                <State k={`g:${g.id}`} />
              </button>
            ))}
          </>
        )}

        {fThreads.length > 0 && (
          <>
            <p className="px-2 py-1.5 mt-1 text-[12px] font-semibold" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>الأشخاص</p>
            {fThreads.map((t) => (
              <button key={t.thread_id} onClick={() => forwardToThread(t)} disabled={!!busyId}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition-colors hover:bg-[var(--ds-surface-1)] text-start">
                <SenderAvatar sender={{ full_name: t.other_name, avatar_url: t.other_avatar }} senderId={t.other_id} size={40} />
                <span className="flex-1 truncate font-medium" style={{ color: t.other_id ? senderColor(t.other_id).soft : 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>{t.other_name || 'محادثة'}</span>
                <State k={`t:${t.thread_id}`} />
              </button>
            ))}
          </>
        )}

        {fGroups.length === 0 && fThreads.length === 0 && (
          <div className="py-10 text-center" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}>لا توجد وجهات</div>
        )}
      </div>
    </div>
  )
}
