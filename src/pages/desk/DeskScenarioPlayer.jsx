// DeskScenarioPlayer — one authored scenario, made live. Brief → vocabulary → phrases →
// the in-character voice roleplay (the same engine as unit speaking, routed through the
// module persona) → the writing task. Completing the roleplay marks the scenario done via
// the server-authoritative desk_mark_roleplay RPC.
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Loader2, Target, BookOpen, MessageSquareQuote, Headset, PenLine, CheckCircle2, Radio } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import DeskCallInterface from '@/components/desk/DeskCallInterface'
import { useDeskModules } from './useDeskModules'
import './desk.css'

const TABS = [
  { id: 'brief',    label: 'الإحاطة',   icon: Target },
  { id: 'vocab',    label: 'المصطلحات', icon: BookOpen },
  { id: 'phrases',  label: 'العبارات',  icon: MessageSquareQuote },
  { id: 'roleplay', label: 'المحاكاة',  icon: Headset },
  { id: 'writing',  label: 'التقرير',   icon: PenLine },
]

export default function DeskScenarioPlayer() {
  const { moduleId } = useParams()
  const profileId = useAuthStore((s) => s.profile?.id)
  const g = useG()
  const qc = useQueryClient()
  const { data, isLoading } = useDeskModules()
  const [tab, setTab] = useState('brief')

  const module = useMemo(() => data?.modules?.find((m) => m.id === moduleId) || null, [data, moduleId])

  // Register the scenario as started (best-effort; RPC derives student from auth.uid()).
  useEffect(() => {
    if (!moduleId) return
    supabase.rpc('desk_start_scenario', { p_module_id: moduleId }).then(() => {}, () => {})
  }, [moduleId])

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin" style={{ color: 'var(--brass)' }} /></div>
  if (!module) {
    return (
      <div className="desk-glass p-8 text-center desk-rise">
        <p className="font-['Tajawal'] font-bold">لم يتم العثور على السيناريو</p>
        <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 mt-3 font-['Tajawal'] text-sm" style={{ color: 'var(--brass)' }}>
          العودة للسيناريوهات <ArrowRight size={14} />
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

  return (
    <div className="space-y-6">
      {/* back + status */}
      <div className="flex items-center justify-between desk-rise">
        <Link to="/desk/scenarios" className="inline-flex items-center gap-1.5 font-['Tajawal'] text-[13px]" style={{ color: 'rgba(243,238,226,0.55)' }}>
          <ArrowRight size={15} /> السيناريوهات
        </Link>
        {isDone && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold font-['Tajawal']" style={{ color: '#6ee7b7', background: 'rgba(110,231,183,0.12)', border: '1px solid rgba(110,231,183,0.28)' }}>
            <CheckCircle2 size={12} /> مكتمل
          </span>
        )}
      </div>

      {/* hero — the incident briefing */}
      <div className="desk-glass p-6 lg:p-7 desk-rise" style={{ borderColor: 'rgba(201,162,92,0.22)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Radio size={14} className="desk-live-dot" style={{ color: 'var(--brass)' }} />
          <span className="font-['Inter'] text-[11px] tracking-[0.18em]" dir="ltr" style={{ color: 'var(--brass)' }}>SCENARIO {String(module.module_number).padStart(2, '0')}</span>
        </div>
        <h1 className="font-['Tajawal'] font-extrabold text-2xl lg:text-[28px] leading-tight mb-1.5" style={{ color: 'var(--cream)' }}>{module.title_ar}</h1>
        <p className="font-['Inter'] text-[12px] mb-4" dir="ltr" style={{ color: 'rgba(201,162,92,0.7)' }}>{module.title_en}</p>
        <p className="font-['Tajawal'] text-[14px] leading-relaxed" style={{ color: 'rgba(243,238,226,0.72)' }}>{module.scenario_ar}</p>
      </div>

      {/* tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 h-10 rounded-xl font-['Tajawal'] text-[13px] font-bold whitespace-nowrap transition-colors"
              style={active
                ? { color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)' }
                : { color: 'rgba(243,238,226,0.6)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,162,92,0.14)' }}>
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
                  <p className="font-['Tajawal'] text-[12px] font-bold mb-2" style={{ color: 'var(--brass)' }}>على الطرف الآخر</p>
                  <p className="font-['Inter'] text-[13px] leading-relaxed" dir="ltr" style={{ color: 'rgba(243,238,226,0.75)' }}>{rp.ai_role}</p>
                  {rp?.student_role && <p className="font-['Tajawal'] text-[13px] mt-3 pt-3 desk-hair" style={{ color: 'rgba(243,238,226,0.6)' }}>دورك: <span dir="ltr" className="font-['Inter']">{rp.student_role}</span></p>}
                </div>
              )}
              {objectives.length > 0 && (
                <div className="desk-glass p-5">
                  <p className="font-['Tajawal'] text-[12px] font-bold mb-3" style={{ color: 'var(--brass)' }}>أهداف السيناريو</p>
                  <ul className="space-y-2.5">
                    {objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--brass)' }} />
                        <span className="font-['Tajawal'] text-[14px] leading-relaxed" style={{ color: 'rgba(243,238,226,0.78)' }}>{o.ar || o.en || o}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => setTab('roleplay')} className="w-full desk-glass p-4 flex items-center justify-center gap-2 font-['Tajawal'] font-bold text-[14px] transition-transform hover:-translate-y-0.5" style={{ color: '#1a130a', background: 'linear-gradient(135deg,#efd299,#c9a25c)', border: 'none' }}>
                <Headset size={17} /> {g('جاهز؟ ادخل المكالمة', 'جاهزة؟ ادخلي المكالمة')}
              </button>
            </div>
          )}

          {/* VOCAB */}
          {tab === 'vocab' && (
            <div className="grid gap-3 md:grid-cols-2">
              {vocab.map((v, i) => (
                <div key={i} className="desk-glass p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-['Inter'] font-bold text-[16px]" dir="ltr" style={{ color: 'var(--brass-hi)' }}>{v.term}</span>
                    {v.pos && <span className="font-['Inter'] text-[10px] italic" style={{ color: 'rgba(243,238,226,0.4)' }}>{v.pos}</span>}
                  </div>
                  <p className="font-['Tajawal'] text-[14px]" style={{ color: 'rgba(243,238,226,0.8)' }}>{v.ar}</p>
                  {v.example && <p className="font-['Inter'] text-[12px] mt-2 leading-relaxed" dir="ltr" style={{ color: 'rgba(243,238,226,0.5)' }}>“{v.example}”</p>}
                </div>
              ))}
            </div>
          )}

          {/* PHRASES */}
          {tab === 'phrases' && (
            <div className="space-y-3">
              {phrases.map((p, i) => (
                <div key={i} className="desk-glass p-4">
                  <p className="font-['Inter'] text-[15px] leading-relaxed" dir="ltr" style={{ color: 'var(--cream)' }}>{p.en}</p>
                  <div className="flex items-center gap-2 mt-2 pt-2 desk-hair">
                    <p className="font-['Tajawal'] text-[13px]" style={{ color: 'rgba(243,238,226,0.6)' }}>{p.ar}</p>
                  </div>
                  {p.context_ar && <p className="font-['Tajawal'] text-[11px] mt-1.5" style={{ color: 'rgba(201,162,92,0.65)' }}>متى؟ {p.context_ar}</p>}
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
              <p className="font-['Tajawal'] text-[12px] font-bold mb-2" style={{ color: 'var(--brass)' }}>المهمة الكتابية</p>
              {writing?.title_ar && <h3 className="font-['Tajawal'] font-bold text-[16px] mb-2" style={{ color: 'var(--cream)' }}>{writing.title_ar}</h3>}
              {writing?.prompt_ar && <p className="font-['Tajawal'] text-[14px] leading-relaxed mb-4" style={{ color: 'rgba(243,238,226,0.72)' }}>{writing.prompt_ar}</p>}
              {Array.isArray(writing?.hints) && writing.hints.length > 0 && (
                <div className="pt-3 desk-hair">
                  <p className="font-['Tajawal'] text-[12px] font-bold mb-2" style={{ color: 'rgba(243,238,226,0.6)' }}>تلميحات</p>
                  <ul className="space-y-1.5">
                    {writing.hints.map((h, i) => (
                      <li key={i} className="font-['Tajawal'] text-[13px] flex items-start gap-2" style={{ color: 'rgba(243,238,226,0.62)' }}>
                        <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: 'var(--brass)' }} /> {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="font-['Tajawal'] text-[11px] mt-4" style={{ color: 'rgba(243,238,226,0.4)' }}>سيتوفّر تسليم التقرير المكتوب قريباً.</p>
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  )
}
