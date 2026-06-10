// Data layer for the admin reports hub — thin useQuery wrappers over the six
// staff-gated report RPCs (migration 20260610120000_admin_reports_hub.sql).
// One RPC round-trip per tab; everything else is client-side shaping.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

async function callReport(fn, args) {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data
}

const baseOpts = {
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
}

export function useReportPulse(days) {
  return useQuery({
    queryKey: ['admin', 'reports', 'pulse', days],
    queryFn: () => callReport('admin_report_pulse', { p_days: days }),
    refetchInterval: 120_000, // keep "نشطون الآن" alive
    ...baseOpts,
  })
}

export function useReportStudents(days) {
  return useQuery({
    queryKey: ['admin', 'reports', 'students', days],
    queryFn: () => callReport('admin_report_students', { p_days: days }),
    ...baseOpts,
  })
}

export function useReportUsage(days) {
  return useQuery({
    queryKey: ['admin', 'reports', 'usage', days],
    queryFn: () => callReport('admin_report_usage', { p_days: days }),
    ...baseOpts,
  })
}

export function useReportLearning(days) {
  return useQuery({
    queryKey: ['admin', 'reports', 'learning', days],
    queryFn: () => callReport('admin_report_learning', { p_days: days }),
    ...baseOpts,
  })
}

export function useReportHealth(days) {
  return useQuery({
    queryKey: ['admin', 'reports', 'health', days],
    queryFn: () => callReport('admin_report_health', { p_days: days }),
    ...baseOpts,
  })
}

export function useStudentReportDetail(studentId, days) {
  return useQuery({
    queryKey: ['admin', 'reports', 'student-detail', studentId, days],
    queryFn: () => callReport('admin_report_student_detail', { p_student: studentId, p_days: days }),
    enabled: Boolean(studentId),
    ...baseOpts,
  })
}
