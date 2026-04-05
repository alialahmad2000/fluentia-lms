import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { calculateUnitStarScore } from '../utils/calculateUnitStarScore'
import { calculateUnitProgress } from '../utils/calculateUnitProgress'

export function useUnitStar(unitId, groupId) {
  return useQuery({
    queryKey: ['unit-star', unitId, groupId],
    queryFn: async () => {
      // 1. Get all active students in the group
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select('id, profiles!inner(full_name, display_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'active')

      if (sErr || !students?.length) return { star: null, rankings: [] }

      const studentIds = students.map(s => s.id)

      // 2. Get readings for this unit (for vocab lookup)
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, reading_label')
        .eq('unit_id', unitId)

      const readingA = readings?.find(r => r.reading_label === 'A')
      const readingB = readings?.find(r => r.reading_label === 'B')
      const readingIds = (readings || []).map(r => r.id)

      // 3. Batch-fetch all data
      const [
        progressRes,
        vocabRes,
        speakingRes,
        grammarRes,
        listeningRes,
        writingRes,
        speakingContentRes,
        assessmentRes,
      ] = await Promise.all([
        supabase.from('student_curriculum_progress')
          .select('student_id, section_type, status, reading_id, ai_feedback, answers, completed_at, created_at, updated_at')
          .eq('unit_id', unitId)
          .in('student_id', studentIds),
        readingIds.length > 0
          ? supabase.from('curriculum_vocabulary').select('id').in('reading_id', readingIds)
          : { data: [] },
        supabase.from('speaking_recordings')
          .select('student_id, ai_evaluation, created_at')
          .eq('unit_id', unitId)
          .in('student_id', studentIds),
        supabase.from('curriculum_grammar').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_listening').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_writing').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_speaking').select('id').eq('unit_id', unitId).limit(1),
        supabase.from('curriculum_assessments').select('id').eq('unit_id', unitId).limit(1),
      ])

      const allProgress = progressRes.data || []
      const vocabItems = vocabRes.data || []
      const vocabIds = vocabItems.map(v => v.id)
      const allSpeaking = speakingRes.data || []

      // Unit content availability
      const unitContent = {
        readingA: readingA?.id || null,
        readingB: readingB?.id || null,
        hasGrammar: grammarRes.data?.length > 0,
        hasListening: listeningRes.data?.length > 0,
        vocabTotal: vocabIds.length,
        hasWriting: writingRes.data?.length > 0,
        hasSpeaking: speakingContentRes.data?.length > 0,
        hasAssessment: assessmentRes.data?.length > 0,
      }

      // 4. Fetch vocab mastery for all students (only if vocab exists)
      let allMastery = []
      if (vocabIds.length > 0) {
        const { data } = await supabase
          .from('vocabulary_word_mastery')
          .select('student_id, vocabulary_id, mastery_level')
          .in('student_id', studentIds)
          .in('vocabulary_id', vocabIds)
        allMastery = data || []
      }

      // 5. Build timestamps for speed calc
      const allTimestamps = allProgress
        .filter(p => p.status === 'completed' || p.status === 'in_progress')
        .map(p => ({
          student_id: p.student_id,
          section_type: p.section_type,
          submitted_at: p.completed_at || p.updated_at || p.created_at,
        }))

      // Add speaking recording timestamps
      for (const s of allSpeaking) {
        allTimestamps.push({
          student_id: s.student_id,
          section_type: 'speaking',
          submitted_at: s.created_at,
        })
      }

      // Deduplicate: keep earliest per student+section_type
      const tsMap = {}
      for (const t of allTimestamps) {
        const key = `${t.student_id}:${t.section_type}`
        if (!tsMap[key] || new Date(t.submitted_at) < new Date(tsMap[key].submitted_at)) {
          tsMap[key] = t
        }
      }
      const dedupedTimestamps = Object.values(tsMap)

      // 6. Calculate score for each student
      const rankings = students.map(student => {
        const myProgress = allProgress.filter(p => p.student_id === student.id)
        const myMastery = allMastery.filter(m => m.student_id === student.id)
        const mySpeaking = allSpeaking.filter(s => s.student_id === student.id)

        const progress = calculateUnitProgress({
          unitContent,
          studentProgress: myProgress,
          vocabularyMastery: vocabIds.length > 0 ? {
            masteredCount: myMastery.filter(m => m.mastery_level === 'mastered').length,
            totalWords: vocabIds.length,
          } : null,
        })

        // Extract AI scores
        const aiScores = {}
        const writingRecord = myProgress.find(p => p.section_type === 'writing' && p.ai_feedback)
        if (writingRecord?.ai_feedback) {
          const fb = typeof writingRecord.ai_feedback === 'string'
            ? JSON.parse(writingRecord.ai_feedback) : writingRecord.ai_feedback
          aiScores.writing = {
            grammar_score: fb.grammar_score || 0,
            vocabulary_score: fb.vocabulary_score || 0,
            structure_score: fb.structure_score || 0,
            fluency_score: fb.fluency_score || 0,
          }
        }

        const latestSpeaking = mySpeaking
          .filter(s => s.ai_evaluation)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
        if (latestSpeaking?.ai_evaluation) {
          const ev = typeof latestSpeaking.ai_evaluation === 'string'
            ? JSON.parse(latestSpeaking.ai_evaluation) : latestSpeaking.ai_evaluation
          aiScores.speaking = {
            grammar_score: ev.grammar_score || 0,
            vocabulary_score: ev.vocabulary_score || 0,
            fluency_score: ev.fluency_score || 0,
            confidence_score: ev.confidence_score || 0,
          }
        }

        const myTimestamps = dedupedTimestamps.filter(t => t.student_id === student.id)

        const speakingAttempts = mySpeaking.length
        const reattempts = { writing: 0, speaking: Math.max(0, speakingAttempts - 1) }

        const starScore = calculateUnitStarScore({
          unitProgress: progress,
          aiScores,
          vocabularyMastery: vocabIds.length > 0 ? {
            masteredCount: myMastery.filter(m => m.mastery_level === 'mastered').length,
            totalWords: vocabIds.length,
          } : null,
          submissionTimestamps: myTimestamps,
          allStudentTimestamps: dedupedTimestamps,
          studentId: student.id,
          reattempts,
          improvements: { writing: false, speaking: false },
        })

        const name = (student.profiles?.display_name || student.profiles?.full_name || 'طالب').split(' ')[0]

        return {
          studentId: student.id,
          name,
          avatar: student.profiles?.avatar_url,
          ...starScore,
        }
      })

      // 7. Sort and rank
      rankings.sort((a, b) => b.totalScore - a.totalScore)
      let currentRank = 1
      rankings.forEach((r, i) => {
        if (i > 0 && r.totalScore < rankings[i - 1].totalScore) currentRank = i + 1
        r.rank = currentRank
      })

      // Star = #1 only if >= 30% completion
      const star = rankings[0]?.completionPercent >= 30 ? rankings[0] : null

      // Award XP if star exists (fire-and-forget)
      if (star) {
        awardStarXP(star.studentId, unitId).catch(() => {})
      }

      return { star, rankings }
    },
    enabled: !!unitId && !!groupId,
    staleTime: 120000,
  })
}

async function awardStarXP(studentId, unitId) {
  const { data: existing } = await supabase
    .from('xp_transactions')
    .select('id')
    .eq('student_id', studentId)
    .eq('reason', 'achievement')
    .eq('related_id', unitId)
    .limit(1)

  if (existing?.length) return

  await supabase.from('xp_transactions').insert({
    student_id: studentId,
    amount: 20,
    reason: 'achievement',
    description: 'نجم/ة الوحدة ⭐',
    related_id: unitId,
  })
}
