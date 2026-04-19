import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { generatePlan } from '@/lib/ielts/plan-generator'

const PLAN_KEY = (sid) => ['ielts-plan', sid]

export function useAdaptivePlan(studentId) {
  return useQuery({
    queryKey: PLAN_KEY(studentId),
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_adaptive_plans')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useUpdatePlanMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, patch }) => {
      const { data, error } = await supabase
        .from('ielts_adaptive_plans')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('Plan update failed — 0 rows affected')
      return data
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: PLAN_KEY(studentId) })
    },
  })
}

export function useRegeneratePlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId }) => {
      const ctx = await gatherPlanContext(studentId)
      const payload = generatePlan(ctx)
      // Strip _motivational_note_ar — column doesn't exist in DB
      const { _motivational_note_ar, ...dbPayload } = payload
      const { data, error } = await supabase
        .from('ielts_adaptive_plans')
        .upsert({ student_id: studentId, ...dbPayload }, { onConflict: 'student_id' })
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('Plan upsert failed — 0 rows affected')
      return { ...data, _motivational_note_ar }
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: PLAN_KEY(studentId) })
      qc.invalidateQueries({ queryKey: ['ielts-hub', studentId] })
      qc.invalidateQueries({ queryKey: ['ielts-errors-count', studentId] })
    },
  })
}

export function useMarkWeeklyTaskComplete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, dayKey, taskIndex }) => {
      // Read current schedule
      const { data: plan, error: readErr } = await supabase
        .from('ielts_adaptive_plans')
        .select('weekly_schedule')
        .eq('student_id', studentId)
        .single()
      if (readErr) throw readErr
      if (!plan) throw new Error('Plan not found')

      const schedule = plan.weekly_schedule || {}
      const dayTasks = schedule[dayKey] || []
      const updatedTasks = dayTasks.map((task, i) =>
        i === taskIndex ? { ...task, completed: !task.completed } : task
      )
      const newSchedule = { ...schedule, [dayKey]: updatedTasks }

      const { data, error } = await supabase
        .from('ielts_adaptive_plans')
        .update({ weekly_schedule: newSchedule, updated_at: new Date().toISOString() })
        .eq('student_id', studentId)
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('Task toggle failed — 0 rows affected')
      return data
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: PLAN_KEY(studentId) })
    },
  })
}

// ─── Internal context gatherer ───────────────────────────────

async function gatherPlanContext(studentId) {
  const [resultsRes, errorsRes, planRes] = await Promise.all([
    supabase
      .from('ielts_student_results')
      .select('overall_band, reading_score, listening_score, writing_score, speaking_score, result_type, completed_at')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: false })
      .limit(5),
    supabase
      .from('ielts_error_bank')
      .select('skill_type, question_type, mastered, next_review_at')
      .eq('student_id', studentId),
    supabase
      .from('ielts_adaptive_plans')
      .select('target_band, target_exam_date, test_variant')
      .eq('student_id', studentId)
      .maybeSingle(),
  ])

  if (resultsRes.error) throw resultsRes.error
  if (errorsRes.error) throw errorsRes.error

  const resultsData = resultsRes.data || []
  const errorsData = errorsRes.data || []
  const currentPlan = planRes.data || {}

  const target = currentPlan.target_band || 6.5

  // Recency-weighted current band
  const bands = resultsData.map(r => r.overall_band).filter(Boolean).map(Number)
  const currentBand = bands.length
    ? Math.round((bands[0] * 0.6 + (bands[1] ?? bands[0]) * 0.3 + (bands[2] ?? bands[0]) * 0.1) * 2) / 2
    : null

  const latest = resultsData[0] || {}
  const skillBands = {
    reading: latest.reading_score ? Number(latest.reading_score) : null,
    listening: latest.listening_score ? Number(latest.listening_score) : null,
    writing: latest.writing_score ? Number(latest.writing_score) : null,
    speaking: latest.speaking_score ? Number(latest.speaking_score) : null,
  }

  const weakAreas = Object.entries(skillBands)
    .filter(([, b]) => b != null && b < target - 0.5)
    .sort(([, a], [, b]) => a - b)
    .map(([skill, band]) => ({ skill, band }))

  const strongAreas = Object.entries(skillBands)
    .filter(([, b]) => b != null && b >= target)
    .map(([skill, band]) => ({ skill, band }))

  const now = new Date()
  const dueErrors = errorsData.filter(
    e => !e.mastered && (!e.next_review_at || new Date(e.next_review_at) <= now)
  ).length

  const lastMock = resultsData.find(r => r.result_type === 'mock')
  const daysSinceLastMock = lastMock
    ? Math.floor((Date.now() - new Date(lastMock.completed_at).getTime()) / 86400000)
    : null

  return {
    studentId,
    currentBand,
    targetBand: target,
    examDate: currentPlan.target_exam_date || null,
    testVariant: currentPlan.test_variant || 'academic',
    weakAreas,
    strongAreas,
    errorSummary: {
      total: errorsData.length,
      due: dueErrors,
      hotspots: summarizeErrors(errorsData),
    },
    hasDiagnostic: resultsData.some(r => r.result_type === 'diagnostic'),
    daysSinceLastMock,
  }
}

function summarizeErrors(errors) {
  const counts = {}
  for (const e of errors) {
    if (e.mastered) continue
    const key = `${e.skill_type}:${e.question_type || 'general'}`
    counts[key] = (counts[key] || 0) + 1
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([key, count]) => ({ key, count }))
}
