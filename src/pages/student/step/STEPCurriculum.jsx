import { Link } from 'react-router-dom'
import { ChevronLeft, Check } from 'lucide-react'
import { useStepTopics, useStepLessonProgress } from '@/hooks/step/useStepCurriculum'
import { useG } from '@/i18n/gender'
import { Spinner, Empty, questionsAr, lessonsAr, topicsAr } from './_ui/primitives'
import './_ui/hall.css'

/**
 * «المنهج» — the teaching entrance to the bank, set as a study manual.
 *
 * The page opens on the material, the way a textbook does: a headline, one
 * line of standing, and the topics. No hero instrument — a score ring belongs
 * on a diagnosis screen, not on the page you come to in order to read.
 *
 * The contents rail is the only persistent chrome: on a 30-lesson page you
 * need to know where you are and jump, and that is a table of contents.
 */
export default function STEPCurriculum() {
  const g = useG()
  const { data: topics, isLoading } = useStepTopics()
  const { data: progress } = useStepLessonProgress()

  if (isLoading) return <Spinner />
  if (!topics?.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1 className="hall-h1">المنهج</h1>
        <Empty title="المنهج قيد الإعداد">
          نرتّب الآن أسئلة البنك في دروس مشروحة. أول ما تجهز بتظهر هنا.
        </Empty>
      </div>
    )
  }

  const allLessons = topics.flatMap((t) => t.lessons)
  const totalLessons = allLessons.length
  const totalItems = topics.reduce((n, t) => n + (t.itemCount ?? 0), 0)
  // Count only lessons that are ON the curriculum — counting every row in
  // step_student_progress with a grammar_point includes unpublished and
  // fallback points, which made «تدرّبت على ٩ من ٦» reachable.
  const studied = allLessons.filter((l) => progress?.[l.key]).length
  const pct = totalLessons ? Math.round((studied / totalLessons) * 100) : 0

  // Where to send them next: the first untouched lesson, else the weakest one.
  const next = allLessons.find((l) => !progress?.[l.key])
    ?? [...allLessons].sort((a, b) =>
      (progress?.[a.key]?.accuracy ?? 1) - (progress?.[b.key]?.accuracy ?? 1))[0]

  const toneOf = (p) => p == null ? 'var(--hall-ink-3)'
    : p >= 75 ? 'var(--hall-jade)' : p < 50 ? 'var(--hall-rose)' : 'var(--hall-ink-2)'

  return (
    <div className="step-doc">
      <main>
        <h1 className="hall-h1">{lessonsAr(totalLessons)} في {topicsAr(topics.length)}</h1>
        <p className="hall-lede" style={{ marginBlock: '10px 0' }}>
          كل درس يبدأ بالقاعدة، ويبيّن كيف تجي في ستيب، ويكشف الفخ، ثم أمثلة محلولة
          من أسئلة الاختبار نفسها — وبعدها تدريب على القاعدة وحدها.
        </p>

        <div className="step-meta">
          <span>
            {studied > 0
              ? <>{g('أنجزت', 'أنجزتِ')} <b>{studied}</b> من {lessonsAr(totalLessons)}</>
              : <>{g('لم تبدأ بعد', 'لم تبدئي بعد')}</>}
          </span>
          <span><b>{totalItems.toLocaleString('en')}</b> سؤال في البنك</span>
        </div>

        {next && (
          <Link to={`/student/step/learn/${encodeURIComponent(next.key)}`}
            className="hall-btn hall-tap" style={{ textDecoration: 'none', marginBlockStart: 22 }}>
            {studied === 0
              ? g('ابدأ من أول درس', 'ابدئي من أول درس')
              : g('تابع من حيث وقفت', 'تابعي من حيث وقفتِ')} — {next.title_ar}
          </Link>
        )}

        {topics.map((t, ti) => (
          <section key={t.key} className="step-topic" id={`t${ti + 1}`}>
            <h2>
              {t.title_ar}
              <span className="n">{lessonsAr(t.lessons.length)}</span>
            </h2>
            {t.blurb_ar && <p className="blurb">{t.blurb_ar}</p>}

            <ul className="step-ls">
              {t.lessons.map((l) => {
                const p = progress?.[l.key]
                const lPct = p?.accuracy != null ? Math.round(p.accuracy * 100) : null
                return (
                  <li key={l.key}>
                    <Link to={`/student/step/learn/${encodeURIComponent(l.key)}`} className="hall-tap">
                      <span className="t">{l.title_ar}</span>
                      <span className="q">{questionsAr(l.item_count ?? 0)}</span>
                      <span className="pc" style={{ color: toneOf(lPct) }}>
                        {lPct == null ? '—' : <span className="fig" dir="ltr">{lPct}٪</span>}
                      </span>
                      <span className="go">
                        {lPct != null && lPct >= 75 && <Check size={12} />}
                        {p ? g('راجع', 'راجعي') : g('ابدأ', 'ابدئي')}
                        <ChevronLeft size={13} />
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </main>

      <aside>
        <div className="lab">تقدّمك</div>
        <div className="hall-bar" style={{ marginBlockEnd: 8 }}><i style={{ width: `${pct}%` }} /></div>
        <p className="pcline"><span className="fig">{studied}</span> من {lessonsAr(totalLessons)}</p>
        <div className="lab" style={{ marginBlockStart: 22 }}>المحتويات</div>
        <ol>
          {topics.map((t, ti) => {
            const done = t.lessons.filter((l) => progress?.[l.key]).length
            return (
              <li key={t.key}>
                <a href={`#t${ti + 1}`}>
                  <span>{t.title_ar}</span>
                  <span className="fig">{done}/{t.lessons.length}</span>
                </a>
              </li>
            )
          })}
        </ol>
      </aside>

      <style>{`
        .step-doc{display:grid;grid-template-columns:1fr 216px;gap:52px;align-items:start}
        .step-meta{display:flex;gap:22px;flex-wrap:wrap;align-items:baseline;
          margin-block-start:22px;padding-block-start:16px;
          border-block-start:1px solid var(--hall-line);
          font-size:13.5px;color:var(--hall-ink-2)}
        .step-meta b{font-size:18px;font-weight:600;color:var(--hall-ink);
          font-family:var(--hall-mono);font-variant-numeric:tabular-nums}
        .step-topic{margin-block-start:44px;scroll-margin-block-start:24px}
        .step-topic h2{font-size:18.5px;font-weight:600;margin:0 0 5px;
          display:flex;gap:11px;align-items:baseline;flex-wrap:wrap}
        .step-topic h2 .n{font-size:12.5px;font-weight:500;color:var(--hall-ink-3)}
        .step-topic .blurb{margin:0 0 14px;font-size:14px;line-height:1.85;
          color:var(--hall-ink-2);max-width:60ch}
        .step-ls{list-style:none;margin:0;padding:0;border-block-start:1px solid var(--hall-line)}
        .step-ls li{border-block-end:1px solid var(--hall-line)}
        .step-ls a{display:flex;align-items:center;gap:16px;padding:12px 4px;
          text-decoration:none;color:inherit}
        .step-ls a:hover{background:var(--hall-panel)}
        .step-ls .t{flex:1;min-width:0;font-size:14.5px;font-weight:500}
        .step-ls .q{flex:none;font-size:12.5px;color:var(--hall-ink-3)}
        .step-ls .pc{flex:none;width:46px;text-align:end;font-size:13px;font-weight:600}
        .step-ls .go{flex:none;display:inline-flex;align-items:center;gap:4px;
          font-size:12.5px;font-weight:600;color:var(--hall-gold-hi)}
        .fig{font-family:var(--hall-mono);font-variant-numeric:tabular-nums}
        .step-doc aside{position:sticky;inset-block-start:24px;font-size:13.5px}
        .step-doc aside .lab{font-size:11.5px;font-weight:600;color:var(--hall-ink-3);
          margin-block-end:9px}
        .step-doc aside .pcline{margin:0;font-size:12px;color:var(--hall-ink-3)}
        .step-doc aside ol{list-style:none;margin:0;padding:0}
        .step-doc aside li a{display:flex;justify-content:space-between;gap:10px;align-items:center;
          padding:11px 0;min-height:44px;text-decoration:none;color:var(--hall-ink-2)}
        .step-doc aside li a:hover{color:var(--hall-gold-hi)}
        .step-doc aside li a .fig{font-size:12px;color:var(--hall-ink-3);flex:none}
        @media(max-width:900px){
          .step-doc{grid-template-columns:1fr;gap:26px}
          .step-doc aside{position:static;order:-1;
            padding-block-end:18px;border-block-end:1px solid var(--hall-line)}
          .step-doc aside ol{display:none}
          .step-ls .q{display:none}
        }
      `}</style>
    </div>
  )
}
