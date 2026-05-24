// /student/retention/homework — landing
// Shows active set if any, history, "request more" CTA.

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Pencil, Plus, ChevronLeft, Sparkles } from 'lucide-react'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'
import RetentionCard from '../../../design-system/retention/RetentionCard'
import RetentionDisabledState from '../../../design-system/retention/RetentionDisabledState'
import { useRetentionModuleEnabled } from '../../../lib/retention/useRetentionModule'
import { RETENTION_MODULES } from '../../../lib/retention/constants'
import {
  useActiveHomeworkSet,
  useHomeworkHistory,
  useCreateHomeworkSet,
} from '../../../lib/retention/useHomework'
import { useStudentMistakeTags } from '../../../lib/retention/useStudentMistakeTags'

export default function HomeworkLanding() {
  const navigate = useNavigate()
  const moduleEnabled = useRetentionModuleEnabled(RETENTION_MODULES.SMART_HOMEWORK)
  const active = useActiveHomeworkSet()
  const history = useHomeworkHistory({ limit: 8 })
  const tags = useStudentMistakeTags()
  const create = useCreateHomeworkSet()

  if (moduleEnabled.isLoading) {
    return (
      <div className="p-8" dir="rtl">
        <div className="h-32 animate-pulse rounded-xl" style={{ background: 'var(--ds-surface-1)' }} />
      </div>
    )
  }
  if (!moduleEnabled.enabled) {
    return <RetentionDisabledState moduleLabel="الواجبات الذكية" />
  }

  const handleStart = async () => {
    try {
      const result = await create.mutateAsync({ triggeredBy: 'on_demand' })
      navigate(`/student/retention/homework/play/${result.set.id}`)
    } catch (e) {
      // create.error already surfaced below
    }
  }

  const handleResume = () => {
    if (active.data?.id) navigate(`/student/retention/homework/play/${active.data.id}`)
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 relative">
        <header>
          <div className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
            <ChevronLeft size={16} />
            <button onClick={() => navigate('/student')} className="hover:underline">
              الرئيسية
            </button>
            <span>/</span>
            <span style={{ color: 'var(--ds-text-secondary)' }}>الواجبات الذكية</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>
            الواجبات الذكية
          </h1>
          <p className="mt-2 text-sm md:text-base" style={{ color: 'var(--ds-text-secondary)' }}>
            تمارين مخصصة لكِ بناءً على أخطائكِ الفعلية. كل مجموعة ٥ تمارين، تقدر تخلصينها في أقل من ١٠ دقائق.
          </p>
        </header>

        {active.data ? (
          <RetentionCard
            moduleKey="smart_homework"
            title="مجموعة قيد التنفيذ"
            subtitle={`${active.data.completed_count}/${active.data.total_count} تمارين`}
            icon={<Pencil size={20} />}
            onClick={handleResume}
            variant="featured"
          >
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--ds-text-secondary)' }}>
                ابدئي من حيث وقفتِ
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--ds-accent-primary)' }}>
                متابعة ←
              </span>
            </div>
          </RetentionCard>
        ) : (
          <RetentionCard
            moduleKey="smart_homework"
            title="مجموعة جديدة"
            subtitle={
              tags.data && tags.data.length > 0
                ? `سنركّز على آخر أخطائكِ: ${tags.data.slice(0, 2).map((t) => translateTag(t.tag)).join('، ')}`
                : 'سنبدأ بمزيج متوازن من القواعد والمفردات'
            }
            icon={<Sparkles size={20} />}
            footer={
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleStart}
                disabled={create.isPending}
                className="w-full font-semibold py-3 flex items-center justify-center gap-2 transition"
                style={{
                  background: 'var(--ds-accent-primary)',
                  color: 'var(--ds-text-inverse)',
                  borderRadius: 'var(--radius-md)',
                  opacity: create.isPending ? 0.6 : 1,
                }}
              >
                <Plus size={18} />
                {create.isPending ? 'جاري إعداد المجموعة…' : 'ابدئي تمارين اليوم'}
              </motion.button>
            }
          >
            {create.error && (
              <div
                className="mt-2 text-sm p-3"
                style={{
                  color: 'var(--ds-accent-danger)',
                  background: 'color-mix(in srgb, var(--ds-accent-danger) 12%, transparent)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {create.error.message || 'تعذّر إنشاء المجموعة — حاولي مرة ثانية'}
              </div>
            )}
          </RetentionCard>
        )}

        {/* History */}
        <section>
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--ds-text-primary)' }}>
            آخر المجموعات
          </h2>
          {history.isLoading ? (
            <GlassPanel padding="md">
              <div className="h-16 animate-pulse" />
            </GlassPanel>
          ) : !history.data || history.data.length === 0 ? (
            <GlassPanel padding="md">
              <p className="text-sm text-center" style={{ color: 'var(--ds-text-tertiary)' }}>
                لا توجد مجموعات سابقة بعد — ابدئي بأول واحدة فوق ↑
              </p>
            </GlassPanel>
          ) : (
            <ul className="space-y-2">
              {history.data.map((h) => (
                <GlassPanel key={h.id} padding="sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: 'var(--ds-text-primary)' }}>
                        {formatDate(h.created_at)}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
                        {h.completed_count}/{h.total_count} مكتمل
                        {h.xp_awarded ? ` · +${h.xp_awarded} XP` : ''}
                      </div>
                    </div>
                    {h.completed_at ? (
                      <span
                        className="text-xs font-semibold px-2 py-1"
                        style={{
                          color: 'var(--ds-accent-success)',
                          background: 'color-mix(in srgb, var(--ds-accent-success) 14%, transparent)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        مكتملة
                      </span>
                    ) : (
                      <button
                        onClick={() => navigate(`/student/retention/homework/play/${h.id}`)}
                        className="text-xs font-semibold px-2 py-1"
                        style={{
                          color: 'var(--ds-accent-primary)',
                          background: 'color-mix(in srgb, var(--ds-accent-primary) 14%, transparent)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        متابعة
                      </button>
                    )}
                  </div>
                </GlassPanel>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function formatDate(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })
  } catch {
    return iso
  }
}

function translateTag(tag) {
  const map = {
    missing_article: 'حذف a/an/the',
    wrong_article_a_an: 'خلط a و an',
    subject_verb_agreement: 'تطابق الفاعل والفعل',
    present_perfect_confusion: 'المضارع التام',
    preposition_for_since: 'for و since',
    spelling_double_letter: 'الإملاء',
    capitalization: 'الحرف الكبير',
  }
  return map[tag] || tag
}
