import { Outlet, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

/**
 * MockExamGate
 *
 * Wraps /student/mock-exam routes. Reads the student's academic_level,
 * resolves the matching active mock_exam row (preview gate applied
 * server-side via RPC), and renders <Outlet/> if eligible.
 *
 * If no exam matches the student's level → redirects to dashboard.
 */
export default function MockExamGate() {
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const role = profile?.role
  const academicLevel = studentData?.academic_level
  const isTestAccount = profile?.is_test_account === true
  const isStaff = role === 'admin' || role === 'trainer'

  const { data: examInfo, isLoading } = useQuery({
    queryKey: ['mock-exam-eligibility', academicLevel],
    queryFn: async () => {
      if (!academicLevel && !isStaff) return null
      const { data, error } = await supabase
        .from('mock_exams')
        .select('id, code, title_ar, visibility, level_id, level:curriculum_levels(level_number)')
        .eq('is_active', true)
      if (error) throw error
      const filtered = (data || []).filter((e) => {
        // Visibility gate
        if (e.visibility === 'live') return true
        if (e.visibility === 'preview' && (isTestAccount || isStaff)) return true
        return false
      })
      // For students: match level. For staff: any active exam unlocks the gate (but they pick which to take via the hub).
      if (isStaff) return filtered[0] || null
      const match = filtered.find((e) => e.level?.level_number === academicLevel)
      return match || null
    },
    staleTime: 30_000,
    enabled: !!profile?.id,
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" dir="rtl">
        <div className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>...جاري التحميل</div>
      </div>
    )
  }

  if (!examInfo) {
    // Student whose level has no matching exam → bounce back to dashboard.
    return <Navigate to="/student" replace />
  }

  return <Outlet context={{ examInfo }} />
}
