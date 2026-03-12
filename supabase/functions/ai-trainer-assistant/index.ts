// Fluentia LMS — AI Command Center (Trainer/Admin Assistant)
// Full action system: create assignments, award XP, grade, manage students, etc.
// Deploy: supabase functions deploy ai-trainer-assistant --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GRADE_MAP: Record<string, { grade: string; numeric: number }> = {
  'A+': { grade: 'A+', numeric: 97 },
  'A': { grade: 'A', numeric: 93 },
  'B+': { grade: 'B+', numeric: 88 },
  'B': { grade: 'B', numeric: 83 },
  'C+': { grade: 'C+', numeric: 78 },
  'C': { grade: 'C', numeric: 73 },
  'D': { grade: 'D', numeric: 63 },
  'F': { grade: 'F', numeric: 45 },
}

// ─── Helpers ───────────────────────────────────────────────

async function findStudent(name: string, supabase: any, trainerGroupIds?: string[]) {
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, display_name')
    .or(`full_name.ilike.%${name}%,display_name.ilike.%${name}%`)

  if (!profiles?.length) return { found: false }

  // Filter to actual active students
  const ids = profiles.map((p: any) => p.id)
  let sq = supabase
    .from('students')
    .select('id, group_id, academic_level, package, xp_total, current_streak, status, gamification_level, custom_price')
    .in('id', ids)
    .eq('status', 'active')

  if (trainerGroupIds?.length) sq = sq.in('group_id', trainerGroupIds)

  const { data: students } = await sq
  if (!students?.length) return { found: false }

  if (students.length === 1) {
    const p = profiles.find((pp: any) => pp.id === students[0].id)
    return { found: true, student: { ...students[0], full_name: p?.full_name, display_name: p?.display_name } }
  }

  const matches = students.map((s: any) => {
    const p = profiles.find((pp: any) => pp.id === s.id)
    return { ...s, full_name: p?.full_name, display_name: p?.display_name }
  })
  return { found: true, ambiguous: true, matches }
}

async function findGroup(code: string, supabase: any) {
  const { data } = await supabase
    .from('groups')
    .select('id, name, code, level, trainer_id')
    .or(`code.ilike.%${code}%,name.ilike.%${code}%`)
    .limit(1)
    .maybeSingle()
  return data
}

async function loadBaseContext(supabase: any, userId: string, role: string, trainerGroupIds: string[]) {
  const groupFilter = role === 'admin' ? {} : { ids: trainerGroupIds }

  let groupsQuery = supabase.from('groups').select('id, name, code, level')
  if (role !== 'admin') groupsQuery = groupsQuery.in('id', trainerGroupIds)
  const { data: groups } = await groupsQuery

  // Get student names per group
  let studentsQuery = supabase
    .from('students')
    .select('id, group_id, academic_level, xp_total, current_streak, package, profiles(full_name, display_name)')
    .eq('status', 'active')
    .is('deleted_at', null)
  if (role !== 'admin') studentsQuery = studentsQuery.in('group_id', trainerGroupIds)
  const { data: students } = await studentsQuery

  // Pending submissions count
  let pendingQuery = supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'submitted')
    .is('deleted_at', null)
  const { count: pendingCount } = await pendingQuery

  // Total active students
  const totalStudents = students?.length || 0

  // Format context
  const groupList = (groups || []).map((g: any) => {
    const groupStudents = (students || []).filter((s: any) => s.group_id === g.id)
    const names = groupStudents.map((s: any) => s.profiles?.display_name || s.profiles?.full_name || '?').join('، ')
    return `  ${g.code} (${g.name}) — مستوى ${g.level || '?'} — ${groupStudents.length} طالب: ${names}`
  }).join('\n')

  return {
    groups: groups || [],
    students: students || [],
    context: `اليوم: ${new Date().toISOString().split('T')[0]}
الدور: ${role === 'admin' ? 'مشرف (صلاحيات كاملة)' : 'مدرب'}
إجمالي الطلاب النشطين: ${totalStudents}
الواجبات المعلقة للتقييم: ${pendingCount || 0}

المجموعات:
${groupList || '  لا توجد مجموعات'}`,
  }
}

function studentName(s: any) {
  return s?.display_name || s?.full_name || 'طالب'
}

// ─── Action Execution ──────────────────────────────────────

async function executeAction(
  action: string,
  params: any,
  userId: string,
  role: string,
  supabase: any,
  trainerGroupIds: string[]
): Promise<{ success: boolean; reply: string; data?: any }> {
  try {
    switch (action) {

      // ── Student Queries ──
      case 'STUDENT_INFO': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          const names = lookup.matches.map((m: any) => studentName(m)).join('، ')
          return { success: false, reply: `وجدت أكثر من نتيجة: ${names} — حدد الاسم بالضبط` }
        }
        const s = lookup.student
        const { data: group } = await supabase.from('groups').select('name, code').eq('id', s.group_id).single()
        const { data: subs } = await supabase
          .from('submissions')
          .select('status, grade, grade_numeric, is_late, submitted_at, assignments(title, type)')
          .eq('student_id', s.id).is('deleted_at', null)
          .order('submitted_at', { ascending: false }).limit(10)
        const { data: att } = await supabase
          .from('attendance')
          .select('status').eq('student_id', s.id).limit(30)
        const { data: payments } = await supabase
          .from('payments')
          .select('amount, status, paid_at').eq('student_id', s.id)
          .order('created_at', { ascending: false }).limit(3)
        const { data: skills } = await supabase
          .from('skill_snapshots')
          .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
          .eq('student_id', s.id).order('snapshot_date', { ascending: false }).limit(1).maybeSingle()

        const graded = (subs || []).filter((x: any) => x.grade_numeric != null)
        const avg = graded.length ? Math.round(graded.reduce((sum: number, x: any) => sum + x.grade_numeric, 0) / graded.length) : null
        const lateCount = (subs || []).filter((x: any) => x.is_late).length
        const present = (att || []).filter((a: any) => a.status === 'present').length
        const totalAtt = att?.length || 0
        const attRate = totalAtt > 0 ? Math.round((present / totalAtt) * 100) : null

        let info = `📋 ملف ${studentName(s)}:
• المستوى: ${s.academic_level} | الباقة: ${s.package} | المجموعة: ${group?.code || '—'}
• XP: ${s.xp_total} | السلسلة: ${s.current_streak} يوم | مستوى اللعب: ${s.gamification_level}
• الواجبات (آخر 10): ${subs?.length || 0} تسليم — ${lateCount} متأخر — المتوسط: ${avg != null ? avg + '%' : 'لا يوجد'}
• الحضور: ${attRate != null ? attRate + '%' : 'لا يوجد بيانات'} (${present}/${totalAtt})`

        if (skills) {
          info += `\n• المهارات: قرامر ${skills.grammar}% | مفردات ${skills.vocabulary}% | محادثة ${skills.speaking}% | استماع ${skills.listening}% | قراءة ${skills.reading}% | كتابة ${skills.writing}%`
        }
        if (payments?.length) {
          const lastPayment = payments[0]
          info += `\n• آخر دفعة: ${lastPayment.amount} ر.س — ${lastPayment.status === 'paid' ? 'مدفوع' : lastPayment.status}`
        }
        if (s.custom_price) info += `\n• سعر مخصص: ${s.custom_price} ر.س`

        return { success: true, reply: info, data: { student_id: s.id } }
      }

      case 'LIST_STUDENTS': {
        const filter = params.filter
        let query = supabase.from('students')
          .select('id, xp_total, current_streak, academic_level, package, group_id, profiles(full_name, display_name), groups(code)')
          .eq('status', 'active').is('deleted_at', null)

        if (role !== 'admin') query = query.in('group_id', trainerGroupIds)
        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (g) query = query.eq('group_id', g.id)
        }

        const { data: allStudents } = await query.order('xp_total', { ascending: false }).limit(50)
        if (!allStudents?.length) return { success: true, reply: 'لا يوجد طلاب مطابقين' }

        let result = allStudents
        let title = `قائمة الطلاب (${result.length})`

        if (filter === 'top_xp') {
          title = `أنشط الطلاب بالنقاط`
          result = result.slice(0, 10)
        } else if (filter === 'no_submissions') {
          // Get students with no submissions this week
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
          const { data: recentSubs } = await supabase
            .from('submissions').select('student_id').gte('submitted_at', weekAgo).is('deleted_at', null)
          const submittedIds = new Set((recentSubs || []).map((s: any) => s.student_id))
          result = result.filter((s: any) => !submittedIds.has(s.id))
          title = `طلاب لم يسلّموا واجبات هذا الأسبوع (${result.length})`
        } else if (filter === 'low_attendance') {
          const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString()
          const { data: attData } = await supabase
            .from('attendance').select('student_id, status').gte('created_at', monthAgo)
          const attMap: Record<string, { present: number; total: number }> = {}
          for (const a of attData || []) {
            if (!attMap[a.student_id]) attMap[a.student_id] = { present: 0, total: 0 }
            attMap[a.student_id].total++
            if (a.status === 'present') attMap[a.student_id].present++
          }
          result = result.filter((s: any) => {
            const att = attMap[s.id]
            return att && att.total > 0 && (att.present / att.total) < 0.7
          })
          title = `طلاب حضورهم أقل من 70% (${result.length})`
        }

        const lines = result.map((s: any) =>
          `• ${s.profiles?.display_name || s.profiles?.full_name} — ${s.groups?.code || '?'} — XP: ${s.xp_total} — سلسلة: ${s.current_streak}d`
        ).join('\n')

        return { success: true, reply: `${title}:\n${lines}` }
      }

      case 'GROUP_INFO': {
        const g = await findGroup(params.group_code, supabase)
        if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }

        const { data: students } = await supabase
          .from('students')
          .select('id, xp_total, current_streak, academic_level, profiles(full_name, display_name)')
          .eq('group_id', g.id).eq('status', 'active')

        const { data: subs } = await supabase
          .from('submissions')
          .select('student_id, status, grade_numeric, is_late')
          .eq('status', 'graded')
          .is('deleted_at', null)
          .in('student_id', (students || []).map((s: any) => s.id))
          .limit(100)

        const { data: pending } = await supabase
          .from('submissions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'submitted')
          .is('deleted_at', null)
          .in('student_id', (students || []).map((s: any) => s.id))

        const avgGrade = subs?.length ? Math.round(subs.reduce((s: number, x: any) => s + (x.grade_numeric || 0), 0) / subs.length) : null
        const avgXP = students?.length ? Math.round((students || []).reduce((s: number, x: any) => s + x.xp_total, 0) / students.length) : 0

        let info = `📊 مجموعة ${g.code} (${g.name}) — مستوى ${g.level}:
• عدد الطلاب: ${students?.length || 0}
• متوسط XP: ${avgXP}
• متوسط الدرجات: ${avgGrade != null ? avgGrade + '%' : 'لا يوجد'}
• واجبات معلقة: ${pending?.count || 0}

الطلاب:`
        for (const s of students || []) {
          info += `\n  • ${studentName(s.profiles)} — XP: ${s.xp_total} — سلسلة: ${s.current_streak}d`
        }

        return { success: true, reply: info }
      }

      case 'LIST_PENDING': {
        let query = supabase
          .from('submissions')
          .select('id, submitted_at, student_id, students(profiles(full_name, display_name), groups(code)), assignments(title, type)')
          .eq('status', 'submitted')
          .is('deleted_at', null)
          .order('submitted_at', { ascending: true })
          .limit(20)

        const { data: pending } = await query

        if (!pending?.length) return { success: true, reply: 'لا توجد واجبات معلقة للتقييم ✓' }

        let list = `📝 الواجبات المعلقة (${pending.length}):\n`
        for (const p of pending) {
          const name = p.students?.profiles?.display_name || p.students?.profiles?.full_name || '?'
          const group = p.students?.groups?.code || '?'
          const date = new Date(p.submitted_at).toLocaleDateString('ar-SA')
          list += `• ${name} (${group}) — ${p.assignments?.title || p.assignments?.type} — ${date}\n`
        }

        return { success: true, reply: list }
      }

      case 'PAYMENT_STATUS': {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        let query = supabase
          .from('students')
          .select('id, package, custom_price, profiles(full_name, display_name), groups(code)')
          .eq('status', 'active')

        if (params.filter === 'overdue' || !params.filter) {
          // Get students who haven't paid this month
          const { data: allStudents } = await query
          const { data: paidThisMonth } = await supabase
            .from('payments')
            .select('student_id')
            .eq('status', 'paid')
            .gte('paid_at', monthStart.toISOString())

          const paidIds = new Set((paidThisMonth || []).map((p: any) => p.student_id))
          const unpaid = (allStudents || []).filter((s: any) => !paidIds.has(s.id))

          if (!unpaid.length) return { success: true, reply: 'جميع الطلاب دفعوا هذا الشهر ✓' }

          let list = `💰 طلاب لم يدفعوا هذا الشهر (${unpaid.length}):\n`
          for (const s of unpaid) {
            list += `• ${studentName(s.profiles)} (${s.groups?.code || '?'}) — ${s.package} — ${s.custom_price ? s.custom_price + ' ر.س (مخصص)' : 'سعر عادي'}\n`
          }
          return { success: true, reply: list }
        }

        return { success: true, reply: 'استخدم: "مين ما دفع هالشهر؟"' }
      }

      case 'SYSTEM_STATUS': {
        if (role !== 'admin') return { success: false, reply: 'هذا الأمر متاح للمشرفين فقط' }

        const { count: totalStudents } = await supabase
          .from('students').select('id', { count: 'exact', head: true }).eq('status', 'active')
        const { count: totalGroups } = await supabase
          .from('groups').select('id', { count: 'exact', head: true })
        const { count: pendingSubs } = await supabase
          .from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'submitted').is('deleted_at', null)

        // AI budget this month
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)
        const { data: aiCosts } = await supabase
          .from('ai_usage').select('estimated_cost_sar').gte('created_at', monthStart.toISOString())
        const totalCost = (aiCosts || []).reduce((s: number, r: any) => s + (parseFloat(r.estimated_cost_sar) || 0), 0)

        return {
          success: true,
          reply: `⚙️ حالة النظام:
• طلاب نشطين: ${totalStudents || 0}
• مجموعات: ${totalGroups || 0}
• واجبات معلقة: ${pendingSubs || 0}
• تكلفة AI هذا الشهر: ${totalCost.toFixed(2)} ر.س`
        }
      }

      // ── XP Management ──
      case 'AWARD_XP':
      case 'DEDUCT_XP': {
        const amount = action === 'DEDUCT_XP' ? -Math.abs(params.amount) : Math.abs(params.amount)
        const reason = params.reason_code || 'custom'
        const description = params.description || params.reason || ''

        // Award to a group
        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }

          const { data: students } = await supabase
            .from('students').select('id').eq('group_id', g.id).eq('status', 'active')

          if (!students?.length) return { success: false, reply: 'لا يوجد طلاب في المجموعة' }

          const records = students.map((s: any) => ({
            student_id: s.id, amount, reason, description, awarded_by: userId,
          }))
          await supabase.from('xp_transactions').insert(records)

          // Update totals
          for (const s of students) {
            await supabase.rpc('update_student_xp', undefined) // Trigger handles it
            await supabase.from('students').update({ xp_total: supabase.rpc ? undefined : undefined }).eq('id', s.id)
          }

          // Actually just update xp_total directly
          for (const s of students) {
            const { data: st } = await supabase.from('students').select('xp_total').eq('id', s.id).single()
            await supabase.from('students').update({ xp_total: (st?.xp_total || 0) + amount }).eq('id', s.id)
          }

          return {
            success: true,
            reply: `${amount > 0 ? '✅' : '⚠️'} تم ${amount > 0 ? 'منح' : 'خصم'} ${Math.abs(amount)} نقطة ${amount > 0 ? 'لـ' : 'من'} جميع طلاب ${g.code} (${students.length} طالب) — ${description}`
          }
        }

        // Award to individual
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const s = lookup.student
        await supabase.from('xp_transactions').insert({
          student_id: s.id, amount, reason, description, awarded_by: userId,
        })
        await supabase.from('students').update({ xp_total: (s.xp_total || 0) + amount }).eq('id', s.id)

        // Log audit
        await supabase.from('audit_log').insert({
          actor_id: userId, action: amount > 0 ? 'award_xp' : 'deduct_xp',
          target_type: 'student', target_id: s.id,
          new_data: { amount, reason: description },
        })

        return {
          success: true,
          reply: `${amount > 0 ? '✅' : '⚠️'} تم ${amount > 0 ? 'منح' : 'خصم'} ${Math.abs(amount)} نقطة ${amount > 0 ? 'لـ' : 'من'} ${studentName(s)} — ${description}\nالرصيد الجديد: ${(s.xp_total || 0) + amount} XP`
        }
      }

      // ── Assignment Management ──
      case 'CREATE_ASSIGNMENT': {
        const g = await findGroup(params.group_code, supabase)
        if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }

        // Resolve trainer_id
        let trainerId = g.trainer_id
        if (role === 'admin' && !trainerId) {
          // For admin, try to find any trainer for this group
          const { data: trainerRecord } = await supabase
            .from('trainers').select('id').limit(1).single()
          trainerId = trainerRecord?.id || null
        }

        const deadline = params.deadline ? new Date(params.deadline).toISOString() : null

        const { data: assignment, error } = await supabase.from('assignments').insert({
          trainer_id: trainerId,
          group_id: g.id,
          title: params.title || `واجب ${params.type}`,
          description: params.description || null,
          instructions: params.instructions || null,
          type: params.type || 'custom',
          deadline,
          points_on_time: params.points_on_time || 10,
          points_late: params.points_late || 5,
        }).select('id, title').single()

        if (error) return { success: false, reply: `خطأ في إنشاء الواجب: ${error.message}` }

        // Notify students
        const { data: groupStudents } = await supabase
          .from('students').select('id').eq('group_id', g.id).eq('status', 'active')

        if (groupStudents?.length) {
          const notifications = groupStudents.map((s: any) => ({
            user_id: s.id,
            type: 'assignment_new',
            title: 'واجب جديد',
            body: `${assignment.title}${deadline ? ' — الموعد: ' + new Date(deadline).toLocaleDateString('ar-SA') : ''}`,
            data: { assignment_id: assignment.id },
          }))
          await supabase.from('notifications').insert(notifications)
        }

        await supabase.from('audit_log').insert({
          actor_id: userId, action: 'create_assignment',
          target_type: 'assignment', target_id: assignment.id,
          new_data: { title: assignment.title, type: params.type, group: g.code },
        })

        return {
          success: true,
          reply: `✅ تم إنشاء واجب "${assignment.title}" لمجموعة ${g.code}${deadline ? '\nالموعد النهائي: ' + new Date(deadline).toLocaleDateString('ar-SA') : ''}\nتم إشعار ${groupStudents?.length || 0} طالب`,
          data: { assignment_id: assignment.id },
        }
      }

      case 'DELETE_ASSIGNMENT': {
        // This requires confirmation — handled by the caller
        if (params.assignment_id) {
          await supabase.from('assignments').update({ deleted_at: new Date().toISOString() }).eq('id', params.assignment_id)
          await supabase.from('audit_log').insert({
            actor_id: userId, action: 'delete_assignment',
            target_type: 'assignment', target_id: params.assignment_id,
          })
          return { success: true, reply: '✅ تم حذف الواجب' }
        }
        return { success: false, reply: 'حدد معرّف الواجب للحذف' }
      }

      // ── Grading ──
      case 'GRADE_SUBMISSION': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const student = lookup.student
        // Find the most recent ungraded submission
        let subQuery = supabase
          .from('submissions')
          .select('id, assignments(title, type, points_on_time, points_late)')
          .eq('student_id', student.id)
          .eq('status', 'submitted')
          .is('deleted_at', null)
          .order('submitted_at', { ascending: false })
          .limit(1)

        const { data: subs } = await subQuery
        if (!subs?.length) return { success: false, reply: `لا يوجد واجب معلق لـ ${studentName(student)}` }

        const sub = subs[0]
        const gradeInfo = GRADE_MAP[params.grade?.toUpperCase()] || GRADE_MAP['B']

        await supabase.from('submissions').update({
          status: 'graded',
          grade: gradeInfo.grade,
          grade_numeric: gradeInfo.numeric,
          trainer_feedback: params.feedback || null,
          graded_at: new Date().toISOString(),
          graded_by: userId,
          points_awarded: sub.assignments?.points_on_time || 10,
        }).eq('id', sub.id)

        // Notify student
        await supabase.from('notifications').insert({
          user_id: student.id,
          type: 'assignment_graded',
          title: 'تم تقييم واجبك',
          body: `${sub.assignments?.title}: ${gradeInfo.grade} (${gradeInfo.numeric}%)${params.feedback ? ' — ' + params.feedback : ''}`,
          data: { submission_id: sub.id },
        })

        // Award XP
        await supabase.from('xp_transactions').insert({
          student_id: student.id,
          amount: sub.assignments?.points_on_time || 10,
          reason: 'assignment_on_time',
          description: sub.assignments?.title,
          awarded_by: userId,
        })
        await supabase.from('students').update({
          xp_total: (student.xp_total || 0) + (sub.assignments?.points_on_time || 10)
        }).eq('id', student.id)

        return {
          success: true,
          reply: `✅ تم تقييم واجب "${sub.assignments?.title}" لـ ${studentName(student)}: ${gradeInfo.grade} (${gradeInfo.numeric}%)${params.feedback ? '\nملاحظة: ' + params.feedback : ''}`
        }
      }

      case 'AI_GRADE_ALL': {
        // Get pending submissions
        let query = supabase
          .from('submissions')
          .select('id, content_text, content_voice_url, student_id, assignments(title, type, group_id), students(academic_level, profiles(full_name))')
          .eq('status', 'submitted')
          .is('deleted_at', null)
          .order('submitted_at', { ascending: true })
          .limit(5) // Process max 5 at a time

        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (g) {
            const { data: groupStudents } = await supabase
              .from('students').select('id').eq('group_id', g.id)
            if (groupStudents?.length) {
              query = query.in('student_id', groupStudents.map((s: any) => s.id))
            }
          }
        }

        const { data: pending } = await query
        if (!pending?.length) return { success: true, reply: 'لا توجد واجبات معلقة للتقييم ✓' }

        let graded = 0
        const results: string[] = []

        for (const sub of pending) {
          if (!sub.content_text && !sub.content_voice_url) {
            results.push(`⏭️ ${sub.students?.profiles?.full_name}: لا يوجد محتوى`)
            continue
          }

          try {
            const text = sub.content_text || '[محتوى صوتي — يحتاج مراجعة يدوية]'
            const level = sub.students?.academic_level || 1

            // Quick Claude grading
            const gradeRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 300,
                system: `Grade this English assignment (student level ${level}/5). Return JSON: {"score": 1-10, "grade": "A+/A/B+/B/C/D/F", "numeric": 45-97, "feedback": "brief Arabic feedback"}`,
                messages: [{ role: 'user', content: `Assignment: ${sub.assignments?.title}\nType: ${sub.assignments?.type}\nContent: ${text.substring(0, 500)}` }],
              }),
            })

            if (!gradeRes.ok) throw new Error('Claude API error')

            const gradeData = await gradeRes.json()
            let result = JSON.parse(
              (gradeData.content?.[0]?.text || '{}')
                .replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
            )

            await supabase.from('submissions').update({
              status: 'graded',
              grade: result.grade || 'B',
              grade_numeric: result.numeric || 82,
              trainer_feedback: result.feedback || 'تم التقييم بالذكاء الاصطناعي',
              ai_feedback: result,
              graded_at: new Date().toISOString(),
              graded_by: userId,
              points_awarded: sub.assignments?.points_on_time || 10,
            }).eq('id', sub.id)

            // Notify
            await supabase.from('notifications').insert({
              user_id: sub.student_id,
              type: 'assignment_graded',
              title: 'تم تقييم واجبك',
              body: `${sub.assignments?.title}: ${result.grade} (${result.numeric}%)`,
            })

            // Award XP
            await supabase.from('xp_transactions').insert({
              student_id: sub.student_id, amount: sub.assignments?.points_on_time || 10,
              reason: 'assignment_on_time', awarded_by: userId,
            })

            results.push(`✅ ${sub.students?.profiles?.full_name}: ${result.grade} (${result.numeric}%)`)
            graded++

            // Log AI usage
            const inputTokens = gradeData.usage?.input_tokens || 0
            const outputTokens = gradeData.usage?.output_tokens || 0
            const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
            await supabase.from('ai_usage').insert({
              type: 'ai_batch_grade', model: 'claude-sonnet',
              student_id: sub.student_id,
              input_tokens: inputTokens, output_tokens: outputTokens,
              estimated_cost_sar: costSAR.toFixed(4),
            })

          } catch (err) {
            results.push(`❌ ${sub.students?.profiles?.full_name}: خطأ في التقييم`)
          }
        }

        return {
          success: true,
          reply: `🤖 تم تقييم ${graded}/${pending.length} واجب بالذكاء الاصطناعي:\n${results.join('\n')}`
        }
      }

      // ── Communication ──
      case 'SEND_NOTE': {
        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }

          const { data: students } = await supabase
            .from('students').select('id').eq('group_id', g.id).eq('status', 'active')

          if (!students?.length) return { success: false, reply: 'لا يوجد طلاب في المجموعة' }

          const notifications = students.map((s: any) => ({
            user_id: s.id, type: 'trainer_note' as const,
            title: 'ملاحظة من المدرب', body: params.message,
          }))
          await supabase.from('notifications').insert(notifications)

          return { success: true, reply: `✅ تم إرسال الملاحظة لـ ${students.length} طالب في ${g.code}` }
        }

        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        await supabase.from('notifications').insert({
          user_id: lookup.student.id, type: 'trainer_note',
          title: 'ملاحظة من المدرب', body: params.message,
        })

        return { success: true, reply: `✅ تم إرسال الملاحظة لـ ${studentName(lookup.student)}` }
      }

      case 'ANNOUNCE_ALL': {
        let query = supabase.from('students').select('id').eq('status', 'active')
        if (role !== 'admin') query = query.in('group_id', trainerGroupIds)
        const { data: students } = await query

        if (!students?.length) return { success: false, reply: 'لا يوجد طلاب' }

        const notifications = students.map((s: any) => ({
          user_id: s.id, type: 'system' as const,
          title: 'إعلان', body: params.message,
        }))
        await supabase.from('notifications').insert(notifications)

        return { success: true, reply: `📢 تم إرسال الإعلان لـ ${students.length} طالب` }
      }

      case 'REMIND': {
        // Remind students who haven't submitted a specific assignment or recent assignments
        const { data: pending } = await supabase
          .from('submissions')
          .select('student_id, students(profiles(full_name, display_name))')
          .eq('status', 'submitted')
          .is('deleted_at', null)

        // Actually, remind students who have NOT submitted
        // Get recent assignments
        let assignQuery = supabase
          .from('assignments')
          .select('id, title, group_id')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
        const { data: recentAssigns } = await assignQuery

        if (!recentAssigns?.length) return { success: true, reply: 'لا توجد واجبات حديثة' }

        const assignment = recentAssigns[0]
        const { data: groupStudents } = await supabase
          .from('students').select('id').eq('group_id', assignment.group_id).eq('status', 'active')

        const { data: submitted } = await supabase
          .from('submissions').select('student_id').eq('assignment_id', assignment.id).is('deleted_at', null)

        const submittedIds = new Set((submitted || []).map((s: any) => s.student_id))
        const notSubmitted = (groupStudents || []).filter((s: any) => !submittedIds.has(s.id))

        if (!notSubmitted.length) return { success: true, reply: 'جميع الطلاب سلّموا الواجب ✓' }

        const notifications = notSubmitted.map((s: any) => ({
          user_id: s.id, type: 'assignment_deadline' as const,
          title: 'تذكير بالواجب',
          body: `لم تسلّم واجب "${assignment.title}" بعد — سلّمه الآن!`,
          data: { assignment_id: assignment.id },
        }))
        await supabase.from('notifications').insert(notifications)

        return { success: true, reply: `✅ تم إرسال تذكير لـ ${notSubmitted.length} طالب لم يسلّموا "${assignment.title}"` }
      }

      // ── Student Management ──
      case 'PROMOTE_STUDENT': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const s = lookup.student
        const newLevel = params.new_level || (s.academic_level || 1) + 1
        if (newLevel > 5) return { success: false, reply: `${studentName(s)} بالفعل في أعلى مستوى` }

        await supabase.from('students').update({ academic_level: newLevel }).eq('id', s.id)
        await supabase.from('notifications').insert({
          user_id: s.id, type: 'level_up',
          title: 'ترقية! 🎉', body: `تم ترقيتك للمستوى ${newLevel} — مبروك!`,
        })
        await supabase.from('audit_log').insert({
          actor_id: userId, action: 'promote_student',
          target_type: 'student', target_id: s.id,
          old_data: { level: s.academic_level }, new_data: { level: newLevel },
        })

        return { success: true, reply: `🎉 تم ترقية ${studentName(s)} من المستوى ${s.academic_level} إلى ${newLevel}` }
      }

      case 'EDIT_STUDENT': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const s = lookup.student
        const allowedFields: Record<string, string> = {
          'package': 'package', 'باقة': 'package',
          'custom_price': 'custom_price', 'سعر': 'custom_price', 'price': 'custom_price',
          'level': 'academic_level', 'مستوى': 'academic_level',
        }
        const field = allowedFields[params.field]
        if (!field) return { success: false, reply: `لا يمكن تعديل "${params.field}" — الحقول المتاحة: باقة، سعر، مستوى` }

        const oldValue = s[field]
        await supabase.from('students').update({ [field]: params.value }).eq('id', s.id)

        await supabase.from('audit_log').insert({
          actor_id: userId, action: 'edit_student',
          target_type: 'student', target_id: s.id,
          old_data: { [field]: oldValue }, new_data: { [field]: params.value },
        })

        return { success: true, reply: `✅ تم تعديل ${field} لـ ${studentName(s)}: ${oldValue} → ${params.value}` }
      }

      case 'PAUSE_STUDENT': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const s = lookup.student
        await supabase.from('students').update({ status: 'paused' }).eq('id', s.id)
        await supabase.from('audit_log').insert({
          actor_id: userId, action: 'pause_student',
          target_type: 'student', target_id: s.id,
        })

        return { success: true, reply: `⏸️ تم إيقاف اشتراك ${studentName(s)} مؤقتاً` }
      }

      case 'MOVE_STUDENT': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const g = await findGroup(params.new_group_code, supabase)
        if (!g) return { success: false, reply: `لم أجد مجموعة "${params.new_group_code}"` }

        const s = lookup.student
        await supabase.from('students').update({ group_id: g.id }).eq('id', s.id)
        await supabase.from('audit_log').insert({
          actor_id: userId, action: 'move_student',
          target_type: 'student', target_id: s.id,
          old_data: { group_id: s.group_id }, new_data: { group_id: g.id, group_code: g.code },
        })

        return { success: true, reply: `✅ تم نقل ${studentName(s)} إلى مجموعة ${g.code}` }
      }

      case 'ADD_STUDENT': {
        if (role !== 'admin') return { success: false, reply: 'إضافة طلاب متاحة للمشرفين فقط' }

        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: params.email,
          password: params.password || 'Fluentia2024!',
          email_confirm: true,
          user_metadata: { full_name: params.full_name },
        })

        if (authError) return { success: false, reply: `خطأ في إنشاء الحساب: ${authError.message}` }

        const newUserId = authData.user.id

        // Profile is auto-created by trigger, just update it
        await supabase.from('profiles').update({
          full_name: params.full_name,
          display_name: params.display_name || params.full_name,
          role: 'student',
        }).eq('id', newUserId)

        // Create student record
        let groupId = null
        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (g) groupId = g.id
        }

        const packageMap: Record<string, string> = {
          'أساس': 'asas', 'طلاقة': 'talaqa', 'تميّز': 'tamayuz', 'تميز': 'tamayuz', 'آيلتس': 'ielts',
          'asas': 'asas', 'talaqa': 'talaqa', 'tamayuz': 'tamayuz', 'ielts': 'ielts',
        }

        await supabase.from('students').insert({
          id: newUserId,
          academic_level: params.level || 1,
          package: packageMap[params.package] || 'asas',
          group_id: groupId,
          status: 'active',
          xp_total: 0,
          current_streak: 0,
          longest_streak: 0,
          gamification_level: 1,
        })

        await supabase.from('audit_log').insert({
          actor_id: userId, action: 'add_student',
          target_type: 'student', target_id: newUserId,
          new_data: { name: params.full_name, email: params.email, package: params.package },
        })

        return {
          success: true,
          reply: `✅ تم إنشاء حساب ${params.full_name}:\n• الإيميل: ${params.email}\n• كلمة المرور: ${params.password || 'Fluentia2024!'}\n• الباقة: ${params.package}\n• المستوى: ${params.level || 1}${groupId ? `\n• المجموعة: ${params.group_code}` : ''}`
        }
      }

      // ── Attendance ──
      case 'RECORD_ATTENDANCE': {
        const g = await findGroup(params.group_code, supabase)
        if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }

        const { data: students } = await supabase
          .from('students')
          .select('id, xp_total, profiles(full_name, display_name)')
          .eq('group_id', g.id).eq('status', 'active')

        if (!students?.length) return { success: false, reply: 'لا يوجد طلاب في المجموعة' }

        // Find or create class for today
        const today = params.date || new Date().toISOString().split('T')[0]
        let { data: classRecord } = await supabase
          .from('classes')
          .select('id')
          .eq('group_id', g.id)
          .eq('date', today)
          .limit(1)
          .maybeSingle()

        if (!classRecord) {
          const { data: newClass } = await supabase.from('classes').insert({
            group_id: g.id,
            trainer_id: g.trainer_id,
            title: `حصة ${g.code}`,
            date: today,
            start_time: '20:00',
            status: 'completed',
          }).select('id').single()
          classRecord = newClass
        }

        const absentNames = (params.absent_names || []).map((n: string) => n.toLowerCase())
        const excusedNames = (params.excused_names || []).map((n: string) => n.toLowerCase())

        const records = []
        let presentCount = 0

        for (const s of students) {
          const name = (s.profiles?.display_name || s.profiles?.full_name || '').toLowerCase()
          let status = 'present'
          if (absentNames.some((n: string) => name.includes(n))) status = 'absent'
          else if (excusedNames.some((n: string) => name.includes(n))) status = 'excused'

          if (status === 'present') presentCount++

          records.push({
            class_id: classRecord.id,
            student_id: s.id,
            status,
            xp_awarded: status === 'present' ? 5 : 0,
          })

          // Award attendance XP
          if (status === 'present') {
            await supabase.from('xp_transactions').insert({
              student_id: s.id, amount: 5, reason: 'class_attendance',
              description: `حضور حصة ${g.code}`, awarded_by: userId,
            })
            await supabase.from('students').update({
              xp_total: (s.xp_total || 0) + 5
            }).eq('id', s.id)
          }
        }

        await supabase.from('attendance').insert(records)

        return {
          success: true,
          reply: `✅ تم تسجيل حضور ${g.code}:\n• حاضر: ${presentCount}\n• غائب: ${absentNames.length}\n• معذور: ${excusedNames.length}`
        }
      }

      // ── Classes ──
      case 'CREATE_CLASS': {
        const g = await findGroup(params.group_code, supabase)
        if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }

        const { data: cls, error } = await supabase.from('classes').insert({
          group_id: g.id,
          trainer_id: g.trainer_id,
          title: params.title || `حصة ${g.code}`,
          topic: params.topic || null,
          date: params.date,
          start_time: params.start_time || '20:00',
          end_time: params.end_time || '21:00',
          status: 'scheduled',
        }).select('id').single()

        if (error) return { success: false, reply: `خطأ: ${error.message}` }

        return { success: true, reply: `✅ تم إنشاء حصة "${params.title || g.code}" يوم ${params.date} الساعة ${params.start_time || '20:00'}` }
      }

      // ── Groups ──
      case 'CREATE_GROUP': {
        if (role !== 'admin') return { success: false, reply: 'إنشاء مجموعات متاح للمشرفين فقط' }

        const { data: group, error } = await supabase.from('groups').insert({
          name: params.name,
          code: params.code,
          level: params.level || 1,
          trainer_id: params.trainer_id || null,
        }).select('id, code').single()

        if (error) return { success: false, reply: `خطأ: ${error.message}` }

        return { success: true, reply: `✅ تم إنشاء مجموعة ${group.code}` }
      }

      // ── Payments ──
      case 'RECORD_PAYMENT': {
        if (role !== 'admin') return { success: false, reply: 'تسجيل المدفوعات متاح للمشرفين فقط' }

        const lookup = await findStudent(params.student_name, supabase)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const s = lookup.student
        const now = new Date()
        const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        await supabase.from('payments').insert({
          student_id: s.id,
          amount: params.amount,
          status: 'paid',
          method: params.method || 'bank_transfer',
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          paid_at: now.toISOString(),
          recorded_by: userId,
        })

        return { success: true, reply: `✅ تم تسجيل دفعة ${params.amount} ر.س من ${studentName(s)}` }
      }

      // ── Analysis (requires second Claude call) ──
      case 'WEAKNESS_ANALYSIS': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        const s = lookup.student
        // Load comprehensive data
        const [{ data: subs }, { data: skills }, { data: att }] = await Promise.all([
          supabase.from('submissions')
            .select('grade_numeric, is_late, assignments(type, title)')
            .eq('student_id', s.id).eq('status', 'graded').is('deleted_at', null)
            .order('submitted_at', { ascending: false }).limit(20),
          supabase.from('skill_snapshots')
            .select('grammar, vocabulary, speaking, listening, reading, writing, snapshot_date')
            .eq('student_id', s.id).order('snapshot_date', { ascending: false }).limit(2),
          supabase.from('attendance')
            .select('status').eq('student_id', s.id).limit(20),
        ])

        const gradesByType: Record<string, number[]> = {}
        for (const sub of subs || []) {
          const type = sub.assignments?.type || 'unknown'
          if (!gradesByType[type]) gradesByType[type] = []
          gradesByType[type].push(sub.grade_numeric || 0)
        }

        const typeAvgs = Object.entries(gradesByType).map(([type, grades]) => ({
          type, avg: Math.round(grades.reduce((a, b) => a + b, 0) / grades.length), count: grades.length,
        }))

        const presentCount = (att || []).filter((a: any) => a.status === 'present').length
        const attRate = att?.length ? Math.round((presentCount / att.length) * 100) : null

        const dataSummary = `Student: ${studentName(s)}, Level: ${s.academic_level}, XP: ${s.xp_total}, Streak: ${s.current_streak}
Grades by type: ${typeAvgs.map(t => `${t.type}: avg ${t.avg}% (${t.count} assignments)`).join(', ')}
Skills: ${skills?.[0] ? `Grammar: ${skills[0].grammar}%, Vocab: ${skills[0].vocabulary}%, Speaking: ${skills[0].speaking}%, Listening: ${skills[0].listening}%, Reading: ${skills[0].reading}%, Writing: ${skills[0].writing}%` : 'No skill data'}
${skills?.[1] ? `Previous skills: Grammar: ${skills[1].grammar}%, Vocab: ${skills[1].vocabulary}%, Speaking: ${skills[1].speaking}%` : ''}
Attendance: ${attRate != null ? attRate + '%' : 'N/A'}
Late submissions: ${(subs || []).filter((s: any) => s.is_late).length}/${subs?.length || 0}`

        // Second Claude call for analysis
        const analysisRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 600,
            system: `You are analyzing an English student's performance data. Write a concise Arabic analysis with:
1. Top 3 strengths (نقاط القوة)
2. Top 3 weaknesses (نقاط الضعف)
3. Specific recommendations (توصيات)
Be practical and specific. Use data to support your points.`,
            messages: [{ role: 'user', content: dataSummary }],
          }),
        })

        if (!analysisRes.ok) return { success: false, reply: 'خطأ في التحليل — حاول مرة أخرى' }

        const analysisData = await analysisRes.json()
        const analysis = analysisData.content?.[0]?.text || 'لا يوجد تحليل'

        // Log usage
        const inputTokens = analysisData.usage?.input_tokens || 0
        const outputTokens = analysisData.usage?.output_tokens || 0
        const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
        await supabase.from('ai_usage').insert({
          type: 'weakness_analysis', model: 'claude-sonnet',
          student_id: s.id,
          input_tokens: inputTokens, output_tokens: outputTokens,
          estimated_cost_sar: costSAR.toFixed(4),
        })

        return { success: true, reply: `📊 تحليل أداء ${studentName(s)}:\n\n${analysis}` }
      }

      case 'STUDENT_REPORT': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) {
          return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }
        }

        // Call the generate-report edge function internally
        try {
          const reportRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-report`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ student_id: lookup.student.id, period_days: params.period_days || 30 }),
          })
          const reportData = await reportRes.json()
          if (reportData.report) {
            const r = reportData.report
            let reply = `📋 تقرير ${r.student_name} (${r.period_days} يوم):\n\n`
            reply += `${r.overview || ''}\n\n`
            if (r.strengths?.length) reply += `نقاط القوة:\n${r.strengths.map((s: string) => `• ${s}`).join('\n')}\n\n`
            if (r.weaknesses?.length) reply += `نقاط الضعف:\n${r.weaknesses.map((w: string) => `• ${w}`).join('\n')}\n\n`
            if (r.recommendations?.length) reply += `التوصيات:\n${r.recommendations.map((rec: string) => `• ${rec}`).join('\n')}\n\n`
            reply += `التقييم: ${r.progress_rating || '—'} | التفاعل: ${r.engagement_score || '—'}/10`
            if (r.stats) {
              reply += `\n\nالإحصائيات: واجبات: ${r.stats.total_submissions} | متوسط: ${r.stats.avg_grade || '—'}% | حضور: ${r.stats.attendance_rate || '—'}% | XP: ${r.stats.xp_earned}`
            }
            return { success: true, reply }
          }
          return { success: false, reply: reportData.error || 'خطأ في إنشاء التقرير' }
        } catch {
          return { success: false, reply: 'خطأ في إنشاء التقرير — حاول مرة أخرى' }
        }
      }

      // ── Error Patterns & Exercises ──
      case 'VIEW_ERROR_PATTERNS': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }

        const { data: patterns } = await supabase
          .from('error_patterns')
          .select('*')
          .eq('student_id', lookup.student.id)
          .eq('status', 'active')
          .order('frequency', { ascending: false })
          .limit(10)

        if (!patterns?.length) return { success: true, reply: `لا توجد أنماط أخطاء نشطة لـ ${studentName(lookup.student)}` }

        let reply = `🔍 أنماط أخطاء ${studentName(lookup.student)} (${patterns.length}):\n`
        for (const p of patterns) {
          reply += `• [${p.skill}] ${p.pattern_name_ar || p.pattern_name}: تكرار ${p.frequency}x — ${p.severity}\n`
          if (p.example) reply += `  مثال: ${p.example}\n`
        }
        return { success: true, reply }
      }

      case 'GENERATE_EXERCISES': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }

        try {
          const genRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-targeted-exercises`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ student_id: lookup.student.id }),
          })
          const genData = await genRes.json()
          if (genData.error) return { success: false, reply: `خطأ: ${genData.error}` }
          return { success: true, reply: `✅ تم إنشاء ${genData.exercises?.length || 0} تمرين مخصص لـ ${studentName(lookup.student)} بناءً على أنماط أخطائه` }
        } catch {
          return { success: false, reply: 'خطأ في إنشاء التمارين — حاول مرة أخرى' }
        }
      }

      case 'LIST_WEAK_STUDENTS': {
        const skill = params.skill || 'grammar'
        let query = supabase
          .from('error_patterns')
          .select('student_id, skill, frequency, students:student_id(profiles(full_name, display_name), group_id)')
          .eq('status', 'active')
          .eq('skill', skill)
          .order('frequency', { ascending: false })
          .limit(20)

        const { data: patterns } = await query
        if (!patterns?.length) return { success: true, reply: `لا توجد أنماط أخطاء في مهارة ${skill}` }

        // Aggregate by student
        const studentMap: Record<string, { name: string; count: number; totalFreq: number }> = {}
        for (const p of patterns) {
          const sid = p.student_id
          const name = (p as any).students?.profiles?.display_name || (p as any).students?.profiles?.full_name || '?'
          if (!studentMap[sid]) studentMap[sid] = { name, count: 0, totalFreq: 0 }
          studentMap[sid].count++
          studentMap[sid].totalFreq += p.frequency
        }

        const sorted = Object.entries(studentMap).sort((a, b) => b[1].totalFreq - a[1].totalFreq).slice(0, 10)
        let reply = `📉 أضعف الطلاب في ${skill} (${sorted.length}):\n`
        for (const [, info] of sorted) {
          reply += `• ${info.name}: ${info.count} نمط خطأ — تكرار إجمالي ${info.totalFreq}\n`
        }
        return { success: true, reply }
      }

      // ── Churn Prediction ──
      case 'VIEW_CHURN_RISK': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }

        const { data: prediction } = await supabase
          .from('churn_predictions')
          .select('*')
          .eq('student_id', lookup.student.id)
          .order('predicted_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!prediction) return { success: true, reply: `لا يوجد تقييم مخاطر لـ ${studentName(lookup.student)} — شغّل التحليل أولاً` }

        const riskEmoji = prediction.risk_level === 'high' ? '🔴' : prediction.risk_level === 'medium' ? '🟡' : '🟢'
        let reply = `${riskEmoji} تحليل مخاطر الانسحاب لـ ${studentName(lookup.student)}:
• مستوى الخطر: ${prediction.risk_level} (${prediction.risk_score}%)
• العوامل: ${(prediction.factors || []).join('، ')}
• التوصية: ${prediction.recommendation || 'لا يوجد'}`
        if (prediction.reviewed_at) reply += `\n• تمت المراجعة: ${new Date(prediction.reviewed_at).toLocaleDateString('ar-SA')}`
        return { success: true, reply }
      }

      case 'LIST_HIGH_RISK': {
        const { data: predictions } = await supabase
          .from('churn_predictions')
          .select('student_id, risk_level, risk_score, factors, students:student_id(profiles(full_name, display_name), group_id, groups:group_id(code))')
          .in('risk_level', ['high', 'medium'])
          .order('risk_score', { ascending: false })
          .limit(20)

        if (!predictions?.length) return { success: true, reply: 'لا يوجد طلاب بمخاطر انسحاب عالية ✓' }

        let reply = `⚠️ طلاب بمخاطر انسحاب (${predictions.length}):\n`
        for (const p of predictions) {
          const name = (p as any).students?.profiles?.display_name || (p as any).students?.profiles?.full_name || '?'
          const group = (p as any).students?.groups?.code || '?'
          const emoji = p.risk_level === 'high' ? '🔴' : '🟡'
          reply += `${emoji} ${name} (${group}) — ${p.risk_score}% — ${(p.factors || []).slice(0, 2).join('، ')}\n`
        }
        return { success: true, reply }
      }

      case 'RUN_CHURN_ANALYSIS': {
        if (role !== 'admin') return { success: false, reply: 'تحليل الانسحاب متاح للمشرفين فقط' }

        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/predict-churn`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          })
          const data = await res.json()
          if (data.error) return { success: false, reply: `خطأ: ${data.error}` }
          return { success: true, reply: `✅ تم تشغيل تحليل الانسحاب — تم تحليل ${data.analyzed || 0} طالب\nعالي الخطر: ${data.high_risk || 0} | متوسط: ${data.medium_risk || 0} | منخفض: ${data.low_risk || 0}` }
        } catch {
          return { success: false, reply: 'خطأ في تشغيل التحليل' }
        }
      }

      // ── Parent Dashboard ──
      case 'CREATE_PARENT_LINK': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }

        // Check if link already exists
        const { data: existing } = await supabase
          .from('parent_links')
          .select('access_code')
          .eq('student_id', lookup.student.id)
          .eq('is_active', true)
          .maybeSingle()

        if (existing) {
          return { success: true, reply: `رابط ولي أمر ${studentName(lookup.student)} موجود بالفعل:\nكود الدخول: ${existing.access_code}\nالرابط: /parent` }
        }

        // Generate 6-digit code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase()
        await supabase.from('parent_links').insert({
          student_id: lookup.student.id,
          parent_name: params.parent_name || 'ولي الأمر',
          access_code: code,
          is_active: true,
        })

        return { success: true, reply: `✅ تم إنشاء رابط ولي أمر ${studentName(lookup.student)}:\nكود الدخول: ${code}\nالرابط: /parent\nيمكن لولي الأمر استخدام الكود للاطلاع على تقدم الطالب` }
      }

      // ── Voice Journal ──
      case 'VIEW_JOURNAL_STATS': {
        const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
        if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
        if (lookup.ambiguous) return { success: false, reply: `وجدت أكثر من نتيجة: ${lookup.matches.map((m: any) => studentName(m)).join('، ')}` }

        const { data: journals } = await supabase
          .from('voice_journals')
          .select('id, duration_seconds, fluency_score, word_count, created_at')
          .eq('student_id', lookup.student.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (!journals?.length) return { success: true, reply: `لا توجد تسجيلات صوتية لـ ${studentName(lookup.student)}` }

        const totalDuration = journals.reduce((s, j) => s + (j.duration_seconds || 0), 0)
        const avgFluency = Math.round(journals.reduce((s, j) => s + (j.fluency_score || 0), 0) / journals.length)
        const avgWords = Math.round(journals.reduce((s, j) => s + (j.word_count || 0), 0) / journals.length)

        return {
          success: true,
          reply: `🎙️ إحصائيات اليوميات الصوتية لـ ${studentName(lookup.student)}:
• عدد التسجيلات: ${journals.length}
• إجمالي المدة: ${Math.round(totalDuration / 60)} دقيقة
• متوسط الطلاقة: ${avgFluency}/10
• متوسط الكلمات: ${avgWords} كلمة/تسجيل
• آخر تسجيل: ${new Date(journals[0].created_at).toLocaleDateString('ar-SA')}`
        }
      }

      // ── Lesson Planner ──
      case 'GENERATE_LESSON_PLAN': {
        const g = params.group_code ? await findGroup(params.group_code, supabase) : null

        try {
          const planRes = await fetch(`${SUPABASE_URL}/functions/v1/ai-lesson-planner`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              group_id: g?.id || params.group_id || null,
              topic: params.topic || null,
              skill_focus: params.skill_focus || null,
              duration_minutes: params.duration || 60,
              level: g?.level || params.level || 2,
            }),
          })
          const planData = await planRes.json()
          if (planData.error) return { success: false, reply: `خطأ: ${planData.error}` }

          const plan = planData.plan
          if (!plan) return { success: false, reply: 'لم يتم إنشاء خطة' }

          let reply = `📝 خطة درس${g ? ` لمجموعة ${g.code}` : ''}:\n`
          reply += `العنوان: ${plan.title || params.topic || 'درس'}\n`
          reply += `المدة: ${plan.duration || params.duration || 60} دقيقة\n\n`
          if (typeof plan === 'string') {
            reply += plan.substring(0, 800)
          } else {
            reply += JSON.stringify(plan, null, 2).substring(0, 800)
          }
          return { success: true, reply }
        } catch {
          return { success: false, reply: 'خطأ في إنشاء خطة الدرس' }
        }
      }

      // ── Events & Competitions ──
      case 'CREATE_EVENT': {
        const { data: event, error } = await supabase.from('seasonal_events').insert({
          title: params.title,
          description: params.description || null,
          type: params.type || 'challenge',
          start_date: params.start_date,
          end_date: params.end_date,
          reward_xp: params.reward_xp || 50,
          max_participants: params.max_participants || null,
          created_by: userId,
          is_active: true,
        }).select('id, title').single()

        if (error) return { success: false, reply: `خطأ: ${error.message}` }

        // Notify all active students
        const { data: allStudents } = await supabase
          .from('students').select('id').eq('status', 'active')
        if (allStudents?.length) {
          const notifications = allStudents.map((s: any) => ({
            user_id: s.id, type: 'event',
            title: '🎉 فعالية جديدة!',
            body: `${event.title} — سجّل الآن!`,
            data: { link: '/student/events' },
          }))
          await supabase.from('notifications').insert(notifications)
        }

        return { success: true, reply: `✅ تم إنشاء فعالية "${event.title}"\nمن ${params.start_date} إلى ${params.end_date}\nالمكافأة: ${params.reward_xp || 50} XP\nتم إشعار ${allStudents?.length || 0} طالب` }
      }

      case 'LIST_EVENTS': {
        const { data: events } = await supabase
          .from('seasonal_events')
          .select('id, title, type, start_date, end_date, reward_xp, is_active, event_participants(count)')
          .order('start_date', { ascending: false })
          .limit(10)

        if (!events?.length) return { success: true, reply: 'لا توجد فعاليات' }

        let reply = `📅 الفعاليات (${events.length}):\n`
        for (const e of events) {
          const status = e.is_active ? '🟢' : '⚪'
          const participants = (e as any).event_participants?.[0]?.count || 0
          reply += `${status} ${e.title} (${e.type}) — ${e.start_date} → ${e.end_date} — ${e.reward_xp} XP — ${participants} مشارك\n`
        }
        return { success: true, reply }
      }

      // ── Streak & Leaderboard ──
      case 'VIEW_LEADERBOARD': {
        const type = params.type || 'xp' // xp or streak
        let query = supabase
          .from('students')
          .select('id, xp_total, current_streak, profiles(full_name, display_name), groups(code)')
          .eq('status', 'active')
          .is('deleted_at', null)

        if (role !== 'admin') query = query.in('group_id', trainerGroupIds)
        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (g) query = query.eq('group_id', g.id)
        }

        const orderField = type === 'streak' ? 'current_streak' : 'xp_total'
        const { data: students } = await query.order(orderField, { ascending: false }).limit(15)

        if (!students?.length) return { success: true, reply: 'لا يوجد طلاب' }

        const emoji = type === 'streak' ? '🔥' : '⭐'
        let reply = `${emoji} ${type === 'streak' ? 'أطول سلاسل' : 'أعلى نقاط'}:\n`
        students.forEach((s: any, i: number) => {
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
          const value = type === 'streak' ? `${s.current_streak} يوم` : `${s.xp_total} XP`
          reply += `${medal} ${studentName(s.profiles)} (${s.groups?.code || '?'}) — ${value}\n`
        })
        return { success: true, reply }
      }

      // ── Scheduling ──
      case 'VIEW_SCHEDULE': {
        const startDate = params.date || new Date().toISOString().split('T')[0]
        const endDate = params.end_date || startDate

        let query = supabase
          .from('classes')
          .select('id, title, topic, date, start_time, end_time, status, groups(code, name)')
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date')
          .order('start_time')

        if (role !== 'admin') query = query.in('group_id', trainerGroupIds)

        const { data: classes } = await query.limit(30)

        if (!classes?.length) return { success: true, reply: `لا توجد حصص في ${startDate}${endDate !== startDate ? ` إلى ${endDate}` : ''}` }

        let reply = `📅 الجدول (${classes.length} حصة):\n`
        let currentDate = ''
        for (const c of classes) {
          if (c.date !== currentDate) {
            currentDate = c.date
            reply += `\n📆 ${c.date}:\n`
          }
          reply += `  • ${c.start_time}-${c.end_time} — ${(c as any).groups?.code || '?'}: ${c.title}${c.topic ? ` (${c.topic})` : ''} [${c.status}]\n`
        }
        return { success: true, reply }
      }

      // ── AI Usage Stats ──
      case 'AI_USAGE_STATS': {
        if (role !== 'admin') return { success: false, reply: 'إحصائيات AI متاحة للمشرفين فقط' }

        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const { data: usage } = await supabase
          .from('ai_usage')
          .select('type, estimated_cost_sar, input_tokens, output_tokens')
          .gte('created_at', monthStart.toISOString())

        if (!usage?.length) return { success: true, reply: 'لا يوجد استخدام AI هذا الشهر' }

        const byType: Record<string, { count: number; cost: number; tokens: number }> = {}
        let totalCost = 0
        let totalTokens = 0

        for (const u of usage) {
          if (!byType[u.type]) byType[u.type] = { count: 0, cost: 0, tokens: 0 }
          byType[u.type].count++
          const cost = parseFloat(u.estimated_cost_sar) || 0
          byType[u.type].cost += cost
          byType[u.type].tokens += (u.input_tokens || 0) + (u.output_tokens || 0)
          totalCost += cost
          totalTokens += (u.input_tokens || 0) + (u.output_tokens || 0)
        }

        let reply = `🤖 استخدام AI هذا الشهر:\n• التكلفة الإجمالية: ${totalCost.toFixed(2)} ر.س\n• إجمالي الطلبات: ${usage.length}\n• إجمالي التوكنز: ${totalTokens.toLocaleString()}\n\nبالنوع:\n`
        for (const [type, info] of Object.entries(byType).sort((a, b) => b[1].cost - a[1].cost)) {
          reply += `• ${type}: ${info.count} طلب — ${info.cost.toFixed(2)} ر.س\n`
        }
        return { success: true, reply }
      }

      // ── Challenges ──
      case 'CREATE_CHALLENGE': {
        const g = params.group_code ? await findGroup(params.group_code, supabase) : null

        const { data: challenge, error } = await supabase.from('challenges').insert({
          title: params.title,
          description: params.description || null,
          type: params.type || 'daily',
          group_id: g?.id || null,
          xp_reward: params.xp_reward || 20,
          deadline: params.deadline ? new Date(params.deadline).toISOString() : null,
          created_by: userId,
          is_active: true,
        }).select('id, title').single()

        if (error) return { success: false, reply: `خطأ: ${error.message}` }

        // Notify relevant students
        let studentQuery = supabase.from('students').select('id').eq('status', 'active')
        if (g) studentQuery = studentQuery.eq('group_id', g.id)
        const { data: targetStudents } = await studentQuery

        if (targetStudents?.length) {
          await supabase.from('notifications').insert(targetStudents.map((s: any) => ({
            user_id: s.id, type: 'challenge',
            title: '🏆 تحدي جديد!',
            body: `${challenge.title} — ${params.xp_reward || 20} XP`,
            data: { link: '/student/challenges' },
          })))
        }

        return { success: true, reply: `✅ تم إنشاء تحدي "${challenge.title}"${g ? ` لمجموعة ${g.code}` : ' لجميع الطلاب'}\nالمكافأة: ${params.xp_reward || 20} XP\nتم إشعار ${targetStudents?.length || 0} طالب` }
      }

      // ── Notifications ──
      case 'SEND_PUSH': {
        let targetIds: string[] = []

        if (params.group_code) {
          const g = await findGroup(params.group_code, supabase)
          if (!g) return { success: false, reply: `لم أجد مجموعة "${params.group_code}"` }
          const { data: students } = await supabase.from('students').select('id').eq('group_id', g.id).eq('status', 'active')
          targetIds = (students || []).map((s: any) => s.id)
        } else if (params.student_name) {
          const lookup = await findStudent(params.student_name, supabase, role !== 'admin' ? trainerGroupIds : undefined)
          if (!lookup.found) return { success: false, reply: `لم أجد طالب/ة باسم "${params.student_name}"` }
          if (lookup.ambiguous) return { success: false, reply: `وجدت أكثر من نتيجة` }
          targetIds = [lookup.student.id]
        } else {
          const { data: all } = await supabase.from('students').select('id').eq('status', 'active')
          targetIds = (all || []).map((s: any) => s.id)
        }

        if (!targetIds.length) return { success: false, reply: 'لا يوجد مستهدفين' }

        await supabase.from('notifications').insert(targetIds.map(id => ({
          user_id: id,
          type: params.type || 'system',
          title: params.title || 'إشعار',
          body: params.message,
          data: params.data || {},
        })))

        return { success: true, reply: `✅ تم إرسال إشعار لـ ${targetIds.length} ${targetIds.length === 1 ? 'طالب' : 'طالب'}` }
      }

      default:
        return { success: false, reply: `الأمر "${action}" غير معروف` }
    }
  } catch (err: any) {
    console.error(`[Action ${action}] Error:`, err.message)
    return { success: false, reply: `خطأ في تنفيذ الأمر: ${err.message}` }
  }
}

// ─── System Prompt ─────────────────────────────────────────

function buildSystemPrompt(contextStr: string, role: string) {
  return `أنت مساعد ذكي لأكاديمية طلاقة (Fluentia Academy) لتعليم اللغة الإنجليزية.
أنت لست مجرد شات بوت — أنت مركز تحكم يستطيع تنفيذ أي عملية في النظام.

${contextStr}

## طريقة الرد

رد دائماً بـ JSON صالح فقط (بدون markdown أو أي نص إضافي). الصيغة:

للأسئلة العامة أو النصائح:
{"type":"answer","reply":"ردك بالعربي هنا"}

لتنفيذ عملية:
{"type":"action","action":"ACTION_NAME","params":{...},"reply":"رسالة تأكيد مختصرة"}

لعمليات خطيرة تحتاج تأكيد (حذف، إيقاف اشتراك، خصم نقاط):
{"type":"confirm","action":"ACTION_NAME","params":{...},"reply":"رسالة التأكيد — هل متأكد؟"}

## العمليات المتاحة

### استعلامات (قراءة فقط)
- STUDENT_INFO: {"student_name":"اسم الطالب"}
- LIST_STUDENTS: {"filter":"no_submissions|low_attendance|top_xp","group_code":"2A"} — الفلتر اختياري
- GROUP_INFO: {"group_code":"2A"}
- LIST_PENDING: {"group_code":"2A"} — group_code اختياري
- PAYMENT_STATUS: {"filter":"overdue"}
- SYSTEM_STATUS: {}
- WEAKNESS_ANALYSIS: {"student_name":"اسم الطالب"}
- STUDENT_REPORT: {"student_name":"اسم الطالب","period_days":30}

### إدارة النقاط
- AWARD_XP: {"student_name":"اسم","amount":10,"reason":"السبب"} أو {"group_code":"2A","amount":10,"reason":"السبب"}
- DEDUCT_XP: {"student_name":"اسم","amount":5,"reason":"السبب"} ⚠️ تحتاج تأكيد

### إدارة الواجبات
- CREATE_ASSIGNMENT: {"type":"reading|writing|speaking|listening|grammar|vocabulary|custom","group_code":"2A","title":"العنوان","description":"الوصف","instructions":"التعليمات","deadline":"2026-03-15"}
- DELETE_ASSIGNMENT: {"assignment_id":"uuid"} ⚠️ تحتاج تأكيد

### التقييم
- GRADE_SUBMISSION: {"student_name":"اسم","grade":"A+|A|B+|B|C+|C|D|F","feedback":"ملاحظة اختيارية"}
- AI_GRADE_ALL: {"group_code":"2A"} — group_code اختياري ⚠️ تحتاج تأكيد

### التواصل
- SEND_NOTE: {"student_name":"اسم","message":"الرسالة"} أو {"group_code":"2A","message":"الرسالة"}
- ANNOUNCE_ALL: {"message":"الإعلان"}
- REMIND: {} — يذكّر اللي ما سلّموا

### إدارة الطلاب
- PROMOTE_STUDENT: {"student_name":"اسم","new_level":3}
- EDIT_STUDENT: {"student_name":"اسم","field":"package|custom_price|level","value":"القيمة"}
- MOVE_STUDENT: {"student_name":"اسم","new_group_code":"2B"}
- PAUSE_STUDENT: {"student_name":"اسم"} ⚠️ تحتاج تأكيد
${role === 'admin' ? `- ADD_STUDENT: {"full_name":"الاسم","email":"email@example.com","level":1,"package":"asas|talaqa|tamayuz|ielts","group_code":"2A"} ⚠️ تحتاج تأكيد` : ''}

### الحضور والحصص
- RECORD_ATTENDANCE: {"group_code":"2A","date":"2026-03-12","absent_names":["اسم1"],"excused_names":["اسم2"]}
- CREATE_CLASS: {"group_code":"2A","title":"عنوان","date":"2026-03-15","start_time":"20:00","end_time":"21:00"}

### المجموعات
${role === 'admin' ? '- CREATE_GROUP: {"name":"اسم المجموعة","code":"2B","level":2}' : ''}

### المدفوعات (مشرف فقط)
${role === 'admin' ? `- RECORD_PAYMENT: {"student_name":"اسم","amount":600,"method":"bank_transfer|cash"}` : ''}

### أنماط الأخطاء والتمارين
- VIEW_ERROR_PATTERNS: {"student_name":"اسم"} — عرض أنماط الأخطاء النشطة للطالب
- GENERATE_EXERCISES: {"student_name":"اسم"} — إنشاء تمارين مخصصة بناءً على أنماط الأخطاء
- LIST_WEAK_STUDENTS: {"skill":"grammar|vocabulary|speaking|writing"} — أضعف الطلاب في مهارة معينة

### توقع الانسحاب
- VIEW_CHURN_RISK: {"student_name":"اسم"} — عرض تحليل مخاطر انسحاب طالب
- LIST_HIGH_RISK: {} — قائمة الطلاب بمخاطر انسحاب عالية/متوسطة
${role === 'admin' ? '- RUN_CHURN_ANALYSIS: {} — تشغيل تحليل الانسحاب لجميع الطلاب' : ''}

### ولي الأمر
- CREATE_PARENT_LINK: {"student_name":"اسم","parent_name":"اسم ولي الأمر"} — إنشاء رابط لوحة ولي الأمر

### اليوميات الصوتية
- VIEW_JOURNAL_STATS: {"student_name":"اسم"} — إحصائيات تسجيلات الطالب الصوتية

### تخطيط الدروس
- GENERATE_LESSON_PLAN: {"group_code":"2A","topic":"الموضوع","skill_focus":"grammar|speaking|writing","duration":60} — إنشاء خطة درس بالذكاء الاصطناعي

### الفعاليات والمسابقات
- CREATE_EVENT: {"title":"العنوان","description":"الوصف","type":"challenge|competition|workshop|season","start_date":"2026-03-15","end_date":"2026-03-20","reward_xp":50} ⚠️ تحتاج تأكيد
- LIST_EVENTS: {} — عرض الفعاليات

### المتصدرين والسلاسل
- VIEW_LEADERBOARD: {"type":"xp|streak","group_code":"2A"} — group_code اختياري

### الجدول
- VIEW_SCHEDULE: {"date":"2026-03-12","end_date":"2026-03-15"} — end_date اختياري

### التحديات
- CREATE_CHALLENGE: {"title":"العنوان","description":"الوصف","type":"daily|weekly","group_code":"2A","xp_reward":20,"deadline":"2026-03-15"} ⚠️ تحتاج تأكيد

### الإشعارات
- SEND_PUSH: {"student_name":"اسم أو group_code","title":"العنوان","message":"الرسالة"}

${role === 'admin' ? `### تحليلات AI (مشرف فقط)
- AI_USAGE_STATS: {} — إحصائيات استخدام وتكلفة الذكاء الاصطناعي` : ''}

## قواعد مهمة
- رد بالعربي دائماً (إلا المصطلحات الإنجليزية)
- إذا ذكر المستخدم اسم طالب، ابحث عنه بالاسم الأقرب
- إذا ذكر موعد نسبي (بكرة، الأحد، بعد أسبوع) حوّله لتاريخ ISO
- إذا طلب شيء غير متاح، اقترح البديل
- كن مختصراً ومباشراً
- لا تضف markdown أو code blocks — JSON فقط
${role !== 'admin' ? '- أنت مدرب: لا يمكنك إضافة طلاب أو إدارة المدفوعات أو تغيير إعدادات النظام' : '- أنت مشرف: لديك صلاحيات كاملة'}`
}

// ─── Main Handler ──────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization')

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) throw new Error('Unauthorized')

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (!profile || !['trainer', 'admin'].includes(profile.role)) throw new Error('Unauthorized')

    const role = profile.role
    const body = await req.json()
    const { message, history, confirmed_action } = body

    // Get trainer's group IDs
    let trainerGroupIds: string[] = []
    if (role !== 'admin') {
      const { data: tGroups } = await supabase
        .from('groups').select('id').eq('trainer_id', user.id)
      trainerGroupIds = (tGroups || []).map((g: any) => g.id)
    }

    // Handle confirmed action (skip Claude, execute directly)
    if (confirmed_action) {
      const result = await executeAction(
        confirmed_action.action,
        confirmed_action.params,
        user.id,
        role,
        supabase,
        trainerGroupIds
      )
      return new Response(
        JSON.stringify({ reply: result.reply, action_result: { action: confirmed_action.action, success: result.success, data: result.data } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!message?.trim()) throw new Error('Message required')

    if (!CLAUDE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    // Load context
    const { context: contextStr } = await loadBaseContext(supabase, user.id, role, trainerGroupIds)

    // Build conversation messages
    const claudeMessages: Array<{ role: string; content: string }> = []

    // Add history (last 20 messages)
    if (history?.length) {
      for (const h of history.slice(-20)) {
        claudeMessages.push({
          role: h.role === 'user' ? 'user' : 'assistant',
          content: h.content || '',
        })
      }
    }

    // Add current message
    claudeMessages.push({ role: 'user', content: message })

    // Call Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: buildSystemPrompt(contextStr, role),
        messages: claudeMessages,
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[ai-trainer-assistant] Claude error:', errText)
      return new Response(
        JSON.stringify({ error: 'المساعد غير متاح حالياً' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      )
    }

    const claudeData = await claudeRes.json()
    let responseText = claudeData.content?.[0]?.text || '{}'
    const inputTokens = claudeData.usage?.input_tokens || 0
    const outputTokens = claudeData.usage?.output_tokens || 0

    // Clean response
    responseText = responseText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    // Parse Claude's response
    let parsed: any
    try {
      parsed = JSON.parse(responseText)
    } catch {
      // Claude responded with plain text — wrap it
      parsed = { type: 'answer', reply: responseText }
    }

    // Log AI usage
    const costSAR = ((inputTokens * 3 + outputTokens * 15) / 1_000_000) * 3.75
    const { data: trainerRecord } = await supabase
      .from('trainers').select('id').eq('id', user.id).maybeSingle()

    await supabase.from('ai_usage').insert({
      type: 'trainer_assistant',
      trainer_id: trainerRecord ? user.id : null,
      model: 'claude-sonnet',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_sar: costSAR.toFixed(4),
    })

    // Handle response types
    if (parsed.type === 'action') {
      // Execute the action
      const result = await executeAction(
        parsed.action,
        parsed.params,
        user.id,
        role,
        supabase,
        trainerGroupIds
      )

      return new Response(
        JSON.stringify({
          reply: result.reply || parsed.reply,
          action_result: {
            action: parsed.action,
            success: result.success,
            data: result.data,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (parsed.type === 'confirm') {
      // Return confirmation request to frontend
      return new Response(
        JSON.stringify({
          reply: parsed.reply,
          needs_confirmation: true,
          pending_action: {
            action: parsed.action,
            params: parsed.params,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simple answer
    return new Response(
      JSON.stringify({ reply: parsed.reply || responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[ai-trainer-assistant] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
