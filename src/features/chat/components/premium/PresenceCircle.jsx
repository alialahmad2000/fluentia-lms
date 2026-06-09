import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../../lib/supabase'

/**
 * المجلس — the gathering. Members arched across the top of the room (matches the
 * prototype): dark circles with a brass initial, the teacher anchored in the centre,
 * larger and brass-ringed, a quiet brass dot on whoever is present. Members are the
 * people who take part in this group's chat (distinct recent senders — RLS-safe).
 */
function initialOf(name) {
  const words = String(name || '').trim().split(/\s+/)
  const w = words.find((x) => x.replace(/\./g, '').length > 1) || words[0] || '؟'
  return (w.replace(/\./g, '')[0]) || '؟'
}

function Avatar({ m, isTeacher }) {
  const size = isTeacher ? 52 : 44
  const base = {
    width: size, height: size, borderRadius: '50%',
    display: 'grid', placeItems: 'center',
    fontFamily: 'Tajawal, sans-serif', fontWeight: 500,
    fontSize: isTeacher ? 19 : 16,
    userSelect: 'none',
  }
  const style = isTeacher
    ? { ...base, color: '#E2C88E', border: '1.5px solid rgba(201,168,106,0.32)',
        background: 'radial-gradient(120% 120% at 50% 0%, rgba(201,168,106,0.16), rgba(201,168,106,0.03) 70%)',
        boxShadow: '0 0 0 4px rgba(201,168,106,0.05), 0 0 18px -4px rgba(201,168,106,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' }
    : { ...base, color: 'rgba(236,234,226,0.7)', border: '1px solid rgba(236,234,226,0.09)',
        background: 'rgba(236,234,226,0.05)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }
  return <div style={style}>{initialOf(m.display_name || m.full_name)}</div>
}

export default function PresenceCircle({ groupId, onlineUserIds = [] }) {
  const { data: members = [] } = useQuery({
    queryKey: ['majlis-circle', groupId],
    enabled: !!groupId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: msgs } = await supabase
        .from('group_messages')
        .select('sender_id')
        .eq('group_id', groupId).is('dm_thread_id', null).is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(200)
      const ids = [...new Set((msgs || []).map((m) => m.sender_id).filter(Boolean))].slice(0, 9)
      if (!ids.length) return []
      const { data: profs } = await supabase
        .from('profiles').select('id, full_name, display_name, role').in('id', ids)
      return profs || []
    },
  })

  if (members.length < 2) return null

  const online = new Set(onlineUserIds)
  const teacher = members.find((m) => m.role === 'trainer' || m.role === 'admin')
  let others = members.filter((m) => m !== teacher)
  // keep the circle clean like the prototype — at most 6 classmates around the teacher
  others = others.slice(0, 6)
  const half = Math.ceil(others.length / 2)
  const ordered = teacher ? [...others.slice(0, half), teacher, ...others.slice(half)] : others
  const onlineCount = ordered.filter((m) => online.has(m.id)).length
  const center = (ordered.length - 1) / 2

  return (
    <div style={{ direction: 'rtl', padding: '16px 12px 16px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12 }}>
        {ordered.map((m, i) => {
          const isTeacher = m.role === 'trainer' || m.role === 'admin'
          const lift = isTeacher ? -3 : Math.round(Math.abs(i - center) * 5)
          const isOnline = online.has(m.id)
          const first = (m.display_name || m.full_name || '').trim().split(/\s+/).slice(0, 1).join('')
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transform: `translateY(${lift}px)`, width: isTeacher ? 56 : 50 }}>
              <div style={{ position: 'relative' }}>
                <Avatar m={m} isTeacher={isTeacher} />
                {isOnline && (
                  <span className="chat-online-dot" style={{ position: 'absolute', insetInlineEnd: 1, insetBlockEnd: 1, width: isTeacher ? 11 : 9, height: isTeacher ? 11 : 9, borderRadius: '50%', background: '#C9A86A', border: '2px solid #0b0907' }} />
                )}
              </div>
              <span style={{ fontFamily: 'Tajawal, sans-serif', fontSize: 10.5, fontWeight: isTeacher ? 500 : 400, color: isTeacher ? 'rgba(201,168,106,0.62)' : 'rgba(236,234,226,0.42)', whiteSpace: 'nowrap', maxWidth: 56, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {first}
              </span>
            </div>
          )
        })}
      </div>
      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11.5, color: 'rgba(236,234,226,0.42)', fontFamily: 'Tajawal, sans-serif', letterSpacing: '0.02em' }}>
        <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#C9A86A', boxShadow: '0 0 8px #C9A86A', marginInlineEnd: 7, verticalAlign: 'middle' }} />
        {onlineCount > 0 ? `${onlineCount} حاضرون الآن · المجلس مفتوح` : 'حلقة المجلس'}
      </div>
      <div style={{ position: 'absolute', insetInline: 24, bottom: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(236,234,226,0.09), transparent)' }} />
    </div>
  )
}
