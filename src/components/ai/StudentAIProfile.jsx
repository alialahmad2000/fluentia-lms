import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Brain, Loader2, RefreshCw, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react'
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const SKILL_LABELS = {
  speaking: 'المحادثة',
  listening: 'الاستماع',
  reading: 'القراءة',
  writing: 'الكتابة',
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  pronunciation: 'النطق',
  consistency: 'الالتزام',
}

export default function StudentAIProfile({ studentId, showGenerate = false, showEnglishSummary = false }) {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['ai-student-profile', studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_student_profiles')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle()
      return data
    },
    enabled: !!studentId,
  })

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await invokeWithRetry('generate-ai-student-profile', {
        body: { student_id: studentId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }, { timeoutMs: 45000, retries: 0 })
      if (res.error) throw new Error(typeof res.error === 'object' ? res.error.message : String(res.error))
      if (res.data?.error) throw new Error(res.data.error)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-student-profile', studentId] })
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted" size={20} /></div>
  }

  if (!profile && !showGenerate) {
    return (
      <div className="glass-card p-8 text-center">
        <Brain size={32} className="text-muted mx-auto mb-2" />
        <p className="text-muted">لا يوجد ملف ذكي حتى الآن</p>
      </div>
    )
  }

  if (!profile && showGenerate) {
    return (
      <div className="glass-card p-8 text-center">
        <Brain size={32} className="text-violet-400 mx-auto mb-3" />
        <p className="text-muted mb-4">لم يتم تحليل الملف بعد</p>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="btn-primary text-sm py-2 px-4 flex items-center gap-2 mx-auto"
        >
          {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
          تحليل الملف الذكي
        </button>
        {generateMutation.isError && (
          <p className="text-red-400 text-xs mt-2">{generateMutation.error?.message}</p>
        )}
      </div>
    )
  }

  // Build radar chart data
  const radarData = Object.entries(profile.skills || {}).map(([key, value]) => ({
    skill: SKILL_LABELS[key] || key,
    value: value || 0,
    fullMark: 100,
  }))

  return (
    <div className="space-y-6">
      {/* Refresh button */}
      {showGenerate && (
        <div className="flex justify-end">
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-secondary text-xs py-1.5 flex items-center gap-1.5"
          >
            {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            تحديث التحليل
          </button>
        </div>
      )}

      {/* Radar Chart */}
      {radarData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="text-section-title mb-4" style={{ color: 'var(--color-text-primary)' }}>خريطة المهارات</h3>
          <div className="w-full h-72">
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Strengths */}
        {profile.strengths?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-emerald-400" />
              <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>نقاط القوة</h3>
            </div>
            <div className="space-y-2">
              {profile.strengths.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="badge-green text-xs mt-0.5 shrink-0">+</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{s}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Weaknesses */}
        {profile.weaknesses?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={16} className="text-amber-400" />
              <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>نقاط التحسين</h3>
            </div>
            <div className="space-y-2">
              {profile.weaknesses.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="badge-yellow text-xs mt-0.5 shrink-0">!</span>
                  <span style={{ color: 'var(--color-text-primary)' }}>{w}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Tips */}
      {profile.tips?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-sky-400" />
            <h3 className="text-section-title" style={{ color: 'var(--color-text-primary)' }}>نصائح مخصصة</h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {profile.tips.map((tip, i) => (
              <div key={i} className="rounded-xl p-3 text-sm" style={{ background: 'var(--color-bg-surface-raised)', color: 'var(--color-text-primary)' }}>
                {tip}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Arabic Summary */}
      {profile.summary_ar && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
          <h3 className="text-section-title mb-3" style={{ color: 'var(--color-text-primary)' }}>ملخص الطالب</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-text-secondary)' }}>{profile.summary_ar}</p>
        </motion.div>
      )}

      {/* English Summary (for trainer view) */}
      {showEnglishSummary && profile.summary_en && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="text-section-title mb-3" style={{ color: 'var(--color-text-primary)' }}>Trainer Summary</h3>
          <p className="text-sm leading-relaxed text-muted" dir="ltr">{profile.summary_en}</p>
        </motion.div>
      )}

      {/* Generated at */}
      {profile.generated_at && (
        <p className="text-xs text-muted text-center">
          آخر تحليل: {new Date(profile.generated_at).toLocaleDateString('ar-SA')}
        </p>
      )}
    </div>
  )
}
