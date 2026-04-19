import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, ChevronDown, X, Save, Loader2, RotateCcw, Mic, Image, FileText as FileIcon, Link2, Download } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import AISubmissionFeedback from '../../components/ai/AISubmissionFeedback'
import { ASSIGNMENT_TYPES, GRADE_LABELS, SUBMISSION_STATUS } from '../../lib/constants'
import { formatDateAr, timeAgo } from '../../utils/dateHelpers'
import { parseSupabaseError } from '../../utils/errors'
import { notifyUser } from '../../utils/notify'
import { ListSkeleton } from '../../components/ui/PageSkeleton'
import EmptyState from '../../components/ui/EmptyState'

function getStorageUrl(bucket, path) {
  if (!path) return null
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data?.publicUrl || null
}

// Generate a signed URL for private buckets (voice-notes)
async function getSignedUrl(bucket, path) {
  if (!path) return null
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600)
  if (error) {
    console.error('[getSignedUrl]', error)
    return getStorageUrl(bucket, path) // fallback to public URL
  }
  return data?.signedUrl || null
}

export default function TrainerGrading() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  // Default filter: if arriving with ?open=<id> we show "all" so the
  // target submission is findable even when it's already graded.
  const openId = searchParams.get('open')
  const [filterStatus, setFilterStatus] = useState(openId ? 'all' : 'submitted')
  const [gradingSubmission, setGradingSubmission] = useState(null)

  const role = profile?.role
  const isAdmin = role === 'admin'

  // Trainer's groups (only needed for non-admin)
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ['trainer-groups', role],
    queryFn: async () => {
      const { data } = await supabase
        .from('groups')
        .select('id')
        .eq('trainer_id', profile?.id)
      return data || []
    },
    enabled: !!profile?.id && !isAdmin,
  })

  // Submissions — admin sees ALL, trainer sees only their groups
  const { data: submissions = [], isLoading, error: queryError } = useQuery({
    queryKey: ['trainer-all-submissions', filterStatus, role],
    queryFn: async () => {
      let query = supabase
        .from('submissions')
        .select('*, students:student_id(profiles(full_name, display_name)), assignments!inner(title, type, group_id, points_on_time, points_late, instructions, description, groups(code))')
        .is('deleted_at', null)
        .order('submitted_at', { ascending: false })

      // Trainer: filter by their groups
      if (!isAdmin) {
        const groupIds = (groups || []).map(g => g.id)
        if (groupIds.length === 0) return []
        query = query.in('assignments.group_id', groupIds)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query
      if (error) {
        console.error('[TrainerGrading] Query error:', error)
        return []
      }
      return data || []
    },
    enabled: isAdmin || !!groups?.length,
  })

  // Helper to get student name from nested join
  function getStudentName(s) {
    return s.students?.profiles?.full_name || s.students?.profiles?.display_name || 'طالب'
  }

  // Deep-link: when we land with ?open=<id>, auto-open the grading modal
  // for that submission as soon as the list finishes loading. We also
  // strip the query param so refreshing doesn't keep re-opening it.
  useEffect(() => {
    if (!openId || !submissions?.length) return
    const target = submissions.find(s => s.id === openId)
    if (target) {
      setGradingSubmission(target)
      const next = new URLSearchParams(searchParams)
      next.delete('open')
      setSearchParams(next, { replace: true })
    }
  }, [openId, submissions])

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-page-title">التقييم</h1>
        <p className="text-muted text-sm mt-1">تقييم واجبات الطلاب</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'submitted', label: 'بانتظار التقييم' },
          { key: 'graded', label: 'تم التقييم' },
          { key: 'resubmit_requested', label: 'طُلب إعادة تسليم' },
          { key: 'all', label: 'الكل' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              filterStatus === tab.key
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'text-muted hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Submissions list */}
      {queryError ? (
        <div className="fl-card-static p-12 text-center">
          <p className="text-red-400">فشل تحميل التسليمات — حاول مرة أخرى</p>
        </div>
      ) : isLoading || (!isAdmin && groupsLoading) ? (
        <ListSkeleton />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={filterStatus === 'submitted' ? 'لا توجد تسليمات بانتظار التقييم' : 'لا توجد تسليمات'}
          description="جميع التسليمات تمت مراجعتها"
        />
      ) : (
        <div className="space-y-4">
          {submissions.map((s, i) => {
            const typeInfo = ASSIGNMENT_TYPES[s.assignments?.type] || ASSIGNMENT_TYPES.custom
            const statusInfo = SUBMISSION_STATUS[s.status]

            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="fl-card p-7 cursor-pointer hover:border-sky-500/20"
                onClick={() => setGradingSubmission(s)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                        <span>{typeInfo.icon}</span>
                      </div>
                      <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">{s.assignments?.title}</h3>
                      <span className={`badge-${statusInfo?.color || 'blue'}`}>{statusInfo?.label_ar}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted mt-2">
                      <span className="text-gradient font-medium">{getStudentName(s)}</span>
                      <span className="badge-blue text-xs">{s.assignments?.groups?.code}</span>
                      {s.submitted_at && <span>{timeAgo(s.submitted_at)}</span>}
                      {s.is_late && <span className="badge-yellow text-xs">متأخر</span>}
                    </div>
                    {s.content_text && (
                      <p className="text-xs text-muted mt-2 line-clamp-2">{s.content_text}</p>
                    )}
                  </div>

                  {s.status === 'graded' && (
                    <div className="text-center shrink-0">
                      <p className="text-2xl font-bold text-emerald-400">{s.grade}</p>
                      <p className="text-xs text-muted">{s.grade_numeric}%</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Grading modal */}
      <AnimatePresence>
        {gradingSubmission && (
          <GradingModal
            submission={gradingSubmission}
            getStudentName={getStudentName}
            onClose={() => { setGradingSubmission(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function GradingModal({ submission, getStudentName, onClose }) {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [grade, setGrade] = useState(submission.grade || '')
  const [gradeNumeric, setGradeNumeric] = useState(submission.grade_numeric ?? '')
  const [feedback, setFeedback] = useState(submission.trainer_feedback || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [voiceUrl, setVoiceUrl] = useState(null)
  const [voiceLoading, setVoiceLoading] = useState(false)

  // Load signed URL for voice notes
  useEffect(() => {
    if (submission.content_voice_url) {
      setVoiceLoading(true)
      getSignedUrl('voice-notes', submission.content_voice_url).then(url => {
        setVoiceUrl(url)
        setVoiceLoading(false)
      }).catch(() => setVoiceLoading(false))
    }
  }, [])

  const gradeMutation = useMutation({
    mutationFn: async ({ requestResubmit, autoApprove, overrideGrade, overrideNumeric, overrideFeedback }) => {
      if (requestResubmit) {
        const { error } = await supabase
          .from('submissions')
          .update({ status: 'resubmit_requested', trainer_feedback: feedback.trim() || null })
          .eq('id', submission.id)
          .select()
        if (error) throw error
        return 'resubmit'
      }

      const finalGrade = autoApprove && overrideGrade ? overrideGrade : grade
      const finalNumeric = autoApprove && overrideNumeric != null ? overrideNumeric : gradeNumeric
      const finalFeedback = autoApprove && overrideFeedback != null ? overrideFeedback : feedback

      if (!finalGrade) throw new Error('اختر الدرجة')
      if (finalNumeric === '' || finalNumeric === null) throw new Error('أدخل الدرجة الرقمية')
      const numericVal = parseInt(finalNumeric)
      if (isNaN(numericVal) || numericVal < 0 || numericVal > 100) throw new Error('الدرجة الرقمية يجب أن تكون بين 0 و 100')

      const points = submission.is_late
        ? (submission.assignments?.points_late || 5)
        : (submission.assignments?.points_on_time || 10)

      const updateData = {
        status: 'graded',
        grade: finalGrade,
        grade_numeric: parseInt(finalNumeric),
        trainer_feedback: finalFeedback.trim() || null,
        points_awarded: points,
      }

      if (autoApprove) {
        updateData.ai_feedback_approved = true
      }

      const { error: updateErr } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', submission.id)
        .select()
      if (updateErr) throw updateErr

      // Award XP only on first grading (not re-grading)
      if (submission.status !== 'graded') {
        const { error: xpErr } = await supabase.from('xp_transactions').insert({
          student_id: submission.student_id,
          amount: points,
          reason: submission.is_late ? 'assignment_late' : 'assignment_on_time',
          related_id: submission.assignment_id,
          awarded_by: profile?.id,
        })
        if (xpErr) console.error('[TrainerGrading] XP error:', xpErr)
      }

      // Send notification to student (in-app + push)
      const trainerName = profile?.full_name || profile?.display_name || 'المدرب'
      const { error: notifErr } = await notifyUser({
        userId: submission.student_id,
        title: `تم تقييم واجبك: ${submission.assignments?.title || 'واجب'}`,
        body: `${trainerName} قيّم واجبك — الدرجة: ${finalGrade} (${numericVal}%)`,
        url: '/student/assignments',
        type: 'assignment_graded',
      })
      if (notifErr) console.error('[TrainerGrading] Notification error:', notifErr)

      return autoApprove ? 'auto_approved' : 'graded'
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-all-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['trainer-pending-submissions'] })
      if (result === 'auto_approved') {
        setSuccess('تم اعتماد التقييم وإرسال الملاحظات للطالب ✓')
        setTimeout(onClose, 1500)
      } else {
        onClose()
      }
    },
    onError: (err) => setError(parseSupabaseError(err)),
  })

  // Auto-set grade letter from numeric
  function handleNumericChange(val) {
    setGradeNumeric(val)
    const num = parseInt(val)
    if (isNaN(num)) return
    for (const [letter, info] of Object.entries(GRADE_LABELS)) {
      if (num >= info.min) { setGrade(letter); break }
    }
  }

  // AI approve and send — auto-fills everything and saves
  async function handleApproveAndSend({ grade: aiGrade, gradeNumeric: aiNumeric, trainerFeedback, aiFeedback }) {
    setGrade(aiGrade)
    setGradeNumeric(aiNumeric)
    setFeedback(trainerFeedback)
    setError('')
    gradeMutation.mutate({ requestResubmit: false, autoApprove: true, overrideGrade: aiGrade, overrideNumeric: aiNumeric, overrideFeedback: trainerFeedback })
  }

  // AI approve and edit — pre-fills fields but doesn't save
  function handleApproveAndEdit({ grade: aiGrade, gradeNumeric: aiNumeric, trainerFeedback }) {
    setGrade(aiGrade)
    setGradeNumeric(aiNumeric)
    setFeedback(trainerFeedback)
    setError('')
    // Scroll to grade inputs
    document.getElementById('grade-inputs')?.scrollIntoView({ behavior: 'smooth' })
  }

  const assignmentType = submission.assignments?.type || 'custom'

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/60 z-40"
      />
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
        className="fixed inset-x-4 top-[5vh] bottom-[5vh] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl border rounded-2xl z-50 flex flex-col overflow-hidden"
        style={{ background: 'var(--surface-overlay)', borderColor: 'var(--border-default)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">تقييم الواجب</h2>
            <button onClick={onClose} className="btn-icon"><X size={20} /></button>
          </div>
          <p className="text-sm text-muted mt-1">
            {getStudentName(submission)} — {submission.assignments?.title}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Student's answer — Text */}
          {submission.content_text && (
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted mb-2">
                <FileIcon size={14} /> النص
              </label>
              <div className="rounded-xl p-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap" style={{ background: 'var(--surface-raised)' }}>
                {submission.content_text}
              </div>
              <p className="text-xs text-muted mt-1">{submission.content_text.split(/\s+/).filter(Boolean).length} كلمة</p>
            </div>
          )}

          {/* Voice recording — with signed URL */}
          {submission.content_voice_url && (
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted mb-2">
                <Mic size={14} /> التسجيل الصوتي
                {submission.content_voice_duration && (
                  <span className="text-xs">({Math.round(submission.content_voice_duration)}ث)</span>
                )}
              </label>
              {voiceLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted py-3">
                  <Loader2 size={14} className="animate-spin" />
                  جاري تحميل الصوت...
                </div>
              ) : voiceUrl ? (
                <audio
                  controls
                  className="w-full"
                  src={voiceUrl}
                  preload="metadata"
                />
              ) : (
                <p className="text-xs text-red-400 py-2">تعذر تحميل التسجيل الصوتي</p>
              )}
            </div>
          )}

          {/* Images */}
          {submission.content_image_urls?.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted mb-2">
                <Image size={14} /> الصور ({submission.content_image_urls.length})
              </label>
              <div className="grid grid-cols-2 gap-2">
                {submission.content_image_urls.map((imgPath, idx) => (
                  <a
                    key={idx}
                    href={getStorageUrl('submissions', imgPath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl overflow-hidden border border-border-subtle hover:border-sky-500/30 transition-colors"
                  >
                    <img
                      src={getStorageUrl('submissions', imgPath)}
                      alt={`صورة ${idx + 1}`}
                      className="w-full h-40 object-cover"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {submission.content_file_urls?.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted mb-2">
                <FileIcon size={14} /> الملفات ({submission.content_file_urls.length})
              </label>
              <div className="space-y-2">
                {submission.content_file_urls.map((file, idx) => {
                  const fileUrl = getStorageUrl('submissions', file.path || file)
                  const fileName = file.name || (file.path || file).split('/').pop()
                  const fileSize = file.size ? `${(file.size / 1024).toFixed(0)} KB` : null
                  return (
                    <a
                      key={idx}
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-[var(--surface-raised)] transition-colors border border-border-subtle" style={{ background: 'var(--surface-raised)' }}
                    >
                      <Download size={16} className="text-sky-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] truncate">{fileName}</p>
                        {fileSize && <p className="text-xs text-muted">{fileSize}</p>}
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* Link */}
          {submission.content_link && (
            <div>
              <label className="flex items-center gap-1.5 text-sm text-muted mb-2">
                <Link2 size={14} /> رابط
              </label>
              <a
                href={submission.content_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl p-3 text-sm text-sky-400 hover:text-sky-300 hover:bg-[var(--surface-raised)] transition-colors border border-border-subtle" style={{ background: 'var(--surface-raised)' }}
                dir="ltr"
              >
                {submission.content_link}
              </a>
            </div>
          )}

          {/* No content at all */}
          {!submission.content_text && !submission.content_voice_url && !submission.content_image_urls?.length && !submission.content_file_urls?.length && !submission.content_link && (
            <div className="rounded-xl p-4 text-sm text-muted text-center" style={{ background: 'var(--surface-raised)' }}>
              لا يوجد محتوى
            </div>
          )}

          {/* Late / difficulty info */}
          <div className="flex items-center gap-3 text-xs text-muted">
            {submission.is_late && <span className="badge-yellow">تسليم متأخر</span>}
            {submission.difficulty_rating && (
              <span className="badge-muted">
                الصعوبة: {submission.difficulty_rating === 'easy' ? 'سهل' : submission.difficulty_rating === 'medium' ? 'متوسط' : submission.difficulty_rating === 'hard' ? 'صعب' : 'صعب جداً'}
              </span>
            )}
          </div>

          {/* ── Universal AI Feedback ── */}
          <AISubmissionFeedback
            submission={submission}
            assignmentType={assignmentType}
            existingFeedback={submission.ai_feedback}
            onApproveAndSend={handleApproveAndSend}
            onApproveAndEdit={handleApproveAndEdit}
          />

          {/* Success toast */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl px-4 py-3 text-center font-medium"
            >
              {success}
            </motion.div>
          )}

          {/* Grade inputs */}
          <div id="grade-inputs" className="grid grid-cols-2 gap-6">
            <div>
              <label className="input-label">الدرجة الرقمية (0-100)</label>
              <input
                type="number"
                className="input-field"
                min={0} max={100}
                value={gradeNumeric}
                onChange={(e) => handleNumericChange(e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className="input-label">التقدير</label>
              <select
                className="input-field"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              >
                <option value="">اختر...</option>
                {Object.entries(GRADE_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>{key} — {info.label_ar} ({info.min}%+)</option>
                ))}
              </select>
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="input-label">ملاحظات المدرب</label>
            <textarea
              className="input-field min-h-[100px] resize-y"
              placeholder="ملاحظاتك على الواجب..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => gradeMutation.mutate({ requestResubmit: true })}
            disabled={gradeMutation.isPending}
            className="btn-secondary text-sm py-2 flex items-center gap-2"
          >
            <RotateCcw size={14} />
            <span>طلب إعادة تسليم</span>
          </button>
          <button
            type="button"
            onClick={() => { setError(''); gradeMutation.mutate({ requestResubmit: false }) }}
            disabled={gradeMutation.isPending}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            {gradeMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span>حفظ التقييم</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}
