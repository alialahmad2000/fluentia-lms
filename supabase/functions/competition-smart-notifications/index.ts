// Deploy: supabase functions deploy competition-smart-notifications --no-verify-jwt
// Handles: morning_digest, evening_digest, leader_check, midpoint, 24h_remaining

import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function sendPush(userId: string, title: string, body: string, url = '/student/competition') {
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: { user_ids: [userId], title, body, url, type: 'competition', priority: 'high' },
    })
  } catch (e) { console.warn('[smart-notif] push error', userId, e) }
}

async function getActiveComp() {
  const { data } = await supabase
    .from('competitions')
    .select('*')
    .eq('status', 'active')
    .order('start_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getCompStudents(comp: any) {
  const { data } = await supabase
    .from('students')
    .select('id, group_id, profile_id, profiles(id, display_name, notification_preferences)')
    .in('group_id', [comp.team_a_group_id, comp.team_b_group_id])
    .is('deleted_at', null)
    .eq('status', 'active')
  return data || []
}

// Check if student was active today (has any XP transaction today in Riyadh time)
async function getActiveToday(compId: string, groupId: string): Promise<Set<string>> {
  const today = new Date()
  // Riyadh is UTC+3
  const riyadhOffset = 3 * 60 * 60 * 1000
  const riyadhNow = new Date(today.getTime() + riyadhOffset)
  const dayStart = new Date(riyadhNow)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayStartUTC = new Date(dayStart.getTime() - riyadhOffset)

  const { data } = await supabase
    .from('xp_transactions')
    .select('student_id')
    .gte('created_at', dayStartUTC.toISOString())

  return new Set((data || []).map((r: any) => r.student_id))
}

// Get last team VP snapshot
async function getLastLeaderSnapshot(compId: string) {
  const { data } = await supabase
    .from('competition_snapshots')
    .select('data')
    .eq('competition_id', compId)
    .eq('snapshot_type', 'leader_check')
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.data
}

async function saveLeaderSnapshot(compId: string, data: any) {
  await supabase.from('competition_snapshots').insert({
    competition_id: compId,
    group_id: null,
    snapshot_type: 'leader_check',
    snapshot_at: new Date().toISOString(),
    data,
  })
}

// Notify a student via RPC (handles rate limiting + opt-out) and optionally push
async function notify(
  studentProfileId: string,
  type: string,
  priority: string,
  title: string,
  body: string,
  dedupeKey: string,
  doPush = false,
) {
  const { data } = await supabase.rpc('send_competition_notification', {
    p_student_id:        studentProfileId,
    p_notification_type: type,
    p_priority:          priority,
    p_title:             title,
    p_body:              body,
    p_data:              {},
    p_dedupe_key:        dedupeKey,
  })
  if (doPush && data?.sent) {
    await sendPush(studentProfileId, title, body)
  }
  return data
}

// ─── Handlers ───────────────────────────────────────────────────

async function handleMorningDigest(comp: any, students: any[]) {
  const today = new Date().toISOString().slice(0, 10)
  let notified = 0

  // Check streak snapshot from yesterday for each group
  const { data: streakSnaps } = await supabase
    .from('competition_snapshots')
    .select('group_id, data')
    .eq('competition_id', comp.id)
    .eq('snapshot_type', 'streak')
    .order('snapshot_at', { ascending: false })
    .limit(2)

  const streakByGroup: Record<string, any> = {}
  for (const s of streakSnaps || []) {
    if (!streakByGroup[s.group_id]) streakByGroup[s.group_id] = s.data
  }

  for (const student of students) {
    const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
    if (!profile) continue

    const streak = streakByGroup[student.group_id]
    const streakDays = streak?.current_streak ?? 0

    // Only notify if streak is alive and student hasn't triggered streak today yet
    if (streakDays > 0 && streak?.threshold_met === false) {
      // Streak at risk
      const result = await notify(
        profile.id,
        'streak_at_risk',
        'high',
        '🔥 الستريك بخطر!',
        `فريقك على بُعد نشاط من كسر سلسلة ${streakDays} أيام — ادخل اليوم`,
        `streak_at_risk_${today}`,
        true,
      )
      if (result?.sent) notified++
    }
  }

  return notified
}

async function handleEveningDigest(comp: any, students: any[]) {
  const today = new Date().toISOString().slice(0, 10)
  const activeSet = await getActiveToday(comp.id, comp.team_a_group_id)
  for (const s of students) {
    if (s.group_id === comp.team_b_group_id) {
      const setB = await getActiveToday(comp.id, s.group_id)
      // merge
    }
  }
  // simplified: just use the full active set from both groups
  const fullActiveSet = await getActiveToday(comp.id, comp.team_a_group_id)

  let notified = 0

  for (const student of students) {
    const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
    if (!profile) continue

    const wasActiveToday = fullActiveSet.has(student.id)

    if (wasActiveToday) {
      // Get today's XP for this student
      const { data: txs } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('student_id', student.id)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
      const todayXP = (txs || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

      if (todayXP > 0) {
        const result = await notify(
          profile.id,
          'evening_digest',
          'normal',
          '✨ أحسنت اليوم!',
          `أضفت +${todayXP} XP لفريقك اليوم. واصل/ي الزخم غداً!`,
          `evening_digest_${today}`,
          false,
        )
        if (result?.sent) notified++
      }
    } else {
      // Not active today — check if streak alive
      const { data: snap } = await supabase
        .from('competition_snapshots')
        .select('data')
        .eq('competition_id', comp.id)
        .eq('group_id', student.group_id)
        .eq('snapshot_type', 'streak')
        .order('snapshot_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      const streak = snap?.data?.current_streak ?? 0
      if (streak > 0) {
        const result = await notify(
          profile.id,
          'streak_at_risk',
          'high',
          '⚠️ فريقك نشط اليوم بدونك',
          `لا تكسر الستريك — فريقك محتاجك اليوم`,
          `streak_at_risk_${today}`,
          true,
        )
        if (result?.sent) notified++
      }
    }
  }

  return notified
}

async function handleLeaderCheck(comp: any) {
  const teamA = comp.team_a_final_xp ?? 0
  const teamB = comp.team_b_final_xp ?? 0
  // Get current VP from live data
  const { data: liveComp } = await supabase
    .from('competitions')
    .select('team_a_final_xp, team_b_final_xp, team_a_group_id, team_b_group_id')
    .eq('id', comp.id)
    .single()
  if (!liveComp) return 0

  const currentLeader = (liveComp.team_a_final_xp ?? 0) >= (liveComp.team_b_final_xp ?? 0) ? 'A' : 'B'
  const last = await getLastLeaderSnapshot(comp.id)
  const prevLeader = last?.leader

  if (prevLeader && prevLeader !== currentLeader) {
    // Leader changed! Notify new leader's team
    const today = new Date().toISOString().slice(0, 10)
    const newGroupId = currentLeader === 'A' ? liveComp.team_a_group_id : liveComp.team_b_group_id
    const { data: newTeamStudents } = await supabase
      .from('students')
      .select('id, profile_id')
      .eq('group_id', newGroupId)
      .is('deleted_at', null)
      .eq('status', 'active')

    let notified = 0
    for (const s of newTeamStudents || []) {
      const result = await notify(
        s.profile_id,
        'leader_changed',
        'high',
        '⚡ فريقك في المقدمة الآن!',
        'استمروا — كل XP يهم الآن',
        `leader_change_${comp.id}_${today}`,
        true,
      )
      if (result?.sent) notified++
    }
    await saveLeaderSnapshot(comp.id, { leader: currentLeader, checked_at: new Date().toISOString() })
    return notified
  }

  await saveLeaderSnapshot(comp.id, { leader: currentLeader, checked_at: new Date().toISOString() })
  return 0
}

async function handleMilestone(comp: any, students: any[], action: string) {
  const cfg = {
    midpoint:     { title: '🔥 نصف الطريق!', body: 'أسبوع مضى — أسبوع تبقى. حافظوا على الزخم!', dedupe: `midpoint_${comp.id}` },
    '24h_remaining': { title: '🚨 24 ساعة فقط!', body: 'المسابقة تنتهي غداً — كل XP يحسم النتيجة', dedupe: `24h_${comp.id}` },
  }[action]
  if (!cfg) return 0

  let notified = 0
  for (const s of students) {
    const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
    if (!profile) continue
    const result = await notify(profile.id, action, 'high', cfg.title, cfg.body, cfg.dedupe, true)
    if (result?.sent) notified++
  }
  return notified
}

// ─── Main handler ───────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const json = req.headers.get('content-length') !== '0' ? await req.json() : {}
    const action: string = json?.action ?? 'morning_digest'

    const comp = await getActiveComp()
    if (!comp) {
      return new Response(JSON.stringify({ skipped: 'no_active_competition' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const students = await getCompStudents(comp)
    let notified = 0

    if (action === 'morning_digest') {
      notified = await handleMorningDigest(comp, students)
    } else if (action === 'evening_digest') {
      notified = await handleEveningDigest(comp, students)
    } else if (action === 'leader_check') {
      notified = await handleLeaderCheck(comp)
    } else if (action === 'midpoint' || action === '24h_remaining') {
      notified = await handleMilestone(comp, students, action)
    }

    return new Response(JSON.stringify({ success: true, action, notified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[smart-notif]', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
