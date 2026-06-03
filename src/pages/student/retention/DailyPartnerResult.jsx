// /student/retention/daily-partner/result/:attemptId — feedback card
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Trophy, ChevronLeft, MessageCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { fillTemplate } from '../../../lib/retention/dialogueEval'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import { useG } from '../../../i18n/gender'

export default function DailyPartnerResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const g = useG()

  const q = useQuery({
    queryKey: ['retention-dialogue-result', attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retention_dialogue_attempts')
        .select(`*,
                 scenario:retention_scenarios(title_ar, persona:retention_personas(name_ar)),
                 feedback:retention_feedback_templates(template_ar)`)
        .eq('id', attemptId)
        .single()
      if (error) throw error
      return data
    },
    enabled: Boolean(attemptId),
  })

  if (q.isLoading) return <div className="p-8" dir="rtl"><div className="h-40 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} /></div>
  if (!q.data) return null
  const a = q.data

  const feedback = a.feedback?.template_ar
    ? fillTemplate(a.feedback.template_ar, {
        vocab_hits: a.vocab_hit_count ?? 0,
        vocab_total: Math.max(a.vocab_hit_count ?? 0, Math.round(((a.vocab_hit_count ?? 0) / Math.max(0.01, (a.vocab_hit_pct ?? 1) / 100)))),
      })
    : g('محادثة جيدة! استمر على هذا.', 'محادثة جيدة! استمري على هذا.')

  const minutes = Math.max(1, Math.round((a.total_speaking_seconds || 0) / 60))

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-xl mx-auto px-4 py-10 relative">
        <GlassPanel padding="xl" className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-20 h-20 flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'color-mix(in srgb, var(--ds-accent-gold) 18%, transparent)',
              color: 'var(--ds-accent-gold)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            <Trophy size={40} />
          </motion.div>

          <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--ds-text-primary)' }}>
            {a.scenario?.title_ar}
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--ds-text-secondary)' }}>
            مع {a.scenario?.persona?.name_ar} — {minutes} دقيقة محادثة
          </p>

          <div className="flex items-center justify-center gap-8 mb-7">
            <div className="text-center">
              <div className="text-4xl font-extrabold" style={{ color: 'var(--ds-accent-primary)' }}>
                {Math.round(a.vocab_hit_pct ?? 0)}٪
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>كلمات الموضوع</div>
            </div>
            <div className="w-px h-12" style={{ background: 'var(--ds-border-subtle)' }} />
            <div className="text-center">
              <div className="text-4xl font-extrabold" style={{ color: 'var(--ds-accent-gold)' }}>
                +{a.xp_awarded || 0}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>XP</div>
            </div>
          </div>

          <div
            className="text-base leading-relaxed text-right p-4 mb-6"
            style={{
              background: 'color-mix(in srgb, var(--ds-accent-primary) 8%, transparent)',
              border: '1px solid var(--ds-border-subtle)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--ds-text-secondary)',
            }}
          >
            {feedback}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => navigate('/student/retention/daily-partner')}
              className="w-full font-semibold py-3 flex items-center justify-center gap-2"
              style={{
                background: 'var(--ds-accent-primary)',
                color: 'var(--ds-text-inverse)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <MessageCircle size={16} />
              محادثة جديدة
            </button>
            <button
              onClick={() => navigate('/student')}
              className="w-full py-3"
              style={{
                color: 'var(--ds-text-secondary)',
                border: '1px solid var(--ds-border-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <ChevronLeft size={16} className="inline ml-1" />
              الرئيسية
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
