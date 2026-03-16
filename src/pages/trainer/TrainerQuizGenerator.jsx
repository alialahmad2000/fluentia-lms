import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, Plus, Trash2, ChevronUp, ChevronDown, Edit3, Check,
  Clock, Send, Save, Loader2, RefreshCw, GripVertical,
  BarChart2, AlertTriangle, Target, TrendingDown, Users, HelpCircle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { useAIFormFiller } from '../../hooks/useAIFormFiller'
import AIFillButton from '../../components/ai/AIFillButton'

const SKILLS = [
  { value: 'grammar', label: 'القواعد' },
  { value: 'vocabulary', label: 'المفردات' },
  { value: 'reading', label: 'القراءة' },
  { value: 'writing', label: 'الكتابة' },
  { value: 'speaking', label: 'المحادثة' },
  { value: 'listening', label: 'الاستماع' },
]

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'اختيار من متعدد' },
  { value: 'true_false', label: 'صح أو خطأ' },
  { value: 'fill_blank', label: 'أكمل الفراغ' },
  { value: 'reorder', label: 'ترتيب' },
  { value: 'matching', label: 'مطابقة' },
  { value: 'short_answer', label: 'إجابة قصيرة' },
]

const QUICK_COUNTS = [5, 10, 15, 20]
const FULL_COUNTS = [20, 30, 40]

const STEP_LABELS = ['الإعداد', 'توليد الأسئلة', 'مراجعة وتعديل', 'النشر']

const stepVariants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
}

export default function TrainerQuizGenerator() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = profile?.role === 'admin'

  const [activeTab, setActiveTab] = useState('generator')
  const [step, setStep] = useState(1)
  const [toast, setToast] = useState(null)

  // Step 1 form
  const [form, setForm] = useState({
    title: '',
    type: 'quick_quiz',
    group_id: '',
    level: 1,
    skill_focus: [],
    question_count: 10,
    context_prompt: '',
    time_limit_minutes: '',
    xp_reward: 10,
    xp_bonus_perfect: 0,
  })

  // AI Form Filler for quiz setup
  const aiFiller = useAIFormFiller({
    pageId: 'create-quiz',
    fields: [
      { key: 'title', type: 'text', label: 'عنوان الاختبار', required: true },
      { key: 'type', type: 'select', label: 'نوع الاختبار', options: [{ value: 'quick_quiz', label: 'كويز سريع' }, { value: 'full_test', label: 'اختبار كامل' }] },
      { key: 'group_id', type: 'select', label: 'المجموعة', options: (groups || []).map(g => ({ value: g.id, label: `${g.name} (${g.code})` })) },
      { key: 'question_count', type: 'number', label: 'عدد الأسئلة' },
      { key: 'context_prompt', type: 'textarea', label: 'موضوع/سياق الأسئلة' },
      { key: 'time_limit_minutes', type: 'number', label: 'المدة (دقائق)' },
      { key: 'xp_reward', type: 'number', label: 'نقاط XP' },
    ],
    context: 'Fluentia Academy quiz generator. Trainer creates quizzes for Arabic-speaking English learners.',
    onFill: (filled) => setForm(prev => ({ ...prev, ...filled })),
    getContextData: async () => ({
      groups: (groups || []).map(g => ({ id: g.id, name: `${g.name} (${g.code})` })),
      currentDate: new Date().toISOString().split('T')[0],
    }),
  })

  // Step 2-3 questions
  const [questions, setQuestions] = useState([])
  const [generating, setGenerating] = useState(false)

  // Step 4 publish options
  const [publishMode, setPublishMode] = useState('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [deadline, setDeadline] = useState('')
  const [shuffleQuestions, setShuffleQuestions] = useState(false)
  const [shuffleOptions, setShuffleOptions] = useState(false)
  const [showAnswersAfter, setShowAnswersAfter] = useState(true)

  // Fetch trainer groups
  const { data: groups } = useQuery({
    queryKey: ['trainer-groups-quiz', profile?.id],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code, level').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profile?.id)
      const { data } = await query
      return data || []
    },
    enabled: !!profile?.id,
  })

  // Auto-select first group and its level
  useEffect(() => {
    if (groups?.length > 0 && !form.group_id) {
      const g = groups[0]
      setForm(f => ({ ...f, group_id: g.id, level: g.level || 1 }))
    }
  }, [groups, form.group_id])

  // Update level when group changes
  function handleGroupChange(groupId) {
    const g = groups?.find(gr => gr.id === groupId)
    setForm(f => ({ ...f, group_id: groupId, level: g?.level || 1 }))
  }

  // Update defaults when type changes
  function handleTypeChange(type) {
    setForm(f => ({
      ...f,
      type,
      question_count: type === 'quick_quiz' ? 10 : 20,
      xp_reward: type === 'quick_quiz' ? 10 : 50,
      time_limit_minutes: type === 'quick_quiz' ? '' : f.time_limit_minutes,
    }))
  }

  function toggleSkill(skill) {
    setForm(f => ({
      ...f,
      skill_focus: f.skill_focus.includes(skill)
        ? f.skill_focus.filter(s => s !== skill)
        : [...f.skill_focus, skill],
    }))
  }

  // ─── Step 2: AI Generation ───
  async function generateQuestions() {
    setGenerating(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData?.session
      if (!session?.access_token) throw new Error('User session expired. Please sign in again.')
      const selectedGroup = groups?.find(g => g.id === form.group_id)

      const systemPrompt = `You are an English language quiz generator for Arab learners. Generate exactly ${form.question_count} quiz questions.

Context/Topic: ${form.context_prompt || 'General English practice'}
Level: ${form.level} (1=beginner, 5=advanced)
Skills: ${form.skill_focus.length > 0 ? form.skill_focus.join(', ') : 'general'}
Group: ${selectedGroup?.name || 'Unknown'}
Quiz type: ${form.type === 'quick_quiz' ? 'Quick quiz' : 'Full assessment'}

Generate a mix of question types appropriate for the level. Use these types: multiple_choice, true_false, fill_blank.

IMPORTANT: Return ONLY a valid JSON array, no markdown, no explanation. Each question must follow this exact structure:
[{
  "type": "multiple_choice",
  "question_text": "...",
  "options": [{"id":"a","text":"...","is_correct":false},{"id":"b","text":"...","is_correct":false},{"id":"c","text":"...","is_correct":true},{"id":"d","text":"...","is_correct":false}],
  "correct_answer": "c",
  "explanation": "...",
  "skill_tag": "grammar",
  "points": 1
}]

For true_false questions, options should have only 2 items with ids "a" (True) and "b" (False).
For fill_blank questions, question_text should contain "___" for the blank, options can be 4 choices, or set options to [] and put the answer in correct_answer.

Make questions progressively harder. All question text should be in English. Explanations can include Arabic hints for lower levels.`

      const res = await invokeWithRetry('ai-trainer-assistant', {
        body: {
          message: systemPrompt,
          history: [],
        },
        
      })

      if (res.error) throw new Error(res.error.message || 'AI generation failed')

      const responseText = typeof res.data === 'string' ? res.data : res.data?.reply || res.data?.message || JSON.stringify(res.data)

      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('Could not parse AI response')

      const parsed = JSON.parse(jsonMatch[0])
      if (!Array.isArray(parsed)) throw new Error('Invalid response format')

      setQuestions(parsed.map((q, i) => ({
        ...q,
        order_number: i + 1,
        _id: crypto.randomUUID(),
      })))

      setStep(3)
    } catch (err) {
      console.error('Generation error:', err)
      setToast({ type: 'error', message: 'فشل توليد الأسئلة: ' + (err.message || 'حاول مرة أخرى') })
      setTimeout(() => setToast(null), 4000)
    } finally {
      setGenerating(false)
    }
  }

  // ─── Step 3: Edit helpers ───
  function updateQuestion(id, updates) {
    setQuestions(qs => qs.map(q => q._id === id ? { ...q, ...updates } : q))
  }

  function deleteQuestion(id) {
    setQuestions(qs => qs.filter(q => q._id !== id).map((q, i) => ({ ...q, order_number: i + 1 })))
  }

  function moveQuestion(id, direction) {
    setQuestions(qs => {
      const idx = qs.findIndex(q => q._id === id)
      if ((direction === -1 && idx === 0) || (direction === 1 && idx === qs.length - 1)) return qs
      const next = [...qs]
      const temp = next[idx]
      next[idx] = next[idx + direction]
      next[idx + direction] = temp
      return next.map((q, i) => ({ ...q, order_number: i + 1 }))
    })
  }

  function addManualQuestion() {
    setQuestions(qs => [
      ...qs,
      {
        _id: crypto.randomUUID(),
        type: 'multiple_choice',
        question_text: '',
        options: [
          { id: 'a', text: '', is_correct: true },
          { id: 'b', text: '', is_correct: false },
          { id: 'c', text: '', is_correct: false },
          { id: 'd', text: '', is_correct: false },
        ],
        correct_answer: 'a',
        explanation: '',
        skill_tag: 'grammar',
        points: 1,
        order_number: qs.length + 1,
      },
    ])
  }

  function toggleCorrectOption(qId, optionId) {
    setQuestions(qs => qs.map(q => {
      if (q._id !== qId) return q
      return {
        ...q,
        correct_answer: optionId,
        options: q.options.map(o => ({ ...o, is_correct: o.id === optionId })),
      }
    }))
  }

  // ─── Step 4: Publish / Save ───
  const publishMutation = useMutation({
    mutationFn: async (status) => {
      const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)

      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          trainer_id: profile.id,
          group_id: form.group_id,
          title: form.title,
          description: form.context_prompt,
          type: form.type,
          context_prompt: form.context_prompt,
          level: form.level,
          skill_focus: form.skill_focus,
          time_limit_minutes: form.time_limit_minutes ? parseInt(form.time_limit_minutes) : null,
          total_questions: questions.length,
          total_points: totalPoints,
          xp_reward: parseInt(form.xp_reward) || 0,
          xp_bonus_perfect: parseInt(form.xp_bonus_perfect) || 0,
          is_scheduled: publishMode === 'schedule',
          scheduled_at: publishMode === 'schedule' && scheduledAt ? scheduledAt : null,
          deadline: deadline || null,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          show_answers_after: showAnswersAfter,
          status,
        })
        .select('id')
        .single()

      if (quizError) throw quizError

      const questionRows = questions.map((q, i) => ({
        quiz_id: quiz.id,
        order_number: i + 1,
        type: q.type,
        question_text: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        accepted_answers: q.accepted_answers || [],
        matching_pairs: q.matching_pairs || null,
        reorder_correct: q.reorder_correct || [],
        points: q.points || 1,
        explanation: q.explanation || '',
        skill_tag: q.skill_tag || '',
      }))

      const { error: qError } = await supabase
        .from('quiz_questions')
        .insert(questionRows)

      if (qError) throw qError

      return quiz.id
    },
    onSuccess: (quizId, status) => {
      queryClient.invalidateQueries({ queryKey: ['trainer-quizzes'] })
      setToast({
        type: 'success',
        message: status === 'published' ? 'تم نشر الكويز بنجاح!' : 'تم حفظ المسودة بنجاح!',
        quizId,
      })
    },
    onError: (err) => {
      setToast({ type: 'error', message: 'خطأ: ' + (err.message || 'فشل الحفظ') })
      setTimeout(() => setToast(null), 4000)
    },
  })

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)
  const canProceedStep1 = form.title.trim() && form.group_id && form.skill_focus.length > 0
  const canProceedStep3 = questions.length > 0 && questions.every(q => (q.question_text || '').trim())

  return (
    <div className="space-y-12" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-page-title">مولّد الكويزات بالذكاء الاصطناعي</h1>
          <p className="text-sm text-muted mt-1">أنشئ كويزات تفاعلية بسرعة باستخدام AI</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-[var(--border-subtle)] pb-1">
        {[
          { key: 'generator', label: 'إنشاء كويز', icon: Brain },
          { key: 'analytics', label: 'تحليلات', icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === key
                ? 'text-violet-300 border-violet-400 bg-violet-500/10'
                : 'text-muted border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--surface-base)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <QuizAnalytics profileId={profile?.id} isAdmin={isAdmin} />
      )}

      {activeTab === 'generator' && (<>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1
          const isActive = step === num
          const isDone = step > num
          return (
            <div key={num} className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isDone) setStep(num)
                }}
                disabled={!isDone}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                    : isDone
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-pointer hover:bg-emerald-500/20'
                      : 'bg-[var(--surface-raised)] text-muted border border-[var(--border-subtle)]'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive ? 'bg-violet-500 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-[var(--surface-raised)]'
                }`}>
                  {isDone ? <Check className="w-3.5 h-3.5" /> : num}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < 3 && <div className={`w-8 h-px ${isDone ? 'bg-emerald-500/40' : 'bg-[var(--surface-raised)]'}`} />}
            </div>
          )
        })}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`p-4 rounded-xl border ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps */}
      <AnimatePresence mode="wait">
        {/* ═══════ Step 1: Setup ═══════ */}
        {step === 1 && (
          <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
            <div className="fl-card-static p-7 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>إعداد الكويز</h2>
                <AIFillButton
                  isOpen={aiFiller.isOpen}
                  setIsOpen={aiFiller.setIsOpen}
                  isProcessing={aiFiller.isProcessing}
                  onSubmit={aiFiller.processRequest}
                  result={aiFiller.result}
                  error={aiFiller.error}
                  unfilled={aiFiller.unfilled}
                  filledCount={aiFiller.result?.filledCount}
                />
              </div>

              {/* Title */}
              <div>
                <label className="input-label">عنوان الكويز</label>
                <input
                  className="input-field w-full"
                  placeholder="مثال: كويز القواعد - الوحدة الثالثة"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Type Toggle */}
              <div>
                <label className="input-label">نوع الكويز</label>
                <div className="flex gap-3">
                  {[
                    { value: 'quick_quiz', label: 'كويز سريع' },
                    { value: 'full_assessment', label: 'اختبار تفصيلي' },
                  ].map(t => (
                    <button
                      key={t.value}
                      onClick={() => handleTypeChange(t.value)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        form.type === t.value
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group */}
              <div>
                <label className="input-label">المجموعة المستهدفة</label>
                <select
                  className="input-field w-full"
                  value={form.group_id}
                  onChange={e => handleGroupChange(e.target.value)}
                >
                  <option value="">اختر المجموعة</option>
                  {groups?.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                  ))}
                </select>
              </div>

              {/* Level (auto) */}
              <div>
                <label className="input-label">المستوى</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(l => (
                    <span
                      key={l}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border ${
                        form.level === l
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted'
                      }`}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>

              {/* Skills */}
              <div>
                <label className="input-label">المهارات المستهدفة</label>
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => toggleSkill(s.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                        form.skill_focus.includes(s.value)
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div>
                <label className="input-label">عدد الأسئلة</label>
                <div className="flex gap-2">
                  {(form.type === 'quick_quiz' ? QUICK_COUNTS : FULL_COUNTS).map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, question_count: c }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.question_count === c
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300'
                          : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Prompt */}
              <div>
                <label className="input-label">اكتب الموضوع أو المحتوى الذي تريد الأسئلة عنه</label>
                <textarea
                  className="input-field w-full h-28 resize-none"
                  placeholder="مثال: أسئلة عن past simple و past continuous مع أمثلة من الحياة اليومية..."
                  value={form.context_prompt}
                  onChange={e => setForm(f => ({ ...f, context_prompt: e.target.value }))}
                />
              </div>

              {/* Time Limit */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="input-label">
                    الوقت (دقائق) {form.type === 'full_assessment' && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="number"
                    className="input-field w-full"
                    placeholder="مثال: 30"
                    value={form.time_limit_minutes}
                    onChange={e => setForm(f => ({ ...f, time_limit_minutes: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="input-label">مكافأة XP</label>
                  <input
                    type="number"
                    className="input-field w-full"
                    value={form.xp_reward}
                    onChange={e => setForm(f => ({ ...f, xp_reward: e.target.value }))}
                  />
                </div>
              </div>

              {/* Next */}
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Brain className="w-5 h-5" />
                التالي — توليد الأسئلة
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ Step 2: AI Generation ═══════ */}
        {step === 2 && (
          <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
            <div className="fl-card-static p-8 text-center space-y-6">
              {generating ? (
                <>
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                  </div>
                  <div>
                    <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>يتم توليد الأسئلة...</h2>
                    <p className="text-sm text-muted mt-1">الذكاء الاصطناعي يعمل على إنشاء {form.question_count} سؤال</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-500/10 flex items-center justify-center">
                    <Brain className="w-8 h-8 text-violet-400" />
                  </div>
                  <div>
                    <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>جاهز لتوليد الأسئلة</h2>
                    <p className="text-sm text-muted mt-1">
                      {form.question_count} سؤال — {form.skill_focus.map(s => SKILLS.find(sk => sk.value === s)?.label).join('، ')}
                    </p>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)] transition-all">
                      رجوع
                    </button>
                    <button onClick={generateQuestions} className="btn-primary px-8 py-2.5 flex items-center gap-2">
                      <Brain className="w-5 h-5" />
                      توليد الأسئلة
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ═══════ Step 3: Review & Edit ═══════ */}
        {step === 3 && (
          <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-4">
            {/* Toolbar */}
            <div className="fl-card-static p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">{questions.length} أسئلة</span>
                <span className="text-xs text-muted">|</span>
                <span className="text-sm text-muted">{totalPoints} نقطة</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setStep(2); setQuestions([]) }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)] transition-all text-sm flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  إعادة توليد
                </button>
                <button
                  onClick={addManualQuestion}
                  className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20 transition-all text-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  إضافة سؤال
                </button>
              </div>
            </div>

            {/* Question Cards */}
            {questions.map((q, idx) => (
              <QuestionCard
                key={q._id}
                question={q}
                index={idx}
                total={questions.length}
                onUpdate={(updates) => updateQuestion(q._id, updates)}
                onDelete={() => deleteQuestion(q._id)}
                onMove={(dir) => moveQuestion(q._id, dir)}
                onToggleCorrect={(optId) => toggleCorrectOption(q._id, optId)}
              />
            ))}

            {/* Navigation */}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)] transition-all">
                رجوع للإعداد
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
                className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Send className="w-5 h-5" />
                التالي — النشر
              </button>
            </div>
          </motion.div>
        )}

        {/* ═══════ Step 4: Publish ═══════ */}
        {step === 4 && (
          <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }} className="space-y-6">
            <div className="fl-card-static p-7 space-y-5">
              <h2 className="text-section-title" style={{ color: 'var(--text-primary)' }}>ملخص ونشر</h2>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {[
                  { label: 'العنوان', value: form.title },
                  { label: 'النوع', value: form.type === 'quick_quiz' ? 'كويز سريع' : 'اختبار تفصيلي' },
                  { label: 'المجموعة', value: groups?.find(g => g.id === form.group_id)?.name || '—' },
                  { label: 'عدد الأسئلة', value: questions.length },
                  { label: 'إجمالي النقاط', value: totalPoints },
                  { label: 'مكافأة XP', value: form.xp_reward },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl border border-[var(--border-subtle)]" style={{ background: 'var(--surface-raised)' }}>
                    <p className="text-xs text-muted">{item.label}</p>
                    <p className="text-sm font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm text-muted mb-2">وقت النشر</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPublishMode('now')}
                    className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${
                      publishMode === 'now' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted'
                    }`}
                  >
                    نشر الآن
                  </button>
                  <button
                    onClick={() => setPublishMode('schedule')}
                    className={`flex-1 py-2.5 rounded-xl text-sm border transition-all ${
                      publishMode === 'schedule' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300' : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted'
                    }`}
                  >
                    جدولة
                  </button>
                </div>
              </div>

              {publishMode === 'schedule' && (
                <div>
                  <label className="input-label">تاريخ ووقت النشر</label>
                  <input
                    type="datetime-local"
                    className="input-field w-full"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                  />
                </div>
              )}

              {/* Deadline */}
              <div>
                <label className="input-label">الموعد النهائي (اختياري)</label>
                <input
                  type="datetime-local"
                  className="input-field w-full"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <ToggleOption label="خلط ترتيب الأسئلة" checked={shuffleQuestions} onChange={setShuffleQuestions} />
                <ToggleOption label="خلط ترتيب الخيارات" checked={shuffleOptions} onChange={setShuffleOptions} />
                <ToggleOption label="عرض الإجابات بعد الانتهاء" checked={showAnswersAfter} onChange={setShowAnswersAfter} />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)] transition-all"
                >
                  رجوع
                </button>
                <button
                  onClick={() => publishMutation.mutate('draft')}
                  disabled={publishMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted hover:bg-[var(--sidebar-hover-bg)] transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  حفظ كمسودة
                </button>
                <button
                  onClick={() => publishMutation.mutate('published')}
                  disabled={publishMutation.isPending}
                  className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {publishMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  نشر الكويز
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </>)}
    </div>
  )
}

// ─── Question Card Component ───
function QuestionCard({ question: q, index, total, onUpdate, onDelete, onMove, onToggleCorrect }) {
  const [editing, setEditing] = useState(false)
  const typeLabel = QUESTION_TYPES.find(t => t.value === q.type)?.label || q.type

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fl-card-static p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-xs font-bold text-violet-300">
            {index + 1}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-300">
            {typeLabel}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted">
            {SKILLS.find(s => s.value === q.skill_tag)?.label || q.skill_tag}
          </span>
          <span className="text-xs text-muted">{q.points || 1} نقطة</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove(-1)} disabled={index === 0} className="p-1 rounded hover:bg-[var(--sidebar-hover-bg)] text-muted disabled:opacity-20">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => onMove(1)} disabled={index === total - 1} className="p-1 rounded hover:bg-[var(--sidebar-hover-bg)] text-muted disabled:opacity-20">
            <ChevronDown className="w-4 h-4" />
          </button>
          <button onClick={() => setEditing(!editing)} className="p-1 rounded hover:bg-[var(--sidebar-hover-bg)] text-muted">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/20 text-red-400/60">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Question Text */}
      {editing ? (
        <textarea
          className="input-field w-full h-20 resize-none text-sm"
          value={q.question_text}
          onChange={e => onUpdate({ question_text: e.target.value })}
        />
      ) : (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{q.question_text || '(سؤال فارغ)'}</p>
      )}

      {/* Options */}
      {q.options && q.options.length > 0 && (
        <div className="space-y-1.5">
          {q.options.map((opt) => (
            <div key={opt.id} className="flex items-center gap-2">
              <button
                onClick={() => onToggleCorrect(opt.id)}
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all text-xs ${
                  opt.is_correct
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-muted hover:border-[var(--border-subtle)]'
                }`}
              >
                {opt.is_correct ? <Check className="w-3.5 h-3.5" /> : opt.id}
              </button>
              {editing ? (
                <input
                  className="input-field flex-1 text-sm py-1.5"
                  value={opt.text}
                  onChange={e => {
                    const newOpts = q.options.map(o =>
                      o.id === opt.id ? { ...o, text: e.target.value } : o
                    )
                    onUpdate({ options: newOpts })
                  }}
                />
              ) : (
                <span className={`text-sm ${opt.is_correct ? 'text-emerald-300' : 'text-muted'}`}>
                  {opt.text || '—'}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      {editing && (
        <div>
          <label className="input-label text-xs">الشرح</label>
          <input
            className="input-field w-full text-sm py-1.5"
            value={q.explanation || ''}
            onChange={e => onUpdate({ explanation: e.target.value })}
            placeholder="شرح الإجابة الصحيحة..."
          />
        </div>
      )}
      {!editing && q.explanation && (
        <p className="text-xs text-muted italic">{q.explanation}</p>
      )}

      {/* Edit mode extras */}
      {editing && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="input-label text-xs">نوع السؤال</label>
            <select
              className="input-field w-full text-sm py-1.5"
              value={q.type}
              onChange={e => onUpdate({ type: e.target.value })}
            >
              {QUESTION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="input-label text-xs">المهارة</label>
            <select
              className="input-field w-full text-sm py-1.5"
              value={q.skill_tag}
              onChange={e => onUpdate({ skill_tag: e.target.value })}
            >
              {SKILLS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="input-label text-xs">النقاط</label>
            <input
              type="number"
              className="input-field w-full text-sm py-1.5"
              value={q.points || 1}
              min={1}
              onChange={e => onUpdate({ points: parseInt(e.target.value) || 1 })}
            />
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── Toggle Option Component ───
function ToggleOption({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-subtle)] cursor-pointer hover:bg-[var(--sidebar-hover-bg)] transition-all" style={{ background: 'var(--surface-raised)' }}>
      <span className="text-sm text-muted">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-all ${
          checked ? 'bg-violet-500' : 'bg-[var(--sidebar-hover-bg)]'
        }`}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-0.5' : 'translate-x-4'
        }`} />
      </button>
    </label>
  )
}

// ─── Quiz Analytics Component ───
function QuizAnalytics({ profileId, isAdmin }) {
  const [selectedGroup, setSelectedGroup] = useState('')

  // Fetch trainer groups
  const { data: groups } = useQuery({
    queryKey: ['analytics-groups', profileId],
    queryFn: async () => {
      let query = supabase.from('groups').select('id, name, code, level').order('level')
      if (!isAdmin) query = query.eq('trainer_id', profileId)
      const { data } = await query
      return data || []
    },
    enabled: !!profileId,
  })

  // Fetch quizzes for the selected group with their attempts
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['quiz-analytics', selectedGroup, profileId],
    queryFn: async () => {
      // 1. Fetch quizzes
      let quizQuery = supabase
        .from('quizzes')
        .select('id, title, total_questions, total_points, type, skill_focus, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20)

      if (selectedGroup) {
        quizQuery = quizQuery.eq('group_id', selectedGroup)
      } else if (!isAdmin) {
        quizQuery = quizQuery.eq('trainer_id', profileId)
      }

      const { data: quizzes, error: quizError } = await quizQuery
      if (quizError) throw quizError
      if (!quizzes || quizzes.length === 0) return { quizzes: [], questionStats: [], weakAreas: [] }

      const quizIds = quizzes.map(q => q.id)

      // 2. Fetch attempts for those quizzes
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('id, quiz_id, total_score, max_score, completed_at')
        .in('quiz_id', quizIds)
        .not('completed_at', 'is', null)

      if (attemptsError) throw attemptsError

      // 3. Fetch quiz questions for those quizzes
      const { data: questions, error: qError } = await supabase
        .from('quiz_questions')
        .select('id, quiz_id, question_text, skill_tag, points, order_number')
        .in('quiz_id', quizIds)

      if (qError) throw qError

      // 4. Fetch quiz answers for those attempts
      const attemptIds = (attempts || []).map(a => a.id)
      let answers = []
      if (attemptIds.length > 0) {
        const { data: ans } = await supabase
          .from('quiz_answers')
          .select('attempt_id, question_id, is_correct')
          .in('attempt_id', attemptIds)
        answers = ans || []
      }

      // ── Compute class averages per quiz ──
      const quizzesWithStats = quizzes.map(quiz => {
        const quizAttempts = (attempts || []).filter(a => a.quiz_id === quiz.id)
        const count = quizAttempts.length
        if (count === 0) return { ...quiz, avgPercent: null, attemptCount: 0 }
        const avgPercent = Math.round(
          quizAttempts.reduce((sum, a) => {
            const maxPts = a.max_score || quiz.total_points || 1
            return sum + ((a.total_score || 0) / maxPts) * 100
          }, 0) / count
        )
        return { ...quiz, avgPercent, attemptCount: count }
      }).filter(q => q.attemptCount > 0)

      // ── Compute per-question wrong rates ──
      const questionMap = {}
      ;(questions || []).forEach(q => { questionMap[q.id] = q })

      const questionStats = {}
      answers.forEach(ans => {
        const q = questionMap[ans.question_id]
        if (!q) return
        if (!questionStats[ans.question_id]) {
          questionStats[ans.question_id] = { ...q, total: 0, wrong: 0 }
        }
        questionStats[ans.question_id].total += 1
        if (!ans.is_correct) questionStats[ans.question_id].wrong += 1
      })

      const questionStatsList = Object.values(questionStats)
        .filter(q => q.total >= 2)
        .map(q => ({ ...q, wrongRate: Math.round((q.wrong / q.total) * 100) }))
        .sort((a, b) => b.wrongRate - a.wrongRate)
        .slice(0, 10)

      // ── Compute weak areas by skill tag ──
      const skillStats = {}
      answers.forEach(ans => {
        const q = questionMap[ans.question_id]
        if (!q || !q.skill_tag) return
        const tag = q.skill_tag
        if (!skillStats[tag]) skillStats[tag] = { tag, total: 0, wrong: 0 }
        skillStats[tag].total += 1
        if (!ans.is_correct) skillStats[tag].wrong += 1
      })

      const weakAreas = Object.values(skillStats)
        .filter(s => s.total >= 2)
        .map(s => ({ ...s, wrongRate: Math.round((s.wrong / s.total) * 100) }))
        .sort((a, b) => b.wrongRate - a.wrongRate)

      return { quizzes: quizzesWithStats, questionStats: questionStatsList, weakAreas }
    },
    enabled: !!profileId,
  })

  const skillLabel = (tag) => SKILLS.find(s => s.value === tag)?.label || tag

  const barColor = (pct) => {
    if (pct >= 75) return 'bg-emerald-500'
    if (pct >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const weakBarColor = (pct) => {
    if (pct >= 60) return 'bg-red-500'
    if (pct >= 35) return 'bg-yellow-500'
    return 'bg-emerald-500'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Group Filter */}
      <div className="fl-card-static p-4 flex items-center gap-4">
        <Users className="w-5 h-5 text-violet-400 shrink-0" />
        <div className="flex-1">
          <label className="input-label text-xs">تصفية حسب المجموعة</label>
          <select
            className="input-field w-full"
            value={selectedGroup}
            onChange={e => setSelectedGroup(e.target.value)}
          >
            <option value="">جميع المجموعات</option>
            {groups?.map(g => (
              <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      )}

      {!isLoading && analyticsData && (
        <>
          {/* ── Section 1: Class Averages Per Quiz ── */}
          <div className="fl-card-static p-7 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-violet-400" />
              <h2 className="text-base font-semibold">متوسط الدرجات لكل كويز</h2>
              <span className="text-xs text-muted mr-auto">{analyticsData.quizzes.length} كويز</span>
            </div>

            {analyticsData.quizzes.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">لا توجد محاولات مكتملة بعد</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.quizzes.map((quiz, i) => (
                  <motion.div
                    key={quiz.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="space-y-1"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)] truncate max-w-[60%]">{quiz.title}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted">{quiz.attemptCount} محاولة</span>
                        <span className={`font-bold text-sm ${
                          quiz.avgPercent >= 75 ? 'text-emerald-400' :
                          quiz.avgPercent >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {quiz.avgPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${quiz.avgPercent}%` }}
                        transition={{ duration: 0.6, delay: i * 0.04 + 0.1, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barColor(quiz.avgPercent)}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Question-Level Analysis ── */}
          <div className="fl-card-static p-7 space-y-4">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-semibold">الأسئلة الأكثر إخفاقاً</h2>
              <span className="text-xs text-muted mr-auto">أعلى نسبة إجابات خاطئة</span>
            </div>

            {analyticsData.questionStats.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">لا توجد بيانات كافية للأسئلة</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.questionStats.map((q, i) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-3 rounded-xl border border-[var(--border-subtle)] space-y-2" style={{ background: 'var(--surface-raised)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2 flex-1">
                        {q.question_text}
                      </p>
                      <div className="shrink-0 text-left">
                        <span className={`text-sm font-bold ${
                          q.wrongRate >= 60 ? 'text-red-400' :
                          q.wrongRate >= 35 ? 'text-yellow-400' : 'text-emerald-400'
                        }`}>
                          {q.wrongRate}%
                        </span>
                        <p className="text-xs text-muted">خطأ</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-raised)] border border-[var(--border-subtle)] text-muted">
                        {skillLabel(q.skill_tag)}
                      </span>
                      <span className="text-xs text-muted">{q.total} محاولة</span>
                      <div className="flex-1 h-1.5 bg-[var(--surface-raised)] rounded-full overflow-hidden mr-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${q.wrongRate}%` }}
                          transition={{ duration: 0.5, delay: i * 0.04 + 0.1 }}
                          className={`h-full rounded-full ${weakBarColor(q.wrongRate)}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 3: Weak Areas by Skill Tag ── */}
          <div className="fl-card-static p-7 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-red-400" />
              <h2 className="text-base font-semibold">المناطق الضعيفة — تحليل المهارات</h2>
            </div>

            {analyticsData.weakAreas.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">لا توجد بيانات كافية لتحليل المهارات</p>
            ) : (
              <div className="space-y-3">
                {analyticsData.weakAreas.map((area, i) => {
                  const isWeak = area.wrongRate >= 50
                  return (
                    <motion.div
                      key={area.tag}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`p-4 rounded-xl border ${
                        isWeak
                          ? 'bg-red-500/5 border-red-500/20'
                          : area.wrongRate >= 35
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-emerald-500/5 border-emerald-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isWeak && <AlertTriangle className="w-4 h-4 text-red-400" />}
                          {!isWeak && area.wrongRate >= 35 && <TrendingDown className="w-4 h-4 text-yellow-400" />}
                          {!isWeak && area.wrongRate < 35 && <Target className="w-4 h-4 text-emerald-400" />}
                          <span className="text-sm font-medium">{skillLabel(area.tag)}</span>
                          {isWeak && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                              يحتاج تركيز
                            </span>
                          )}
                        </div>
                        <div className="text-left">
                          <span className={`text-sm font-bold ${
                            area.wrongRate >= 50 ? 'text-red-400' :
                            area.wrongRate >= 35 ? 'text-yellow-400' : 'text-emerald-400'
                          }`}>
                            {area.wrongRate}% إخفاق
                          </span>
                          <p className="text-xs text-muted">{area.total} إجابة</p>
                        </div>
                      </div>
                      <div className="h-2 bg-[var(--surface-raised)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${area.wrongRate}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 + 0.1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${weakBarColor(area.wrongRate)}`}
                        />
                      </div>
                      <p className="text-xs text-muted mt-2">
                        {area.wrong} إجابة خاطئة من أصل {area.total} — يُنصح بمراجعة {skillLabel(area.tag)} مع الطلاب
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!isLoading && (!analyticsData || (analyticsData.quizzes.length === 0 && analyticsData.questionStats.length === 0 && analyticsData.weakAreas.length === 0)) && (
        <div className="fl-card-static p-10 text-center space-y-3">
          <BarChart2 className="w-10 h-10 text-muted mx-auto" />
          <p className="text-muted text-sm">لا توجد بيانات تحليلية بعد</p>
          <p className="text-muted text-xs">انشر كويزات وانتظر محاولات الطلاب لرؤية التحليلات</p>
        </div>
      )}
    </motion.div>
  )
}
