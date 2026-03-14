import { useState, useRef, useEffect, useCallback } from 'react'
import { invokeWithRetry } from '../lib/invokeWithRetry'

/**
 * Hook for calling AI edge functions with auto-abort on unmount.
 *
 * @param {string} functionName - Edge function name
 * @param {object} config - { timeoutMs, retries }
 * @returns {{ call, loading, error, data, reset }}
 */
export function useAICall(functionName, config = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const mountedRef = useRef(true)
  const controllerRef = useRef(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  const call = useCallback(async (body = {}, headers = {}) => {
    // Abort any in-flight request
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setLoading(true)
    setError(null)
    setData(null)

    const res = await invokeWithRetry(
      functionName,
      { body, headers },
      { ...config, signal: controller.signal }
    )

    if (!mountedRef.current) return null

    if (res.error) {
      const errMsg = typeof res.error === 'object' ? (res.error.message || 'خطأ غير متوقع') : String(res.error)
      setError(errMsg)
      setLoading(false)
      return null
    }

    // Check for error in response body
    if (res.data?.error) {
      setError(typeof res.data.error === 'string' ? res.data.error : 'خطأ في المعالجة')
      setLoading(false)
      return null
    }

    setData(res.data)
    setLoading(false)
    return res.data
  }, [functionName, config])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setLoading(false)
    setError(null)
    setData(null)
  }, [])

  return { call, loading, error, data, reset }
}
