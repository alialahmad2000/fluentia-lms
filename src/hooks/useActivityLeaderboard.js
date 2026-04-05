import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useActivityLeaderboard(type, unitId, studentId, groupId) {
  return useQuery({
    queryKey: ['activity-leaderboard', type, unitId, groupId],
    queryFn: async () => {
      // Step 1: Get all students in the same group
      const { data: groupStudents, error: gsError } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'active')

      if (gsError) throw gsError
      if (!groupStudents?.length) return { rankings: [], currentRank: null, totalSubmitted: 0, totalInGroup: 0 }

      const studentIds = groupStudents.map(s => s.id)
      let rankings = []

      if (type === 'writing') {
        const { data: progress, error: pError } = await supabase
          .from('student_curriculum_progress')
          .select('student_id, ai_feedback, updated_at')
          .eq('unit_id', unitId)
          .eq('section_type', 'writing')
          .in('student_id', studentIds)
          .not('ai_feedback', 'is', null)

        if (pError) throw pError

        rankings = (progress || []).map(p => {
          const fb = typeof p.ai_feedback === 'string' ? JSON.parse(p.ai_feedback) : p.ai_feedback
          if (!fb) return null
          const grammar = fb.grammar_score || 0
          const vocabulary = fb.vocabulary_score || 0
          const fluency = fb.fluency_score || 0
          const count = [fb.grammar_score, fb.vocabulary_score, fb.fluency_score].filter(v => v != null).length || 1
          const avg = Math.round(((grammar + vocabulary + fluency) / count) * 10) / 10

          const student = groupStudents.find(s => s.id === p.student_id)
          const name = student?.profiles?.display_name || student?.profiles?.full_name || 'طالب'
          return {
            studentId: p.student_id,
            name: name.split(' ')[0],
            avatar: student?.profiles?.avatar_url,
            avgScore: avg,
            submittedAt: p.updated_at,
          }
        }).filter(Boolean).sort((a, b) => b.avgScore - a.avgScore)

      } else if (type === 'speaking') {
        const { data: recordings, error: rError } = await supabase
          .from('speaking_recordings')
          .select('student_id, ai_evaluation, created_at')
          .eq('unit_id', unitId)
          .in('student_id', studentIds)
          .not('ai_evaluation', 'is', null)

        if (rError) throw rError

        // Take latest per student
        const latestByStudent = {}
        ;(recordings || []).forEach(r => {
          if (!latestByStudent[r.student_id] || new Date(r.created_at) > new Date(latestByStudent[r.student_id].created_at)) {
            latestByStudent[r.student_id] = r
          }
        })

        rankings = Object.values(latestByStudent).map(r => {
          const ev = typeof r.ai_evaluation === 'string' ? JSON.parse(r.ai_evaluation) : r.ai_evaluation
          if (!ev) return null
          const grammar = ev.grammar_score || 0
          const vocabulary = ev.vocabulary_score || 0
          const fluency = ev.fluency_score || 0
          const confidence = ev.confidence_score || 0
          const vals = [ev.grammar_score, ev.vocabulary_score, ev.fluency_score, ev.confidence_score].filter(v => v != null)
          const count = vals.length || 1
          const total = grammar + vocabulary + fluency + confidence
          const avg = Math.round((total / count) * 10) / 10

          const student = groupStudents.find(s => s.id === r.student_id)
          const name = student?.profiles?.display_name || student?.profiles?.full_name || 'طالب'
          return {
            studentId: r.student_id,
            name: name.split(' ')[0],
            avatar: student?.profiles?.avatar_url,
            avgScore: avg,
            submittedAt: r.created_at,
          }
        }).filter(Boolean).sort((a, b) => b.avgScore - a.avgScore)
      }

      // Assign ranks (handle ties)
      let currentRank = 1
      rankings.forEach((r, i) => {
        if (i > 0 && r.avgScore < rankings[i - 1].avgScore) currentRank = i + 1
        r.rank = currentRank
      })

      const myRanking = rankings.find(r => r.studentId === studentId)

      return {
        rankings,
        currentRank: myRanking?.rank || null,
        totalSubmitted: rankings.length,
        totalInGroup: groupStudents.length,
      }
    },
    enabled: !!unitId && !!groupId && !!studentId,
    staleTime: 30000,
  })
}
