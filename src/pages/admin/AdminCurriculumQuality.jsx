import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Sparkles, CheckCircle2, EyeOff, RefreshCw,
  BookOpen, Headphones, PenLine, Volume2, Shuffle, ChevronDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/FluentiaToast'

// ── Curriculum Quality — REPORT-ONLY mistake detector (Ali, 2026-06-09) ──────
// The AI scans real student answers and SUSPECTS curriculum mistakes (wrong
// keyed answer, too-strict grading, ambiguous options, broken audio, confusing
// vocab pairs). It never edits content: every flag here waits for a HUMAN
// decision — fix it in the curriculum editor, then mark it, or dismiss it.

const SOURCE_META = {
  reading_question:   { label: 'سؤال قراءة',    icon: BookOpen,   cls: 'text-sky-300 bg-sky-500/10 border-sky-500/25' },
  listening_question: { label: 'سؤال استماع',   icon: Headphones, cls: 'text-violet-300 bg-violet-500/10 border-violet-500/25' },
  grammar_exercise:   { label: 'تمرين قواعد',   icon: PenLine,    cls: 'text-amber-300 bg-amber-500/10 border-amber-500/25' },
  audio_health:       { label: 'ملف صوتي',      icon: Volume2,    cls: 'text-rose-300 bg-rose-500/10 border-rose-500/25' },
  vocab_confusion:    { label: 'التباس مفردات', icon: Shuffle,    cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25' },
}

const SEVERITY_META = {
  high:   { label: 'عالية',   dot: '#f43f5e' },
  medium: { label: 'متوسطة', dot: '#f59e0b' },
  low:    { label: 'منخفضة', dot: '#64748b' },
}

const CATEGORY_AR = {
  wrong_key: 'إجابة معتمدة مشكوك فيها',
  too_strict_grading: 'تصحيح صارم أكثر من اللازم',
  ambiguous_options: 'خيارات ملتبسة',
  unanswerable: 'لا يُجاب من المحتوى',
  student_behavior: 'سلوك طلاب (المنهج سليم)',
  other: 'أخرى',
}

const STATUS_TABS = [
  { id: 'open',     label: 'بانتظار المراجعة' },
  { id: 'fixed',    label: 'تم الإصلاح' },
  { id: 'dismissed', label: 'مُتجاهَل' },
  { id: 'auto_ok',  label: 'فحصها الذكاء — سليمة' },
]

const card = 'rounded-2xl bg-white/[0.03] border border-white/[0.06]'

export default function AdminCurriculumQuality() {
  const qc = useQueryClient()
  const [statusTab, setStatusTab] = useState('open')
  const [scanning, setScanning] = useState(false)

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['admin', 'curriculum-quality-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_quality_flags')
        .select('*')
        .order('severity', { ascending: true }) // high < low alphabetically? no — order client-side
        .order('updated_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return data || []
    },
    refetchInterval: scanning ? 8000 : false,
  })

  const counts = useMemo(() => {
    const c = { open: 0, fixed: 0, dismissed: 0, auto_ok: 0, high: 0 }
    for (const f of flags) {
      c[f.status] = (c[f.status] || 0) + 1
      if (f.status === 'open' && f.severity === 'high') c.high++
    }
    return c
  }, [flags])

  const sevRank = { high: 0, medium: 1, low: 2 }
  const visible = useMemo(
    () => flags
      .filter((f) => f.status === statusTab)
      .sort((a, b) => (sevRank[a.severity] ?? 3) - (sevRank[b.severity] ?? 3)),
    [flags, statusTab],
  )

  const runScan = async () => {
    setScanning(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/curriculum-mistake-detector`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ trigger: 'admin' }),
        },
      )
      const j = await res.json()
      if (!j.ok) throw new Error(j.error || 'scan failed')
      toast({ type: 'success', title: 'بدأ الفحص', description: `${j.ai_reviewing} عنصراً تحت مراجعة الذكاء الاصطناعي — النتائج تظهر هنا أولاً بأول` })
      setTimeout(() => setScanning(false), 120000)
    } catch (e) {
      setScanning(false)
      toast({ type: 'error', title: 'تعذّر بدء الفحص', description: e.message })
    }
  }

  const setStatus = async (flag, status) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('curriculum_quality_flags')
      .update({ status, resolved_at: new Date().toISOString(), resolved_by: user?.id || null })
      .eq('id', flag.id)
    if (error) { toast({ type: 'error', title: 'تعذّر التحديث', description: error.message }); return }
    qc.invalidateQueries({ queryKey: ['admin', 'curriculum-quality-flags'] })
  }

  return (
    <div dir="rtl" className="space-y-6 p-4 sm:p-6 max-w-4xl mx-auto" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">جودة المنهج</h1>
            <p className="text-sm text-slate-400">
              الذكاء الاصطناعي يشتبه ويبلّغ — والقرار والإصلاح لكم. لا يعدّل المنهج أبداً.
            </p>
          </div>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-2 px-4 h-11 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: 'rgba(56,189,248,0.14)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)' }}
        >
          {scanning ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {scanning ? 'يفحص الآن…' : 'افحص الآن'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard value={counts.open} label="بانتظار المراجعة" color={counts.open ? '#f59e0b' : '#94a3b8'} />
        <StatCard value={counts.high} label="خطورة عالية" color={counts.high ? '#f43f5e' : '#94a3b8'} />
        <StatCard value={counts.fixed} label="أُصلحت" color="#34d399" />
        <StatCard value={counts.auto_ok} label="فُحصت وسليمة" color="#94a3b8" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setStatusTab(t.id)}
            className="px-3.5 h-10 rounded-xl text-[13px] font-bold border transition-colors"
            style={statusTab === t.id
              ? { background: 'rgba(56,189,248,0.14)', color: '#38bdf8', borderColor: 'rgba(56,189,248,0.35)' }
              : { background: 'rgba(255,255,255,0.03)', color: '#94a3b8', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`${card} h-28 animate-pulse`} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className={`${card} py-14 text-center text-slate-400`}>
          <CheckCircle2 className="w-9 h-9 mx-auto mb-3 opacity-40" />
          {statusTab === 'open'
            ? 'لا توجد شبهات بانتظار المراجعة — المنهج نظيف حسب آخر فحص ✓'
            : 'لا عناصر هنا'}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {visible.map((f) => (
              <FlagCard key={f.id} flag={f} onSetStatus={setStatus} showActions={statusTab === 'open'} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color }) {
  return (
    <div className={`${card} p-4`}>
      <div className="text-2xl font-extrabold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  )
}

function FlagCard({ flag, onSetStatus, showActions }) {
  const [open, setOpen] = useState(false)
  const meta = SOURCE_META[flag.source] || SOURCE_META.grammar_exercise
  const sev = SEVERITY_META[flag.severity] || SEVERITY_META.low
  const Icon = meta.icon
  const v = flag.ai_verdict || {}
  const ev = flag.evidence || {}
  const title = ev.question_en || ev.target_word
    ? (ev.question_en || `«${ev.target_word}» ⇄ «${ev.chosen_word}»`)
    : (flag.item_ref?.audio_url ? decodeURIComponent(String(flag.item_ref.audio_url).split('/').pop() || '') : flag.dedupe_key)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`${card} overflow-hidden`}
      style={flag.severity === 'high' && flag.status === 'open' ? { borderColor: 'rgba(244,63,94,0.3)' } : undefined}
    >
      <button onClick={() => setOpen((o) => !o)} className="w-full text-right p-4 flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center ${meta.cls}`}>
          <Icon size={15} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}>{meta.label}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-white/10 text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sev.dot }} />
              {sev.label}
            </span>
            {v.category && <span className="text-[10px] text-slate-500">{CATEGORY_AR[v.category] || v.category}</span>}
          </span>
          <span className="block text-sm text-white font-medium mt-1.5 leading-relaxed" dir="auto">{title}</span>
          {v.reason_ar && <span className="block text-[13px] text-slate-400 mt-1 leading-relaxed">{v.reason_ar}</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 mt-1 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] space-y-3">
              {v.suggested_fix_ar && (
                <div className="rounded-xl p-3 text-[13px] leading-relaxed" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)', color: '#bae6fd' }}>
                  <span className="font-bold text-sky-300">الإصلاح المقترح: </span>{v.suggested_fix_ar}
                </div>
              )}

              {ev.attempts != null && (
                <div className="text-xs text-slate-400">
                  {ev.attempts} محاولة من {ev.students} طالب — نسبة الخطأ {ev.wrong_pct}%
                </div>
              )}

              {ev.wrong_distribution && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500">توزيع الإجابات الخاطئة</div>
                  {Object.entries(ev.wrong_distribution)
                    .sort((a, b) => b[1] - a[1]).slice(0, 6)
                    .map(([ans, n]) => (
                      <div key={ans} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0 text-[12px] text-slate-300 truncate" dir="auto" title={ans}>{ans || '—'}</div>
                        <div className="w-28 h-2 rounded-full bg-white/[0.05] overflow-hidden shrink-0">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, (n / (ev.wrong_n || 1)) * 100)}%`, background: 'rgba(244,63,94,0.55)' }} />
                        </div>
                        <div className="text-[11px] text-slate-400 w-6 text-left shrink-0">{n}</div>
                      </div>
                    ))}
                </div>
              )}

              {ev.errors != null && (
                <div className="text-xs text-slate-400">
                  {ev.errors} خطأ تشغيل، {ev.stalls} تقطّع، عند {ev.students} طالب خلال ١٤ يوماً
                  {Array.isArray(ev.reasons) && ev.reasons.length > 0 && <span> — الأسباب: {ev.reasons.join('، ')}</span>}
                </div>
              )}

              {showActions && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => onSetStatus(flag, 'fixed')}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-10 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25"
                  >
                    <CheckCircle2 size={14} /> أصلحناها
                  </button>
                  <button
                    onClick={() => onSetStatus(flag, 'dismissed')}
                    className="flex items-center gap-1.5 text-xs font-bold px-3.5 h-10 rounded-xl bg-white/[0.05] text-slate-300 border border-white/10 hover:bg-white/[0.09]"
                  >
                    <EyeOff size={14} /> ليست مشكلة
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
