// Fluentia LMS — Weekly Skill Snapshot Cron Job
// Runs weekly: calculates skill scores from the past week's data for each active student
// Stores in skill_snapshots, compares with previous, alerts trainer on >10% drop
// Deploy: supabase functions deploy weekly-skill-snapshot --no-verify-jwt
// Cron: set in Supabase Dashboard → Database → Cron Jobs → weekly on Sunday midnight
//   select cron.schedule('weekly-skill-snapshot', '0 0 * * 0',
//     $$select net.http_post(url:='https://nmjexpuycmqcxuxljier.supabase.co/functions/v1/weekly-skill-snapshot',
//       headers:='{"Authorization": "Bearer SERVICE_ROLE_KEY"}'::jsonb)$$);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Assignment type → skill mapping
const TYPE_SKILL_MAP: Record<string, string> = {
  grammar: 'grammar',
  vocabulary: 'vocabulary',
  speaking: 'speaking',
  listening: 'listening',
  reading: 'reading',
  writing: 'writing',
  irregular_verbs: 'grammar', // maps to grammar skill
  custom: '', // no specific skill
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Verify auth: accept service role key (for cron) or admin JWT (for manual triggers)
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const token = authHeader.replace('Bearer ', '')
    if (token !== Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      // Not the service role key — validate as a user JWT and require admin role
      const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        })
      }
      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Unauthorized — admin only' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        })
      }
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const today = new Date().toISOString().split('T')[0]

    // Get all active students
    const { data: students } = await supabase
      .from('students')
      .select('id, group_id, academic_level')
      .eq('status', 'active')
      .is('deleted_at', null)

    if (!students?.length) {
      return new Response(
        JSON.stringify({ message: 'No active students', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let alerts = 0
    const errors: string[] = []

    for (const student of students) {
      try {
        // Get this week's graded submissions for this student
        const { data: weekSubmissions } = await supabase
          .from('submissions')
          .select('grade_numeric, assignments(type)')
          .eq('student_id', student.id)
          .eq('status', 'graded')
          .is('deleted_at', null)
          .gte('submitted_at', weekAgo)

        // Get previous snapshot for baseline
        const { data: prevSnapshot } = await supabase
          .from('skill_snapshots')
          .select('grammar, vocabulary, speaking, listening, reading, writing')
          .eq('student_id', student.id)
          .order('snapshot_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Calculate scores per skill from this week's submissions
        const skillGrades: Record<string, number[]> = {
          grammar: [],
          vocabulary: [],
          speaking: [],
          listening: [],
          reading: [],
          writing: [],
        }

        for (const sub of weekSubmissions || []) {
          const type = sub.assignments?.type
          if (!type) continue
          const skill = TYPE_SKILL_MAP[type]
          if (skill && skillGrades[skill]) {
            skillGrades[skill].push(sub.grade_numeric || 0)
          }
        }

        // Get vocabulary mastery data (for vocabulary skill boost)
        const { count: vocabMastered } = await supabase
          .from('vocabulary_bank')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', student.id)
          .eq('mastery', 'mastered')

        // Get attendance rate this week (affects all skills slightly)
        const { data: weekAttendance } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', student.id)
          .gte('created_at', weekAgo)

        const attendanceRate = weekAttendance?.length
          ? weekAttendance.filter((a: any) => a.status === 'present').length / weekAttendance.length
          : null

        // Calculate each skill score
        const newSnapshot: Record<string, number> = {}

        for (const skill of Object.keys(skillGrades)) {
          const grades = skillGrades[skill]
          const prevScore = prevSnapshot?.[skill] || 50 // default to 50 if no history

          if (grades.length > 0) {
            // Average of this week's grades
            const weekAvg = grades.reduce((a, b) => a + b, 0) / grades.length

            // Blend: 60% new performance + 40% previous score (smoothing)
            let score = Math.round(weekAvg * 0.6 + prevScore * 0.4)

            // Small attendance bonus/penalty (±3 points)
            if (attendanceRate !== null) {
              if (attendanceRate >= 0.8) score = Math.min(100, score + 2)
              else if (attendanceRate < 0.5) score = Math.max(0, score - 3)
            }

            newSnapshot[skill] = Math.max(0, Math.min(100, score))
          } else {
            // No data this week: slight decay toward previous (keeps score stable)
            // Apply a small -1 decay if no activity, otherwise keep
            const decay = (weekSubmissions?.length || 0) > 0 ? 0 : 1
            newSnapshot[skill] = Math.max(0, prevScore - decay)
          }
        }

        // Vocabulary bonus from mastered words
        if (vocabMastered) {
          const vocabBonus = Math.min(10, Math.floor((vocabMastered || 0) / 10))
          newSnapshot.vocabulary = Math.min(100, (newSnapshot.vocabulary || 50) + vocabBonus)
        }

        // Insert snapshot
        await supabase.from('skill_snapshots').insert({
          student_id: student.id,
          grammar: newSnapshot.grammar,
          vocabulary: newSnapshot.vocabulary,
          speaking: newSnapshot.speaking,
          listening: newSnapshot.listening,
          reading: newSnapshot.reading,
          writing: newSnapshot.writing,
          snapshot_date: today,
        })

        // Check for significant drops (>10%) and alert trainer
        if (prevSnapshot) {
          const drops: string[] = []
          const SKILL_LABELS: Record<string, string> = {
            grammar: 'القرامر',
            vocabulary: 'المفردات',
            speaking: 'المحادثة',
            listening: 'الاستماع',
            reading: 'القراءة',
            writing: 'الكتابة',
          }

          for (const skill of Object.keys(newSnapshot)) {
            const prev = prevSnapshot[skill] || 0
            const curr = newSnapshot[skill] || 0
            const drop = prev - curr

            if (drop > 10) {
              drops.push(`${SKILL_LABELS[skill]}: ${prev}% → ${curr}% (−${drop}%)`)
            }
          }

          if (drops.length > 0) {
            // Get student name
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, display_name')
              .eq('id', student.id)
              .single()

            const studentName = profile?.display_name || profile?.full_name || 'طالب'

            // Get trainer for this student's group
            const { data: group } = await supabase
              .from('groups')
              .select('trainer_id')
              .eq('id', student.group_id)
              .single()

            if (group?.trainer_id) {
              await supabase.from('notifications').insert({
                user_id: group.trainer_id,
                type: 'system',
                title: `⚠️ تراجع في أداء ${studentName}`,
                body: `لاحظنا تراجع ملحوظ هذا الأسبوع:\n${drops.join('\n')}\n\nننصح بمتابعة الطالب/ة.`,
                data: { student_id: student.id, type: 'skill_drop_alert' },
              })
              alerts++
            }
          }
        }

        processed++
      } catch (err: any) {
        errors.push(`${student.id}: ${err.message}`)
      }
    }

    const summary = {
      message: 'Weekly skill snapshot completed',
      total_students: students.length,
      processed,
      alerts_sent: alerts,
      errors: errors.length,
      error_details: errors.slice(0, 5), // limit error output
      date: today,
    }

    console.log('[weekly-skill-snapshot]', JSON.stringify(summary))

    return new Response(
      JSON.stringify(summary),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[weekly-skill-snapshot] Fatal error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
