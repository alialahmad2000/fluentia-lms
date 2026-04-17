import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useActiveCompetition, useCompetitionContext } from '../../../hooks/useCompetition'
import { useAuthStore } from '../../../stores/authStore'
import { supabase } from '../../../lib/supabase'
import ScreenChrome from './ScreenChrome'
import Screen1_TheBattle from './Screen1_TheBattle'
import Screen2_YourTeam from './Screen2_YourTeam'
import Screen3_HowToEarn from './Screen3_HowToEarn'
import Screen4_TeamPower from './Screen4_TeamPower'
import Screen5_Ready from './Screen5_Ready'

const TOTAL_SCREENS = 5

export default function MissionBriefing() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile, impersonation } = useAuthStore()
  const profileId = impersonation?.userId ?? profile?.id

  // All hooks at top
  const { data: comp } = useActiveCompetition()
  const { data: ctx } = useCompetitionContext()

  const { data: seenRow, isLoading: seenLoading } = useQuery({
    queryKey: ['competition-seen-kickoff', comp?.id, profileId],
    queryFn: async () => {
      const { data } = await supabase
        .from('competition_announcements_seen')
        .select('id')
        .eq('competition_id', comp.id)
        .eq('student_id', profileId)
        .eq('announcement_type', 'kickoff')
        .maybeSingle()
      return data
    },
    enabled: !!comp?.id && !!profileId && !impersonation,
    staleTime: 60_000,
  })

  const [screen, setScreen] = useState(1)
  const [dismissed, setDismissed] = useState(false)
  const [showSkip, setShowSkip] = useState(false)

  // Show skip link after 10 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 10_000)
    return () => clearTimeout(t)
  }, [])

  const dismiss = useMutation({
    mutationFn: async () => {
      if (!comp?.id || !profileId) return
      await supabase.from('competition_announcements_seen').upsert({
        competition_id:    comp.id,
        student_id:        profileId,
        announcement_type: 'kickoff',
      }, { onConflict: 'competition_id,student_id,announcement_type', ignoreDuplicates: true })
    },
    onMutate: () => setDismissed(true),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['competition-context'] }),
  })

  const handleDismiss = useCallback(() => dismiss.mutate(), [dismiss])
  const handleStartNow = useCallback(() => {
    dismiss.mutate()
    navigate('/student/curriculum')
  }, [dismiss, navigate])
  const handleNext = useCallback(() => setScreen((s) => Math.min(s + 1, TOTAL_SCREENS)), [])
  const handleBack = useCallback(() => setScreen((s) => Math.max(s - 1, 1)), [])
  const handleSkip = useCallback(() => dismiss.mutate(), [dismiss])

  // Guard conditions
  if (impersonation) return null
  if (!comp || comp.status !== 'active') return null
  if (!ctx?.in_competition) return null
  if (seenLoading || seenRow) return null
  if (dismissed) return null

  const myTeam = ctx.team === 'A' ? comp.team_a : comp.team_b

  const screens = [
    <Screen1_TheBattle key={1} comp={comp} ctx={ctx} myTeam={myTeam} />,
    <Screen2_YourTeam  key={2} comp={comp} ctx={ctx} myTeam={myTeam} profile={profile} />,
    <Screen3_HowToEarn key={3} />,
    <Screen4_TeamPower key={4} comp={comp} ctx={ctx} myTeam={myTeam} />,
    <Screen5_Ready     key={5} comp={comp} ctx={ctx} myTeam={myTeam}
                       onStartNow={handleStartNow} onClose={handleDismiss} />,
  ]

  return (
    <ScreenChrome
      currentScreen={screen}
      totalScreens={TOTAL_SCREENS}
      showSkip={showSkip}
      myTeam={myTeam}
      onNext={handleNext}
      onBack={handleBack}
      onSkip={handleSkip}
      isFinalScreen={screen === TOTAL_SCREENS}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="h-full"
        >
          {screens[screen - 1]}
        </motion.div>
      </AnimatePresence>
    </ScreenChrome>
  )
}
