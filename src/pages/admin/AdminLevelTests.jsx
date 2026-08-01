import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { GlassPanel, SectionHeader, EmptyState } from '../../design-system/components'
import {
  ChevronDown, MessageCircle, Copy, Check, ClipboardCheck,
  AlertTriangle, Clock, Headphones, PenLine,
} from 'lucide-react'

/* Results of the PUBLIC level test on fluentia.academy/level-test.
 * These people are prospects, not students — there is no account to open, so
 * every row ends in one action: message them on WhatsApp. */

const LEVELS = [
  { code: 'L0', cefr: 'Pre-A1', ar: 'ما قبل الخطوة الأولى' },
  { code: 'L1', cefr: 'A1', ar: 'الخطوة الأولى' },
  { code: 'L2', cefr: 'A2', ar: 'بداية الثقة' },
  { code: 'L3', cefr: 'B1', ar: 'صار يتكلم' },
  { code: 'L4', cefr: 'B2', ar: 'ثقة كاملة' },
  { code: 'L5', cefr: 'C1', ar: 'جاهز للعالم' },
]

const GOAL_AR = { work: 'شغله', study: 'دراسته', ielts: 'آيلتس', travel: 'السفر', confidence: 'ثقته بنفسه' }
const GENDER_AR = { male: 'ذكر', female: 'أنثى' }
const CONF_AR = { high: 'عالية', medium: 'متوسطة', low: 'مبدئية' }
const CONF_COLOR = { high: '#4ade80', medium: '#fbbf24', low: '#94a3b8' }

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'short' }) +
  ' · ' +
  new Date(iso).toLocaleTimeString('ar-SA-u-ca-gregory', { hour: '2-digit', minute: '2-digit' })

/** 0530648687 → 966530648687 for wa.me */
const waNumber = (phone) => {
  const d = String(phone || '').replace(/[^\d]/g, '')
  if (d.startsWith('05')) return `966${d.slice(1)}`
  if (d.startsWith('966')) return d
  if (d.startsWith('5')) return `966${d}`
  return d
}

function firstMessage(r) {
  const lvl = LEVELS[r.level_index] || {}
  const she = r.gender === 'female'
  return [
    `مرحباً ${r.name} 👋`,
    '',
    `وصلتنا نتيجة اختبار تحديد المستوى: ${lvl.code} · ${lvl.cefr} — ${lvl.ar}.`,
    she
      ? 'حبيت أوضح لكِ وش تعني بالضبط، ومن وين الأفضل تبدئين.'
      : 'حبيت أوضح لك وش تعني بالضبط، ومن وين الأفضل تبدأ.',
    '',
    'متى يناسبك نتكلم؟',
  ].join('\n')
}

function LevelBadge({ index, small }) {
  const lvl = LEVELS[index]
  if (!lvl) {
    return (
      <span
        className="rounded-full px-2.5 py-1 text-[11px] font-bold"
        style={{ background: 'rgba(148,163,184,0.12)', color: 'var(--ds-text-tertiary, #64748b)' }}
      >
        لم يكمل
      </span>
    )
  }
  // Colour rises with level so the list is scannable at a glance.
  const hue = 200 - index * 14
  return (
    <span
      className={`rounded-full font-bold ${small ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
      style={{
        background: `hsla(${hue}, 85%, 60%, 0.14)`,
        color: `hsl(${hue}, 85%, 68%)`,
        border: `1px solid hsla(${hue}, 85%, 60%, 0.3)`,
      }}
    >
      {lvl.code} · {lvl.cefr}
    </span>
  )
}

function SkillBars({ skills }) {
  if (!Array.isArray(skills) || !skills.length) return null
  return (
    <div className="flex flex-col gap-2">
      {skills.map((s) => (
        <div key={s.skill} className="grid items-center gap-3" style={{ gridTemplateColumns: '72px 1fr 62px' }}>
          <span className="text-xs" style={{ color: 'var(--ds-text-secondary, #94a3b8)' }}>{s.ar}</span>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, s.pct)}%`,
                background:
                  s.verdict === 'strong' ? '#4ade80' : s.verdict === 'weak' ? '#fbbf24' : 'var(--ds-accent-primary, #38bdf8)',
              }}
            />
          </div>
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
            {s.pct}% ({s.correct}/{s.total})
          </span>
        </div>
      ))}
    </div>
  )
}

function ResultCard({ r, expanded, onToggle }) {
  const [copied, setCopied] = useState(false)
  const lvl = LEVELS[r.level_index]
  const done = r.status === 'completed'

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(r.phone || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard blocked — the number is on screen anyway */ }
  }

  return (
    <GlassPanel padding="md" className="mb-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <LevelBadge index={r.level_index} />
          <div className="min-w-0">
            <div className="font-bold truncate" style={{ color: 'var(--ds-text-primary, #f1f5f9)' }}>{r.name}</div>
            <div className="text-[11px] flex items-center gap-2 flex-wrap" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              <span>{fmtDate(r.created_at)}</span>
              {r.age ? <span>· {r.age} سنة</span> : null}
              {r.gender ? <span>· {GENDER_AR[r.gender]}</span> : null}
              {r.goal ? <span>· هدفه {GOAL_AR[r.goal] || r.goal}</span> : null}
              {r.utm_source ? <span>· {r.utm_source}</span> : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {done && r.phone && (
            <a
              href={`https://wa.me/${waNumber(r.phone)}?text=${encodeURIComponent(firstMessage(r))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
              style={{ background: 'rgba(37,211,102,0.14)', color: '#34d17e', border: '1px solid rgba(37,211,102,0.3)' }}
            >
              <MessageCircle size={13} /> واتساب
            </a>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"
            style={{ background: 'var(--ds-surface-2, rgba(255,255,255,0.05))', color: 'var(--ds-text-secondary, #94a3b8)' }}
          >
            التفاصيل
            <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--ds-border-subtle, rgba(255,255,255,0.08))' }}>
          {!done ? (
            <p className="text-sm" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
              بدأ الاختبار ولم يُكمله — ما عندنا رقم جواله. البيانات المتاحة: الاسم والعمر والجنس فقط.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs mb-4" style={{ color: 'var(--ds-text-secondary, #94a3b8)' }}>
                <span className="flex items-center gap-1.5">
                  <button type="button" onClick={copyPhone} className="flex items-center gap-1" style={{ color: 'var(--ds-accent-primary, #38bdf8)' }}>
                    {copied ? <Check size={12} /> : <Copy size={12} />} {r.phone}
                  </button>
                </span>
                <span>الدرجة: {r.correct}/{r.total} ({r.pct}%)</span>
                <span className="flex items-center gap-1"><Clock size={12} /> {r.minutes} دقيقة</span>
                <span style={{ color: CONF_COLOR[r.confidence] }}>دقة التقييم: {CONF_AR[r.confidence]} ({r.top_prob}%)</span>
                {r.ref_code ? <span>إحالة: {r.ref_code}</span> : null}
              </div>

              {r.alt_level && (
                <div
                  className="rounded-xl px-3 py-2 mb-4 text-xs flex items-center gap-2"
                  style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}
                >
                  <AlertTriangle size={13} />
                  على الحدود مع {r.alt_level} ({r.alt_prob}%) — أكّد المستوى في المكالمة قبل التسكين.
                </div>
              )}

              <SkillBars skills={r.skills} />

              {!r.listening_done && (
                <p className="text-[11px] mt-3 flex items-center gap-1.5" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                  <Headphones size={12} /> لم يُنفّذ قسم الاستماع على جهازه — النتيجة من بقية الأقسام.
                </p>
              )}

              {r.left_page > 2 && (
                <p className="text-[11px] mt-2 flex items-center gap-1.5" style={{ color: '#fbbf24' }}>
                  <AlertTriangle size={12} /> غادر الصفحة {r.left_page} مرة أثناء الاختبار.
                </p>
              )}

              {r.writing ? (
                <div className="mt-4">
                  <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--ds-text-primary, #f1f5f9)' }}>
                    <PenLine size={13} /> عيّنة الكتابة
                  </div>
                  <div
                    className="rounded-xl p-3 text-sm"
                    style={{
                      background: 'var(--ds-surface-2, rgba(255,255,255,0.04))',
                      borderInlineStart: '3px solid var(--ds-accent-primary, #38bdf8)',
                      direction: 'ltr',
                      textAlign: 'left',
                      lineHeight: 1.8,
                      color: 'var(--ds-text-primary, #e2e8f0)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {r.writing}
                  </div>
                  {r.writing_signals && (
                    <p className="text-[11px] mt-2" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>
                      {r.writing_signals.words} كلمة · {r.writing_signals.sentences} جمل · متوسط الجملة{' '}
                      {r.writing_signals.avgSentence} · روابط {r.writing_signals.linkers}
                      {Array.isArray(r.writing_signals.flags) && r.writing_signals.flags.length
                        ? ` · ${r.writing_signals.flags.join('، ')}`
                        : ''}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[11px] mt-3" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>تخطّى فقرة الكتابة.</p>
              )}

              {/* The exam's level IS the platform scale — no conversion needed. */}
              {lvl && (
                <div
                  className="mt-4 rounded-xl px-3 py-2 text-xs flex items-center gap-2"
                  style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)', color: 'var(--ds-text-secondary, #94a3b8)' }}
                >
                  <ClipboardCheck size={13} style={{ color: 'var(--ds-accent-primary, #38bdf8)' }} />
                  عند التسجيل: اضبط <b style={{ color: 'var(--ds-text-primary, #f1f5f9)' }}>academic_level = {r.level_index}</b>{' '}
                  ({lvl.code} · {lvl.cefr}) — نفس مقياس المنصة، بدون تحويل.
                </div>
              )}
            </>
          )}
        </div>
      )}
    </GlassPanel>
  )
}

export default function AdminLevelTests() {
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-level-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return data || []
    },
  })

  const stats = useMemo(() => {
    const done = rows.filter((r) => r.status === 'completed')
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const dist = [0, 0, 0, 0, 0, 0]
    done.forEach((r) => { if (r.level_index != null) dist[r.level_index] += 1 })
    const topIdx = dist.indexOf(Math.max(...dist))
    return {
      total: rows.length,
      done: done.length,
      week: done.filter((r) => new Date(r.created_at).getTime() >= weekAgo).length,
      completion: rows.length ? Math.round((done.length / rows.length) * 100) : 0,
      dist,
      top: done.length ? LEVELS[topIdx] : null,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    if (filter === 'week') return rows.filter((r) => r.status === 'completed' && new Date(r.created_at).getTime() >= weekAgo)
    if (filter === 'abandoned') return rows.filter((r) => r.status !== 'completed')
    if (filter === 'borderline') return rows.filter((r) => r.status === 'completed' && r.alt_level)
    if (filter.startsWith('lvl:')) return rows.filter((r) => String(r.level_index) === filter.slice(4))
    return rows
  }, [rows, filter])

  const chips = [
    { id: 'all', label: `الكل (${stats.total})` },
    { id: 'week', label: `هذا الأسبوع (${stats.week})` },
    { id: 'borderline', label: 'على الحدود' },
    { id: 'abandoned', label: `لم يكملوا (${stats.total - stats.done})` },
  ]

  return (
    <div className="max-w-4xl mx-auto" style={{ padding: 'var(--space-5)' }}>
      <SectionHeader
        kicker="من الموقع"
        title="اختبارات تحديد المستوى"
        subtitle="نتائج اختبار fluentia.academy/level-test — أشخاص مهتمون، لسّا ما عندهم حساب. كل صف ينتهي بخطوة واحدة: تواصل معه."
      />

      {/* Summary */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
        {[
          { label: 'أكملوا الاختبار', value: stats.done },
          { label: 'هذا الأسبوع', value: stats.week },
          { label: 'نسبة الإكمال', value: `${stats.completion}%` },
          { label: 'أكثر مستوى', value: stats.top ? `${stats.top.code} · ${stats.top.cefr}` : '—' },
        ].map((s) => (
          <GlassPanel key={s.label} padding="sm">
            <div className="text-2xl font-black tabular-nums" style={{ color: 'var(--ds-text-primary, #f1f5f9)' }}>{s.value}</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{s.label}</div>
          </GlassPanel>
        ))}
      </div>

      {/* Level distribution — where the market actually sits */}
      {stats.done > 0 && (
        <GlassPanel padding="md" className="mb-5">
          <div className="text-xs font-bold mb-3" style={{ color: 'var(--ds-text-primary, #f1f5f9)' }}>توزيع المستويات</div>
          <div className="flex items-end gap-2" style={{ height: 90 }}>
            {stats.dist.map((n, i) => {
              const max = Math.max(...stats.dist, 1)
              const hue = 200 - i * 14
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setFilter(filter === `lvl:${i}` ? 'all' : `lvl:${i}`)}
                  className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full"
                  title={`${LEVELS[i].ar} — ${n}`}
                >
                  <span className="text-[11px] tabular-nums" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>{n}</span>
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${(n / max) * 100}%`,
                      minHeight: 3,
                      background: `hsla(${hue}, 85%, 60%, ${filter === `lvl:${i}` ? 0.9 : 0.45})`,
                      transition: 'background .2s',
                    }}
                  />
                  <span className="text-[10px] font-bold" style={{ color: `hsl(${hue}, 85%, 68%)` }}>{LEVELS[i].code}</span>
                </button>
              )
            })}
          </div>
        </GlassPanel>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold"
            style={{
              background: filter === c.id ? 'rgba(56,189,248,0.14)' : 'var(--ds-surface-2, rgba(255,255,255,0.05))',
              color: filter === c.id ? 'var(--ds-accent-primary, #38bdf8)' : 'var(--ds-text-secondary, #94a3b8)',
              border: `1px solid ${filter === c.id ? 'rgba(56,189,248,0.35)' : 'transparent'}`,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--ds-text-tertiary, #64748b)' }}>جارٍ التحميل…</p>
      ) : filtered.length === 0 ? (
        <EmptyState message="ما فيه نتائج هنا بعد. أول شخص يخلّص الاختبار في الموقع بيظهر هنا مباشرة." />
      ) : (
        filtered.map((r) => (
          <ResultCard
            key={r.id}
            r={r}
            expanded={expandedId === r.id}
            onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
          />
        ))
      )}
    </div>
  )
}
