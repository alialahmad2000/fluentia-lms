import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { notifyUser } from '../../utils/notify'
import { useTranslation } from 'react-i18next'

const TEMPLATES = {
  trainer_encouragement: ['أداءك ممتاز اليوم! استمر', 'مشاركتك كانت رائعة!', 'تحسن واضح في النطق', 'أحسنت بالقراءة!'],
  trainer_observation: ['حاول تركز أكثر على النطق', 'راجع القاعدة مرة ثانية', 'حاول تشارك أكثر بالكلاس'],
  trainer_warning: ['لازم تخلص أنشطة الوحدة قبل الحصة القادمة', 'غيابك يأثر على تقدمك'],
  trainer_reminder: ['لا تنسى تسجل المواضيع', 'راجع المفردات قبل الحصة'],
}

export default function QuickNotePopup({ groupId, onClose }) {
  const { t } = useTranslation()
  const { profile } = useAuthStore()
  const [selectedStudent, setSelectedStudent] = useState('')
  const [noteType, setNoteType] = useState('trainer_encouragement')
  const [content, setContent] = useState('')
  const [saved, setSaved] = useState(false)

  const NOTE_TYPES = [
    { type: 'trainer_encouragement', label: t('trainer.students.note_type_encouragement'), icon: '👏' },
    { type: 'trainer_observation', label: t('trainer.students.note_type_observation'), icon: '👀' },
    { type: 'trainer_warning', label: t('trainer.students.note_type_warning'), icon: '⚠️' },
    { type: 'trainer_reminder', label: t('trainer.students.note_type_reminder'), icon: '💡' },
  ]

  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('id, profiles(full_name, display_name)')
        .eq('group_id', groupId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('enrollment_date')
      return data || []
    },
    enabled: !!groupId,
  })

  const getName = (s) => s.profiles?.full_name || s.profiles?.display_name || 'طالب'

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent || !content.trim()) throw new Error('اختر طالب واكتب ملاحظة')
      const { error } = await notifyUser({
        userId: selectedStudent,
        title: NOTE_TYPES.find(nt => nt.type === noteType)?.label || 'ملاحظة',
        body: content.trim(),
        type: noteType,
      })
      if (error) throw error
    },
    onSuccess: () => {
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        setContent('')
        setSelectedStudent('')
      }, 2000)
    },
  })

  const templates = TEMPLATES[noteType] || []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-[72px] left-4 right-4 sm:left-auto sm:right-4 sm:w-[340px] z-[65] rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', backdropFilter: 'blur(20px)', maxHeight: '70vh' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <span>📝</span> {t('trainer.quicknote.title', 'ملاحظة سريعة')}
        </h3>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
          <X size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>

      <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 56px)' }}>
        {/* Student selector */}
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-[13px] font-medium"
          style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        >
          <option value="">{t('trainer.quicknote.select_student', 'اختر طالب...')}</option>
          {students?.map(s => (
            <option key={s.id} value={s.id}>{getName(s)}</option>
          ))}
        </select>

        {/* Note type pills */}
        <div className="flex flex-wrap gap-2">
          {NOTE_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => setNoteType(t.type)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: noteType === t.type ? 'var(--accent-sky-glow)' : 'var(--surface-overlay)',
                color: noteType === t.type ? 'var(--accent-sky)' : 'var(--text-secondary)',
                border: `1px solid ${noteType === t.type ? 'rgba(56,189,248,0.3)' : 'var(--border-subtle)'}`,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('trainer.quicknote.write_note', 'اكتب ملاحظتك...')}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl text-[13px] resize-none"
          style={{ background: 'var(--surface-overlay)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />

        {/* Quick templates */}
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {templates.map((t, i) => (
              <button
                key={i}
                onClick={() => setContent(t)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors hover:brightness-125"
                style={{ background: 'var(--surface-overlay)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* Save button */}
        {saved ? (
          <div className="flex items-center justify-center gap-1.5 py-2 text-emerald-400 text-[12px] font-bold">
            <CheckCircle2 size={14} /> {t('common.saved')}
          </div>
        ) : (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !selectedStudent || !content.trim()}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-colors disabled:opacity-40"
            style={{ background: 'var(--accent-sky-glow)', color: 'var(--accent-sky)', border: '1px solid rgba(56,189,248,0.2)' }}
          >
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {t('common.save')}
          </button>
        )}
      </div>
    </motion.div>
  )
}
