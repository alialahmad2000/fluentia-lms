import { useQueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

const cardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: 16,
  padding: '16px 20px',
}

const PIE_COLORS = ['#38bdf8', '#a855f7', '#4ade80']

function useIELTSContent() {
  const reading = useQuery({
    queryKey: ['ielts-dash-reading'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_reading_passages').select('test_variant, difficulty_band, is_published')
      if (error) throw error
      return data || []
    },
  })
  const writing = useQuery({
    queryKey: ['ielts-dash-writing'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_writing_tasks').select('task_type, test_variant, is_published')
      if (error) throw error
      return data || []
    },
  })
  const listening = useQuery({
    queryKey: ['ielts-dash-listening'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_listening_sections').select('section_number, is_published')
      if (error) throw error
      return data || []
    },
  })
  const speaking = useQuery({
    queryKey: ['ielts-dash-speaking'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_speaking_questions').select('part, is_published')
      if (error) throw error
      return data || []
    },
  })
  const mocks = useQuery({
    queryKey: ['ielts-dash-mocks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('ielts_mock_tests').select('test_number, is_published')
      if (error) throw error
      return data || []
    },
  })
  return { reading, writing, listening, speaking, mocks }
}

export default function IELTSDashboard() {
  const queryClient = useQueryClient()
  const { reading, writing, listening, speaking, mocks } = useIELTSContent()

  const isLoading = reading.isLoading || writing.isLoading || listening.isLoading || speaking.isLoading || mocks.isLoading

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ielts-dash-reading'] })
    queryClient.invalidateQueries({ queryKey: ['ielts-dash-writing'] })
    queryClient.invalidateQueries({ queryKey: ['ielts-dash-listening'] })
    queryClient.invalidateQueries({ queryKey: ['ielts-dash-speaking'] })
    queryClient.invalidateQueries({ queryKey: ['ielts-dash-mocks'] })
  }

  // ─── Reading chart data ──────────────────────────────────────
  const readingBands = ['band_5_6', 'band_6_7', 'band_7_8']
  const readingChartData = readingBands.map(band => {
    const rows = (reading.data || []).filter(r => r.difficulty_band === band)
    return {
      name: band.replace('band_', '').replace('_', '–'),
      أكاديمي: rows.filter(r => r.test_variant === 'academic').length,
      عام: rows.filter(r => r.test_variant === 'general_training').length,
    }
  })

  // ─── Writing chart data ──────────────────────────────────────
  const writingChartData = [
    {
      name: 'Task 1',
      أكاديمي: (writing.data || []).filter(r => r.task_type === 'task1' && r.test_variant === 'academic').length,
      عام: (writing.data || []).filter(r => r.task_type === 'task1' && r.test_variant === 'general_training').length,
    },
    {
      name: 'Task 2',
      'كلا النوعين': (writing.data || []).filter(r => r.task_type === 'task2').length,
    },
  ]

  // ─── Speaking pie data ───────────────────────────────────────
  const speakingPieData = [1, 2, 3].map(p => ({
    name: `Part ${p}`,
    value: (speaking.data || []).filter(r => r.part === p).length,
  }))

  // ─── Health alerts ───────────────────────────────────────────
  const rTotal = (reading.data || []).length
  const rGT = (reading.data || []).filter(r => r.test_variant === 'general_training').length
  const publishedMocks = (mocks.data || []).filter(m => m.is_published).length
  const unpublishedListening = (listening.data || []).filter(l => !l.is_published).length
  const listeningTotal = (listening.data || []).length
  const t1GT = (writing.data || []).filter(r => r.task_type === 'task1' && r.test_variant === 'general_training').length

  const alerts = [
    {
      level: rGT === 0 ? 'red' : rGT / rTotal < 0.2 ? 'yellow' : 'green',
      ar: rGT === 0
        ? `لا يوجد محتوى General Training للقراءة بعد (0 / ${rTotal})`
        : `تغطية القراءة GT: ${rGT} / ${rTotal} نص`,
    },
    {
      level: t1GT === 0 ? 'yellow' : 'green',
      ar: t1GT === 0 ? 'لا توجد مهام Task 1 من نوع GT' : `Task 1 GT: ${t1GT} مهمة`,
    },
    {
      level: listeningTotal > 0 && unpublishedListening / listeningTotal > 0.8 ? 'yellow' : 'green',
      ar: `الاستماع: ${listeningTotal - unpublishedListening} منشور / ${listeningTotal} إجمالي`,
    },
    {
      level: speakingPieData.every(p => p.value >= 10) ? 'green' : 'yellow',
      ar: 'المحادثة: التوزيع ' + speakingPieData.map(p => `${p.name}=${p.value}`).join(' · '),
    },
    {
      level: publishedMocks < 3 ? 'red' : publishedMocks < 5 ? 'yellow' : 'green',
      ar: publishedMocks < 3
        ? `فقط ${publishedMocks} اختبار تجريبي منشور (الهدف: 5 للـ V2)`
        : `الاختبارات التجريبية: ${publishedMocks} منشور`,
    },
  ]

  const alertIcon = { red: <AlertCircle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />, yellow: <AlertTriangle size={14} style={{ color: '#fbbf24', flexShrink: 0 }} />, green: <CheckCircle2 size={14} style={{ color: '#4ade80', flexShrink: 0 }} /> }

  const kpis = [
    { label: 'القراءة', value: rTotal, sub: `GT: ${rGT}`, color: '#38bdf8' },
    { label: 'الكتابة', value: (writing.data || []).length, sub: 'Task 1+2', color: '#a855f7' },
    { label: 'الاستماع', value: listeningTotal, sub: `${listeningTotal - unpublishedListening} منشور`, color: '#fb923c' },
    { label: 'المحادثة', value: (speaking.data || []).length, sub: 'Parts 1–3', color: '#4ade80' },
    { label: 'اختبارات', value: (mocks.data || []).length, sub: `${publishedMocks} منشور`, color: '#fbbf24' },
  ]

  const tooltipStyle = { background: '#0b1426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontFamily: 'Tajawal', color: '#e2e8f0', fontSize: 12 }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}>لوحة محتوى IELTS</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}
          >
            <RefreshCw size={12} />
            تحديث
          </button>
          <button
            disabled
            title="قريباً"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontFamily: 'Tajawal', opacity: 0.5, cursor: 'not-allowed' }}
          >
            <Download size={12} />
            تصدير
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="grid grid-cols-5 gap-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
          <div className="h-48 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            {kpis.map(k => (
              <div key={k.label} style={cardStyle}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}>{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Reading bar */}
            <div style={cardStyle}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>القراءة — حسب المستوى والنوع</p>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={readingChartData} barSize={18}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="أكاديمي" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="عام" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Speaking pie */}
            <div style={cardStyle}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>المحادثة — توزيع الأجزاء</p>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={speakingPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" nameKey="name">
                    {speakingPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Tajawal', color: '#94a3b8' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Health alerts */}
          <div style={cardStyle}>
            <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'Tajawal' }}>مؤشرات الصحة</p>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-center gap-2 text-sm" style={{ fontFamily: 'Tajawal', color: 'var(--text-secondary)' }}>
                  {alertIcon[a.level]}
                  {a.ar}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
