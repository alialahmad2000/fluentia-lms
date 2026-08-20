import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Resolves the units a GIVEN STUDENT actually sees — so the teacher prepares
 * against the real thing, not a generic level listing.
 *
 * Mirrors the student-side rule in pages/student/curriculum/_useCurriculumData.js:
 *   custom-curriculum student → only their own published units, by custom_sort
 *   everyone else            → the generic units of their level (owner_student_id IS NULL)
 * If that rule ever changes there, it has to change here too, or the teacher is
 * preparing from a different syllabus than the student is studying.
 */

const SECTION_LABELS = {
  reading: 'القراءة',
  listening: 'الاستماع',
  grammar: 'القواعد',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  vocabulary: 'المفردات',
  vocabulary_exercise: 'تمرين المفردات',
  assessment: 'التقييم',
  pronunciation: 'النُطق',
  recording: 'تسجيل الحصة',
}

export function sectionLabel(type) {
  return SECTION_LABELS[type] || type || '—'
}

export function useStudentContent(studentId) {
  return useQuery({
    queryKey: ['teacher-student-content', studentId],
    enabled: !!studentId,
    staleTime: 120_000,
    queryFn: async () => {
      const { data: student, error: sErr } = await supabase
        .from('students')
        .select('id, academic_level, uses_custom_curriculum, uses_standard_curriculum, profiles(display_name, full_name)')
        .eq('id', studentId)
        .single()
      if (sErr) throw sErr

      let units = []
      let level = null

      if (student.uses_custom_curriculum === true) {
        const { data, error } = await supabase
          .from('curriculum_units')
          .select('id, unit_number, theme_ar, theme_en, description_ar, cover_image_url, custom_sort, is_published, owner_student_id, level_id')
          .eq('owner_student_id', studentId)
          .eq('is_published', true)
          .order('custom_sort', { ascending: true, nullsFirst: false })
        if (error) throw error
        units = data || []
      } else {
        const { data: lvl, error: lErr } = await supabase
          .from('curriculum_levels')
          .select('id, level_number, name_ar, name_en')
          .eq('level_number', student.academic_level ?? 0)
          .maybeSingle()
        if (lErr) throw lErr
        level = lvl
        if (lvl?.id) {
          const { data, error } = await supabase
            .from('curriculum_units')
            .select('id, unit_number, theme_ar, theme_en, description_ar, cover_image_url, custom_sort, is_published, owner_student_id, level_id')
            .eq('level_id', lvl.id)
            .is('owner_student_id', null)
            .order('unit_number')
          if (error) throw error
          units = data || []
        }
      }

      const unitIds = units.map((u) => u.id)

      // DB-computed per-unit percentage, when the trigger has run for this unit.
      let progressByUnit = {}
      if (unitIds.length) {
        const { data: up } = await supabase
          .from('unit_progress')
          .select('unit_id, numerator, denominator, percentage, updated_at')
          .eq('student_id', studentId)
          .in('unit_id', unitIds)
        for (const row of up || []) progressByUnit[row.unit_id] = row
      }

      // Section-level detail: what they actually opened, scored and when.
      let sectionsByUnit = {}
      if (unitIds.length) {
        const { data: scp } = await supabase
          .from('student_curriculum_progress')
          .select('unit_id, section_type, status, score, completed_at, time_spent_seconds, is_best')
          .eq('student_id', studentId)
          .in('unit_id', unitIds)
          .order('completed_at', { ascending: false, nullsFirst: false })
        for (const row of scp || []) {
          const list = (sectionsByUnit[row.unit_id] ||= [])
          // Keep the best/most recent row per section type.
          if (!list.some((r) => r.section_type === row.section_type)) list.push(row)
        }
      }

      return {
        student,
        level,
        isCustom: student.uses_custom_curriculum === true,
        units: units.map((u) => ({
          ...u,
          progress: progressByUnit[u.id] || null,
          sections: sectionsByUnit[u.id] || [],
        })),
      }
    },
  })
}
