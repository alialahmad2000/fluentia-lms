import { Link } from 'react-router-dom'
import { PenLine } from 'lucide-react'
import { useStepGrammarPoints } from '@/hooks/step/useStepBank'
import { useStepPointProgress } from '@/hooks/step/useStepProgress'
import { Spinner, Empty, questionsAr } from './_ui/primitives'
import { useG } from '@/i18n/gender'
import './_ui/hall.css'

/**
 * «القواعد» — every rule in the bank, ordered by what it costs THIS student.
 *
 * Deliberately not textbook order. A student with 23 days does not need the
 * canonical sequence; they need the rule that is bleeding the most marks.
 */
export default function STEPRules() {
  const g = useG()
  const { data: points, isLoading } = useStepGrammarPoints()
  const { data: progress } = useStepPointProgress()

  if (isLoading) return <Spinner />

  const real = (points ?? []).filter((p) => !p.is_fallback)
  if (!real.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <h1 className="hall-h1">القواعد</h1>
        <Empty title="القواعد قيد الإعداد">
          نصنّف الآن أسئلة التراكيب على قواعدها. أول ما تجهز بتظهر هنا مع شرح لكل قاعدة.
        </Empty>
      </div>
    )
  }

  const byKey = Object.fromEntries((progress ?? []).map((p) => [p.grammar_point, p]))
  const rows = real
    .map((p) => {
      const pr = byKey[p.key]
      return { ...p, accuracy: pr?.accuracy ?? null, seen: pr?.attempts_count ?? 0 }
    })
    .sort((a, b) => {
      if (a.accuracy == null && b.accuracy == null) return (b.item_count ?? 0) - (a.item_count ?? 0)
      if (a.accuracy == null) return 1
      if (b.accuracy == null) return -1
      return a.accuracy - b.accuracy
    })

  const answered = rows.filter((r) => r.accuracy != null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      <header>
        <span className="hall-kick"><PenLine size={12} /> التراكيب والتحليل الكتابي</span>
        <h1 className="hall-h1" style={{ marginBlock: '18px 14px' }}>
          {answered.length
            ? <>مرتّبة بما <em>تكلّفك</em>، لا بترتيبها في الكتب.</>
            : <>كل قاعدة، ومعها <em>أسئلتها</em>.</>}
        </h1>
        <p className="hall-lede">
          {answered.length
            ? g('كل ما جاوبت أكثر، صار الترتيب أدق. اضغط أي قاعدة لتدريب قصير عليها وحدها.',
                'كل ما جاوبتِ أكثر، صار الترتيب أدق. اضغطي أي قاعدة لتدريب قصير عليها وحدها.')
            : g('اضغط أي قاعدة لتدريب من عشرة أسئلة عليها وحدها. بعد أول تدريب بنرتّبها حسب دقّتك.',
                'اضغطي أي قاعدة لتدريب من عشرة أسئلة عليها وحدها. بعد أول تدريب بنرتّبها حسب دقّتك.')}
        </p>
      </header>

      <div className="hall-ledger">
        {rows.map((r, i) => {
          const pct = r.accuracy != null ? Math.round(r.accuracy * 100) : null
          const tone = pct == null ? '' : pct < 50 ? 'weak' : pct >= 75 ? 'good' : ''
          return (
            <Link
              key={r.key}
              to={`/student/step/exam?point=${encodeURIComponent(r.key)}`}
              className="hall-lr"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <span className="rank">{i + 1}</span>
              <span className="who">
                <b>{r.title_ar}</b>
                <span>
                  {questionsAr(r.item_count)}
                  {r.seen > 0
                    ? ` · ${g('جاوبت', 'جاوبتِ')} ${r.seen}`
                    : g(' · ما جرّبتها بعد', ' · ما جرّبتيها بعد')}
                </span>
                {r.rule_ar && (
                  <span style={{
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', marginBlockStart: 7, lineHeight: 1.8,
                    color: 'var(--hall-ink-2)', fontSize: 12.5,
                  }}>{r.rule_ar}</span>
                )}
              </span>
              {/* An empty meter beside filled ones reads as a rendering failure,
                  not as "not attempted yet". */}
              <span className="track" style={{ width: 170, flex: 'none' }}>
                {pct != null ? (
                  <span className={`hall-bar ${tone}`} style={{ display: 'block' }}>
                    <i style={{ width: `${pct}%` }} />
                  </span>
                ) : (
                  <span style={{
                    display: 'block', height: 1,
                    borderTop: '1px dashed var(--hall-line)',
                  }} />
                )}
              </span>
              <span className="num" style={pct == null ? { color: 'var(--hall-gold-hi)' } : undefined}>
                {pct != null ? `${pct}%` : g('ابدأ', 'ابدئي')}
              </span>
              <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 700, color: 'var(--hall-gold-hi)' }}>
                تدريب ←
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
