import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Heart, Sparkles, Clock, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { CommandCard } from '@/design-system/trainer'
import InterventionModal from './interventions/InterventionModal'
import './InterventionsPage.css'

const SEVERITY = {
  urgent:    { label: 'عاجل',   icon: AlertCircle, cls: 'rose' },
  attention: { label: 'انتباه', icon: Heart,       cls: 'amber' },
  celebrate: { label: 'احتفال', icon: Sparkles,    cls: 'emerald' },
}

function formatAge(iso) {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (hours < 1) return 'الآن'
  if (hours < 24) return `قبل ${hours}س`
  return `قبل ${Math.floor(hours / 24)} يوم`
}

function InterventionRow({ intervention, onOpen }) {
  const sev = SEVERITY[intervention.severity] || SEVERITY.attention
  const Icon = sev.icon
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      className={`tr-iq__row tr-iq__row--${sev.cls}`}
    >
      <button className="tr-iq__row-btn" onClick={onOpen}>
        <span className="tr-iq__row-icon"><Icon size={18} aria-hidden="true" /></span>
        <span className="tr-iq__row-body">
          <span className="tr-iq__row-name">{intervention.student_name}</span>
          <span className="tr-iq__row-reason">{intervention.reason_ar}</span>
        </span>
        <span className="tr-iq__row-meta">
          <Clock size={11} aria-hidden="true" />
          <span>{formatAge(intervention.created_at)}</span>
        </span>
        <span className="tr-iq__row-cta" aria-hidden="true">تفاصيل ←</span>
      </button>
    </motion.li>
  )
}

function InterventionSkeleton() {
  return (
    <ul className="tr-iq__list" aria-busy="true">
      {[1, 2, 3].map(i => <li key={i} className="tr-iq__skel" />)}
    </ul>
  )
}

function EmptyState({ filter }) {
  const msgs = {
    all:       { title: 'كل طلابك بخير 🌷', sub: 'لا تدخّلات معلّقة — نبيه تراقب خلفياً.' },
    urgent:    { title: 'لا حالات عاجلة',   sub: 'لا أحد صامت أو متأخر — بيئة صحية.' },
    attention: { title: 'لا شيء يحتاج انتباهك', sub: 'كل شيء على ما يرام.' },
    celebrate: { title: 'لا مناسبات حالياً', sub: 'قريباً أحدهم يصل لميلستون.' },
  }
  const m = msgs[filter] || msgs.all
  return (
    <CommandCard className="tr-iq__empty">
      <Sparkles size={28} className="tr-iq__empty-icon" aria-hidden="true" />
      <h3 className="tr-display tr-iq__empty-title">{m.title}</h3>
      <p className="tr-iq__empty-sub">{m.sub}</p>
    </CommandCard>
  )
}

export default function InterventionsPage() {
  const profile = useAuthStore((s) => s.profile)
  const queryClient = useQueryClient()
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [running, setRunning] = useState(false)

  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ['interventions-full', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase.rpc('get_intervention_queue', {
        p_trainer_id: profile.id,
        p_limit: 50,
      })
      if (error) throw error
      return data || []
    },
    enabled: !!profile?.id,
    staleTime: 15000,
    refetchInterval: 60000,
  })

  // Realtime subscription — refresh on any change to trainer's interventions
  useEffect(() => {
    if (!profile?.id) return
    const ch = supabase
      .channel(`interventions-rt-${profile.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'student_interventions', filter: `trainer_id=eq.${profile.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['interventions-full'] })
      )
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile?.id, queryClient])

  const counts = useMemo(() => {
    const c = { all: interventions.length, urgent: 0, attention: 0, celebrate: 0 }
    interventions.forEach(i => { c[i.severity] = (c[i.severity] || 0) + 1 })
    return c
  }, [interventions])

  const filtered = activeFilter === 'all'
    ? interventions
    : interventions.filter(i => i.severity === activeFilter)

  async function handleRunNow() {
    setRunning(true)
    try {
      await supabase.functions.invoke('detect-student-signals', { body: {} })
      await queryClient.invalidateQueries({ queryKey: ['interventions-full'] })
    } finally {
      setRunning(false)
    }
  }

  return (
    <motion.div
      className="tr-iq"
      dir="rtl"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="tr-iq__header">
        <div>
          <h1 className="tr-display tr-iq__title">قائمة المتابعة</h1>
          <p className="tr-iq__subtitle">
            {isLoading
              ? '...'
              : counts.all === 0
              ? 'لا تدخّلات معلّقة — كل طلابك بخير.'
              : `${counts.all} ${counts.all === 1 ? 'طالب يحتاج' : 'طلاب يحتاجون'} اهتمامك`}
          </p>
        </div>
        <button
          className="tr-iq__refresh"
          onClick={handleRunNow}
          disabled={running}
          aria-label="تحليل الإشارات الآن"
        >
          <RefreshCw size={15} className={running ? 'tr-iq__spin' : ''} aria-hidden="true" />
          {running ? 'جارٍ التحليل...' : 'تحليل الآن'}
        </button>
      </header>

      <div className="tr-iq__filters" role="tablist" aria-label="فلتر الشدة">
        {['all', 'urgent', 'attention', 'celebrate'].map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={activeFilter === f}
            className={`tr-iq__filter${activeFilter === f ? ' is-active' : ''}${f !== 'all' ? ` tr-iq__filter--${SEVERITY[f]?.cls}` : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f === 'all' ? 'الكل' : SEVERITY[f].label}
            {counts[f] > 0 && <span className="tr-iq__filter-badge">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <InterventionSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <ul className="tr-iq__list" role="list">
          <AnimatePresence mode="popLayout">
            {filtered.map(i => (
              <InterventionRow
                key={i.id}
                intervention={i}
                onOpen={() => setSelectedId(i.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}

      <AnimatePresence>
        {selectedId && (
          <InterventionModal
            interventionId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
