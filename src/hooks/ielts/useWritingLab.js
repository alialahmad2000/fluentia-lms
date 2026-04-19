import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'

const STALE = 30 * 1000

// Edge function quota limits (match what evaluate-writing actually enforces)
const EDGE_LIMITS = { asas: 5, talaqa: 10, tamayuz: 20, ielts: 30 }

// All published writing tasks grouped by category
export function useWritingTasks() {
  return useQuery({
    queryKey: ['ielts-writing-tasks'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_writing_tasks')
        .select('id, task_type, sub_type, title, prompt, image_url, chart_data, word_count_target, time_limit_minutes, difficulty_band, test_variant, is_published')
        .eq('is_published', true)
        .order('task_type')
        .order('difficulty_band')
      if (error) throw error
      const grouped = { task1_academic: [], task1_gt: [], task2: [] }
      for (const t of data || []) {
        if (t.task_type === 'task1' && t.test_variant === 'general_training') grouped.task1_gt.push(t)
        else if (t.task_type === 'task1') grouped.task1_academic.push(t)
        else if (t.task_type === 'task2') grouped.task2.push(t)
      }
      return grouped
    },
  })
}

export function useWritingTask(taskId) {
  return useQuery({
    queryKey: ['ielts-writing-task', taskId],
    enabled: !!taskId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_writing_tasks')
        .select('*')
        .eq('id', taskId)
        .single()
      if (error) throw error
      return data
    },
  })
}

// Student's writing submissions (evaluated only for history)
export function useWritingSubmissions(studentId, limit = 20) {
  return useQuery({
    queryKey: ['ielts-writing-submissions', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('id, submission_type, test_variant, source_id, text_content, word_count, band_score, ai_feedback, submitted_at, evaluated_at')
        .eq('student_id', studentId)
        .in('submission_type', ['writing_task1', 'writing_task2'])
        .not('evaluated_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// Single submission for feedback screen
export function useWritingSubmission(studentId, submissionId) {
  return useQuery({
    queryKey: ['ielts-submission', submissionId],
    enabled: !!studentId && !!submissionId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('*')
        .eq('id', submissionId)
        .eq('student_id', studentId)
        .single()
      if (error) throw error
      // Fetch task separately (source_id is the task FK)
      if (data?.source_id) {
        const { data: task } = await supabase
          .from('ielts_writing_tasks')
          .select('id, title, prompt, task_type, test_variant, word_count_target, model_answer_band6, model_answer_band7, model_answer_band8')
          .eq('id', data.source_id)
          .single()
        return { ...data, task }
      }
      return data
    },
  })
}

// Most recent draft for this task (unevaluated submission)
export function useWritingDraft(studentId, taskId) {
  return useQuery({
    queryKey: ['ielts-writing-draft', studentId, taskId],
    enabled: !!studentId && !!taskId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_submissions')
        .select('*')
        .eq('student_id', studentId)
        .eq('source_id', taskId)
        .is('evaluated_at', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// Monthly writing quota — queries ai_usage to match edge function enforcement
export function useWritingQuota(studentId, studentData) {
  return useQuery({
    queryKey: ['ielts-writing-quota', studentId],
    enabled: !!studentId && !!studentData,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { count, error } = await supabase
        .from('ai_usage')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('type', 'writing_evaluation')
        .gte('created_at', startOfMonth.toISOString())
      if (error) throw error

      const override = studentData.writing_limit_override
      const limit = override ?? EDGE_LIMITS[studentData.package] ?? 5

      return {
        used: count || 0,
        limit,
        remaining: Math.max(0, limit - (count || 0)),
      }
    },
  })
}

// Save / upsert a draft row in ielts_submissions
export function useSaveDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, taskId, taskType, testVariant, text, draftId }) => {
      const wordCount = text.trim().split(/\s+/).filter(Boolean).length
      const payload = {
        student_id: studentId,
        submission_type: taskType === 'task1' ? 'writing_task1' : 'writing_task2',
        test_variant: testVariant || null,
        source_table: 'ielts_writing_tasks',
        source_id: taskId,
        text_content: text,
        word_count: wordCount,
        submitted_at: new Date().toISOString(),
      }
      if (draftId) {
        const { data, error } = await supabase
          .from('ielts_submissions')
          .update(payload)
          .eq('id', draftId)
          .select('id')
          .single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase
          .from('ielts_submissions')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        return data
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ielts-writing-draft', vars.studentId, vars.taskId] })
    },
  })
}

// Call evaluate-writing edge function + persist result
export function useEvaluateSubmission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ submissionId, studentId, taskId, taskType, text }) => {
      // Idempotency: return cached result if already evaluated
      if (submissionId) {
        const { data: existing } = await supabase
          .from('ielts_submissions')
          .select('id, ai_feedback, band_score, evaluated_at')
          .eq('id', submissionId)
          .maybeSingle()
        if (existing?.evaluated_at && existing?.ai_feedback) {
          return existing
        }
      }

      // Map to edge function task_type format
      const edgeTaskType = taskType === 'task1' ? 'ielts_task1' : 'ielts_task2'

      const { data, error } = await invokeWithRetry(
        'evaluate-writing',
        { body: { text, task_type: edgeTaskType } },
        { timeoutMs: 90000 }
      )

      if (error) throw new Error(error)
      if (!data) throw new Error('التقييم التلقائي أعاد نتيجة فارغة')

      const aiResult = data.feedback
      const band = aiResult?.band_score ?? null
      if (band == null) throw new Error('النتيجة لا تحتوي على band score')

      // Persist evaluation back to the draft row
      const { data: upd, error: uErr } = await supabase
        .from('ielts_submissions')
        .update({
          band_score: band,
          ai_feedback: aiResult,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select('id, band_score, ai_feedback')
        .single()
      if (uErr) throw uErr
      return upd
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ielts-writing-submissions', vars.studentId] })
      qc.invalidateQueries({ queryKey: ['ielts-writing-quota', vars.studentId] })
    },
  })
}

// Log session + upsert progress after successful evaluation
export function useUpdateWritingProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, taskType, bandScore, wordCount, durationSeconds = 0 }) => {
      const questionTypeKey = taskType === 'task1' ? 'writing_task1' : 'writing_task2'
      const now = new Date().toISOString()

      const { data: existing } = await supabase
        .from('ielts_student_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'writing')
        .eq('question_type', questionTypeKey)
        .maybeSingle()

      const prevAttempts = existing?.attempts_count || 0
      const prevTime = existing?.total_time_seconds || 0
      const newBand = existing?.estimated_band != null
        ? Math.round(((0.4 * Number(existing.estimated_band)) + (0.6 * (bandScore || 0))) * 2) / 2
        : bandScore

      await supabase
        .from('ielts_student_progress')
        .upsert({
          student_id: studentId,
          skill_type: 'writing',
          question_type: questionTypeKey,
          attempts_count: prevAttempts + 1,
          total_time_seconds: prevTime + durationSeconds,
          estimated_band: newBand,
          last_attempt_at: now,
          updated_at: now,
        }, { onConflict: 'student_id,skill_type,question_type' })

      await supabase.from('ielts_skill_sessions').insert({
        student_id: studentId,
        skill_type: 'writing',
        question_type: questionTypeKey,
        duration_seconds: durationSeconds,
        band_score: bandScore,
        session_data: { word_count: wordCount },
        started_at: new Date(Date.now() - durationSeconds * 1000).toISOString(),
        completed_at: now,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })
      qc.invalidateQueries({ queryKey: ['ielts-latest-result'] })
    },
  })
}
