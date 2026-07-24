import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Target, Briefcase, Sparkles, Wand2, Loader2, Check, X,
  ChevronDown, Quote, Clock, CalendarClock, ClipboardList,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/FluentiaToast'

// ── استمارات التعارف (2026-07-25) ──────────────────────────────────────────
// Every bespoke track so far started from Ali learning, in conversation, why a
// student needs English — knowledge that lived only in his head and could reach
// one student at a time. The intake captures it for everyone; this is where he
// reads it, and where a first-draft course spec is proposed for him to shape.
//
// Drafting is proposal-only. Nothing here publishes to a student.

const GOAL_META = {
  ielts:  { label: 'آيلتس',   icon: Target,    color: '#7dd3fc' },
  career: { label: 'العمل',   icon: Briefcase, color: '#e2b871' },
  growth: { label: 'الطلاقة', icon: Sparkles,  color: '#86cf9c' },
}

const HORIZON_AR = {
  '2_months': 'خلال شهرين',
  '3_6_months': '٣–٦ أشهر',
  a_year: 'خلال سنة',
  no_deadline: 'بلا موعد',
}

const CONFIDENCE_AR = {
  1: 'يفهم قليلاً', 2: 'يتلعثم عند الكلام', 3: 'يتكلم في المعتاد',
  4: 'مرتاح غالباً', 5: 'يريد الصقل',
}

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const ar = (n) => String(n ?? 0).replace(/\d/g, (d) => AR_DIGITS[+d])

const card =
  'rounded-2xl bg-white/[0.03] border border-white/[0.06] ' +
  'shadow-[0_1px_2px_rgba(0,0,0,0.35),0_8px_24px_-12px_rgba(0,0,0,0.55)]'

const BTN = 'inline-flex items-center gap-2 text-[13px] font-bold px-3.5 h-10 rounded-xl transition-colors disabled:opacity-50'

function StatCard({ value, label, color }) {
  return (
    <div className={`${card} px-4 py-3.5`}>
      <div className="text-[26px] font-bold leading-none" style={{ color }}>{ar(value)}</div>
      <div className="text-[12.5px] mt-1.5" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>{label}</div>
    </div>
  )
}

function SpecView({ spec }) {
  if (!spec?.units?.length) return null
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="text-[15px] font-bold" style={{ color: 'var(--text-primary,#f8fafc)' }}>
          {spec.track_name_ar}
        </div>
        <div className="text-[12.5px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
          {spec.track_name_en} · {ar(spec.weeks)} أسبوعاً · {ar(spec.units.length)} وحدة
        </div>
      </div>

      {spec.rationale_ar && (
        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary,#cbd5e1)' }}>
          {spec.rationale_ar}
        </p>
      )}

      {spec.target_moment_ar && (
        <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 px-3 py-2.5">
          <div className="text-[12px] text-emerald-300/80 mb-1">في النهاية سيقدر على</div>
          <div className="text-[13px] text-emerald-50/90">{spec.target_moment_ar}</div>
        </div>
      )}

      <div className="space-y-2">
        {spec.units.map((u) => (
          <div key={u.n} className="rounded-xl bg-black/25 border border-white/[0.06] px-3.5 py-3">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[12px] font-bold" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                {ar(u.n)}
              </span>
              <span className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary,#f8fafc)' }}>
                {u.title_ar}
              </span>
              <span className="text-[12px]" dir="ltr" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                {u.title_en}
              </span>
            </div>
            <p className="text-[12.5px] mt-1.5" style={{ color: 'var(--text-secondary,#cbd5e1)' }}>{u.goal_ar}</p>
            {u.deliverable_ar && (
              <p className="text-[12px] mt-1.5" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                الناتج: {u.deliverable_ar}
              </p>
            )}
            {u.scenarios?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {u.scenarios.slice(0, 4).map((sc, i) => (
                  <span key={i} className="text-[12px] px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08]"
                    style={{ color: 'var(--text-tertiary,#94a3b8)' }}>{sc}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {spec.open_questions_ar?.length > 0 && (
        <div className="rounded-xl bg-amber-500/[0.07] border border-amber-500/20 px-3.5 py-3">
          <div className="text-[12px] text-amber-300/85 mb-1.5">أسئلة قبل البناء</div>
          <ul className="space-y-1">
            {spec.open_questions_ar.map((q, i) => (
              <li key={i} className="text-[12.5px] text-amber-50/85">— {q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function IntakeRow({ row, drafts }) {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const meta = GOAL_META[row.goal] || GOAL_META.growth
  const Icon = meta.icon
  const [open, setOpen] = useState(false)
  const [drafting, setDrafting] = useState(false)
  const [busy, setBusy] = useState(false)

  const draft = drafts?.find((d) => d.student_id === row.student_id)

  async function propose() {
    setDrafting(true)
    const { data, error } = await supabase.functions.invoke('draft-custom-track', {
      body: { student_id: row.student_id },
    })
    setDrafting(false)
    if (error || !data?.ok) {
      toast({ type: 'error', title: 'تعذّر اقتراح المسار', description: data?.error || error?.message || '' })
      return
    }
    setOpen(true)
    qc.invalidateQueries({ queryKey: ['admin', 'track-drafts'] })
  }

  async function review(status) {
    if (!draft) return
    setBusy(true)
    const { error } = await supabase
      .from('custom_track_drafts')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', draft.id)
      .select()
    setBusy(false)
    if (error) {
      toast({ type: 'error', title: 'تعذّر الحفظ', description: error.message })
      return
    }
    qc.invalidateQueries({ queryKey: ['admin', 'track-drafts'] })
  }

  return (
    <div className={`${card} p-5`} style={{ borderInlineStartWidth: 3, borderInlineStartColor: meta.color }}>
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 mt-0.5"
          style={{ background: `${meta.color}1f`, color: meta.color }}>
          <Icon size={16} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14.5px] font-bold" style={{ color: 'var(--text-primary,#f8fafc)' }}>
              {row.student_name || 'طالب'}
            </span>
            <span className="text-[12px] px-2 py-0.5 rounded-md border"
              style={{ color: meta.color, background: `${meta.color}14`, borderColor: `${meta.color}33` }}>
              {meta.label}
            </span>
            {row.field && (
              <span className="text-[12.5px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                {row.field}{row.role_title ? ` · ${row.role_title}` : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[12px]"
            style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={13} /> {HORIZON_AR[row.horizon] || '—'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={13} /> {ar(row.weekly_hours)} ساعات أسبوعياً
            </span>
            <span>{CONFIDENCE_AR[row.confidence] || ''}</span>
          </div>

          {row.motivation_moment && (
            <div className="mt-3 rounded-xl bg-black/25 border border-white/[0.06] px-3.5 py-3">
              <Quote size={13} className="mb-1.5" style={{ color: 'var(--text-tertiary,#64748b)' }} />
              <p className="text-[13.5px] leading-relaxed" style={{ color: 'var(--text-secondary,#cbd5e1)' }}>
                {row.motivation_moment}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button type="button" disabled={drafting} onClick={propose}
              className={`${BTN} bg-sky-500/10 text-sky-300 border border-sky-500/25 hover:bg-sky-500/15`}>
              {drafting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {drafting ? 'يقترح…' : draft ? 'اقترح من جديد' : 'اقترح مساراً'}
            </button>

            {draft && (
              <>
                <button type="button" onClick={() => setOpen((v) => !v)}
                  className={`${BTN} bg-white/[0.05] border border-white/10 hover:bg-white/[0.09]`}
                  style={{ color: 'var(--text-primary,#f8fafc)' }}>
                  <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
                  {open ? 'إخفاء المقترح' : 'اعرض المقترح'}
                </button>
                <span className="text-[12px] px-2 py-1 rounded-md border"
                  style={draft.status === 'approved'
                    ? { color: '#86cf9c', background: '#86cf9c14', borderColor: '#86cf9c33' }
                    : draft.status === 'rejected'
                    ? { color: '#94a3b8', background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' }
                    : { color: '#e2b871', background: '#e2b87114', borderColor: '#e2b87133' }}>
                  {draft.status === 'approved' ? 'معتمَد' : draft.status === 'rejected' ? 'مرفوض' : 'مسودّة'}
                </span>
              </>
            )}
          </div>

          <AnimatePresence>
            {open && draft && (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                className="overflow-hidden">
                <SpecView spec={draft.spec} />
                {draft.status === 'draft' && (
                  <div className="flex items-center gap-2 mt-3">
                    <button type="button" disabled={busy} onClick={() => review('approved')}
                      className={`${BTN} bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/15`}>
                      <Check size={14} /> اعتمد للبناء
                    </button>
                    <button type="button" disabled={busy} onClick={() => review('rejected')}
                      className={`${BTN} hover:bg-white/[0.05]`}
                      style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
                      <X size={14} /> ارفض
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default function AdminIntake() {
  const [filter, setFilter] = useState('all')

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin', 'student-intakes'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_intake')
        .select('*, profiles!student_intake_student_id_fkey(full_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map((r) => ({ ...r, student_name: r.profiles?.full_name }))
    },
  })

  const { data: drafts = [] } = useQuery({
    queryKey: ['admin', 'track-drafts'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_track_drafts').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const counts = useMemo(() => ({
    all: rows.length,
    ielts: rows.filter((r) => r.goal === 'ielts').length,
    career: rows.filter((r) => r.goal === 'career').length,
    growth: rows.filter((r) => r.goal === 'growth').length,
  }), [rows])

  const list = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.goal === filter)),
    [rows, filter]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/25 grid place-items-center shrink-0">
          <ClipboardList className="w-5 h-5 text-sky-300" />
        </div>
        <div>
          <h1 className="text-page-title font-bold" style={{ color: 'var(--text-primary,#f8fafc)' }}>
            استمارات التعارف
          </h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
            لماذا يتعلّم كل طالب الإنجليزية — بكلماته هو
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={counts.ielts}  label="آيلتس"     color={counts.ielts ? '#7dd3fc' : '#94a3b8'} />
        <StatCard value={counts.career} label="العمل"     color={counts.career ? '#e2b871' : '#94a3b8'} />
        <StatCard value={counts.growth} label="الطلاقة"   color={counts.growth ? '#86cf9c' : '#94a3b8'} />
        <StatCard value={counts.all}    label="الإجمالي"  color="#94a3b8" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[['all', 'الكل'], ['ielts', 'آيلتس'], ['career', 'العمل'], ['growth', 'الطلاقة']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => setFilter(k)}
            className={`px-4 h-10 rounded-xl text-[13px] font-bold border transition-colors ${
              filter === k
                ? 'bg-sky-500/15 border-sky-500/35 text-sky-200'
                : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
            }`}
            style={filter === k ? undefined : { color: 'var(--text-tertiary,#94a3b8)' }}>
            {label} <span className="opacity-60">{ar(counts[k] ?? 0)}</span>
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`${card} h-40 animate-pulse`} />)}
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <ClipboardList size={30} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary,#64748b)' }} />
          <div className="font-bold mb-1" style={{ color: 'var(--text-primary,#f8fafc)' }}>
            لا توجد استمارات بعد
          </div>
          <div className="text-[13px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
            ستظهر هنا فور أن يملأها الطلاب
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.map((r) => <IntakeRow key={r.student_id} row={r} drafts={drafts} />)}
      </div>
    </div>
  )
}
