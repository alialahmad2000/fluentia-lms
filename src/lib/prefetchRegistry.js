/**
 * Prefetch Registry — maps route paths to prefetch functions.
 *
 * Each prefetcher uses the EXACT same queryKey and queryFn as the destination
 * page's primary useQuery. A mismatch means the cache won't be reused.
 *
 * Called by Sidebar / MobileBar / MobileDrawer on hover / focus / touchstart.
 * Fire-and-forget — never blocks UI. TanStack dedupes in-flight requests.
 *
 * Adding a new route:
 *   1. Identify the page's primary queryKey
 *   2. Copy the queryFn here (import shared fetcher if it exists)
 *   3. Add an entry in the map below
 */

import { queryClient } from './queryClient'
import { supabase } from './supabase'

const prefetchOnce = (queryKey, queryFn) =>
  queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: 1000 * 60 * 1,
  })

// ─── Fetchers (same logic as the page components) ─────────────────

async function fetchDashboardWeeklyProgress(profileId) {
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - now.getDay())
  sunday.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('weekly_task_sets')
    .select('id, total_tasks, completed_tasks, completion_percentage, status')
    .eq('student_id', profileId)
    .gte('week_start', sunday.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}

async function fetchCurriculumLevels() {
  const { data, error } = await supabase
    .from('curriculum_levels')
    .select('*')
    .eq('is_active', true)
    .order('level_number')
  if (error) throw error
  return data || []
}

async function fetchCurriculumUnitCounts() {
  const { data, error } = await supabase
    .from('curriculum_units')
    .select('level_id')
  if (error) throw error
  const counts = {}
  for (const u of (data || [])) {
    counts[u.level_id] = (counts[u.level_id] || 0) + 1
  }
  return counts
}

async function fetchCurriculumProgressSummary(profileId) {
  const { data, error } = await supabase
    .from('student_curriculum_progress')
    .select('unit_id, section_type, status')
    .eq('student_id', profileId)
  if (error) throw error
  if (!data || data.length === 0) return {}
  const unitIds = [...new Set(data.map(p => p.unit_id))]
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, level_id')
    .in('id', unitIds)
  const unitToLevel = {}
  for (const u of (units || [])) unitToLevel[u.id] = u.level_id
  return { progress: data, unitToLevel }
}

async function fetchProgressCurriculum(profileId) {
  const { data } = await supabase
    .from('student_curriculum_progress')
    .select('unit_id, status, completion_percentage, reading_a_completed, reading_b_completed, vocabulary_completed, grammar_completed, writing_completed, listening_completed, speaking_completed')
    .eq('student_id', profileId)
  return data || []
}

async function fetchPersonalDictionary(profileId) {
  const { data } = await supabase.rpc('get_personal_dictionary', {
    p_student_id: profileId,
    p_limit: 6,
    p_offset: 0,
    p_source: null,
    p_mastery: null,
    p_search: null,
  })
  return data || []
}

async function fetchProgressReports(profileId) {
  const { data, error } = await supabase
    .from('progress_reports')
    .select('id, type, period_start, period_end, status, data, created_at, share_token')
    .eq('student_id', profileId)
    .in('status', ['approved', 'published'])
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ─── Prefetcher map ───────────────────────────────────────────────

export const prefetchers = {
  '/student': (profileId) =>
    prefetchOnce(['dashboard-weekly-progress', profileId],
      () => fetchDashboardWeeklyProgress(profileId)),

  '/student/curriculum': (profileId) =>
    Promise.all([
      prefetchOnce(['curriculum-levels'],
        () => fetchCurriculumLevels()),
      prefetchOnce(['curriculum-unit-counts'],
        () => fetchCurriculumUnitCounts()),
      prefetchOnce(['curriculum-progress-summary', profileId],
        () => fetchCurriculumProgressSummary(profileId)),
    ]),

  '/student/progress': (profileId) =>
    prefetchOnce(['progress-curriculum', profileId],
      () => fetchProgressCurriculum(profileId)),

  '/student/flashcards': (profileId) =>
    prefetchOnce(['personalDictionary', profileId, 6, 0, null, null, null],
      () => fetchPersonalDictionary(profileId)),

  '/student/progress-reports': (profileId) =>
    prefetchOnce(['student-progress-reports', profileId],
      () => fetchProgressReports(profileId)),
}

/**
 * Public entry point. Safe to call repeatedly — TanStack dedupes in-flight
 * requests and a fresh cache entry is a no-op (prefetchQuery skips if fresh).
 */
export function prefetchRoute(path, profileId) {
  if (!profileId) return
  const fn = prefetchers[path]
  if (!fn) return
  // Fire and forget — never block UI
  Promise.resolve().then(() => fn(profileId)).catch(() => {})
}
