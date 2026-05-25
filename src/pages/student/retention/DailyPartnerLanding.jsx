// /student/retention/daily-partner — landing
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, ChevronLeft, Clock, MessageCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAuthProfileId } from '../../../stores/authStore'
import { useTodayScenario, useDialogueAttemptHistory } from '../../../lib/retention/useDialogue'
import { useRetentionModuleEnabled } from '../../../lib/retention/useRetentionModule'
import { RETENTION_MODULES } from '../../../lib/retention/constants'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import RetentionCard from '../../../design-system/retention/RetentionCard'
import RetentionDisabledState from '../../../design-system/retention/RetentionDisabledState'

export default function DailyPartnerLanding() {
  const navigate = useNavigate()
  const userId = useAuthProfileId()
  const moduleEnabled = useRetentionModuleEnabled(RETENTION_MODULES.DAILY_PARTNER)
  const today = useTodayScenario()
  const history = useDialogueAttemptHistory({ limit: 5 })

  if (moduleEnabled.isLoading) return <div className="p-8" dir="rtl"><div className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} /></div>
  if (!moduleEnabled.enabled) return <RetentionDisabledState moduleLabel="الرفيق اليومي" />

  const startToday = async () => {
    if (!today.data || !userId) return
    const { data, error } = await supabase
      .from('retention_dialogue_attempts')
      .insert({ student_id: userId, scenario_id: today.data.id, started_at: new Date().toISOString() })
      .select('id')
      .single()
    if (error) {
      console.error('Failed to start dialogue', error)
      return
    }
    navigate(`/student/retention/daily-partner/play/${data.id}?scenario=${today.data.id}`)
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 relative">
        <header>
          <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
            <ChevronLeft size={16} />
            <button onClick={() => navigate('/student')} className="hover:underline">الرئيسية</button>
            <span>/</span>
            <span style={{ color: 'var(--ds-text-secondary)' }}>الرفيق اليومي</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>الرفيق اليومي</h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: 'var(--ds-text-secondary)' }}>
            ٥ دقائق محادثة بصوتكِ كل يوم — موقف واقعي، وبتقدري تكلمين بثقة أكثر.
          </p>
        </header>

        {today.isLoading ? (
          <GlassPanel padding="lg"><div className="h-32 animate-pulse" /></GlassPanel>
        ) : !today.data ? (
          <GlassPanel padding="lg">
            <p className="text-center" style={{ color: 'var(--ds-text-secondary)' }}>
              لا توجد سيناريوهات متاحة لمستواكِ الحالي بعد.
            </p>
          </GlassPanel>
        ) : (
          <RetentionCard
            moduleKey="daily_partner"
            title={today.data.title_ar}
            subtitle={`مع ${today.data.persona?.name_ar} · ${today.data.estimated_minutes || 5} دقائق`}
            icon={<MessageCircle size={20} />}
            badge={difficultyLabel(today.data.difficulty)}
            variant="featured"
            footer={
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={startToday}
                className="w-full font-semibold py-3 flex items-center justify-center gap-2"
                style={{
                  background: 'var(--ds-accent-primary)',
                  color: 'var(--ds-text-inverse)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <Mic size={18} />
                ابدئي المحادثة
              </motion.button>
            }
          >
            <div className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ds-text-secondary)' }}>
              <p><strong>الموقف:</strong> {today.data.setting_en}</p>
              <p className="mt-1"><strong>الهدف:</strong> {today.data.goal_en}</p>
              {today.data.target_vocab && today.data.target_vocab.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--ds-text-tertiary)' }}>كلمات مفيدة:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {today.data.target_vocab.slice(0, 6).map((w) => (
                      <span key={w} className="px-2 py-0.5 text-xs"
                        style={{
                          background: 'color-mix(in srgb, var(--ds-accent-primary) 14%, transparent)',
                          color: 'var(--ds-accent-primary)',
                          borderRadius: 'var(--radius-full)',
                          direction: 'ltr', display: 'inline-block',
                        }}>{w}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </RetentionCard>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--ds-text-primary)' }}>محادثاتك السابقة</h2>
          {history.isLoading ? (
            <GlassPanel padding="md"><div className="h-12 animate-pulse" /></GlassPanel>
          ) : !history.data || history.data.length === 0 ? (
            <GlassPanel padding="md">
              <p className="text-sm text-center" style={{ color: 'var(--ds-text-tertiary)' }}>لم تبدئي أي محادثة بعد — ابدئي بأول واحدة ↑</p>
            </GlassPanel>
          ) : (
            <ul className="space-y-2">
              {history.data.map((h) => (
                <GlassPanel key={h.id} padding="sm">
                  <button
                    onClick={() => h.completed_at && navigate(`/student/retention/daily-partner/result/${h.id}`)}
                    className="w-full flex items-center justify-between gap-3 text-right"
                    disabled={!h.completed_at}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>
                        {h.scenario?.title_ar || 'محادثة'}
                      </div>
                      <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                        <Clock size={11} />
                        {formatDate(h.started_at)}
                        {h.xp_awarded ? ` · +${h.xp_awarded} XP` : ''}
                      </div>
                    </div>
                    {h.completed_at ? (
                      <span className="text-xs font-semibold px-2 py-1"
                        style={{
                          color: 'var(--ds-accent-success)',
                          background: 'color-mix(in srgb, var(--ds-accent-success) 14%, transparent)',
                          borderRadius: 'var(--radius-sm)',
                        }}>{Math.round(h.vocab_hit_pct ?? 0)}٪</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--ds-text-tertiary)' }}>غير مكتملة</span>
                    )}
                  </button>
                </GlassPanel>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function difficultyLabel(d) {
  return { easy: 'سهل', medium: 'متوسط', challenging: 'تحدّي' }[d] || d
}

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' }) }
  catch { return iso }
}
