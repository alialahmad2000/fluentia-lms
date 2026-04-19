import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'

const STALE = 30 * 1000
// test_variant is stored in answers.meta.test_variant (column missing from ielts_mock_attempts)

// ─── Catalog ────────────────────────────────────────────────
export function useMockCatalog() {
  return useQuery({
    queryKey: ['mock-catalog'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_tests')
        .select('id, test_number, title_ar, title_en, total_time_minutes, reading_passage_ids, writing_task1_id, writing_task2_id, listening_test_id, speaking_questions')
        .eq('is_published', true)
        .gt('test_number', 0)
        .order('test_number')
      if (error) throw error
      return (data || []).map(m => ({
        ...m,
        isComplete:
          !!m.writing_task1_id && !!m.writing_task2_id && !!m.listening_test_id &&
          Array.isArray(m.reading_passage_ids) && m.reading_passage_ids.length >= 3 &&
          m.speaking_questions != null,
      }))
    },
  })
}

// ─── Student's mock attempts ─────────────────────────────────
export function useMockAttempts(studentId, limit = 20) {
  return useQuery({
    queryKey: ['mock-attempts', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .select('id, mock_test_id, status, started_at, completed_at, result_id, answers')
        .eq('student_id', studentId)
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      // Exclude diagnostic (test_number=0 mock)
      // We can't join directly, so filter by excluding attempts that have result_type='diagnostic' in result
      // Simpler: just return all and let UI filter by mock_test_id != diagnosticId
      return data || []
    },
  })
}

// ─── Non-diagnostic attempts with their bands ───────────────
export function useMockHistory(studentId, limit = 50) {
  return useQuery({
    queryKey: ['mock-history', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_results')
        .select('id, overall_band, reading_score, listening_score, writing_score, speaking_score, completed_at, test_variant, mock_test_id')
        .eq('student_id', studentId)
        .eq('result_type', 'mock')
        .order('completed_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// ─── Readiness meta ──────────────────────────────────────────
export function useReadinessMeta(studentId, targetBand) {
  const histQ = useMockHistory(studentId, 10)
  const results = histQ.data || []
  if (results.length === 0) return { data: { readiness: null, avgLastTwo: null, gap: null, trend: null }, isLoading: histQ.isLoading }

  const lastTwo = results.slice(0, 2).map(r => Number(r.overall_band)).filter(b => !isNaN(b))
  const avgLastTwo = lastTwo.length ? lastTwo.reduce((a, b) => a + b, 0) / lastTwo.length : null
  const gap = targetBand && avgLastTwo != null ? +(targetBand - avgLastTwo).toFixed(1) : null
  const readiness = gap == null ? null : gap <= 0 ? 'green' : gap <= 0.5 ? 'amber' : 'red'

  // Trend: compare last 2 results if available
  const bands = results.map(r => Number(r.overall_band)).filter(b => !isNaN(b))
  const trend = bands.length >= 2
    ? (bands[0] > bands[1] ? 'up' : bands[0] < bands[1] ? 'down' : 'flat')
    : null

  return { data: { readiness, avgLastTwo, gap, trend, results }, isLoading: histQ.isLoading }
}

// ─── Single attempt (for MockFlow) ──────────────────────────
export function useMockAttempt(attemptId) {
  return useQuery({
    queryKey: ['mock-attempt', attemptId],
    enabled: !!attemptId,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .select('*, ielts_mock_tests(*)')
        .eq('id', attemptId)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ─── Start a pre-built mock attempt ─────────────────────────
export function useStartMockAttempt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, mockTestId, testVariant = 'academic' }) => {
      // Check for existing in-progress attempt
      const { data: existing } = await supabase
        .from('ielts_mock_attempts')
        .select('id, status, mock_test_id')
        .eq('student_id', studentId)
        .eq('status', 'in_progress')
        .neq('mock_test_id', (await supabase.from('ielts_mock_tests').select('id').eq('test_number', 0).single()).data?.id || '')
        .maybeSingle()
      if (existing) return { attemptId: existing.id, resumed: true }

      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .insert({
          student_id: studentId,
          mock_test_id: mockTestId,
          status: 'in_progress',
          current_section: 'listening',
          section_started_at: new Date().toISOString(),
          section_time_remaining: {
            listening: 40 * 60,
            reading: 60 * 60,
            writing: 60 * 60,
            speaking: 14 * 60,
          },
          answers: { meta: { test_variant: testVariant } },
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('فشل إنشاء محاولة الاختبار')
      return { attemptId: data.id, resumed: false }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mock-attempts'] })
    },
  })
}

// ─── Auto-assemble a random mock ────────────────────────────
export function useAutoAssembleMock() {
  const qc = useQueryClient()
  const startMut = useStartMockAttempt()
  return useMutation({
    mutationFn: async ({ studentId, testVariant = 'academic' }) => {
      // 1. Fetch published content
      const [passRes, lisRes, writRes, spkRes] = await Promise.all([
        supabase.from('ielts_reading_passages')
          .select('id, difficulty_band')
          .eq('is_published', true),
        supabase.from('ielts_listening_sections')
          .select('id, section_number, test_id')
          .eq('is_published', true),
        supabase.from('ielts_writing_tasks')
          .select('id, task_type')
          .eq('is_published', true),
        supabase.from('ielts_speaking_questions')
          .select('id, part, questions, cue_card')
          .eq('is_published', true),
      ])
      if (passRes.error) throw passRes.error
      if (lisRes.error) throw lisRes.error
      if (writRes.error) throw writRes.error
      if (spkRes.error) throw spkRes.error

      // 2. Pick 3 reading passages (1 per difficulty band)
      const passages = passRes.data || []
      const byBand = {}
      for (const p of passages) {
        const b = p.difficulty_band || 'other'
        if (!byBand[b]) byBand[b] = []
        byBand[b].push(p.id)
      }
      const pickedPassageIds = []
      const bands = ['band_5_6', 'band_6_7', 'band_7_8']
      for (const band of bands) {
        const arr = byBand[band] || []
        if (arr.length > 0) pickedPassageIds.push(arr[Math.floor(Math.random() * arr.length)])
      }
      // Fill remaining if fewer than 3 distinct bands
      const remaining = passages.filter(p => !pickedPassageIds.includes(p.id))
      while (pickedPassageIds.length < 3 && remaining.length > 0) {
        const idx = Math.floor(Math.random() * remaining.length)
        pickedPassageIds.push(remaining[idx].id)
        remaining.splice(idx, 1)
      }
      if (pickedPassageIds.length < 3) throw new Error('لا يوجد ما يكفي من مقاطع القراءة المنشورة (مطلوب 3 على الأقل)')

      // 3. Pick listening: find test_id with all 4 section_numbers
      const sections = lisRes.data || []
      const testIdMap = {}
      for (const s of sections) {
        if (!testIdMap[s.test_id]) testIdMap[s.test_id] = new Set()
        testIdMap[s.test_id].add(s.section_number)
      }
      let bestTestId = null
      for (const [tid, nums] of Object.entries(testIdMap)) {
        if (nums.has(1) && nums.has(2) && nums.has(3) && nums.has(4)) {
          bestTestId = tid
          break
        }
      }
      if (!bestTestId) {
        // fallback: pick the test_id with most section coverage
        bestTestId = Object.entries(testIdMap).sort((a, b) => b[1].size - a[1].size)[0]?.[0]
      }
      if (!bestTestId) throw new Error('لا يوجد ما يكفي من أقسام الاستماع المنشورة')

      // 4. Pick writing tasks
      const writingTasks = writRes.data || []
      const task1s = writingTasks.filter(t => t.task_type === 'task1')
      const task2s = writingTasks.filter(t => t.task_type === 'task2')
      if (task1s.length === 0) throw new Error('لا يوجد مهمة كتابة 1 منشورة')
      if (task2s.length === 0) throw new Error('لا يوجد مهمة كتابة 2 منشورة')
      const task1 = task1s[Math.floor(Math.random() * task1s.length)]
      const task2 = task2s[Math.floor(Math.random() * task2s.length)]

      // 5. Pick speaking questions (3 Part1 + 1 Part2 + 3 Part3)
      const spkQs = spkRes.data || []
      const p1s = spkQs.filter(q => q.part === 1)
      const p2s = spkQs.filter(q => q.part === 2)
      const p3s = spkQs.filter(q => q.part === 3)
      if (p1s.length < 3 || p2s.length < 1 || p3s.length < 3)
        throw new Error('لا يوجد ما يكفي من أسئلة المحادثة المنشورة')
      const pick = (arr, n) => {
        const shuffled = [...arr].sort(() => Math.random() - 0.5)
        return shuffled.slice(0, n)
      }
      const speakingQuestions = {
        part1: pick(p1s, 3).map(q => ({ id: q.id, questions: q.questions, part: 1 })),
        part2: [{ id: p2s[Math.floor(Math.random() * p2s.length)].id, cue_card: p2s[0].cue_card, part: 2 }],
        part3: pick(p3s, 3).map(q => ({ id: q.id, questions: q.questions, part: 3 })),
      }

      // 6. Insert ephemeral ielts_mock_tests row
      const ephemeralTestNum = -Math.floor(Date.now() / 1000)
      const { data: mockRow, error: mkErr } = await supabase
        .from('ielts_mock_tests')
        .insert({
          test_number: ephemeralTestNum,
          title_ar: 'جلسة محاكاة عشوائية',
          title_en: 'Random Full Mock',
          is_published: false,
          reading_passage_ids: pickedPassageIds,
          writing_task1_id: task1.id,
          writing_task2_id: task2.id,
          listening_test_id: bestTestId,
          speaking_questions: speakingQuestions,
          total_time_minutes: 165,
        })
        .select('id')
        .single()
      if (mkErr || !mockRow?.id) throw new Error('فشل إنشاء الاختبار العشوائي: ' + (mkErr?.message || ''))

      // 7. Start attempt
      const { attemptId } = await startMut.mutateAsync({ studentId, mockTestId: mockRow.id, testVariant })
      return { attemptId, mockTestId: mockRow.id }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mock-catalog'] })
      qc.invalidateQueries({ queryKey: ['mock-attempts'] })
    },
  })
}

// ─── Auto-save patch ─────────────────────────────────────────
export function useAutoSaveMockAttempt() {
  return useMutation({
    mutationFn: async ({ attemptId, patch }) => {
      const { data, error } = await supabase
        .from('ielts_mock_attempts')
        .update({ ...patch, auto_saved_at: new Date().toISOString() })
        .eq('id', attemptId)
        .select('id')
        .single()
      if (error) throw error
      if (!data?.id) throw new Error('Auto-save failed')
      return data
    },
  })
}

// ─── Advance section ─────────────────────────────────────────
export function useAdvanceMockSection() {
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
      if (!data?.id) throw new Error('Section advance failed')
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mock-attempt', vars.attemptId] })
    },
  })
}

// ─── Submit mock (triggers edge function) ───────────────────
export function useSubmitMock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ attemptId }) => {
      const { data, error } = await invokeWithRetry(
        'complete-ielts-mock',
        { body: { attempt_id: attemptId } },
        { timeoutMs: 240000 }
      )
      if (error) throw new Error(error)
      if (!data?.result_id) throw new Error('نتيجة التقييم غير مكتملة')
      return data
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['mock-attempt', vars.attemptId] })
      qc.invalidateQueries({ queryKey: ['mock-attempts'] })
      qc.invalidateQueries({ queryKey: ['mock-history'] })
      qc.invalidateQueries({ queryKey: ['ielts-latest-result'] })
      qc.invalidateQueries({ queryKey: ['ielts-mock-attempts'] })
    },
  })
}

// ─── Single mock result ──────────────────────────────────────
export function useMockResult(resultId, studentId) {
  return useQuery({
    queryKey: ['mock-result', resultId],
    enabled: !!resultId && !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_results')
        .select('*')
        .eq('id', resultId)
        .eq('student_id', studentId)
        .single()
      if (error) throw error
      return data
    },
  })
}

// ─── Mock content for flow (passages + sections + tasks) ─────
export function useMockContent(attempt) {
  const mock = attempt?.ielts_mock_tests
  return useQuery({
    queryKey: ['mock-content', mock?.id],
    enabled: !!mock?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const [passRes, lisRes, writRes] = await Promise.all([
        supabase.from('ielts_reading_passages')
          .select('*')
          .in('id', mock.reading_passage_ids || []),
        supabase.from('ielts_listening_sections')
          .select('*')
          .eq('test_id', mock.listening_test_id)
          .order('section_number'),
        supabase.from('ielts_writing_tasks')
          .select('*')
          .in('id', [mock.writing_task1_id, mock.writing_task2_id].filter(Boolean)),
      ])
      return {
        passages: passRes.data || [],
        listening: lisRes.data || [],
        writing: writRes.data || [],
        speaking: mock.speaking_questions || {},
      }
    },
  })
}
