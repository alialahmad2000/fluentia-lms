import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share2, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import VictoryShareCard from './VictoryShareCard'

const REDUCED = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ─── Confetti (CSS, respects reduced motion) ────────────────── */
function Confetti({ color }) {
  if (REDUCED) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9998, overflow: 'hidden' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '-10px',
            left: `${Math.random() * 100}%`,
            width: 8,
            height: 8,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            background: [color, '#f5c842', '#ffffff', '#38bdf8'][i % 4],
            animation: `confetti-fall ${2 + Math.random() * 3}s ${Math.random() * 2}s linear infinite`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(${Math.random() * 720}deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function MemberAvatar({ name, size = 48 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, color: '#fff', flexShrink: 0,
      }}
    >
      {(name || '?').charAt(0)}
    </div>
  )
}

/* ─── Main Modal ─────────────────────────────────────────────── */
export default function VictoryModal() {
  const navigate = useNavigate()
  const { profile, impersonation } = useAuthStore()
  const profileId = impersonation?.userId ?? profile?.id
  const [showShareCard, setShowShareCard] = useState(false)

  // Fetch latest closed competition
  const { data: comp } = useQuery({
    queryKey: ['latest-competition'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_latest_competition')
      if (error) throw error
      return data
    },
    staleTime: 60_000,
    enabled: !!profileId,
  })

  // Check if already seen
  const { data: seen, isLoading: seenLoading } = useQuery({
    queryKey: ['victory-seen', comp?.id, profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('competition_announcements_seen')
        .select('id')
        .eq('competition_id', comp.id)
        .eq('student_id', profileId)
        .eq('announcement_type', 'competition_victory')
        .maybeSingle()
      return !!data
    },
    enabled: !!comp?.id && !!profileId && comp?.status === 'closed',
  })

  const handleDismiss = useCallback(async () => {
    if (!comp?.id || !profileId) return
    await supabase.from('competition_announcements_seen').insert({
      competition_id: comp.id,
      student_id: profileId,
      announcement_type: 'competition_victory',
    })
  }, [comp?.id, profileId])

  // Don't show during impersonation
  if (impersonation) return null
  if (!comp || comp.status !== 'closed') return null
  if (seenLoading || seen) return null

  return <StudentVictoryContent comp={comp} profileId={profileId} onDismiss={handleDismiss} navigate={navigate} />
}

function StudentVictoryContent({ comp, profileId, onDismiss, navigate }) {
  const [dismissed, setDismissed] = useState(false)
  const [showShareCard, setShowShareCard] = useState(false)

  // Get student's team context
  const { data: ctx } = useQuery({
    queryKey: ['competition-context', profileId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_competition_student_context', {
        p_profile_id: profileId,
      })
      if (error) throw error
      return data
    },
    enabled: !!profileId,
    staleTime: 60_000,
  })

  const handleDismissAndClose = useCallback(async () => {
    await onDismiss()
    setDismissed(true)
  }, [onDismiss])

  if (dismissed) return null

  const inComp = ctx?.in_competition
  const myTeamKey = ctx?.team
  const myTeam = myTeamKey === 'A' ? comp.team_a : comp.team_b
  const oppTeam = myTeamKey === 'A' ? comp.team_b : comp.team_a
  const isWinner = comp.winner_team && myTeamKey && comp.winner_team === myTeamKey
  const isTie = comp.winner_team === 'tie'
  const teamColor = myTeam?.color ?? '#38bdf8'

  const winnerTeam = comp.winner_team === 'A' ? comp.team_a : comp.team_b

  return (
    <AnimatePresence>
      <motion.div
        key="victory-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        {isWinner && !REDUCED && <Confetti color={teamColor} />}

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          style={{
            background: '#0f172a',
            border: `1px solid ${isWinner ? teamColor + '40' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 24,
            width: '100%',
            maxWidth: 480,
            maxHeight: '90dvh',
            overflowY: 'auto',
            fontFamily: 'Tajawal, sans-serif',
            boxShadow: isWinner ? `0 0 60px ${teamColor}25` : undefined,
          }}
          dir="rtl"
        >
          {/* Close */}
          <div className="flex justify-end p-4 pb-0">
            <button onClick={handleDismissAndClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06]">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-8">
            {/* Hero section */}
            {isWinner || !inComp ? (
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">{isWinner ? '🏆' : isTie ? '🤝' : '⚔️'}</div>
                <h2 className="text-2xl font-black text-white mb-2">
                  {isWinner ? `فريقك ${myTeam?.emoji} فاز!` : isTie ? 'التعادل!' : 'انتهت المسابقة'}
                </h2>
                {isWinner && myTeam && (
                  <div className="font-bold text-lg" style={{ color: teamColor }}>
                    {myTeam.emoji} {myTeam.name}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">⚔️</div>
                <h2 className="text-xl font-black text-white mb-1">انتهت المسابقة</h2>
                <div className="text-slate-400 text-sm">
                  فريق {winnerTeam?.emoji} {winnerTeam?.name} حقق الفوز هذه الجولة
                </div>
              </div>
            )}

            {/* Score display */}
            {comp.team_a && comp.team_b && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[comp.team_a, comp.team_b].map((t) => {
                  const isWinnerTeam = comp.winner_team === (t === comp.team_a ? 'A' : 'B')
                  return (
                    <div
                      key={t.name}
                      className="rounded-2xl p-4 text-center"
                      style={{
                        background: `${t.color}12`,
                        border: `1px solid ${t.color}${isWinnerTeam ? '50' : '20'}`,
                        boxShadow: isWinnerTeam ? `0 0 16px ${t.color}20` : undefined,
                      }}
                    >
                      {isWinnerTeam && <div className="text-xs font-bold text-yellow-400 mb-1">👑 الفائز</div>}
                      <div className="text-xl mb-1">{t.emoji}</div>
                      <div className="font-bold text-white text-sm mb-2">{t.name}</div>
                      <div className="text-2xl font-black tabular-nums" style={{ color: t.color }}>
                        {t.victory_points}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">VP</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* MVPs */}
            {(comp.team_a_mvp_id || comp.team_b_mvp_id) && (
              <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xs font-bold text-slate-500 mb-3 text-center">⭐ أبطال المسابقة</div>
                <div className="flex justify-around">
                  {[
                    { id: comp.team_a_mvp_id, label: `MVP ${comp.team_a?.emoji}` },
                    { id: comp.team_b_mvp_id, label: `MVP ${comp.team_b?.emoji}` },
                  ].filter(m => m.id).map((m) => (
                    <div key={m.id} className="text-center">
                      <MemberAvatar name={m.label} size={40} />
                      <div className="text-xs text-slate-400 mt-1">{m.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              {inComp && (
                <button
                  onClick={() => setShowShareCard(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: isWinner ? `${teamColor}15` : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isWinner ? teamColor + '40' : 'rgba(255,255,255,0.1)'}`,
                    color: isWinner ? teamColor : 'rgba(255,255,255,0.7)',
                  }}
                >
                  <Share2 size={15} />
                  شارك إنجاز فريقك 📤
                </button>
              )}
              <button
                onClick={() => { navigate('/student/competition'); handleDismissAndClose() }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-slate-400"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <ExternalLink size={14} />
                شاهد كامل النتائج
              </button>
              <button
                onClick={handleDismissAndClose}
                className="w-full py-2 text-sm text-slate-600 hover:text-slate-400 transition-colors"
              >
                أغلق
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showShareCard && (
        <VictoryShareCard
          comp={comp}
          myTeam={myTeam}
          myRank={ctx?.my_rank}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </AnimatePresence>
  )
}
