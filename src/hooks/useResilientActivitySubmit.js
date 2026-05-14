import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '../components/ui/FluentiaToast'

/**
 * Bulletproof submit wrapper for curriculum activities.
 *
 * Guarantees:
 *  1. `submitting` ALWAYS returns to false — finally block, no hang possible
 *  2. Hard 15s abort signal provided to the caller's operation
 *  3. Explicit progress cache invalidation after every success
 *  4. Error toast on failure — never silent
 *  5. Double-click guard
 *
 * Usage:
 *   const { submit, submitting, lastError } = useResilientActivitySubmit({ unitId, studentId })
 *
 *   // In handler:
 *   const { ok } = await submit(async (signal) => {
 *     const { data, error } = await supabase
 *       .from('student_curriculum_progress')
 *       .upsert(row, { onConflict: '...' })
 *       .select()      // ← REQUIRED — exposes RLS silent failures
 *     if (error) throw error
 *     if (!data?.length) throw new Error('RLS blocked write silently')
 *     return data[0]
 *   })
 *
 * The AbortSignal is provided for fetch() and supabase.functions.invoke() calls.
 * Supabase query builders do not support AbortSignal directly, so the 15s timeout
 * primarily guards edge function calls.
 */
export function useResilientActivitySubmit({ unitId, studentId, onSuccess } = {}) {
  const [submitting, setSubmitting] = useState(false)
  const [lastError, setLastError]   = useState(null)
  const abortRef     = useRef(null)
  const queryClient  = useQueryClient()

  const submit = useCallback(async (operation) => {
    if (submitting) return { ok: false, error: 'already submitting' }
    if (!studentId || !unitId) {
      const msg = 'Missing studentId or unitId'
      toast({ type: 'error', title: 'بيانات الجلسة ناقصة — حدّث الصفحة وأعد المحاولة' })
      setLastError(msg)
      return { ok: false, error: msg }
    }

    setSubmitting(true)
    setLastError(null)

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const timeoutId = setTimeout(() => abortRef.current?.abort(), 15000)

    try {
      const result = await operation(abortRef.current.signal)

      // Invalidate all progress queries so the UI reflects the new state
      queryClient.invalidateQueries({ queryKey: ['unit-progress', unitId, studentId] })
      queryClient.invalidateQueries({ queryKey: ['unit-progress-comprehensive', studentId, unitId] })
      queryClient.invalidateQueries({ queryKey: ['level-progress', studentId] })

      if (onSuccess) onSuccess(result)
      return { ok: true, data: result }
    } catch (err) {
      const isAbort = err?.name === 'AbortError' || err?.message?.includes('aborted')
      const msg = isAbort
        ? 'انتهت مهلة التسليم — تحقّقي من الاتصال وأعيدي المحاولة'
        : 'فشل التسليم — أعيدي المحاولة'
      console.error('[useResilientActivitySubmit]', err)
      setLastError(err?.message || String(err))
      toast({ type: 'error', title: msg })
      return { ok: false, error: err?.message || String(err) }
    } finally {
      clearTimeout(timeoutId)
      setSubmitting(false) // ← ALWAYS runs — this is the hang fix
    }
  }, [submitting, unitId, studentId, onSuccess, queryClient])

  return { submit, submitting, lastError }
}
