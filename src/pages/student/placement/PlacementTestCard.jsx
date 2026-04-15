import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { PremiumCard } from '../../../design-system/components'
import { motion } from 'framer-motion'
import { Compass, X, RotateCcw } from 'lucide-react'

export default function PlacementTestCard({ studentId }) {
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  // Check localStorage dismiss
  useEffect(() => {
    const dismissedAt = localStorage.getItem('placement_card_dismissed_at')
    if (dismissedAt) {
      const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24)
      if (daysSince < 7) setDismissed(true)
    }
  }, [])

  const { data: latestResult } = useQuery({
    queryKey: ['placement-latest', studentId],
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await supabase
        .from('placement_results')
        .select('recommended_level, created_at, session_id')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
    enabled: !!studentId,
  })

  const handleDismiss = () => {
    localStorage.setItem('placement_card_dismissed_at', String(Date.now()))
    setDismissed(true)
  }

  if (dismissed) return null

  const CEFR_MAP = ['Pre-A1', 'A1', 'A2', 'B1', 'B2', 'C1']

  // Determine card state
  let content
  if (!latestResult) {
    // No result — encourage test
    content = (
      <>
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--ds-accent-primary, rgba(56,189,248,0.2)), rgba(168,85,247,0.2))',
              border: '1px solid var(--ds-accent-primary, rgba(56,189,248,0.3))',
            }}
          >
            <Compass size={20} style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss() }}
            className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--ds-text-tertiary, #64748b)' }}
          >
            <X size={16} />
          </button>
        </div>
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
          اكتشفي مستواكِ الحقيقي
        </h3>
        <p className="text-sm mb-4" style={{ color: 'var(--ds-text-secondary, #cbd5e1)' }}>
          اختبار تكيّفي سريع يحدد مستواكِ بدقة في ١٥ سؤال
        </p>
        <button
          onClick={() => navigate('/student/placement-test')}
          className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: 'var(--ds-accent-primary, #38bdf8)',
            color: '#060e1c',
          }}
        >
          ابدئي الاختبار
        </button>
      </>
    )
  } else {
    const daysSince = Math.floor(
      (Date.now() - new Date(latestResult.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )
    const daysUntilRetake = Math.max(0, 30 - daysSince)
    const canRetake = daysUntilRetake === 0

    content = (
      <>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{
                background: 'var(--ds-accent-primary, rgba(56,189,248,0.15))',
                color: 'var(--ds-accent-primary, #38bdf8)',
                border: '1px solid var(--ds-accent-primary, rgba(56,189,248,0.3))',
              }}
            >
              L{latestResult.recommended_level}
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--ds-text-primary, #f8fafc)' }}>
              {CEFR_MAP[latestResult.recommended_level] || 'A2'}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss() }}
            className="p-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--ds-text-tertiary, #64748b)' }}
          >
            <X size={16} />
          </button>
        </div>

        {canRetake ? (
          <>
            <motion.p
              className="text-sm font-medium mb-3"
              style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              حان وقت إعادة القياس
            </motion.p>
            <button
              onClick={() => navigate('/student/placement-test')}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              style={{
                background: 'var(--ds-accent-primary, #38bdf8)',
                color: '#060e1c',
              }}
            >
              <RotateCcw size={15} />
              أعيدي الاختبار
            </button>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
            أعيدي الاختبار بعد {daysUntilRetake} يوم
          </p>
        )}
      </>
    )
  }

  return (
    <PremiumCard hover glow className="cursor-default">
      {content}
    </PremiumCard>
  )
}
