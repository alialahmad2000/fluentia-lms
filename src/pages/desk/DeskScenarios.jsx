// Scenarios — the authored specialization_modules finally given a reader, as a library of
// live, in-character workplace roleplays. Each card opens the scenario player.
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Headset, Clock, BookOpen, CheckCircle2, Circle, Loader2, ArrowRight } from 'lucide-react'
import { useDeskModules } from './useDeskModules'
import './desk.css'

const STATUS = {
  completed:   { label: 'Completed',   color: '#6ee7b7', bg: 'rgba(110,231,183,0.12)', bd: 'rgba(110,231,183,0.28)' },
  in_progress: { label: 'In progress', color: '#efd299', bg: 'rgba(201,162,92,0.12)',  bd: 'rgba(201,162,92,0.30)' },
  new:         { label: 'New',         color: 'rgba(243,238,226,0.6)', bg: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.10)' },
}

export default function DeskScenarios() {
  const { data, isLoading } = useDeskModules()

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>
  }
  if (!data?.modules?.length) {
    return (
      <div className="desk-glass p-8 text-center desk-rise">
        <Headset size={28} className="mx-auto mb-3" style={{ color: 'var(--brass)' }} />
        <p className="font-['Inter'] font-bold text-lg" dir="ltr">No scenarios yet</p>
        <p className="font-['Inter'] text-sm mt-1" dir="ltr" style={{ color: 'rgba(243,238,226,0.55)' }}>Your career track will be assigned soon.</p>
      </div>
    )
  }

  const { spec, modules, done, total } = data
  const pct = total ? Math.round((done / total) * 100) : 0
  const currentId = (modules.find((m) => m.progress?.status === 'in_progress')
    || modules.find((m) => m.progress?.status !== 'completed'))?.id

  return (
    <div className="space-y-7">
      {/* header */}
      <div className="desk-rise">
        <p className="font-['Inter'] text-[12px] tracking-[0.2em] mb-1" dir="ltr" style={{ color: 'var(--brass)' }}>SCENARIOS</p>
        <h1 className="font-['Inter'] font-extrabold text-2xl lg:text-3xl" dir="ltr" style={{ color: 'var(--cream)' }}>
          Your career track
        </h1>
        {spec?.title_ar && (
          <p className="font-['Tajawal'] text-sm mt-1" style={{ color: 'rgba(243,238,226,0.55)' }}>{spec.title_ar}</p>
        )}
        {spec?.tagline_ar && (
          <p className="font-['Tajawal'] text-sm mt-2 max-w-2xl leading-relaxed" style={{ color: 'rgba(243,238,226,0.6)' }}>{spec.tagline_ar}</p>
        )}
        {/* progress */}
        <div className="flex items-center gap-3 mt-4 max-w-md">
          <div dir="ltr" className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#c9a25c,#efd299)' }} />
          </div>
          <span className="font-['Inter'] text-[12px] font-bold tabular-nums" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{done} / {total}</span>
        </div>
      </div>

      {/* grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((m, i) => {
          const st = STATUS[m.progress?.status] || STATUS.new
          const StatusIcon = m.progress?.status === 'completed' ? CheckCircle2 : m.progress?.status === 'in_progress' ? Loader2 : Circle
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }}>
              <Link to={`/desk/scenarios/${m.id}`} className="desk-glass block p-5 h-full transition-transform hover:-translate-y-0.5 group"
                style={m.id === currentId ? { borderColor: 'rgba(201,162,92,0.42)', boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(201,162,92,0.18), 0 20px 44px -22px rgba(201,162,92,0.4)' } : undefined}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-['Inter'] font-black text-[13px] w-8 h-8 grid place-items-center rounded-lg" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }}>{String(m.module_number).padStart(2, '0')}</span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-['Inter'] flex items-center gap-1" style={{ color: st.color, background: st.bg, border: `1px solid ${st.bd}` }}>
                      <StatusIcon size={11} /> {st.label}
                    </span>
                    {m.id === currentId && <span className="font-['Inter'] text-[10px] font-bold" style={{ color: 'var(--brass)' }}>· Current</span>}
                  </div>
                  <span className="desk-ghost-btn"><ArrowRight size={15} /></span>
                </div>
                <h3 className="font-['Inter'] font-bold text-[16px] leading-snug mb-1" dir="ltr" style={{ color: 'var(--cream)' }}>{m.title_en}</h3>
                <p className="font-['Tajawal'] text-[12px] mb-2" style={{ color: 'rgba(243,238,226,0.5)' }}>{m.title_ar}</p>
                <p className="font-['Tajawal'] text-[13px] leading-relaxed line-clamp-2" style={{ color: 'rgba(243,238,226,0.58)' }}>{m.scenario_ar}</p>
                <div className="flex items-center gap-4 mt-3 pt-3 desk-hair">
                  <span className="flex items-center gap-1.5 font-['Inter'] text-[11px]" style={{ color: 'rgba(243,238,226,0.45)' }}><Clock size={12} /> {m.estimated_minutes || 25} min</span>
                  <span className="flex items-center gap-1.5 font-['Inter'] text-[11px]" style={{ color: 'rgba(243,238,226,0.45)' }}><BookOpen size={12} /> {m.vocab_count || (Array.isArray(m.vocabulary) ? m.vocabulary.length : 0)} terms</span>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
