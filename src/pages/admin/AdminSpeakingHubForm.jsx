import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Loader2, Plus, Trash2, CheckCircle2 } from 'lucide-react'
import { toast } from '@/components/ui/FluentiaToast'

function getInitialState(hub) {
  return {
    title:                       hub?.title                       ?? '',
    title_en:                    hub?.title_en                    ?? '',
    description:                 hub?.description                 ?? '',
    description_en:              hub?.description_en              ?? '',
    video_url:                   hub?.video_url                   ?? '',
    video_title:                 hub?.video_title                 ?? '',
    video_channel:               hub?.video_channel               ?? '',
    video_duration_minutes:      hub?.video_duration_minutes      ?? '',
    note_prompts:                hub?.note_prompts                ?? [''],
    vocab_focus:                 hub?.vocab_focus                 ?? [{ word: '', meaning_ar: '' }],
    discussion_questions:        hub?.discussion_questions        ?? [''],
    hub_session_at:              hub?.hub_session_at
      ? new Date(hub.hub_session_at).toISOString().slice(0, 16)
      : '',
    hub_session_link:            hub?.hub_session_link            ?? '',
    hub_session_duration_minutes: hub?.hub_session_duration_minutes ?? 60,
    status:                      hub?.status                      ?? 'draft',
  }
}

function isValidVideoUrl(url) {
  if (!url) return false
  return (
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('drive.google.com')
  )
}

// ── Reusable string-list editor (note_prompts, discussion_questions) ──────────
function StringListField({ label, values, onChange }) {
  const { t } = useTranslation()

  function update(i, val) {
    const next = [...values]
    next[i] = val
    onChange(next)
  }

  function addRow() {
    onChange([...values, ''])
  }

  function removeRow(i) {
    onChange(values.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-[var(--text-muted)] font-['Tajawal'] block">{label}</label>
      {values.map((val, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="input-field text-sm flex-1 font-['Tajawal']"
            value={val}
            onChange={e => update(i, e.target.value)}
            placeholder={`${label} ${i + 1}`}
          />
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="btn-icon shrink-0"
              title={t('common.remove', 'حذف')}
            >
              <Trash2 size={13} className="text-red-400" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-['Tajawal'] transition-colors"
      >
        <Plus size={12} />
        {t('common.addRow', 'إضافة سطر')}
      </button>
    </div>
  )
}

// ── Vocab focus field ─────────────────────────────────────────────────────────
function VocabFocusField({ values, onChange }) {
  const { t } = useTranslation()

  function update(i, key, val) {
    const next = [...values]
    next[i] = { ...next[i], [key]: val }
    onChange(next)
  }

  function addRow() {
    onChange([...values, { word: '', meaning_ar: '' }])
  }

  function removeRow(i) {
    onChange(values.filter((_, idx) => idx !== i))
  }

  return (
    <div className="space-y-2">
      <label className="text-xs text-[var(--text-muted)] font-['Tajawal'] block">
        {t('admin.speakingHub.form.vocabFocus', 'مفردات للتركيز')}
      </label>
      {values.map((row, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            className="input-field text-sm flex-1 font-['Inter']"
            value={row.word}
            onChange={e => update(i, 'word', e.target.value)}
            placeholder={t('admin.speakingHub.form.word', 'الكلمة')}
            dir="ltr"
          />
          <input
            className="input-field text-sm flex-1 font-['Tajawal']"
            value={row.meaning_ar}
            onChange={e => update(i, 'meaning_ar', e.target.value)}
            placeholder={t('admin.speakingHub.form.meaning', 'المعنى بالعربي')}
          />
          {values.length > 1 && (
            <button
              type="button"
              onClick={() => removeRow(i)}
              className="btn-icon shrink-0"
            >
              <Trash2 size={13} className="text-red-400" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-['Tajawal'] transition-colors"
      >
        <Plus size={12} />
        {t('common.addRow', 'إضافة كلمة')}
      </button>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div className="fl-card-static p-5 space-y-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal'] border-b border-[var(--border-subtle)] pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Main form component ───────────────────────────────────────────────────────
export default function AdminSpeakingHubForm({ hub = null, mode = 'create', onSave }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [form, setForm] = useState(() => getInitialState(hub))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }))
  }

  function validate() {
    const e = {}
    if (!form.title.trim()) e.title = t('admin.speakingHub.form.titleRequired', 'العنوان مطلوب')
    if (!form.video_url.trim()) {
      e.video_url = t('admin.speakingHub.form.videoUrlRequired', 'رابط الفيديو مطلوب')
    } else if (!isValidVideoUrl(form.video_url.trim())) {
      e.video_url = t('admin.speakingHub.form.videoUrlInvalid', 'يجب أن يكون رابط YouTube أو Google Drive')
    }
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    try {
      // Clean up arrays — remove empty entries
      const payload = {
        ...form,
        title: form.title.trim(),
        title_en: form.title_en.trim() || null,
        description: form.description.trim() || null,
        description_en: form.description_en.trim() || null,
        video_url: form.video_url.trim(),
        video_title: form.video_title.trim() || null,
        video_channel: form.video_channel.trim() || null,
        video_duration_minutes: form.video_duration_minutes ? Number(form.video_duration_minutes) : null,
        note_prompts: form.note_prompts.filter(s => s.trim()),
        vocab_focus: form.vocab_focus.filter(v => v.word.trim()),
        discussion_questions: form.discussion_questions.filter(s => s.trim()),
        hub_session_at: form.hub_session_at || null,
        hub_session_link: form.hub_session_link.trim() || null,
        hub_session_duration_minutes: Number(form.hub_session_duration_minutes) || 60,
      }

      // onSave handles both create and edit — parent decides what to do
      await onSave(payload)
    } catch (err) {
      console.error('[AdminSpeakingHubForm] save error:', err)
      toast({ type: 'error', title: err.message || t('common.error', 'حدث خطأ') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-24">

      {/* ── Basic info ── */}
      <Section title={t('admin.speakingHub.form.sectionBasic', 'المعلومات الأساسية')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.title', 'العنوان (عربي)')} *
            </label>
            <input
              className={`input-field text-sm w-full font-['Tajawal'] ${errors.title ? 'border-red-500/50' : ''}`}
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder={t('admin.speakingHub.form.titlePlaceholder', 'مثال: جلسة المحادثة — الوحدة 5')}
            />
            {errors.title && <p className="text-red-400 text-xs mt-1 font-['Tajawal']">{errors.title}</p>}
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.titleEn', 'العنوان (إنجليزي)')}
            </label>
            <input
              className="input-field text-sm w-full font-['Inter']"
              value={form.title_en}
              onChange={e => set('title_en', e.target.value)}
              placeholder="Speaking Hub — Unit 5"
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.description', 'الوصف (عربي)')}
            </label>
            <textarea
              className="input-field text-sm w-full font-['Tajawal']"
              rows={3}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder={t('admin.speakingHub.form.descriptionPlaceholder', 'وصف مختصر للجلسة...')}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.descriptionEn', 'الوصف (إنجليزي)')}
            </label>
            <textarea
              className="input-field text-sm w-full font-['Inter']"
              rows={3}
              value={form.description_en}
              onChange={e => set('description_en', e.target.value)}
              placeholder="Brief session description..."
              dir="ltr"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
            {t('admin.speakingHub.form.status', 'الحالة')}
          </label>
          <div className="flex gap-2 flex-wrap">
            {['draft', 'published', 'archived'].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => set('status', s)}
                className={`px-4 h-9 rounded-xl text-xs font-bold font-['Tajawal'] transition-all border ${
                  form.status === s
                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                    : 'text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                {s === 'draft' ? 'مسودة' : s === 'published' ? 'منشور' : 'مؤرشف'}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Video info ── */}
      <Section title={t('admin.speakingHub.form.sectionVideo', 'بيانات الفيديو')}>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
            {t('admin.speakingHub.form.videoUrl', 'رابط الفيديو')} *
          </label>
          <input
            className={`input-field text-sm w-full font-['Inter'] ${errors.video_url ? 'border-red-500/50' : ''}`}
            value={form.video_url}
            onChange={e => set('video_url', e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            dir="ltr"
          />
          {errors.video_url && <p className="text-red-400 text-xs mt-1 font-['Tajawal']">{errors.video_url}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.videoTitle', 'عنوان الفيديو')}
            </label>
            <input
              className="input-field text-sm w-full font-['Tajawal']"
              value={form.video_title}
              onChange={e => set('video_title', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.videoChannel', 'القناة')}
            </label>
            <input
              className="input-field text-sm w-full font-['Inter']"
              value={form.video_channel}
              onChange={e => set('video_channel', e.target.value)}
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.videoDuration', 'مدة الفيديو (دقيقة)')}
            </label>
            <input
              type="number"
              min="1"
              className="input-field text-sm w-full"
              value={form.video_duration_minutes}
              onChange={e => set('video_duration_minutes', e.target.value)}
              placeholder="30"
            />
          </div>
        </div>
      </Section>

      {/* ── Session info ── */}
      <Section title={t('admin.speakingHub.form.sectionSession', 'موعد الجلسة')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.sessionAt', 'تاريخ ووقت الجلسة')}
            </label>
            <input
              type="datetime-local"
              className="input-field text-sm w-full"
              value={form.hub_session_at}
              onChange={e => set('hub_session_at', e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
              {t('admin.speakingHub.form.sessionDuration', 'مدة الجلسة (دقيقة)')}
            </label>
            <input
              type="number"
              min="15"
              className="input-field text-sm w-full"
              value={form.hub_session_duration_minutes}
              onChange={e => set('hub_session_duration_minutes', e.target.value)}
              placeholder="60"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block font-['Tajawal']">
            {t('admin.speakingHub.form.sessionLink', 'رابط الجلسة (Zoom / Meet)')}
          </label>
          <input
            className="input-field text-sm w-full font-['Inter']"
            value={form.hub_session_link}
            onChange={e => set('hub_session_link', e.target.value)}
            placeholder="https://zoom.us/j/..."
            dir="ltr"
          />
        </div>
      </Section>

      {/* ── Note prompts ── */}
      <Section title={t('admin.speakingHub.form.sectionNotePrompts', 'أسئلة الملاحظات')}>
        <StringListField
          label={t('admin.speakingHub.form.notePrompt', 'سؤال')}
          values={form.note_prompts}
          onChange={v => set('note_prompts', v)}
        />
      </Section>

      {/* ── Vocab focus ── */}
      <Section title={t('admin.speakingHub.form.sectionVocab', 'مفردات للتركيز')}>
        <VocabFocusField
          values={form.vocab_focus}
          onChange={v => set('vocab_focus', v)}
        />
      </Section>

      {/* ── Discussion questions ── */}
      <Section title={t('admin.speakingHub.form.sectionDiscussion', 'أسئلة النقاش')}>
        <StringListField
          label={t('admin.speakingHub.form.discussionQuestion', 'سؤال')}
          values={form.discussion_questions}
          onChange={v => set('discussion_questions', v)}
        />
      </Section>

      {/* ── Sticky footer ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[var(--surface-base)] border-t border-[var(--border-subtle)] px-6 py-3 flex items-center gap-3 justify-end sm:static sm:bg-transparent sm:border-0 sm:p-0 sm:z-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="btn-ghost text-sm font-['Tajawal']"
        >
          {t('common.cancel', 'إلغاء')}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="btn-primary text-sm px-6 flex items-center gap-2 font-['Tajawal']"
        >
          {saving
            ? <Loader2 size={14} className="animate-spin" />
            : <CheckCircle2 size={14} />}
          {mode === 'create'
            ? t('admin.speakingHub.form.create', 'إنشاء الجلسة')
            : t('admin.speakingHub.form.save', 'حفظ التغييرات')}
        </button>
      </div>
    </form>
  )
}
