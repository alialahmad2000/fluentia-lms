import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'

/* ------------------------------------------------------------------ *
 * useLevelJourney — the data feed for the cinematic home "Journey
 * Track". Returns the student's CURRENT level with EVERY unit in it,
 * each carrying its real `cover_image_url`, live `percentage`, and a
 * derived status (completed · current "you are here" · available ·
 * locked). The current unit (first available-but-incomplete) doubles
 * as the cinematic hero backdrop + the "تابع رحلتك" deep-link.
 *
 * Mirrors useNextLesson's resolution exactly, but enriched with the
 * cover art + the full ordered track so the home can render the level
 * as an image-rich, scrollable campaign map. Nothing is faked.
 *
 * RLS-safe: curriculum_units/levels are readable by any authenticated
 * user; unit_progress is row-scoped to the student (student_id = auth.uid()).
 * ------------------------------------------------------------------ */
export function useLevelJourney(studentId, academicLevel, useCustom = false) {
  const hasLevel = academicLevel !== null && academicLevel !== undefined

  const { data: level } = useQuery({
    queryKey: ['level-journey', 'level', academicLevel],
    enabled: hasLevel,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_levels')
        .select('id, level_number, cefr, name_ar')
        .eq('level_number', academicLevel)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { data: units = [] } = useQuery({
    queryKey: useCustom
      ? ['level-journey', 'units', 'custom', studentId]
      : ['level-journey', 'units', level?.id],
    enabled: useCustom ? !!studentId : !!level?.id,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (useCustom) {
        // Fardi student → HER own PUBLISHED units (owner_student_id), ordered by
        // custom_sort. is_published lets us archive an older custom course (e.g.
        // أنوار's A2 units after she is levelled up to a deeper B1 course) without
        // it leaking into the cinematic home world.
        const { data, error } = await supabase
          .from('curriculum_units')
          .select('id, theme_ar, theme_en, unit_number, cover_image_url, level_id')
          .eq('owner_student_id', studentId)
          .eq('is_published', true)
          .order('custom_sort', { ascending: true, nullsFirst: false })
        if (error) throw error
        return data || []
      }
      // Default → generic level units only (exclude any owned/custom rows).
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('id, theme_ar, theme_en, unit_number, cover_image_url, level_id')
        .eq('level_id', level.id)
        .is('owner_student_id', null)
        .order('unit_number', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  const unitIds = units.map((u) => u.id)

  const { data: progressMap = {} } = useQuery({
    queryKey: ['level-journey', 'progress', studentId, level?.id, unitIds.length],
    enabled: !!studentId && unitIds.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unit_progress')
        .select('unit_id, percentage')
        .eq('student_id', studentId)
        .in('unit_id', unitIds)
      if (error) throw error
      const map = {}
      for (const row of data || []) {
        map[row.unit_id] = row.percentage ?? 0
      }
      return map
    },
  })

  return useMemo(() => {
    if (!units.length) {
      return { level, units: [], current: null, currentUnitId: null, currentIndex: -1, completedCount: 0 }
    }

    /* first pass: progress. Every unit in the student's current level is
       OPENABLE — the home no longer auto-locks a unit just because an
       earlier one isn't 100% (students study out of order, which made a
       skipped middle unit look "locked" while later ones were reachable).
       Deliberate per-group locks are still enforced at the unit page via
       useUnitLockedForMe; level access is still gated in CurriculumBrowser. */
    const enriched = units.map((u) => {
      const pct = Math.max(0, Math.min(100, progressMap[u.id] ?? 0))
      return { ...u, pct, completed: pct >= 100, started: pct > 0, available: true }
    })

    /* the "you are here" pin = first open-but-unfinished unit; if every
       unit is done, pin the last one so the CTA still has a destination */
    let currentIndex = enriched.findIndex((u) => u.available && !u.completed)
    if (currentIndex === -1) currentIndex = enriched.length - 1

    const withStatus = enriched.map((u, i) => ({
      ...u,
      isCurrent: i === currentIndex,
      locked: !u.available && i !== currentIndex,
      status: u.completed
        ? 'completed'
        : i === currentIndex
          ? 'current'
          : u.available
            ? 'available'
            : 'locked',
      to: `/student/curriculum/unit/${u.id}`,
    }))

    const current = withStatus[currentIndex] || null

    return {
      level,
      units: withStatus,
      current,
      currentUnitId: current?.id || null,
      currentIndex,
      completedCount: withStatus.filter((u) => u.completed).length,
    }
  }, [units, progressMap, level])
}

export default useLevelJourney
