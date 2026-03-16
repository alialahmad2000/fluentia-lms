import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PenLine, Send, Loader2, RotateCcw, Sparkles, CheckCircle2, AlertCircle, BookOpen, BarChart3, FileText } from 'lucide-react'
import SubTabs from '../../components/common/SubTabs'
import { invokeWithRetry } from '../../lib/invokeWithRetry'

const TABS = [
  { key: 'sentences', label: 'بناء الجمل', icon: PenLine },
  { key: 'ielts1', label: 'IELTS Task 1', icon: BarChart3 },
  { key: 'ielts2', label: 'IELTS Task 2', icon: FileText },
]

const TAB_CONFIG = {
  sentences: {
    title: 'بناء الجمل',
    subtitle: 'اكتب جملاً باللغة الإنجليزية واحصل على تقييم فوري',
    placeholder: 'اكتب 3-5 جمل باللغة الإنجليزية هنا...\n\nمثال:\nI went to the market yesterday to buy some vegetables. The weather was very nice and sunny. I met my friend there and we had a good conversation.',
    minLength: 20,
    assignmentType: 'sentence_building',
    prompts: [
      'صف يومك بالأمس',
      'اكتب عن هوايتك المفضلة',
      'صف مدينتك أو حيّك',
      'اكتب عن شخص تحبّه',
    ],
  },
  ielts1: {
    title: 'IELTS Task 1 — وصف الرسوم البيانية',
    subtitle: 'تدرّب على وصف البيانات والمقارنة بأسلوب أكاديمي',
    placeholder: 'اكتب 150 كلمة على الأقل تصف فيها الرسم البياني...\n\nمثال:\nThe bar chart illustrates the number of students enrolled in three different universities between 2015 and 2020. Overall, University A had the highest enrollment...',
    minLength: 80,
    assignmentType: 'ielts_task1',
    prompts: [
      'The chart shows internet usage across 5 countries from 2010 to 2020.',
      'The pie charts compare household spending in 2000 and 2020.',
      'The line graph shows temperature changes over 12 months in two cities.',
      'The table below gives data about student performance in 4 subjects.',
    ],
  },
  ielts2: {
    title: 'IELTS Task 2 — مقال رأي',
    subtitle: 'اكتب مقالاً أكاديمياً وعبّر عن رأيك مع الحجج',
    placeholder: 'اكتب 250 كلمة على الأقل...\n\nمثال:\nIn recent years, there has been a growing debate about whether technology improves or harms education. While some argue that digital tools distract students...',
    minLength: 120,
    assignmentType: 'ielts_task2',
    prompts: [
      'Some people think that the internet has made people more isolated. Do you agree or disagree?',
      'Education should be free for everyone. To what extent do you agree?',
      'Working from home has become more common. Discuss the advantages and disadvantages.',
      'Young people should spend more time on practical skills rather than academic subjects. Discuss.',
    ],
  },
}

export default function StudentWritingLab() {
  const [activeTab, setActiveTab] = useState('sentences')

  return (
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-violet-500/20">
          <PenLine size={22} className="text-violet-400" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-page-title" style={{ color: 'var(--text-primary)' }}>معمل الكتابة</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>تدرّب على الكتابة وحسّن مهاراتك بالذكاء الاصطناعي</p>
        </div>
      </motion.div>

      <SubTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} accent="sky" />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <WritingPanel config={TAB_CONFIG[activeTab]} tabKey={activeTab} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function WritingPanel({ config, tabKey }) {
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(null)
  const textareaRef = useRef(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  function applyPrompt(prompt) {
    setText('')
    setFeedback(null)
    setError('')
    if (textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.placeholder = prompt + '\n\nاكتب ردّك هنا...'
    }
  }

  function reset() {
    setText('')
    setFeedback(null)
    setError('')
    setRemaining(null)
    if (textareaRef.current) {
      textareaRef.current.placeholder = config.placeholder
    }
  }

  async function submitWriting() {
    if (text.trim().length < config.minLength) {
      setError(`النص قصير جداً — اكتب ${config.minLength} حرف على الأقل`)
      return
    }
    setLoading(true)
    setError('')
    setFeedback(null)

    try {
      const res = await invokeWithRetry('ai-writing-feedback', {
        body: { text: text.trim(), assignment_type: config.assignmentType },
      }, { timeoutMs: 45000 })

      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error)
        throw new Error(msg)
      }

      const result = res.data
      if (!result || typeof result !== 'object') throw new Error('استجابة غير صالحة')
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.feedback) {
        setFeedback(result.feedback)
      }
      if (result.remaining_this_month !== undefined) {
        setRemaining(result.remaining_this_month)
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ — حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Prompt suggestions */}
      <div className="space-y-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          <BookOpen size={12} className="inline ml-1" />
          اختر موضوعاً أو اكتب بحرية
        </p>
        <div className="flex flex-wrap gap-2">
          {config.prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => applyPrompt(prompt)}
              className="text-xs px-3 py-1.5 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
              style={{ background: 'var(--surface-raised)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              dir="ltr"
            >
              {prompt.length > 60 ? prompt.slice(0, 57) + '...' : prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Writing area */}
      <div className="fl-card-static overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{config.title}</h3>
          <span className="text-xs text-muted">{wordCount} كلمة</span>
        </div>
        <div className="px-5 pb-1">
          <p className="text-xs text-muted">{config.subtitle}</p>
        </div>
        <div className="px-5 py-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={config.placeholder}
            dir="ltr"
            rows={8}
            disabled={loading}
            className="fl-input w-full resize-none text-sm leading-relaxed"
            style={{ minHeight: '200px', fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <button
            onClick={submitWriting}
            disabled={loading || text.trim().length < 10}
            className="fl-btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                جاري التحليل...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                تحليل الكتابة
              </>
            )}
          </button>
          {(text || feedback) && (
            <button onClick={reset} className="btn-ghost text-sm py-2.5 px-4 flex items-center gap-2">
              <RotateCcw size={14} />
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3"
        >
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Feedback display */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score header */}
            <div className="fl-card-static p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                    <Sparkles size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>تقييم الذكاء الاصطناعي</h3>
                    <p className="text-xs text-muted">بناءً على تحليل كتابتك</p>
                  </div>
                </div>
                {feedback.fluency_score && (
                  <div className="flex flex-col items-center">
                    <div className={`text-2xl font-bold ${
                      feedback.fluency_score >= 8 ? 'text-emerald-400' :
                      feedback.fluency_score >= 5 ? 'text-sky-400' : 'text-amber-400'
                    }`}>
                      {feedback.fluency_score}<span className="text-sm text-muted">/10</span>
                    </div>
                    <span className="text-[10px] text-muted">درجة الطلاقة</span>
                  </div>
                )}
              </div>
              {feedback.overall_feedback && (
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feedback.overall_feedback}</p>
              )}
            </div>

            {/* Grammar errors */}
            {feedback.grammar_errors?.length > 0 && (
              <div className="fl-card-static p-5">
                <h4 className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle size={14} />
                  أخطاء نحوية ({feedback.grammar_errors.length})
                </h4>
                <div className="space-y-2">
                  {feedback.grammar_errors.map((e, i) => (
                    <div key={i} className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-base)' }}>
                      <div className="flex items-start gap-3 flex-wrap" dir="ltr">
                        <span className="text-red-400 line-through">{e.error}</span>
                        <span className="text-emerald-400">→ {e.correction}</span>
                      </div>
                      {e.rule && <p className="text-xs text-muted mt-1.5">{e.rule}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vocabulary suggestions */}
            {feedback.vocabulary_suggestions?.length > 0 && (
              <div className="fl-card-static p-5">
                <h4 className="text-xs font-semibold text-sky-400 mb-3 flex items-center gap-2">
                  <BookOpen size={14} />
                  اقتراحات مفردات ({feedback.vocabulary_suggestions.length})
                </h4>
                <div className="space-y-2">
                  {feedback.vocabulary_suggestions.map((v, i) => (
                    <div key={i} className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-base)' }}>
                      <div dir="ltr">
                        <span className="text-muted">{v.original}</span>
                        <span className="text-sky-400 font-medium"> → {v.better}</span>
                      </div>
                      {v.reason && <p className="text-xs text-muted mt-1.5">{v.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structure assessment */}
            {feedback.structure_assessment && (
              <div className="fl-card-static p-5">
                <h4 className="text-xs font-semibold text-gold-400 mb-2">تقييم البنية</h4>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feedback.structure_assessment}</p>
              </div>
            )}

            {/* Improvement tips */}
            {feedback.improvement_tips?.length > 0 && (
              <div className="fl-card-static p-5">
                <h4 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  نصائح للتحسين
                </h4>
                <ul className="space-y-2">
                  {feedback.improvement_tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {remaining !== null && (
              <p className="text-xs text-muted text-center py-2">
                متبقي {remaining} تحليل هذا الشهر
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
