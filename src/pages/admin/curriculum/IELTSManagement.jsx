import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowRight, Award, Users, Target, FileText, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import IELTSReadingManager from './components/IELTSReadingManager'
import IELTSWritingManager from './components/IELTSWritingManager'
import IELTSListeningManager from './components/IELTSListeningManager'
import IELTSSpeakingManager from './components/IELTSSpeakingManager'
import IELTSMockTestManager from './components/IELTSMockTestManager'

const TABS = [
  { key: 'reading-skills', label: 'مهارات القراءة' },
  { key: 'passages', label: 'نصوص القراءة' },
  { key: 'writing', label: 'مهام الكتابة' },
  { key: 'listening', label: 'الاستماع' },
  { key: 'speaking', label: 'المحادثة' },
  { key: 'mocks', label: 'اختبارات تجريبية' },
]

function PassagesManager() {
  const [expandedId, setExpandedId] = useState(null)
  const [adding, setAdding] = useState(false)

  const { data: passages = [], isLoading, refetch } = useQuery({
    queryKey: ['ielts-reading-passages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_reading_passages').select('*').order('created_at')
      if (error) throw error
      return data || []
    },
  })

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: 'var(--text-primary)',
    fontFamily: 'Tajawal',
  }

  const addNew = async () => {
    setAdding(true)
    try {
      const { error } = await supabase.from('ielts_reading_passages').insert({
        title: '', content: '', topic_category: '', difficulty_band: '5.0',
        questions: [], time_limit_minutes: 20,
      })
      if (error) throw error
      refetch()
    } catch (err) { console.error(err) } finally { setAdding(false) }
  }

  if (isLoading) return <div className="animate-pulse space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-5 gap-4 px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>
        <span>#</span><span>العنوان</span><span>التصنيف</span><span>المستوى</span><span>الأسئلة</span>
      </div>

      {passages.map((p, i) => (
        <PassageRow key={p.id} passage={p} index={i + 1} expanded={expandedId === p.id} onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)} onRefresh={refetch} />
      ))}

      {passages.length === 0 && <div className="text-center py-8" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>لا توجد نصوص بعد</div>}

      <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>
        + إضافة نص
      </button>
    </div>
  )
}

function PassageRow({ passage, index, expanded, onToggle, onRefresh }) {
  const [data, setData] = useState(passage)
  const [saving, setSaving] = useState(false)
  const inputStyle = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-primary)', fontFamily: 'Tajawal' }
  const update = (f, v) => setData(prev => ({ ...prev, [f]: v }))
  const qCount = Array.isArray(data.questions) ? data.questions.length : 0

  const save = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('ielts_reading_passages').update({
        title: data.title, content: data.content, topic_category: data.topic_category,
        difficulty_band: data.difficulty_band, questions: data.questions || [],
        time_limit_minutes: data.time_limit_minutes,
      }).eq('id', passage.id)
      if (error) throw error
      onRefresh()
    } catch (err) { console.error(err) } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={onToggle} className="w-full grid grid-cols-5 gap-4 px-4 py-3 items-center text-sm" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <span style={{ color: 'var(--text-muted)' }}>{index}</span>
        <span style={{ color: 'var(--text-primary)' }} className="truncate">{passage.title || '—'}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{passage.topic_category || '—'}</span>
        <span style={{ color: 'var(--text-secondary)' }}>{passage.difficulty_band}</span>
        <span style={{ color: 'var(--text-muted)' }}>{qCount}</span>
      </button>
      {expanded && (
        <div className="p-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <input value={data.title || ''} onChange={e => update('title', e.target.value)} placeholder="العنوان" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          <textarea value={data.content || ''} onChange={e => update('content', e.target.value)} placeholder="نص القراءة" rows={6} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={inputStyle} dir="ltr" />
          <div className="grid grid-cols-3 gap-3">
            <input value={data.topic_category || ''} onChange={e => update('topic_category', e.target.value)} placeholder="التصنيف" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            <select value={data.difficulty_band || '5.0'} onChange={e => update('difficulty_band', e.target.value)} className="px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              {['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <input type="number" value={data.time_limit_minutes || 20} onChange={e => update('time_limit_minutes', Number(e.target.value))} placeholder="الوقت (دقائق)" className="px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>الأسئلة (JSON)</label>
            <textarea
              value={JSON.stringify(data.questions || [], null, 2)}
              onChange={e => { try { update('questions', JSON.parse(e.target.value)) } catch {} }}
              rows={5} className="w-full px-3 py-2 rounded-lg text-sm resize-none font-mono" style={inputStyle} dir="ltr"
            />
          </div>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium" style={{ background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', fontFamily: 'Tajawal' }}>
            {saving ? '...' : 'حفظ'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function IELTSManagement() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('reading-skills')

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
    { label: 'متوسط الدرجة', value: stats?.avgBand || '—', icon: Target, color: '#a78bfa' },
    { label: 'اختبارات تجريبية', value: stats?.mocks || 0, icon: FileText, color: '#fb923c' },
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
        {activeTab === 'reading-skills' && <IELTSReadingManager />}
        {activeTab === 'passages' && <PassagesManager />}
        {activeTab === 'writing' && <IELTSWritingManager />}
        {activeTab === 'listening' && <IELTSListeningManager />}
        {activeTab === 'speaking' && <IELTSSpeakingManager />}
        {activeTab === 'mocks' && <IELTSMockTestManager />}
      </motion.div>
    </div>
  )
}
