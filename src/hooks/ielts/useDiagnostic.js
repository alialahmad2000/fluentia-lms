import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Fetch diagnostic mock test + all referenced content.
// IMPORTANT: speaking_questions is INLINE JSONB in the mock row — no separate table query.
export function useDiagnosticContent() {
  return useQuery({
    queryKey: ['diagnostic-content'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data: mock, error: e1 } = await supabase
        .from('ielts_mock_tests')
        .select('*')
        .eq('test_number', 0)
        .single()
      if (e1) throw e1
      if (!mock) throw new Error('Diagnostic test not found')

      const [passagesRes, sectionsRes, writingRes] = await Promise.all([
        supabase
          .from('ielts_reading_passages')
          .select('*')
          .in('id', mock.reading_passage_ids || []),
        supabase
          .from('ielts_listening_sections')
          .select('*')
          .eq('test_id', mock.listening_test_id)
          .order('section_number'),
        supabase
          .from('ielts_writing_tasks')
          .select('*')
          .in('id', [mock.writing_task1_id, mock.writing_task2_id].filter(Boolean)),
      ])

      return {
        mock,
        passages: passagesRes.data || [],
        listening: sectionsRes.data || [],
        writing: writingRes.data || [],
        // speaking_questions is inline JSONB — no table lookup needed
        speaking: mock.speaking_questions || {},
      }
    },
  })
}

// Get or create the current diagnostic attempt for this student
export function useDiagnosticAttempt(studentId) {
  return useQuery({
    queryKey: ['diagnostic-attempt', studentId],
    enabled: !!studentId,
    staleTime: 0,
    queryFn: async () => {
      const { data: mockTest, error: e1 } = await supabase
        .from('ielts_mock_tests')
        .select('id')
        .eq('test_number', 0)
        .single()
      if (e1) throw e1
      if (!mockTest) throw new Error('Diagnostic test not found')

      const { data: existing, error: e2 } = await supabase
        .from('ielts_mock_attempts')
        .select('*')
        .eq('student_id', studentId)
        .eq('mock_test_id', mockTest.id)
        .in('status', ['in_progress', 'completed'])
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (e2) throw e2

      return { attempt: existing, mockTestId: mockTest.id }
    },
  })
}

// Create a new diagnostic attempt
export function useStartDiagnostic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, mockTestId, testVariant = 'academic' }) => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .insert({
          student_id: studentId,
          mock_test_id: mockTestId,
          status: 'in_progress',
          current_section: 'listening',
          section_started_at: new Date().toISOString(),
          answers: {},
          section_time_remaining: {
            listening: 25 * 60,
            reading: 35 * 60,
            writing: 25 * 60,
            speaking: 8 * 60,
          },
          test_variant: testVariant,
        })
        .select()
        .single()
      if (error) throw error
      if (!data) throw new Error('Failed to create attempt')
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diagnostic-attempt'] })
    },
  })
}

// Auto-save answers — debounced calls from section components
export function useAutoSaveAttempt() {
  return useMutation({
    mutationFn: async ({ attemptId, patch }) => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .update({ ...patch, auto_saved_at: new Date().toISOString() })
        .eq('id', attemptId)
        .select('id')
        .single()
      if (error) throw error
      if (!data) throw new Error('Auto-save failed — no rows affected')
      return data
    },
  })
}

// Advance to the next section
export function useAdvanceSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ attemptId, nextSection, patch = {} }) => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .update({
          current_section: nextSection,
          section_started_at: new Date().toISOString(),
          auto_saved_at: new Date().toISOString(),
          ...patch,
        })
        .eq('id', attemptId)
        .select('id')
        .single()
      if (error) throw error
      if (!data) throw new Error('Advance section failed — no rows affected')
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['diagnostic-attempt'] }),
  })
}

// Complete diagnostic → calls scoring edge function
export function useCompleteDiagnostic() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ attemptId }) => {
      const { data, error } = await supabase.functions.invoke('complete-ielts-diagnostic', {
        body: { attempt_id: attemptId },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ielts-latest-result'] })
      qc.invalidateQueries({ queryKey: ['ielts-plan'] })
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })
      qc.invalidateQueries({ queryKey: ['diagnostic-attempt'] })
    },
  })
}
