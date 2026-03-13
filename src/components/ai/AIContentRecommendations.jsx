import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, BookOpen, Loader2, RefreshCcw } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

const STORAGE_KEY = 'fluentia_ai_recommendations'

export default function AIContentRecommendations() {
  const { profile, studentData } = useAuthStore()
  const [recommendations, setRecommendations] = useState(null)
  const [loading, setLoading] = useState(false)

  const level = ACADEMIC_LEVELS[studentData?.academic_level] || ACADEMIC_LEVELS[1]

  // Load cached recommendations
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${profile?.id}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Use cached if less than 24h old
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setRecommendations(parsed.items)
        }
      } catch {}
    }
  }, [profile?.id])

  async function fetchRecommendations() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Get recent assignment types to understand weaknesses
      const { data: recentSubmissions } = await supabase
        .from('submissions')
        .select('grade_numeric, assignments(type)')
        .eq('student_id', profile?.id)
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })
        .limit(10)

      const typeGrades = {}
      for (const s of (recentSubmissions || [])) {
        const type = s.assignments?.type
        if (type && s.grade_numeric != null) {
          if (!typeGrades[type]) typeGrades[type] = []
          typeGrades[type].push(s.grade_numeric)
        }
      }

      const performanceSummary = Object.entries(typeGrades)
        .map(([type, grades]) => `${type}: avg ${Math.round(grades.reduce((a,b) => a+b, 0) / grades.length)}%`)
        .join(', ')

      const res = await supabase.functions.invoke('ai-chatbot', {
        body: {
          message: `Based on this student's performance (${performanceSummary || 'no data yet'}), level ${level.cefr} (${level.name_en}), suggest 3 personalized learning recommendations. Respond in JSON array format: [{"title": "...", "description": "...", "type": "article|exercise|video|tip", "icon": "emoji"}]. All text in Arabic. Focus on their weakest areas.`,
          conversation_history: [],
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.data?.reply) {
        let items
        try {
          items = JSON.parse(res.data.reply)
        } catch {
          const match = res.data.reply.match(/\[[\s\S]*?\]/)
          if (match) items = JSON.parse(match[0])
        }

        if (items?.length) {
          setRecommendations(items)
          localStorage.setItem(`${STORAGE_KEY}_${profile?.id}`, JSON.stringify({ items, timestamp: Date.now() }))
        }
      }
    } catch {
      // Silent fail — recommendations are non-essential
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch on mount if no cached data
  useEffect(() => {
    if (!recommendations && profile?.id) {
      fetchRecommendations()
    }
  }, [profile?.id])

  if (!recommendations && !loading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Sparkles size={16} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">مقترحات لك</h3>
        </div>
        <button
          onClick={fetchRecommendations}
          disabled={loading}
          className="btn-ghost p-2 rounded-xl text-muted hover:text-white transition-all duration-200"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
        </button>
      </div>

      {loading && !recommendations ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 size={20} className="animate-spin text-violet-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations?.map((rec, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/5 rounded-xl p-4 hover:translate-y-[-2px] transition-all duration-200">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-lg shrink-0">{rec.icon || '📘'}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{rec.title}</p>
                <p className="text-sm text-muted mt-0.5">{rec.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted text-center mt-3">بناءً على أداءك — مستوى {level.cefr}</p>
    </motion.div>
  )
}
