import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { invokeWithRetry } from '@/lib/invokeWithRetry'

const STALE = 30 * 1000
const SPEAKING_LIMITS = { asas: 5, talaqa: 10, tamayuz: 20, ielts: 30 }

// Published questions for a part
export function useSpeakingQuestions(partNum) {
  return useQuery({
    queryKey: ['ielts-speaking-questions', partNum],
    enabled: !!partNum,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_speaking_questions')
        .select('id, part, topic, questions, cue_card, useful_phrases, band_descriptors, sort_order')
        .eq('part', partNum)
        .eq('is_published', true)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
  })
}

// Per-part rolling bands + session counts from ielts_skill_sessions
export function useSpeakingProgress(studentId) {
  return useQuery({
    queryKey: ['ielts-speaking-progress', studentId],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('question_type, band_score, completed_at, duration_seconds')
        .eq('student_id', studentId)
        .eq('skill_type', 'speaking')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
      if (error) throw error

      const parts = { part_1: [], part_2: [], part_3: [] }
      for (const s of data || []) {
        if (parts[s.question_type]) parts[s.question_type].push(s)
      }

      const result = {}
      for (const [key, sessions] of Object.entries(parts)) {
        if (sessions.length === 0) { result[key] = null; continue }
        // 60/40 weighted: last 3 sessions = 60%, older = 40%
        const recent = sessions.slice(0, 3)
        const older = sessions.slice(3, 5)
        const recentBands = recent.map(s => Number(s.band_score)).filter(b => !isNaN(b))
        const olderBands = older.map(s => Number(s.band_score)).filter(b => !isNaN(b))
        let rollingBand = null
        if (recentBands.length > 0 && olderBands.length > 0) {
          const recentAvg = recentBands.reduce((a, b) => a + b, 0) / recentBands.length
          const olderAvg = olderBands.reduce((a, b) => a + b, 0) / olderBands.length
          rollingBand = Math.round((0.6 * recentAvg + 0.4 * olderAvg) * 2) / 2
        } else if (recentBands.length > 0) {
          rollingBand = Math.round((recentBands.reduce((a, b) => a + b, 0) / recentBands.length) * 2) / 2
        }
        result[key] = {
          rolling_band: rollingBand,
          session_count: sessions.length,
          last_session_at: sessions[0]?.completed_at,
        }
      }
      return result
    },
  })
}

// Single session for feedback screen
export function useSpeakingSession(sessionId, studentId) {
  return useQuery({
    queryKey: ['ielts-speaking-session', sessionId],
    enabled: !!sessionId && !!studentId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('student_id', studentId)
        .single()
      if (error) throw error
      return data
    },
  })
}

// Past sessions (history)
export function useSpeakingHistory(studentId, limit = 20) {
  return useQuery({
    queryKey: ['ielts-speaking-history', studentId, limit],
    enabled: !!studentId,
    staleTime: STALE,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_skill_sessions')
        .select('id, question_type, band_score, started_at, completed_at, duration_seconds, session_data')
        .eq('student_id', studentId)
        .eq('skill_type', 'speaking')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data || []
    },
  })
}

// Monthly speaking quota (counts speaking_analysis in ai_usage)
export function useSpeakingQuota(studentId, studentData) {
  return useQuery({
    queryKey: ['ielts-speaking-quota', studentId],
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
        .eq('type', 'speaking_analysis')
        .gte('created_at', startOfMonth.toISOString())
      if (error) throw error

      const override = studentData.writing_limit_override
      const limit = override ?? SPEAKING_LIMITS[studentData.package] ?? 5

      return {
        used: count || 0,
        limit,
        remaining: Math.max(0, limit - (count || 0)),
      }
    },
  })
}

// Submit a speaking session: upload audio → evaluate → save to DB
export function useSubmitSpeakingSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      studentId,
      partNum,
      questionRowId,
      questions,       // string[] — question text
      cueCard,         // object | null (Part 2 only)
      recordings,      // [{ blob, duration, mimeType, extension }]
    }) => {
      const sessionTimestamp = Date.now()
      const uploadedPaths = []

      // 1. Upload each recording to storage
      for (let i = 0; i < recordings.length; i++) {
        const rec = recordings[i]
        if (!rec?.blob) { uploadedPaths.push(null); continue }

        const path = `${studentId}/${sessionTimestamp}/q${i}.${rec.extension || 'webm'}`
        const { error: upErr } = await supabase.storage
          .from('ielts-speaking-submissions')
          .upload(path, rec.blob, {
            contentType: rec.mimeType || 'audio/webm',
            upsert: false,
          })
        if (upErr) throw new Error(`فشل رفع التسجيل ${i + 1}: ${upErr.message}`)
        uploadedPaths.push(path)
      }

      const validPaths = uploadedPaths.filter(Boolean)
      if (validPaths.length === 0) throw new Error('لم يتم رفع أي تسجيل بنجاح')

      // 2. Call evaluate-ielts-speaking edge function
      const { data, error } = await invokeWithRetry(
        'evaluate-ielts-speaking',
        {
          body: {
            audio_paths: validPaths,
            part_num: partNum,
            questions: questions,
            cue_card: cueCard || null,
          },
        },
        { timeoutMs: 180000 }
      )

      if (error) throw new Error(error)
      if (!data?.overall_band) throw new Error('نتيجة التقييم غير مكتملة')

      const band = Number(data.overall_band)
      if (isNaN(band) || band < 0 || band > 9) throw new Error('نتيجة Band خارج النطاق')

      const totalDuration = recordings.reduce((s, r) => s + (r?.duration || 0), 0)
      const now = new Date().toISOString()
      const startedAt = new Date(sessionTimestamp).toISOString()

      // 3. Insert ielts_skill_sessions
      const { data: sessionRow, error: sessErr } = await supabase
        .from('ielts_skill_sessions')
        .insert({
          student_id: studentId,
          skill_type: 'speaking',
          question_type: `part_${partNum}`,
          source_id: questionRowId,
          band_score: band,
          duration_seconds: totalDuration,
          started_at: startedAt,
          completed_at: now,
          session_data: {
            part_num: partNum,
            question_row_id: questionRowId,
            questions,
            transcripts: data.transcripts || [],
            audio_paths: uploadedPaths,
            criteria: data.criteria || {},
            feedback_ar: data.feedback_ar || '',
            strengths: data.strengths || [],
            weaknesses: data.weaknesses || [],
            per_question_feedback: data.per_question_feedback || [],
          },
        })
        .select('id')
        .single()
      if (sessErr || !sessionRow) throw sessErr || new Error('فشل حفظ الجلسة')

      // 4. Upsert progress
      const questionTypeKey = `part_${partNum}`
      const { data: existing } = await supabase
        .from('ielts_student_progress')
        .select('*')
        .eq('student_id', studentId)
        .eq('skill_type', 'speaking')
        .eq('question_type', questionTypeKey)
        .maybeSingle()

      const prevAttempts = existing?.attempts_count || 0
      const prevTime = existing?.total_time_seconds || 0
      const newBand = existing?.estimated_band != null
        ? Math.round(((0.4 * Number(existing.estimated_band)) + (0.6 * band)) * 2) / 2
        : band

      await supabase.from('ielts_student_progress').upsert({
        student_id: studentId,
        skill_type: 'speaking',
        question_type: questionTypeKey,
        attempts_count: prevAttempts + 1,
        total_time_seconds: prevTime + totalDuration,
        estimated_band: newBand,
        last_attempt_at: now,
        updated_at: now,
      }, { onConflict: 'student_id,skill_type,question_type' })

      return { sessionId: sessionRow.id, band }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['ielts-speaking-progress', vars.studentId] })
      qc.invalidateQueries({ queryKey: ['ielts-speaking-history', vars.studentId] })
      qc.invalidateQueries({ queryKey: ['ielts-speaking-quota', vars.studentId] })
      qc.invalidateQueries({ queryKey: ['ielts-progress'] })
    },
  })
}
