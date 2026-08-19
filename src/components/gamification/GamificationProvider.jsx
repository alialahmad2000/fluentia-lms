import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GAMIFICATION_LEVELS } from '../../lib/constants'
import AchievementUnlock from './AchievementUnlock'
import LevelUpCelebration from './LevelUpCelebration'
import { safeCelebrate } from '../../lib/celebrations'
import { emitXP } from '../ui/XPFloater'
import { useG } from '../../i18n/gender'

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

// Achievement definitions with auto-detection conditions
// The old client-side ACHIEVEMENT_CHECKS array lived here. It is deleted, not commented
// out: every criterion queried submissions / assignments / peer_recognitions /
// class_notes / weekly_task_sets, all deprecated, so it could never qualify anyone —
// and evaluating criteria client-side next to a student-writable insert is a
// self-award button. The criteria now live in claim_earned_achievements() where the
// database re-verifies them. Add new achievements THERE, not here.

export default function GamificationProvider() {
  const g = useG()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const [unlockedAchievement, setUnlockedAchievement] = useState(null)
  const [levelUp, setLevelUp] = useState(null)
  const lastCheckedXpRef = useRef(null)

  const [streakCelebration, setStreakCelebration] = useState(null)
  const isStudent = profile?.role === 'student'
  const studentId = profile?.id
  const currentXp = studentData?.xp_total || 0
  const currentStreak = studentData?.current_streak || 0

  // Check for level up when XP changes (real-time via authStore subscription)
  // Uses localStorage to ensure popup only shows once per level-up
  useEffect(() => {
    if (!isStudent || !studentId) return

    const currentLevel = getLevel(currentXp)
    const lastSeenLevel = parseInt(localStorage.getItem(`fluentia_last_seen_level_${studentId}`) || '0')

    if (lastCheckedXpRef.current === null) {
      lastCheckedXpRef.current = currentXp
      // On first load, sync localStorage if never set
      if (!lastSeenLevel) {
        localStorage.setItem(`fluentia_last_seen_level_${studentId}`, String(currentLevel.level))
      }
      return
    }

    if (currentXp > lastCheckedXpRef.current) {
      const newLevel = getLevel(currentXp)

      if (newLevel.level > lastSeenLevel) {
        setLevelUp(newLevel.level)
        localStorage.setItem(`fluentia_last_seen_level_${studentId}`, String(newLevel.level))
        try { safeCelebrate('level_up') } catch {}
      }
    }

    lastCheckedXpRef.current = currentXp
  }, [currentXp, isStudent, studentId])

  // Check for streak milestones
  useEffect(() => {
    if (!isStudent || !studentId || !currentStreak) return
    const milestones = [7, 14, 30, 60, 90]
    const currentMilestone = milestones.filter(m => currentStreak >= m).pop()
    const lastCelebrated = Number(localStorage.getItem(`fluentia_streak_milestone_${studentId}`) || '0')
    if (currentMilestone && currentMilestone > lastCelebrated) {
      localStorage.setItem(`fluentia_streak_milestone_${studentId}`, String(currentMilestone))
      try { safeCelebrate('streak_milestone') } catch {}
      setUnlockedAchievement({
        icon: '\uD83D\uDD25',
        name_ar: `سلسلة ${currentMilestone} يوم!`,
        description_ar: currentMilestone >= 30 ? g('إنجاز مذهل — استمر!', 'إنجاز مذهل — استمري!') : g('أحسنت — واصل يومياً!', 'أحسنت — واصلي يومياً!'),
        xp_reward: 0,
      })
    }
  }, [isStudent, studentId, currentStreak])

  // Check for new achievements periodically.
  //
  // This used to evaluate the criteria HERE and then insert into student_achievements
  // directly. Two things were wrong with that and together they killed achievements
  // platform-wide from 2026-04-30 until 2026-08-19:
  //   - the insert is rejected by RLS (the policy is is_admin() OR is_trainer()), and the
  //     result was wrapped in `if (!error)`, so it failed with no XP, no notification, no
  //     celebration and NOTHING in the console. A dead feature that looked alive.
  //   - the criteria read submissions / assignments / peer_recognitions / class_notes /
  //     weekly_task_sets, all of which are deprecated, so nothing could qualify anyway.
  // Client-side criteria could never be trusted with the insert either — that is a
  // self-award button. Both now live in claim_earned_achievements(), which re-verifies
  // every criterion in the database and can only ever act on the caller.
  const checkAchievements = useCallback(async () => {
    if (!isStudent || !studentId) return
    const { data, error } = await supabase.rpc('claim_earned_achievements')
    if (error) {
      // Loud on purpose. Silence here is exactly what hid this for four months.
      console.error('[Achievement] claim failed:', error.message)
      return
    }
    if (!data?.length) return
    const first = data[0]
    const { data: full } = await supabase
      .from('achievements')
      .select('id, code, name_ar, description_ar, icon, xp_reward')
      .eq('code', first.code)
      .maybeSingle()
    setUnlockedAchievement(full || { code: first.code, name_ar: first.name_ar, xp_reward: first.xp })
    try { safeCelebrate('achievement_unlocked') } catch {}
    if (first.xp > 0) { try { emitXP(first.xp, first.name_ar) } catch {} }
  }, [isStudent, studentId])

  // Run achievement check on mount only (not on every XP change — too many DB queries)
  // The 8 sequential achievement checks were firing on every XP update, causing lag
  useEffect(() => {
    if (!isStudent || !studentId) return

    // Check after a delay to let initial data settle
    const timer = setTimeout(() => {
      checkAchievements()
    }, 5000)

    return () => clearTimeout(timer)
  }, [isStudent, studentId]) // removed currentXp dependency

  return (
    <>
      <AchievementUnlock
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
      <LevelUpCelebration
        level={levelUp}
        onDismiss={() => setLevelUp(null)}
      />
    </>
  )
}
