import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Volume2, CheckCircle, XCircle, Lightbulb, MessageSquare, ChevronDown } from 'lucide-react'
import { supabase } from '../../../../lib/supabase'

const QUESTION_TYPE_LABELS = {
  main_idea: 'الفكرة الرئيسية',
  detail: 'تفاصيل',
  vocabulary: 'مفردات',
  inference: 'استنتاج',
}

const QUESTION_TYPE_COLORS = {
  main_idea: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  detail: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  vocabulary: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  inference: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

// ─── Main Component ─────────────────────────────────
export default function ReadingTab({ unitId }) {
  const [activeReading, setActiveReading] = useState(0)

  const { data: readings, isLoading } = useQuery({
    queryKey: ['unit-readings', unitId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_readings')
        .select('*')
        .eq('unit_id', unitId)
        .order('sort_order')
      if (error) throw error
      return data || []
    },
    enabled: !!unitId,
  })

  if (isLoading) return <ReadingSkeleton />

  if (!readings?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <BookOpen size={40} className="text-[var(--text-muted)]" />
        <p className="text-[var(--text-muted)] font-['Tajawal']">لا توجد قراءة لهذه الوحدة بعد</p>
      </div>
    )
  }

  const reading = readings[activeReading]

  return (
    <div className="space-y-5">
      {/* Sub-tabs for Reading A / B */}
      {readings.length > 1 && (
        <div className="flex gap-2">
          {readings.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveReading(i)}
              className={`px-5 h-10 rounded-xl text-sm font-bold border transition-colors font-['Tajawal'] ${
                activeReading === i
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              القراءة {r.reading_label || String.fromCharCode(65 + i)}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={reading.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <ReadingContent reading={reading} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Reading Content (passage + vocab + questions + critical thinking) ───
function ReadingContent({ reading }) {
  const { data: vocabulary } = useQuery({
    queryKey: ['reading-vocab', reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_vocabulary')
        .select('*')
        .eq('reading_id', reading.id)
        .order('sort_order')
      return data || []
    },
  })

  const { data: questions } = useQuery({
    queryKey: ['reading-questions', reading.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('curriculum_comprehension_questions')
        .select('*')
        .eq('reading_id', reading.id)
        .order('sort_order')
      return data || []
    },
  })

  const vocabMap = {}
  vocabulary?.forEach(v => {
    vocabMap[v.word.toLowerCase()] = v
  })

  return (
    <div className="space-y-6">
      {/* Before-Read Hero Image */}
      {reading.before_read_image_url && (
        <div className="rounded-2xl overflow-hidden border border-[var(--border-subtle)]">
          <img
            src={reading.before_read_image_url}
            alt={reading.title_en}
            className="w-full h-48 sm:h-56 object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Before You Read */}
      {reading.before_read_exercise_a && (
        <BeforeReadSection content={reading.before_read_exercise_a} />
      )}

      {/* Passage Title */}
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-['Inter']" dir="ltr">
          {reading.title_en}
        </h2>
        {reading.title_ar && (
          <p className="text-sm text-[var(--text-muted)] font-['Tajawal']">{reading.title_ar}</p>
        )}
      </div>

      {/* Audio button */}
      {reading.passage_audio_url && (
        <AudioButton url={reading.passage_audio_url} label="استمع للقراءة" />
      )}

      {/* Passage */}
      <PassageDisplay
        paragraphs={reading.passage_content?.paragraphs || []}
        vocabMap={vocabMap}
        wordCount={reading.passage_word_count}
      />

      {/* Vocabulary Box */}
      {vocabulary?.length > 0 && (
        <VocabularyBox vocabulary={vocabulary} />
      )}

      {/* Reading Skill */}
      {reading.reading_skill_name_en && (
        <ReadingSkillBox reading={reading} />
      )}

      {/* Comprehension Questions */}
      {questions?.length > 0 && (
        <ComprehensionSection questions={questions} />
      )}

      {/* Critical Thinking */}
      {reading.critical_thinking_prompt_en && (
        <CriticalThinkingBox reading={reading} />
      )}
    </div>
  )
}

// ─── Before Read Section ─────────────────────────────
function BeforeReadSection({ content }) {
  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold text-amber-400 font-['Tajawal']">قبل القراءة</h3>
      </div>
      <div className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">
        {typeof content === 'string' ? content : JSON.stringify(content)}
      </div>
    </div>
  )
}

// ─── Passage Display ─────────────────────────────────
function PassageDisplay({ paragraphs, vocabMap, wordCount }) {
  const [activeTooltip, setActiveTooltip] = useState(null)
  const tooltipTimeout = useRef(null)

  const showTooltip = useCallback((word) => {
    clearTimeout(tooltipTimeout.current)
    setActiveTooltip(word)
  }, [])

  const hideTooltip = useCallback(() => {
    tooltipTimeout.current = setTimeout(() => setActiveTooltip(null), 200)
  }, [])

  const renderParagraph = (text, pIdx) => {
    // Split by *word* patterns (vocab highlights)
    const parts = text.split(/\*([^*]+)\*/)
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a highlighted vocab word
        const vocab = vocabMap[part.toLowerCase()]
        if (vocab) {
          return (
            <span key={i} className="relative inline">
              <button
                onMouseEnter={() => showTooltip(`${pIdx}-${i}`)}
                onMouseLeave={hideTooltip}
                onClick={() => setActiveTooltip(prev => prev === `${pIdx}-${i}` ? null : `${pIdx}-${i}`)}
                className="text-sky-400 font-semibold border-b border-dotted border-sky-400/50 hover:border-sky-400 transition-colors cursor-pointer"
              >
                {part}
              </button>
              <AnimatePresence>
                {activeTooltip === `${pIdx}-${i}` && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    onMouseEnter={() => showTooltip(`${pIdx}-${i}`)}
                    onMouseLeave={hideTooltip}
                    className="absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-xl p-3 space-y-1.5 text-sm"
                    style={{
                      background: 'var(--surface-elevated, var(--surface-raised))',
                      border: '1px solid var(--border-subtle)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)] font-['Inter']">{vocab.word}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-['Inter']">{vocab.part_of_speech}</span>
                    </div>
                    <p className="text-[var(--text-secondary)] font-['Inter'] text-xs leading-relaxed">{vocab.definition_en}</p>
                    <p className="text-[var(--text-muted)] font-['Tajawal'] text-xs" dir="rtl">{vocab.definition_ar}</p>
                    {vocab.audio_url && <VocabAudioBtn url={vocab.audio_url} />}
                    {/* Arrow */}
                    <div
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                      style={{
                        background: 'var(--surface-elevated, var(--surface-raised))',
                        borderRight: '1px solid var(--border-subtle)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </span>
          )
        }
        // Vocab word not found in map — render bold
        return <strong key={i}>{part}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div
      className="rounded-2xl p-5 sm:p-7 space-y-0"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div dir="ltr" className="space-y-5">
        {paragraphs.map((para, idx) => (
          <div key={idx} className="flex gap-3">
            <div className="flex-shrink-0 mt-1.5">
              <div className="w-6 h-6 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center text-[11px] font-bold">
                {idx + 1}
              </div>
            </div>
            <p className="text-[16px] sm:text-[17px] leading-[1.85] text-[var(--text-primary)] font-['Inter']">
              {renderParagraph(para, idx)}
            </p>
          </div>
        ))}
      </div>
      {wordCount > 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-4 pt-3 font-['Tajawal']" style={{ borderTop: '1px solid var(--border-subtle)' }} dir="rtl">
          عدد الكلمات: {wordCount}
        </p>
      )}
    </div>
  )
}

// ─── Small audio button for vocab tooltip ────────────
function VocabAudioBtn({ url }) {
  const audioRef = useRef(null)
  const play = (e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }
  return (
    <button
      onClick={play}
      className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 transition-colors"
    >
      <Volume2 size={11} /> استمع
    </button>
  )
}

// ─── Audio Button ────────────────────────────────────
function AudioButton({ url, label }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const play = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); return }
    const a = new Audio(url)
    audioRef.current = a
    setPlaying(true)
    a.onended = () => { setPlaying(false); audioRef.current = null }
    a.play().catch(() => setPlaying(false))
  }
  return (
    <button
      onClick={play}
      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-medium transition-colors font-['Tajawal'] ${
        playing ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-[var(--surface-raised)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:text-sky-400'
      }`}
    >
      <Volume2 size={16} />
      {label}
    </button>
  )
}

// ─── Vocabulary Box ──────────────────────────────────
function VocabularyBox({ vocabulary }) {
  const [expanded, setExpanded] = useState(false)
  const audioRef = useRef(null)

  const playAudio = (url, e) => {
    e.stopPropagation()
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(url)
    audioRef.current.play().catch(() => {})
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-[rgba(255,255,255,0.02)]"
      >
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-400" />
          <span className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
            مفردات القراءة ({vocabulary.length})
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <div className="pt-3 space-y-2">
                {vocabulary.map(v => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg"
                    style={{ background: 'var(--surface-base)' }}
                  >
                    <div className="flex-1 min-w-0" dir="ltr">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--text-primary)] font-['Inter']">{v.word}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-['Inter']">{v.part_of_speech}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] font-['Inter'] mt-0.5">{v.definition_en}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">{v.definition_ar}</span>
                      {v.audio_url && (
                        <button
                          onClick={(e) => playAudio(v.audio_url, e)}
                          className="w-7 h-7 rounded-full bg-sky-500/15 text-sky-400 flex items-center justify-center hover:bg-sky-500/25 transition-colors flex-shrink-0"
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Comprehension Questions ─────────────────────────
function ComprehensionSection({ questions }) {
  const [answers, setAnswers] = useState({})
  const total = questions.length
  const answered = Object.keys(answers).length
  const correctCount = Object.values(answers).filter(a => a.correct).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-[var(--text-primary)] font-['Tajawal']">أسئلة الفهم</h3>
        {answered > 0 && (
          <span className="text-xs text-[var(--text-muted)] font-['Tajawal']">
            {correctCount}/{answered} صحيحة
          </span>
        )}
      </div>
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <MCQQuestion
            key={q.id}
            question={q}
            index={idx}
            answer={answers[q.id]}
            onAnswer={(ans) => setAnswers(prev => ({ ...prev, [q.id]: ans }))}
          />
        ))}
      </div>
      {answered === total && total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            background: correctCount === total ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.1)',
            border: `1px solid ${correctCount === total ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}`,
          }}
        >
          <CheckCircle size={20} className={correctCount === total ? 'text-emerald-400' : 'text-sky-400'} />
          <p className="text-sm font-medium font-['Tajawal']" style={{ color: correctCount === total ? '#34d399' : '#38bdf8' }}>
            {correctCount === total
              ? 'ممتاز! أجبت على جميع الأسئلة بشكل صحيح'
              : `أجبت على ${correctCount} من ${total} بشكل صحيح`
            }
          </p>
        </motion.div>
      )}
    </div>
  )
}

// ─── Single MCQ Question ─────────────────────────────
function MCQQuestion({ question, index, answer, onAnswer }) {
  const handleSelect = (choice) => {
    if (answer) return
    const correct = choice.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
    onAnswer({ selected: choice, correct })
  }

  const typeBadge = QUESTION_TYPE_LABELS[question.question_type] || question.question_type
  const typeColor = QUESTION_TYPE_COLORS[question.question_type] || QUESTION_TYPE_COLORS.detail

  return (
    <div
      className="rounded-xl p-4 sm:p-5 space-y-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${typeColor} font-['Tajawal']`}>
              {typeBadge}
            </span>
          </div>
          <p className="text-sm sm:text-[15px] font-medium text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">
            {question.question_en}
          </p>
          {question.question_ar && (
            <p className="text-xs text-[var(--text-muted)] font-['Tajawal']">{question.question_ar}</p>
          )}
        </div>
      </div>

      {/* Choices */}
      <div className="grid grid-cols-1 gap-2 mt-1">
        {question.choices?.map((choice, i) => {
          const isSelected = answer?.selected === choice
          const isCorrectAnswer = choice.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()
          const showCorrect = answer && isCorrectAnswer
          const showWrong = answer && isSelected && !answer.correct

          return (
            <button
              key={i}
              onClick={() => handleSelect(choice)}
              disabled={!!answer}
              dir="ltr"
              className={`text-start px-4 py-3 rounded-xl text-sm font-['Inter'] transition-all duration-200 border ${
                showCorrect
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : showWrong
                    ? 'bg-red-500/15 border-red-500/40 text-red-400'
                    : answer
                      ? 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-muted)] opacity-60'
                      : 'bg-[var(--surface-base)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-sky-500/40 hover:bg-sky-500/5 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{
                    background: showCorrect ? 'rgba(16,185,129,0.2)' : showWrong ? 'rgba(239,68,68,0.2)' : 'var(--surface-raised)',
                    color: showCorrect ? '#34d399' : showWrong ? '#f87171' : 'var(--text-muted)',
                  }}
                >
                  {showCorrect ? <CheckCircle size={14} /> : showWrong ? <XCircle size={14} /> : String.fromCharCode(65 + i)}
                </span>
                <span>{choice}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {answer && (question.explanation_en || question.explanation_ar) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="p-3.5 rounded-xl mt-1 space-y-1"
              style={{
                background: answer.correct ? 'rgba(16,185,129,0.06)' : 'rgba(56,189,248,0.06)',
                border: `1px solid ${answer.correct ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.15)'}`,
              }}
            >
              {question.explanation_en && (
                <p className="text-xs text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">
                  {question.explanation_en}
                </p>
              )}
              {question.explanation_ar && (
                <p className="text-xs text-[var(--text-muted)] font-['Tajawal']" dir="rtl">
                  {question.explanation_ar}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Reading Skill Box ───────────────────────────────
function ReadingSkillBox({ reading }) {
  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb size={16} className="text-amber-400" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] font-['Tajawal']">
          مهارة القراءة: <span className="font-['Inter']">{reading.reading_skill_name_en}</span>
          {reading.reading_skill_name_ar && ` — ${reading.reading_skill_name_ar}`}
        </h3>
      </div>
      {reading.reading_skill_explanation && (
        <p className="text-sm text-[var(--text-secondary)] font-['Inter'] leading-relaxed" dir="ltr">
          {reading.reading_skill_explanation}
        </p>
      )}
    </div>
  )
}

// ─── Critical Thinking Box ───────────────────────────
function CriticalThinkingBox({ reading }) {
  return (
    <div
      className="rounded-xl p-5 space-y-3"
      style={{
        background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(56,189,248,0.06))',
        border: '1px solid rgba(168,85,247,0.15)',
      }}
    >
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-purple-400" />
        <h3 className="text-sm font-bold text-purple-400 font-['Tajawal']">تفكير ناقد</h3>
      </div>
      <p className="text-sm text-[var(--text-primary)] font-['Inter'] leading-relaxed" dir="ltr">
        {reading.critical_thinking_prompt_en}
      </p>
      {reading.critical_thinking_prompt_ar && (
        <p className="text-sm text-[var(--text-muted)] font-['Tajawal']" dir="rtl">
          {reading.critical_thinking_prompt_ar}
        </p>
      )}
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────
function ReadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <div className="h-10 w-24 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        <div className="h-10 w-24 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
      </div>
      <div className="h-6 w-48 rounded-lg bg-[var(--surface-raised)] animate-pulse" />
      <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--surface-raised)' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.06)] animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-[rgba(255,255,255,0.06)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-[var(--surface-raised)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
