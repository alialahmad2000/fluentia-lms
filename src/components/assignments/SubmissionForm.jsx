import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { X, Send, Loader2, Link2, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { parseSupabaseError } from '../../utils/errors'
import { isOverdue } from '../../utils/dateHelpers'
import VoiceRecorder from './VoiceRecorder'
import ImageUpload from './ImageUpload'
import FileUpload from './FileUpload'

export default function SubmissionForm({ assignment, existingSubmission, studentId, onClose }) {
  const queryClient = useQueryClient()
  const isDraft = existingSubmission?.status === 'draft'
  const isResubmit = existingSubmission && !isDraft

  const [form, setForm] = useState({
    content_text: existingSubmission?.content_text || '',
    content_link: existingSubmission?.content_link || '',
    difficulty_rating: existingSubmission?.difficulty_rating || null,
  })
  const [voiceData, setVoiceData] = useState(null) // { blob, mimeType, ext, duration }
  const [images, setImages] = useState([]) // [{ blob, preview, name, size }]
  const [files, setFiles] = useState([]) // [{ blob, name, size, type }]
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Upload a file to Supabase Storage
  async function uploadToStorage(bucket, path, blob, contentType) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType, upsert: true })
    if (error) throw new Error(`فشل رفع الملف: ${error.message}`)
    return data.path
  }

  const submitMutation = useMutation({
    mutationFn: async ({ asDraft }) => {
      const late = assignment.deadline ? isOverdue(assignment.deadline) : false
      const timestamp = Date.now()

      let voiceUrl = existingSubmission?.content_voice_url || null
      let voiceDuration = existingSubmission?.content_voice_duration || null
      let imageUrls = existingSubmission?.content_image_urls || []
      let fileUrls = existingSubmission?.content_file_urls || []

      // Upload voice recording
      if (voiceData?.blob) {
        setUploadProgress('جاري رفع التسجيل الصوتي...')
        const voicePath = `${studentId}/voice_${assignment.id}_${timestamp}.${voiceData.ext}`
        await uploadToStorage('voice-notes', voicePath, voiceData.blob, voiceData.mimeType)
        voiceUrl = voicePath
        voiceDuration = voiceData.duration
      }

      // Upload images
      if (images.length > 0) {
        setUploadProgress('جاري رفع الصور...')
        const uploadedUrls = []
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          if (img.blob) {
            const imgPath = `${studentId}/img_${assignment.id}_${timestamp}_${i}.jpg`
            await uploadToStorage('submissions', imgPath, img.blob, 'image/jpeg')
            uploadedUrls.push(imgPath)
          } else if (img.url) {
            uploadedUrls.push(img.url)
          }
        }
        imageUrls = uploadedUrls
      }

      // Upload files
      if (files.length > 0) {
        setUploadProgress('جاري رفع الملفات...')
        const uploadedFiles = []
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          if (f.blob) {
            const ext = f.name.split('.').pop().toLowerCase()
            const filePath = `${studentId}/file_${assignment.id}_${timestamp}_${i}.${ext}`
            await uploadToStorage('submissions', filePath, f.blob, f.type || 'application/octet-stream')
            uploadedFiles.push({ path: filePath, name: f.name, size: f.size })
          } else if (f.path) {
            uploadedFiles.push(f)
          }
        }
        fileUrls = uploadedFiles
      }

      setUploadProgress(asDraft ? 'جاري حفظ المسودة...' : 'جاري التسليم...')

      const payload = {
        assignment_id: assignment.id,
        student_id: studentId,
        assignment_version: assignment.version || 1,
        content_text: form.content_text.trim() || null,
        content_link: form.content_link.trim() || null,
        content_voice_url: voiceUrl,
        content_voice_duration: voiceDuration,
        content_image_urls: imageUrls,
        content_file_urls: fileUrls,
        difficulty_rating: form.difficulty_rating,
        status: asDraft ? 'draft' : 'submitted',
        submitted_at: asDraft ? null : new Date().toISOString(),
        is_late: late,
      }

      // Update existing submission (draft or resubmit), or insert new
      if (existingSubmission) {
        const { error } = await supabase
          .from('submissions')
          .update(payload)
          .eq('id', existingSubmission.id)
          .select()
        if (error) throw new Error(error.message || JSON.stringify(error))
      } else {
        const { error } = await supabase
          .from('submissions')
          .insert(payload)
          .select()
        if (error) throw new Error(error.message || JSON.stringify(error))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['student-pending-assignments'] })
      onClose()
    },
    onError: (err) => {
      setUploadProgress('')
      console.error('[SubmissionForm] Error:', err)
      setError(parseSupabaseError(err))
    },
  })

  function handleSubmit(asDraft = false) {
    setError('')
    if (!asDraft) {
      const hasContent = form.content_text.trim() || form.content_link.trim() || voiceData?.blob || images.length > 0 || files.length > 0
      // For draft→submit, also check existing attachments
      const hasExisting = existingSubmission?.content_voice_url || existingSubmission?.content_image_urls?.length > 0 || existingSubmission?.content_file_urls?.length > 0
      if (!hasContent && !hasExisting) {
        setError('أضف إجابة: نص، تسجيل صوتي، صور، ملف، أو رابط')
        return
      }
    }
    submitMutation.mutate({ asDraft })
  }

  const difficultyOptions = [
    { value: 'easy', label: 'سهل', emoji: '😊' },
    { value: 'medium', label: 'متوسط', emoji: '😐' },
    { value: 'hard', label: 'صعب', emoji: '😓' },
    { value: 'very_hard', label: 'صعب جداً', emoji: '🤯' },
  ]

  const isUploading = submitMutation.isPending

  // Modal title
  const modalTitle = isDraft ? 'متابعة التسليم' : isResubmit ? 'إعادة التسليم' : 'تسليم الواجب'

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="fixed inset-x-4 top-[5vh] bottom-[5vh] lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:w-full lg:max-w-2xl glass-card-raised rounded-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">{modalTitle}</h2>
            <button onClick={onClose} className="btn-ghost p-2 rounded-xl text-muted hover:text-white transition-all duration-200">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-muted mt-1">{assignment.title}</p>
          {assignment.instructions && (
            <p className="text-xs text-sky-400 mt-2 bg-sky-500/5 rounded-xl p-3 border border-sky-500/10">
              {assignment.instructions}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Text answer */}
          <div>
            <label className="input-label block mb-2">إجابتك (نص)</label>
            <textarea
              className="input-field min-h-[120px] resize-y"
              placeholder="اكتب إجابتك هنا..."
              value={form.content_text}
              onChange={(e) => update('content_text', e.target.value)}
              disabled={isUploading}
            />
            {form.content_text.length > 0 && (
              <p className="text-xs text-muted mt-1 text-left">
                {form.content_text.split(/\s+/).filter(Boolean).length} كلمة
              </p>
            )}
          </div>

          {/* Voice recorder */}
          <VoiceRecorder
            onRecordingComplete={setVoiceData}
            existingUrl={existingSubmission?.content_voice_url}
          />

          {/* Image upload */}
          <ImageUpload
            images={images}
            onImagesChange={setImages}
            maxImages={4}
          />

          {/* File upload */}
          <FileUpload
            files={files}
            onFilesChange={setFiles}
            maxFiles={3}
          />

          {/* Link */}
          <div>
            <label className="input-label flex items-center gap-2 mb-2">
              <Link2 size={14} />
              رابط (اختياري)
            </label>
            <input
              className="input-field"
              placeholder="https://..."
              value={form.content_link}
              onChange={(e) => update('content_link', e.target.value)}
              dir="ltr"
              disabled={isUploading}
            />
          </div>

          {/* Difficulty rating */}
          <div>
            <label className="input-label block mb-2">كيف كان مستوى الصعوبة؟</label>
            <div className="flex items-center gap-3">
              {difficultyOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('difficulty_rating', opt.value)}
                  disabled={isUploading}
                  className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs transition-all duration-200 hover:translate-y-[-2px] ${
                    form.difficulty_rating === opt.value
                      ? 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
                      : 'bg-white/5 border border-white/5 text-muted hover:text-white'
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Upload progress */}
          {uploadProgress && (
            <div className="flex items-center gap-2 text-sm text-sky-400 bg-sky-500/5 rounded-xl px-4 py-3 border border-sky-500/10">
              <Loader2 size={16} className="animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isUploading}
            className="btn-secondary text-sm py-2 flex items-center gap-2"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>حفظ كمسودة</span>
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isUploading}
            className="btn-primary text-sm py-2 flex items-center gap-2"
          >
            {isUploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            <span>تسليم</span>
          </button>
        </div>
      </motion.div>
    </>
  )
}
