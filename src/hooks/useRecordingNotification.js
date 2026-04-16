import { useMutation } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

/**
 * Notify all active students at a given curriculum level that a
 * class recording is available. Sends both an in-app notification
 * (via notifications table) and a web push (via send-push-notification
 * edge function) in a single call.
 *
 * Targeting is done through students.group_id -> groups.level to match
 * curriculum_levels.level_number (see INTERACTIVE_CURRICULUM_NOTES.md).
 */
export function useRecordingNotification() {
  const mutation = useMutation({
    mutationFn: async ({
      unitId,
      unitNumber,
      unitTitle,
      levelNumber,
      part,            // 'a' or 'b'
      classDate,       // ISO date string or null
    }) => {
      if (!unitId || !levelNumber || !part) {
        throw new Error('معطيات الإشعار ناقصة')
      }

      // 1. Groups at this level (match by numeric level)
      const { data: groups, error: groupsError } = await supabase
        .from('groups')
        .select('id')
        .eq('level', levelNumber)
        .eq('is_active', true)

      if (groupsError) throw groupsError
      const groupIds = (groups || []).map(g => g.id)

      if (groupIds.length === 0) {
        return { sent_count: 0, sent: 0, failed: 0 }
      }

      // 2. Active students in those groups
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .in('group_id', groupIds)
        .eq('status', 'active')
        .is('deleted_at', null)

      if (studentsError) throw studentsError
      const userIds = (students || []).map(s => s.id)

      if (userIds.length === 0) {
        return { sent_count: 0, sent: 0, failed: 0 }
      }

      // 3. Build message
      const partLabel = String(part).toUpperCase()
      const dateLabel = classDate
        ? new Date(classDate).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' })
        : 'اليوم'

      const title = 'تسجيل كلاس جديد 🎥'
      const body = `تم رفع تسجيل الكلاس — الوحدة ${unitNumber ?? ''} Part ${partLabel} (${dateLabel})`

      // 4. Fire edge function (handles in-app insert + push in one call)
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_ids: userIds,
          title,
          body,
          url: `/student/interactive-curriculum`,
          type: 'system',
          priority: 'normal',
          tag: `recording-${unitId}-${part}`,
          data: {
            unit_id: unitId,
            unit_number: unitNumber,
            unit_title: unitTitle,
            part,
            level_number: levelNumber,
            class_date: classDate,
          },
        },
      })

      if (error) throw error

      return {
        sent_count: userIds.length,
        sent: data?.sent || 0,
        failed: data?.failed || 0,
      }
    },
  })

  return {
    sendRecordingNotification: mutation.mutate,
    sendRecordingNotificationAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  }
}
