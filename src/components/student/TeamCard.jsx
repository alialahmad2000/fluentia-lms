import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Award, Swords } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useActiveCompetition, useCompetitionContext } from '../../hooks/useCompetition'

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
        background: 'var(--ds-surface-1)',
        border: '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
        boxShadow: 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.06)',
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
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        border: '1px solid var(--ds-border-subtle)',
        background: 'var(--ds-surface-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ds-text-secondary)',
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
        borderRadius: 'var(--radius-full)',
        background: 'var(--ds-surface-2)',
        border: '1px solid var(--ds-border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--ds-text-tertiary)',
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
  // HIDDEN 2026-06-08 (owner): the team / competition-rank widget is hidden from every in-page spot
  // (it links into the now-hidden competition + shows team standings). Route + data kept. Delete
  // this return to restore.
  return null
  // eslint-disable-next-line no-unreachable
  const navigate = useNavigate()
  const isMounted = useRef(true)
  const { data: activeComp } = useActiveCompetition()
  const { data: ctx } = useCompetitionContext()

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

  const compActive = activeComp?.status === 'active'
  const inComp = ctx?.in_competition
  const myTeam = compActive && inComp
    ? (ctx.team === 'A' ? activeComp.team_a : activeComp.team_b)
    : null
  const oppTeam = compActive && inComp
    ? (ctx.team === 'A' ? activeComp.team_b : activeComp.team_a)
    : null
  const teamColor = myTeam?.color ?? '#38bdf8'

  return (
    <div
      style={{
        background: 'var(--ds-surface-1)',
        border: compActive && inComp
          ? `1px solid ${teamColor}40`
          : '1px solid var(--ds-border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-5)',
        direction: 'rtl',
        fontFamily: 'Tajawal, sans-serif',
        boxShadow: compActive && inComp
          ? `0 0 20px ${teamColor}12, inset 0 1px 0 rgba(255,255,255,0.06)`
          : 'var(--ds-shadow-sm), inset 0 1px 0 rgba(255,255,255,0.06)',
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
        <Users size={20} style={{ color: 'var(--ds-accent-primary)', flexShrink: 0 }} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--ds-text-primary)',
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
            color: 'var(--ds-text-tertiary)',
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
            color: 'var(--ds-accent-gold, var(--ds-accent-warning))',
            fontWeight: 600,
            paddingTop: 12,
            borderTop: '1px solid var(--ds-border-subtle)',
          }}
        >
          <Award size={18} style={{ color: 'var(--ds-accent-gold, var(--ds-accent-warning))', flexShrink: 0 }} />
          <span>
            🏆 الترتيب هذا الأسبوع: #{rankData.rank} من {rankData.total_groups}
          </span>
        </div>
      )}

      {/* ---- Competition mode badge ---- */}
      {compActive && inComp && myTeam && (
        <button
          onClick={() => navigate('/student/competition')}
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--ds-border-subtle)',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: 'none',
            width: '100%',
            background: 'none',
            cursor: 'pointer',
            padding: '12px 0 0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              background: `${teamColor}12`,
              border: `1px solid ${teamColor}30`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Swords size={15} style={{ color: teamColor, flexShrink: 0 }} />
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: teamColor }}>
                  {myTeam.emoji} {myTeam.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ds-text-tertiary)' }}>
                  {myTeam.victory_points} VP
                  {oppTeam && ` — ${oppTeam.emoji} ${oppTeam.victory_points} VP`}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ds-text-inverse)',
                background: teamColor,
                borderRadius: 'var(--radius-sm)',
                padding: '3px 8px',
              }}
            >
              المسابقة →
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
