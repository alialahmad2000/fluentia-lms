import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Check, RotateCcw, ChevronDown } from 'lucide-react'
import { useStepErrorBank } from '@/hooks/step/useStepProgress'
import { useG } from '@/i18n/gender'
import { Spinner, Empty, SECTION_LABEL, questionsAr, timesAr } from './_ui/primitives'
import './_ui/hall.css'

/**
 * «أخطائي» — the mistake bank.
 *
 * Fills itself from every wrong answer on every attempt. This is the screen that
 * turns a score into a study plan: a student can sit ten papers and still not
 * know which rule keeps costing them marks unless their own misses are kept and
 * served back.
 *
 * Retiring an item needs TWO correct answers, not one — a single right answer on
 * a four-choice question is a 25% coin-flip, and retiring on a guess is how a
 * student walks into the real exam believing a weakness is fixed.
 */
function ErrorCard({ row }) {
  const g = useG()
  const [open, setOpen] = useState(false)
  const explanation = typeof row.explanation === 'string'
    ? row.explanation
    : row.explanation?.ar || row.explanation?.text || null

  return (
    <div className="hall-panel" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="hall-tap"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px',
          background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
          font: 'inherit', textAlign: 'start',
        }}
      >
        <span style={{
          flex: 'none', fontFamily: 'var(--hall-mono)', fontSize: 11, borderRadius: 99,
          padding: '4px 10px',
          background: row.times_seen > 1 ? 'rgba(240,138,110,.16)' : 'rgba(227,185,92,.14)',
          color: row.times_seen > 1 ? 'var(--hall-rose)' : 'var(--hall-gold-hi)',
          border: `1px solid ${row.times_seen > 1 ? 'rgba(240,138,110,.3)' : 'var(--hall-line)'}`,
        }}>
          {row.times_seen > 1 ? `${g('أخطأت', 'أخطأتِ')} فيه ${timesAr(row.times_seen)}` : 'خطأ جديد'}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
            {row.grammar_point_title || SECTION_LABEL[row.section] || row.section}
          </b>
          <span dir="ltr" style={{
            display: 'block', fontSize: 12.5, color: 'var(--hall-ink-3)', marginBlockStart: 4,
            textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{row.question_text}</span>
        </span>
        <ChevronDown
          size={16}
          style={{ flex: 'none', color: 'var(--hall-ink-3)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}
        />
      </button>

      {open && (
        <div style={{ padding: '0 22px 20px', borderBlockStart: '1px solid var(--hall-line-2)' }}>
          <p dir="ltr" style={{
            margin: 0, marginBlock: '16px 14px', fontSize: 14, lineHeight: 1.8,
            textAlign: 'left', color: 'var(--hall-ink)',
          }}>{row.question_text}</p>

          <div style={{ display: 'grid', gap: 8 }}>
            {/* null (not "—") when unanswered: "picked the wrong option" and
                "ran out of time" are different problems. */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, padding: '11px 14px',
              background: 'rgba(240,138,110,.09)', border: '1px solid rgba(240,138,110,.24)',
            }}>
              <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 800, color: 'var(--hall-rose)' }}>إجابتك</span>
              <span dir="ltr" style={{ flex: 1, fontSize: 13.5, textAlign: 'left', color: 'var(--hall-ink-2)' }}>
                {row.student_answer ?? g('ما أجبت على هذا السؤال', 'ما أجبتِ على هذا السؤال')}
              </span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, padding: '11px 14px',
              background: 'rgba(79,217,168,.09)', border: '1px solid rgba(79,217,168,.24)',
            }}>
              <span style={{ flex: 'none', fontSize: 11.5, fontWeight: 800, color: 'var(--hall-jade)' }}>الصحيح</span>
              <span dir="ltr" style={{ flex: 1, fontSize: 13.5, textAlign: 'left', color: 'var(--hall-ink)' }}>
                {row.correct_answer ?? '—'}
              </span>
            </div>
          </div>

          {explanation && (
            <p style={{
              margin: 0, marginBlockStart: 14, fontSize: 13, lineHeight: 1.95,
              color: 'var(--hall-ink-2)',
            }}>{explanation}</p>
          )}

          <p style={{ margin: 0, marginBlockStart: 14, fontSize: 11.5, color: 'var(--hall-ink-3)' }}>
            {row.times_correct === 0
              ? g('جاوبه صح مرتين متتاليتين عشان يطلع من قائمة أخطائك.',
                  'جاوبيه صح مرتين متتاليتين عشان يطلع من قائمة أخطائك.')
              : 'باقي إجابة صحيحة وحدة عشان يطلع من القائمة.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default function STEPErrors() {
  const g = useG()
  const navigate = useNavigate()
  const { data, isLoading } = useStepErrorBank()

  if (isLoading) return <Spinner />

  const open = data?.open ?? []
  const mastered = data?.mastered ?? []

  if (!open.length && !mastered.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <h1 className="hall-h1">أخطائي</h1>
        <Empty title="ما عندك أخطاء محفوظة بعد">
          {g(
            'كل سؤال تخطئ فيه في أي نموذج ينحفظ هنا تلقائياً، ومعه إجابتك الخاطئة والإجابة الصحيحة. بعدها نعيدها عليك لين تتقنها.',
            'كل سؤال تخطئين فيه في أي نموذج ينحفظ هنا تلقائياً، ومعه إجابتك الخاطئة والإجابة الصحيحة. بعدها نعيدها عليك لين تتقنينها.',
          )}
        </Empty>
      </div>
    )
  }

  if (!open.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        <h1 className="hall-h1">أخطائي</h1>
        <Empty title={`${g('أتقنت', 'أتقنتِ')} كل أخطائك (${mastered.length})`}>
          ما بقي عندك خطأ مفتوح. أي خطأ جديد في نموذجك القادم بيظهر هنا مباشرة.
        </Empty>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
      <header>
        <span className="hall-kick"><AlertTriangle size={12} /> بنك الأخطاء</span>
        <h1 className="hall-h1" style={{ marginBlock: '18px 14px' }}>
          عندك <em>{questionsAr(open.length)}</em> للإعادة.
        </h1>
        <p className="hall-lede">
          {g(
            'هذي أسئلة أخطأت فيها فعلاً — محفوظة بإجابتك والإجابة الصحيحة. أسرع درجات تقدر تكسبها موجودة هنا، لأنك تعرف مسبقاً وين تعثّرت.',
            'هذي أسئلة أخطأتِ فيها فعلاً — محفوظة بإجابتك والإجابة الصحيحة. أسرع درجات تقدرين تكسبينها موجودة هنا، لأنك تعرفين مسبقاً وين تعثّرتِ.',
          )}
        </p>
        <div style={{ display: 'flex', gap: 12, marginBlockStart: 24, flexWrap: 'wrap' }}>
          <button
            className="hall-btn hall-tap"
            onClick={() => navigate('/student/step/exam?mode=review')}
          >
            <RotateCcw size={16} /> {g('راجع أخطاءك الآن', 'راجعي أخطاءك الآن')}
          </button>
          {!!mastered.length && (
            <span className="hall-btn2 hall-tap" style={{ cursor: 'default' }}>
              <Check size={15} style={{ color: 'var(--hall-jade)' }} /> {g('أتقنت', 'أتقنتِ')} {mastered.length}
            </span>
          )}
        </div>
      </header>

      <section style={{ display: 'grid', gap: 10 }}>
        {open.map((row) => <ErrorCard key={row.id} row={row} />)}
      </section>
    </div>
  )
}
