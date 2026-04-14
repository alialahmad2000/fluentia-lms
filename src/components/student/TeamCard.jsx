import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Award } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/* ------------------------------------------------------------------ */
/*  Skeleton shimmer                                                    */
/* ------------------------------------------------------------------ */
const shimmerKeyframes = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

function shimmerBlock(width, height) {
  return {
    width: typeof width === 'number' ? width : width,
    height,
    borderRadius: 8,
    background:
      'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }
}

function Skeleton() {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 24,
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={shimmerBlock(160, 22)} />
        <div style={shimmerBlock(100, 16)} />
        <div style={{ display: 'flex', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={shimmerBlock(36, 36)} />
          ))}
        </div>
        <div style={shimmerBlock(180, 16)} />
      </div>
      <style>{shimmerKeyframes}</style>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Avatar                                                              */
/* ------------------------------------------------------------------ */
function MemberAvatar({ name, url, size = 36 }) {
  const initials = (name || '?').charAt(0)
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        border: '2px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.6)',
        flexShrink: 0,
      }}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        initials
      )}
    </div>
  )
}

function OverflowBadge({ count, size = 36 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: 'rgba(255,255,255,0.5)',
        flexShrink: 0,
      }}
    >
      +{count}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  TeamCard                                                            */
/* ------------------------------------------------------------------ */
const MAX_VISIBLE_AVATARS = 7

export default function TeamCard({ groupId }) {
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  /* ---- Fetch group ---- */
  const {
    data: group,
    isLoading: groupLoading,
    isError: groupError,
  } = useQuery({
    queryKey: ['team-group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, code, level, trainer_id')
        .eq('id', groupId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!groupId,
    staleTime: 10 * 60 * 1000,
  })

  /* ---- Fetch trainer name ---- */
  const trainerId = group?.trainer_id
  const {
    data: trainer,
    isLoading: trainerLoading,
  } = useQuery({
    queryKey: ['team-trainer', trainerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, display_name')
        .eq('id', trainerId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!trainerId,
    staleTime: 10 * 60 * 1000,
  })

  /* ---- Fetch members ---- */
  const {
    data: members,
    isLoading: membersLoading,
  } = useQuery({
    queryKey: ['team-members', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, profiles(display_name, avatar_url)')
        .eq('group_id', groupId)
        .is('deleted_at', null)
      if (error) throw error
      return data ?? []
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  })

  /* ---- Fetch team rank ---- */
  const {
    data: rankData,
  } = useQuery({
    queryKey: ['team-rank', groupId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_team_rank', {
        p_group_id: groupId,
        p_period: 'week',
      })
      if (error) throw error
      if (!isMounted.current) return null
      return data?.[0] ?? null
    },
    enabled: !!groupId,
    staleTime: 5 * 60 * 1000,
  })

  /* ---- Loading / error ---- */
  const isLoading = groupLoading || trainerLoading || membersLoading
  if (isLoading) return <Skeleton />
  if (groupError || !group) return null

  const trainerName = trainer?.display_name || trainer?.full_name || ''
  const visibleMembers = (members || []).slice(0, MAX_VISIBLE_AVATARS)
  const overflowCount = Math.max(0, (members || []).length - MAX_VISIBLE_AVATARS)

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 24,
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
      }}
    >
      {/* ---- Header: group name + icon ---- */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 6,
        }}
      >
        <Users size={20} style={{ color: '#38bdf8', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
          }}
        >
          {group.name}
        </span>
      </div>

      {/* ---- Trainer name ---- */}
      {trainerName && (
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.45)',
            marginBottom: 16,
          }}
        >
          المدرب: {trainerName}
        </div>
      )}

      {/* ---- Member avatars ---- */}
      {members && members.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          {visibleMembers.map((m) => (
            <MemberAvatar
              key={m.id}
              name={m.profiles?.display_name}
              url={m.profiles?.avatar_url}
            />
          ))}
          {overflowCount > 0 && <OverflowBadge count={overflowCount} />}
        </div>
      )}

      {/* ---- Team rank ---- */}
      {rankData && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 14,
            color: '#fbbf24',
            fontWeight: 600,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Award size={18} style={{ color: '#fbbf24', flexShrink: 0 }} />
          <span>
            🏆 الترتيب هذا الأسبوع: #{rankData.rank} من {rankData.total_groups}
          </span>
        </div>
      )}
    </div>
  )
}
