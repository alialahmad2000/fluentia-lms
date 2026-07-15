// A single Tech Track lesson: intro → vocabulary (audio) → reading (tap-to-translate)
// → key phrases → comprehension quiz → speaking/writing task → mark complete.
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Volume2, Check, Loader2, Mic, PenLine } from 'lucide-react'
import { useTechLesson, useCompleteTechLesson } from './useTechTrack'
import TechPassage, { speak } from './TechPassage'
import TechQuiz from './TechQuiz'
import './techTrack.css'

function SectionH({ accent, children }) {
  return <div className="tt-section-h"><span className="tt-hbar" style={{ background: accent }} />{children}</div>
}

export default function TechLessonPage() {
  const { lessonSlug } = useParams()
  const { lesson, stage, done, score, isLoading } = useTechLesson(lessonSlug)
  const complete = useCompleteTechLesson()
  const [quizScore, setQuizScore] = useState(null)

  if (isLoading) {
    return <div className="tt-lp" dir="rtl"><div style={{ textAlign: 'center', color: 'var(--ds-text-tertiary)', padding: 60 }}><Loader2 className="animate-spin" size={30} /></div></div>
  }
  if (!lesson) {
    return (
      <div className="tt-lp" dir="rtl">
        <Link to="/tech" className="tt-back"><ArrowRight size={16} /> العودة إلى المسار</Link>
        <p style={{ color: 'var(--ds-text-secondary)' }}>لم يتم العثور على هذا الدرس.</p>
      </div>
    )
  }

  const accent = stage?.accent || '#38bdf8'
  const c = lesson.content || {}
  const task = c.task || null
  const isDone = done || complete.isSuccess
  const finalScore = complete.data?.score ?? quizScore ?? score

  const handleComplete = () => {
    if (isDone || complete.isPending) return
    complete.mutate({ lessonId: lesson.id, score: quizScore })
  }

  return (
    <div className="tt-lp" dir="rtl">
      <Link to="/tech" className="tt-back"><ArrowRight size={16} /> العودة إلى المسار</Link>

      <div className="tt-lp-head">
        {stage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: accent }}>{stage.title_ar}</span>
            {lesson.cefr && <span className="tt-cefr" style={{ margin: 0, color: accent, background: `${accent}1a`, border: `1px solid ${accent}44` }}>{lesson.cefr}</span>}
          </div>
        )}
        <h1 className="tt-lp-title">{lesson.title_ar}</h1>
        <div className="tt-lp-titleen">{lesson.title_en}</div>
        {isDone && <div className="tt-done-banner" style={{ marginTop: 12 }}><Check size={18} /> أتممتِ هذا الدرس{finalScore != null ? ` · ${finalScore}%` : ''}</div>}
      </div>

      {/* Intro */}
      {c.intro_ar && (
        <motion.div className="tt-section" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tt-card"><p className="tt-intro">{c.intro_ar}</p></div>
        </motion.div>
      )}

      {/* Vocabulary */}
      {Array.isArray(c.vocab) && c.vocab.length > 0 && (
        <div className="tt-section">
          <SectionH accent={accent}>المفردات</SectionH>
          <div className="tt-card">
            {c.vocab.map((v, i) => (
              <div className="tt-vrow" key={i}>
                <button className="tt-listen" style={{ borderColor: `${accent}66`, color: accent, background: `${accent}1a` }} onClick={() => speak(v.word)} aria-label={`listen ${v.word}`}>
                  <Volume2 size={18} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexWrap: 'wrap' }}>
                    <span className="tt-vword">{v.word}</span>
                    {v.ipa && <span className="tt-vipa">{v.ipa}</span>}
                    <span className="tt-vmean" style={{ color: accent, marginInlineStart: 8 }}>{v.meaning_ar}</span>
                  </div>
                  {v.meaning_en && <div className="tt-vmeanen">{v.meaning_en}</div>}
                  {v.example && <div className="tt-vex">{v.example}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reading */}
      {c.reading && Array.isArray(c.reading.paragraphs) && c.reading.paragraphs.length > 0 && (
        <div className="tt-section">
          <SectionH accent={accent}>القراءة · اضغطي أي كلمة مُظلَّلة لمعناها ونطقها</SectionH>
          <div className="tt-card">
            <TechPassage title_en={c.reading.title_en} paragraphs={c.reading.paragraphs} vocab={c.vocab} accent={accent} />
          </div>
        </div>
      )}

      {/* Key phrases */}
      {Array.isArray(c.key_phrases) && c.key_phrases.length > 0 && (
        <div className="tt-section">
          <SectionH accent={accent}>عبارات مفيدة</SectionH>
          <div className="tt-card">
            {c.key_phrases.map((p, i) => (
              <div className="tt-phrase" key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="tt-listen" style={{ borderColor: `${accent}66`, color: accent, background: `${accent}1a` }} onClick={() => speak(p.en)} aria-label="listen">
                    <Volume2 size={15} />
                  </button>
                  <span className="tt-phrase-en">{p.en}</span>
                </div>
                <span className="tt-phrase-ar">{p.ar}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz */}
      {Array.isArray(c.comprehension) && c.comprehension.length > 0 && (
        <div className="tt-section">
          <SectionH accent={accent}>اختبري فهمكِ</SectionH>
          <div className="tt-card">
            <TechQuiz questions={c.comprehension} accent={accent} onScore={setQuizScore} />
          </div>
        </div>
      )}

      {/* Task */}
      {task && (
        <div className="tt-section">
          <SectionH accent={accent}>{task.type === 'speaking' ? 'مهمة تحدّث' : 'مهمة كتابة'}</SectionH>
          <div className="tt-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: accent }}>
              {task.type === 'speaking' ? <Mic size={18} /> : <PenLine size={18} />}
            </div>
            {task.prompt_en && <p className="tt-task-prompt">{task.prompt_en}</p>}
            {task.prompt_ar && <p className="tt-task-ar">{task.prompt_ar}</p>}
            {task.guidance_ar && <p className="tt-task-guide">{task.guidance_ar}</p>}
          </div>
        </div>
      )}

      {/* Complete */}
      <div className="tt-section">
        {isDone ? (
          <Link to="/tech" className="tt-btn" style={{ background: accent, textDecoration: 'none', boxShadow: `0 12px 30px -10px ${accent}99` }}>
            العودة إلى المسار <ArrowRight size={18} />
          </Link>
        ) : (
          <button className="tt-btn" style={{ background: accent, boxShadow: `0 12px 30px -10px ${accent}99` }} onClick={handleComplete} disabled={complete.isPending}>
            {complete.isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
            إتمام الدرس
          </button>
        )}
        {complete.isError && <p style={{ color: '#f87171', fontSize: 13, textAlign: 'center', marginTop: 8 }}>تعذّر حفظ الإتمام، حاولي مرة أخرى.</p>}
      </div>
    </div>
  )
}
