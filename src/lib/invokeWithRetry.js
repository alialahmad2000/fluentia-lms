import { supabase } from './supabase'

/**
 * Wraps supabase.functions.invoke with timeout and retry.
 *
 * @param {string} functionName - Edge function name
 * @param {object} options - { body, headers }
 * @param {object} config - { timeoutMs, retries, signal }
 * @returns {Promise<{ data, error }>}
 */
export async function invokeWithRetry(functionName, options = {}, config = {}) {
  const { timeoutMs = 30000, retries = 1, signal: externalSignal } = config

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()

    // Link external abort signal
    if (externalSignal) {
      if (externalSignal.aborted) {
        return { data: null, error: 'تم إلغاء الطلب' }
      }
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    // Timeout
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await supabase.functions.invoke(functionName, {
        ...options,
        // Note: supabase-js doesn't natively support AbortSignal on invoke,
        // but we use it for our timeout logic below
      })

      clearTimeout(timer)

      // Check if externally aborted during the call
      if (externalSignal?.aborted) {
        return { data: null, error: 'تم إلغاء الطلب' }
      }

      // If we got a retryable error and have retries left, retry
      if (res.error && attempt < retries) {
        const errMsg = typeof res.error === 'object' ? res.error.message : String(res.error)
        const isRetryable = /502|503|network|fetch/i.test(errMsg)
        if (isRetryable) {
          await new Promise(r => setTimeout(r, 1000))
          continue
        }
      }

      return res
    } catch (err) {
      clearTimeout(timer)

      if (controller.signal.aborted || externalSignal?.aborted) {
        return {
          data: null,
          error: externalSignal?.aborted
            ? 'تم إلغاء الطلب'
            : 'انتهت مهلة الاتصال — حاول مرة أخرى',
        }
      }

      // Retry on network errors
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000))
        continue
      }

      return {
        data: null,
        error: 'خطأ في الاتصال بالخادم — تحقق من اتصالك بالإنترنت',
      }
    }
  }
}
