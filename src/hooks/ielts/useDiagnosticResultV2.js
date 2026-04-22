import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

const SKILL_LABELS = {
  listening: 'الاستماع',
  reading:   'القراءة',
  writing:   'الكتابة',
  speaking:  'المحادثة',
}

// Reads the most recent diagnostic/mock result for the Results page.
// Returns the "Proposed Results hook shape" from the discovery doc.
export function useDiagnosticResultV2() {
  const profile = useAuthStore((s) => s.profile)
  const profileId = profile?.id

  return useQuery({
    queryKey: ['ielts-v2-diagnostic-result', profileId],
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ielts_student_results')
        .select('id, result_type, overall_band, reading_score, listening_score, writing_score, speaking_score, strengths, weaknesses, created_at')
        .eq('student_id', profileId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error

      if (!data) {
        return {
          hasResult: false,
          attemptId: null,
          completedAt: null,
          overallBand: null,
          skills: null,
          strengthSkills: [],
          weaknessSkills: [],
          feedbackText: null,
        }
      }

      const overall = data.overall_band ?? null
      const skills = {
        listening: data.listening_score ?? null,
        reading:   data.reading_score   ?? null,
        writing:   data.writing_score   ?? null,
        speaking:  data.speaking_score  ?? null,
      }

      const strengthSkills = Object.entries(skills)
        .filter(([, b]) => b != null && overall != null && b >= overall + 0.5)
        .map(([k]) => SKILL_LABELS[k])

      const weaknessSkills = Object.entries(skills)
        .filter(([, b]) => b != null && overall != null && b <= overall - 0.5)
        .map(([k]) => SKILL_LABELS[k])

      return {
        hasResult: true,
        attemptId: data.id,
        completedAt: data.created_at ? new Date(data.created_at) : null,
        overallBand: overall,
        skills,
        strengthSkills,
        weaknessSkills,
        feedbackText: null,
      }
    },
  })
}
