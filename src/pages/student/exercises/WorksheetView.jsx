import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Printer, RotateCcw, CheckCircle2, Zap, Send, Loader2 } from 'lucide-react'
import { validateAnswer } from '../../../utils/answerValidator'
import { useG } from '../../../i18n/gender'

// Western → Arabic-Indic digits (this student reads Arabic-Indic).
const AR = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
const toAr = (n) => String(n ?? 0).replace(/\d/g, (d) => AR[+d])

// The four transformation columns (fixed order + labels). Any one may be the GIVEN per row.
const COLS = [
  { f: 'aff', head: 'مثبت · Affirmative', chip: 'مُعطى · مثبت', ph: 'الجملة المثبتة…' },
  { f: 'neg', head: 'منفي · Negative', chip: 'مُعطى · منفي', ph: 'الجملة المنفية…' },
  { f: 'q', head: 'سؤال · Yes/No', chip: 'مُعطى · سؤال (نعم/لا)', ph: 'سؤال نعم/لا…' },
  { f: 'wh', head: 'سؤال بأداة · Wh- Question', chip: 'مُعطى · سؤال بأداة', ph: 'أضِف أداة استفهام…' },
]

/**
 * WorksheetView — renders a tense-transformation worksheet (content.render === 'worksheet').
 * Shares the parent's submit path (submitMutation grades content.questions by accepted_answers).
 * The GIVEN cell varies per row; the student fills the other three. Reveal after submit.
 */
export default function WorksheetView({ exercise, answers, setAnswers, submitted, result, onSubmit, onBack, submitting, submitError }) {
  const g = useG()
  const ws = exercise.content?.worksheet || {}
  const tenses = ws.tenses || []

  // qid → { accepted_answers, correct_answer }
  const qmap = useMemo(() => {
    const m = {}
    for (const q of exercise.content?.questions || []) m[q.id] = q
    return m
  }, [exercise])

  const blankIds = useMemo(() => Object.keys(qmap), [qmap])
  const total = blankIds.length
  const answeredCount = blankIds.filter((id) => (answers[id] || '').trim() !== '').length
  const allAnswered = total > 0 && answeredCount === total

  const setAns = (id, v) => setAnswers((prev) => ({ ...prev, [id]: v }))
  const clearAll = () => setAnswers({})

  // result tone
  const score = result?.score ?? 0
  const tone = score >= 80 ? 'good' : score >= 60 ? 'mid' : 'low'
  const encouragement = !result ? null
    : score >= 90 ? g('إتقانٌ واضح — أحسنت. 👏', 'إتقانٌ واضح — أحسنتِ. 👏')
    : score >= 80 ? `أداء قويّ. ${g('راجِع', 'راجِعي')} الخانات الحمراء لتكتمل الصورة.`
    : score >= 60 ? `جيّد — ${g('راجِع', 'راجِعي')} «طريقة الحل» بالأعلى وستقفز نتيجتك.`
    : 'بداية طيّبة — النموذج تحت كل خانة يشرح الصواب، والإعادة تصنع الفرق.'

  return (
    <div className="pw-root" dir="rtl">
      <div className="pw-world" aria-hidden><div className="pw-world__blooms" /><div className="pw-world__grain" /></div>

      <div className="pw-wrap">
        <button className="pw-back" onClick={onBack}>→ العودة إلى الأوراق</button>

        {/* Masthead */}
        <header className="pw-mast">
          <div className="pw-brand">طلاقة · Fluentia</div>
          <h1 className="pw-title">{exercise.title_ar || exercise.title}</h1>
          {exercise.content?.title_en && <div className="pw-title-en" dir="ltr">{exercise.content.title_en}</div>}
        </header>

        {/* طريقة الحل + worked example */}
        <section className="pw-howto">
          <h4><span className="dot" /> طريقة الحل</h4>
          <p className="p">
            في كل صف <b>خانة واحدة فقط محلولة</b> ومظلّلة بالأخضر (<span className="mk">مُعطى</span>) — وقد تكون
            مُثبتةً أو منفيةً أو سؤالاً (نعم/لا) أو سؤالاً بأداة، <b>وتختلف من صف لآخر</b>. مهمتك:
            {g(' انطلِق', ' انطلِقي')} من الخانة المُعطاة {g('واملأ', 'واملئي')} الصيغ الثلاث الباقية.
          </p>
          {Array.isArray(ws.forms) && ws.forms.length > 0 && (
            <ul className="pw-forms">
              {ws.forms.map((fm) => (
                <li key={fm.k}><span className="k">{fm.k}</span><div><b>{fm.en}</b> — {fm.ar}</div></li>
              ))}
            </ul>
          )}
          {ws.example && (
            <div className="pw-example">
              <div className="lab">◆ مثال محلول — Worked Example</div>
              {ws.example.hint_ar && <p className="hint">{ws.example.hint_ar}</p>}
              <div className="pw-ex-grid">
                {(ws.example.rows || []).map((r, i) => (
                  <div key={i} className={`pw-ex-row${r.given ? ' given' : ''}`}>
                    <span className="tg">{r.tag}</span>
                    <span className="st" dir="ltr">{r.sent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Result banner (after submit) */}
        {submitted && result && (
          <motion.div
            className={`pw-result ${tone}`}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="pw-result__score" dir="ltr">{toAr(result.score)}٪</div>
            <div className="pw-result__sub">{toAr(result.correct)} من {toAr(result.total)} خانة صحيحة</div>
            <div className="pw-result__xp"><Zap size={15} /> {g('كسبت', 'كسبتِ')} +{toAr(result.xp)} نقطة خبرة</div>
            {encouragement && <p className="pw-result__msg">{encouragement}</p>}
          </motion.div>
        )}

        {/* Save-failure notice — answers stay on screen; the student can retry */}
        {submitError && !submitted && (
          <div dir="rtl" role="alert" style={{ margin: '4px 0 10px', padding: '12px 14px', borderRadius: 12, background: 'rgba(176,84,63,.12)', border: '1px solid rgba(176,84,63,.42)', color: '#e8c9c0', fontSize: '.92rem', lineHeight: 1.6 }}>
            {submitError}
          </div>
        )}

        {/* Toolbar */}
        <div className="pw-bar">
          {!submitted ? (
            <button className="pw-btn primary" onClick={onSubmit} disabled={!allAnswered || submitting}>
              {submitting ? <><Loader2 size={15} className="pw-spin" /> جارٍ التصحيح…</>
                : allAnswered ? <><Send size={15} /> تسليم الورقة</>
                : <><CheckCircle2 size={15} /> {g('أكمِل', 'أكمِلي')} الخانات ({toAr(answeredCount)}/{toAr(total)})</>}
            </button>
          ) : (
            <button className="pw-btn primary" onClick={onBack}><ArrowLeft size={15} /> العودة إلى الأوراق</button>
          )}
          <button className="pw-btn" onClick={() => window.print()}><Printer size={15} /> طباعة / حفظ PDF</button>
          {!submitted && (
            <button className="pw-btn ghost" onClick={clearAll}><RotateCcw size={15} /> مسح</button>
          )}
          {!submitted && (
            <span className="pw-progresspill">{g('أكملت', 'أكملتِ')} <b dir="ltr">{toAr(answeredCount)}</b> من {toAr(total)} خانة</span>
          )}
          {!submitted && <span className="pw-autosave">{g('تُحفظ إجاباتك تلقائيًا — لن تفقد شيئًا لو أغلقت الصفحة', 'تُحفظ إجاباتكِ تلقائيًا — لن تفقدي شيئًا لو أغلقتِ الصفحة')}</span>}
        </div>

        {/* Tense tables */}
        <main>
          {tenses.map((t, ti) => (
            <section className="pw-tense" key={t.id}>
              <div className="pw-thead">
                <div className="pw-tnum">{toAr(ti + 1)}</div>
                <div className="pw-tmeta"><div className="en" dir="ltr">{t.en}</div><div className="ar">{t.ar}</div></div>
                {t.aux && <div className="pw-aux" dir="ltr">{t.aux}</div>}
              </div>
              <div className="pw-scroll">
                <table className="pw-table">
                  <colgroup><col className="rn" />{COLS.map((c) => <col key={c.f} />)}</colgroup>
                  <thead>
                    <tr><th className="rn">#</th>{COLS.map((c) => <th key={c.f}>{c.head}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(t.rows || []).map((r, ri) => (
                      <tr key={ri}>
                        <td className="rn">{toAr(ri + 1)}</td>
                        {COLS.map((c) => {
                          if (c.f === r.given) {
                            return (
                              <td key={c.f}>
                                <div className="pw-given">
                                  <div className="chip">◆ {c.chip}</div>
                                  <div className="q" dir="ltr">{r.forms?.[c.f]}</div>
                                </div>
                              </td>
                            )
                          }
                          const qid = `${t.id}-${ri}-${c.f}`
                          const q = qmap[qid]
                          const val = answers[qid] || ''
                          let cls = ''
                          if (submitted && q) cls = validateAnswer(val, q.accepted_answers) ? ' ok' : ' no'
                          return (
                            <td key={c.f} data-label={c.head}>
                              <input
                                className={`pw-ans${cls}`} dir="ltr" placeholder={c.ph}
                                value={val} disabled={submitted}
                                onChange={(e) => setAns(qid, e.target.value)}
                                aria-label={c.head}
                                type="text" inputMode="text" enterKeyHint="next"
                                autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false}
                              />
                              {submitted && q && cls === ' no' && (
                                <div className="pw-model" dir="ltr">{q.correct_answer}</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </main>

        <p className="pw-foot">أوراقٌ اختارها {g('لك مدرّبك', 'لكِ مدرّبكِ')} — تُصحَّح فور التسليم. <b>طلاقة</b></p>
      </div>
    </div>
  )
}
