import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import {
  ChevronRight, ChevronLeft, AlertTriangle, Target, Play,
  Presentation, Eye, EyeOff, Lightbulb,
} from 'lucide-react'
import { useStepLesson, useStepLessonProgress } from '@/hooks/step/useStepCurriculum'
import { useG } from '@/i18n/gender'
import { Spinner, Empty, questionsAr } from './_ui/primitives'
import './_ui/hall.css'

const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']

/**
 * A single lesson: القاعدة → كيف تجي في ستيب → الفخ → أمثلة محلولة → تدرّب.
 *
 * Two audiences, one page. A student reads it alone; a teacher projects it in
 * class. «وضع العرض» enlarges the type and re-hides every worked example, so
 * the class attempts each question before the reasoning is revealed — a solved
 * example shown up-front teaches nobody.
 */
function Example({ ex, index, presenting }) {
  const [open, setOpen] = useState(!presenting)

  // useState only reads its initializer on MOUNT, and these are keyed on
  // item_id — so entering presentation mode used to enlarge the type while
  // leaving every answer on screen, which is the exact opposite of the point.
  // The mode change has to re-close them.
  useEffect(() => { setOpen(!presenting) }, [presenting])

  const answerIdx = ex.answer_index

  return (
    <div className="hall-panel" style={{ padding: 'calc(22px * var(--pz, 1))' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, marginBlockEnd: 14,
      }}>
        <span style={{
          fontFamily: 'var(--hall-display)', fontSize: 'calc(20px * var(--pz, 1))',
          color: 'var(--hall-gold)', lineHeight: 1,
        }}>{index + 1}</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="hall-btn2 hall-tap"
          style={{ padding: '10px 18px', fontSize: 13 }}
        >
          {open ? <EyeOff size={14} /> : <Eye size={14} />}
          {open ? 'إخفاء الحل' : 'عرض الحل'}
        </button>
      </div>

      <p dir="ltr" style={{
        margin: 0, marginBlockEnd: 16, fontSize: 'calc(15.5px * var(--pz, 1))', lineHeight: 1.75,
        textAlign: 'left', color: 'var(--hall-ink)',
      }}>{ex.stem}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--pz, 1))' }}>
        {(ex.choices ?? []).map((c, i) => {
          const isAnswer = open && i === answerIdx
          return (
            <div key={i} dir="ltr" style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              borderRadius: 12, padding: 'calc(11px * var(--pz, 1)) calc(14px * var(--pz, 1))',
              border: `1px solid ${isAnswer ? 'var(--hall-jade-line)' : 'var(--hall-line-2)'}`,
              background: isAnswer ? 'var(--hall-jade-wash)' : 'rgba(255,255,255,.03)',
            }}>
              <span style={{
                flexShrink: 0, width: 'calc(26px * var(--pz, 1))', height: 'calc(26px * var(--pz, 1))',
                borderRadius: 7, display: 'grid', placeItems: 'center',
                fontSize: 'calc(12.5px * var(--pz, 1))', fontWeight: 900,
                background: isAnswer ? 'var(--hall-jade)' : 'rgba(255,255,255,.05)',
                color: isAnswer ? '#04231C' : 'var(--hall-ink-3)',
                border: isAnswer ? 'none' : '1px solid var(--hall-line-2)',
              }}>{LETTERS[i] ?? i + 1}</span>
              <span style={{
                flex: 1, minWidth: 0, fontSize: 'calc(14px * var(--pz, 1))', lineHeight: 1.7,
                textAlign: 'left', color: 'var(--hall-ink)',
              }}>{c}</span>
            </div>
          )
        })}
      </div>

      {open && ex.why_ar && (
        <div style={{
          marginBlockStart: 16, borderRadius: 13,
          padding: 'calc(14px * var(--pz, 1)) calc(16px * var(--pz, 1))',
          background: 'var(--hall-gold-wash)', borderInlineStart: '3px solid var(--hall-gold)',
        }}>
          <p style={{
            margin: 0, fontSize: 'calc(13.5px * var(--pz, 1))', lineHeight: 2, color: 'var(--hall-ink)',
          }}>{ex.why_ar}</p>
        </div>
      )}
    </div>
  )
}

/** القاعدة / كيف تجي في ستيب / الفخ — three kinds of information, three geometries. */
function Block({ icon: Icon, label, tone, children }) {
  return (
    <section className={`hall-block ${tone}`}>
      <h2><Icon size={15} /> {label}</h2>
      <p>{children}</p>
    </section>
  )
}

export default function STEPLesson() {
  const g = useG()
  const { key } = useParams()
  const navigate = useNavigate()
  const [presenting, setPresenting] = useState(false)
  const { data: lesson, isLoading } = useStepLesson(key)
  const { data: progress } = useStepLessonProgress()

  // The nav rail and the student's own accuracy come off screen while
  // projecting — one student's percentage is not the room's business.
  useEffect(() => {
    document.body.classList.toggle('step-present', presenting)
    return () => document.body.classList.remove('step-present')
  }, [presenting])

  // prev/next sit at the very bottom of a long lesson, so without this a student
  // tapping «next» lands at the foot of the new lesson, past all the teaching.
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [key])

  if (isLoading) return <Spinner />
  if (!lesson) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Link to="/student/step/learn" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
          fontSize: 13, fontWeight: 700, color: 'var(--hall-ink-2)',
        }}><ChevronRight size={15} /> المنهج</Link>
        <Empty title="هذا الدرس غير متاح">
          يمكن يكون الدرس ما زال قيد الإعداد. الرجوع للمنهج واختيار درس آخر أسهل طريق.
        </Empty>
      </div>
    )
  }

  const p = progress?.[lesson.key]
  const pct = p?.accuracy != null ? Math.round(p.accuracy * 100) : null
  const examples = Array.isArray(lesson.examples) ? lesson.examples : []
  // The drill serves at most what the lesson actually has published.
  const drillCount = Math.min(10, lesson.item_count ?? 0)

  return (
    <div
      className="hall-lesson"
      style={{
        // One scale drives every size in the subtree. Per-element multipliers
        // topped out around 19px — unreadable from the back of a classroom.
        '--pz': presenting ? 1.85 : 1,
        display: 'flex', flexDirection: 'column', gap: 48, maxWidth: 900,
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, flexWrap: 'wrap',
      }}>
        <Link to="/student/step/learn" className="hall-tap" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none',
          fontSize: 13, fontWeight: 700, color: 'var(--hall-ink-2)',
          paddingInline: 4, marginInlineStart: -4,
        }}>
          <ChevronRight size={15} /> {lesson.topic?.title_ar || 'المنهج'}
        </Link>
        <button
          onClick={() => setPresenting((v) => !v)}
          className="hall-btn2 hall-tap"
          style={{ padding: '10px 18px', fontSize: 13 }}
        >
          <Presentation size={14} /> {presenting ? 'إنهاء وضع العرض' : 'وضع العرض'}
        </button>
      </div>

      <header>
        {lesson.position && (
          <span className="hall-kick">الدرس {lesson.position.at} من {lesson.position.of}</span>
        )}
        <h1 className="hall-h1" style={{
          marginBlock: '16px 0',
          fontSize: presenting ? 'clamp(34px,5vw,58px)' : undefined,
        }}>{lesson.title_ar}</h1>

        {/* Accuracy carries the same tone thresholds as the curriculum index —
            the identical number read as a neutral pill here and a rose alarm
            there. */}
        {pct != null && !presenting && (
          <div className="hall-panel" style={{
            marginBlockStart: 18, padding: '14px 20px',
            display: 'inline-flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap',
          }}>
            <b style={{
              fontFamily: 'var(--hall-display)', fontSize: 34,
              color: pct < 50 ? 'var(--hall-rose)' : pct >= 75 ? 'var(--hall-jade)' : 'var(--hall-gold-hi)',
            }}>{pct}٪</b>
            <span style={{ fontSize: 12.5, color: 'var(--hall-ink-2)' }}>
              دقّتك في هذه القاعدة · {questionsAr(p.attempts ?? 0)}
            </span>
          </div>
        )}
      </header>

      {/* The opener — what a teacher says aloud to start. It reduces the whole
          point to one question, so it leads; القاعدة then states the law. */}
      {lesson.teach_ar && (
        <p style={{
          margin: 0, fontFamily: 'var(--hall-display)',
          fontSize: 'calc(20px * var(--pz, 1))', lineHeight: 1.9,
          color: 'var(--hall-ink)', maxWidth: '60ch',
          borderInlineStart: '2px solid var(--hall-line)', paddingInlineStart: 22,
        }}>{lesson.teach_ar}</p>
      )}

      {lesson.rule_ar && <Block icon={Lightbulb} label="القاعدة" tone="rule">{lesson.rule_ar}</Block>}
      {lesson.in_step_ar && <Block icon={Target} label="كيف تجي في ستيب" tone="exam">{lesson.in_step_ar}</Block>}
      {lesson.trap_ar && <Block icon={AlertTriangle} label="الفخ" tone="trap">{lesson.trap_ar}</Block>}

      {examples.length > 0 && (
        <section>
          <h2 className="hall-lab">أمثلة محلولة</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {examples.map((ex, i) => (
              <Example key={ex.item_id ?? i} ex={ex} index={i} presenting={presenting} />
            ))}
          </div>
        </section>
      )}

      <div className="hall-panel hall-lesson-cta" style={{
        padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 18, flexWrap: 'wrap',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
            {p ? g('تدرّب مرة أخرى', 'تدرّبي مرة أخرى') : g('الآن جرّب بنفسك', 'الآن جرّبي بنفسك')}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.7, color: 'var(--hall-ink-2)' }}>
            {/* Three lessons hold fewer than ten published questions. Promising
                «عشرة أسئلة» there would be a claim the drill cannot honour. */}
            <span>{questionsAr(drillCount)} على هذه القاعدة وحدها</span>
            <span aria-hidden="true" style={{ opacity: 0.4, marginInline: 8 }}>—</span>
            <span>{questionsAr(lesson.item_count ?? 0)} في البنك</span>
          </p>
        </div>
        <button
          className="hall-btn hall-tap"
          onClick={() => navigate(`/student/step/exam?point=${encodeURIComponent(lesson.key)}`)}
        >
          <Play size={16} /> {g('ابدأ التدريب', 'ابدئي التدريب')}
        </button>
      </div>

      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
      }}>
        {lesson.prev ? (
          <Link to={`/student/step/learn/${encodeURIComponent(lesson.prev.key)}`}
            className="hall-btn2 hall-tap" style={{ textDecoration: 'none' }}>
            <ChevronRight size={15} /> {lesson.prev.title_ar}
          </Link>
        ) : <span />}
        {lesson.next && (
          <Link to={`/student/step/learn/${encodeURIComponent(lesson.next.key)}`}
            className="hall-btn2 hall-tap" style={{ textDecoration: 'none' }}>
            {lesson.next.title_ar} <ChevronLeft size={15} />
          </Link>
        )}
      </nav>
    </div>
  )
}
