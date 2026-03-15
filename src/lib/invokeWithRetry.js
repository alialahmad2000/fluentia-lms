import { supabase } from './supabase'

/**
 * Extracts a human-readable error message from supabase.functions.invoke error.
 * FunctionsHttpError has a generic .message but the real error is in .context.
 */
function extractErrorMessage(error) {
  if (!error) return null

  // String error
  if (typeof error === 'string') return error

  // FunctionsHttpError: .context contains the response body text
  if (error.context) {
    try {
      // context may be the raw response text (JSON string)
      const parsed = typeof error.context === 'string'
        ? JSON.parse(error.context)
        : error.context
      if (parsed?.error) return parsed.error
      if (parsed?.message) return parsed.message
      if (parsed?.msg) return parsed.msg
    } catch {
      // If context is plain text, use it directly
      if (typeof error.context === 'string' && error.context.length < 500) {
        return error.context
      }
    }
  }

  // FunctionsFetchError or standard Error
  if (error.message) return error.message

  return String(error)
}

/**
 * Gets a valid access token, refreshing if needed.
 * Returns null if no session available.
 */
async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession()
    if (data?.session?.access_token) {
      return data.session.access_token
    }
    // No session — try refreshing
    const { data: refreshed } = await supabase.auth.refreshSession()
    return refreshed?.session?.access_token || null
  } catch {
    return null
  }
}

/**
 * Wraps supabase.functions.invoke with:
 * - Auto-injected auth token (no need to manually pass Authorization header)
 * - Timeout with AbortController
 * - Retry on 502/503/network errors
 * - Retry once on 401 after refreshing the session
 *
 * @param {string} functionName - Edge function name
 * @param {object} options - { body, headers }
 * @param {object} config - { timeoutMs, retries, signal }
 * @returns {Promise<{ data, error }>}
 */
export async function invokeWithRetry(functionName, options = {}, config = {}) {
  const { timeoutMs = 30000, retries = 1, signal: externalSignal } = config
  let didRetryAuth = false

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()

    // Link external abort signal
    if (externalSignal) {
      if (externalSignal.aborted) {
        return { data: null, error: 'تم إلغاء الطلب' }
      }
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    // Auto-inject Authorization header if not manually provided
    if (!options.headers?.Authorization) {
      const token = await getAccessToken()
      if (token) {
        options = {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          },
        }
      }
    }

    // Timeout
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await supabase.functions.invoke(functionName, {
        ...options,
      })

      clearTimeout(timer)

      // Check if externally aborted during the call
      if (externalSignal?.aborted) {
        return { data: null, error: 'تم إلغاء الطلب' }
      }

      // If we got an error, extract the real message
      if (res.error) {
        const errMsg = extractErrorMessage(res.error)

        // On 401/Unauthorized — refresh token and retry once
        if (!didRetryAuth && /401|unauthorized|jwt|token/i.test(errMsg)) {
          didRetryAuth = true
          // Force refresh the session
          try {
            const { data: refreshed } = await supabase.auth.refreshSession()
            if (refreshed?.session?.access_token) {
              options = {
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${refreshed.session.access_token}`,
                },
              }
              continue // Retry with fresh token
            }
          } catch {}
          // If refresh failed, return the original error
          return { data: null, error: 'جلسة غير صالحة — يرجى إعادة تسجيل الدخول' }
        }

        // Retry on server/network errors
        if (attempt < retries) {
          const isRetryable = /502|503|network|fetch|timeout/i.test(errMsg)
          if (isRetryable) {
            await new Promise(r => setTimeout(r, 1000))
            continue
          }
        }

        return { data: null, error: errMsg }
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
