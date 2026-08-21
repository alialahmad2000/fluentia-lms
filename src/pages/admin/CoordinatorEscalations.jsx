// «تصعيدات المنسّق» — the admin side of the coordinator console.
//
// The coordinator reads no Arabic. When the pre-written message doesn't fit the
// situation, his ONLY route is to hand the student to Ali — that hand-off lands
// here. Everything he wrote is in English (he wrote it); everything around it is
// Arabic, because this is Ali's screen.
import { useMemo, useState, useCallback } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { ArrowUpRight, Check, X, Inbox, MessageSquare } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import GlassPanel from '../../design-system/components/GlassPanel'
import { toast } from '../../components/ui/FluentiaToast'
import { useEscalationInbox, useResolveEscalation } from '../coordinator/consoleQueries'

const TABS = [
  ['open', 'مفتوحة'],
  ['done', 'مُنجزة'],
  ['dismissed', 'مُتجاهَلة'],
  ['all', 'الكل'],
]

const STATUS_AR = { open: 'مفتوح', done: 'تم', dismissed: 'تم تجاهله' }

function fmt(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('ar', {
    day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

export default function CoordinatorEscalations() {
  // R2 — all hooks first, gate last.
  const profile = useAuthStore((s) => s.profile)
  const profileId = useAuthStore((s) => s.profile?.id)
  const [tab, setTab] = useState('open')
  const { data: rows, isLoading } = useEscalationInbox(tab)
  const resolve = useResolveEscalation()

  const openCount = useMemo(
    () => (tab === 'open' ? rows?.length ?? 0 : null),
    [tab, rows]
  )

  const act = useCallback(async (id, status) => {
    try {
      await resolve.mutateAsync({ id, status, handledBy: profileId })
      toast({ type: 'success', title: status === 'done' ? 'تم ✅' : 'تم التجاهل' })
    } catch (e) {
      toast({ type: 'error', title: 'تعذّر الحفظ', description: String(e.message || e) })
    }
  }, [resolve, profileId])

  if (profile && profile.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div dir="rtl" className="w-full">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ArrowUpRight size={18} style={{ color: 'var(--ds-accent-warning)' }} />
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}
          >
            تصعيدات المنسّق
          </h1>
          {openCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{
                background: 'color-mix(in srgb, var(--ds-accent-danger) 18%, transparent)',
                color: 'var(--ds-accent-danger)',
              }}
            >
              {openCount}
            </span>
          )}
        </div>
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary)' }}>
          حالات رفعها المنسّق لأنّ الرسالة الجاهزة لم تناسب الموقف — لا يستطيع تعديل النص العربي،
          فهذه طريقه الوحيدة لتسليم الطالب إليك.
        </p>
      </header>

      <nav
        className="flex items-center gap-1 mb-6 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--ds-border-subtle)' }}
      >
        {TABS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className="px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
            style={{
              color: tab === value ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              borderBottom: `2px solid ${tab === value ? 'var(--ds-accent-primary)' : 'transparent'}`,
              marginBottom: '-1px',
              fontFamily: 'Tajawal, sans-serif',
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{ height: 150, borderRadius: 16, background: 'var(--ds-surface-2)' }}
            />
          ))}
        </div>
      ) : !rows?.length ? (
        <GlassPanel elevation={2} padding="xl">
          <div className="text-center py-8">
            <Inbox size={34} className="mx-auto mb-3" style={{ color: 'var(--ds-text-tertiary)' }} />
            <p className="text-lg font-bold" style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}>
              لا شيء هنا
            </p>
            <p className="text-sm mt-1" style={{ color: 'var(--ds-text-tertiary)' }}>
              لم يُصعّد المنسّق أي حالة بعد.
            </p>
          </div>
        </GlassPanel>
      ) : (
        <div className="space-y-3">
          {rows.map((e) => (
            <GlassPanel key={e.id} elevation={2} padding="lg">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/student/${e.student_id}/analysis`}
                    className="text-lg font-bold hover:underline"
                    style={{ color: 'var(--ds-text-primary)', fontFamily: 'Tajawal, sans-serif' }}
                  >
                    {e.student?.display_name || e.student?.full_name || 'طالب غير معروف'}
                  </Link>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ds-text-tertiary)' }}>
                    من {e.coordinator?.full_name || 'المنسّق'} · {fmt(e.created_at)}
                  </p>
                </div>
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold shrink-0"
                  style={{
                    background:
                      e.status === 'open'
                        ? 'color-mix(in srgb, var(--ds-accent-warning) 16%, transparent)'
                        : 'var(--ds-surface-3)',
                    color: e.status === 'open' ? 'var(--ds-accent-warning)' : 'var(--ds-text-tertiary)',
                    fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  {STATUS_AR[e.status] || e.status}
                </span>
              </div>

              {/* السبب المختصر */}
              <p
                dir="ltr"
                className="text-sm font-semibold mb-2"
                style={{ color: 'var(--ds-text-primary)', textAlign: 'left', unicodeBidi: 'isolate' }}
              >
                {e.reason}
              </p>

              {/* نصّ المنسّق كما كتبه — إنجليزي، معزول عن الاتجاه العربي */}
              <div
                dir="ltr"
                className="rounded-xl p-3.5 text-sm whitespace-pre-wrap"
                style={{
                  background: 'var(--ds-surface-2)',
                  border: '1px solid var(--ds-border-subtle)',
                  color: 'var(--ds-text-secondary)',
                  textAlign: 'left',
                  unicodeBidi: 'isolate',
                  lineHeight: 1.7,
                  fontFamily: "var(--font-english, 'Inter Tight', system-ui, sans-serif)",
                }}
              >
                {e.body_en}
              </div>

              {/* التنبيه الأصلي */}
              {e.intervention && (
                <div
                  className="mt-3 pt-3 flex flex-wrap items-center gap-2 text-xs"
                  style={{ borderTop: '1px solid var(--ds-border-subtle)', color: 'var(--ds-text-tertiary)' }}
                >
                  <MessageSquare size={12} />
                  <span style={{ fontFamily: 'Tajawal, sans-serif' }}>{e.intervention.reason_ar}</span>
                  <span>·</span>
                  <span>{fmt(e.intervention.created_at)}</span>
                </div>
              )}

              {e.intervention?.suggested_message_ar && (
                <details className="mt-2">
                  <summary
                    className="text-xs cursor-pointer"
                    style={{ color: 'var(--ds-text-tertiary)', fontFamily: 'Tajawal, sans-serif' }}
                  >
                    الرسالة التي كانت جاهزة
                  </summary>
                  <p
                    className="mt-2 rounded-xl p-3 text-sm"
                    style={{
                      background: 'var(--ds-surface-2)',
                      border: '1px solid var(--ds-border-subtle)',
                      color: 'var(--ds-text-secondary)',
                      fontFamily: 'Tajawal, sans-serif',
                      lineHeight: 2,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {e.intervention.suggested_message_ar}
                  </p>
                </details>
              )}

              {e.status === 'open' && (
                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => act(e.id, 'done')}
                    disabled={resolve.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{
                      background: 'var(--ds-accent-success)',
                      color: '#04121f',
                      fontFamily: 'Tajawal, sans-serif',
                      opacity: resolve.isPending ? 0.45 : 1,
                    }}
                  >
                    <Check size={15} /> تم
                  </button>
                  <button
                    type="button"
                    onClick={() => act(e.id, 'dismissed')}
                    disabled={resolve.isPending}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                    style={{
                      background: 'var(--ds-surface-3)',
                      color: 'var(--ds-text-secondary)',
                      border: '1px solid var(--ds-border-subtle)',
                      fontFamily: 'Tajawal, sans-serif',
                      opacity: resolve.isPending ? 0.45 : 1,
                    }}
                  >
                    <X size={15} /> تجاهل
                  </button>
                </div>
              )}

              {e.status !== 'open' && e.handled_at && (
                <p className="text-xs mt-3" style={{ color: 'var(--ds-text-tertiary)' }}>
                  عولجت في {fmt(e.handled_at)}
                </p>
              )}
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  )
}
