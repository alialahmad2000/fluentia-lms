import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BookOpen, Loader2, Sparkles, Clock, Target, Users,
  FileText, CheckCircle2, Zap, Copy, AlertCircle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const SKILL_OPTIONS = ['grammar', 'vocabulary', 'speaking', 'listening', 'reading', 'writing']
const SKILL_LABELS = {
  grammar: 'القرامر', vocabulary: 'المفردات', speaking: 'المحادثة',
  listening: 'الاستماع', reading: 'القراءة', writing: 'الكتابة',
}

export default function TrainerLessonPlanner() {
  const { profile } = useAuthStore()
  const [selectedGroup, setSelectedGroup] = useState('')
  const [topic, setTopic] = useState('')
  const [duration, setDuration] = useState(60)
  const [focusSkills, setFocusSkills] = useState([])
  const [plan, setPlan] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const isAdmin = profile?.role === 'admin'

  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-planner'],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await invokeWithRetry('ai-lesson-planner', {
        body: {
          group_id: selectedGroup,
          topic: topic || undefined,
          duration_minutes: duration,
          focus_skills: focusSkills.length > 0 ? focusSkills.join(', ') : undefined,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      if (res.error) throw new Error(typeof res.error === 'object' ? (res.error.message || 'Failed') : String(res.error))
      return res.data
    },
    onSuccess: (data) => {
      setError('')
      setPlan(data.plan)
    },
    onError: (err) => setError(err.message || 'خطأ في إنشاء الخطة'),
  })

  function toggleSkill(skill) {
    setFocusSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    )
  }

  function copyPlan() {
    if (!plan) return
    const text = formatPlanText(plan)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatPlanText(p) {
    let text = `📋 ${p.title}\n\n`
    text += `⏱️ المدة: ${p.duration}\n\n`
    text += `🎯 الأهداف:\n${p.objectives?.map(o => `• ${o}`).join('\n') || ''}\n\n`
    if (p.warm_up) text += `🔥 التحمية (${p.warm_up.duration}):\n${p.warm_up.instructions}\n\n`
    if (p.main_activities?.length) {
      text += `📚 الأنشطة الرئيسية:\n`
      for (const act of p.main_activities) {
        text += `\n▸ ${act.title} (${act.duration})\n${act.instructions}\n`
      }
      text += '\n'
    }
    if (p.practice) text += `✏️ التطبيق (${p.practice.duration}):\n${p.practice.instructions}\n\n`
    if (p.wrap_up) text += `🏁 الختام (${p.wrap_up.duration}):\n${p.wrap_up.activity}\n\n`
    if (p.homework_suggestion) text += `📝 الواجب: ${p.homework_suggestion}\n`
    return text
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <BookOpen size={20} className="text-emerald-400" />
        </div>
        <div>
          <h1 className="text-page-title">مخطط الدروس الذكي</h1>
          <p className="text-muted text-sm mt-1">خطط دروس مفصلة مبنية على مستوى الطلاب وأدائهم</p>
        </div>
      </div>

      {/* Config */}
      <div className="glass-card p-7 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="input-label">المجموعة *</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="input-field w-full text-sm"
            >
              <option value="">اختر مجموعة</option>
              {groups?.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">الموضوع (اختياري)</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="input-field w-full text-sm"
              placeholder="مثلاً: Daily Routine"
            />
          </div>
          <div>
            <label className="input-label">المدة (دقائق)</label>
            <select value={duration} onChange={(e) => setDuration(+e.target.value)} className="input-field w-full text-sm">
              <option value={30}>30 دقيقة</option>
              <option value={45}>45 دقيقة</option>
              <option value={60}>60 دقيقة</option>
              <option value={90}>90 دقيقة</option>
            </select>
          </div>
        </div>

        {/* Focus skills */}
        <div>
          <label className="input-label">التركيز على (اختياري):</label>
          <div className="flex flex-wrap gap-2">
            {SKILL_OPTIONS.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                  focusSkills.includes(skill)
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/5 text-muted hover:text-white'
                }`}
              >
                {SKILL_LABELS[skill]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => generateMutation.mutate()}
          disabled={!selectedGroup || generateMutation.isPending}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm"
        >
          {generateMutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" /> جاري إنشاء الخطة...</>
          ) : (
            <><Sparkles size={14} /> إنشاء خطة درس</>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Generated plan */}
      {plan && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-7 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>{plan.title}</h2>
            <button onClick={copyPlan} className="text-xs text-muted hover:text-white flex items-center gap-1 transition-all">
              {copied ? <><CheckCircle2 size={12} className="text-emerald-400" /> تم النسخ</> : <><Copy size={12} /> نسخ</>}
            </button>
          </div>

          {/* Duration + Objectives */}
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="flex items-center gap-1"><Clock size={14} /> {plan.duration}</span>
            <span className="flex items-center gap-1"><Users size={14} /> {groups?.find(g => g.id === selectedGroup)?.name}</span>
          </div>

          {plan.objectives?.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-1">
                <Target size={14} className="text-sky-400" /> الأهداف
              </h3>
              <ul className="space-y-1">
                {plan.objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-muted flex items-start gap-2">
                    <span className="text-sky-400 mt-0.5">•</span> {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warm up */}
          {plan.warm_up && (
            <div className="bg-gold-500/5 rounded-xl p-4">
              <h3 className="text-sm font-medium text-gold-400 mb-1">🔥 التحمية ({plan.warm_up.duration})</h3>
              <p className="text-sm text-muted whitespace-pre-wrap">{plan.warm_up.instructions}</p>
            </div>
          )}

          {/* Main activities */}
          {plan.main_activities?.map((act, i) => (
            <div key={i} className="rounded-xl p-4" style={{ background: 'var(--color-bg-surface-raised)' }}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">{act.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Clock size={10} /> {act.duration}
                  {act.type && <span className="text-sky-400">{SKILL_LABELS[act.type] || act.type}</span>}
                </div>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap">{act.instructions}</p>
              {act.resources && <p className="text-xs text-violet-400 mt-2">المصادر: {act.resources}</p>}
            </div>
          ))}

          {/* Practice */}
          {plan.practice && (
            <div className="bg-emerald-500/5 rounded-xl p-4">
              <h3 className="text-sm font-medium text-emerald-400 mb-1">✏️ التطبيق ({plan.practice.duration})</h3>
              <p className="text-sm text-muted whitespace-pre-wrap">{plan.practice.instructions}</p>
            </div>
          )}

          {/* Wrap up */}
          {plan.wrap_up && (
            <div className="bg-sky-500/5 rounded-xl p-4">
              <h3 className="text-sm font-medium text-sky-400 mb-1">🏁 الختام ({plan.wrap_up.duration})</h3>
              <p className="text-sm text-muted">{plan.wrap_up.activity}</p>
            </div>
          )}

          {/* Homework */}
          {plan.homework_suggestion && (
            <div className="bg-violet-500/5 rounded-xl p-4">
              <h3 className="text-sm font-medium text-violet-400 mb-1">📝 اقتراح واجب</h3>
              <p className="text-sm text-muted">{plan.homework_suggestion}</p>
            </div>
          )}

          {/* Differentiation */}
          {plan.differentiation && (
            <div className="text-xs text-muted rounded-xl p-3" style={{ background: 'var(--color-bg-surface-raised)' }}>
              <p className="font-medium text-white mb-1">مراعاة الفروق الفردية:</p>
              <p>{plan.differentiation}</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
