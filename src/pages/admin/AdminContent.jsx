import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderOpen, Upload, FileText, Video, Link2, Mic, Plus, Edit3,
  Trash2, Target, BookOpen, Loader2, X, GripVertical, Search
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Constants ────────────────────────────────────────────────
const LEVELS = [1, 2, 3, 4, 5]
const SKILLS = ['grammar', 'vocabulary', 'reading', 'writing', 'speaking', 'listening']
const SKILL_LABELS = {
  grammar: 'القواعد',
  vocabulary: 'المفردات',
  reading: 'القراءة',
  writing: 'الكتابة',
  speaking: 'المحادثة',
  listening: 'الاستماع',
}
const TYPE_ICONS = { pdf: FileText, video: Video, link: Link2 }
const TYPE_LABELS = { pdf: 'PDF', video: 'فيديو', link: 'رابط' }
const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  hard: 'bg-red-500/20 text-red-400',
}
const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' }

const TABS = [
  { key: 'materials', label: 'مواد تعليمية', icon: BookOpen },
  { key: 'topics', label: 'بنك المواضيع', icon: Mic },
  { key: 'questions', label: 'بنك الأسئلة', icon: Target },
]

// ─── Fade-in animation variants ───────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
}

// ═══════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════
export default function AdminContent() {
  const [activeTab, setActiveTab] = useState('materials')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-sky-500/10">
          <FolderOpen className="text-primary" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المحتوى</h1>
          <p className="text-muted text-sm mt-1">إدارة المواد التعليمية والمواضيع وبنك الأسئلة</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-white/10 text-white border-b-2 border-primary'
                  : 'text-muted hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'materials' && (
          <motion.div key="materials" {...fadeIn}>
            <MaterialsTab />
          </motion.div>
        )}
        {activeTab === 'topics' && (
          <motion.div key="topics" {...fadeIn}>
            <TopicsTab />
          </motion.div>
        )}
        {activeTab === 'questions' && (
          <motion.div key="questions" {...fadeIn}>
            <QuestionsPlaceholder />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 1: Teaching Materials
// ═══════════════════════════════════════════════════════════════
function MaterialsTab() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [filterLevel, setFilterLevel] = useState('')
  const [filterSkill, setFilterSkill] = useState('')
  const [deleteId, setDeleteId] = useState(null)

  // Fetch materials from content_library
  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['admin-materials', filterLevel, filterSkill],
    queryFn: async () => {
      let query = supabase
        .from('content_library')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterLevel) query = query.eq('level', parseInt(filterLevel))
      if (filterSkill) query = query.eq('skill', filterSkill)

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })

  // Add material
  const addMutation = useMutation({
    mutationFn: async (formData) => {
      let fileUrl = formData.url || ''

      // Upload file if type is pdf and file exists
      if (formData.type === 'pdf' && formData.file) {
        const ext = formData.file.name.split('.').pop()
        const path = `materials/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(path, formData.file)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('materials').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }

      const { error } = await supabase.from('content_library').insert({
        title: formData.title,
        type: formData.type,
        level: parseInt(formData.level),
        skill: formData.skill,
        file_url: fileUrl || null,
        external_url: formData.url || null,
        content: formData.description || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] })
      setShowModal(false)
    },
    onError: (err) => {
      console.error('Add material error:', err)
    },
  })

  // Delete material
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('content_library').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-materials'] })
      setDeleteId(null)
    },
    onError: (err) => {
      console.error('Delete material error:', err)
    },
  })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowModal(true)} className="btn-primary text-sm py-2 flex items-center gap-2">
          <Plus size={16} />
          إضافة مادة
        </button>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="input-field py-2 px-3 text-sm w-36"
        >
          <option value="">كل المستويات</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>المستوى {l}</option>
          ))}
        </select>
        <select
          value={filterSkill}
          onChange={(e) => setFilterSkill(e.target.value)}
          className="input-field py-2 px-3 text-sm w-36"
        >
          <option value="">كل المهارات</option>
          {SKILLS.map((s) => (
            <option key={s} value={s}>{SKILL_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Materials Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted" size={24} />
        </div>
      ) : materials.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <FolderOpen className="mx-auto text-muted mb-3" size={40} />
          <p className="text-muted">لا توجد مواد تعليمية بعد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((mat) => {
            const TypeIcon = TYPE_ICONS[mat.type] || FileText
            return (
              <motion.div
                key={mat.id}
                layout
                className="glass-card p-4 space-y-3 hover:translate-y-[-2px] transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <TypeIcon size={18} className="text-primary" />
                    <h3 className="text-white font-medium text-sm line-clamp-1">{mat.title}</h3>
                  </div>
                  <button
                    onClick={() => setDeleteId(mat.id)}
                    className="text-muted hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="badge text-xs">
                    {TYPE_LABELS[mat.type] || mat.type}
                  </span>
                  <span className="badge text-xs">
                    المستوى {mat.level}
                  </span>
                  {mat.skill && (
                    <span className="badge text-xs">
                      {SKILL_LABELS[mat.skill] || mat.skill}
                    </span>
                  )}
                </div>
                <p className="text-muted text-xs">
                  {new Date(mat.created_at).toLocaleDateString('ar-SA')}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Material Modal */}
      <AnimatePresence>
        {showModal && (
          <MaterialModal
            onClose={() => setShowModal(false)}
            onSubmit={(data) => addMutation.mutate(data)}
            isPending={addMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            message="هل أنت متأكد من حذف هذه المادة؟"
            onConfirm={() => deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Add Material Modal ───────────────────────────────────────
function MaterialModal({ onClose, onSubmit, isPending }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('pdf')
  const [level, setLevel] = useState('1')
  const [skill, setSkill] = useState('grammar')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({ title, type, level, skill, url, file })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">إضافة مادة تعليمية</h2>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label block mb-1">العنوان</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label block mb-1">النوع</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="input-field w-full"
              >
                <option value="pdf">PDF</option>
                <option value="video">فيديو</option>
                <option value="link">رابط</option>
              </select>
            </div>
            <div>
              <label className="input-label block mb-1">المستوى</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-field w-full"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>المستوى {l}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label block mb-1">المهارة</label>
            <select
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
              className="input-field w-full"
            >
              {SKILLS.map((s) => (
                <option key={s} value={s}>{SKILL_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {type === 'pdf' ? (
            <div>
              <label className="input-label block mb-1">رفع ملف PDF</label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="input-field w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary/20 file:text-primary file:text-sm"
              />
            </div>
          ) : (
            <div>
              <label className="input-label block mb-1">
                {type === 'video' ? 'رابط الفيديو' : 'الرابط'}
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-field w-full"
                dir="ltr"
                placeholder="https://..."
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || !title}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            رفع المادة
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 2: Speaking Topic Banks
// ═══════════════════════════════════════════════════════════════
function TopicsTab() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTopic, setEditTopic] = useState(null)
  const [deleteId, setDeleteId] = useState(null)

  // Fetch topics
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['admin-speaking-topics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('speaking_topic_banks')
        .select('*')
        .order('level', { ascending: true })
        .order('topic_number', { ascending: true })
      if (error) throw error
      return data || []
    },
  })

  // Group by level
  const grouped = LEVELS.reduce((acc, level) => {
    acc[level] = topics.filter((t) => t.level === level)
    return acc
  }, {})

  // Add/Update topic
  const saveMutation = useMutation({
    mutationFn: async (formData) => {
      if (formData.id) {
        const { error } = await supabase
          .from('speaking_topic_banks')
          .update({
            title_en: formData.title_en,
            title_ar: formData.title_ar,
            category: formData.category,
            difficulty: formData.difficulty,
            topic_number: parseInt(formData.topic_number),
            level: parseInt(formData.level),
          })
          .eq('id', formData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('speaking_topic_banks').insert({
          title_en: formData.title_en,
          title_ar: formData.title_ar,
          category: formData.category,
          difficulty: formData.difficulty,
          topic_number: parseInt(formData.topic_number),
          level: parseInt(formData.level),
        })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-speaking-topics'] })
      setShowModal(false)
      setEditTopic(null)
    },
    onError: (err) => {
      console.error('Save topic error:', err)
    },
  })

  // Delete topic
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('speaking_topic_banks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-speaking-topics'] })
      setDeleteId(null)
    },
    onError: (err) => {
      console.error('Delete topic error:', err)
    },
  })

  // Reorder topic within level
  const reorderMutation = useMutation({
    mutationFn: async ({ id, newNumber }) => {
      const { error } = await supabase
        .from('speaking_topic_banks')
        .update({ topic_number: newNumber })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-speaking-topics'] })
    },
    onError: (err) => {
      console.error('Reorder topic error:', err)
    },
  })

  function handleEdit(topic) {
    setEditTopic(topic)
    setShowModal(true)
  }

  function handleMoveUp(topic, levelTopics) {
    const idx = levelTopics.findIndex((t) => t.id === topic.id)
    if (idx <= 0) return
    const prev = levelTopics[idx - 1]
    reorderMutation.mutate({ id: topic.id, newNumber: prev.topic_number })
    reorderMutation.mutate({ id: prev.id, newNumber: topic.topic_number })
  }

  function handleMoveDown(topic, levelTopics) {
    const idx = levelTopics.findIndex((t) => t.id === topic.id)
    if (idx >= levelTopics.length - 1) return
    const next = levelTopics[idx + 1]
    reorderMutation.mutate({ id: topic.id, newNumber: next.topic_number })
    reorderMutation.mutate({ id: next.id, newNumber: topic.topic_number })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setEditTopic(null); setShowModal(true) }}
        className="btn-primary text-sm py-2 flex items-center gap-2"
      >
        <Plus size={16} />
        إضافة موضوع
      </button>

      {/* Grouped by Level */}
      {LEVELS.map((level) => {
        const levelTopics = grouped[level]
        if (!levelTopics || levelTopics.length === 0) return null
        return (
          <div key={level} className="glass-card p-4 space-y-3">
            <h3 className="text-white font-bold flex items-center gap-2">
              <BookOpen size={16} className="text-primary" />
              المستوى {level}
              <span className="text-muted text-xs font-normal">({levelTopics.length} موضوع)</span>
            </h3>
            <div className="space-y-2">
              {levelTopics.map((topic) => (
                <motion.div
                  key={topic.id}
                  layout
                  className="flex items-center gap-3 bg-white/5 rounded-lg p-3"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleMoveUp(topic, levelTopics)}
                      className="text-muted hover:text-white text-xs leading-none"
                      title="تحريك لأعلى"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDown(topic, levelTopics)}
                      className="text-muted hover:text-white text-xs leading-none"
                      title="تحريك لأسفل"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="text-muted text-sm w-8 text-center">{topic.topic_number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">{topic.title_ar || topic.title_en}</p>
                    {topic.title_en && topic.title_ar && (
                      <p className="text-muted text-xs" dir="ltr">{topic.title_en}</p>
                    )}
                  </div>
                  {topic.category && (
                    <span className="badge text-xs">{topic.category}</span>
                  )}
                  {topic.difficulty && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[topic.difficulty] || 'badge'}`}>
                      {DIFFICULTY_LABELS[topic.difficulty] || topic.difficulty}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(topic)}
                      className="text-muted hover:text-primary transition-colors p-1"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteId(topic.id)}
                      className="text-muted hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      })}

      {topics.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Mic className="mx-auto text-muted mb-3" size={40} />
          <p className="text-muted">لا توجد مواضيع محادثة بعد</p>
        </div>
      )}

      {/* Add/Edit Topic Modal */}
      <AnimatePresence>
        {showModal && (
          <TopicModal
            topic={editTopic}
            onClose={() => { setShowModal(false); setEditTopic(null) }}
            onSubmit={(data) => saveMutation.mutate(data)}
            isPending={saveMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteId && (
          <ConfirmModal
            message="هل أنت متأكد من حذف هذا الموضوع؟"
            onConfirm={() => deleteMutation.mutate(deleteId)}
            onCancel={() => setDeleteId(null)}
            isPending={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Topic Modal ──────────────────────────────────────────────
function TopicModal({ topic, onClose, onSubmit, isPending }) {
  const [titleEn, setTitleEn] = useState(topic?.title_en || '')
  const [titleAr, setTitleAr] = useState(topic?.title_ar || '')
  const [category, setCategory] = useState(topic?.category || '')
  const [difficulty, setDifficulty] = useState(topic?.difficulty || 'medium')
  const [topicNumber, setTopicNumber] = useState(topic?.topic_number || 1)
  const [level, setLevel] = useState(topic?.level || 1)

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      id: topic?.id,
      title_en: titleEn,
      title_ar: titleAr,
      category,
      difficulty,
      topic_number: topicNumber,
      level,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-md space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {topic ? 'تعديل الموضوع' : 'إضافة موضوع جديد'}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label block mb-1">العنوان بالعربية</label>
            <input
              type="text"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              className="input-field w-full"
              required
            />
          </div>
          <div>
            <label className="input-label block mb-1">العنوان بالإنجليزية</label>
            <input
              type="text"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              className="input-field w-full"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label block mb-1">المستوى</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="input-field w-full"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>المستوى {l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="input-label block mb-1">رقم الموضوع</label>
              <input
                type="number"
                value={topicNumber}
                onChange={(e) => setTopicNumber(e.target.value)}
                className="input-field w-full"
                dir="ltr"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label block mb-1">الفئة</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field w-full"
                placeholder="مثلاً: الحياة اليومية"
              />
            </div>
            <div>
              <label className="input-label block mb-1">الصعوبة</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="input-field w-full"
              >
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !titleAr}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>{topic ? <Edit3 size={16} /> : <Plus size={16} />}</>
            )}
            {topic ? 'حفظ التعديلات' : 'إضافة الموضوع'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Tab 3: Question Bank Placeholder
// ═══════════════════════════════════════════════════════════════
function QuestionsPlaceholder() {
  return (
    <div className="glass-card p-16 text-center space-y-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Target className="mx-auto text-primary mb-4" size={56} />
      </motion.div>
      <h2 className="text-xl font-bold text-white">قريبًا</h2>
      <p className="text-muted text-sm max-w-sm mx-auto">
        سيتم تفعيل بنك الأسئلة في المرحلة ٨
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Shared: Confirm Modal
// ═══════════════════════════════════════════════════════════════
function ConfirmModal({ message, onConfirm, onCancel, isPending }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-card p-6 w-full max-w-sm space-y-4 text-center"
      >
        <Trash2 className="mx-auto text-red-400" size={32} />
        <p className="text-white">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="btn-ghost px-4 py-2 text-sm rounded-lg transition-all duration-200"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center gap-2"
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            حذف
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
