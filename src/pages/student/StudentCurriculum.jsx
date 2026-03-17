import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Lock, Play, CheckCircle2, SkipForward,
  ChevronDown, ChevronUp, BookOpen, Target, Clock,
  Star, Lightbulb,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { ACADEMIC_LEVELS } from '../../lib/constants'

const STATUS_CONFIG = {
  locked: { icon: Lock, color: 'text-muted', bg: 'bg-[var(--surface-raised)]', label: 'مقفل', border: 'border-border-subtle' },
  in_progress: { icon: Play, color: 'text-sky-400', bg: 'bg-sky-500/10', label: 'قيد التعلم', border: 'border-sky-500/30' },
  completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'مكتمل', border: 'border-emerald-500/30' },
  skipped: { icon: SkipForward, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'تم التخطي', border: 'border-amber-500/30' },
}

export default function StudentCurriculum() {
  const { profile, studentData } = useAuthStore()
  const currentLevel = studentData?.academic_level || 1
  const [selectedLevel, setSelectedLevel] = useState(currentLevel)
  const [expandedUnit, setExpandedUnit] = useState(null)

  const levelInfo = ACADEMIC_LEVELS[selectedLevel] || ACADEMIC_LEVELS[1]

  // Fetch curriculum units for selected level
  const { data: units, isLoading } = useQuery({
    queryKey: ['curriculum-units', selectedLevel],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_units')
        .select('*')
        .eq('level', selectedLevel)
        .eq('is_active', true)
        .order('unit_number')
      return data || []
    },
  })

  // Fetch student progress for all units
  const { data: progressMap } = useQuery({
    queryKey: ['curriculum-progress', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id, status, mastery_score, started_at, completed_at')
        .eq('student_id', profile?.id)
      const map = {}
      for (const p of data || []) map[p.unit_id] = p
      return map
    },
    enabled: !!profile?.id,
  })

  // Computed stats
  const completedCount = useMemo(() => {
    if (!units || !progressMap) return 0
    return units.filter(u => progressMap[u.id]?.status === 'completed').length
  }, [units, progressMap])

  const totalUnits = units?.length || 0
  const progressPct = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <GraduationCap size={20} className="text-emerald-400" />
          </div>
          مسار التعلم
        </h1>
        <p className="text-muted text-sm mt-1">تتبع تقدمك عبر المنهج الدراسي</p>
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {[1, 2, 3, 4, 5].map(lvl => {
          const info = ACADEMIC_LEVELS[lvl]
          const isActive = selectedLevel === lvl
          const isCurrent = currentLevel === lvl
          return (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                  : 'text-muted hover:bg-[var(--surface-raised)] border border-transparent'
              }`}
            >
              <span className="font-bold">{info?.cefr}</span>
              <span>{info?.name_ar}</span>
              {isCurrent && <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1.5 py-0.5 rounded-full">حالي</span>}
            </button>
          )
        })}
      </div>

      {/* Progress overview */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="fl-card-static p-6"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-sky-400">{levelInfo?.cefr}</span>
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{levelInfo?.name_ar}</span>
          </div>
          <span className="text-sm text-sky-400 font-bold">{completedCount}/{totalUnits}</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full bg-emerald-500"
          />
        </div>
        <p className="text-xs text-muted mt-2">{progressPct}% من المستوى مكتمل</p>
      </motion.div>

      {/* Units timeline */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      ) : units?.length === 0 ? (
        <div className="fl-card-static p-12 text-center">
          <BookOpen size={32} className="text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">لا توجد وحدات لهذا المستوى</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 right-7 w-0.5 rounded-full" style={{ background: 'var(--border-subtle)' }} />

          <div className="space-y-4">
            {units.map((unit, i) => {
              const progress = progressMap?.[unit.id]
              const status = progress?.status || 'locked'
              const config = STATUS_CONFIG[status]
              const isExpanded = expandedUnit === unit.id
              const StatusIcon = config.icon
              const mastery = progress?.mastery_score || 0
              const isInProgress = status === 'in_progress'

              return (
                <motion.div
                  key={unit.id}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pr-14"
                >
                  {/* Timeline dot */}
                  <div className={`absolute right-4 top-5 w-7 h-7 rounded-full ${config.bg} flex items-center justify-center z-10 border-2 ${config.border} ${
                    isInProgress ? 'ring-2 ring-sky-500/20 ring-offset-2 ring-offset-[var(--surface-base)]' : ''
                  }`}>
                    <StatusIcon size={14} className={config.color} />
                  </div>

                  {/* Card */}
                  <div
                    className={`rounded-xl border transition-all cursor-pointer ${config.border} ${
                      isInProgress ? 'shadow-[0_0_20px_rgba(14,165,233,0.08)]' : ''
                    }`}
                    style={{ background: 'var(--surface-raised)' }}
                    onClick={() => setExpandedUnit(isExpanded ? null : unit.id)}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-muted px-2 py-0.5 rounded-full" style={{ background: 'var(--surface-base)' }}>
                              الوحدة {unit.unit_number}
                            </span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                              {config.label}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{unit.title_ar}</h3>
                          <p className="text-xs text-muted mt-0.5" dir="ltr">{unit.title_en}</p>
                          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                            <span className="flex items-center gap-1"><Clock size={10} /> {unit.estimated_weeks} أسابيع</span>
                            <span className="flex items-center gap-1"><BookOpen size={10} /> {unit.cefr}</span>
                            {mastery > 0 && (
                              <span className="flex items-center gap-1 text-emerald-400"><Star size={10} /> {Math.round(mastery)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 mr-3">
                          {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                        </div>
                      </div>

                      {/* Mastery bar for completed/in-progress */}
                      {(status === 'completed' || status === 'in_progress') && mastery > 0 && (
                        <div className="mt-3">
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-base)' }}>
                            <div
                              className={`h-full rounded-full ${status === 'completed' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                              style={{ width: `${mastery}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 pb-5 pt-2 border-t border-border-subtle space-y-4">
                            {/* Description */}
                            {unit.description_ar && (
                              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                {unit.description_ar}
                              </p>
                            )}

                            {/* Learning objectives */}
                            {unit.learning_objectives?.length > 0 && (
                              <div>
                                <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5 text-sky-400">
                                  <Target size={12} /> أهداف التعلم
                                </h4>
                                <ul className="space-y-1">
                                  {unit.learning_objectives.map((obj, j) => (
                                    <li key={j} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                      <CheckCircle2 size={12} className="text-sky-400 shrink-0 mt-0.5" />
                                      <span dir="ltr">{obj}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Grammar topics */}
                            {unit.grammar_topics?.length > 0 && (
                              <div>
                                <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5 text-violet-400">
                                  <BookOpen size={12} /> القواعد
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {unit.grammar_topics.map((topic, j) => (
                                    <span key={j} className="text-[10px] px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400" dir="ltr">
                                      {topic}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Vocabulary themes */}
                            {unit.vocabulary_themes?.length > 0 && (
                              <div>
                                <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-1.5 text-emerald-400">
                                  <Lightbulb size={12} /> المفردات
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {unit.vocabulary_themes.map((theme, j) => (
                                    <span key={j} className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400" dir="ltr">
                                      {theme}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Progress info */}
                            {progress?.started_at && (
                              <p className="text-[10px] text-muted">
                                بدأت: {new Date(progress.started_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {progress.completed_at && (
                                  <> — انتهيت: {new Date(progress.completed_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                                )}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
