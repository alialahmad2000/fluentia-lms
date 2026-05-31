// /admin/retention — Daily Trainer Letter run panel.
// Shows today's letter run with the male/female generation split (Phase B.5) so
// Ali can spot at a glance whether gender distribution looks right (currently
// ~2 male / 23 female). Includes a "force run" that invokes the edge function.

import { useState } from 'react'
import { Mail, RefreshCw, Sparkles, FileText } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import GlassPanel from '../../../design-system/components/GlassPanel'

function riyadhToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function DailyLettersPanel() {
  const date = riyadhToday()
  const qc = useQueryClient()
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState(null)

  // Live count of letters that exist for today, split by gender + source.
  const letters = useQuery({
    queryKey: ['daily-letters-today', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_letters')
        .select('gender, source')
        .eq('letter_date', date)
      if (error) throw error
      return data || []
    },
  })

  // Latest run telemetry (tokens / who invoked / when).
  const run = useQuery({
    queryKey: ['daily-letters-run', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_letters_runs')
        .select('*')
        .eq('run_date', date)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data || null
    },
  })

  const rows = letters.data || []
  const total = rows.length
  const male = rows.filter((r) => r.gender === 'male').length
  const female = rows.filter((r) => r.gender === 'female').length
  const viaClaude = rows.filter((r) => r.source === 'claude_haiku').length
  const viaFallback = rows.filter((r) => r.source === 'template_fallback').length
  const malePct = total ? Math.round((male / total) * 100) : 0
  const femalePct = total ? Math.round((female / total) * 100) : 0

  const forceRun = async () => {
    if (!window.confirm('توليد رسائل اليوم الآن لكل الطالبات والطلاب؟ (سيتخطّى من لديه رسالة بالفعل)')) return
    setRunning(true)
    setMsg(null)
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-letters', { body: {} })
      if (error) throw error
      setMsg(
        `تم: ${data?.generated_total ?? 0} رسالة — ` +
          `${data?.generated_male ?? 0} ذكور / ${data?.generated_female ?? 0} إناث، ` +
          `تخطّى ${data?.skipped_existing ?? 0}.`,
      )
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['daily-letters-today', date] }),
        qc.invalidateQueries({ queryKey: ['daily-letters-run', date] }),
      ])
    } catch (e) {
      setMsg('فشل: ' + (e?.message ?? 'خطأ غير معروف'))
    } finally {
      setRunning(false)
    }
  }

  const stat = (label, value, accent) => (
    <div style={{ minWidth: 92 }}>
      <div className="text-2xl font-bold" style={{ color: accent || 'var(--ds-text-primary)' }}>{value}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--ds-text-secondary)' }}>{label}</div>
    </div>
  )

  return (
    <GlassPanel padding="md">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--ds-text-primary)' }}>
          <Mail size={18} /> الرسالة اليومية — تشغيل اليوم ({date})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { letters.refetch(); run.refetch() }}
            className="px-3 py-2 text-sm flex items-center gap-1"
            style={{ border: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-secondary)', borderRadius: 'var(--radius-md)' }}
          >
            <RefreshCw size={14} /> تحديث
          </button>
          <button
            onClick={forceRun}
            disabled={running}
            className="px-3 py-2 text-sm flex items-center gap-1"
            style={{
              background: 'var(--ds-accent-primary, #e9b949)',
              color: '#1a1206',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              opacity: running ? 0.6 : 1,
            }}
          >
            <Sparkles size={14} /> {running ? 'جارٍ التوليد…' : 'تشغيل الآن'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap" dir="rtl">
        {stat('الإجمالي', total)}
        {stat('ذكور', `${male} (${malePct}٪)`, 'var(--ds-accent-primary, #e9b949)')}
        {stat('إناث', `${female} (${femalePct}٪)`)}
        {stat('عبر Claude', viaClaude)}
        {viaFallback > 0 ? stat('قالب احتياطي', viaFallback, 'var(--ds-warning, #f59e0b)') : null}
      </div>

      {/* male/female split bar */}
      {total > 0 ? (
        <div className="mt-4" dir="ltr">
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
            <div style={{ width: `${malePct}%`, background: 'var(--ds-accent-primary, #e9b949)' }} title={`ذكور ${malePct}٪`} />
            <div style={{ width: `${femalePct}%`, background: 'rgba(255,255,255,0.25)' }} title={`إناث ${femalePct}٪`} />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm flex items-center gap-2" style={{ color: 'var(--ds-text-secondary)' }}>
          <FileText size={14} /> لا توجد رسائل لليوم بعد — اضغطي «تشغيل الآن».
        </p>
      )}

      {run.data ? (
        <p className="mt-3 text-xs" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
          آخر تشغيل: {run.data.invoked_by} ·
          {' '}توكنز {(run.data.input_tokens || 0) + (run.data.output_tokens || 0)} ·
          {' '}تخطّى {run.data.skipped_existing || 0} · أخطاء {run.data.errors || 0}
        </p>
      ) : null}

      {msg ? <p className="mt-2 text-sm" style={{ color: 'var(--ds-text-secondary)' }}>{msg}</p> : null}
    </GlassPanel>
  )
}
