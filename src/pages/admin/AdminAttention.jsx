import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle, Bell, PartyPopper, Check, Clock, X,
  MessagesSquare, Sparkles, Copy, Loader2, UserCheck, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { toast } from '@/components/ui/FluentiaToast'

// ── المتابعة — academy-wide student-attention queue (2026-07-25) ────────────
// The signals engine has been drafting outreach every 4 hours since April, and
// the trainer home has always rendered it. But it is keyed to trainer_id, and
// the owner is role=admin — so 2,342 signals expired unseen and not one was
// ever acted on. This is the same queue, academy-wide, where Ali actually works.

const SEV = {
  urgent:    { label: 'عاجل',   icon: AlertTriangle, color: '#fb7185', order: 0 },
  attention: { label: 'متابعة', icon: Bell,          color: '#f59e0b', order: 1 },
  celebrate: { label: 'تهنئة',  icon: PartyPopper,   color: '#4ade80', order: 2 },
}

const REASON_AR = {
  never_logged_in: 'لم يدخل الحساب أبداً',
  silent_48h:      'غياب أكثر من ٤٨ ساعة',
  silent_7d:       'غياب أكثر من أسبوع',
  streak_at_risk:  'سلسلة الأيام على وشك الانقطاع',
  stuck_on_unit:   'متوقّف على نفس الوحدة',
}

const card =
  'rounded-2xl bg-white/[0.03] border border-white/[0.06] ' +
  'shadow-[0_1px_2px_rgba(0,0,0,0.35),0_8px_24px_-12px_rgba(0,0,0,0.55)]'

const BTN = 'inline-flex items-center gap-2 text-[13px] font-bold px-3.5 h-10 rounded-xl transition-colors disabled:opacity-50'

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const ar = (n) => String(n).replace(/\d/g, (d) => AR_DIGITS[+d])

function sinceLabel(d) {
  if (d === 0) return 'اليوم'
  if (d === 1) return 'أمس'
  if (d === 2) return 'قبل يومين'
  if (d <= 10) return `قبل ${ar(d)} أيام`
  return `قبل ${ar(d)} يوماً`
}

function urgentLabel(n) {
  if (n === 1) return 'حالة عاجلة واحدة تنتظر'
  if (n === 2) return 'حالتان عاجلتان تنتظران'
  if (n <= 10) return `${ar(n)} حالات عاجلة تنتظر`
  return `${ar(n)} حالة عاجلة تنتظر`
}

function daysSince(iso) {
  if (!iso) return 0
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000))
}

function StatCard({ value, label, color }) {
  return (
    <div className={`${card} px-4 py-3.5`}>
      <div className="text-[26px] font-bold leading-none" style={{ color }}>{ar(value ?? 0)}</div>
      <div className="text-[12.5px] mt-1.5" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>{label}</div>
    </div>
  )
}

function Row({ it, actorId }) {
  const qc = useQueryClient()
  const reduce = useReducedMotion()
  const meta = SEV[it.severity] || SEV.attention
  const Icon = meta.icon
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(it.suggested_message_ar || '')
  const [drafting, setDrafting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [done, setDone] = useState(null)

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'attention-queue'] })

  async function act(action, snoozeHours) {
    setBusy(action)
    const { data, error } = await supabase.rpc('act_on_intervention', {
      p_intervention_id: it.id,
      p_action: action,
      p_trainer_id: actorId,
      p_notes: action === 'acted' && message ? message.slice(0, 500) : null,
      p_snooze_hours: snoozeHours ?? 24,
    })
    setBusy(null)
    if (error || data?.success === false) {
      toast({ type: 'error', title: 'تعذّر تنفيذ الإجراء', description: error?.message || data?.error || '' })
      return
    }
    setDone(action)
    setTimeout(refresh, 900)
  }

  async function draft() {
    setDrafting(true)
    const { data, error } = await supabase.functions.invoke('draft-intervention-message', {
      body: { intervention_id: it.id },
    })
    setDrafting(false)
    if (error || !data?.ok) {
      toast({ type: 'error', title: 'تعذّر كتابة الرسالة', description: data?.error || error?.message || '' })
      return
    }
    setMessage(data.message || '')
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast({ type: 'error', title: 'تعذّر النسخ', description: 'انسخ النص يدوياً من الصندوق' })
    }
  }

  if (done) {
    return (
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: reduce ? 1 : 0.45 }}
        className={`${card} px-4 py-3.5 flex items-center gap-2.5`}>
        <Check size={16} className="text-emerald-400 shrink-0" />
        <span className="text-[13px]" style={{ color: 'var(--text-secondary,#cbd5e1)' }}>
          {done === 'acted' ? 'تم التواصل' : done === 'snoozed' ? 'أُجّلت ٤٨ ساعة' : 'تم التجاهل'}
          {' · '}{it.student_name}
        </span>
      </motion.div>
    )
  }

  const days = daysSince(it.created_at)

  return (
    <div
      className={`${card} p-5 transition-[transform,border-color,background-color] duration-150 ease-out hover:-translate-y-[2px] hover:border-white/[0.12] hover:bg-white/[0.045]`}
      style={{
        borderInlineStartWidth: 3,
        borderInlineStartColor: meta.color,
        ...(it.severity === 'urgent' && {
          boxShadow: '0 0 0 1px rgba(251,113,133,0.10), 0 8px 28px -14px rgba(251,113,133,0.40)',
        }),
      }}
    >
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 mt-0.5"
          style={{ background: `${meta.color}1f`, color: meta.color }}>
          <Icon size={16} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/admin/student/${it.student_id}/report`}
              className="text-[14.5px] font-bold hover:text-sky-300 transition-colors"
              style={{ color: 'var(--text-primary,#f8fafc)' }}>
              {it.student_name || 'طالب'}
            </Link>
            <span className="text-[12px] px-2 py-0.5 rounded-md border"
              style={{ color: meta.color, background: `${meta.color}14`, borderColor: `${meta.color}33` }}>
              {meta.label}
            </span>
            <span className="text-[12.5px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
              {it.reason_ar || REASON_AR[it.reason_code] || it.reason_code}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap text-[12px]"
            style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
            {it.trainer_name && (
              <span className="inline-flex items-center gap-1.5"><UserCheck size={13} /> {it.trainer_name}</span>
            )}
            <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {sinceLabel(days)}</span>
          </div>

          {it.suggested_action_ar && (
            <div className="text-[12.5px] mt-2.5 bg-black/25 border border-white/[0.06] rounded-lg px-3 py-2"
              style={{ color: 'var(--text-secondary,#cbd5e1)' }}>
              {it.suggested_action_ar}
            </div>
          )}

          <AnimatePresence>
            {message && (
              <motion.div
                initial={reduce ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                className="overflow-hidden">
                <div className="mt-2.5 rounded-xl bg-black/25 border border-white/[0.08] px-3 py-2.5">
                  <textarea
                    dir="auto" rows={4} value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-transparent resize-none text-[13px] leading-relaxed outline-none"
                    style={{ color: 'var(--text-primary,#f8fafc)' }}
                  />
                  <button type="button" onClick={copy}
                    className={`${BTN} mt-1 bg-white/[0.05] border border-white/10 hover:bg-white/[0.09]`}
                    style={{ color: 'var(--text-primary,#f8fafc)' }}>
                    <Copy size={14} /> {copied ? 'تم النسخ ✓' : 'انسخ الرسالة'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button type="button" disabled={drafting} onClick={draft}
              className={`${BTN} bg-sky-500/10 text-sky-300 border border-sky-500/25 hover:bg-sky-500/15`}>
              {drafting ? <Loader2 size={14} className="animate-spin" /> : message ? <RefreshCw size={14} /> : <Sparkles size={14} />}
              {drafting ? 'يكتب…' : message ? 'أعد الكتابة' : 'اكتب رسالة'}
            </button>
            <button type="button" disabled={!!busy} onClick={() => act('acted')}
              className={`${BTN} bg-white/[0.05] border border-white/10 hover:bg-white/[0.09]`}
              style={{ color: 'var(--text-primary,#f8fafc)' }}>
              <Check size={14} /> تواصلت
            </button>
            <button type="button" disabled={!!busy} onClick={() => act('snoozed', 48)}
              className={`${BTN} bg-white/[0.05] border border-white/10 hover:bg-white/[0.09]`}
              style={{ color: 'var(--text-secondary,#cbd5e1)' }}>
              <Clock size={14} /> تأجيل
            </button>
            <button type="button" disabled={!!busy} onClick={() => act('dismissed')}
              className={`${BTN} hover:bg-white/[0.05]`}
              style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
              <X size={14} /> تجاهل
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminAttention() {
  const profile = useAuthStore((s) => s.profile)
  const reduce = useReducedMotion()
  const [filter, setFilter] = useState('all')

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['admin', 'attention-queue', profile?.id],
    enabled: !!profile?.id,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_intervention_queue', {
        p_trainer_id: profile.id,
        p_limit: 200,
        p_include_all: true,
      })
      if (error) throw error
      return Array.isArray(data) ? data : (data?.items || [])
    },
  })

  const counts = useMemo(() => ({
    all: items.length,
    urgent: items.filter((i) => i.severity === 'urgent').length,
    attention: items.filter((i) => i.severity === 'attention').length,
    celebrate: items.filter((i) => i.severity === 'celebrate').length,
  }), [items])

  const rows = useMemo(() => {
    const list = filter === 'all' ? items : items.filter((i) => i.severity === filter)
    return [...list].sort((a, b) => (SEV[a.severity]?.order ?? 1) - (SEV[b.severity]?.order ?? 1))
  }, [items, filter])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/25 grid place-items-center shrink-0">
          <Bell className="w-5 h-5 text-rose-300" />
        </div>
        <div>
          <h1 className="text-page-title font-bold" style={{ color: 'var(--text-primary,#f8fafc)' }}>المتابعة</h1>
          <p className="text-[13.5px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
            الطلاب الذين يحتاجون كلمة منك اليوم — يرصدهم النظام كل ٤ ساعات
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={counts.urgent}    label="عاجل"     color={counts.urgent ? '#fb7185' : '#94a3b8'} />
        <StatCard value={counts.attention} label="متابعة"   color={counts.attention ? '#f59e0b' : '#94a3b8'} />
        <StatCard value={counts.celebrate} label="تهنئة"    color={counts.celebrate ? '#4ade80' : '#94a3b8'} />
        <StatCard value={counts.all}       label="الإجمالي" color="#94a3b8" />
      </div>

      {counts.urgent > 0 && (
        <p className="text-[13px] text-rose-300/90 -mt-2">{urgentLabel(counts.urgent)}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {[['all', 'الكل'], ['urgent', 'عاجل'], ['attention', 'متابعة'], ['celebrate', 'تهنئة']]
          .filter(([k]) => k === 'all' || counts[k] > 0)
          .map(([k, label]) => (
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
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={`${card} h-32 animate-pulse`} />)}
        </div>
      )}

      {error && (
        <div className={`${card} p-6 text-center text-[13px]`} style={{ color: 'var(--text-tertiary,#94a3b8)' }}>
          تعذّر تحميل قائمة المتابعة.
        </div>
      )}

      {!isLoading && !error && rows.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <MessagesSquare size={30} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary,#64748b)' }} />
          <div className="font-bold mb-1" style={{ color: 'var(--text-primary,#f8fafc)' }}>لا أحد بحاجة متابعة الآن</div>
          <div className="text-[13px]" style={{ color: 'var(--text-tertiary,#94a3b8)' }}>كل الطلاب على المسار</div>
        </div>
      )}

      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {rows.map((it) => (
            <motion.div key={it.id} layout
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}>
              <Row it={it} actorId={profile?.id} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
