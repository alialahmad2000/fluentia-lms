import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radar, Search, AlertTriangle, Timer, HelpCircle } from 'lucide-react'
import { LabHeader } from '../_ui/primitives'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useReadingErrorCauses, useReadingErrors, useReadingSkills } from '@/hooks/ielts/useReadingLab'
import { useG } from '@/i18n/gender'

const BASE = '/student/ielts-atelier'
const arDigit = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d])

// Four causes, four destinations. This mapping IS the feature: an error list
// that does not tell you what to do next is a report, not a coach.
const CAUSES = (g) => [
  {
    key: 'paraphrase_trap', icon: Radar, tone: 'bad',
    name: 'انخدعتُ بمرادف',
    phrase: 'الانخداع بمرادف',
    desc: g('كنت في المكان الصحيح، لكن العبارة أُعيدت صياغتها فاخترت ما يشبه النص لفظاً لا معنى.',
            'كنتِ في المكان الصحيح، لكن العبارة أُعيدت صياغتها فاخترتِ ما يشبه النص لفظاً لا معنى.'),
    cta: 'رادار إعادة الصياغة', to: `${BASE}/reading/micro?kind=paraphrase`,
    verdict: g('معظم أخطائك من المرادفات — ارجع إلى «رادار إعادة الصياغة»',
               'معظم أخطائك من المرادفات — ارجعي إلى «رادار إعادة الصياغة»'),
    why: 'هذه ليست مشكلة مفردات، بل مشكلة تمييز إعادة صياغة — وتُعالَج بتمرين واحد لا بقراءة أكثر.',
  },
  {
    key: 'not_located', icon: Search, tone: 'accent',
    name: 'ما وجدتُ الجواب',
    phrase: 'عدم الوصول إلى الجواب',
    desc: g('بحثت في الفقرة الخطأ، أو لم تصل إلى موضع الإجابة أصلاً.',
            'بحثتِ في الفقرة الخطأ، أو لم تصلي إلى موضع الإجابة أصلاً.'),
    cta: 'القنص', to: `${BASE}/reading/micro?kind=scan`,
    verdict: g('معظم أخطائك أنك لم تصل إلى الجواب — درّب «القنص»',
               'معظم أخطائك أنك لم تصلي إلى الجواب — درّبي «القنص»'),
    why: g('المشكلة في تحديد الموقع لا في الفهم. سرعة المسح تُدرَّب مباشرة، وتتحسّن بسرعة.',
           'المشكلة في تحديد الموقع لا في الفهم. سرعة المسح تُدرَّب مباشرة، وتتحسّن بسرعة.'),
  },
  {
    key: 'misread', icon: AlertTriangle, tone: 'gold',
    name: 'وجدتُه وفهمتُه خطأ',
    phrase: 'سوء قراءة كلمة محدِّدة',
    desc: g('وصلت إلى الجملة الصحيحة لكن قلبت حكمها — غالباً بسبب كلمة محدِّدة.',
            'وصلتِ إلى الجملة الصحيحة لكن قلبتِ حكمها — غالباً بسبب كلمة محدِّدة.'),
    cta: 'الكلمات المحدِّدة', to: `${BASE}/reading/micro?kind=qualifier`,
    verdict: g('معظم أخطائك في الكلمات المحدِّدة — درّب all / may / often',
               'معظم أخطائك في الكلمات المحدِّدة — درّبي all / may / often'),
    why: 'كلمة واحدة تقلب «صح» إلى «غير مذكور». التدريب عليها منفصلةً أسرع من قراءة قطع كاملة.',
  },
  {
    key: 'ran_out_of_time', icon: Timer, tone: 'gold',
    name: 'خلص الوقت',
    phrase: 'انتهاء الوقت',
    desc: 'أسئلة تُركت فارغة أو خُمّنت في الدقائق الأخيرة.',
    cta: 'تحت الساعة', to: `${BASE}/reading/clock`,
    verdict: g('أكبر خسارتك هي الوقت — انتقل إلى «تحت الساعة»',
               'أكبر خسارتك هي الوقت — انتقلي إلى «تحت الساعة»'),
    why: g('معرفتك ليست المشكلة؛ أنت لا تصل إلى نهاية الورقة. هذا يُحلّ بالتوقيت لا بالمراجعة.',
           'معرفتك ليست المشكلة؛ أنتِ لا تصلين إلى نهاية الورقة. هذا يُحلّ بالتوقيت لا بالمراجعة.'),
  },
]


const TONE_INK = { bad: '#fca5a5', gold: 'var(--iel-gold-ink)', accent: 'var(--iel-accent-ink)', none: 'var(--iel-ink-2)' }
const TONE_FILL = {
  bad: 'linear-gradient(90deg,#fb7185,#f87171)',
  gold: 'linear-gradient(90deg,#f5b042,#eab308)',
  accent: 'linear-gradient(90deg,#10b981,#5eead4)',
  none: 'linear-gradient(90deg,#828d9b,#a9b4c1)',
}

function CauseCard({ cause, pct, n, onGo }) {
  const I = cause.icon
  return (
    <div className="iel-gcard" style={{ padding: '16px 17px', borderColor: cause.tone === 'bad' ? 'rgba(248,113,113,.3)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 9 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 800, color: 'var(--iel-ink)', minWidth: 0 }}>
          <I size={15} style={{ flex: 'none', color: TONE_INK[cause.tone] }} />
          {cause.name}
        </span>
        <span className="iel-serif" style={{ fontSize: 20, fontWeight: 700, flex: 'none', fontVariantNumeric: 'tabular-nums', color: TONE_INK[cause.tone] }}>
          {arDigit(pct)}٪
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--iel-track)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${pct}%`, borderRadius: 3, background: TONE_FILL[cause.tone] }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--iel-ink-3)', lineHeight: 1.7, margin: '9px 0 0' }}>{cause.desc}</p>
      <button type="button" onClick={() => onGo(cause.to)}
        style={{ marginTop: 12, background: 'none', border: 0, padding: 0, cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 12, fontWeight: 800, color: 'var(--iel-accent-ink)' }}>
        ← {cause.cta}{n ? ` · ${arDigit(n)} خطأ` : ''}
      </button>
    </div>
  )
}

function ErrorRow({ err, typeName, onGo, byKey }) {
  const c = byKey[err.cause]
  return (
    <div className="iel-passrow" style={{
      display: 'flex', alignItems: 'center', gap: 13, padding: '14px 16px', borderRadius: 13,
      background: 'var(--iel-surface-2)', border: '1px solid var(--iel-border)', marginBottom: 9, cursor: c ? 'pointer' : 'default',
    }} onClick={() => c && onGo(c.to)}>
      <span style={{
        width: 32, height: 32, borderRadius: 10, flex: 'none', display: 'grid', placeItems: 'center',
        border: `1px solid ${c ? (c.tone === 'bad' ? 'rgba(248,113,113,.3)' : 'rgba(234,179,8,.3)') : 'var(--iel-border)'}`,
        background: 'var(--iel-surface)', color: c ? TONE_INK[c.tone] : 'var(--iel-ink-3)',
      }}>
        {c ? <c.icon size={15} /> : <HelpCircle size={15} />}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--iel-ink)', marginBottom: 5, direction: 'ltr', textAlign: 'start', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {err.question_text}
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {c && <span className="iel-metachip" style={{ color: TONE_INK[c.tone], borderColor: c.tone === 'bad' ? 'rgba(248,113,113,.3)' : 'rgba(234,179,8,.3)' }}>{c.name}</span>}
          {typeName && <span className="iel-metachip">{typeName}</span>}
          {err.student_answer != null && (
            <span className="iel-metachip" style={{ direction: 'ltr' }}>
              اخترتِ {err.student_answer} · الصحيح {err.correct_answer}
            </span>
          )}
        </div>
      </div>
      <span className="arrow" style={{ flex: 'none', color: 'var(--iel-ink-3)' }}>←</span>
    </div>
  )
}

export default function ReadingErrors() {
  const navigate = useNavigate()
  const g = useG()
  const studentId = useStudentId()
  const causeList = useMemo(() => CAUSES(g), [g])
  const byKey = useMemo(() => Object.fromEntries(causeList.map((c) => [c.key, c])), [causeList])
  const { data: causes, isLoading } = useReadingErrorCauses(studentId)
  const { data: errors = [] } = useReadingErrors(studentId, 30)
  const { data: skills = [] } = useReadingSkills()

  const typeNames = useMemo(
    () => Object.fromEntries(skills.map((s) => [s.question_type, s.name_ar])),
    [skills],
  )

  const classified = useMemo(() => {
    if (!causes) return { total: 0, rows: [], top: null }
    const rows = causeList.map((c) => ({ cause: c, n: causes[c.key] || 0 }))
    const total = rows.reduce((a, r) => a + r.n, 0)
    const top = total > 0 ? rows.slice().sort((a, b) => b.n - a.n)[0] : null
    return { total, rows, top }
  }, [causes, causeList])

  const { total, rows, top } = classified
  const topPct = top && total ? Math.round((top.n / total) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, paddingTop: 2, maxWidth: 940 }}>
      <LabHeader eyebrow="حلقة الإغلاق · التشخيص" title="أخطائي في القراءة">
        {g('كل إجابة خاطئة تُصنَّف حسب سببها لا حسب نوعها — لأن السبب هو ما يخبرك بما تفعله غداً. هذه الصفحة تُرجعك إلى الدرجة التي سقطت منها بالضبط.', 'كل إجابة خاطئة تُصنَّف حسب سببها لا حسب نوعها — لأن السبب هو ما يخبرك بما تفعلينه غداً. هذه الصفحة تُرجعك إلى الدرجة التي سقطتِ منها بالضبط.')}
      </LabHeader>

      {/* Verdict — one sentence and one button. Only shown when there is enough
          evidence to be worth acting on; a "diagnosis" from three errors is noise. */}
      {total >= 6 && top && top.n > 0 && (
        <div className="iel-coach">
          <div className="iel-coach-glow" />
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--iel-accent)', letterSpacing: '.06em', marginBottom: 10 }}>
              خلاصة آخر {arDigit(total)} خطأ
            </div>
            <h3 style={{ fontFamily: 'var(--iel-display)', fontSize: 24, fontWeight: 700, color: 'var(--iel-ink)', lineHeight: 1.5, margin: '0 0 9px' }}>
              {top.cause.verdict}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: '0 0 18px', maxWidth: '60ch' }}>
              {arDigit(topPct)}٪ من إجاباتك الخاطئة سببها {top.cause.phrase}. {top.cause.why}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative' }}>
              <button type="button" onClick={() => navigate(top.cause.to)} className="iel-primary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 12, border: 0,
                  cursor: 'pointer', fontFamily: "'Tajawal', sans-serif", fontSize: 14, fontWeight: 800, position: 'relative', overflow: 'hidden',
                  background: 'linear-gradient(140deg,#12c48c,var(--iel-accent) 60%,#06705a)', color: '#02231b',
                  boxShadow: '0 6px 18px -10px rgba(16,185,129,.7), inset 0 1px 0 rgba(255,255,255,.2)',
                }}>
                {g('ابدأ', 'ابدئي')} {top.cause.cta}
              </button>
              <button type="button" onClick={() => navigate(`${BASE}/errors`)} className="iel-metachip" style={{ cursor: 'pointer', padding: '11px 18px', fontSize: 13 }}>
                بنك الأخطاء الكامل
              </button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && total === 0 && (
        <div className="iel-gcard" style={{ padding: '22px 24px' }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--iel-ink)', marginBottom: 8 }}>لا توجد أخطاء مسجّلة بعد</div>
          <p style={{ fontSize: 13.5, color: 'var(--iel-ink-2)', lineHeight: 1.85, margin: '0 0 14px' }}>
            {g('تُملأ هذه الصفحة تلقائياً من إجاباتك. اجلس قطعة واحدة تحت الساعة، وسيظهر هنا سبب كل خطأ مع التمرين الذي يعالجه.', 'تُملأ هذه الصفحة تلقائياً من إجاباتك. اجلسي قطعة واحدة تحت الساعة، وسيظهر هنا سبب كل خطأ مع التمرين الذي يعالجه.')}
          </p>
          <button type="button" onClick={() => navigate(`${BASE}/reading/clock`)} className="iel-metachip"
            style={{ cursor: 'pointer', padding: '10px 18px', fontSize: 13, background: 'var(--iel-accent-soft)', borderColor: 'rgba(16,185,129,.3)', color: 'var(--iel-accent-ink)' }}>
            {g('ابدأ', 'ابدئي')} قطعة تحت الساعة ←
          </button>
        </div>
      )}

      {total > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>أخطاؤك حسب السبب</h2>
            <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>وليس حسب نوع السؤال — النوع لا يخبرك بما تفعلين</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
            {rows.map(({ cause, n }) => (
              <CauseCard key={cause.key} cause={cause} n={n} pct={total ? Math.round((n / total) * 100) : 0} onGo={navigate} />
            ))}
          </div>
        </>
      )}

      {errors.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--iel-ink)' }}>أحدث الأخطاء</h2>
            <span style={{ fontSize: 12.5, color: 'var(--iel-ink-3)', fontWeight: 600 }}>{g('اضغط أي خطأ لتذهب إلى تمرينه', 'اضغطي أي خطأ لتذهبي إلى تمرينه')}</span>
          </div>
          <div>
            {errors.map((e) => (
              <ErrorRow key={e.id} err={e} typeName={typeNames[e.question_type]} onGo={navigate} byKey={byKey} />
            ))}
          </div>
        </>
      )}

      <div style={{ padding: '15px 17px', borderRadius: 13, background: 'var(--iel-gold-soft)', border: '1px solid rgba(234,179,8,.24)', fontSize: 13, color: 'var(--iel-ink-2)', lineHeight: 1.85 }}>
        <b style={{ color: 'var(--iel-gold-ink)', fontWeight: 800 }}>لماذا التصنيف بالسبب لا بالنوع:</b>{' '}
        {g('«أخطأت في ثمانية أسئلة من نوع صح/خطأ» لا يقول لك ماذا تفعل. «٥٩٪ من أخطائك مرادفات» يقول لك تمريناً واحداً محدّداً — وهذا هو الفرق بين تقرير ومدرّب.', '«أخطأتِ في ثمانية أسئلة من نوع صح/خطأ» لا يقول لكِ ماذا تفعلين. «٥٩٪ من أخطائك مرادفات» يقول لكِ تمريناً واحداً محدّداً — وهذا هو الفرق بين تقرير ومدرّب.')}
      </div>
    </div>
  )
}
