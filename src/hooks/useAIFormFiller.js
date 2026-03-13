import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

/**
 * useAIFormFiller – custom hook for AI-powered form filling.
 *
 * @param {Object} config
 * @param {string}              config.pageId          – identifier for the page / form (e.g. 'create-assignment')
 * @param {Array<Object>}       config.fields          – schema: [{ key, type, label, options?, required? }]
 * @param {string}              config.context         – short description of what the form does
 * @param {Function}            config.onFill          – callback(filledFields) invoked on success
 * @param {Function}            config.getContextData  – async () => contextData (groups, students, date, etc.)
 */
export function useAIFormFiller({ pageId, fields, context, onFill, getContextData }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [userPrompt, setUserPrompt] = useState('')
  const [result, setResult] = useState(null)      // { filledFields, filledCount }
  const [error, setError] = useState(null)
  const [unfilled, setUnfilled] = useState([])     // labels of fields the AI couldn't determine

  /**
   * processRequest – send the user's natural-language message to the AI edge function.
   * @param {string} message – free-text instruction in Arabic or English
   */
  const processRequest = useCallback(async (message) => {
    if (!message?.trim()) return

    setIsProcessing(true)
    setError(null)
    setResult(null)
    setUnfilled([])
    setUserPrompt(message)

    try {
      // 1. Gather dynamic context (groups list, students, current date, etc.)
      const contextData = getContextData ? await getContextData() : {}

      // 2. Get the current session token for the edge function
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('يجب تسجيل الدخول أولاً')
      }

      // 3. Call the Supabase edge function
      const { data, error: fnError } = await supabase.functions.invoke('ai-form-filler', {
        body: {
          pageId,
          formSchema: fields,
          userMessage: message.trim(),
          contextData: {
            ...contextData,
            formContext: context,
          },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (fnError) throw fnError

      if (!data?.filledFields) {
        throw new Error('لم أتمكن من فهم الطلب — حاول مرة أخرى بصياغة مختلفة')
      }

      const filledFields = data.filledFields
      const filledKeys = Object.keys(filledFields)

      // 4. Determine which required/expected fields the AI could NOT fill
      const unfilledFields = fields
        .filter(f => !filledKeys.includes(f.key))
        .map(f => f.label)

      // 5. Update state
      const filledCount = filledKeys.length
      setResult({ filledFields, filledCount })
      setUnfilled(unfilledFields)

      // 6. Pass the filled values back to the form
      if (onFill) {
        onFill(filledFields)
      }
    } catch (err) {
      console.error('[useAIFormFiller] error:', err)
      setError(err.message || 'حدث خطأ أثناء المعالجة')
    } finally {
      setIsProcessing(false)
    }
  }, [pageId, fields, context, onFill, getContextData])

  /**
   * reset – clear all AI fill state so the panel starts fresh.
   */
  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setUnfilled([])
    setUserPrompt('')
  }, [])

  return {
    // State
    isOpen,
    setIsOpen,
    isProcessing,
    userPrompt,
    result,
    error,
    unfilled,

    // Actions
    processRequest,
    reset,
  }
}
