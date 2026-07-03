// Diagnostic content assembly + attempt creation.
//
// The diagnostic is a LEAN placement (not the 3-hour mock): one reading passage,
// one listening section, one Task-2 writing prompt, and Speaking Part 1. It
// produces a real band per skill that seeds the whole Atelier (home, plan,
// journey). It reuses the proven mock segment engine via a mock-shaped attempt.
import { supabase } from '@/lib/supabase'

// Pick the leanest real content for each skill from the published pool.
export async function assembleDiagnosticContent() {
  const content = {}

  const [{ data: reading }, { data: listening }, { data: t2 }, { data: p1 }] = await Promise.all([
    supabase.from('ielts_reading_passages')
      .select('id').eq('is_published', true).order('created_at').limit(1),
    supabase.from('ielts_listening_sections')
      .select('id, section_number').eq('is_published', true).order('section_number').limit(1),
    supabase.from('ielts_writing_tasks')
      .select('id').eq('is_published', true).eq('task_type', 'task2').limit(1).maybeSingle(),
    supabase.from('ielts_speaking_questions')
      .select('id').eq('is_published', true).eq('part', 1).limit(1).maybeSingle(),
  ])

  content.reading = (reading || []).map((r) => r.id)
  content.listening = (listening || []).map((r) => r.id)
  content.writing = { task1Id: null, task2Id: t2?.id || null }
  content.speaking = { part1Id: p1?.id || null }
  return content
}

// Create a diagnostic attempt. Linked to the test_number=0 diagnostic mock so
// useDiagnosticStateV2 (which keys on that mock) detects in-progress / completed.
export async function createDiagnosticAttempt(studentId) {
  if (!studentId) throw new Error('missing studentId')

  const [content, { data: diagMock }] = await Promise.all([
    assembleDiagnosticContent(),
    supabase.from('ielts_mock_tests').select('id').eq('test_number', 0).maybeSingle(),
  ])

  const answers = {
    diagnostic: true,
    content,
    reading: { done: false },
    listening: { done: false },
    writing: { done: false },
    speaking: { done: false },
  }

  const { data, error } = await supabase
    .from('ielts_mock_attempts')
    .insert({
      student_id: studentId,
      mock_test_id: diagMock?.id || null,
      test_variant: 'academic',
      status: 'in_progress',
      started_at: new Date().toISOString(),
      answers,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}
