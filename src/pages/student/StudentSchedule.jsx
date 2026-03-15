import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, Clock, Video, ChevronLeft, ChevronRight, Lock, Plus, Check,
  GripVertical, Loader2, Users, Sparkles, X, ArrowLeft,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { formatTime } from '../../utils/dateHelpers'

// ─── Constants ──────────────────────────────────────────
const DAYS = [0, 1, 2, 3, 4, 5, 6] // Sun-Sat
const DAY_LABELS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const SLOTS = [
  { key: 'morning', label: 'صباحاً', icon: '🌅', range: '8 ص - 12 م' },
  { key: 'afternoon', label: 'مساءً', icon: '☀️', range: '12 م - 6 م' },
  { key: 'evening', label: 'مساءً متأخر', icon: '🌙', range: '6 م - 11 م' },
]

function getWeekStart(date = new Date()) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function formatWeekRange(weekStart) {
  const end = new Date(weekStart)
  end.setDate(end.getDate() + 6)
  const startStr = weekStart.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
  return `${startStr} — ${endStr}`
}

// ─── Sortable Task Item ──────────────────────────────────
function SortableTask({ task, onToggle, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 group transition-all duration-150 ${
        task.is_completed
          ? 'bg-emerald-500/[0.06] border border-emerald-500/15'
          : 'border border-border-subtle hover:border-sky-500/20'
      }`}
    >
      <button {...attributes} {...listeners} className="touch-none cursor-grab text-muted/40 shrink-0">
        <GripVertical size={14} />
      </button>
      <button
        onClick={() => onToggle(task.id, !task.is_completed)}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
          task.is_completed
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-muted/30 hover:border-sky-400'
        }`}
      >
        {task.is_completed && <Check size={12} />}
      </button>
      <span className={`text-xs flex-1 min-w-0 truncate ${
        task.is_completed ? 'line-through text-muted' : ''
      }`} style={{ color: task.is_completed ? undefined : 'var(--color-text-primary)' }}>
        {task.title}
      </span>
      <button
        onClick={() => onRemove(task.id)}
        className="opacity-0 group-hover:opacity-100 text-muted hover:text-red-400 transition-all shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ─── Fixed Class Block ──────────────────────────────────
function ClassBlock({ slot }) {
  return (
    <div className="rounded-xl px-3 py-2.5 bg-sky-500/[0.08] border border-sky-500/20 flex items-center gap-2">
      <Lock size={12} className="text-sky-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-sky-400 truncate">
          {slot.class_type === 'general' ? 'حصة' : slot.class_type} — {formatTime(slot.start_time)}
        </p>
      </div>
      {slot.google_meet_link && (
        <a href={slot.google_meet_link} target="_blank" rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 shrink-0">
          <Video size={14} />
        </a>
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────
export default function StudentSchedule() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const group = studentData?.groups

  const [weekOffset, setWeekOffset] = useState(0)
  const [addingTo, setAddingTo] = useState(null) // { day, slot }
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [showClassmates, setShowClassmates] = useState(false)

  const weekStart = useMemo(() => {
    const ws = getWeekStart()
    ws.setDate(ws.getDate() + weekOffset * 7)
    return ws
  }, [weekOffset])

  const weekStartISO = weekStart.toISOString().split('T')[0]

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  // ─── Queries ────────────────────────────────────────────
  // Fixed class schedule from weekly_schedule_config
  const { data: classSchedule } = useQuery({
    queryKey: ['weekly-schedule-config', group?.id],
    queryFn: async () => {
      if (!group?.id) return []
      const { data, error } = await supabase
        .from('weekly_schedule_config')
        .select('*')
        .eq('group_id', group.id)
        .eq('is_active', true)
        .is('deleted_at', null)
      if (error) console.error('Schedule config error:', error.message)
      return data || []
    },
    enabled: !!group?.id,
  })

  // Student's planned tasks for this week
  const { data: plannedTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['planned-tasks', profile?.id, weekStartISO],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_planned_tasks')
        .select('*')
        .eq('student_id', profile?.id)
        .eq('week_start', weekStartISO)
        .is('deleted_at', null)
        .order('sort_order')
      if (error) console.error('Planned tasks error:', error.message)
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Upcoming classes
  const { data: upcomingClasses } = useQuery({
    queryKey: ['student-upcoming-classes'],
    queryFn: async () => {
      if (!group?.id) return []
      const { data, error } = await supabase
        .from('classes')
        .select('id, title, topic, date, start_time, end_time, google_meet_link, status')
        .eq('group_id', group.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')
        .order('start_time')
        .limit(5)
      if (error) throw error
      return data || []
    },
    enabled: !!group?.id,
  })

  // Classmate plans (same group)
  const { data: classmatePlans } = useQuery({
    queryKey: ['classmate-plans', group?.id, weekStartISO],
    queryFn: async () => {
      if (!group?.id) return []
      const { data, error } = await supabase
        .from('student_planned_tasks')
        .select('student_id, planned_day, planned_slot, is_completed, title, profiles!inner(display_name, full_name)')
        .eq('week_start', weekStartISO)
        .is('deleted_at', null)
        .neq('student_id', profile?.id)
      if (error) throw error
      return data || []
    },
    enabled: !!group?.id && showClassmates,
  })

  // ─── Mutations ──────────────────────────────────────────
  const addTask = useMutation({
    mutationFn: async ({ day, slot, title }) => {
      const { error } = await supabase.from('student_planned_tasks').insert({
        student_id: profile?.id,
        task_type: 'custom',
        title,
        planned_day: day,
        planned_slot: slot,
        week_start: weekStartISO,
        sort_order: (plannedTasks?.filter(t => t.planned_day === day && t.planned_slot === slot).length || 0),
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-tasks', profile?.id, weekStartISO] })
      setAddingTo(null)
      setNewTaskTitle('')
    },
  })

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }) => {
      const { error } = await supabase.from('student_planned_tasks').update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planned-tasks', profile?.id, weekStartISO] }),
  })

  const removeTask = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('student_planned_tasks').update({
        deleted_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planned-tasks', profile?.id, weekStartISO] }),
  })

  // ─── DnD Handler ────────────────────────────────────────
  function handleDragEnd(event) {
    // For now, reorder within the same slot
    const { active, over } = event
    if (!over || active.id === over.id) return
    // Could implement cross-slot drag here in the future
  }

  // ─── Helpers ────────────────────────────────────────────
  function getTasksForSlot(day, slot) {
    return (plannedTasks || []).filter(t => t.planned_day === day && t.planned_slot === slot)
  }

  function getClassesForDay(day) {
    return (classSchedule || []).filter(s => s.day_of_week === day)
  }

  function slotForTime(timeStr) {
    const hour = parseInt(timeStr.split(':')[0])
    if (hour < 12) return 'morning'
    if (hour < 18) return 'afternoon'
    return 'evening'
  }

  const totalTasks = plannedTasks?.length || 0
  const completedTasks = plannedTasks?.filter(t => t.is_completed).length || 0
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const isCurrentWeek = weekOffset === 0
  const today = new Date().getDay()

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <Calendar size={22} className="text-sky-400" />
          </div>
          مخططي الأسبوعي
        </h1>
        <p className="text-muted text-sm mt-1">نظّمي مهامك ودروسك خلال الأسبوع</p>
      </motion.div>

      {/* Week Selector + Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(w => w - 1)} className="btn-icon">
            <ChevronRight size={18} />
          </button>
          <div className="text-center min-w-[160px]">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {formatWeekRange(weekStart)}
            </p>
            {!isCurrentWeek && (
              <button onClick={() => setWeekOffset(0)} className="text-xs text-sky-400 hover:text-sky-300 mt-0.5">
                العودة لهذا الأسبوع
              </button>
            )}
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)} className="btn-icon">
            <ChevronLeft size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {totalTasks > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs text-muted">{completedTasks}/{totalTasks}</span>
            </div>
          )}
          <button
            onClick={() => setShowClassmates(!showClassmates)}
            className={`btn-ghost text-xs flex items-center gap-1.5 px-3 py-2 rounded-xl ${
              showClassmates ? 'text-sky-400 bg-sky-500/10' : 'text-muted'
            }`}
          >
            <Users size={14} />
            خطط زميلاتك
          </button>
        </div>
      </div>

      {/* Google Meet Link */}
      {group?.google_meet_link && (
        <a
          href={group.google_meet_link}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5"
        >
          <Video size={16} />
          رابط الحصة
          <ArrowLeft size={14} />
        </a>
      )}

      {/* Week Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {tasksLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {DAYS.map(d => (
              <div key={d} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {DAYS.map((day) => {
              const isToday = isCurrentWeek && today === day
              const dayClasses = getClassesForDay(day)

              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: day * 0.03 }}
                  className={`rounded-2xl p-3 transition-all ${
                    isToday
                      ? 'border-2 border-sky-500/30 bg-sky-500/[0.03]'
                      : 'border border-border-subtle'
                  }`}
                  style={{ background: isToday ? undefined : 'var(--color-bg-surface)' }}
                >
                  {/* Day Header */}
                  <div className={`text-center pb-2 mb-2 border-b ${
                    isToday ? 'border-sky-500/20' : 'border-border-subtle'
                  }`}>
                    <p className={`text-xs font-bold ${isToday ? 'text-sky-400' : 'text-muted'}`}>
                      {DAY_LABELS[day]}
                    </p>
                    {isToday && (
                      <span className="inline-block mt-0.5 text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full">
                        اليوم
                      </span>
                    )}
                  </div>

                  {/* Slots */}
                  <div className="space-y-3">
                    {SLOTS.map((slot) => {
                      const tasks = getTasksForSlot(day, slot.key)
                      const slotClasses = dayClasses.filter(c => slotForTime(c.start_time) === slot.key)
                      const isAdding = addingTo?.day === day && addingTo?.slot === slot.key

                      return (
                        <div key={slot.key}>
                          <p className="text-[10px] text-muted/60 mb-1 flex items-center gap-1">
                            <span>{slot.icon}</span> {slot.label}
                          </p>

                          <div className="space-y-1.5">
                            {/* Fixed class blocks */}
                            {slotClasses.map((c, i) => (
                              <ClassBlock key={`class-${day}-${i}`} slot={c} />
                            ))}

                            {/* Draggable tasks */}
                            <SortableContext
                              items={tasks.map(t => t.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              {tasks.map(task => (
                                <SortableTask
                                  key={task.id}
                                  task={task}
                                  onToggle={(id, completed) => toggleTask.mutate({ id, completed })}
                                  onRemove={(id) => removeTask.mutate(id)}
                                />
                              ))}
                            </SortableContext>

                            {/* Add task inline */}
                            {isAdding ? (
                              <div className="flex gap-1">
                                <input
                                  autoFocus
                                  className="input-field text-xs py-1.5 px-2 flex-1 min-w-0"
                                  placeholder="اسم المهمة..."
                                  value={newTaskTitle}
                                  onChange={(e) => setNewTaskTitle(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newTaskTitle.trim()) {
                                      addTask.mutate({ day, slot: slot.key, title: newTaskTitle.trim() })
                                    }
                                    if (e.key === 'Escape') {
                                      setAddingTo(null)
                                      setNewTaskTitle('')
                                    }
                                  }}
                                />
                                <button
                                  onClick={() => {
                                    if (newTaskTitle.trim()) {
                                      addTask.mutate({ day, slot: slot.key, title: newTaskTitle.trim() })
                                    }
                                  }}
                                  disabled={addTask.isPending}
                                  className="btn-icon w-8 h-8 shrink-0"
                                >
                                  {addTask.isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setAddingTo({ day, slot: slot.key })}
                                className="w-full text-center text-muted/40 hover:text-sky-400 hover:bg-sky-500/[0.05] rounded-lg py-1.5 transition-all text-xs flex items-center justify-center gap-1"
                              >
                                <Plus size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Classmate plans for this day */}
                  {showClassmates && classmatePlans && (
                    <>
                      {(() => {
                        const dayPlans = classmatePlans.filter(p => p.planned_day === day)
                        if (dayPlans.length === 0) return null
                        const grouped = {}
                        dayPlans.forEach(p => {
                          const name = p.profiles?.display_name || p.profiles?.full_name || 'طالبة'
                          if (!grouped[name]) grouped[name] = []
                          grouped[name].push(p)
                        })
                        return (
                          <div className="mt-2 pt-2 border-t border-border-subtle">
                            <p className="text-[10px] text-muted/50 mb-1 flex items-center gap-1">
                              <Users size={9} /> زميلاتك
                            </p>
                            {Object.entries(grouped).map(([name, tasks]) => (
                              <div key={name} className="text-[10px] text-muted/60 truncate">
                                {name}: {tasks.length} مهام
                                {tasks.filter(t => t.is_completed).length > 0 && (
                                  <span className="text-emerald-400"> ({tasks.filter(t => t.is_completed).length} ✓)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </DndContext>

      {/* First-time onboarding */}
      {!tasksLoading && totalTasks === 0 && isCurrentWeek && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-7 text-center"
        >
          <Sparkles size={32} className="text-sky-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            ابدئي تنظيم أسبوعك!
          </h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            اضغطي على <Plus size={12} className="inline" /> في أي خانة لإضافة مهمة.
            رتّبي مهامك بالسحب والإفلات، وتابعي تقدمك خلال الأسبوع.
          </p>
        </motion.div>
      )}

      {/* Upcoming Classes */}
      {upcomingClasses?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-7">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Clock size={16} className="text-emerald-400" />
            </div>
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>الحصص القادمة</h3>
          </div>
          <div className="space-y-2">
            {upcomingClasses.map((c) => (
              <div
                key={c.id}
                className="rounded-xl p-3 flex items-center justify-between hover:bg-white/[0.04] transition-all"
                style={{ background: 'var(--color-bg-surface-raised)' }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {c.title || c.topic || 'حصة'}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(c.date).toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'short' })}
                    {' · '}
                    {formatTime(c.start_time)}
                  </p>
                </div>
                {(c.google_meet_link || group?.google_meet_link) && (
                  <a href={c.google_meet_link || group.google_meet_link} target="_blank" rel="noopener noreferrer"
                    className="btn-icon text-sky-400 hover:text-sky-300">
                    <Video size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
