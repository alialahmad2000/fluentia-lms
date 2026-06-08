import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'
import SenderAvatar from './SenderAvatar'

/**
 * المجلس — the gathering. A gentle arc of the circle's members across the top of
 * the room: the teacher anchored + brass-ringed, classmates fanned around, a quiet
 * brass dot on whoever is present right now. Members are the people who take part
 * in this group's chat (distinct recent senders — RLS-safe for students).
 */
export default function PresenceCircle({ groupId, onlineUserIds = [] }) {
  const { data: members = [] } = useQuery({
    queryKey: ['majlis-circle', groupId],
    enabled: !!groupId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from('group_messages')
        .select('sender_id')
        .eq('group_id', groupId)
        .is('dm_thread_id', null)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(200)
      const ids = [...new Set((msgs || []).map((m) => m.sender_id).filter(Boolean))].slice(0, 9)
      if (!ids.length) return []
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, avatar_url, role')
        .in('id', ids)
      return profs || []
    },
  })

  if (members.length < 2) return null

  const online = new Set(onlineUserIds)
  const teacher = members.find((m) => m.role === 'trainer' || m.role === 'admin')
  const others = members.filter((m) => m !== teacher)
  const half = Math.ceil(others.length / 2)
  const ordered = teacher ? [...others.slice(0, half), teacher, ...others.slice(half)] : others
  const onlineCount = ordered.filter((m) => online.has(m.id)).length
  const center = (ordered.length - 1) / 2

  return (
    <div style={{ direction: 'rtl', padding: '14px 14px 16px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 13 }}>
        {ordered.map((m, i) => {
          const isTeacher = m.role === 'trainer' || m.role === 'admin'
          const lift = isTeacher ? -3 : Math.round(Math.abs(i - center) * 5)
          const isOnline = online.has(m.id)
          const first = (m.display_name || m.full_name || '').trim().split(' ')[0]
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, transform: `translateY(${lift}px)`, width: 54 }}>
              <div style={{ position: 'relative' }}>
                <div style={isTeacher
                  ? { padding: 2.5, borderRadius: '50%', background: 'radial-gradient(120% 120% at 50% 0%, rgba(201,168,106,0.55), rgba(201,168,106,0.12) 70%)', boxShadow: '0 0 18px -4px rgba(201,168,106,0.35)' }
                  : undefined}>
                  <SenderAvatar sender={m} senderId={m.id} size={isTeacher ? 48 : 38} />
                </div>
                {isOnline && (
                  <span className="chat-online-dot" style={{ position: 'absolute', insetInlineEnd: 1, insetBlockEnd: 1, width: 10, height: 10, borderRadius: '50%', background: '#C9A86A', border: '2px solid #0b0907' }} />
                )}
              </div>
              <span style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 10.5, fontWeight: isTeacher ? 600 : 400, color: isTeacher ? 'rgba(226,200,142,0.92)' : 'rgba(236,234,226,0.5)', whiteSpace: 'nowrap', maxWidth: 54, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {first}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 13, fontSize: 11.5, color: 'rgba(236,234,226,0.46)', fontFamily: 'Tajawal, sans-serif', letterSpacing: '0.02em' }}>
        <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#C9A86A', boxShadow: '0 0 8px #C9A86A', marginInlineEnd: 7, verticalAlign: 'middle' }} />
        {onlineCount > 0 ? `${onlineCount} حاضرون الآن · المجلس مفتوح` : 'حلقة المجلس'}
      </div>
      <div style={{ position: 'absolute', insetInline: 24, bottom: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(236,234,226,0.09), transparent)' }} />
    </div>
  )
}
