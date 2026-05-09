import { supabase } from './supabase'
import { toast } from '../components/ui/FluentiaToast'

// Create a fresh in_progress attempt.
// Returns the new attempt id, or null on failure (toast shown).
export async function startNewAttempt(activityId, studentId) {
  const { data, error } = await supabase
    .from('activity_attempts')
    .insert({
      student_id:  studentId,
      activity_id: activityId,
      // status defaults to 'in_progress'; attempt_number auto-set by trigger
    })
    .select('id')
    .single()

  if (error) {
    toast({ type: 'error', title: 'ما قدرنا نبدأ المحاولة الآن. حاولي مرة ثانية بعد لحظات.' })
    console.error('[attempts] startNewAttempt failed:', error)
    return null
  }
  return data.id
}

// Mark currentAttemptId as abandoned, then create a fresh one.
// Returns the new attempt id, or null on any failure.
export async function abandonAndStartNew(currentAttemptId, activityId, studentId) {
  const res = await supabase.functions.invoke('abandon-attempt', {
    body: { attempt_id: currentAttemptId },
  })
  if (res.error) {
    toast({ type: 'error', title: 'ما قدرنا نلغي المحاولة الحالية. حاولي مرة ثانية.' })
    console.error('[attempts] abandon-attempt failed:', res.error)
    return null
  }
  return startNewAttempt(activityId, studentId)
}

// Autosave answers (debounced via caller).
// Only updates the `answers` column — RLS guarantees nothing else changes.
export async function autosaveAnswers(attemptId, answers) {
  const { error } = await supabase
    .from('activity_attempts')
    .update({ answers })
    .eq('id', attemptId)

  if (error) {
    console.error('[attempts] autosave failed:', error)
  }
}

// Submit attempt via edge function.
// Returns { score, correct_count, total_questions, passed } or null on error.
export async function submitAttempt(attemptId) {
  const { data, error } = await supabase.functions.invoke('submit-activity-attempt', {
    body: { attempt_id: attemptId },
  })
  if (error) {
    toast({ type: 'error', title: 'ما تم تسليم المحاولة. حاولي مرة ثانية.' })
    console.error('[attempts] submit failed:', error)
    return null
  }
  return data
}
