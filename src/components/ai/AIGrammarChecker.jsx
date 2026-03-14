import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SpellCheck, Loader2, X, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

// Debounce helper
function useDebounce(fn, delay) {
  const [timer, setTimer] = useState(null)
  return useCallback((...args) => {
    if (timer) clearTimeout(timer)
    setTimer(setTimeout(() => fn(...args), delay))
  }, [fn, delay, timer])
}

export default function AIGrammarChecker({ text, onApplyCorrection, enabled = true }) {
  const [corrections, setCorrections] = useState([])
  const [checking, setChecking] = useState(false)
  const [show, setShow] = useState(true)

  const checkGrammar = useCallback(async (inputText) => {
    if (!inputText || inputText.trim().length < 20 || !enabled) return

    setChecking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await invokeWithRetry('ai-chatbot', {
        body: {
          message: `Check grammar in this English text and respond ONLY with a JSON array of corrections. Each correction: {"error": "wrong text", "correction": "correct text", "rule": "brief explanation in Arabic"}. If no errors, respond with []. Text: "${inputText}"`,
          conversation_history: [],
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.data?.reply) {
        try {
          let parsed = JSON.parse(res.data.reply)
          if (!Array.isArray(parsed)) parsed = []
          setCorrections(parsed)
        } catch {
          // Try to extract JSON array
          const match = res.data.reply.match(/\[[\s\S]*?\]/)
          if (match) {
            try { setCorrections(JSON.parse(match[0])) } catch { setCorrections([]) }
          }
        }
      }
    } catch {
      // Silently fail — grammar check is non-essential
    } finally {
      setChecking(false)
    }
  }, [enabled])

  const debouncedCheck = useDebounce(checkGrammar, 2000)

  // Expose check function for manual trigger
  function manualCheck() {
    if (text) checkGrammar(text)
  }

  if (!enabled || !show) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={manualCheck}
          disabled={checking || !text || text.trim().length < 20}
          className="btn-ghost flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-all duration-200"
        >
          {checking ? <Loader2 size={12} className="animate-spin" /> : <SpellCheck size={12} />}
          فحص القواعد
        </button>
        <button onClick={() => setShow(false)} className="btn-ghost text-muted hover:text-white transition-all duration-200">
          <X size={12} />
        </button>
      </div>

      <AnimatePresence>
        {corrections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5"
          >
            {corrections.map((c, i) => (
              <div key={i} className="flex items-start justify-between gap-2 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-red-400 line-through" dir="ltr">{c.error}</span>
                    <span className="text-emerald-400" dir="ltr">{c.correction}</span>
                  </div>
                  {c.rule && <p className="text-[10px] text-muted mt-0.5">{c.rule}</p>}
                </div>
                {onApplyCorrection && (
                  <button
                    onClick={() => onApplyCorrection(c.error, c.correction)}
                    className="text-emerald-400 hover:text-emerald-300 shrink-0"
                    title="تطبيق التصحيح"
                  >
                    <Check size={12} />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
