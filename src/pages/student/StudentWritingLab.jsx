import { useState, useRef, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PenLine, Loader2, RotateCcw, Sparkles, CheckCircle2, AlertCircle,
  BookOpen, BarChart3, FileText, Lock, Zap, Clock, ChevronDown, ChevronUp,
  History, Award, Wand2, X, ArrowRight, TrendingUp, ShieldCheck,
} from 'lucide-react'
import SubTabs from '../../components/common/SubTabs'
import { invokeWithRetry } from '../../lib/invokeWithRetry'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import SuccessConfetti from '../../components/illustrations/SuccessConfetti'

// ─── Tabs ─────────────────────────────────────────────────
const TABS = [
  { key: 'sentences', label: 'تكوين الجمل', icon: PenLine },
  { key: 'ielts1', label: 'IELTS Task 1', icon: BarChart3 },
  { key: 'ielts2', label: 'IELTS Task 2', icon: FileText },
]

// ─── Arabic prompts for sentence building ─────────────────
const SENTENCE_PROMPTS = [
  { ar: 'اكتب جملة تصف يومك أمس', en: 'Describe your day yesterday' },
  { ar: 'اكتب عن هوايتك المفضلة', en: 'Write about your favorite hobby' },
  { ar: 'صف مدينتك أو حيّك', en: 'Describe your city or neighborhood' },
  { ar: 'اكتب عن شخص تحبّه', en: 'Write about someone you love' },
  { ar: 'ماذا تريد أن تفعل في المستقبل؟', en: 'What do you want to do in the future?' },
  { ar: 'صف وجبتك المفضلة', en: 'Describe your favorite meal' },
  { ar: 'اكتب عن رحلة قمت بها', en: 'Write about a trip you took' },
  { ar: 'ما رأيك في التعلم عبر الإنترنت؟', en: 'What do you think about online learning?' },
]

const IELTS1_PROMPTS = [
  'The bar chart shows internet usage across 5 countries from 2010 to 2020. Summarize the information by selecting and reporting the main features.',
  'The pie charts compare household spending in two different years: 2000 and 2020.',
  'The line graph illustrates temperature changes over 12 months in London and Dubai.',
  'The table below gives data about student performance in 4 different subjects across 3 schools.',
  'The diagram shows the process of making chocolate from cocoa beans.',
]

const IELTS2_PROMPTS = [
  'Some people think that the internet has made people more isolated. Do you agree or disagree?',
  'Education should be free for everyone at all levels. To what extent do you agree or disagree?',
  'Working from home has become increasingly common. Discuss the advantages and disadvantages.',
  'Young people should spend more time on practical skills rather than academic subjects. Discuss both views and give your opinion.',
  'Some believe that technology is making people less creative. To what extent do you agree?',
]

// ─── IELTS band score colors ──────────────────────────────
function bandColor(score) {
  if (score >= 7) return 'text-emerald-400'
  if (score >= 5.5) return 'text-sky-400'
  if (score >= 4) return 'text-amber-400'
  return 'text-red-400'
}
function bandBg(score) {
  if (score >= 7) return 'bg-emerald-500/10 border-emerald-500/20'
  if (score >= 5.5) return 'bg-sky-500/10 border-sky-500/20'
  if (score >= 4) return 'bg-amber-500/10 border-amber-500/20'
  return 'bg-red-500/10 border-red-500/20'
}
function scoreLabelColor(label) {
  if (label === 'ممتاز') return 'text-emerald-400 bg-emerald-500/10'
  if (label === 'جيد') return 'text-sky-400 bg-sky-500/10'
  return 'text-amber-400 bg-amber-500/10'
}

export default function StudentWritingLab() {
  const [activeTab, setActiveTab] = useState('sentences')
  const { studentData } = useAuthStore()

  // Check IELTS access
  const hasIELTSAccess = useMemo(() => {
    if (!studentData) return false
    return studentData.package === 'ielts' ||
      (Array.isArray(studentData.custom_access) && studentData.custom_access.includes('ielts_writing'))
  }, [studentData])

  const isIELTSTab = activeTab === 'ielts1' || activeTab === 'ielts2'

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
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>تدرّب على الكتابة واحصل على تصحيح فوري</p>
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
          {isIELTSTab && !hasIELTSAccess ? (
            <LockedIELTSPanel />
          ) : activeTab === 'sentences' ? (
            <SentenceBuildingPanel />
          ) : activeTab === 'ielts1' ? (
            <IELTSPanel taskType="ielts_task1" prompts={IELTS1_PROMPTS} title="IELTS Task 1 — وصف الرسوم البيانية" subtitle="تدرّب على وصف البيانات والمقارنة بأسلوب أكاديمي (150+ كلمة)" minWords={150} />
          ) : (
            <IELTSPanel taskType="ielts_task2" prompts={IELTS2_PROMPTS} title="IELTS Task 2 — مقال رأي" subtitle="اكتب مقالاً أكاديمياً وعبّر عن رأيك مع الحجج (250+ كلمة)" minWords={250} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// LOCKED IELTS PANEL
// ═══════════════════════════════════════════════════════════
function LockedIELTSPanel() {
  return (
    <div className="fl-card-static p-12 text-center relative overflow-hidden">
      {/* Glass overlay effect */}
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.2)' }} />
      <div className="relative z-10">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-5 ring-1 ring-amber-500/20">
          <Lock size={28} className="text-amber-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          هذا القسم متاح لباقة آيلتس
        </h3>
        <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-tertiary)' }}>
          تواصل مع المدرب لترقية باقتك أو الحصول على صلاحية الوصول لتدريبات كتابة آيلتس
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-xs" style={{ color: 'var(--text-tertiary)' }}>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
            <Award size={14} className="text-amber-400" /> تقييم بمعايير آيلتس الرسمية
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
            <BarChart3 size={14} className="text-sky-400" /> درجة Band Score تقديرية
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface-raised)' }}>
            <FileText size={14} className="text-violet-400" /> تقييم فقرة بفقرة
          </span>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SENTENCE BUILDING PANEL
// ═══════════════════════════════════════════════════════════
function SentenceBuildingPanel() {
  const { profile } = useAuthStore()
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [activePrompt, setActivePrompt] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [correction, setCorrection] = useState(null)
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const textareaRef = useRef(null)

  const charCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  // Sentence history
  const { data: history } = useQuery({
    queryKey: ['writing-history', profile?.id, 'sentence_building'],
    queryFn: async () => {
      const { data } = await supabase
        .from('writing_history')
        .select('id, original_text, feedback, fluency_score, xp_earned, created_at, prompt_used')
        .eq('student_id', profile?.id)
        .eq('task_type', 'sentence_building')
        .order('created_at', { ascending: false })
        .limit(10)
      return data || []
    },
    enabled: !!profile?.id,
  })

  function selectPrompt(prompt) {
    setActivePrompt(prompt)
    setText('')
    setFeedback(null)
    setError('')
    if (textareaRef.current) textareaRef.current.focus()
  }

  function reset() {
    setText('')
    setFeedback(null)
    setError('')
    setXpEarned(0)
    setActivePrompt(null)
    setShowConfetti(false)
    setCorrection(null)
  }

  async function requestAICorrection() {
    if (charCount < 20) {
      setError('النص قصير جداً — اكتب 20 حرف على الأقل')
      return
    }
    setCorrectionLoading(true)
    setError('')
    setCorrection(null)
    try {
      const res = await invokeWithRetry('correct-writing', {
        body: {
          text: text.trim(),
          task_type: 'sentence_building',
          level: profile?.level || 'intermediate',
        },
      }, { timeoutMs: 45000 })
      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error)
        throw new Error(msg)
      }
      const result = res.data
      if (!result || typeof result !== 'object') throw new Error('استجابة غير صالحة')
      if (result.error) { setError(result.error); return }
      setCorrection(result)
    } catch (err) {
      setError(err.message || 'حدث خطأ — حاول مرة أخرى')
    } finally {
      setCorrectionLoading(false)
    }
  }

  async function submitWriting() {
    if (charCount < 20) {
      setError('النص قصير جداً — اكتب 20 حرف على الأقل')
      return
    }
    setLoading(true)
    setError('')
    setFeedback(null)
    setXpEarned(0)

    try {
      const res = await invokeWithRetry('evaluate-writing', {
        body: {
          text: text.trim(),
          task_type: 'sentence_building',
          prompt_used: activePrompt?.ar || null,
        },
      }, { timeoutMs: 45000 })

      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error)
        throw new Error(msg)
      }

      const result = res.data
      if (!result || typeof result !== 'object') throw new Error('استجابة غير صالحة')
      if (result.error) { setError(result.error); return }

      if (result.feedback) {
        setFeedback(result.feedback)
        if (result.xp_earned) {
          setXpEarned(result.xp_earned)
          setShowConfetti(true)
        }
      }
      if (result.remaining !== undefined && result.remaining !== null) {
        setRemaining(result.remaining)
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ — حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      <SuccessConfetti trigger={showConfetti} />

      {/* Arabic prompts */}
      <div className="space-y-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          <BookOpen size={12} className="inline ml-1" />
          اختر موضوعاً أو اكتب بحرية
        </p>
        <div className="flex flex-wrap gap-2">
          {SENTENCE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => selectPrompt(prompt)}
              className={`text-xs px-3 py-2 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer ${
                activePrompt?.ar === prompt.ar ? 'ring-1 ring-sky-500/30' : ''
              }`}
              style={{
                background: activePrompt?.ar === prompt.ar ? 'var(--accent-sky-glow)' : 'var(--surface-raised)',
                color: activePrompt?.ar === prompt.ar ? 'var(--accent-sky)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {prompt.ar}
            </button>
          ))}
        </div>
      </div>

      {/* Active prompt display */}
      {activePrompt && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-4"
          style={{ background: 'var(--accent-sky-glow)', border: '1px solid rgba(56,189,248,0.15)' }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--accent-sky)' }}>{activePrompt.ar}</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }} dir="ltr">{activePrompt.en}</p>
        </motion.div>
      )}

      {/* Writing area */}
      <div className="fl-card-static overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>تكوين الجمل</h3>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>{charCount} حرف</span>
            <span>{wordCount} كلمة</span>
          </div>
        </div>
        <div className="px-5 py-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب جملك باللغة الإنجليزية هنا..."
            dir="ltr"
            rows={6}
            disabled={loading}
            className="fl-input w-full resize-none text-sm leading-relaxed"
            style={{ minHeight: '160px', fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <button
            onClick={submitWriting}
            disabled={loading || charCount < 10}
            className="fl-btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> جاري التحليل...</>
            ) : (
              <><Sparkles size={16} /> تحليل الكتابة</>
            )}
          </button>
          <button
            onClick={requestAICorrection}
            disabled={correctionLoading || charCount < 10}
            className="text-sm py-2.5 px-5 flex items-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))',
              color: 'var(--accent-sky)',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {correctionLoading ? (
              <><Loader2 size={16} className="animate-spin" /> جاري التصحيح...</>
            ) : (
              <><Wand2 size={16} /> تصحيح تلقائي</>
            )}
          </button>
          {(text || feedback) && (
            <button onClick={reset} className="btn-ghost text-sm py-2.5 px-4 flex items-center gap-2 cursor-pointer">
              <RotateCcw size={14} /> مسح
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </motion.div>
      )}

      {/* AI Correction Results */}
      <AnimatePresence>
        {correction && <AICorrectionResults result={correction} onClose={() => setCorrection(null)} />}
      </AnimatePresence>

      {/* XP notification */}
      {xpEarned > 0 && feedback && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 py-2"
        >
          <Zap size={16} className="text-amber-400" />
          <span className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>+{xpEarned} XP</span>
        </motion.div>
      )}

      {/* Sentence feedback display */}
      <AnimatePresence>
        {feedback && <SentenceFeedback feedback={feedback} />}
      </AnimatePresence>

      {remaining !== null && (
        <p className="text-xs text-muted text-center py-1">متبقي {remaining} تقييم هذا الشهر</p>
      )}

      {/* Sentence History */}
      {history?.length > 0 && (
        <div className="fl-card-static overflow-hidden">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full px-5 py-4 flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <History size={16} className="text-violet-400" />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>سجل الجمل السابقة ({history.length})</span>
            </div>
            {showHistory ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
          </button>
          {showHistory && (
            <div className="px-5 pb-4 space-y-3 max-h-[400px] overflow-y-auto">
              {history.map((item) => (
                <div key={item.id} className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                  <p className="text-xs text-muted mb-1" dir="ltr">
                    <Clock size={10} className="inline mr-1" />
                    {new Date(item.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {item.fluency_score && <span className="mr-2 font-bold" style={{ color: 'var(--accent-sky)' }}>{item.fluency_score}/10</span>}
                    {item.xp_earned && <span className="mr-2 text-amber-400">+{item.xp_earned} XP</span>}
                  </p>
                  <p className="text-xs truncate" dir="ltr" style={{ color: 'var(--text-secondary)' }}>{item.original_text}</p>
                  {item.prompt_used && <p className="text-[10px] text-muted mt-1">{item.prompt_used}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sentence Feedback Display ────────────────────────────
function SentenceFeedback({ feedback }) {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Score + overall */}
      <div className="fl-card-static p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Sparkles size={18} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>التقييم المفصّل</h3>
              {feedback.vocabulary_level && (
                <span className="text-[10px] text-muted">مستوى المفردات: {feedback.vocabulary_level}</span>
              )}
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
        {feedback.overall_feedback_ar && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feedback.overall_feedback_ar}</p>
        )}
      </div>

      {/* Corrected text (suggested version) */}
      {feedback.suggested_version && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-2">
            <CheckCircle2 size={14} /> النسخة المحسّنة
          </h4>
          <p className="text-sm leading-relaxed p-3 rounded-lg" dir="ltr"
            style={{ background: 'var(--success-bg)', color: 'var(--text-primary)', border: '1px solid var(--success-border)' }}>
            {feedback.suggested_version}
          </p>
        </div>
      )}

      {/* Grammar errors with Arabic explanations */}
      {feedback.grammar_errors?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle size={14} /> أخطاء نحوية ({feedback.grammar_errors.length})
          </h4>
          <div className="space-y-2">
            {feedback.grammar_errors.map((e, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface-base)' }}>
                <div className="flex items-start gap-3 flex-wrap text-sm" dir="ltr">
                  <span className="text-red-400 line-through bg-red-500/5 px-1.5 py-0.5 rounded">{e.error}</span>
                  <span className="text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded">→ {e.correction}</span>
                </div>
                {e.rule_ar && <p className="text-xs text-muted mt-2">{e.rule_ar}</p>}
                {e.rule && !e.rule_ar && <p className="text-xs text-muted mt-2">{e.rule}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vocabulary suggestions */}
      {feedback.vocabulary_suggestions?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <BookOpen size={14} /> اقتراحات مفردات
          </h4>
          <div className="space-y-2">
            {feedback.vocabulary_suggestions.map((v, i) => (
              <div key={i} className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-base)' }}>
                <div dir="ltr">
                  <span className="text-muted">{v.original}</span>
                  <span className="text-sky-400 font-medium"> → {v.better}</span>
                </div>
                {(v.reason_ar || v.reason) && <p className="text-xs text-muted mt-1.5">{v.reason_ar || v.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement tips */}
      {feedback.improvement_tips_ar?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 size={14} /> نصائح للتحسين
          </h4>
          <ul className="space-y-2">
            {feedback.improvement_tips_ar.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════
// IELTS PANEL (Task 1 & Task 2)
// ═══════════════════════════════════════════════════════════
function IELTSPanel({ taskType, prompts, title, subtitle, minWords }) {
  const { profile } = useAuthStore()
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState(null)
  const [xpEarned, setXpEarned] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)
  const [selectedPrompt, setSelectedPrompt] = useState(null)
  const [correction, setCorrection] = useState(null)
  const [correctionLoading, setCorrectionLoading] = useState(false)
  const textareaRef = useRef(null)

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const charCount = text.length

  function selectPrompt(prompt) {
    setSelectedPrompt(prompt)
    setText('')
    setFeedback(null)
    setError('')
    if (textareaRef.current) textareaRef.current.focus()
  }

  function reset() {
    setText('')
    setFeedback(null)
    setError('')
    setXpEarned(0)
    setSelectedPrompt(null)
    setShowConfetti(false)
    setCorrection(null)
  }

  async function requestAICorrection() {
    if (wordCount < Math.floor(minWords * 0.4)) {
      setError(`النص قصير جداً — اكتب المزيد قبل طلب التصحيح`)
      return
    }
    setCorrectionLoading(true)
    setError('')
    setCorrection(null)
    try {
      const res = await invokeWithRetry('correct-writing', {
        body: {
          text: text.trim(),
          task_type: taskType,
          level: profile?.level || 'intermediate',
        },
      }, { timeoutMs: 60000 })
      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error)
        throw new Error(msg)
      }
      const result = res.data
      if (!result || typeof result !== 'object') throw new Error('استجابة غير صالحة')
      if (result.error) { setError(result.error); return }
      setCorrection(result)
    } catch (err) {
      setError(err.message || 'حدث خطأ — حاول مرة أخرى')
    } finally {
      setCorrectionLoading(false)
    }
  }

  async function submitWriting() {
    if (wordCount < Math.floor(minWords * 0.6)) {
      setError(`النص قصير جداً — اكتب ${minWords} كلمة على الأقل (الحد الأدنى ${Math.floor(minWords * 0.6)} كلمة للتقييم)`)
      return
    }
    setLoading(true)
    setError('')
    setFeedback(null)
    setXpEarned(0)

    try {
      const res = await invokeWithRetry('evaluate-writing', {
        body: {
          text: text.trim(),
          task_type: taskType,
          prompt_used: selectedPrompt || null,
        },
      }, { timeoutMs: 60000 })

      if (res.error) {
        const msg = typeof res.error === 'object' ? (res.error.message || JSON.stringify(res.error)) : String(res.error)
        throw new Error(msg)
      }

      const result = res.data
      if (!result || typeof result !== 'object') throw new Error('استجابة غير صالحة')
      if (result.error) { setError(result.error); return }

      if (result.feedback) {
        setFeedback(result.feedback)
        if (result.xp_earned) {
          setXpEarned(result.xp_earned)
          setShowConfetti(true)
        }
      }
      if (result.remaining !== undefined && result.remaining !== null) {
        setRemaining(result.remaining)
      }
    } catch (err) {
      setError(err.message || 'حدث خطأ — حاول مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 relative">
      <SuccessConfetti trigger={showConfetti} />

      {/* IELTS Prompts */}
      <div className="space-y-2">
        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          <BookOpen size={12} className="inline ml-1" />
          اختر سؤالاً للتدريب
        </p>
        <div className="space-y-2">
          {prompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => selectPrompt(prompt)}
              className={`w-full text-start text-xs px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                selectedPrompt === prompt ? 'ring-1 ring-sky-500/30' : ''
              }`}
              style={{
                background: selectedPrompt === prompt ? 'var(--accent-sky-glow)' : 'var(--surface-raised)',
                color: selectedPrompt === prompt ? 'var(--accent-sky)' : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
              dir="ltr"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Writing area */}
      <div className="fl-card-static overflow-hidden">
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className={wordCount >= minWords ? 'text-emerald-400' : 'text-muted'}>{wordCount}/{minWords} كلمة</span>
          </div>
        </div>
        <div className="px-5 pb-1">
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <div className="px-5 py-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={selectedPrompt ? `Question: ${selectedPrompt}\n\nWrite your response here...` : 'Select a question above, then write your response here...'}
            dir="ltr"
            rows={12}
            disabled={loading}
            className="fl-input w-full resize-none text-sm leading-relaxed"
            style={{ minHeight: '280px', fontFamily: "'Inter', sans-serif" }}
          />
        </div>
        <div className="px-5 pb-4 flex items-center gap-3">
          <button
            onClick={submitWriting}
            disabled={loading || wordCount < Math.floor(minWords * 0.6)}
            className="fl-btn-primary text-sm py-2.5 px-6 flex items-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> جاري التقييم...</>
            ) : (
              <><Sparkles size={16} /> تقييم بمعايير آيلتس</>
            )}
          </button>
          <button
            onClick={requestAICorrection}
            disabled={correctionLoading || wordCount < Math.floor(minWords * 0.4)}
            className="text-sm py-2.5 px-5 flex items-center gap-2 rounded-xl font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))',
              color: 'var(--accent-sky)',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            {correctionLoading ? (
              <><Loader2 size={16} className="animate-spin" /> جاري التصحيح...</>
            ) : (
              <><Wand2 size={16} /> تصحيح تلقائي</>
            )}
          </button>
          {(text || feedback) && (
            <button onClick={reset} className="btn-ghost text-sm py-2.5 px-4 flex items-center gap-2 cursor-pointer">
              <RotateCcw size={14} /> مسح
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          <AlertCircle size={16} className="shrink-0" /> {error}
        </motion.div>
      )}

      {/* AI Correction Results */}
      <AnimatePresence>
        {correction && <AICorrectionResults result={correction} onClose={() => setCorrection(null)} isIELTS />}
      </AnimatePresence>

      {/* XP */}
      {xpEarned > 0 && feedback && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 py-2">
          <Zap size={16} className="text-amber-400" />
          <span className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>+{xpEarned} XP</span>
        </motion.div>
      )}

      {/* IELTS Feedback */}
      <AnimatePresence>
        {feedback && <IELTSFeedback feedback={feedback} taskType={taskType} />}
      </AnimatePresence>

      {remaining !== null && (
        <p className="text-xs text-muted text-center py-1">متبقي {remaining} تقييم هذا الشهر</p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// AI CORRECTION RESULTS (correct-writing edge function)
// ═══════════════════════════════════════════════════════════
const ERROR_TYPE_META = {
  grammar:      { label: 'نحوي', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
  spelling:     { label: 'إملائي', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  vocabulary:   { label: 'مفردات', color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
  punctuation:  { label: 'ترقيم', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  style:        { label: 'أسلوب', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
}

function AICorrectionResults({ result, onClose, isIELTS = false }) {
  const [showAllErrors, setShowAllErrors] = useState(false)

  const score = result.overall_score ?? null
  const errors = result.errors || []
  const strengths = result.strengths || []
  const improvements = result.improvements || []
  const ieltsScores = result.ielts_scores || null

  // Group errors by type
  const groupedErrors = useMemo(() => {
    const groups = {}
    errors.forEach(e => {
      const type = e.type || 'grammar'
      if (!groups[type]) groups[type] = []
      groups[type].push(e)
    })
    return groups
  }, [errors])

  // Score color
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-sky-400' : score >= 40 ? 'text-amber-400' : 'text-red-400'
  const scoreTrack = score >= 80 ? 'stroke-emerald-500' : score >= 60 ? 'stroke-sky-500' : score >= 40 ? 'stroke-amber-500' : 'stroke-red-500'
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - ((score || 0) / 100) * circumference

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="fl-card-static p-5">
        <div className="card-top-line shimmer" />
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(59,130,246,0.15))' }}>
              <Wand2 size={18} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>التصحيح المفصّل</h3>
              <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>تحليل وتصحيح تفصيلي للنص</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer" style={{ color: 'var(--text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Score circle + feedback */}
        <div className="flex items-center gap-6">
          {score !== null && (
            <div className="relative shrink-0">
              <svg width="96" height="96" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
                <circle
                  cx="48" cy="48" r={radius} fill="none" strokeWidth="6"
                  className={scoreTrack}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 48 48)"
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-bold ${scoreColor}`}>{score}</span>
                <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>/ 100</span>
              </div>
            </div>
          )}
          <div className="flex-1 space-y-2">
            {result.feedback_ar && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{result.feedback_ar}</p>
            )}
            {result.feedback_en && (
              <p className="text-xs leading-relaxed" dir="ltr" style={{ color: 'var(--text-tertiary)' }}>{result.feedback_en}</p>
            )}
          </div>
        </div>
      </div>

      {/* Corrected text with diff highlight */}
      {result.corrected_text && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 size={14} /> النص المصحّح
          </h4>
          <p className="text-sm leading-relaxed p-4 rounded-xl whitespace-pre-wrap" dir="ltr"
            style={{ background: 'var(--success-bg)', color: 'var(--text-primary)', border: '1px solid var(--success-border)', fontFamily: "'Inter', sans-serif" }}>
            {result.corrected_text}
          </p>
        </div>
      )}

      {/* Errors grouped by type */}
      {errors.length > 0 && (
        <div className="fl-card-static p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-red-400 flex items-center gap-2">
              <AlertCircle size={14} /> الأخطاء ({errors.length})
            </h4>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(groupedErrors).map(([type, errs]) => {
                const meta = ERROR_TYPE_META[type] || ERROR_TYPE_META.grammar
                return (
                  <span key={type} className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                    {meta.label} ({errs.length})
                  </span>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            {(showAllErrors ? errors : errors.slice(0, 5)).map((e, i) => {
              const meta = ERROR_TYPE_META[e.type] || ERROR_TYPE_META.grammar
              return (
                <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-sm" dir="ltr">
                    <span className="text-red-400 line-through bg-red-500/5 px-1.5 py-0.5 rounded">{e.original}</span>
                    <ArrowRight size={12} className="text-muted shrink-0" />
                    <span className="text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded">{e.corrected}</span>
                  </div>
                  {e.explanation_ar && <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>{e.explanation_ar}</p>}
                </div>
              )
            })}
            {errors.length > 5 && !showAllErrors && (
              <button
                onClick={() => setShowAllErrors(true)}
                className="w-full text-center text-xs py-2 rounded-lg cursor-pointer transition-colors"
                style={{ color: 'var(--accent-sky)', background: 'var(--surface-base)' }}
              >
                عرض جميع الأخطاء ({errors.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <ShieldCheck size={14} /> نقاط القوة
          </h4>
          <ul className="space-y-2">
            {strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {improvements.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <TrendingUp size={14} /> نصائح للتحسين
          </h4>
          <ul className="space-y-2">
            {improvements.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <ArrowRight size={14} className="text-sky-400 mt-0.5 shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* IELTS Band Scores */}
      {isIELTS && ieltsScores && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Award size={14} className="text-amber-400" /> IELTS Band Scores
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ieltsScores).map(([key, value]) => {
              const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              const numValue = typeof value === 'number' ? value : parseFloat(value)
              return (
                <div key={key} className={`rounded-xl p-3 border ${bandBg(numValue)}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                    <span className={`text-lg font-bold ${bandColor(numValue)}`}>{value}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

// ─── IELTS Feedback Display ───────────────────────────────
function IELTSFeedback({ feedback, taskType }) {
  const [showCorrected, setShowCorrected] = useState(false)

  // IELTS 4 criteria (Task 1 uses task_achievement, Task 2 uses task_response)
  const criteria = [
    { key: taskType === 'ielts_task1' ? 'task_achievement' : 'task_response', label: taskType === 'ielts_task1' ? 'Task Achievement' : 'Task Response', label_ar: 'تحقيق المهمة' },
    { key: 'coherence_cohesion', label: 'Coherence & Cohesion', label_ar: 'الترابط والتماسك' },
    { key: 'lexical_resource', label: 'Lexical Resource', label_ar: 'الثروة اللفظية' },
    { key: 'grammatical_range', label: 'Grammatical Range & Accuracy', label_ar: 'المدى النحوي والدقة' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Band Score Hero */}
      <div className="fl-card-static p-6 text-center">
        <div className="card-top-line shimmer" />
        <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-tertiary)' }}>IELTS Band Score التقديرية</p>
        <div className={`text-5xl font-bold mb-2 ${bandColor(feedback.band_score || 0)}`}>
          {feedback.band_score || '—'}
        </div>
        <div className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${bandBg(feedback.band_score || 0)}`}>
          {feedback.band_score >= 7 ? 'ممتاز' : feedback.band_score >= 5.5 ? 'جيد' : feedback.band_score >= 4 ? 'مقبول' : 'يحتاج تحسين'}
        </div>
        {feedback.word_count && (
          <p className="text-xs text-muted mt-2">عدد الكلمات: {feedback.word_count}</p>
        )}
      </div>

      {/* 4 IELTS Criteria */}
      <div className="grid grid-cols-2 gap-3">
        {criteria.map(({ key, label, label_ar }) => {
          const c = feedback[key]
          if (!c) return null
          return (
            <div key={key} className="fl-card-static p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
                <span className={`text-lg font-bold ${bandColor(c.score)}`}>{c.score}</span>
              </div>
              <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label_ar}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{c.feedback_ar}</p>
            </div>
          )
        })}
      </div>

      {/* Overall feedback */}
      {feedback.overall_feedback_ar && (
        <div className="fl-card-static p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-violet-400" />
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>التقييم العام</h4>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feedback.overall_feedback_ar}</p>
        </div>
      )}

      {/* Paragraph-by-paragraph feedback */}
      {feedback.paragraph_feedback?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FileText size={14} className="text-sky-400" /> تقييم فقرة بفقرة
          </h4>
          <div className="space-y-3">
            {feedback.paragraph_feedback.map((pf, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium" dir="ltr" style={{ color: 'var(--text-primary)' }}>
                    {pf.paragraph?.length > 80 ? pf.paragraph.slice(0, 77) + '...' : pf.paragraph}
                  </p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${scoreLabelColor(pf.score_label)}`}>
                    {pf.score_label}
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{pf.feedback_ar}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Corrected text */}
      {feedback.corrected_text && (
        <div className="fl-card-static overflow-hidden">
          <button
            onClick={() => setShowCorrected(!showCorrected)}
            className="w-full px-5 py-4 flex items-center justify-between cursor-pointer"
          >
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={14} /> النسخة المصححة
            </span>
            {showCorrected ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
          </button>
          {showCorrected && (
            <div className="px-5 pb-4">
              <p className="text-sm leading-relaxed p-4 rounded-xl" dir="ltr"
                style={{ background: 'var(--success-bg)', color: 'var(--text-primary)', border: '1px solid var(--success-border)' }}>
                {feedback.corrected_text}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grammar errors */}
      {feedback.grammar_errors?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-red-400 mb-3 flex items-center gap-2">
            <AlertCircle size={14} /> أخطاء نحوية ({feedback.grammar_errors.length})
          </h4>
          <div className="space-y-2">
            {feedback.grammar_errors.map((e, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: 'var(--surface-base)' }}>
                <div className="flex items-start gap-3 flex-wrap text-sm" dir="ltr">
                  <span className="text-red-400 line-through bg-red-500/5 px-1.5 py-0.5 rounded">{e.error}</span>
                  <span className="text-emerald-400 bg-emerald-500/5 px-1.5 py-0.5 rounded">→ {e.correction}</span>
                </div>
                {(e.rule_ar || e.rule) && <p className="text-xs text-muted mt-2">{e.rule_ar || e.rule}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vocabulary suggestions */}
      {feedback.vocabulary_suggestions?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-sky-400 mb-3 flex items-center gap-2">
            <BookOpen size={14} /> اقتراحات مفردات
          </h4>
          <div className="space-y-2">
            {feedback.vocabulary_suggestions.map((v, i) => (
              <div key={i} className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-base)' }}>
                <div dir="ltr">
                  <span className="text-muted">{v.original}</span>
                  <span className="text-sky-400 font-medium"> → {v.better}</span>
                </div>
                {(v.reason_ar || v.reason) && <p className="text-xs text-muted mt-1.5">{v.reason_ar || v.reason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Improvement tips */}
      {feedback.improvement_tips_ar?.length > 0 && (
        <div className="fl-card-static p-5">
          <h4 className="text-xs font-semibold text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 size={14} /> نصائح للتحسين
          </h4>
          <ul className="space-y-2">
            {feedback.improvement_tips_ar.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 shrink-0" /> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  )
}
