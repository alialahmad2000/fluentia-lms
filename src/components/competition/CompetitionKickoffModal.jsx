import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useActiveCompetition, useCompetitionContext } from '../../hooks/useCompetition'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

export default function CompetitionKickoffModal() {
  const { profile, impersonation } = useAuthStore()
  const profileId = impersonation?.userId ?? profile?.id
  const queryClient = useQueryClient()

  // All hooks at top — no guards above
  const { data: comp } = useActiveCompetition()
  const { data: ctx } = useCompetitionContext()

  const competitionId = comp?.id

  const { data: seenRow, isLoading: seenLoading } = useQuery({
    queryKey: ['competition-seen-kickoff', competitionId, profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('competition_announcements_seen')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('student_id', profileId)
        .eq('announcement_type', 'kickoff')
        .maybeSingle()
      return data
    },
    enabled: !!competitionId && !!profileId && !impersonation,
    staleTime: 60_000,
  })

  const [dismissed, setDismissed] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const inCompetition = ctx?.in_competition === true

  // Don't render if: no active competition, not in it, already seen/dismissed, impersonating, or still loading seen
  if (
    !comp || !inCompetition || !competitionId || dismissed || impersonation ||
    seenLoading || seenRow
  ) return null

  async function handleDismiss() {
    if (dismissing) return
    setDismissing(true)
    try {
      await supabase.from('competition_announcements_seen').insert({
        competition_id: competitionId,
        student_id: profileId,
        announcement_type: 'kickoff',
      })
      queryClient.invalidateQueries({ queryKey: ['competition-context'] })
    } catch (_) {
      // dismissed client-side regardless
    }
    setDismissed(true)
  }

  const teamEmoji = ctx.team_emoji || '⚔️'
  const teamName = ctx.team_name || ''
  const teamColor = ctx.team_color || '#38bdf8'
  const battleCry = ctx.battle_cry || ''
  const studentName = profile?.display_name || profile?.full_name || ''
  const teamA = comp.team_a
  const teamB = comp.team_b
  const vpA = teamA?.victory_points ?? 0
  const vpB = teamB?.victory_points ?? 0

  return (
    <AnimatePresence>
      <motion.div
        key="kickoff-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,14,28,0.92)' }}
        dir="rtl"
      >
        <motion.div
          key="kickoff-modal-card"
          initial={{ scale: 0.88, opacity: 0, y: 32 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          className="relative w-full max-w-md rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #0f172a 0%, #0c1a35 60%, #082040 100%)',
            border: `1px solid ${teamColor}33`,
            boxShadow: `0 0 60px ${teamColor}20, 0 24px 48px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Top accent bar */}
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${teamColor}, transparent)` }} />

          <div className="p-6 space-y-5">
            {/* VS Badge */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.15, damping: 14, stiffness: 260 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                className="text-5xl mb-1"
              >
                ⚔️
              </motion.div>
              <div className="text-2xl font-black text-white tracking-wide">تحدي طلاقة أبريل</div>
              <div className="text-sm text-slate-400 mt-1">ينتهي 30 أبريل — كل نقطة تُحسب</div>
            </motion.div>

            {/* Team badge */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl p-4 text-center"
              style={{ background: `${teamColor}18`, border: `1px solid ${teamColor}40` }}
            >
              <div className="text-3xl mb-1">{teamEmoji}</div>
              <div className="text-xl font-black" style={{ color: teamColor }}>{teamName}</div>
              {battleCry && (
                <div className="text-xs text-slate-400 mt-1 italic">{battleCry}</div>
              )}
              {studentName && (
                <div className="text-sm text-slate-300 mt-2">
                  مرحباً <span className="font-bold text-white">{studentName}</span>، انضممت تلقائياً لهذا الفريق
                </div>
              )}
            </motion.div>

            {/* VP scoreboard */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-xs text-slate-500 text-center mb-3">نقاط النصر الحالية</div>
              <div className="flex items-center justify-around">
                <div className="text-center">
                  <div className="text-3xl font-black text-sky-400">{vpA}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{teamA?.name}</div>
                </div>
                <div className="text-xl font-black text-slate-600">VS</div>
                <div className="text-center">
                  <div className="text-3xl font-black text-red-400">{vpB}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{teamB?.name}</div>
                </div>
              </div>
              <div className="text-center text-xs text-slate-600 mt-2">نقطة النصر = 50 XP فريقي</div>
            </motion.div>

            {/* Rules */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="space-y-2"
            >
              {[
                { icon: '📚', text: 'كل نشاط = XP لفريقك' },
                { icon: '🔥', text: '80% من فريقك نشط = ستريك جماعي + بونص' },
                { icon: '🎯', text: 'أكمل وحدة الأسبوع = بونص كبير للفريق' },
                { icon: '🤝', text: 'شجّع زميلك = +XP لك وله' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="text-base w-6 text-center flex-shrink-0">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.42 }}
              className="flex gap-3 pt-1"
            >
              <a
                href="/student/competition"
                className="flex-1 py-3 rounded-xl font-bold text-center text-white text-sm transition-opacity hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${teamColor}, ${teamColor}cc)` }}
                onClick={handleDismiss}
              >
                ابدأ الآن →
              </a>
              <button
                onClick={handleDismiss}
                disabled={dismissing}
                className="px-5 py-3 rounded-xl text-sm text-slate-400 hover:text-slate-200 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                إغلاق
              </button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
