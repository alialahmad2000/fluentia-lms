import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, AlertTriangle, Target, Check, X } from 'lucide-react'
import { useStepBlueprint, useStepBankStats, useStepGrammarPoints } from '@/hooks/step/useStepBank'
import { useStepOverview, useStepPointProgress, useSetStepTarget } from '@/hooks/step/useStepProgress'
import { useG } from '@/i18n/gender'
import {
  ScoreRing, Spinner, questionUnitAr, questionsAr, papersAr,
  degreesAr, attemptsAr, SECTION_LABEL,
} from './_ui/primitives'
import './_ui/hall.css'

/** The verdict line — the point of the whole screen. Not "here is your score"
 *  but "here is the shortest path from where you are to where you must be".
 *  Reads the last full PAPER only; a drill never moves this. */
function verdict(ov, g) {
  if (ov.score == null) {
    return {
      head: <>{g('ابدأ بنموذج كامل', 'ابدئي بنموذج كامل')}<br />ونعرف <em>{g('من وين تبدأ', 'من وين تبدين')}</em>.</>,
      body: 'مئة سؤال بنفس ترتيب الاختبار الحقيقي. بعدها نعرف بالضبط أي قسم يسحب درجتك، ونرتّب لك الطريق.',
    }
  }
  if (ov.target == null) {
    return {
      head: <>درجتك الآن <em>{ov.score}</em>.<br />{g('وش الدرجة اللي تحتاجها؟', 'وش الدرجة اللي تحتاجينها؟')}</>,
      body: g(
        'حدّد هدفك وبنقيس كل شيء عليه — أي قسم يقرّبك منه، وأي قاعدة تبعدك عنه.',
        'حدّدي هدفك وبنقيس كل شيء عليه — أي قسم يقرّبك منه، وأي قاعدة تبعدك عنه.',
      ),
    }
  }
  if (ov.onTarget) {
    return {
      head: <>{g('وصلت هدفك', 'وصلتِ هدفك')} — <em>{ov.score}</em>.</>,
      body: g(
        'ثبّت المستوى بنموذج آخر تحت الوقت، أو ارفع الهدف لو تبي درجة أعلى.',
        'ثبّتي المستوى بنموذج آخر تحت الوقت، أو ارفعي الهدف لو تبين درجة أعلى.',
      ),
    }
  }
  const w = ov.weakest
  const label = w ? SECTION_LABEL[w.key] : null
  return {
    head: (
      <>
        <em>{degreesAr(ov.gap)}</em> بينك وبين هدفك،<br />
        {label ? <>و<em>قسم واحد</em> يحملها كلها.</> : 'وهذي أقصر طريق لها.'}
      </>
    ),
    body: label
      ? `${label} أضعف أقسامك الآن — ${w.pct}٪ فقط. رفعه وحده يقرّبك من هدفك أكثر من أي شيء ثاني.`
      : g(
        'راجع أخطاءك المفتوحة أولاً، فهي أسرع الدرجات اللي تقدر تكسبها.',
        'راجعي أخطاءك المفتوحة أولاً، فهي أسرع الدرجات اللي تقدرين تكسبينها.',
      ),
  }
}

function TargetSetter({ current, onDone }) {
  const g = useG()
  const [v, setV] = useState(current ?? 70)
  const { mutate, isPending, error } = useSetStepTarget()
  return (
    <div className="hall-panel" style={{ padding: 22, marginBlockStart: 16 }}>
      <p style={{ margin: 0, marginBlockEnd: 14, fontSize: 14, fontWeight: 700 }}>
        {g('وش الدرجة اللي تحتاجها؟', 'وش الدرجة اللي تحتاجينها؟')}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <input
          type="number" min={1} max={100} value={v}
          onChange={(e) => setV(e.target.value)}
          className="hall-tap"
          style={{
            width: 110, borderRadius: 12, padding: '12px 14px', fontSize: 20, fontWeight: 800,
            textAlign: 'center', fontVariantNumeric: 'tabular-nums',
            background: 'rgba(255,255,255,.05)', color: 'var(--hall-ink)',
            border: '1px solid var(--hall-line)',
          }}
        />
        <button className="hall-btn hall-tap" disabled={isPending}
          onClick={() => mutate(Number(v), { onSuccess: onDone })}>
          <Check size={16} /> {isPending ? 'نحفظ…' : g('ثبّت الهدف', 'ثبّتي الهدف')}
        </button>
        <button className="hall-btn2 hall-tap" onClick={onDone}><X size={15} /> إلغاء</button>
      </div>
      {error && (
        <p style={{ margin: 0, marginBlockStart: 10, fontSize: 12.5, color: 'var(--hall-rose)' }}>
          تعذّر حفظ الهدف. {g('حاول', 'حاولي')} مرة أخرى بعد قليل.
        </p>
      )}
    </div>
  )
}

function Pillar({ label, score, total, bankCount, need, audioNote }) {
  const pct = score != null && total ? Math.round((score / total) * 100) : null
  const weak = pct != null && pct < 50
  const papers = need ? Math.floor(bankCount / need) : 0
  return (
    <div className="hall-panel hall-lift" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBlockEnd: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', minWidth: 0 }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--hall-kufi)', fontSize: 15 }}>{label}</h3>
          {weak && (
            <span style={{
              flex: 'none', fontSize: 10.5, fontWeight: 800, color: 'var(--hall-rose)',
              background: 'rgba(240,138,110,.14)', border: '1px solid rgba(240,138,110,.3)',
              borderRadius: 99, padding: '4px 10px',
            }}>الفجوة الأكبر</span>
          )}
        </div>
        {pct != null && (
          <span style={{ fontFamily: 'var(--hall-mono)', fontSize: 12, color: 'var(--hall-ink-3)' }}>{pct}%</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <b style={{ fontFamily: 'var(--hall-display)', fontSize: 44, lineHeight: 1, fontWeight: 700 }}>
          {score != null ? score : bankCount}
        </b>
        <span style={{ fontSize: 15, color: 'var(--hall-ink-3)' }}>
          {score != null ? `/ ${total}` : questionUnitAr(bankCount)}
        </span>
      </div>

      {pct != null && (
        <div className={`hall-bar ${weak ? 'weak' : pct >= 75 ? 'good' : ''}`} style={{ marginBlockStart: 18 }}>
          <i style={{ width: `${pct}%` }} />
        </div>
      )}

      <p style={{ margin: 0, marginBlockStart: 15, fontSize: 12.5, color: 'var(--hall-ink-2)', lineHeight: 1.8 }}>
        {questionsAr(bankCount)} في البنك · {papersAr(papers)}
        {audioNote ? ` · ${audioNote}` : ''}
      </p>
    </div>
  )
}

export default function STEPHome() {
  const g = useG()
  const [editTarget, setEditTarget] = useState(false)
  const { data: bp } = useStepBlueprint()
  const { data: stats, isLoading: statsLoading } = useStepBankStats()
  const { data: points } = useStepGrammarPoints()
  const { data: pointProgress } = useStepPointProgress()
  const ov = useStepOverview()

  if (statsLoading || ov.isLoading) return <Spinner />

  const v = verdict(ov, g)
  const sections = bp?.sections ?? []
  const audioRatio = stats?.listening_audio_ratio ?? 0
  const audioNote = audioRatio === 0
    ? 'بدون تسجيلات بعد'
    : audioRatio < 0.995 ? `${Math.round(audioRatio * 100)}٪ منها بصوت` : 'كلها بصوت'

  // Ranked by what a rule COSTS: worst accuracy first, and where nothing has
  // been answered yet, by how much of the bank it occupies.
  const progByKey = Object.fromEntries((pointProgress ?? []).map((p) => [p.grammar_point, p]))
  const ranked = (points ?? [])
    .filter((p) => !p.is_fallback)
    .map((p) => {
      const pr = progByKey[p.key]
      return { ...p, accuracy: pr?.accuracy ?? null, seen: pr?.attempts_count ?? 0 }
    })
    .sort((a, b) => {
      if (a.accuracy == null && b.accuracy == null) return (b.item_count ?? 0) - (a.item_count ?? 0)
      if (a.accuracy == null) return 1
      if (b.accuracy == null) return -1
      return a.accuracy - b.accuracy
    })
    .slice(0, 6)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
      <section className="hall-core" style={{
        display: 'grid', gridTemplateColumns: 'minmax(0,360px) 1fr', gap: 48, alignItems: 'center',
      }}>
        <ScoreRing score={ov.score} target={ov.target} />
        <div>
          <span className="hall-kick">
            {ov.score == null
              ? g('ما بدأت بعد', 'ما بدأتِ بعد')
              : `تشخيص آخر نموذج · ${attemptsAr(ov.attempts)}`}
          </span>
          <h1 className="hall-h1" style={{ marginBlock: '20px 16px' }}>{v.head}</h1>
          <p className="hall-lede">{v.body}</p>

          <div style={{ display: 'flex', gap: 12, marginBlockStart: 28, flexWrap: 'wrap' }}>
            <Link to="/student/step/exam" className="hall-btn hall-tap" style={{ textDecoration: 'none' }}>
              <Play size={17} /> {g('ادخل القاعة — نموذج كامل', 'ادخلي القاعة — نموذج كامل')}
            </Link>
            {ov.openErrors > 0 && (
              <Link to="/student/step/errors" className="hall-btn2 hall-tap" style={{ textDecoration: 'none' }}>
                <AlertTriangle size={15} /> {g('راجع أخطاءك', 'راجعي أخطاءك')} ({ov.openErrors})
              </Link>
            )}
            {!editTarget && (
              <button className="hall-btn2 hall-tap" onClick={() => setEditTarget(true)}>
                <Target size={15} />
                {ov.target == null ? g('حدّد هدفك', 'حدّدي هدفك') : g('غيّر الهدف', 'غيّري الهدف')}
              </button>
            )}
          </div>
          {editTarget && <TargetSetter current={ov.target} onDone={() => setEditTarget(false)} />}
        </div>
      </section>

      <section>
        <h2 className="hall-lab">الأقسام الثلاثة</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          {sections.map((s) => {
            const raw = ov.latest
              ? { listening: ov.latest.score_listening, reading: ov.latest.score_reading, structure: ov.latest.score_structure }[s.key]
              : null
            // The stored per-section value is a PERCENTAGE. Convert to marks out
            // of that section's own weight so it reads like the real paper.
            const marks = raw != null ? Math.round((Number(raw) / 100) * s.count) : null
            return (
              <Pillar
                key={s.key}
                label={s.label_ar || SECTION_LABEL[s.key] || s.key}
                score={marks}
                total={s.count}
                bankCount={stats?.[s.key] ?? 0}
                need={s.count}
                audioNote={s.key === 'listening' ? audioNote : null}
              />
            )
          })}
        </div>
      </section>

      {!!ranked.length && (
        <section>
          <h2 className="hall-lab">
            {ranked.some((r) => r.accuracy != null) ? 'القواعد اللي تكلّفك أكثر' : 'قواعد التراكيب'}
          </h2>
          <div className="hall-ledger">
            {ranked.map((r, i) => {
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
                      {questionsAr(r.item_count)} في البنك
                      {r.seen > 0 ? ` · ${g('جاوبت', 'جاوبتِ')} ${r.seen}` : ''}
                    </span>
                  </span>
                  <span className="track" style={{ width: 190, flex: 'none' }}>
                    <span className={`hall-bar ${tone}`} style={{ display: 'block' }}>
                      <i style={{ width: `${pct ?? 0}%` }} />
                    </span>
                  </span>
                  <span className="num">{pct != null ? `${pct}%` : '—'}</span>
                  <span style={{ flex: 'none', fontSize: 12.5, fontWeight: 700, color: 'var(--hall-gold-hi)' }}>
                    تدريب ←
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <style>{`@media (max-width:900px){
        .hall-core{grid-template-columns:1fr !important;gap:30px !important}
        /* verdict before the number: the sentence is the point, not the score */
        .hall-core > :first-child{order:2;max-width:290px;margin-inline:auto}
      }`}</style>
    </div>
  )
}
