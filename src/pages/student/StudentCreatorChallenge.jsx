import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Video, Clock, Zap, Trophy, Eye, Send, Loader2, ExternalLink, CheckCircle2, XCircle, Hash, Sparkles } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'

const PLATFORM_OPTIONS = [
  { value: 'tiktok', label: 'TikTok', icon: '🎵' },
  { value: 'instagram', label: 'Instagram Reels', icon: '📸' },
  { value: 'youtube', label: 'YouTube Shorts', icon: '▶️' },
  { value: 'snapchat', label: 'Snapchat', icon: '👻' },
  { value: 'x', label: 'X (Twitter)', icon: '𝕏' },
  { value: 'other', label: 'Other', icon: '🔗' },
]

const STATUS_LABELS = {
  pending: { label: 'قيد المراجعة', color: 'amber', icon: Clock },
  approved: { label: 'مقبول', color: 'emerald', icon: CheckCircle2 },
  rejected: { label: 'مرفوض', color: 'rose', icon: XCircle },
}

export default function StudentCreatorChallenge() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // Form state
  const [videoUrl, setVideoUrl] = useState('')
  const [platform, setPlatform] = useState('tiktok')
  const [description, setDescription] = useState('')

  useEffect(() => () => clearTimeout(toastTimerRef.current), [])

  function showToast(msg, duration = 3000) {
    clearTimeout(toastTimerRef.current)
    setToast(msg)
    toastTimerRef.current = setTimeout(() => setToast(null), duration)
  }

  // Fetch active/latest creator challenge
  const { data: challenge, isLoading: loadingChallenge } = useQuery({
    queryKey: ['creator-challenge-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_challenges')
        .select('*')
        .in('status', ['active', 'judging', 'completed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return data
    },
  })

  // Fetch my submission
  const { data: mySubmission } = useQuery({
    queryKey: ['creator-submission-mine', challenge?.id, profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_submissions')
        .select('*')
        .eq('challenge_id', challenge.id)
        .eq('student_id', profile.id)
        .maybeSingle()
      return data
    },
    enabled: !!challenge?.id && !!profile?.id,
  })

  // Fetch all approved submissions (gallery)
  const { data: submissions } = useQuery({
    queryKey: ['creator-submissions-all', challenge?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_submissions')
        .select('*, student:students(id, profiles(full_name, avatar_url))')
        .eq('challenge_id', challenge.id)
        .eq('status', 'approved')
        .order('view_count', { ascending: false })
      return data || []
    },
    enabled: !!challenge?.id,
  })

  // Submit video
  const submitVideo = useMutation({
    mutationFn: async () => {
      if (!videoUrl.trim()) throw new Error('أدخل رابط الفيديو')
      const { error } = await supabase.from('creator_submissions').insert({
        challenge_id: challenge.id,
        student_id: profile.id,
        video_url: videoUrl.trim(),
        platform,
        description: description.trim() || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-submission-mine'] })
      queryClient.invalidateQueries({ queryKey: ['creator-submissions-all'] })
      showToast('تم إرسال مشاركتك بنجاح! سنراجعها قريبا')
      setVideoUrl('')
      setDescription('')
    },
    onError: (err) => {
      showToast(err.message?.includes('duplicate') ? 'سبق وأرسلت مشاركة لهذا التحدي' : (err.message || 'حدث خطأ'))
    },
  })

  function getDaysLeft(endDate) {
    const diff = new Date(endDate) - new Date()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'انتهى'
    if (days === 1) return 'يوم واحد'
    if (days <= 10) return `${days} أيام`
    return `${days} يوم`
  }

  const isActive = challenge?.status === 'active'
  const isJudging = challenge?.status === 'judging'
  const isCompleted = challenge?.status === 'completed'
  const hasSubmitted = !!mySubmission
  const canSubmit = isActive && !hasSubmitted

  // Loading
  if (loadingChallenge) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    )
  }

  // No challenge
  if (!challenge) {
    return (
      <div className="space-y-12">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-page-title flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Video className="text-rose-400" size={20} />
            </div>
            تحدي المبدعين
          </h1>
        </motion.div>
        <div className="fl-card-static p-12 text-center">
          <Video size={48} className="text-muted mx-auto mb-3 opacity-30" />
          <p className="text-muted">لا يوجد تحدي نشط حالياً</p>
          <p className="text-xs text-muted mt-1">ترقب — تحدي المبدعين قادم قريباً!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-page-title flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(168,85,247,0.15))' }}>
            <Video className="text-rose-400" size={20} />
          </div>
          تحدي المبدعين
        </h1>
        <p className="text-muted text-sm mt-1">سوّ مقطع تعليمي وشارك العالم اللي تعلمته!</p>
      </motion.div>

      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="fl-card p-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(168,85,247,0.08), rgba(56,189,248,0.08))' }}
      >
        <div className="relative z-10">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{challenge.title_ar}</h2>
          {challenge.description_ar && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{challenge.description_ar}</p>
          )}

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'rgba(56,189,248,0.1)', color: 'var(--accent-sky)' }}>
              <Clock size={12} />
              {isActive ? `باقي ${getDaysLeft(challenge.end_date)}` : isJudging ? 'جاري التحكيم' : isCompleted ? 'انتهى التحدي' : ''}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'rgba(234,179,8,0.1)', color: 'var(--accent-gold)' }}>
              <Trophy size={12} />
              الأول: {challenge.xp_reward_1st} XP
            </span>
            {challenge.hashtag && (
              <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'rgba(168,85,247,0.1)', color: 'var(--accent-violet)' }}>
                <Hash size={12} />
                {challenge.hashtag}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Rules */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="fl-card-static p-5 space-y-3"
      >
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Sparkles size={14} className="text-amber-400" />
          شروط المشاركة
        </h3>
        <ul className="space-y-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">&#10003;</span>
            المقطع لازم يكون <strong>تعليمي</strong> — علّم شي تعلمته في Fluentia (كلمة، قاعدة، نطق، عبارة)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">&#10003;</span>
            <strong>لازم تذكر "أكاديمية طلاقة / Fluentia Academy"</strong> في الفيديو بشكل واضح (كلام أو نص على الشاشة)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">&#10003;</span>
            مدة المقطع: {challenge.min_duration_sec} ثانية إلى {Math.floor(challenge.max_duration_sec / 60)} دقيقة{challenge.max_duration_sec > 60 ? ` (${challenge.max_duration_sec} ثانية)` : ''}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">&#10003;</span>
            استخدم الهاشتاق: <strong dir="ltr">{challenge.hashtag || '#FluentiaChallenege'}</strong>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-0.5">&#10003;</span>
            أرسل رابط المقطع هنا كإثبات
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-0.5">&#9733;</span>
            <strong>نصيحة:</strong> استخدام منصة Fluentia في الفيديو (تصوير شاشة التطبيق، عرض التمارين أو المنهج) يزيد فرص فوزك!
          </li>
        </ul>
      </motion.div>

      {/* Prizes */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-3"
      >
        {[
          { rank: '🥇', label: 'الأول', xp: challenge.xp_reward_1st, color: 'gold' },
          { rank: '🥈', label: 'الثاني', xp: challenge.xp_reward_2nd, color: 'sky' },
          { rank: '🥉', label: 'الثالث', xp: challenge.xp_reward_3rd, color: 'amber' },
        ].map((prize) => (
          <div key={prize.label} className="fl-card-static p-4 text-center">
            <span className="text-2xl">{prize.rank}</span>
            <p className="text-xs font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{prize.label}</p>
            <p className="text-xs mt-0.5 flex items-center justify-center gap-1" style={{ color: `var(--accent-${prize.color})` }}>
              <Zap size={10} /> {prize.xp} XP
            </p>
          </div>
        ))}
      </motion.div>

      {/* My Submission Status */}
      {hasSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="fl-card p-5 space-y-3"
          style={{ borderColor: mySubmission.status === 'approved' ? 'rgba(16,185,129,0.2)' : mySubmission.status === 'rejected' ? 'rgba(244,63,94,0.2)' : 'rgba(234,179,8,0.2)' }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>مشاركتك</h3>
            {(() => {
              const s = STATUS_LABELS[mySubmission.status] || STATUS_LABELS.pending
              const Icon = s.icon
              return (
                <span className={`badge-${s.color === 'emerald' ? 'green' : s.color === 'rose' ? 'red' : 'gold'} flex items-center gap-1`}>
                  <Icon size={10} /> {s.label}
                </span>
              )
            })()}
          </div>

          <a
            href={mySubmission.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-medium hover:underline"
            style={{ color: 'var(--accent-sky)' }}
            dir="ltr"
          >
            <ExternalLink size={12} />
            {mySubmission.video_url}
          </a>

          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            <span>{PLATFORM_OPTIONS.find(p => p.value === mySubmission.platform)?.icon} {PLATFORM_OPTIONS.find(p => p.value === mySubmission.platform)?.label}</span>
            {mySubmission.status === 'approved' && (
              <span className="flex items-center gap-1"><Eye size={10} /> {mySubmission.view_count?.toLocaleString() || 0} مشاهدة</span>
            )}
            {mySubmission.rank && (
              <span className="flex items-center gap-1"><Trophy size={10} className="text-gold-400" /> المركز {mySubmission.rank}</span>
            )}
            {mySubmission.xp_awarded > 0 && (
              <span className="flex items-center gap-1"><Zap size={10} className="text-sky-400" /> +{mySubmission.xp_awarded} XP</span>
            )}
          </div>

          {mySubmission.status === 'rejected' && mySubmission.rejection_reason && (
            <p className="text-xs p-3 rounded-lg" style={{ background: 'rgba(244,63,94,0.08)', color: 'var(--accent-rose)' }}>
              سبب الرفض: {mySubmission.rejection_reason}
            </p>
          )}
        </motion.div>
      )}

      {/* Submit Form */}
      {canSubmit && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="fl-card-static p-5 space-y-4"
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>أرسل مشاركتك</h3>

          {/* Platform select */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>المنصة</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPlatform(p.value)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{
                    background: platform === p.value ? 'rgba(56,189,248,0.15)' : 'var(--surface-raised)',
                    border: platform === p.value ? '1px solid rgba(56,189,248,0.4)' : '1px solid var(--border-subtle)',
                    color: platform === p.value ? 'var(--accent-sky)' : 'var(--text-secondary)',
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Video URL */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>رابط الفيديو</label>
            <input
              value={videoUrl}
              onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://www.tiktok.com/@username/video/..."
              dir="ltr"
              className="w-full px-3 py-2.5 rounded-xl text-sm font-['Inter']"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>وش علّمت في الفيديو؟ (اختياري)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="مثلاً: شرحت كيف نستخدم present perfect..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm resize-none"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
          </div>

          {/* Submit button */}
          <button
            onClick={() => submitVideo.mutate()}
            disabled={submitVideo.isPending || !videoUrl.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, var(--accent-rose), var(--accent-violet))', color: '#fff' }}
          >
            {submitVideo.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitVideo.isPending ? 'جاري الإرسال...' : 'أرسل مشاركتي'}
          </button>
        </motion.div>
      )}

      {/* Gallery — Approved Submissions Leaderboard */}
      {submissions?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Trophy size={14} className="text-gold-400" />
            ترتيب المشاركات
          </h3>

          {submissions.map((sub, idx) => {
            const platformInfo = PLATFORM_OPTIONS.find(p => p.value === sub.platform)
            const studentName = sub.student?.profiles?.full_name || 'طالب'
            const rankEmoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`

            return (
              <div key={sub.id} className="fl-card-static p-4 flex items-center gap-3">
                <span className="text-lg w-8 text-center shrink-0">{rankEmoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{studentName}</p>
                  <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    <span>{platformInfo?.icon} {platformInfo?.label}</span>
                    <span className="flex items-center gap-1"><Eye size={10} /> {sub.view_count?.toLocaleString() || 0}</span>
                    {sub.shows_platform && <span className="text-amber-400">⭐ يعرض المنصة</span>}
                  </div>
                </div>
                <a
                  href={sub.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-2 rounded-lg transition-colors"
                  style={{ background: 'var(--surface-raised)', color: 'var(--accent-sky)' }}
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            )
          })}
        </motion.div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-sm font-medium z-50 backdrop-blur-xl"
            style={{
              background: 'var(--surface-overlay)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
