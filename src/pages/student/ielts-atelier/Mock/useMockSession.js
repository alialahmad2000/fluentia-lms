// Mock session hook — attempt CRUD + content assembly + timer math
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const SKILL_LIMITS = {
  listening: 30 * 60,
  reading:   60 * 60,
  writing:   60 * 60,
  speaking:  14 * 60,
}
export const SKILLS_ORDER = ['listening', 'reading', 'writing', 'speaking']

// ─── Timer math (refresh-safe) ────────────────────────────────────────────────

export function getRemainingSeconds(startedAtIso, limitSec) {
  if (!startedAtIso) return limitSec
  const elapsed = Math.floor((Date.now() - new Date(startedAtIso).getTime()) / 1000)
  return Math.max(0, limitSec - elapsed)
}

// ─── Attempt queries ──────────────────────────────────────────────────────────

export function useMockAttempt(attemptId) {
  return useQuery({
    queryKey: ['v3-mock-attempt', attemptId],
    enabled: !!attemptId,
    staleTime: 0,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .select('id, status, started_at, completed_at, answers')
        .eq('id', attemptId)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useMockHistory(studentId) {
  return useQuery({
    queryKey: ['v3-mock-history', studentId],
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .select('id, status, started_at, completed_at, answers')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data || []
    },
  })
}

// ─── Content assembly — on-the-fly from published tables ─────────────────────

export async function assembleContent(mode, singleSkill) {
  const skills = mode === 'single' ? [singleSkill] : SKILLS_ORDER
  const content = {}

  if (skills.includes('listening')) {
    const { data } = await supabase
      .from('ielts_listening_sections')
      .select('id, section_number, title, audio_url, audio_duration_seconds, questions, answer_key')
      .eq('is_published', true)
      .order('section_number')
      .limit(4)
    content.listening = (data || []).map(r => r.id)
    content.listeningSections = data || []
  }

  if (skills.includes('reading')) {
    const { data } = await supabase
      .from('ielts_reading_passages')
      .select('id, title, passage_text, questions, answer_key, difficulty_band')
      .eq('is_published', true)
      .limit(3)
    content.reading = (data || []).map(r => r.id)
    content.readingPassages = data || []
  }

  if (skills.includes('writing')) {
    const { data: t1 } = await supabase
      .from('ielts_writing_tasks')
      .select('id, task_type, title, prompt, image_url, word_count_target, time_limit_minutes')
      .eq('is_published', true).eq('task_type', 'task1')
      .limit(1).maybeSingle()
    const { data: t2 } = await supabase
      .from('ielts_writing_tasks')
      .select('id, task_type, title, prompt, image_url, word_count_target, time_limit_minutes')
      .eq('is_published', true).eq('task_type', 'task2')
      .limit(1).maybeSingle()
    content.writing = { task1Id: t1?.id, task2Id: t2?.id }
    content.writingTasks = { task1: t1, task2: t2 }
  }

  if (skills.includes('speaking')) {
    const { data: p1 } = await supabase
      .from('ielts_speaking_questions')
      .select('id, part, topic, questions, useful_phrases')
      .eq('is_published', true).eq('part', 1)
      .limit(1).maybeSingle()
    const { data: p2 } = await supabase
      .from('ielts_speaking_questions')
      .select('id, part, topic, questions, cue_card')
      .eq('is_published', true).eq('part', 2)
      .limit(1).maybeSingle()
    const { data: p3 } = await supabase
      .from('ielts_speaking_questions')
      .select('id, part, topic, questions')
      .eq('is_published', true).eq('part', 3)
      .limit(1).maybeSingle()
    content.speaking = { part1Id: p1?.id, part2Id: p2?.id, part3Id: p3?.id }
    content.speakingRows = { part1: p1, part2: p2, part3: p3 }
  }

  return content
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, mode, singleSkill }) => {
      const content = await assembleContent(mode, singleSkill)
      const answers = {
        mode,
        single_skill: singleSkill || null,
        content,
        listening: { done: false },
        reading:   { done: false },
        writing:   { done: false },
        speaking:  { done: false },
      }
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .insert({ student_id: studentId, status: 'in_progress', started_at: new Date().toISOString(), answers })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['v3-mock-history', vars.studentId] })
    },
  })
}

export function useUpdateAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ attemptId, patch }) => {
      const { error } = await supabase
        .from('ielts_mock_attempts')
        .update(patch)
        .eq('id', attemptId)
      if (error) throw error
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['v3-mock-attempt', vars.attemptId] })
    },
  })
}

// Merge a skill result into the attempt's answers JSON
export async function saveSegmentResult(attemptId, skill, result) {
  const { data: current } = await supabase
    .from('ielts_mock_attempts')
    .select('answers')
    .eq('id', attemptId)
    .single()
  if (!current) return
  const answers = { ...(current.answers || {}), [skill]: { ...result, done: true } }
  const allDone = ['listening', 'reading', 'writing', 'speaking']
    .filter(s => {
      const mode = answers.mode
      if (mode === 'single') return s === answers.single_skill
      return true
    })
    .every(s => answers[s]?.done)
  await supabase.from('ielts_mock_attempts').update({
    answers,
    ...(allDone ? { status: 'completed', completed_at: new Date().toISOString() } : {}),
  }).eq('id', attemptId)
}
