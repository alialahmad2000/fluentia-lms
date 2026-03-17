import { useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Save, Loader2, Eye, EyeOff } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import ReadingEditor from './components/ReadingEditor'
import GrammarEditor from './components/GrammarEditor'
import WritingEditor from './components/WritingEditor'
import ListeningEditor from './components/ListeningEditor'
import SpeakingEditor from './components/SpeakingEditor'
import IrregularVerbsEditor from './components/IrregularVerbsEditor'
import VideoEditor from './components/VideoEditor'
import AssessmentEditor from './components/AssessmentEditor'
import JSONArrayEditor from './components/JSONArrayEditor'
import ImagePreview from './components/ImagePreview'

const TABS = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'readingA', label: 'القراءة أ' },
  { key: 'readingB', label: 'القراءة ب' },
  { key: 'grammar', label: 'القواعد' },
  { key: 'writing', label: 'الكتابة' },
  { key: 'listening', label: 'الاستماع' },
  { key: 'speaking', label: 'المحادثة' },
  { key: 'verbs', label: 'الأفعال الشاذة' },
  { key: 'video', label: 'الفيديو' },
  { key: 'assessment', label: 'التقييم' },
]

function EditorSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-32 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-16 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
      <div className="h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
      <div className="h-96 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)' }} />
    </div>
  )
}

export default function UnitEditor() {
  const { unitId } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [savingOverview, setSavingOverview] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const tabsRef = useRef(null)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  // Fetch unit + all related data
  const { data: unit, isLoading: loadingUnit } = useQuery({
    queryKey: ['unit-editor', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_units')
        .select('*, curriculum_levels!inner(id, level_number, name_ar, color)')
        .eq('id', unitId)
        .single()
      if (error) throw error
      return data
    },
  })

  const { data: readings = [] } = useQuery({
    queryKey: ['unit-readings', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_readings').select('*').eq('unit_id', unitId).order('reading_label')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  const { data: comprehension = [] } = useQuery({
    queryKey: ['unit-comprehension', unitId],
    queryFn: async () => {
      const readingIds = readings.map(r => r.id)
      if (readingIds.length === 0) return []
      const { data, error } = await supabase.from('curriculum_comprehension_questions').select('*').in('reading_id', readingIds).order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: readings.length > 0,
  })

  const { data: vocabulary = [] } = useQuery({
    queryKey: ['unit-vocabulary', unitId],
    queryFn: async () => {
      const readingIds = readings.map(r => r.id)
      if (readingIds.length === 0) return []
      const { data, error } = await supabase.from('curriculum_vocabulary').select('*').in('reading_id', readingIds).order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: readings.length > 0,
  })

  const { data: vocabExercises = [] } = useQuery({
    queryKey: ['unit-vocab-exercises', unitId],
    queryFn: async () => {
      const readingIds = readings.map(r => r.id)
      if (readingIds.length === 0) return []
      const { data, error } = await supabase.from('curriculum_vocabulary_exercises').select('*').in('reading_id', readingIds).order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: readings.length > 0,
  })

  const { data: grammar } = useQuery({
    queryKey: ['unit-grammar', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_grammar').select('*').eq('unit_id', unitId).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!unitId,
  })

  const { data: grammarExercises = [] } = useQuery({
    queryKey: ['unit-grammar-exercises', unitId],
    queryFn: async () => {
      if (!grammar?.id) return []
      const { data, error } = await supabase.from('curriculum_grammar_exercises').select('*').eq('grammar_id', grammar.id).order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!grammar?.id,
  })

  const { data: writing } = useQuery({
    queryKey: ['unit-writing', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_writing').select('*').eq('unit_id', unitId).order('task_number').limit(1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!unitId,
  })

  const { data: listening } = useQuery({
    queryKey: ['unit-listening', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_listening').select('*').eq('unit_id', unitId).order('listening_number').limit(1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!unitId,
  })

  const { data: speaking } = useQuery({
    queryKey: ['unit-speaking', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_speaking').select('*').eq('unit_id', unitId).order('topic_number').limit(1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!unitId,
  })

  const { data: verbs = [] } = useQuery({
    queryKey: ['unit-verbs', unit?.level_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_irregular_verbs').select('*').eq('level_id', unit.level_id).order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unit?.level_id,
  })

  const { data: verbExercises = [] } = useQuery({
    queryKey: ['unit-verb-exercises', unit?.level_id],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_irregular_verb_exercises').select('*').eq('level_id', unit.level_id).order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unit?.level_id,
  })

  const { data: video } = useQuery({
    queryKey: ['unit-video', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_video_sections').select('*').eq('unit_id', unitId).limit(1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!unitId,
  })

  const { data: assessment } = useQuery({
    queryKey: ['unit-assessment', unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from('curriculum_assessments').select('*').eq('unit_id', unitId).limit(1).single()
      if (error && error.code !== 'PGRST116') throw error
      return data || null
    },
    enabled: !!unitId,
  })

  // Overview form state
  const [overviewForm, setOverviewForm] = useState(null)
  const form = overviewForm || unit || {}

  const updateForm = (field, val) => {
    setOverviewForm(prev => ({ ...(prev || unit || {}), [field]: val }))
  }

  const saveOverview = async () => {
    setSavingOverview(true)
    try {
      const { error } = await supabase.from('curriculum_units').update({
        theme_ar: form.theme_ar, theme_en: form.theme_en,
        description_ar: form.description_ar || '', description_en: form.description_en || '',
        warmup_questions: form.warmup_questions || [],
        estimated_minutes: form.estimated_minutes || 90,
        cover_image_url: form.cover_image_url || null,
      }).eq('id', unitId)
      if (error) throw error
      refreshAll()
    } catch (err) {
      console.error('Save overview error:', err)
    } finally {
      setSavingOverview(false)
    }
  }

  const togglePublish = async () => {
    setPublishing(true)
    try {
      const { error } = await supabase.from('curriculum_units').update({ is_published: !unit.is_published }).eq('id', unitId)
      if (error) throw error
      refreshAll()
    } catch (err) {
      console.error('Publish error:', err)
    } finally {
      setPublishing(false)
    }
  }

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['unit-editor', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-readings', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-comprehension', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-vocabulary', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-vocab-exercises', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-grammar', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-grammar-exercises', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-writing', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-listening', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-speaking', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-video', unitId] })
    queryClient.invalidateQueries({ queryKey: ['unit-assessment', unitId] })
  }

  // Content counts for tab badges
  const getTabCount = (key) => {
    switch (key) {
      case 'readingA': return readings.filter(r => r.reading_label === 'A').length
      case 'readingB': return readings.filter(r => r.reading_label === 'B').length
      case 'grammar': return grammar ? 1 : 0
      case 'writing': return writing ? 1 : 0
      case 'listening': return listening ? 1 : 0
      case 'speaking': return speaking ? 1 : 0
      case 'verbs': return verbs.length
      case 'video': return video ? 1 : 0
      case 'assessment': return assessment ? 1 : 0
      default: return 0
    }
  }

  if (loadingUnit) return <EditorSkeleton />
  if (!unit) return (
    <div className="text-center py-16">
      <p className="text-lg" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الوحدة غير موجودة</p>
    </div>
  )

  const readingA = readings.find(r => r.reading_label === 'A') || null
  const readingB = readings.find(r => r.reading_label === 'B') || null
  const compA = readingA ? comprehension.filter(q => q.reading_id === readingA.id) : []
  const compB = readingB ? comprehension.filter(q => q.reading_id === readingB.id) : []
  const vocabA = readingA ? vocabulary.filter(v => v.reading_id === readingA.id) : []
  const vocabB = readingB ? vocabulary.filter(v => v.reading_id === readingB.id) : []
  const vocabExA = readingA ? vocabExercises.filter(e => e.reading_id === readingA.id) : []
  const vocabExB = readingB ? vocabExercises.filter(e => e.reading_id === readingB.id) : []

  const levelColor = unit.curriculum_levels?.color || '#38bdf8'

  return (
    <div className="space-y-6">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(`/admin/curriculum/level/${unit.level_id}`)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{
          color: 'var(--text-secondary)', fontFamily: 'Tajawal',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          transition: 'all 0.15s ease-out',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      >
        <ArrowRight size={16} strokeWidth={1.5} />
        <span className="text-sm">العودة للمستوى</span>
      </motion.button>

      {/* Unit header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: levelColor }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white" style={{ background: levelColor }}>
              {unit.unit_number}
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>
                الوحدة {unit.unit_number}: {unit.theme_ar}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${levelColor}22`, color: levelColor }}>
                  {unit.curriculum_levels?.name_ar}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={togglePublish}
            disabled={publishing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{
              background: unit.is_published ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)',
              color: unit.is_published ? '#4ade80' : 'var(--text-muted)',
              fontFamily: 'Tajawal',
            }}
          >
            {unit.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
            {unit.is_published ? 'منشور' : 'مسودة'}
          </button>
        </div>
      </motion.div>

      {/* Tab navigation */}
      <div
        ref={tabsRef}
        className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {TABS.map(tab => {
          const count = getTabCount(tab.key)
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0"
              style={{
                background: isActive ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                color: isActive ? '#38bdf8' : 'var(--text-secondary)',
                border: isActive ? '1px solid rgba(56,189,248,0.3)' : '1px solid rgba(255,255,255,0.06)',
                fontFamily: 'Tajawal',
                transition: 'all 0.15s ease-out',
              }}
            >
              {tab.label}
              {count > 0 && tab.key !== 'overview' && (
                <span
                  className="text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold"
                  style={{ background: isActive ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.08)', color: isActive ? '#38bdf8' : 'var(--text-muted)' }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input value={form.theme_ar || ''} onChange={e => updateForm('theme_ar', e.target.value)} placeholder="الموضوع (عربي)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
              <input value={form.theme_en || ''} onChange={e => updateForm('theme_en', e.target.value)} placeholder="Theme (English)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <textarea value={form.description_ar || ''} onChange={e => updateForm('description_ar', e.target.value)} placeholder="الوصف (عربي)" rows={3} className="px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} />
              <textarea value={form.description_en || ''} onChange={e => updateForm('description_en', e.target.value)} placeholder="Description (English)" rows={3} className="px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الوقت المقدر (دقائق)</label>
              <input type="number" value={form.estimated_minutes || 90} onChange={e => updateForm('estimated_minutes', Number(e.target.value))} className="w-full max-w-[200px] px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <ImagePreview label="صورة الغلاف" value={form.cover_image_url} onChange={v => updateForm('cover_image_url', v)} />
            <JSONArrayEditor label="أسئلة الإحماء" value={form.warmup_questions || []} onChange={v => updateForm('warmup_questions', v)} placeholder="سؤال..." />

            <button onClick={saveOverview} disabled={savingOverview} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: savingOverview ? 'rgba(56,189,248,0.1)' : 'rgba(56,189,248,0.2)', color: '#38bdf8', fontFamily: 'Tajawal', border: '1px solid rgba(56,189,248,0.3)' }}>
              {savingOverview ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {savingOverview ? 'جارٍ الحفظ...' : 'حفظ المسودة'}
            </button>
          </div>
        )}

        {activeTab === 'readingA' && (
          <ReadingEditor
            unitId={unitId} label="A"
            reading={readingA}
            comprehension={compA}
            vocabulary={vocabA}
            vocabExercises={vocabExA}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'readingB' && (
          <ReadingEditor
            unitId={unitId} label="B"
            reading={readingB}
            comprehension={compB}
            vocabulary={vocabB}
            vocabExercises={vocabExB}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'grammar' && (
          <GrammarEditor
            unitId={unitId} levelId={unit.level_id}
            grammar={grammar}
            grammarExercises={grammarExercises}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'writing' && (
          <WritingEditor unitId={unitId} writing={writing} onRefresh={refreshAll} />
        )}

        {activeTab === 'listening' && (
          <ListeningEditor unitId={unitId} listening={listening} onRefresh={refreshAll} />
        )}

        {activeTab === 'speaking' && (
          <SpeakingEditor unitId={unitId} speaking={speaking} onRefresh={refreshAll} />
        )}

        {activeTab === 'verbs' && (
          <IrregularVerbsEditor
            levelId={unit.level_id}
            verbs={verbs}
            verbExercises={verbExercises}
            onRefresh={refreshAll}
          />
        )}

        {activeTab === 'video' && (
          <VideoEditor unitId={unitId} video={video} onRefresh={refreshAll} />
        )}

        {activeTab === 'assessment' && (
          <AssessmentEditor unitId={unitId} levelId={unit.level_id} assessment={assessment} onRefresh={refreshAll} />
        )}
      </motion.div>
    </div>
  )
}
