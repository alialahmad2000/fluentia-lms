import { Link } from 'react-router-dom'
import { BookOpen, ChevronLeft, Check, Play } from 'lucide-react'
import { useStepTopics, useStepLessonProgress } from '@/hooks/step/useStepCurriculum'
import { useG } from '@/i18n/gender'
import { Spinner, Empty, ScoreRing, questionsAr, lessonsAr, topicsAr } from './_ui/primitives'
import './_ui/hall.css'

/**
 * «المنهج» — the teaching entrance to the bank.
 *
 * A student (or a teacher in class) works down the topics, and each lesson
 * teaches before it tests. The exam stays available separately for anyone who
 * only wants to sit a paper.
 *
 * Built as topic LEDGERS rather than a card grid: a grid of equal cards said
 * nothing about sequence or weight, left ragged rows wherever a topic held one
 * lesson, and gave the page no focal point. Ledger rows carry an ordinal, the
 * student's own accuracy, and a per-topic meter — so the page reads as a map of
 * where they stand, not a menu.
 */
export default function STEPCurriculum() {
  const g = useG()
  const { data: topics, isLoading } = useStepTopics()
  const { data: progress } = useStepLessonProgress()

  if (isLoading) return <Spinner />
  if (!topics?.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <h1 className="hall-h1">المنهج</h1>
        <Empty title="المنهج قيد الإعداد">
          نرتّب الآن أسئلة البنك في دروس مشروحة. أول ما تجهز بتظهر هنا.
        </Empty>
      </div>
    )
  }

  const allLessons = topics.flatMap((t) => t.lessons)
  const totalLessons = allLessons.length
  // Count only lessons that are actually ON the curriculum. Counting every row
  // in step_student_progress with a grammar_point includes unpublished and
  // fallback points, which made «تدرّبت على ٩ من ٦» reachable.
  const studied = allLessons.filter((l) => progress?.[l.key]).length
  const pct = totalLessons ? Math.round((studied / totalLessons) * 100) : 0

  // Where to send them next: the first untouched lesson, else the weakest one.
  const next = allLessons.find((l) => !progress?.[l.key])
    ?? [...allLessons].sort((a, b) =>
      (progress?.[a.key]?.accuracy ?? 1) - (progress?.[b.key]?.accuracy ?? 1))[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      <section className="hall-core" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,300px) 1fr', gap: 48, alignItems: 'center',
      }}>
        <ScoreRing score={pct} size={290} label="من المنهج" />
        <div>
          <span className="hall-kick"><BookOpen size={12} /> شرح ثم تدريب</span>
          <h1 className="hall-h1" style={{ marginBlock: '18px 14px' }}>
            {lessonsAr(totalLessons)} في <em>{topicsAr(topics.length)}</em>.
          </h1>
          <p className="hall-lede">
            كل درس يبدأ بالقاعدة، ويبيّن كيف تجي في ستيب، ويكشف الفخ، ثم أمثلة محلولة
            من أسئلة الاختبار نفسها — وبعدها تدريب على نفس القاعدة.
          </p>
          {next && (
            <Link
              to={`/student/step/learn/${encodeURIComponent(next.key)}`}
              className="hall-btn hall-tap"
              style={{ textDecoration: 'none', marginBlockStart: 22 }}
            >
              <Play size={16} />
              {studied === 0
                ? g('ابدأ من أول درس', 'ابدئي من أول درس')
                : g('تابع من حيث وقفت', 'تابعي من حيث وقفتِ')}
            </Link>
          )}
        </div>
      </section>

      {topics.map((t, ti) => {
        const done = t.lessons.filter((l) => progress?.[l.key]).length
        const tPct = t.lessons.length ? Math.round((done / t.lessons.length) * 100) : 0
        return (
          <section key={t.key} className="hall-panel" style={{ padding: '26px 0 0' }}>
            <header style={{
              display: 'flex', alignItems: 'flex-start', gap: 18, padding: '0 26px 22px', flexWrap: 'wrap',
            }}>
              <span style={{
                fontFamily: 'var(--hall-display)', fontSize: 34, color: 'var(--hall-gold)', lineHeight: 1,
              }}>{ti + 1}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{
                  margin: 0, fontFamily: 'var(--hall-kufi)', fontSize: 22, color: 'var(--hall-ink)',
                }}>{t.title_ar}</h2>
                {t.blurb_ar && (
                  <p style={{
                    margin: '8px 0 0', fontSize: 14, lineHeight: 1.9,
                    color: 'var(--hall-ink-2)', maxWidth: '58ch',
                  }}>{t.blurb_ar}</p>
                )}
              </div>
              <div style={{ flex: 'none', width: 150 }}>
                <div className={`hall-bar${tPct >= 75 ? ' good' : ''}`}>
                  <i style={{ width: `${tPct}%` }} />
                </div>
                <span style={{
                  display: 'block', marginBlockStart: 8, fontSize: 12, color: 'var(--hall-ink-3)',
                }}>
                  {done} من {lessonsAr(t.lessons.length)}
                </span>
              </div>
            </header>

            <div className="hall-ledger" style={{
              border: 'none', borderRadius: 0, background: 'none', boxShadow: 'none', backdropFilter: 'none',
            }}>
              {t.lessons.map((l, li) => {
                const p = progress?.[l.key]
                const lPct = p?.accuracy != null ? Math.round(p.accuracy * 100) : null
                const tone = lPct == null ? '' : lPct < 50 ? ' weak' : lPct >= 75 ? ' good' : ''
                return (
                  <Link
                    key={l.key}
                    to={`/student/step/learn/${encodeURIComponent(l.key)}`}
                    className="hall-lr hall-tap"
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <span className="rank">{li + 1}</span>
                    <span className="who">
                      <b>{l.title_ar}</b>
                      <span>{questionsAr(l.item_count ?? 0)}</span>
                    </span>
                    <span className="track" style={{ width: 120, flex: 'none' }}>
                      <span className={`hall-bar${tone}`} style={{ display: 'block' }}>
                        <i style={{ width: `${lPct ?? 0}%` }} />
                      </span>
                    </span>
                    <span className="num" style={{
                      color: lPct == null ? 'var(--hall-ink-3)'
                        : lPct >= 75 ? 'var(--hall-jade)'
                          : lPct < 50 ? 'var(--hall-rose)' : 'var(--hall-gold-hi)',
                    }}>
                      {lPct == null ? '—' : `${lPct}٪`}
                    </span>
                    <span style={{
                      flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12.5, fontWeight: 700, color: 'var(--hall-gold-hi)',
                    }}>
                      {lPct != null && lPct >= 75 && <Check size={12} />}
                      {p ? g('راجع', 'راجعي') : g('ابدأ', 'ابدئي')}
                      <ChevronLeft size={13} />
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      <style>{`@media (max-width:900px){
        .hall-core{grid-template-columns:1fr !important;gap:30px !important}
        /* the sentence before the number, same call the Hall home makes */
        .hall-core > :first-child{order:2;max-width:250px;margin-inline:auto}
      }`}</style>
    </div>
  )
}
