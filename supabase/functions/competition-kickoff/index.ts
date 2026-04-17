// Deploy: supabase functions deploy competition-kickoff --no-verify-jwt
// Sends kickoff email + push + in-app notification for an active competition.
// Idempotent: if competition_kickoff notifications already exist for this competition_id,
// returns {already_sent: true} without re-sending.

import { createClient } from 'npm:@supabase/supabase-js@2.39.0'
import { renderKickoffEmail, renderAdminEmail } from './email-template.ts'

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

let _lastResendError = ''

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    _lastResendError = 'RESEND_API_KEY not set'
    console.log(`[kickoff] No RESEND_API_KEY — skipping email to ${to}`)
    return false
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    _lastResendError = `HTTP ${res.status}: ${err}`
    console.error(`[kickoff] Resend error for ${to}:`, err)
    return false
  }
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { competition_id, email_only = false } = body
    if (!competition_id) {
      return new Response(JSON.stringify({ error: 'competition_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Idempotency check (skipped in email_only mode) ───────────
    if (!email_only) {
      const { data: compCheck } = await supabase
        .from('notifications')
        .select('id')
        .eq('type', 'competition_kickoff')
        .filter('data->>competition_id', 'eq', competition_id)
        .limit(1)
      if (compCheck && compCheck.length > 0) {
        return new Response(JSON.stringify({ already_sent: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── Fetch competition state ──────────────────────────────────
    const { data: comp, error: compErr } = await supabase.rpc('get_active_competition')
    if (compErr || !comp) {
      return new Response(JSON.stringify({ error: 'no_active_competition' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Fetch students + profiles for both teams ─────────────────
    const { data: studentsA } = await supabase
      .from('students')
      .select('id, profiles!inner(full_name, display_name, email)')
      .eq('group_id', comp.team_a.group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const { data: studentsB } = await supabase
      .from('students')
      .select('id, profiles!inner(full_name, display_name, email)')
      .eq('group_id', comp.team_b.group_id)
      .eq('status', 'active')
      .is('deleted_at', null)

    const allStudents = [
      ...(studentsA || []).map(s => ({ ...s, team: 'A', teamData: comp.team_a, opponentData: comp.team_b })),
      ...(studentsB || []).map(s => ({ ...s, team: 'B', teamData: comp.team_b, opponentData: comp.team_a })),
    ]

    const endDate = '30 أبريل 2026'
    let emailsSent = 0
    let emailsSkipped = 0
    let lastResendError = ''
    const notificationRows: any[] = []

    // ── Per-student emails + notification rows ───────────────────
    for (const student of allStudents) {
      const profile = student.profiles as any
      const name = profile?.display_name || profile?.full_name || 'طالب'
      const email = profile?.email

      // Notification row (in-app)
      notificationRows.push({
        user_id: student.id,
        type: 'competition_kickoff',
        title: 'تحدي طلاقة بدأ! ⚔️',
        body: `انضممت تلقائياً لـ ${student.teamData.name}. اضغط هنا للمزيد.`,
        action_url: '/student/competition',
        action_label: 'ادخل الآن',
        priority: 'high',
        data: {
          competition_id,
          team: student.team,
          url: '/student/competition',
        },
      })

      // Email
      if (!email) {
        emailsSkipped++
        continue
      }
      const { subject, html } = renderKickoffEmail({
        studentName: name,
        teamName: student.teamData.name,
        teamEmoji: student.teamData.emoji,
        teamColor: student.teamData.color,
        teamBattleCry: student.teamData.battle_cry || '',
        opponentName: student.opponentData.name,
        vpOwn: student.teamData.victory_points,
        vpOpp: student.opponentData.victory_points,
        gapXp: comp.gap_xp,
        endDate,
      })
      const ok = await sendEmail(email, subject, html)
      if (ok) emailsSent++
      else emailsSkipped++
    }

    // ── Insert in-app notifications + push (skip in email_only mode) ─
    let notifCreated = 0
    let pushSent = 0

    if (!email_only) {
      const { data: insertedNotifs, error: notifErr } = await supabase
        .from('notifications')
        .insert(notificationRows)
        .select('id, user_id')
      if (notifErr) console.error('[kickoff] notifications insert error:', notifErr)
      notifCreated = insertedNotifs?.length ?? 0

      const allUserIds = allStudents.map(s => s.id)
      try {
        const { data: pushResult } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_ids: allUserIds,
            title: '⚔️ تحدي طلاقة بدأ!',
            body: 'فريقك يحتاجك — كل نشاط من الآن يُحسب',
            url: '/student/competition',
            type: 'competition_kickoff',
            priority: 'high',
            skip_in_app: true,
            data: { competition_id, url: '/student/competition' },
          },
        })
        pushSent = pushResult?.sent ?? 0
      } catch (e) {
        console.error('[kickoff] push invocation error:', e)
      }
    }

    // ── Admin summary email ──────────────────────────────────────
    const { subject: adminSubject, html: adminHtml } = renderAdminEmail({
      studentCountA: studentsA?.length ?? 0,
      studentCountB: studentsB?.length ?? 0,
      vpA: comp.team_a.victory_points,
      vpB: comp.team_b.victory_points,
      xpA: comp.team_a.total_xp,
      xpB: comp.team_b.total_xp,
      emailsSent,
      pushSent,
      notifCreated,
    })
    for (const adminEmail of ADMIN_EMAILS) {
      await sendEmail(adminEmail, adminSubject, adminHtml)
    }

    const result = {
      success: true,
      emails_sent: emailsSent,
      emails_skipped: emailsSkipped,
      notifications_created: notifCreated,
      push_sent: pushSent,
      students_total: allStudents.length,
      resend_error: _lastResendError || null,
    }
    console.log('[kickoff] Done:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[kickoff] Fatal error:', err)
    return new Response(JSON.stringify({ error: 'server_error', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
