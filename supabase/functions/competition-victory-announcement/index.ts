// Deploy: supabase functions deploy competition-victory-announcement --no-verify-jwt
// Idempotent: re-invocation safe (checks competition_announcements_seen)

import { createClient } from 'npm:@supabase/supabase-js@2.39.0'
import { renderWinnersEmail, renderRunnersUpEmail, renderMVPEmail, renderAdminSummaryEmail } from './email-templates.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'Fluentia Academy <noreply@fluentia.app>'
const ADMIN_EMAILS = ['ali@fluentia.academy', 'goldmohmmed@gmail.com']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) { console.error('[victory] Resend error for', to, await res.text()); return false }
  return true
}

async function sendPush(userId: string, title: string, body: string, data: Record<string, unknown>) {
  try {
    await supabase.functions.invoke('send-push-notification', {
      body: { userId, title, body, data },
    })
  } catch (e) { console.warn('[victory] push error', userId, e) }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const json = (req.headers.get('content-length') || '0') !== '0' ? await req.json() : {}
    const competition_id: string | undefined = json?.competition_id

    // Find the closed competition
    const compQuery = supabase
      .from('competitions')
      .select('*')
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(1)

    if (competition_id) compQuery.eq('id', competition_id)

    const { data: comps, error: compErr } = await compQuery
    if (compErr || !comps?.length) {
      return new Response(JSON.stringify({ error: 'no_closed_competition' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const comp = comps[0]

    // Idempotency check
    const { data: alreadySeen } = await supabase
      .from('competition_announcements_seen')
      .select('id')
      .eq('competition_id', comp.id)
      .eq('announcement_type', 'competition_victory')
      .limit(1)

    if (alreadySeen?.length) {
      return new Response(JSON.stringify({ already_sent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get all students from both teams
    const { data: students } = await supabase
      .from('students')
      .select('id, group_id, profiles(id, display_name, full_name, email)')
      .in('group_id', [comp.team_a_group_id, comp.team_b_group_id])
      .is('deleted_at', null)
      .eq('status', 'active')

    // Get MVP profiles
    const mvpIds = [comp.team_a_mvp_student_id, comp.team_b_mvp_student_id].filter(Boolean)
    const { data: mvpProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, full_name')
      .in('id', mvpIds)

    const mvpAProfile = mvpProfiles?.find((p: any) => p.id === comp.team_a_mvp_student_id)
    const mvpBProfile = mvpProfiles?.find((p: any) => p.id === comp.team_b_mvp_student_id)
    const mvpAName = mvpAProfile?.display_name || mvpAProfile?.full_name || 'MVP A'
    const mvpBName = mvpBProfile?.display_name || mvpBProfile?.full_name || 'MVP B'

    // Get per-student XP ranks within their team
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('student_id, amount')
      .gte('created_at', comp.start_at)
      .lte('created_at', comp.closed_at || new Date().toISOString())
      .gt('amount', 0)

    type XPMap = Record<string, number>
    const xpByStudent: XPMap = {}
    for (const tx of xpData || []) {
      xpByStudent[tx.student_id] = (xpByStudent[tx.student_id] || 0) + tx.amount
    }

    let emailsSent = 0
    let pushSent = 0

    for (const student of students || []) {
      const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles as any
      if (!profile?.email) continue

      const isTeamA = student.group_id === comp.team_a_group_id
      const myTeamName = isTeamA ? comp.team_a_name : comp.team_b_name
      const myTeamEmoji = isTeamA ? comp.team_a_emoji : comp.team_b_emoji
      const myTeamColor = isTeamA ? comp.team_a_color : comp.team_b_color
      const myTeamXP = isTeamA ? (comp.team_a_final_xp || 0) : (comp.team_b_final_xp || 0)
      const myTeamVP = isTeamA ? (comp.team_a_final_vp || 0) : (comp.team_b_final_vp || 0)
      const myTeam = isTeamA ? 'A' : 'B'
      const isWinner = comp.winner_team === myTeam
      const isMVP = student.id === comp.team_a_mvp_student_id || student.id === comp.team_b_mvp_student_id
      const studentName = profile.display_name || profile.full_name || 'الطالب'

      // Rank within team
      const teamGroup = isTeamA ? comp.team_a_group_id : comp.team_b_group_id
      const teamStudents = (students || []).filter((s: any) => s.group_id === teamGroup)
      const sorted = teamStudents.sort((a: any, b: any) => (xpByStudent[b.id] || 0) - (xpByStudent[a.id] || 0))
      const myRank = sorted.findIndex((s: any) => s.id === student.id) + 1

      // In-app notification
      await supabase.from('notifications').insert({
        user_id: profile.id,
        type: 'competition_victory',
        title: isWinner ? '🏆 فريقك فاز في تحدي طلاقة! مبروك' : '⚔️ انتهى تحدي طلاقة أبريل',
        body: 'شاهد النتائج الكاملة',
        data: { competition_id: comp.id, winner_team: comp.winner_team, is_winner: isWinner },
      })

      // Push
      await sendPush(profile.id,
        isWinner ? '🏆 فريقك فاز!' : '⚔️ انتهت المسابقة',
        isWinner ? `مبروك — ${myTeamEmoji} ${myTeamName} فاز!` : 'شاهد النتائج',
        { competition_id: comp.id, url: '/student/competition' }
      )
      pushSent++

      // MVP bonus email
      if (isMVP) {
        const sent = await sendEmail(
          profile.email,
          `⭐ ${studentName}، أنت MVP فريقك في تحدي طلاقة أبريل 2026`,
          renderMVPEmail({
            studentName,
            teamName: myTeamName,
            teamEmoji: myTeamEmoji,
            xp: xpByStudent[student.id] || 0,
          })
        )
        if (sent) emailsSent++
      }

      // Winner / runner-up email
      const subject = isWinner
        ? `🏆 مبروك ${studentName} — فريقك فاز في تحدي طلاقة أبريل 2026`
        : `⚔️ انتهى تحدي طلاقة أبريل 2026 — نتائج فريقك`

      const html = isWinner
        ? renderWinnersEmail({
            studentName, teamName: myTeamName, teamEmoji: myTeamEmoji,
            teamColor: myTeamColor, teamXP: myTeamXP, teamVP: myTeamVP,
            mvpName: isTeamA ? mvpAName : mvpBName, myRank,
          })
        : renderRunnersUpEmail({
            studentName, teamName: myTeamName, teamEmoji: myTeamEmoji,
            teamColor: myTeamColor, teamXP: myTeamXP, teamVP: myTeamVP,
            winnerTeamName: comp.winner_team === 'A' ? comp.team_a_name : comp.team_b_name,
            winnerTeamEmoji: comp.winner_team === 'A' ? comp.team_a_emoji : comp.team_b_emoji,
          })

      const sent = await sendEmail(profile.email, subject, html)
      if (sent) emailsSent++

      // Mark seen for this student
      await supabase.from('competition_announcements_seen').insert({
        competition_id: comp.id,
        student_id: student.id,
        announcement_type: 'competition_victory',
      }).onConflict('competition_id,student_id,announcement_type' as any)
    }

    // Admin summary email
    const adminHtml = renderAdminSummaryEmail({
      winnerTeam: comp.winner_team === 'A' ? comp.team_a_name : (comp.winner_team === 'B' ? comp.team_b_name : 'تعادل'),
      winnerEmoji: comp.winner_team === 'A' ? comp.team_a_emoji : comp.team_b_emoji,
      teamAName: comp.team_a_name, teamAEmoji: comp.team_a_emoji,
      teamAXP: comp.team_a_final_xp || 0, teamAVP: comp.team_a_final_vp || 0,
      teamBName: comp.team_b_name, teamBEmoji: comp.team_b_emoji,
      teamBXP: comp.team_b_final_xp || 0, teamBVP: comp.team_b_final_vp || 0,
      mvpAName, mvpBName,
      totalStudents: students?.length || 0,
      emailsSent, pushSent,
    })
    for (const email of ADMIN_EMAILS) {
      await sendEmail(email, '🏆 ملخص تحدي طلاقة أبريل 2026 — النتائج النهائية', adminHtml)
    }

    return new Response(JSON.stringify({
      success: true,
      competition_id: comp.id,
      winner: comp.winner_team,
      students_notified: students?.length || 0,
      emails_sent: emailsSent,
      push_sent: pushSent,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[victory] Fatal:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
