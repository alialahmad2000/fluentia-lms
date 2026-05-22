// V3.1 — Recording data enrichment hook
//
// V2's useUnitData doesn't include class-recording details (URL, duration,
// thumbnail, watch state). Rather than modify useUnitData, this hook does a
// parallel fetch of class_recordings + recording_progress for the unit and
// returns the consolidated shape that RecordingStation needs.
//
// Picks a `primary` recording for the station to display:
//   1. Next unwatched (no progress row OR watched_percent < 95)
//   2. Last partially-watched (highest position, < completion)
//   3. Any (the first published recording)

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useRecordingDataEnrichment(unitId, studentId) {
  const { data: recordings = [], isLoading: recordingsLoading } = useQuery({
    queryKey: ['v3.1-class-recordings', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_recordings')
        .select('id, title, google_drive_url, google_drive_file_id, thumbnail_url, duration_seconds, recorded_date, part, class_type, sort_order')
        .eq('unit_id', unitId)
        .eq('is_archive', false)
        .eq('is_visible', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
    staleTime: 5 * 60 * 1000,
  })

  const recordingIds = recordings.map(r => r.id)

  const { data: progress = [], isLoading: progressLoading } = useQuery({
    queryKey: ['v3.1-recording-progress', studentId, recordingIds.join(',')],
    queryFn: async () => {
      if (!studentId || recordingIds.length === 0) return []
      const { data, error } = await supabase
        .from('recording_progress')
        .select('recording_id, position, watched_percent, completed_at, updated_at')
        .eq('student_id', studentId)
        .in('recording_id', recordingIds)
      if (error) throw error
      return data || []
    },
    enabled: !!studentId && recordingIds.length > 0,
    staleTime: 30 * 1000,
  })

  const merged = recordings.map(r => {
    const p = progress.find(x => x.recording_id === r.id)
    return {
      ...r,
      watched_percent: p?.watched_percent ?? 0,
      position_seconds: p?.position ?? 0,
      completed_at: p?.completed_at ?? null,
      last_watched_at: p?.updated_at ?? null,
    }
  })

  const primary = pickPrimary(merged)

  return {
    recordings: merged,
    primary,
    loading: recordingsLoading || progressLoading,
  }
}

function pickPrimary(recordings) {
  if (!recordings || recordings.length === 0) return null

  // 1. Next unwatched
  const unwatched = recordings.find(r => r.watched_percent < 95)
  if (unwatched) return unwatched

  // 2. Last-watched (already 95%+ on all — pick most recently touched)
  const sortedByLastWatched = [...recordings].sort(
    (a, b) => new Date(b.last_watched_at || 0).getTime() - new Date(a.last_watched_at || 0).getTime()
  )
  if (sortedByLastWatched[0]?.last_watched_at) return sortedByLastWatched[0]

  // 3. Fallback: first by sort_order
  return recordings[0]
}
