import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthProfile } from '../../stores/authStore'

// AUDIO-TELEMETRY 2026-05-20 — admin dashboard.
// Read-only view of audio_telemetry, scoped by RLS to admin/trainer only.
// Shows: when, who, where (context + row), what (error code), how (UA, bundle).

const MEDIA_ERROR_LABELS = {
  '-1': 'SILENT_FAILURE',
  0: 'play() rejected',
  1: 'MEDIA_ERR_ABORTED',
  2: 'MEDIA_ERR_NETWORK',
  3: 'MEDIA_ERR_DECODE',
  4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
}

const MEDIA_ERROR_ARABIC = {
  '-1': 'صامت — play() نجح لكن لم يصدر صوت (iOS الصامت / تشغيل تلقائي محظور / سياق صوت مغلق)',
  0: 'تم رفض play() — قد يكون iOS Safari silent switch',
  1: 'إلغاء التحميل',
  2: 'فشل الشبكة',
  3: 'فشل فك التشفير',
  4: 'تنسيق غير مدعوم',
}

const RANGE_OPTIONS = [
  { value: '24h', label: 'آخر 24 ساعة', ms: 24 * 60 * 60 * 1000 },
  { value: '7d',  label: 'آخر 7 أيام',  ms: 7 * 24 * 60 * 60 * 1000 },
  { value: '30d', label: 'آخر 30 يوم',  ms: 30 * 24 * 60 * 60 * 1000 },
]

const CONTEXT_FILTERS = ['all', 'listening', 'reading', 'vocab']

function severityFor(errorCode) {
  if (errorCode === 4 || errorCode === 3) return 'high'
  if (errorCode === 2) return 'medium'
  if (errorCode === -1) return 'medium' // silent failure — surfaces actionable iOS/autoplay hint
  return 'low'
}

function severityClasses(level) {
  if (level === 'high') return 'border-red-500/40 bg-red-500/5'
  if (level === 'medium') return 'border-amber-500/40 bg-amber-500/5'
  return 'border-white/5 bg-white/[0.02]'
}

function shortUA(ua) {
  if (!ua) return '—'
  if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS (\d+_\d+)/)
    return `iOS ${m ? m[1].replace('_', '.') : '?'} Safari`
  }
  if (/Android/.test(ua)) {
    const m = ua.match(/Android (\d+(\.\d+)?)/)
    return `Android ${m ? m[1] : '?'}`
  }
  if (/Chrome\/(\d+)/.test(ua)) return `Chrome ${ua.match(/Chrome\/(\d+)/)[1]}`
  if (/Firefox\/(\d+)/.test(ua)) return `Firefox ${ua.match(/Firefox\/(\d+)/)[1]}`
  if (/Safari\/\d+/.test(ua)) return 'Safari (desktop)'
  return ua.slice(0, 40)
}

function fmtTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('ar-SA', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function AdminAudioTelemetry() {
  // Hooks first — no early returns above
  const profile = useAuthProfile()
  const [rangeKey, setRangeKey] = useState('24h')
  const [contextFilter, setContextFilter] = useState('all')

  const range = RANGE_OPTIONS.find((r) => r.value === rangeKey) ?? RANGE_OPTIONS[0]

  const { data: rows, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['audio-telemetry', rangeKey, contextFilter],
    queryFn: async () => {
      const since = new Date(Date.now() - range.ms).toISOString()
      let q = supabase
        .from('audio_telemetry')
        .select('*, profile:profiles(email, full_name)')
        .gte('occurred_at', since)
        .order('occurred_at', { ascending: false })
        .limit(500)
      if (contextFilter !== 'all') q = q.eq('context', contextFilter)
      const { data, error } = await q
      if (error) throw error
      return data ?? []
    },
    refetchInterval: 60_000, // gentle live-tail
  })

  // Now safe to gate
  const isStaff = profile?.role === 'admin' || profile?.role === 'trainer'
  if (profile && !isStaff) {
    return (
      <div className="p-6 text-center">
        <p className="text-[var(--text-muted)] font-['Tajawal']">هذه الصفحة للمدراء فقط.</p>
      </div>
    )
  }

  const total = rows?.length ?? 0
  const byCode = (rows ?? []).reduce((acc, r) => {
    const k = r.error_code ?? 'null'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold font-['Tajawal'] text-[var(--text-primary)]">
            سجلّ فشل الصوت
          </h1>
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal'] mt-1">
            يُكتب تلقائياً من المتصفّحات. كل صف = محاولة تشغيل فشلت.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-[var(--text-primary)] font-['Tajawal'] disabled:opacity-50"
        >
          {isRefetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {RANGE_OPTIONS.map((r) => (
          <button
            key={r.value}
            onClick={() => setRangeKey(r.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-['Tajawal'] ${
              rangeKey === r.value
                ? 'bg-[var(--accent-sky)]/15 text-[var(--accent-sky)] border border-[var(--accent-sky)]/30'
                : 'bg-white/5 text-[var(--text-muted)] border border-transparent hover:bg-white/10'
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 self-center mx-1" aria-hidden />
        {CONTEXT_FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setContextFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-['Tajawal'] uppercase tracking-wide ${
              contextFilter === c
                ? 'bg-white/15 text-[var(--text-primary)] border border-white/20'
                : 'bg-white/5 text-[var(--text-muted)] border border-transparent hover:bg-white/10'
            }`}
          >
            {c === 'all' ? 'كل السياقات' : c}
          </button>
        ))}
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
          <div className="text-xs text-[var(--text-muted)] font-['Tajawal']">المجموع</div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{total}</div>
        </div>
        {Object.entries(byCode).slice(0, 3).map(([code, count]) => (
          <div key={code} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="text-xs text-[var(--text-muted)] font-['Tajawal']">
              {MEDIA_ERROR_LABELS[code] ?? `code=${code}`}
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{count}</div>
          </div>
        ))}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <div className="text-emerald-300 font-['Tajawal'] text-lg font-semibold mb-1">
            لا فشل في هذه الفترة
          </div>
          <div className="text-emerald-200/70 font-['Tajawal'] text-sm">
            كل التشغيلات نجحت ضمن {range.label.replace('آخر ', '')}.
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {(rows ?? []).map((row) => {
            const sev = severityFor(row.error_code)
            const arErr = MEDIA_ERROR_ARABIC[row.error_code] ?? row.error_message ?? 'خطأ غير معروف'
            return (
              <div
                key={row.id}
                className={`rounded-xl border p-3 ${severityClasses(sev)}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {sev === 'high' && (
                      <AlertTriangle size={14} className="text-red-400" />
                    )}
                    <span className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
                      {fmtTime(row.occurred_at)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--text-primary)] uppercase tracking-wide">
                      {row.context}
                    </span>
                    <span className="text-sm font-['Tajawal'] text-[var(--text-primary)]">
                      {row.profile?.full_name || row.profile?.email || (row.profile_id ? row.profile_id.slice(0, 8) : 'مجهول')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="font-mono">{shortUA(row.browser_ua)}</span>
                    {row.bundle_version && (
                      <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono">{row.bundle_version}</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm text-[var(--text-primary)] font-['Tajawal']">
                  <span className="text-[var(--text-muted)]">السبب:</span> {arErr}
                  {typeof row.error_code === 'number' && (
                    <span className="ms-2 text-xs text-[var(--text-muted)] font-mono">code={row.error_code}</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-xs">
                  {row.row_id && (
                    <span className="text-[var(--text-muted)] font-mono">row={row.row_id.slice(0, 8)}</span>
                  )}
                  {row.network_status && (
                    <span className={row.network_status === 'offline' ? 'text-amber-400' : 'text-emerald-400'}>
                      {row.network_status}
                    </span>
                  )}
                  {row.audio_url && (
                    <a
                      href={row.audio_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--accent-sky)] hover:underline"
                    >
                      ملف الصوت <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
