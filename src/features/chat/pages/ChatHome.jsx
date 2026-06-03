// Chat list — the user's group(s) + direct-message threads, with a "new message"
// button to start a DM with the trainer or a same-level colleague.
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useShallow } from 'zustand/react/shallow'
import { useQuery } from '@tanstack/react-query'
import { Users, PenSquare, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import { useDMThreads } from '../queries/useDM'
import SenderAvatar from '../components/premium/SenderAvatar'
import ContactPicker from '../components/premium/ContactPicker'
import { senderColor } from '../lib/senderColors'
import { timeAgo } from '../../../utils/dateHelpers'
import '../premium.css'

function GroupGlyph({ level }) {
  const l = Number(level) || 0
  const grad = l <= 1 ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
    : l === 2 ? 'linear-gradient(135deg,#fbbf24,#d97706)'
    : l === 3 ? 'linear-gradient(135deg,#7c3aed,#4c1d95)'
    : 'linear-gradient(135deg,#10b981,#065f46)'
  return (
    <div className="relative shrink-0" style={{ width: 44, height: 44 }}>
      <div className="absolute rounded-full" style={{ inset: -2, background: 'conic-gradient(from 140deg, var(--ds-accent-gold), color-mix(in srgb,var(--ds-accent-gold) 18%,transparent) 50%, var(--ds-accent-gold))', opacity: 0.85 }} />
      <div className="absolute rounded-full flex items-center justify-center" style={{ inset: 0, background: grad, boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}>
        <Users size={20} style={{ color: 'rgba(255,255,255,0.95)' }} />
      </div>
    </div>
  )
}

function Row({ avatar, name, nameColor, preview, time, unread, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 rounded-2xl transition-colors hover:bg-[var(--ds-surface-1)]" style={{ minHeight: 68, direction: 'rtl' }}>
      {avatar}
      <div className="flex-1 min-w-0 text-right">
        <div className="flex items-center gap-2">
          <span className="font-bold truncate flex-1" style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 15.5, color: nameColor || 'var(--ds-text-primary)' }}>{name}</span>
          {time && <span className="text-[11px] shrink-0 tabular-nums" style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal' }}>{time}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[13px] truncate flex-1" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-muted)' }}>{preview}</span>
          {unread > 0 && (
            <span className="shrink-0 flex items-center justify-center rounded-full text-[11px] font-bold tabular-nums"
              style={{ minWidth: 20, height: 20, padding: '0 6px', background: 'var(--ds-accent-primary)', color: 'var(--ds-text-inverse)' }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
      <ChevronLeft size={16} style={{ color: 'var(--ds-text-tertiary)' }} className="shrink-0" />
    </button>
  )
}

function previewOf(type, body) {
  if (type === 'voice') return '🎙️ رسالة صوتية'
  if (type === 'image') return '🖼️ صورة'
  if (type === 'file') return '📎 ملف'
  if (type === 'announcement') return '📣 ' + (body || 'إعلان')
  return body || 'ابدأ المحادثة'
}

export default function ChatHome() {
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const { profile, studentData } = useAuthStore(useShallow((s) => ({ profile: s.profile, studentData: s.studentData })))

  useEffect(() => {
    document.body.classList.add('chat-page')
    return () => document.body.classList.remove('chat-page')
  }, [])

  const { data: groups = [] } = useQuery({
    queryKey: ['my-chat-groups', profile?.id, profile?.role, studentData?.group_id],
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

  const { data: groupUnreads = [] } = useQuery({
    queryKey: ['group-unreads', profile?.id],
    enabled: !!profile?.id,
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => { const { data } = await supabase.rpc('get_group_unread_counts'); return data ?? [] },
  })
  const groupUnreadMap = Object.fromEntries(groupUnreads.map((r) => [r.group_id, r.unread]))

  return (
    <div className="chat-shell">
      <div className="chat-aurora" aria-hidden="true"><i className="ca-blob ca-sky" /><i className="ca-blob ca-violet" /><i className="ca-blob ca-emerald" /><i className="ca-blob ca-rose" /><i className="ca-blob ca-amber" /></div>
      <div className="chat-aurora-scrim" aria-hidden="true" />

      {/* Header */}
      <div className="chat-row">
        <div className="flex items-center gap-2 px-4" style={{ height: 60, direction: 'rtl', background: 'color-mix(in srgb, var(--ds-bg-elevated) 62%, transparent)', backdropFilter: 'blur(28px) saturate(150%)', WebkitBackdropFilter: 'blur(28px) saturate(150%)', borderBottom: '1px solid var(--ds-border-subtle)' }}>
          <h1 className="flex-1 font-bold" style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 20, color: 'var(--ds-text-primary)' }}>المحادثات</h1>
          <button onClick={() => setPickerOpen(true)} aria-label="رسالة جديدة"
            className="rounded-full flex items-center justify-center transition-all"
            style={{ width: 42, height: 42, color: 'var(--ds-text-inverse)', background: 'linear-gradient(135deg, var(--ds-accent-gold) 0%, color-mix(in srgb, var(--ds-accent-gold) 68%, #7a4f00) 100%)', boxShadow: '0 6px 16px -5px color-mix(in srgb, var(--ds-accent-gold) 55%, transparent)' }}>
            <PenSquare size={19} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="chat-stream overflow-y-auto px-2 py-2" style={{ overscrollBehavior: 'contain' }}>
        {groups.length > 0 && (
          <div className="mb-2">
            <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-tertiary)', letterSpacing: '0.04em' }}>المجموعات</div>
            {groups.map((g) => (
              <Row key={g.id} avatar={<GroupGlyph level={g.level} />} name={g.name || 'المجموعة'} preview="محادثة المجموعة" unread={groupUnreadMap[g.id] || 0} onClick={() => navigate(`/chat/${g.id}`)} />
            ))}
          </div>
        )}

        <div>
          <div className="px-3 py-1.5 text-[11px] font-semibold" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-tertiary)', letterSpacing: '0.04em' }}>الرسائل الخاصة</div>
          {threads.length === 0 ? (
            <button onClick={() => setPickerOpen(true)} className="w-full text-center py-8 px-4" style={{ direction: 'rtl' }}>
              <p className="text-sm" style={{ fontFamily: 'Tajawal', color: 'var(--ds-text-muted)', lineHeight: 1.8 }}>
                لا توجد رسائل خاصة بعد.<br />اضغط على ✎ لبدء محادثة مع مدربك أو زميل من نفس مستواك.
              </p>
            </button>
          ) : threads.map((t) => (
            <Row key={t.thread_id}
              avatar={<SenderAvatar sender={{ full_name: t.other_name, avatar_url: t.other_avatar }} senderId={t.other_id} size={44} />}
              name={t.other_name || 'محادثة'}
              nameColor={senderColor(t.other_id).soft}
              preview={previewOf(t.last_type, t.last_body)}
              time={t.last_at ? timeAgo(t.last_at) : ''}
              unread={t.unread}
              onClick={() => navigate(`/chat/dm/${t.thread_id}`)}
            />
          ))}
        </div>
      </div>

      <ContactPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPicked={(threadId) => { setPickerOpen(false); navigate(`/chat/dm/${threadId}`) }} />
    </div>
  )
}
