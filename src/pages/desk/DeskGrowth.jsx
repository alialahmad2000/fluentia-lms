// DeskGrowth (تقدّمي) — not XP and badges: a professional's readout of how ready she is to
// handle English work calls, built from her REAL roleplay grades (ai_evaluation subscores +
// correction points). A readiness instrument, four competency meters, recurring focus points,
// and a ledger of every call she's taken.
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp, Target, ArrowLeft, CheckCircle2, Radio } from 'lucide-react'
import { useDeskModules } from './useDeskModules'
import { useDeskInsights } from './useDeskInsights'
import './desk.css'

const COMPS = [
  { key: 'grammar',    ar: 'القواعد' },
  { key: 'vocabulary', ar: 'المفردات' },
  { key: 'fluency',    ar: 'الطلاقة' },
  { key: 'task',       ar: 'إنجاز المهمة' },
]

const band = (pct) =>
  pct >= 85 ? { ar: 'جاهزة للعمل', c: '#6ee7b7' }
  : pct >= 65 ? { ar: 'قويّة', c: '#efd299' }
  : pct >= 40 ? { ar: 'تتقدّمين', c: '#c9a25c' }
  : { ar: 'في البداية', c: 'rgba(243,238,226,0.6)' }

function ReadinessRing({ pct }) {
  const R = 66, C = 2 * Math.PI * R
  const b = band(pct)
  return (
    <div className="relative" style={{ width: 168, height: 168 }}>
      <svg width="168" height="168" viewBox="0 0 168 168" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="84" cy="84" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <motion.circle
          cx="84" cy="84" r={R} fill="none" stroke="url(#deskGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct / 100) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} style={{ filter: 'drop-shadow(0 0 8px rgba(201,162,92,0.5))' }} />
        <defs>
          <linearGradient id="deskGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c9a25c" /><stop offset="100%" stopColor="#efd299" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-['Inter'] font-black text-[38px] leading-none tabular-nums" style={{ color: 'var(--cream)' }}>{pct}<span className="text-[18px]" style={{ color: 'rgba(243,238,226,0.5)' }}>%</span></span>
        <span className="font-['Tajawal'] text-[12px] font-bold mt-1" style={{ color: b.c }}>{b.ar}</span>
      </div>
    </div>
  )
}

function Meter({ label, score }) {
  const pct = score !== null && score !== undefined ? Math.round(score * 10) : null
  return (
    <div className="desk-glass p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="font-['Tajawal'] font-bold text-[13px]" style={{ color: 'rgba(243,238,226,0.8)' }}>{label}</span>
        <span className="font-['Inter'] text-[12px] tabular-nums font-semibold" style={{ color: pct === null ? 'rgba(243,238,226,0.35)' : 'var(--brass-hi)' }}>{pct === null ? '—' : `${(score).toFixed(1)}/10`}</span>
      </div>
      <div dir="ltr" className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct || 0}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{ background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
      </div>
    </div>
  )
}

export default function DeskGrowth() {
  const { data: modData, isLoading: l1 } = useDeskModules()
  const { data: ins, isLoading: l2 } = useDeskInsights()

  if (l1 || l2) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>

  const modules = modData?.modules || []
  const attempts = ins?.attempts || 0
  const readinessPct = ins?.readiness !== null && ins?.readiness !== undefined ? Math.round(ins.readiness * 10) : 0

  return (
    <div className="space-y-7">
      {/* header */}
      <div className="desk-rise">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp size={14} style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.2em]" dir="ltr" style={{ color: 'var(--brass)' }}>GROWTH</span>
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[30px]" style={{ color: 'var(--cream)' }}>تقدّمي</h1>
        <p className="font-['Tajawal'] text-[14px] mt-1" style={{ color: 'rgba(243,238,226,0.55)' }}>قدرتك على الإنجليزي المهني تتّضح مع كل مكالمة تتدرّبين عليها.</p>
      </div>

      {attempts === 0 ? (
        <div className="desk-glass p-9 text-center desk-rise">
          <Radio size={28} className="mx-auto mb-3 desk-live-dot" style={{ color: 'var(--brass)' }} />
          <p className="font-['Tajawal'] font-bold text-lg" style={{ color: 'var(--cream)' }}>لسا ما بدأتِ أول مكالمة</p>
          <p className="font-['Tajawal'] text-[13px] max-w-sm mx-auto mt-2 leading-relaxed" style={{ color: 'rgba(243,238,226,0.6)' }}>
            أنجزي أول سيناريو، وبعدها نبني لك هنا صورة واضحة — قواعدك، مفرداتك، طلاقتك، ونقاطك اللي تحتاج شغل.
          </p>
          <Link to="/desk/scenarios" className="desk-cta inline-flex items-center gap-2 px-6 h-12 rounded-2xl font-['Tajawal'] font-bold text-[14px] mt-5">
            ابدئي أول سيناريو <ArrowLeft size={16} />
          </Link>
        </div>
      ) : (
        <>
          {/* readiness + competencies */}
          <div className="grid lg:grid-cols-[auto_1fr] gap-5 items-center">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ ease: [0.16, 1, 0.3, 1] }}
              className="desk-glass p-6 flex flex-col items-center" style={{ borderColor: 'rgba(201,162,92,0.24)' }}>
              <p className="font-['Tajawal'] font-bold text-[13px] mb-3" style={{ color: 'var(--brass)' }}>جاهزيتك للمكالمات</p>
              <ReadinessRing pct={readinessPct} />
              <p className="font-['Tajawal'] text-[11px] mt-3" style={{ color: 'rgba(243,238,226,0.45)' }}>من متوسّط {attempts} {attempts === 1 ? 'مكالمة' : 'مكالمات'} مُقيّمة</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 gap-3">
              {COMPS.map((c) => <Meter key={c.key} label={c.ar} score={ins?.gauges?.[c.key]} />)}
            </div>
          </div>

          {/* recurring focus */}
          {ins?.errors?.length > 0 && (
            <div className="desk-rise">
              <div className="flex items-center gap-2 mb-3">
                <Target size={15} style={{ color: 'var(--brass)' }} />
                <h2 className="font-['Tajawal'] font-bold text-[16px]" style={{ color: 'var(--cream)' }}>نقاط تستاهل شغل</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {ins.errors.slice(0, 4).map((e, i) => (
                  <div key={i} className="desk-glass p-4">
                    <div className="flex items-baseline gap-2 flex-wrap" dir="ltr">
                      {e.spoken && <span className="font-['Inter'] text-[13px] line-through" style={{ color: 'rgba(255,180,164,0.7)' }}>{e.spoken}</span>}
                      {e.corrected && <span className="font-['Inter'] text-[14px] font-semibold" style={{ color: '#6ee7b7' }}>{e.corrected}</span>}
                    </div>
                    {e.rule && <p className="font-['Tajawal'] text-[12px] mt-2 leading-relaxed" style={{ color: 'rgba(243,238,226,0.62)' }}>{e.rule}</p>}
                  </div>
                ))}
              </div>
              {ins?.tip && (
                <div className="desk-glass p-4 mt-3 flex items-start gap-2.5" style={{ borderColor: 'rgba(201,162,92,0.24)' }}>
                  <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--brass-hi)' }}>◆</span>
                  <p className="font-['Tajawal'] text-[13px] leading-relaxed" style={{ color: 'rgba(243,238,226,0.78)' }}>{ins.tip}</p>
                </div>
              )}
            </div>
          )}

          {/* scenario ledger */}
          <div className="desk-rise">
            <h2 className="font-['Tajawal'] font-bold text-[16px] mb-3" style={{ color: 'var(--cream)' }}>سجلّ مكالماتك</h2>
            <div className="desk-glass divide-y" style={{ borderColor: 'rgba(201,162,92,0.16)' }}>
              {modules.map((m) => {
                const sc = ins?.scoreByModule?.get(m.id)
                const done = m.progress?.status === 'completed'
                const pct = sc !== null && sc !== undefined ? Math.round(sc * 10) : null
                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3" style={{ borderColor: 'rgba(201,162,92,0.10)' }}>
                    <span className="font-['Inter'] font-black text-[11px] w-7 h-7 grid place-items-center rounded-lg flex-shrink-0" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{String(m.module_number).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-['Tajawal'] font-bold text-[13px] truncate" style={{ color: 'var(--cream)' }}>{m.title_ar}</p>
                      {pct !== null ? (
                        <div dir="ltr" className="h-1.5 rounded-full overflow-hidden mt-1.5 max-w-[220px]" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
                        </div>
                      ) : (
                        <p className="font-['Tajawal'] text-[11px] mt-0.5" style={{ color: 'rgba(243,238,226,0.4)' }}>لم تُقيَّم بعد</p>
                      )}
                    </div>
                    {done
                      ? <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: '#6ee7b7' }} />
                      : <span className="font-['Inter'] text-[12px] tabular-nums font-semibold flex-shrink-0" style={{ color: pct === null ? 'rgba(243,238,226,0.3)' : 'var(--brass-hi)' }}>{pct === null ? '' : `${pct}%`}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
