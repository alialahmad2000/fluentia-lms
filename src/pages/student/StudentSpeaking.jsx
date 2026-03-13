import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mic, CheckCircle2, Circle, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  hard: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

export default function StudentSpeaking() {
  const { profile, studentData } = useAuthStore()
  const queryClient = useQueryClient()
  const level = studentData?.academic_level || 1

  // Speaking topics for student's level
  const { data: topics, isLoading } = useQuery({
    queryKey: ['speaking-topics', level],
    queryFn: async () => {
      const { data } = await supabase
        .from('speaking_topic_banks')
        .select('*')
        .eq('level', level)
        .order('topic_number')
      return data || []
    },
  })

  // Student's progress
  const { data: progress } = useQuery({
    queryKey: ['speaking-progress', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_speaking_progress')
        .select('topic_id, completed, completed_at')
        .eq('student_id', profile?.id)
      const map = {}
      for (const p of data || []) {
        map[p.topic_id] = p
      }
      return map
    },
    enabled: !!profile?.id,
  })

  // Toggle completion
  const toggleMutation = useMutation({
    mutationFn: async ({ topicId, completed }) => {
      if (completed) {
        // Mark as completed
        const { error } = await supabase.from('student_speaking_progress').upsert({
          student_id: profile?.id,
          topic_id: topicId,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'student_id,topic_id' }).select()
        if (error) throw error
      } else {
        // Unmark
        const { error } = await supabase
          .from('student_speaking_progress')
          .update({ completed: false, completed_at: null })
          .eq('student_id', profile?.id)
          .eq('topic_id', topicId)
          .select()
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['speaking-progress'] })
    },
  })

  const completedCount = Object.values(progress || {}).filter(p => p.completed).length
  const totalCount = topics?.length || 0
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Mic size={20} className="text-violet-400" />
          </div>
          مواضيع المحادثة
        </h1>
        <p className="text-muted text-sm mt-1">تدرب على مواضيع المحادثة لمستواك</p>
      </motion.div>

      {/* Progress bar */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white">التقدم</p>
          <p className="text-sm text-sky-400">{completedCount}/{totalCount} ({progressPct}%)</p>
        </div>
        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="h-full bg-gradient-to-l from-sky-400 to-sky-600 rounded-full"
          />
        </div>
      </motion.div>

      {/* Topics list */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="skeleton h-20 w-full" />)}</div>
      ) : topics?.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Mic size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted">لا توجد مواضيع لمستواك حالياً</p>
        </div>
      ) : (
        <div className="space-y-5">
          {topics.map((topic, i) => {
            const isCompleted = progress?.[topic.id]?.completed
            return (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass-card p-4 hover:translate-y-[-2px] transition-all duration-200 ${isCompleted ? 'border-emerald-500/20' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleMutation.mutate({ topicId: topic.id, completed: !isCompleted })}
                    disabled={toggleMutation.isPending}
                    className="mt-0.5 shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={22} className="text-emerald-400" />
                    ) : (
                      <Circle size={22} className="text-muted hover:text-sky-400 transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted">#{topic.topic_number}</span>
                      <h3 className={`text-sm font-medium ${isCompleted ? 'text-muted line-through' : 'text-white'}`}>
                        {topic.title_en}
                      </h3>
                    </div>
                    {topic.title_ar && (
                      <p className="text-xs text-muted mb-2">{topic.title_ar}</p>
                    )}
                    {topic.prompt_questions?.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {topic.prompt_questions.map((q, qi) => (
                          <p key={qi} className="text-xs text-muted/80 pr-3 border-r border-border-subtle" dir="ltr">
                            {q}
                          </p>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {topic.category && (
                        <span className="text-[10px] bg-white/5 text-muted px-2 py-0.5 rounded-lg">{topic.category}</span>
                      )}
                      {topic.difficulty && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-lg border ${DIFFICULTY_COLORS[topic.difficulty] || DIFFICULTY_COLORS.medium}`}>
                          {DIFFICULTY_LABELS[topic.difficulty] || topic.difficulty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
