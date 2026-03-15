import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { GAMIFICATION_LEVELS } from '../../lib/constants'
import AchievementUnlock from './AchievementUnlock'
import LevelUpCelebration from './LevelUpCelebration'

function getLevel(xp) {
  for (let i = GAMIFICATION_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= GAMIFICATION_LEVELS[i].xp) return GAMIFICATION_LEVELS[i]
  }
  return GAMIFICATION_LEVELS[0]
}

// Achievement definitions with auto-detection conditions
const ACHIEVEMENT_CHECKS = [
  {
    code: 'fire_starter',
    check: async (studentId) => {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .is('deleted_at', null)
      return count >= 1
    },
  },
  {
    code: 'bookworm',
    check: async (studentId) => {
      const { count } = await supabase
        .from('submissions')
        .select('*, assignments!inner(type)', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('assignments.type', 'reading')
        .is('deleted_at', null)
      return count >= 10
    },
  },
  {
    code: 'voice_hero',
    check: async (studentId) => {
      const { count } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .not('voice_url', 'is', null)
        .is('deleted_at', null)
      return count >= 10
    },
  },
  {
    code: 'streak_master',
    check: async (studentId) => {
      const { data } = await supabase
        .from('students')
        .select('longest_streak')
        .eq('id', studentId)
        .single()
      return (data?.longest_streak || 0) >= 30
    },
  },
  {
    code: 'helper',
    check: async (studentId) => {
      const { count } = await supabase
        .from('peer_recognitions')
        .select('*', { count: 'exact', head: true })
        .eq('to_student', studentId)
      return count >= 5
    },
  },
  {
    code: 'note_taker',
    check: async (studentId) => {
      const { count } = await supabase
        .from('class_notes')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', studentId)
        .eq('is_trainer_summary', false)
      return count >= 5
    },
  },
  {
    code: 'weekly_champion',
    check: async (studentId) => {
      const { data } = await supabase
        .from('weekly_task_sets')
        .select('status, week_start')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('week_start', { ascending: false })
        .limit(4)
      if (!data || data.length < 4) return false
      // Check they are 4 consecutive weeks
      for (let i = 0; i < 3; i++) {
        const diff = new Date(data[i].week_start) - new Date(data[i + 1].week_start)
        if (Math.abs(diff - 7 * 24 * 60 * 60 * 1000) > 24 * 60 * 60 * 1000) return false
      }
      return true
    },
  },
  {
    code: 'task_master',
    check: async (studentId) => {
      const { count } = await supabase
        .from('weekly_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'graded')
      return (count || 0) >= 50
    },
  },
]

export default function GamificationProvider() {
  const { profile, studentData } = useAuthStore()
  const [unlockedAchievement, setUnlockedAchievement] = useState(null)
  const [levelUp, setLevelUp] = useState(null)
  const lastCheckedXpRef = useRef(null)

  const isStudent = profile?.role === 'student'
  const studentId = profile?.id
  const currentXp = studentData?.xp_total || 0

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
      }
    }

    lastCheckedXpRef.current = currentXp
  }, [currentXp, isStudent, studentId])

  // Check for new achievements periodically
  const checkAchievements = useCallback(async () => {
    if (!isStudent || !studentId) return

    try {
      // Get already earned achievements
      const { data: earned } = await supabase
        .from('student_achievements')
        .select('achievements(code)')
        .eq('student_id', studentId)

      const earnedCodes = new Set((earned || []).map(e => e.achievements?.code).filter(Boolean))

      // Get available achievements
      const { data: available } = await supabase
        .from('achievements')
        .select('id, code, name_ar, description_ar, icon, xp_reward')
        .eq('is_active', true)

      if (!available?.length) return

      // Check each unearned achievement
      for (const achievement of available) {
        if (earnedCodes.has(achievement.code)) continue

        const checker = ACHIEVEMENT_CHECKS.find(c => c.code === achievement.code)
        if (!checker) continue

        try {
          const qualifies = await checker.check(studentId)
          if (qualifies) {
            // Award achievement
            const { error } = await supabase.from('student_achievements').insert({
              student_id: studentId,
              achievement_id: achievement.id,
            })

            if (!error) {
              // Award XP
              if (achievement.xp_reward > 0) {
                await supabase.from('xp_transactions').insert({
                  student_id: studentId,
                  amount: achievement.xp_reward,
                  reason: 'achievement',
                  description: achievement.name_ar,
                })
              }

              // Send notification
              await supabase.from('notifications').insert({
                user_id: studentId,
                type: 'achievement',
                title: `إنجاز جديد: ${achievement.name_ar}`,
                body: achievement.description_ar,
                data: { achievement_id: achievement.id, icon: achievement.icon },
              })

              // Add to activity feed
              const { data: student } = await supabase
                .from('students')
                .select('group_id')
                .eq('id', studentId)
                .single()

              if (student?.group_id) {
                await supabase.from('activity_feed').insert({
                  group_id: student.group_id,
                  student_id: studentId,
                  type: 'achievement',
                  title: `حقق إنجاز ${achievement.name_ar}`,
                  description: achievement.description_ar,
                  data: { icon: achievement.icon, xp: achievement.xp_reward },
                })
              }

              // Show unlock animation
              setUnlockedAchievement(achievement)
              return // Only show one at a time
            }
          }
        } catch (e) {
          // Silently skip failed checks
        }
      }
    } catch (e) {
      // Silently handle errors
    }
  }, [isStudent, studentId])

  // Run achievement check on mount and when XP changes
  useEffect(() => {
    if (!isStudent || !studentId) return

    // Check after a short delay to let data settle
    const timer = setTimeout(() => {
      checkAchievements()
    }, 2000)

    return () => clearTimeout(timer)
  }, [isStudent, studentId, currentXp, checkAchievements])

  return (
    <>
      <AchievementUnlock
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
      <LevelUpCelebration
        newLevel={levelUp}
        onClose={() => setLevelUp(null)}
      />
    </>
  )
}
