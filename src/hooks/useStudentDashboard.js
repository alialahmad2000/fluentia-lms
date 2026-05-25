import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

// Unified data feed for the 3 premium dashboard variants. ONE hook → one typed
// object. Every domain is fetched independently via Promise.allSettled, so a
// failing/empty domain yields a safe default (null / [] / 0) and the variant
// renders that widget's empty state — never a top-level error. Variants are pure
// view layers and must NOT fetch their own data.

const LEVEL_CEFR = { 0: 'Pre-A1', 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1' }

const MOTIVATION = [
  { ar: 'صوتكِ يحمل أكثر من القواعد. ثقي به.', en: 'Your voice carries more than grammar. Trust it.' },
  { ar: 'كل كلمة جديدة هي باب.', en: 'Every new word is a door.' },
  { ar: 'التقدّم الهادئ يدوم أطول من الحماس العابر.', en: 'Quiet progress outlasts loud bursts.' },
  { ar: 'لا بأس أن تكون بطيئة، المهم ألا تتوقفي.', en: 'Slow is fine. Stopping is the only failure.' },
  { ar: 'اللغة تُبنى يومًا فوق يوم.', en: 'A language is built one day on top of another.' },
  { ar: 'أنتِ أقرب اليوم مما كنتِ بالأمس.', en: 'You are closer today than you were yesterday.' },
  { ar: 'الطلاقة طريق، لا وجهة.', en: 'Fluency is a road, not a destination.' },
]

function greetingFor(hour) {
  if (hour < 12) return 'صباح الخير'
  if (hour < 17) return 'مساء الخير'
  return 'مساء الخير'
}

async function settle(promise, fallback) {
  try {
    const r = await promise
    if (r?.error) return fallback
    return r
  } catch {
    return fallback
  }
}

export function useStudentDashboard(studentId) {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)

  const query = useQuery({
    queryKey: ['student-dashboard', studentId],
    enabled: !!studentId,
    staleTime: 60_000,
    queryFn: async () => {
      const now = new Date()
      const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)
      const weekAgo = new Date(now.getTime() - 7 * 86400_000)

      const academicLevel = studentData?.academic_level ?? null

      const [
        studentRow, levelRow, xpRows, ankiCount, activityRows,
        achRow, voiceRow, groupRow, teamRow,
      ] = await Promise.all([
        settle(supabase.from('students').select('xp_total,current_streak,longest_streak,streak_freeze_available,academic_level,group_id,team_id').eq('id', studentId).maybeSingle(), { data: null }),
        academicLevel != null
          ? settle(supabase.from('curriculum_levels').select('name_ar,cefr,color,level_number').eq('level_number', academicLevel).maybeSingle(), { data: null })
          : Promise.resolve({ data: null }),
        settle(supabase.from('xp_transactions').select('amount,created_at').eq('student_id', studentId).gte('created_at', weekAgo.toISOString()), { data: [] }),
        settle(supabase.from('curriculum_vocabulary_srs').select('id', { count: 'exact', head: true }).eq('student_id', studentId).lte('due', now.toISOString()), { count: 0 }),
        settle(supabase.from('activity_feed').select('id,type,title,description,event_text_ar,xp_amount,created_at,student_id').order('created_at', { ascending: false }).limit(6), { data: [] }),
        settle(supabase.from('student_achievements').select('earned_at,achievement:achievements(name_ar,icon)').eq('student_id', studentId).order('earned_at', { ascending: false }).limit(1).maybeSingle(), { data: null }),
        settle(supabase.from('speaking_recordings').select('id,audio_url,audio_duration_seconds,trainer_feedback,created_at').eq('student_id', studentId).not('audio_url', 'is', null).order('created_at', { ascending: false }).limit(1).maybeSingle(), { data: null }),
        Promise.resolve({ data: null }), // group resolved below once we have group_id
        Promise.resolve({ data: null }),
      ])

      const s = studentRow?.data || {}
      const groupId = s.group_id
      const teamId = s.team_id

      // Group (next class meta) + team — best-effort, depend on the student row.
      const [grp, team] = await Promise.all([
        groupId ? settle(supabase.from('groups').select('name,google_meet_link,schedule,trainer_id').eq('id', groupId).maybeSingle(), { data: null }) : Promise.resolve({ data: null }),
        teamId ? settle(supabase.from('teams').select('name,color').eq('id', teamId).maybeSingle(), { data: null }) : Promise.resolve({ data: null }),
      ])

      // XP aggregation
      const xpList = xpRows?.data || []
      let xpToday = 0, xpWeek = 0
      const dayBuckets = {}
      for (const r of xpList) {
        const amt = r.amount || 0
        xpWeek += amt
        const d = new Date(r.created_at)
        if (d >= startOfDay) xpToday += amt
        const key = d.toISOString().slice(0, 10)
        dayBuckets[key] = (dayBuckets[key] || 0) + amt
      }
      const xpTotal = s.xp_total ?? 0

      // 7-day series (oldest → newest)
      const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
      const xpWeekSeries = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400_000)
        const key = d.toISOString().slice(0, 10)
        xpWeekSeries.push({ day_label: dayNamesAr[d.getDay()], xp: dayBuckets[key] || 0 })
      }

      const currentStreak = s.current_streak ?? 0
      const lvl = levelRow?.data
      const percent = Math.min(100, Math.round(((xpTotal % 500) / 500) * 100)) // approximate within-level progress

      const data = {
        identity: {
          name_ar: profile?.display_name || profile?.full_name || 'صديقتي',
          avatar_url: profile?.avatar_url || null,
          greeting: greetingFor(now.getHours()),
        },
        level: {
          current: lvl?.name_ar || (academicLevel != null ? `المستوى ${academicLevel}` : 'المستوى'),
          cefr: lvl?.cefr || LEVEL_CEFR[academicLevel] || '',
          percent,
        },
        streak: {
          current: currentStreak,
          longest: s.longest_streak ?? currentStreak,
          freezes: s.streak_freeze_available ?? 0,
          status: currentStreak > 0 ? 'active' : 'lost',
        },
        xp: { today: xpToday, week: xpWeek, total: xpTotal },
        team: team?.data ? { name: team.data.name, color: team.data.color || '#e9b949', rank: 0, size: 0 } : null,
        next_class: grp?.data?.google_meet_link
          ? { starts_at: null, meet_url: grp.data.google_meet_link, trainer_name: '' }
          : null,
        daily_challenge: null, // daily_challenges table currently empty
        anki_due: ankiCount?.count || 0,
        assignments: [],
        achievement: achRow?.data?.achievement
          ? { id: 'ach', title_ar: achRow.data.achievement.name_ar, earned_at: achRow.data.earned_at, icon: achRow.data.achievement.icon }
          : null,
        voice_highlight: voiceRow?.data
          ? { id: voiceRow.data.id, url: voiceRow.data.audio_url, duration_s: voiceRow.data.audio_duration_seconds || 0, trainer_note: voiceRow.data.trainer_feedback || null }
          : null,
        activity: (activityRows?.data || []).map((a) => ({
          id: a.id,
          type: a.type,
          actor_name: a.title || '',
          summary: a.event_text_ar || a.description || a.title || '',
          created_at: a.created_at,
          xp: a.xp_amount || undefined,
        })),
        trainer_note: null,
        motivation: MOTIVATION[now.getDate() % MOTIVATION.length],
        xp_week_series: xpWeekSeries,
      }
      return data
    },
  })

  return { data: query.data ?? null, isLoading: query.isLoading, error: query.error ?? null }
}
