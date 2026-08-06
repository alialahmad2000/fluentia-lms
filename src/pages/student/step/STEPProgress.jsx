import { TrendingUp } from 'lucide-react'
import { useStepHistory, useStepOverview, useStepPointProgress } from '@/hooks/step/useStepProgress'
import { useStepGrammarPoints } from '@/hooks/step/useStepBank'
import { Spinner, Empty, questionsAr, degreesAr, papersCountAr } from './_ui/primitives'
import { useG } from '@/i18n/gender'
import './_ui/hall.css'

/**
 * «تقدّمي» — the trend.
 *
 * Plots FULL PAPERS only. Drills and reviews are excluded at the query level:
 * a 10-question drill answered 10/10 would post a "100" beside a real
 * 100-question paper's 62 and turn the line into noise — the most misleading
 * thing this section could show someone before a national exam.
 */
function Chart({ history, target }) {
  // oldest → newest for reading left-to-right in a chart, even in an RTL page:
  // a time axis is not a text direction.
  const pts = [...history].reverse()
  const W = 640, H = 240, PAD = 34
  const n = pts.length
  const x = (i) => (n === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (n - 1))
  const y = (v) => H - PAD - ((Number(v) || 0) / 100) * (H - PAD * 2)
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.score_total)}`).join(' ')
  const area = `${line} L${x(n - 1)},${H - PAD} L${x(0)},${H - PAD} Z`

  return (
    <div className="hall-panel" style={{ padding: 24 }}>
      {/* The label is positioned against a box with the SVG's own aspect ratio,
          so the percentage maps 1:1 at every width. An earlier version used a
          hand-tuned 0.86 fudge that drifted off the line as the panel resized.
          Arabic must be HTML here, not SVG <text> — SVG does not shape Arabic. */}
      <div style={{ position: 'relative', aspectRatio: `${W} / ${H}` }}>
        {target != null && (
          <span style={{
            position: 'absolute', insetInlineEnd: `${(PAD / W) * 100}%`,
            insetBlockStart: `${(y(target) / H) * 100}%`, transform: 'translateY(-140%)',
            fontSize: 12, fontWeight: 700, color: '#FBE4A8', pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}>الهدف {target}</span>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }} fill="none">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={PAD} y1={y(g)} x2={W - PAD} y2={y(g)} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
            <text x={PAD - 8} y={y(g) + 4} fontSize="10" fill="#8E8A7C" textAnchor="end"
              fontFamily="IBM Plex Mono, monospace">{g}</text>
          </g>
        ))}
        {target != null && (
          <line x1={PAD} y1={y(target)} x2={W - PAD} y2={y(target)}
            stroke="#FBE4A8" strokeWidth="1.5" strokeDasharray="6 6" opacity=".8" />
        )}
        <path d={area} fill="url(#hallFill)" />
        <path d={line} stroke="url(#hallLine)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={p.id} cx={x(i)} cy={y(p.score_total)} r={i === n - 1 ? 5.5 : 3.5}
            fill={i === n - 1 ? '#06070C' : '#E3B95C'}
            stroke={i === n - 1 ? '#FBE4A8' : 'none'} strokeWidth="2.5" />
        ))}
        <defs>
          <linearGradient id="hallLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#C9992F" /><stop offset="1" stopColor="#FBE4A8" />
          </linearGradient>
          <linearGradient id="hallFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(227,185,92,.26)" />
            <stop offset="0.55" stopColor="rgba(227,185,92,.06)" />
            <stop offset="1" stopColor="rgba(227,185,92,0)" />
          </linearGradient>
        </defs>
        </svg>
      </div>
    </div>
  )
}

function fmt(d) {
  if (!d) return '—'
  // Gregorian, explicitly. The platform forces Gregorian everywhere.
  return new Intl.DateTimeFormat('ar', {
    day: 'numeric', month: 'short', year: 'numeric', calendar: 'gregory',
  }).format(new Date(d))
}

export default function STEPProgress() {
  const g = useG()
  const { data: history, isLoading } = useStepHistory(12)
  const { data: pointProgress } = useStepPointProgress()
  const { data: allPoints } = useStepGrammarPoints()
  const ov = useStepOverview()

  if (isLoading || ov.isLoading) return <Spinner />

  const rows = history ?? []
  if (!rows.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <h1 className="hall-h1">تقدّمي</h1>
        <Empty title={g('ما سلّمت نموذجاً كاملاً بعد', 'ما سلّمتِ نموذجاً كاملاً بعد')}>
          {g(
            'أول ما تسلّم نموذجاً كاملاً بتشوف درجتك هنا، ومعها درجة كل قسم على حدة. التدريبات القصيرة ما تدخل في هذا الخط عشان يبقى صادقاً.',
            'أول ما تسلّمين نموذجاً كاملاً بتشوفين درجتك هنا، ومعها درجة كل قسم على حدة. التدريبات القصيرة ما تدخل في هذا الخط عشان يبقى صادقاً.',
          )}
        </Empty>
      </div>
    )
  }

  // step_student_progress stores the point KEY; the readable title lives in
  // step_grammar_points. Showing the raw key ("verbs:passive_or_be") to a
  // student is a leak of the schema into the product.
  const titleByKey = Object.fromEntries((allPoints ?? []).map((p) => [p.key, p.title_ar]))
  const points = (pointProgress ?? [])
    .filter((p) => p.grammar_point && p.attempts_count >= 3)
    .map((p) => ({ ...p, title: titleByKey[p.grammar_point] || p.grammar_point }))
    .sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 42 }}>
      <header>
        <span className="hall-kick"><TrendingUp size={12} /> النماذج الكاملة فقط</span>
        <h1 className="hall-h1" style={{ marginBlock: '18px 14px' }}>
          {ov.delta == null
            ? <>درجتك الأولى: <em>{ov.score}</em></>
            : ov.delta > 0
              ? <>{g('ارتفعت', 'ارتفعتِ')} <em>{degreesAr(ov.delta)}</em> عن آخر نموذج.</>
              : ov.delta === 0
                ? <>درجتك ثابتة على <em>{ov.score}</em>.</>
                : <>{g('نزلت', 'نزلتِ')} <em>{degreesAr(Math.abs(ov.delta))}</em> — نموذج واحد ما يحكم.</>}
        </h1>
        <p className="hall-lede">
          {rows.length === 1
            ? 'نموذج واحد يعطينا نقطة بداية. النموذج الثاني هو اللي يبيّن الاتجاه.'
            : `${papersCountAr(rows.length)} حتى الآن. التدريبات القصيرة مستثناة من هذا الخط عمداً.`}
        </p>
      </header>

      <Chart history={rows} target={ov.target} />

      <section>
        <h2 className="hall-lab">كل نموذج</h2>
        <div className="hall-ledger">
          {rows.map((r) => (
            <div key={r.id} className="hall-lr" style={{ cursor: 'default' }}>
              <span className="rank" style={{ fontSize: 12, width: 78, lineHeight: 1.5 }}>
                {fmt(r.completed_at)}
              </span>
              <span className="who">
                <b style={{ fontFamily: 'var(--hall-display)', fontSize: 22 }}>{r.score_total}</b>
                <span>
                  مسموع {r.score_listening ?? '—'}٪ · مقروء {r.score_reading ?? '—'}٪ · تراكيب {r.score_structure ?? '—'}٪
                </span>
              </span>
              {ov.target != null && (
                <span className="num" style={{
                  color: Number(r.score_total) >= ov.target ? 'var(--hall-jade)' : 'var(--hall-ink-3)',
                }}>
                  {Number(r.score_total) >= ov.target
                    ? '✓'
                    : <bdi dir="ltr">{`\u2212${ov.target - Number(r.score_total)}`}</bdi>}
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {!!points.length && (
        <section>
          <h2 className="hall-lab">دقّتك في كل قاعدة</h2>
          <div className="hall-ledger">
            {points.map((p) => {
              const pct = Math.round((p.accuracy ?? 0) * 100)
              const tone = pct < 50 ? 'weak' : pct >= 75 ? 'good' : ''
              return (
                <div key={`${p.section}|${p.grammar_point}`} className="hall-lr" style={{ cursor: 'default' }}>
                  <span className="who" style={{ marginInlineStart: 4 }}>
                    <b>{p.title}</b>
                    <span>{p.correct_count} من {questionsAr(p.attempts_count)} صح</span>
                  </span>
                  <span className="track" style={{ width: 190, flex: 'none' }}>
                    <span className={`hall-bar ${tone}`} style={{ display: 'block' }}>
                      <i style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  <span className="num">{pct}%</span>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
