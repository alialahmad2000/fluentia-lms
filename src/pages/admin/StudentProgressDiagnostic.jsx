import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Search } from 'lucide-react'
import { toast } from '../../components/ui/FluentiaToast'

const MASTERY_WEIGHTS = { new: 0, seen: 0.25, learning: 0.5, reviewing: 0.75, mastered: 1.0 }

const SECTION_LABELS = {
  reading: 'القراءة', grammar: 'القواعد', vocabulary: 'المفردات',
  listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة',
  pronunciation: 'النطق', assessment: 'التقييم',
}

export default function StudentProgressDiagnostic() {
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const queryClient = useQueryClient()

  // Search students
  const { data: students } = useQuery({
    queryKey: ['admin-student-search', studentSearch],
    queryFn: async () => {
      if (studentSearch.length < 2) return []
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, display_name')
        .ilike('full_name', `%${studentSearch}%`)
        .eq('role', 'student')
        .limit(10)
      return data || []
    },
    enabled: studentSearch.length >= 2,
  })

  // Units with activity for selected student
  const { data: units } = useQuery({
    queryKey: ['admin-student-units', selectedStudent?.id],
    queryFn: async () => {
      const { data: progressRows } = await supabase
        .from('student_curriculum_progress')
        .select('unit_id')
        .eq('student_id', selectedStudent.id)
      const { data: recordings } = await supabase
        .from('speaking_recordings')
        .select('unit_id')
        .eq('student_id', selectedStudent.id)

      const unitIds = [...new Set([
        ...(progressRows || []).map(r => r.unit_id),
        ...(recordings || []).map(r => r.unit_id),
      ].filter(Boolean))]

      if (!unitIds.length) return []
      const { data } = await supabase
        .from('curriculum_units')
        .select('id, theme_ar, theme_en, unit_number, level_id')
        .in('id', unitIds)
        .order('level_id')
        .order('unit_number')
      return data || []
    },
    enabled: !!selectedStudent?.id,
  })

  // Full diagnostic for selected student + unit
  const { data: diagnostic, isLoading: diagLoading } = useQuery({
    queryKey: ['admin-progress-diagnostic', selectedStudent?.id, selectedUnit?.id],
    queryFn: async () => {
      const sid = selectedStudent.id
      const uid = selectedUnit.id

      // Content existence
      const [
        { data: readings },
        { data: grammar },
        { data: listening },
        { data: vocab },
        { data: writing },
        { data: speaking },
        { data: pronunciation },
        { data: assessment },
      ] = await Promise.all([
        supabase.from('curriculum_readings').select('id, reading_label').eq('unit_id', uid).order('reading_label'),
        supabase.from('curriculum_grammar').select('id').eq('unit_id', uid).limit(1),
        supabase.from('curriculum_listening').select('id').eq('unit_id', uid),
        supabase.from('curriculum_vocabulary').select('id').in('reading_id', []),
        supabase.from('curriculum_writing').select('id').eq('unit_id', uid).limit(1),
        supabase.from('curriculum_speaking').select('id').eq('unit_id', uid),
        supabase.from('curriculum_pronunciation').select('id').eq('unit_id', uid).limit(1),
        supabase.from('curriculum_assessments').select('id').eq('unit_id', uid).limit(1),
      ])

      const readingIds = (readings || []).map(r => r.id)
      const { data: vocabRows } = readingIds.length > 0
        ? await supabase.from('curriculum_vocabulary').select('id').in('reading_id', readingIds)
        : { data: [] }
      const vocabIds = (vocabRows || []).map(v => v.id)

      // Student progress rows (all, not just is_best)
      const { data: allProgress } = await supabase
        .from('student_curriculum_progress')
        .select('*')
        .eq('student_id', sid)
        .eq('unit_id', uid)
        .order('section_type')
        .order('attempt_number', { ascending: false })

      // Vocab mastery
      let vocabMastery = null
      if (vocabIds.length > 0) {
        const { data: mastery } = await supabase
          .from('vocabulary_word_mastery')
          .select('mastery_level')
          .eq('student_id', sid)
          .in('vocabulary_id', vocabIds)
        const arr = mastery || []
        const masteredCount = arr.filter(m => m.mastery_level === 'mastered').length
        const learningCount = arr.filter(m => m.mastery_level === 'learning').length
        const newCount = vocabIds.length - masteredCount - learningCount
        const weightedSum = newCount * MASTERY_WEIGHTS.new + learningCount * MASTERY_WEIGHTS.learning + masteredCount * MASTERY_WEIGHTS.mastered
        vocabMastery = {
          total: vocabIds.length, masteredCount, learningCount, newCount,
          progress: vocabIds.length > 0 ? Math.round((weightedSum / vocabIds.length) * 100) : 0,
        }
      }

      // Speaking recordings
      const { data: speakingRecs } = await supabase
        .from('speaking_recordings')
        .select('id, question_index, evaluation_status, created_at, is_best, is_latest')
        .eq('student_id', sid)
        .eq('unit_id', uid)
        .order('question_index')
        .order('created_at', { ascending: false })

      // Build per-activity breakdown
      const readingA = (readings || []).find(r => r.reading_label === 'A')
      const readingB = (readings || []).find(r => r.reading_label === 'B')

      const bestProgress = (allProgress || []).filter(r => r.is_best)

      const activities = []

      const addActivity = (key, label, exists, progressFn, extras = {}) => {
        if (!exists) return
        const { status, score, completedAt, issues } = progressFn()
        activities.push({ key, label, exists: true, status, score, completedAt, issues: issues || [], ...extras })
      }

      const findBest = (type, extra) => bestProgress.find(r => r.section_type === type && (!extra || Object.entries(extra).every(([k, v]) => r[k] === v)))

      // Reading A
      addActivity('reading_a', 'القراءة A', !!readingA, () => {
        const row = bestProgress.find(r => r.section_type === 'reading' && r.reading_id === readingA?.id)
        const issues = []
        const allRows = (allProgress || []).filter(r => r.section_type === 'reading' && r.reading_id === readingA?.id)
        if (!row) issues.push('لا يوجد سجل تقدم')
        else if (row.status !== 'completed') issues.push(`الحالة: ${row.status}`)
        return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
      }, { attemptCount: (allProgress || []).filter(r => r.section_type === 'reading' && r.reading_id === readingA?.id).length })

      // Reading B
      addActivity('reading_b', 'القراءة B', !!readingB, () => {
        const row = bestProgress.find(r => r.section_type === 'reading' && r.reading_id === readingB?.id)
        const issues = []
        if (!row) issues.push('لا يوجد سجل تقدم')
        else if (row.status !== 'completed') issues.push(`الحالة: ${row.status}`)
        return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
      }, { attemptCount: (allProgress || []).filter(r => r.section_type === 'reading' && r.reading_id === readingB?.id).length })

      // Grammar
      addActivity('grammar', 'القواعد', grammar?.length > 0, () => {
        const row = findBest('grammar')
        const issues = []
        if (!row) issues.push('لا يوجد سجل تقدم')
        return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
      })

      // Vocabulary
      addActivity('vocabulary', 'المفردات', vocabIds.length > 0, () => {
        const issues = []
        if (!vocabMastery) issues.push('لا توجد بيانات mastery')
        const pct = vocabMastery?.progress || 0
        const status = pct >= 80 ? 'completed' : pct > 0 ? 'in_progress' : 'not_started'
        if (status !== 'completed') issues.push(`${pct}% من الكلمات محفوظة`)
        return { status, score: pct, completedAt: null, issues }
      }, { vocabDetail: vocabMastery })

      // Listening
      const listeningItems = listening || []
      listeningItems.forEach((item, i) => {
        addActivity(`listening_${i}`, `الاستماع ${listeningItems.length > 1 ? i + 1 : ''}`.trim(), true, () => {
          const row = bestProgress.find(r => r.section_type === 'listening' && r.listening_id === item.id)
          const allRows = (allProgress || []).filter(r => r.section_type === 'listening' && r.listening_id === item.id)
          const issues = []
          if (!row) issues.push('لا يوجد سجل تقدم')
          else if (row.status !== 'completed') {
            issues.push(`الحالة: ${row.status}`)
            if (row.answers) issues.push('توجد إجابات محفوظة لكن لم يُكمَل')
          }
          return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
        }, { listeningId: item.id, attemptCount: (allProgress || []).filter(r => r.section_type === 'listening' && r.listening_id === item.id).length })
      })

      // Writing
      addActivity('writing', 'الكتابة', writing?.length > 0, () => {
        const row = findBest('writing')
        const issues = []
        if (!row) issues.push('لا يوجد سجل تقدم')
        else if (row.status !== 'completed') issues.push(`الحالة: ${row.status}`)
        return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
      })

      // Speaking
      const speakingTopics = speaking || []
      speakingTopics.forEach((topic, i) => {
        const recs = (speakingRecs || []).filter(r => r.question_index === i)
        addActivity(`speaking_${i}`, `المحادثة ${speakingTopics.length > 1 ? i + 1 : ''}`.trim(), true, () => {
          const progressRow = bestProgress.find(r => r.section_type === 'speaking')
          const hasRec = recs.length > 0
          const issues = []
          if (!hasRec) {
            issues.push('لا يوجد تسجيل صوتي')
          } else {
            if (!progressRow) issues.push('⚠️ يوجد تسجيل لكن لا يوجد سجل تقدم في student_curriculum_progress')
            else if (progressRow.status !== 'completed') issues.push(`التقدم الحالة: ${progressRow.status}`)
            const latest = recs.find(r => r.is_latest) || recs[0]
            if (latest?.evaluation_status !== 'completed') issues.push(`التقييم: ${latest?.evaluation_status || 'pending'}`)
          }
          const status = progressRow?.status === 'completed' ? 'completed' : hasRec ? 'in_progress' : 'not_started'
          return { status, score: null, completedAt: progressRow?.completed_at, issues }
        }, { recordings: recs })
      })

      // Pronunciation
      addActivity('pronunciation', 'النطق', pronunciation?.length > 0, () => {
        const row = findBest('pronunciation')
        const issues = []
        if (!row) issues.push('لا يوجد سجل تقدم')
        else if (row.status !== 'completed') issues.push(`الحالة: ${row.status}`)
        return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
      })

      // Assessment
      addActivity('assessment', 'التقييم', assessment?.length > 0, () => {
        const row = findBest('assessment')
        const issues = []
        if (!row) issues.push('لا يوجد سجل تقدم')
        else if (row.status !== 'completed') issues.push(`الحالة: ${row.status}`)
        return { status: row?.status || 'not_started', score: row?.score, completedAt: row?.completed_at, issues }
      })

      const completed = activities.filter(a => a.status === 'completed').length
      const totalWeight = activities.length
      const hasIssues = activities.some(a => a.issues.length > 0)

      return { activities, completed, total: activities.length, hasIssues, allProgress }
    },
    enabled: !!selectedStudent?.id && !!selectedUnit?.id,
  })

  // Recompute — writes speaking progress row for students missing it
  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const sid = selectedStudent.id
      const uid = selectedUnit.id

      // Heal speaking: if recording exists but no progress row → write it
      const { data: recs } = await supabase
        .from('speaking_recordings')
        .select('id')
        .eq('student_id', sid)
        .eq('unit_id', uid)
        .limit(1)

      if (recs?.length > 0) {
        const { data: existing } = await supabase
          .from('student_curriculum_progress')
          .select('id')
          .eq('student_id', sid)
          .eq('unit_id', uid)
          .eq('section_type', 'speaking')
          .limit(1)
          .maybeSingle()

        if (!existing) {
          const { error } = await supabase
            .from('student_curriculum_progress')
            .insert({
              student_id: sid,
              unit_id: uid,
              section_type: 'speaking',
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
          if (error) throw error
        }
      }
    },
    onSuccess: () => {
      toast({ type: 'success', title: 'تم إعادة الحساب' })
      queryClient.invalidateQueries({ queryKey: ['admin-progress-diagnostic', selectedStudent?.id, selectedUnit?.id] })
    },
    onError: (err) => toast({ type: 'error', title: 'فشل: ' + err.message }),
  })

  const statusIcon = (status, issues) => {
    if (status === 'completed' && issues.length === 0) return <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
    if (issues.length > 0) return <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />
    if (status === 'in_progress') return <div className="w-4 h-4 rounded-full border-2 border-sky-400 flex-shrink-0" />
    return <XCircle size={16} className="text-[var(--text-muted)] flex-shrink-0" />
  }

  const statusColor = (status) => {
    if (status === 'completed') return 'text-emerald-400'
    if (status === 'in_progress') return 'text-sky-400'
    return 'text-[var(--text-muted)]'
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 font-['Tajawal']" dir="rtl">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">تشخيص تقدم الطالب</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">اختر طالباً ووحدة لعرض تفاصيل التقدم وتشخيص المشكلات</p>
      </div>

      {/* Student search */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-[var(--text-secondary)]">الطالب</label>
        <div className="relative">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            placeholder="ابحث عن طالب..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl text-sm bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-[var(--text-primary)] outline-none focus:border-purple-500/50"
          />
        </div>
        {students?.length > 0 && !selectedStudent && (
          <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden" style={{ background: 'var(--surface-raised)' }}>
            {students.map(s => (
              <button key={s.id} onClick={() => { setSelectedStudent(s); setStudentSearch(s.full_name); setSelectedUnit(null) }}
                className="w-full text-right px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors border-b border-[var(--border-subtle)] last:border-0">
                {s.full_name} <span className="text-[var(--text-muted)] text-xs">({s.display_name})</span>
              </button>
            ))}
          </div>
        )}
        {selectedStudent && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-purple-400">{selectedStudent.full_name}</span>
            <button onClick={() => { setSelectedStudent(null); setSelectedUnit(null); setStudentSearch('') }}
              className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors">تغيير</button>
          </div>
        )}
      </div>

      {/* Unit selector */}
      {selectedStudent && units && (
        <div className="space-y-2">
          <label className="text-sm font-bold text-[var(--text-secondary)]">الوحدة</label>
          <div className="flex flex-wrap gap-2">
            {units.map(u => (
              <button key={u.id}
                onClick={() => setSelectedUnit(u)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedUnit?.id === u.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                {u.theme_ar || `وحدة ${u.unit_number}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Diagnostic results */}
      {selectedStudent && selectedUnit && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {selectedStudent.full_name} · {selectedUnit.theme_ar || `وحدة ${selectedUnit.unit_number}`}
            </h2>
            <button
              onClick={() => recomputeMutation.mutate()}
              disabled={recomputeMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={recomputeMutation.isPending ? 'animate-spin' : ''} />
              إعادة الحساب
            </button>
          </div>

          {diagLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
              ))}
            </div>
          ) : diagnostic ? (
            <>
              {/* Summary */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: diagnostic.hasIssues ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${diagnostic.hasIssues ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                {diagnostic.hasIssues
                  ? <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
                  : <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />}
                <div>
                  <p className="text-sm font-bold" style={{ color: diagnostic.hasIssues ? '#fbbf24' : '#34d399' }}>
                    {diagnostic.completed}/{diagnostic.total} نشاط مكتمل
                    {diagnostic.hasIssues ? ' — توجد مشكلات' : ' — كل شيء سليم'}
                  </p>
                </div>
              </div>

              {/* Activity breakdown */}
              <div className="space-y-2">
                {diagnostic.activities.map(a => (
                  <div key={a.key} className="rounded-xl px-4 py-3 space-y-1"
                    style={{ background: 'var(--surface-raised)', border: `1px solid ${a.issues.length > 0 ? 'rgba(245,158,11,0.3)' : 'var(--border-subtle)'}` }}>
                    <div className="flex items-center gap-2">
                      {statusIcon(a.status, a.issues)}
                      <span className="text-sm font-bold text-[var(--text-primary)]">{a.label}</span>
                      <span className={`text-xs font-bold mr-auto ${statusColor(a.status)}`}>
                        {a.status === 'completed' ? 'مكتمل' : a.status === 'in_progress' ? 'جارٍ' : 'لم يبدأ'}
                      </span>
                      {a.score != null && (
                        <span className="text-xs text-[var(--text-muted)]">{a.score}%</span>
                      )}
                      {a.completedAt && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(a.completedAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    {a.issues.map((issue, i) => (
                      <p key={i} className="text-xs text-amber-400 pr-6">{issue}</p>
                    ))}
                    {a.recordings?.length > 0 && (
                      <p className="text-xs text-sky-400 pr-6">{a.recordings.length} تسجيل صوتي موجود</p>
                    )}
                    {a.vocabDetail && (
                      <p className="text-xs text-[var(--text-muted)] pr-6">
                        محفوظ: {a.vocabDetail.masteredCount} · قيد التعلم: {a.vocabDetail.learningCount} · جديد: {a.vocabDetail.newCount} / {a.vocabDetail.total}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}
