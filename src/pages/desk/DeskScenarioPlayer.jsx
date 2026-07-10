// DeskScenarioPlayer — one authored scenario, made live. Brief → vocabulary → phrases →
// the in-character voice roleplay (the same engine as unit speaking, routed through the
// module persona) → the writing task. Completing the roleplay marks the scenario done via
// the server-authoritative desk_mark_roleplay RPC.
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Target, BookOpen, MessageSquareQuote, Headset, PenLine, CheckCircle2, Radio } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import DeskCallInterface from '@/components/desk/DeskCallInterface'
import { useDeskModules } from './useDeskModules'
import './desk.css'

const TABS = [
  { id: 'brief',    label: 'Brief',      icon: Target },
  { id: 'vocab',    label: 'Vocabulary', icon: BookOpen },
  { id: 'phrases',  label: 'Phrases',    icon: MessageSquareQuote },
  { id: 'roleplay', label: 'Roleplay',   icon: Headset },
  { id: 'writing',  label: 'Report',     icon: PenLine },
]

export default function DeskScenarioPlayer() {
  const { moduleId } = useParams()
  const profileId = useAuthStore((s) => s.profile?.id)
  const qc = useQueryClient()
  const { data, isLoading } = useDeskModules()
  const [tab, setTab] = useState('brief')
  const [report, setReport] = useState('')
  const [savingReport, setSavingReport] = useState(false)
  const [savedReport, setSavedReport] = useState(false)

  const module = useMemo(() => data?.modules?.find((m) => m.id === moduleId) || null, [data, moduleId])

  // Register the scenario as started (best-effort; RPC derives student from auth.uid()).
  useEffect(() => {
    if (!moduleId) return
    supabase.rpc('desk_start_scenario', { p_module_id: moduleId }).then(() => {}, () => {})
  }, [moduleId])

  // Seed the report editor from any previously-saved draft (once the module loads).
  useEffect(() => {
    const saved = module?.progress?.stage_state?.report
    if (typeof saved === 'string' && saved) { setReport(saved); setSavedReport(true) }
  }, [module?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>
  if (!module) {
    return (
      <div className="desk-glass p-8 text-center desk-rise">
        <p className="font-['Hanken_Grotesk'] font-bold" dir="ltr">Scenario not found</p>
        <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 mt-3 font-['Hanken_Grotesk'] text-sm" style={{ color: 'var(--brass)' }}>
          Back to scenarios <ArrowLeft size={14} />
        </Link>
      </div>
    )
  }

  const rp = module.roleplay || {}
  const objectives = Array.isArray(module.objectives) ? module.objectives : []
  const vocab = Array.isArray(module.vocabulary) ? module.vocabulary : []
  const phrases = Array.isArray(module.phrases) ? module.phrases : []
  const writing = module.writing_task || {}
  const isDone = module.progress?.status === 'completed'

  const onRoleplayComplete = async ({ conversationId } = {}) => {
    if (conversationId) {
      await supabase.rpc('desk_mark_roleplay', { p_module_id: moduleId, p_conversation_id: conversationId }).then(() => {}, () => {})
      qc.invalidateQueries({ queryKey: ['desk-modules'] })
    }
  }

  const wordCount = report.trim() ? report.trim().split(/\s+/).length : 0
  const saveReport = async () => {
    if (!report.trim() || savingReport) return
    setSavingReport(true)
    const { error } = await supabase.rpc('desk_complete_stage', { p_module_id: moduleId, p_stage: 'writing', p_payload: { report: report.trim() } })
    setSavingReport(false)
    if (!error) { setSavedReport(true); qc.invalidateQueries({ queryKey: ['desk-modules'] }) }
  }

  return (
    <div className="space-y-6">
      {/* back + status */}
      <div className="flex items-center justify-between desk-rise">
        <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 font-['Hanken_Grotesk'] text-[13px]" style={{ color: 'rgba(42, 33, 64,0.55)' }}>
          <ArrowLeft size={15} /> Scenarios
        </Link>
        {isDone && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-['Hanken_Grotesk']" style={{ color: '#6ee7b7', background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.28)' }}>
            <CheckCircle2 size={12} /> Completed
          </span>
        )}
      </div>

      {/* hero — the incident briefing */}
      <div className="desk-glass p-6 lg:p-7 desk-rise" style={{ borderColor: 'rgba(239, 106, 67,0.22)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Radio size={14} className="desk-live-dot" style={{ color: 'var(--brass)' }} />
          <span className="font-['Hanken_Grotesk'] text-[11px] tracking-[0.18em]" dir="ltr" style={{ color: 'var(--brass)' }}>SCENARIO {String(module.module_number).padStart(2, '0')}</span>
        </div>
        <h1 className="font-['Hanken_Grotesk'] font-extrabold text-2xl lg:text-[28px] leading-tight mb-1.5" dir="ltr" style={{ color: 'var(--cream)' }}>{module.title_en}</h1>
        <p className="font-['Tajawal'] text-[13px] mb-4" style={{ color: 'rgba(239, 106, 67,0.7)' }}>{module.title_ar}</p>
        <p className="font-['Tajawal'] text-[14px] leading-relaxed" style={{ color: 'rgba(42, 33, 64,0.72)' }}>{module.scenario_ar}</p>
      </div>

      {/* tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-xl font-['Hanken_Grotesk'] text-[13px] font-bold whitespace-nowrap transition-colors"
              style={active
                ? { color: '#fff3ee', background: 'linear-gradient(135deg,#ef6a43,#cf4a1c)' }
                : { color: 'rgba(42, 33, 64,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(239, 106, 67,0.14)' }}>
              <Icon size={15} /> {t.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>

          {/* BRIEF */}
          {tab === 'brief' && (
            <div className="space-y-4">
              {rp?.ai_role && (
                <div className="desk-glass p-5">
                  <p className="font-['Hanken_Grotesk'] text-[12px] font-bold mb-2" dir="ltr" style={{ color: 'var(--brass)' }}>On the other end</p>
                  <p className="font-['Hanken_Grotesk'] text-[13px] leading-relaxed" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.75)' }}>{rp.ai_role}</p>
                  {rp?.student_role && <p className="font-['Hanken_Grotesk'] text-[13px] mt-3 pt-3 desk-hair" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.6)' }}>Your role: <span className="font-['Hanken_Grotesk']">{rp.student_role}</span></p>}
                </div>
              )}
              {objectives.length > 0 && (
                <div className="desk-glass p-5">
                  <p className="font-['Hanken_Grotesk'] text-[12px] font-bold mb-3" dir="ltr" style={{ color: 'var(--brass)' }}>Objectives</p>
                  <ul className="space-y-2.5">
                    {objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brass)' }} />
                        <span className="font-['Hanken_Grotesk'] text-[14px] leading-relaxed" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.78)' }}>{o.en || o.ar || o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => setTab('roleplay')} className="w-full desk-glass p-4 flex items-center justify-center gap-2 font-['Hanken_Grotesk'] font-bold text-[14px] transition-transform hover:-translate-y-0.5" style={{ color: '#fff3ee', background: 'linear-gradient(135deg,#ef6a43,#cf4a1c)', border: 'none' }}>
                <Headset size={17} /> Ready? Take the call
              </button>
            </div>
          )}

          {/* VOCAB */}
          {tab === 'vocab' && (
            <div className="grid gap-3 md:grid-cols-2">
              {vocab.map((v, i) => (
                <div key={i} className="desk-glass p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-['Hanken_Grotesk'] font-bold text-[16px]" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{v.term}</span>
                    {v.pos && <span className="font-['Hanken_Grotesk'] text-[10px] italic" style={{ color: 'rgba(42, 33, 64,0.4)' }}>{v.pos}</span>}
                  </div>
                  <p className="font-['Tajawal'] text-[14px]" style={{ color: 'rgba(42, 33, 64,0.8)' }}>{v.ar}</p>
                  {v.example && <p className="font-['Hanken_Grotesk'] text-[12px] mt-2 leading-relaxed" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.5)' }}>“{v.example}”</p>}
                </div>
              ))}
            </div>
          )}

          {/* PHRASES */}
          {tab === 'phrases' && (
            <div className="space-y-3">
              {phrases.map((p, i) => (
                <div key={i} className="desk-glass p-4">
                  <p className="font-['Hanken_Grotesk'] text-[15px] leading-relaxed" dir="ltr" style={{ color: 'var(--cream)' }}>{p.en}</p>
                  <div className="flex items-center gap-2 mt-2 pt-2 desk-hair">
                    <p className="font-['Tajawal'] text-[13px]" style={{ color: 'rgba(42, 33, 64,0.6)' }}>{p.ar}</p>
                  </div>
                  {p.context_ar && <p className="font-['Tajawal'] text-[11px] mt-1.5" style={{ color: 'rgba(239, 106, 67,0.65)' }}><span className="font-['Hanken_Grotesk']" dir="ltr">When?</span> {p.context_ar}</p>}
                </div>
              ))}
            </div>
          )}

          {/* ROLEPLAY — a live incoming work call */}
          {tab === 'roleplay' && (
            <DeskCallInterface
              module={module}
              moduleId={moduleId}
              studentId={profileId}
              phrases={phrases}
              onComplete={onRoleplayComplete}
            />
          )}

          {/* WRITING */}
          {tab === 'writing' && (
            <div className="desk-glass p-6">
              <p className="font-['Hanken_Grotesk'] text-[12px] font-bold mb-2" dir="ltr" style={{ color: 'var(--brass)' }}>Writing task</p>
              {writing?.title_ar && <h3 className="font-['Tajawal'] font-bold text-[16px] mb-2" style={{ color: 'var(--cream)' }}>{writing.title_ar}</h3>}
              {writing?.prompt_ar && <p className="font-['Tajawal'] text-[14px] leading-relaxed mb-4" style={{ color: 'rgba(42, 33, 64,0.72)' }}>{writing.prompt_ar}</p>}
              {Array.isArray(writing?.hints) && writing.hints.length > 0 && (
                <div className="pt-3 desk-hair">
                  <p className="font-['Hanken_Grotesk'] text-[12px] font-bold mb-2" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.6)' }}>Hints</p>
                  <ul className="space-y-1.5">
                    {writing.hints.map((h, i) => (
                      <li key={i} className="font-['Tajawal'] text-[13px] flex items-start gap-2" style={{ color: 'rgba(42, 33, 64,0.62)' }}>
                        <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--brass)' }} /> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* report editor — draft in English, saved to her scenario record */}
              <div className="mt-5 pt-4 desk-hair">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-['Hanken_Grotesk'] text-[12px] font-bold" dir="ltr" style={{ color: 'rgba(42, 33, 64,0.7)' }}>Your report</label>
                  <span className="font-['Hanken_Grotesk'] text-[11px] tabular-nums" style={{ color: wordCount ? 'var(--brass-hi)' : 'rgba(42, 33, 64,0.35)' }}>{wordCount} {wordCount === 1 ? 'word' : 'words'}</span>
                </div>
                <textarea
                  value={report}
                  onChange={(e) => { setReport(e.target.value); setSavedReport(false) }}
                  placeholder="Write your report in English here…"
                  dir="ltr" rows={7}
                  className="w-full rounded-xl p-3.5 font-['Hanken_Grotesk'] text-[14px] leading-relaxed outline-none resize-y transition-colors"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(239, 106, 67,0.16)', color: 'var(--cream)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(239, 106, 67,0.4)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(239, 106, 67,0.16)' }}
                />
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={saveReport} disabled={!report.trim() || savingReport}
                    className="desk-cta inline-flex items-center gap-2 px-5 h-11 rounded-xl font-['Hanken_Grotesk'] font-bold text-[13px]"
                    style={(!report.trim() || savingReport) ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                    {savingReport ? <Loader2 size={15} className="animate-spin" /> : savedReport ? <CheckCircle2 size={15} /> : <PenLine size={15} />}
                    {savingReport ? 'Saving…' : savedReport ? 'Saved' : 'Save report'}
                  </button>
                  {savedReport && !savingReport && (
                    <span className="font-['Hanken_Grotesk'] text-[12px]" dir="ltr" style={{ color: '#6ee7b7' }}>Saved — your trainer can review it</span>
                  )}
                </div>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
