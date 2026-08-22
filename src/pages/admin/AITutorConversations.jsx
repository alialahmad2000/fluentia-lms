// «محادثات المدرّب الذكي» — what the AI tutor was actually asked, by whom.
//
// WHY THIS EXISTS
// The owner's ask was two things, not one: save the conversations, AND be able
// to see "how much hard work the student did" and "which things he learnt
// actively". The saving already worked — coach_conversations / coach_messages
// have been collecting writing and speaking threads for months — but RLS
// allowed exactly one reader, the student, and nothing in the app ever read
// them. The data existed and the question stayed unanswerable.
// (/admin/coach-activity is the HUMAN learning-coach page — touchpoints and
// blockers — and reads none of this.)
//
// "Which things did she learn actively" is the interesting half. A reading
// conversation is keyed to ONE pattern from «ورقة المذاكرة», so the list of
// patterns a student opened a thread about is a list of things she chose to dig
// into rather than skim — which is a far better signal than a completion tick.
//
// Deliberately NOT a moderation tool: no editing, no deleting. RLS is SELECT
// only for staff, and a transcript you can edit is not evidence of anything.
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, ChevronDown, BookOpen, PenLine, Mic, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'

const T = {
  ink: 'var(--ds-text-primary, #faf5e6)',
  body: 'var(--ds-text-secondary, #c9c3b0)',
  muted: 'var(--ds-text-tertiary, #8b8578)',
  gold: 'var(--ds-accent-primary, #e9b949)',
  wash: 'var(--ds-accent-wash, rgba(233,185,73,.08))',
  ground: 'var(--ds-bg-elevated, #0d111b)',
  raise: 'var(--ds-surface-1, rgba(255,255,255,0.028))',
  well: 'var(--ds-bg-base, #05070d)',
  edge: 'var(--ds-border-subtle, rgba(255,255,255,0.07))',
}
const KIND = {
  reading_pattern: { ar: 'تركيب من ورقة المذاكرة', icon: BookOpen },
  writing: { ar: 'الكتابة', icon: PenLine },
  speaking: { ar: 'التحدّث', icon: Mic },
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** One student's threads, loaded only when opened. */
function Transcript({ conversationId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tutor-transcript', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data || []
    },
    staleTime: 60_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 font-['Tajawal'] text-[12.5px]" style={{ color: T.muted }}>
        <Loader2 size={13} className="animate-spin" /> جاري التحميل…
      </div>
    )
  }
  if (!data?.length) {
    return <div className="px-4 py-4 font-['Tajawal'] text-[12.5px]" style={{ color: T.muted }}>لا توجد رسائل.</div>
  }
  return (
    <div className="space-y-2 px-4 py-4">
      {data.map((m) => {
        const isStudent = m.role === 'user'
        return (
          <div
            key={m.id}
            className="rounded-xl px-3.5 py-2.5"
            style={{
              background: isStudent ? T.wash : T.raise,
              border: `1px solid ${isStudent ? 'rgba(233,185,73,0.22)' : T.edge}`,
            }}
          >
            <div className="mb-1 font-['Tajawal'] text-[10.5px] font-bold" style={{ color: isStudent ? T.gold : T.muted }}>
              {isStudent ? 'الطالبة' : 'المدرّب الذكي'}
            </div>
            <p
              dir="auto"
              className="whitespace-pre-wrap font-['Tajawal'] text-[13px] leading-[1.95]"
              style={{ color: isStudent ? T.ink : T.body }}
            >
              {m.content}
            </p>
          </div>
        )
      })}
    </div>
  )
}

export default function AITutorConversations() {
  const profile = useAuthStore((s) => s.profile)
  const [openId, setOpenId] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['tutor-conversations'],
    queryFn: async () => {
      const { data: convos, error: e1 } = await supabase
        .from('coach_conversations')
        .select('id, student_id, task_id, task_type, pattern_id, message_count, total_cost_sar, last_message_at, created_at')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(500)
      if (e1) throw e1
      if (!convos?.length) return { convos: [], names: {}, patterns: {} }

      // Two flat lookups instead of PostgREST embeds — students→profiles has more
      // than one relationship and a bare embed is what took the admin students
      // page to zero rows once already.
      const ids = [...new Set(convos.map((c) => c.student_id))]
      const { data: profs } = await supabase.from('profiles').select('id, full_name, display_name').in('id', ids)
      const names = Object.fromEntries((profs || []).map((p) => [p.id, p.display_name || p.full_name || '—']))

      const readingIds = [...new Set(convos.filter((c) => c.task_type === 'reading_pattern').map((c) => c.task_id))]
      const patterns = {}
      if (readingIds.length) {
        const { data: reads } = await supabase
          .from('curriculum_readings').select('id, title_ar, title_en, study_sheet').in('id', readingIds)
        for (const r of reads || []) {
          for (const t of r.study_sheet?.teach || []) {
            patterns[`${r.id}:${t.id}`] = {
              pattern: t.title_ar || t.title_en || t.id,
              reading: r.title_ar || r.title_en || '',
            }
          }
        }
      }
      return { convos, names, patterns }
    },
    staleTime: 30_000,
  })

  const stats = useMemo(() => {
    const c = data?.convos || []
    return {
      threads: c.length,
      messages: c.reduce((s, x) => s + (x.message_count || 0), 0),
      students: new Set(c.map((x) => x.student_id)).size,
      cost: c.reduce((s, x) => s + Number(x.total_cost_sar || 0), 0),
      patterns: new Set(c.filter((x) => x.task_type === 'reading_pattern').map((x) => `${x.task_id}:${x.pattern_id}`)).size,
    }
  }, [data])

  if (profile && !['admin', 'trainer'].includes(profile.role)) return <Navigate to="/" replace />

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="font-['Tajawal'] text-[22px] font-extrabold" style={{ color: T.ink }}>
          محادثات المدرّب الذكي
        </h1>
        <p className="mt-1 font-['Tajawal'] text-[13px]" style={{ color: T.muted }}>
          ما الذي سألت عنه الطالبة فعلاً — وأي تراكيب اختارت أن تتعمّق فيها بدل أن تمرّ عليها.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          ['محادثات', stats.threads],
          ['رسائل', stats.messages],
          ['طالبات', stats.students],
          ['تراكيب بُحث فيها', stats.patterns],
          ['التكلفة (ريال)', stats.cost.toFixed(2)],
        ].map(([label, n]) => (
          <div key={label} className="rounded-2xl px-4 py-3.5" style={{ background: T.ground, border: `1px solid ${T.edge}` }}>
            <div dir="ltr" className="text-right font-en text-[21px] font-bold" style={{ color: T.gold }}>{n}</div>
            <div className="font-['Tajawal'] text-[11.5px]" style={{ color: T.muted }}>{label}</div>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 font-['Tajawal'] text-[13px]" style={{ color: T.muted }}>
          <Loader2 size={14} className="animate-spin" /> جاري التحميل…
        </div>
      )}
      {error && (
        <div className="rounded-2xl px-4 py-3 font-['Tajawal'] text-[13px]"
             style={{ background: 'rgba(224,102,102,0.08)', border: '1px solid rgba(224,102,102,0.24)', color: T.ink }}>
          تعذّر تحميل المحادثات.
        </div>
      )}
      {!isLoading && !error && !data?.convos?.length && (
        <div className="rounded-2xl px-5 py-8 text-center font-['Tajawal'] text-[13.5px]"
             style={{ background: T.ground, border: `1px solid ${T.edge}`, color: T.muted }}>
          لا توجد محادثات بعد. تظهر هنا حين تسأل الطالبة المدرّب الذكي داخل ورقة المذاكرة أو الكتابة أو التحدّث.
        </div>
      )}

      <div className="space-y-2">
        {(data?.convos || []).map((c) => {
          const kind = KIND[c.task_type] || KIND.writing
          const Icon = kind.icon
          const meta = c.task_type === 'reading_pattern' ? data.patterns[`${c.task_id}:${c.pattern_id}`] : null
          const isOpen = openId === c.id
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl" style={{ background: T.ground, border: `1px solid ${T.edge}` }}>
              <button
                onClick={() => setOpenId(isOpen ? null : c.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-right transition-colors hover:bg-white/[0.03] sm:px-5 [@media(pointer:coarse)]:min-h-[44px]"
              >
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg" style={{ background: T.wash }}>
                  <Icon size={14} style={{ color: T.gold }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-['Tajawal'] text-[14px] font-bold" style={{ color: T.ink }}>
                    {data.names[c.student_id] || '—'}
                  </span>
                  <span className="block truncate font-['Tajawal'] text-[11.5px]" style={{ color: T.muted }}>
                    {meta ? `${meta.pattern} — ${meta.reading}` : kind.ar}
                  </span>
                </span>
                <span dir="ltr" className="flex-none text-right font-en text-[11.5px]" style={{ color: T.muted }}>
                  {c.message_count || 0} msgs · {fmt(c.last_message_at || c.created_at)}
                </span>
                <ChevronDown size={15} style={{ color: T.muted }} className={`flex-none transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div style={{ borderTop: `1px solid ${T.edge}`, background: T.well }}>
                  <Transcript conversationId={c.id} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
