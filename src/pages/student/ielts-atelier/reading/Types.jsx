import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileQuestion, Timer, Target } from 'lucide-react'
import { LabHeader } from '../_ui/primitives'
import { StrategyDrawer } from '../_ui/QuestionTypesSection'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useReadingSkills, useReadingTypeStats } from '@/hooks/ielts/useReadingLab'
import { useG } from '@/i18n/gender'

const BASE = '/student/ielts-atelier'
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

// Each question type fails in a characteristic way, and each failure has one
// drill that fixes it. This is what turns a tile from a statistic into an
// instruction — tap a red tile and you land on the rep, not on an article.
const DRILL_FOR = {
  true_false_not_given: 'qualifier',
  yes_no_not_given: 'qualifier',
  multiple_choice: 'paraphrase',
  matching_headings: 'gist',
  matching_information: 'scan',
  matching_features: 'scan',
  matching_sentence_endings: 'paraphrase',
  sentence_completion: 'scan',
  summary_completion: 'paraphrase',
  note_table_flowchart: 'scan',
  diagram_label: 'scan',
  short_answer: 'scan',
}
const DRILL_LABEL = {
  paraphrase: 'رادار إعادة الصياغة',
  scan: 'القنص',
  gist: 'صيد الفكرة',
  qualifier: 'الكلمات المحدِّدة',
}

// Weak / mid / strong. The thresholds are the ones that matter in IELTS: below
// 60% a type is actively costing bands, above 80% it is banked.
function tone(pct) {
  if (pct == null) return 'none'
  if (pct < 60) return 'weak'
  if (pct < 80) return 'mid'
  return 'strong'
}
const TONE_FILL = {
  weak: 'linear-gradient(90deg,#fb7185,#f87171)',
  mid: 'linear-gradient(90deg,#f5b042,#eab308)',
  strong: 'linear-gradient(90deg,#10b981,#5eead4)',
}
const TONE_INK = { weak: '#fca5a5', mid: 'var(--iel-gold-ink)', strong: 'var(--iel-accent-ink)', none: 'var(--iel-ink-3)' }

function Legend() {
  const items = [
    ['weak', 'ضعيف — أقل من ٦٠٪'],
    ['mid', 'متوسّط — ٦٠ إلى ٨٠٪'],
    ['strong', 'قويّ — فوق ٨٠٪'],
  ]
  return (
    <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', alignItems: 'center' }}>
      {items.map(([t, label]) => (
        <span key={t} className="iel-metachip" style={{ color: TONE_INK[t] }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: TONE_INK[t], display: 'inline-block' }} />
          {label}
        </span>
      ))}
    </div>
  )
}

function TypeTile({ skill, stat, onOpen }) {
  const attempted = stat?.attempted || 0
  const pct = attempted > 0 ? Math.round((stat.correct / attempted) * 100) : null
  const t = tone(pct)
  const secs = stat?.avg_seconds != null ? Number(stat.avg_seconds) : null

  return (
    <button
      type="button"
      onClick={() => onOpen(skill)}
      className="iel-gcard"
      style={{
        textAlign: 'start', cursor: 'pointer', fontFamily: "'Tajawal', sans-serif",
        padding: '16px 17px 14px', display: 'block', width: '100%',
        borderColor: t === 'weak' ? 'rgba(248,113,113,.32)' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--iel-ink)', lineHeight: 1.35 }}>{skill.name_ar}</div>
          <div className="iel-serif" style={{ fontSize: 11, color: 'var(--iel-ink-3)', fontWeight: 600, marginTop: 3, direction: 'ltr', textAlign: 'start' }}>{skill.name_en}</div>
        </div>
        <div className="iel-serif" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1, flex: 'none', color: TONE_INK[t] }}>
          {pct == null ? '—' : `${arDigit(pct)}٪`}
        </div>
      </div>

      <div style={{ height: 5, borderRadius: 3, background: 'var(--iel-track)', overflow: 'hidden', marginBottom: 10 }}>
        <span style={{ display: 'block', height: '100%', borderRadius: 3, width: `${pct ?? 0}%`, background: TONE_FILL[t] || 'transparent' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11.5, fontWeight: 700, color: 'var(--iel-ink-3)' }}>
        <span>{attempted ? `${arDigit(attempted)} سؤالاً` : 'لم تُقَس بعد'}</span>
        <span>{secs != null ? `${arDigit(Math.round(secs))} ثانية / سؤال` : ''}</span>
      </div>
    </button>
  )
}

export default function ReadingTypes() {
  const navigate = useNavigate()
  const studentId = useStudentId()
  const g = useG()
  const { data: skills = [], isLoading } = useReadingSkills()
  const { data: stats = {} } = useReadingTypeStats(studentId)
  const [active, setActive] = useState(null)

  // Worst first — the whole point of a heatmap is that you do not have to hunt
  // for the problem. Unmeasured types sink to the bottom rather than the top,
  // because "no data" is not a weakness.
  const ordered = useMemo(() => {
    const withPct = skills.map((s) => {
      const st = stats[s.question_type]
      const attempted = st?.attempted || 0
      return { skill: s, stat: st, pct: attempted > 0 ? (st.correct / attempted) * 100 : null, attempted }
    })
    return withPct.sort((a, b) => {
      if (a.pct == null && b.pct == null) return (a.skill.sort_order || 0) - (b.skill.sort_order || 0)
      if (a.pct == null) return 1
      if (b.pct == null) return -1
      return a.pct - b.pct
    })
  }, [skills, stats])

  const measured = ordered.filter((o) => o.pct != null)
  const weak = measured.filter((o) => o.pct < 60)
  const weakQuestions = weak.reduce((n, o) => n + o.attempted, 0)

  const openDrill = (qtype) => {
    const kind = DRILL_FOR[qtype]
    navigate(kind ? `${BASE}/reading/micro?kind=${kind}` : `${BASE}/reading/micro`)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="الدرجة الثانية · خريطة الإتقان" title="أنواع الأسئلة">
        اثنا عشر نوعاً — ودرجتك ليست موزّعة عليها بالتساوي. هذه الخريطة تُظهر نسبة إجاباتك الصحيحة ومتوسّط ثوانيك في كل نوع، {g('فترى بالضبط أين تنزف الدرجات وأين يضيع الوقت. اضغط أي بطاقة لتفتح استراتيجيتها والتمرين الذي يعالجها.', 'فترين بالضبط أين تنزف الدرجات وأين يضيع الوقت. اضغطي أي بطاقة لتفتحي استراتيجيتها والتمرين الذي يعالجها.')}
      </LabHeader>

      <Legend />

      {/* The headline only appears when the data actually says something. A
          verdict invented from two questions would be worse than silence. */}
      {weak.length > 0 && weakQuestions >= 8 && (
        <div className="iel-coach">
          <div className="iel-coach-glow" />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.06em', marginBottom: 9 }}>ما تقوله الخريطة</div>
            <h3 style={{ fontFamily: 'var(--iel-display)', fontSize: 22, fontWeight: 700, color: 'var(--iel-ink)', lineHeight: 1.55, margin: '0 0 8px' }}>
              {weak.length === 1
                ? `«${weak[0].skill.name_ar}» وحده يبتلع ${arDigit(weakQuestions)} سؤالاً وأنت${g('', 'ِ')} دون ٦٠٪ فيه`
                : `${arDigit(weak.length)} أنواع تبتلع ${arDigit(weakQuestions)} سؤالاً وأنت${g('', 'ِ')} دون ٦٠٪ فيها`}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: '0 0 16px', maxWidth: '60ch' }}>
              {g('هذه درجات جاهزة للاسترداد، ولا تحتاج قراءة أكثر — تحتاج تمريناً محدّداً. ابدأ من الأحمر، لا من أول القائمة.', 'هذه درجات جاهزة للاسترداد، ولا تحتاج قراءة أكثر — تحتاج تمريناً محدّداً. ابدئي من الأحمر، لا من أول القائمة.')}
            </p>
            <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap', position: 'relative' }}>
              {weak.slice(0, 3).map((o) => (
                <button
                  key={o.skill.question_type}
                  type="button"
                  onClick={() => openDrill(o.skill.question_type)}
                  className="iel-metachip"
                  style={{ cursor: 'pointer', background: 'var(--iel-accent-soft)', borderColor: 'rgba(16,185,129,.3)', color: 'var(--iel-accent-ink)' }}
                >
                  <Target size={13} />
                  {DRILL_LABEL[DRILL_FOR[o.skill.question_type]] || 'تدريب'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Nothing measured yet: say so plainly instead of drawing an empty chart. */}
      {!isLoading && measured.length === 0 && (
        <div className="iel-gcard" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 8 }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'var(--iel-gold-soft)', border: '1px solid rgba(234,179,8,.3)', color: 'var(--iel-gold-ink)' }}>
              <Timer size={17} />
            </span>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)' }}>الخريطة تُرسم من إجاباتك</div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: 0 }}>
            {g('لم تحلّ أسئلة كافية بعد لقياس أي نوع. اجلس قطعة واحدة في «تحت الساعة» — ثلاثة عشر سؤالاً تكفي لإضاءة أول بطاقات هذه الخريطة.', 'لم تحلّي أسئلة كافية بعد لقياس أي نوع. اجلسي قطعة واحدة في «تحت الساعة» — ثلاثة عشر سؤالاً تكفي لإضاءة أول بطاقات هذه الخريطة.')}
          </p>
          <button type="button" onClick={() => navigate(`${BASE}/reading/clock`)} className="iel-metachip"
            style={{ marginTop: 14, cursor: 'pointer', background: 'var(--iel-accent-soft)', borderColor: 'rgba(16,185,129,.3)', color: 'var(--iel-accent-ink)' }}>
            {g('ابدأ', 'ابدئي')} قطعة تحت الساعة ←
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(258px, 1fr))', gap: 12 }}>
        {ordered.map(({ skill, stat }) => (
          <TypeTile key={skill.question_type} skill={skill} stat={stat} onOpen={setActive} />
        ))}
      </div>

      <StrategyDrawer skill={active} onClose={() => setActive(null)} />

      {/* The drawer teaches; this returns the student to doing. */}
      {active && DRILL_FOR[active.question_type] && (
        <button
          type="button"
          onClick={() => { const q = active.question_type; setActive(null); openDrill(q) }}
          className="iel-primary"
          style={{
            position: 'fixed', insetInlineStart: 26, bottom: 26, zIndex: 10060,
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 22px', borderRadius: 13, border: 0,
            cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 14, fontWeight: 800, overflow: 'hidden',
            background: 'linear-gradient(140deg,#12c48c,var(--iel-accent) 60%,#06705a)', color: '#02231b',
            boxShadow: '0 8px 22px -10px rgba(16,185,129,.7), inset 0 1px 0 rgba(255,255,255,.2)',
          }}
        >
          <FileQuestion size={16} />
          {g('درّب', 'درّبي')}: {DRILL_LABEL[DRILL_FOR[active.question_type]]}
        </button>
      )}
    </div>
  )
}
