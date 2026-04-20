import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Award, Users, Target, FileText, Plus, Save, Loader2, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { toast } from '../../../components/ui/FluentiaToast'
import { VariantPill } from '../../../components/ielts/VariantPill'
import AdminFilterBar from '../../../components/ielts/AdminFilterBar'
import PreviewModal from '../../../components/ielts/PreviewModal'
import IELTSReadingManager from './components/IELTSReadingManager'
import IELTSWritingManager from './components/IELTSWritingManager'
import IELTSListeningManager from './components/IELTSListeningManager'
import IELTSSpeakingManager from './components/IELTSSpeakingManager'
import IELTSMockTestManager from './components/IELTSMockTestManager'
import IELTSDashboard from './components/IELTSDashboard'
import IELTSMasterclassV2Preview from './components/IELTSMasterclassV2Preview'

const TABS = [
  { key: 'dashboard',     label: 'لوحة المحتوى' },
  { key: 'reading-skills', label: 'مهارات القراءة' },
  { key: 'passages',      label: 'نصوص القراءة' },
  { key: 'writing',       label: 'مهام الكتابة' },
  { key: 'listening',     label: 'الاستماع' },
  { key: 'speaking',      label: 'المحادثة' },
  { key: 'mocks',         label: 'اختبارات تجريبية' },
  { key: 'masterclass-v2', label: 'معاينة V2' },
]

const EMPTY_FILTERS = { search: '', variant: 'all', difficulty: 'all', published: 'all' }

function PassagesManager() {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [preview, setPreview] = useState(null)

  const { data: passages = [], isLoading, refetch } = useQuery({
    queryKey: ['ielts-reading-passages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_reading_passages').select('*').order('created_at')
      if (error) throw error
      return data || []
    },
  })

  // Bulk mutation
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, field, value }) => {
      console.log('Bulk update:', ids.size, 'rows, field:', field, 'value:', value)
      const { error } = await supabase
        .from('ielts_reading_passages')
        .update({ [field]: value })
        .in('id', Array.from(ids))
      if (error) throw error
      return ids.size
    },
    onSuccess: (count) => {
      toast.success(`تم تحديث ${count} عنصر`)
      setSelectedIds(new Set())
    },
    onError: (err) => toast.error(err.message || 'فشلت العملية'),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ielts-reading-passages'] }),
  })

  const addNew = async () => {
    setAdding(true)
    try {
      const { error } = await supabase.from('ielts_reading_passages').insert({
        title: '', content: '', topic_category: '', difficulty_band: 'band_5_6',
        questions: [], time_limit_minutes: 20, test_variant: 'academic',
      })
      if (error) throw error
      refetch()
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  // Client-side filter
  const filtered = passages.filter(p => {
    if (filters.search && !p.title?.toLowerCase().includes(filters.search.toLowerCase()) && !p.topic_category?.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.variant !== 'all' && p.test_variant !== filters.variant) return false
    if (filters.difficulty !== 'all' && p.difficulty_band !== filters.difficulty) return false
    if (filters.published !== 'all') {
      if (filters.published === 'published' && !p.is_published) return false
      if (filters.published === 'draft' && p.is_published) return false
    }
    return true
  })

  const allSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(p => n.delete(p.id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); filtered.forEach(p => n.add(p.id)); return n })
    }
  }

  if (isLoading) return <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>

  return (
    <div className="space-y-2" dir="rtl">
      <AdminFilterBar contentType="reading" filters={filters} onChange={setFilters} onReset={() => setFilters(EMPTY_FILTERS)} />

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl sticky top-0 z-10" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <span className="text-sm" style={{ color: '#38bdf8', fontFamily: 'Tajawal' }}>تم اختيار {selectedIds.size}</span>
          <select onChange={e => e.target.value && bulkMutation.mutate({ ids: selectedIds, field: 'test_variant', value: e.target.value })}
            defaultValue="" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'Tajawal' }}>
            <option value="">تغيير النوع</option>
            <option value="academic">أكاديمي</option>
            <option value="general_training">عام</option>
          </select>
          <select onChange={e => e.target.value !== '' && bulkMutation.mutate({ ids: selectedIds, field: 'is_published', value: e.target.value === 'true' })}
            defaultValue="" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', borderRadius: 8, padding: '4px 8px', fontSize: 12, fontFamily: 'Tajawal' }}>
            <option value="">النشر</option>
            <option value="true">نشر</option>
            <option value="false">إلغاء النشر</option>
          </select>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>✕ إلغاء</button>
        </div>
      )}

      {/* Column headers */}
      <div className="grid items-center px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal', gridTemplateColumns: '20px 28px 1fr 120px 80px 80px 60px 36px' }}>
        <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-3 h-3" />
        <span>#</span><span>العنوان</span><span>التصنيف</span><span>المستوى</span><span>النوع</span><span>أسئلة</span><span></span>
      </div>

      {filtered.map((p, i) => (
        <PassageRow
          key={p.id}
          passage={p}
          index={i + 1}
          expanded={expandedId === p.id}
          selected={selectedIds.has(p.id)}
          onSelect={checked => setSelectedIds(prev => { const n = new Set(prev); checked ? n.add(p.id) : n.delete(p.id); return n })}
          onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
          onRefresh={refetch}
          onPreview={() => setPreview(p)}
        />
      ))}

      {filtered.length === 0 && <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد نصوص</div>}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        <Plus size={14} /> إضافة نص
      </button>

      {preview && <PreviewModal contentType="passage" contentData={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

function PassageRow({ passage, index, expanded, selected, onSelect, onToggle, onRefresh, onPreview }) {
  const queryClient = useQueryClient()
  const [data, setData] = useState(passage)
  const [saving, setSaving] = useState(false)

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const update = (f, v) => setData(prev => ({ ...prev, [f]: v }))
  const qCount = Array.isArray(data.questions) ? data.questions.length : 0

  const quickVariant = async (newVariant) => {
    update('test_variant', newVariant)
    const { error } = await supabase.from('ielts_reading_passages').update({ test_variant: newVariant }).eq('id', passage.id)
    if (error) {
      update('test_variant', passage.test_variant)
      toast.error('فشل التحديث')
    } else {
      toast.success('تم التحديث')
      queryClient.invalidateQueries({ queryKey: ['ielts-reading-passages'] })
    }
  }

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_reading_passages').update({
        title: data.title, content: data.content, topic_category: data.topic_category,
        difficulty_band: data.difficulty_band, questions: data.questions || [],
        time_limit_minutes: data.time_limit_minutes, test_variant: data.test_variant,
        is_published: data.is_published,
      }).eq('id', passage.id)
      if (error) throw error
      onRefresh()
      toast.success('تم الحفظ')
    } catch (err) { console.error(err); toast.error('فشل الحفظ') } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${selected ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
      <div className="grid items-center px-4 py-3 text-sm" style={{ background: selected ? 'rgba(56,189,248,0.04)' : 'rgba(255,255,255,0.02)', gridTemplateColumns: '20px 28px 1fr 120px 80px 80px 60px 36px' }}>
        <input type="checkbox" checked={selected} onChange={e => { e.stopPropagation(); onSelect(e.target.checked) }} className="w-3 h-3" />
        <span style={{ color: 'var(--text-muted)' }} onClick={onToggle} className="cursor-pointer">{index}</span>
        <span style={{ color: 'var(--text-primary)' }} className="truncate cursor-pointer" onClick={onToggle}>{passage.title || '—'}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }} onClick={onToggle} className="cursor-pointer truncate">{passage.topic_category || '—'}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 12 }} onClick={onToggle} className="cursor-pointer">{passage.difficulty_band?.replace('band_', '').replace('_', '–')}</span>
        {/* Inline variant quick-edit */}
        <div onClick={e => e.stopPropagation()}>
          <select
            value={data.test_variant || ''}
            onChange={e => quickVariant(e.target.value)}
            style={{ background: 'transparent', border: 'none', fontSize: 11, cursor: 'pointer', color: data.test_variant === 'general_training' ? '#a855f7' : '#38bdf8', fontFamily: 'Tajawal', fontWeight: 700 }}
          >
            <option value="academic">أكاديمي</option>
            <option value="general_training">عام</option>
          </select>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }} onClick={onToggle} className="cursor-pointer">{qCount}</span>
        <button onClick={onPreview} title="معاينة" style={{ color: 'var(--text-muted)', padding: 4 }}>
          <Eye size={14} />
        </button>
      </div>

      {expanded && (
        <div className="p-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input value={data.title || ''} onChange={e => update('title', e.target.value)} placeholder="العنوان" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <textarea value={data.content || ''} onChange={e => update('content', e.target.value)} placeholder="نص القراءة" rows={6} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
          <div className="grid grid-cols-4 gap-3">
            <input value={data.topic_category || ''} onChange={e => update('topic_category', e.target.value)} placeholder="التصنيف" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            <select value={data.difficulty_band || 'band_5_6'} onChange={e => update('difficulty_band', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="band_5_6">Band 5–6</option>
              <option value="band_6_7">Band 6–7</option>
              <option value="band_7_8">Band 7–8</option>
            </select>
            <select value={data.test_variant || 'academic'} onChange={e => update('test_variant', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="academic">أكاديمي</option>
              <option value="general_training">عام (GT)</option>
            </select>
            <input type="number" value={data.time_limit_minutes || 20} onChange={e => update('time_limit_minutes', Number(e.target.value))} placeholder="الوقت (دقائق)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
            <input type="checkbox" checked={!!data.is_published} onChange={e => update('is_published', e.target.checked)} className="accent-emerald-500" />
            منشور
          </label>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الأسئلة (JSON)</label>
            <textarea
              value={JSON.stringify(data.questions || [], null, 2)}
              onChange={e => { try { update('questions', JSON.parse(e.target.value)) } catch {} }}
              rows={5} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
            />
          </div>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function IELTSManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Stats
  const { data: stats } = useQuery({
    queryKey: ['ielts-stats'],
    queryFn: async () => {
      const [{ count: enrolled }, { count: mocks }, { data: results }] = await Promise.all([
        supabase.from('ielts_student_results').select('student_id', { count: 'exact', head: true }),
        supabase.from('ielts_mock_tests').select('id', { count: 'exact', head: true }),
        supabase.from('ielts_student_results').select('overall_band'),
      ])
      const avgBand = results?.length
        ? (results.reduce((s, r) => s + (r.overall_band || 0), 0) / results.length).toFixed(1)
        : '—'
      return { enrolled: enrolled || 0, mocks: mocks || 0, avgBand }
    },
  })

  const statCards = [
    { label: 'الطلاب المسجلين', value: stats?.enrolled || 0, icon: Users, color: '#38bdf8' },
    { label: 'متوسط الدرجة',    value: stats?.avgBand || '—', icon: Target, color: '#a78bfa' },
    { label: 'اختبارات تجريبية', value: stats?.mocks || 0,   icon: FileText, color: '#fb923c' },
  ]

  return (
    <div className="space-y-8">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/admin/curriculum')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <ArrowRight size={16} strokeWidth={1.5} />
        <span className="text-sm">العودة للمنهج</span>
      </motion.button>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(163,45,45,0.15)' }}>
            <Award size={22} strokeWidth={1.5} style={{ color: '#A32D2D' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>مسار IELTS</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>التحضير للاختبار الدولي</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={16} style={{ color: s.color }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>{s.label}</span>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap shrink-0"
            style={{
              background: activeTab === tab.key ? 'rgba(163,45,45,0.15)' : 'rgba(255,255,255,0.03)',
              color: activeTab === tab.key ? '#A32D2D' : 'var(--text-secondary)',
              border: activeTab === tab.key ? '1px solid rgba(163,45,45,0.3)' : '1px solid rgba(255,255,255,0.06)',
              fontFamily: 'Tajawal',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
        className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {activeTab === 'dashboard'     && <IELTSDashboard />}
        {activeTab === 'reading-skills' && <IELTSReadingManager />}
        {activeTab === 'passages'       && <PassagesManager />}
        {activeTab === 'writing'        && <IELTSWritingManager />}
        {activeTab === 'listening'      && <IELTSListeningManager />}
        {activeTab === 'speaking'       && <IELTSSpeakingManager />}
        {activeTab === 'mocks'          && <IELTSMockTestManager />}
        {activeTab === 'masterclass-v2' && <IELTSMasterclassV2Preview />}
      </motion.div>
    </div>
  )
}
