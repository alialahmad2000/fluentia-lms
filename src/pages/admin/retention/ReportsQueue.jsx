// /admin/retention/reports — trainer/admin queue: review + send
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Eye, X, Edit3 } from 'lucide-react'
import { usePendingReports, useApproveReport } from '../../../lib/retention/useReports'
import AuroraBackground from '../../../design-system/components/AuroraBackground'
import GlassPanel from '../../../design-system/components/GlassPanel'

export default function RetentionReportsQueue() {
  const { data, isLoading } = usePendingReports()
  const approve = useApproveReport()
  const [editing, setEditing] = useState(null) // {id, body}

  return (
    <div className="relative min-h-screen" dir="rtl">
      <AuroraBackground />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-5 relative">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ds-text-primary)' }}>التقارير الأسبوعية — قيد المراجعة</h1>
        <p style={{ color: 'var(--ds-text-secondary)' }}>
          راجعي كل تقرير، عدّلي إذا احتجتِ، ثم اضغطي "أرسلي للطالبة".
        </p>

        {isLoading ? (
          <GlassPanel padding="md"><div className="h-32 animate-pulse" /></GlassPanel>
        ) : !data || data.length === 0 ? (
          <GlassPanel padding="lg" className="text-center">
            <p style={{ color: 'var(--ds-text-secondary)' }}>لا توجد تقارير قيد المراجعة. ✓</p>
          </GlassPanel>
        ) : (
          <ul className="space-y-4">
            {data.map((r) => {
              const studentName = r.student?.display_name || r.student?.full_name || '?'
              const isEditing = editing?.id === r.id
              return (
                <GlassPanel key={r.id} padding="lg">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold text-lg" style={{ color: 'var(--ds-text-primary)' }}>{r.rendered_title_ar}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
                        {studentName} · أسبوع {r.week_start} · XP {r.metrics?.xp_this_week ?? 0} · سلسلة {r.metrics?.streak ?? 0}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing && (
                        <button
                          onClick={() => setEditing({ id: r.id, body: r.rendered_body_ar })}
                          className="px-3 py-2 text-sm flex items-center gap-1"
                          style={{
                            border: '1px solid var(--ds-border-subtle)',
                            color: 'var(--ds-text-secondary)',
                            borderRadius: 'var(--radius-md)',
                          }}
                        ><Edit3 size={14} /> عدّلي</button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => approve.mutate({ reportId: r.id, editedBody: isEditing ? editing.body : null })}
                        disabled={approve.isPending}
                        className="px-3 py-2 text-sm font-semibold flex items-center gap-1"
                        style={{
                          background: 'var(--ds-accent-primary)',
                          color: 'var(--ds-text-inverse)',
                          borderRadius: 'var(--radius-md)',
                          opacity: approve.isPending ? 0.6 : 1,
                        }}
                      ><Send size={14} /> أرسلي للطالبة</motion.button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editing.body}
                        onChange={(e) => setEditing((s) => ({ ...s, body: e.target.value }))}
                        rows={10}
                        className="w-full p-3 text-base"
                        style={{
                          background: 'var(--ds-surface-1)',
                          border: '1px solid var(--ds-border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--ds-text-primary)',
                        }}
                      />
                      <button
                        onClick={() => setEditing(null)}
                        className="text-sm flex items-center gap-1"
                        style={{ color: 'var(--ds-text-secondary)' }}
                      ><X size={14} /> إلغاء التعديل</button>
                    </div>
                  ) : (
                    <div
                      className="text-base leading-loose whitespace-pre-line p-4"
                      style={{
                        background: 'color-mix(in srgb, var(--ds-accent-primary) 6%, transparent)',
                        border: '1px solid var(--ds-border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--ds-text-secondary)',
                      }}
                    >
                      {r.rendered_body_ar}
                    </div>
                  )}
                </GlassPanel>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
