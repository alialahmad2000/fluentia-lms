import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Target, Briefcase, Sparkles, ArrowLeft, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useEffectiveStudentId } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import './studentIntake.css'

// ── The intake consultation (2026-07-25) ───────────────────────────────────
// Nine bespoke tracks were hand-built one student at a time, and every one began
// with Ali learning, in conversation, why that person needs English. The product
// never asked. This does — in five unhurried questions, one per screen.
//
// It records intent only. Granting IELTS/Pro-Desk access stays an admin action
// behind guard_student_account_columns(); a student saying "I need this for work"
// is the beginning of a conversation, not an entitlement.

const GOALS = [
  {
    id: 'ielts',
    icon: Target,
    title: 'عندي اختبار آيلتس',
    body: 'درجة محدّدة، وموعد يقترب.',
  },
  {
    id: 'career',
    icon: Briefcase,
    title: 'أحتاجها في شغلي',
    body: 'اجتماعات، إيميلات، مكالمات مع زملاء لا يتكلمون العربية.',
  },
  {
    id: 'growth',
    icon: Sparkles,
    title: 'أبي أتكلمها بطلاقة',
    body: 'بدون امتحان ولا موعد — أبيها لنفسي.',
  },
]

const FIELDS = ['تقنية', 'صحة وطب', 'أعمال وإدارة', 'تعليم', 'هندسة', 'تسويق', 'دراسة جامعية', 'قانون', 'ضيافة وسياحة']

const HORIZONS = [
  { id: '2_months',    label: 'خلال شهرين' },
  { id: '3_6_months',  label: 'من ٣ إلى ٦ أشهر' },
  { id: 'a_year',      label: 'خلال سنة' },
  { id: 'no_deadline', label: 'ما عندي موعد محدّد' },
]

const HOURS = [
  { id: 2,  label: 'ساعتان' },
  { id: 4,  label: '٤ ساعات' },
  { id: 6,  label: '٦ ساعات' },
  { id: 10, label: '١٠ ساعات أو أكثر' },
]

const CONFIDENCE = [
  { id: 1, label: () => 'أفهم قليلاً، وأتكلم بصعوبة' },
  { id: 2, label: () => 'أفهم، لكن أتلعثم إذا تكلمت' },
  { id: 3, label: () => 'أتكلم في المواضيع المعتادة' },
  { id: 4, label: (g) => g('مرتاح غالباً، أتعثّر في المواقف الرسمية', 'مرتاحة غالباً، أتعثّر في المواقف الرسمية') },
  { id: 5, label: (g) => g('مرتاح — أبي الصقل والدقّة', 'مرتاحة — أبي الصقل والدقّة') },
]

export default function StudentIntake() {
  const studentId = useEffectiveStudentId()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const g = useG()
  const reduce = useReducedMotion()

  const [step, setStep] = useState(0)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [answers, setAnswers] = useState({
    goal: null, field: '', role_title: '', horizon: null,
    motivation_moment: '', confidence: null, weekly_hours: null,
  })

  const { data: existing, isLoading } = useQuery({
    queryKey: ['student', 'intake', studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_intake').select('*').eq('student_id', studentId).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const set = (patch) => setAnswers((a) => ({ ...a, ...patch }))

  // Seed the form from the saved row so editing never starts blank — otherwise
  // submit() upserts nulls over answers she already gave.
  useEffect(() => {
    if (!existing) return
    setAnswers({
      goal: existing.goal ?? null,
      field: existing.field ?? '',
      role_title: existing.role_title ?? '',
      horizon: existing.horizon ?? null,
      motivation_moment: existing.motivation_moment ?? '',
      confidence: existing.confidence ?? null,
      weekly_hours: existing.weekly_hours ?? null,
    })
  }, [existing])

  const STEPS = useMemo(() => [
    {
      id: 'goal',
      eyebrow: 'السؤال الأول',
      title: g('لماذا تتعلّم الإنجليزية؟', 'لماذا تتعلّمين الإنجليزية؟'),
      lede: 'إجابتك أول ما يقرأه د. علي وهو يرسم مسارك — لا نعطي الجميع نفس الخطة.',
      canAdvance: !!answers.goal,
      render: () => (
        <div className="ik-cards">
          {GOALS.map((o) => {
            const Icon = o.icon
            const on = answers.goal === o.id
            return (
              <button key={o.id} type="button" onClick={() => set({ goal: o.id })}
                className={`ik-card ${on ? 'is-on' : ''}`}>
                <span className="ik-card__icon"><Icon size={20} /></span>
                <span className="ik-card__title">{o.title}</span>
                <span className="ik-card__body">{o.body}</span>
                {on && <span className="ik-card__check"><Check size={15} /></span>}
              </button>
            )
          })}
        </div>
      ),
    },
    {
      id: 'field',
      eyebrow: 'السؤال الثاني',
      title: g('في أي مجال تعمل أو تدرس؟', 'في أي مجال تعملين أو تدرسين؟'),
      lede: g('من مجالك نبني مفرداتك ومواقفك — لا كلمات عامة لن تستخدمها.', 'من مجالكِ نبني مفرداتكِ ومواقفكِ — لا كلمات عامة لن تستخدميها.'),
      canAdvance: !!answers.field.trim(),
      render: () => (
        <>
          <div className="ik-chips">
            {FIELDS.map((f) => (
              <button key={f} type="button" onClick={() => set({ field: f })}
                className={`ik-chip ${answers.field === f ? 'is-on' : ''}`}>{f}</button>
            ))}
          </div>
          <input className="ik-input" value={answers.field}
            onChange={(e) => set({ field: e.target.value })}
            placeholder={g('أو اكتبه بنفسك…', 'أو اكتبيه بنفسكِ…')} dir="auto" />
          <input className="ik-input" value={answers.role_title}
            onChange={(e) => set({ role_title: e.target.value })}
            placeholder={g('مسمّاك الوظيفي (اختياري) — مثال: محلّل بيانات', 'مسمّاكِ الوظيفي (اختياري) — مثال: محلّلة بيانات')} dir="auto" />
        </>
      ),
    },
    {
      id: 'moment',
      eyebrow: 'السؤال الثالث',
      title: g('ما الموقف الذي تتمنّى أن تتكلّم فيه بثقة؟',
               'ما الموقف الذي تتمنّين أن تتكلّمي فيه بثقة؟'),
      lede: g('اكتبه بالعربي وبصراحة — وهذا أهم سؤال هنا.', 'اكتبيه بالعربي وبصراحة — وهذا أهم سؤال هنا.'),
      canAdvance: answers.motivation_moment.trim().length >= 10,
      render: () => (
        <>
          <textarea className="ik-textarea" rows={5} dir="auto"
            value={answers.motivation_moment}
            onChange={(e) => set({ motivation_moment: e.target.value })}
            placeholder="مثال: أرد على مكالمة من فريق الدعم الفني وأفهم كل كلمة، بدون ما أطلب منهم يعيدون." />
          <p className="ik-hint">
            {answers.motivation_moment.trim().length < 10
              ? g('اكتب جملة واحدة على الأقل.', 'اكتبي جملة واحدة على الأقل.')
              : 'وصلتنا — شكراً على الصراحة.'}
          </p>
        </>
      ),
    },
    {
      id: 'when',
      eyebrow: 'السؤال الرابع',
      title: g('متى تحتاجها؟', 'متى تحتاجينها؟'),
      lede: 'الموعد يغيّر الخطة كلها — بلا موعد نبني بعمق، ومع موعد نبني بأولويات.',
      canAdvance: !!answers.horizon,
      render: () => (
        <div className="ik-list">
          {HORIZONS.map((h) => (
            <button key={h.id} type="button" onClick={() => set({ horizon: h.id })}
              className={`ik-opt ${answers.horizon === h.id ? 'is-on' : ''}`}>
              <span>{h.label}</span>
              {answers.horizon === h.id && <Check size={16} />}
            </button>
          ))}
        </div>
      ),
    },
    {
      id: 'capacity',
      eyebrow: 'السؤال الأخير',
      title: g('أين أنت الآن، وكم تستطيع أن تعطي؟',
               'أين أنتِ الآن، وكم تستطيعين أن تعطي؟'),
      lede: g('كن صادقاً — خطة تناسب وقتك الحقيقي أفضل من خطة مثالية لا تُنفَّذ.', 'كوني صادقة — خطة تناسب وقتكِ الحقيقي أفضل من خطة مثالية لا تُنفَّذ.'),
      canAdvance: !!answers.confidence && !!answers.weekly_hours,
      render: () => (
        <>
          <div className="ik-sublabel">مستواك الآن</div>
          <div className="ik-list">
            {CONFIDENCE.map((c) => (
              <button key={c.id} type="button" onClick={() => set({ confidence: c.id })}
                className={`ik-opt ${answers.confidence === c.id ? 'is-on' : ''}`}>
                <span>{c.label(g)}</span>
                {answers.confidence === c.id && <Check size={16} />}
              </button>
            ))}
          </div>
          <div className="ik-sublabel">ساعات الأسبوع</div>
          <div className="ik-chips">
            {HOURS.map((h) => (
              <button key={h.id} type="button" onClick={() => set({ weekly_hours: h.id })}
                className={`ik-chip ${answers.weekly_hours === h.id ? 'is-on' : ''}`}>{h.label}</button>
            ))}
          </div>
        </>
      ),
    },
  ], [answers, g])

  async function submit() {
    setSaving(true); setError(null)
    const { error } = await supabase.from('student_intake').upsert({
      student_id: studentId,
      goal: answers.goal,
      field: answers.field.trim() || null,
      role_title: answers.role_title.trim() || null,
      horizon: answers.horizon,
      motivation_moment: answers.motivation_moment.trim() || null,
      confidence: answers.confidence,
      weekly_hours: answers.weekly_hours,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id' }).select()
    setSaving(false)
    if (error) {
      setError(g('ما وصلت إجاباتك — تأكد من الاتصال وحاول مرة أخرى. ما كتبته محفوظ في الشاشة.',
                 'ما وصلت إجاباتكِ — تأكدي من الاتصال وحاولي مرة أخرى. ما كتبتِه محفوظ في الشاشة.'))
      return
    }
    qc.invalidateQueries({ queryKey: ['student', 'intake', studentId] })
    setStep(STEPS.length) // closing screen
  }

  const rise = reduce ? {} : {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
  }

  if (isLoading) {
    return <div className="ik-root"><div className="ik-atmo" aria-hidden="true" /><div className="ik-shell"><div className="ik-skel" /></div></div>
  }

  // Already answered, and not mid-flow — show the summary instead of re-asking.
  if (existing && !editing && step === 0) {
    const goal = GOALS.find((x) => x.id === existing.goal)
    return (
      <div className="ik-root">
        <div className="ik-atmo" aria-hidden="true" />
        <div className="ik-shell">
          <div className="ik-done">
            <span className="ik-done__mark"><Check size={22} /></span>
            <h1 className="ik-done__title">{g('وصلتنا إجاباتك', 'وصلتنا إجاباتكِ')}</h1>
            <p className="ik-done__body">
              {goal ? `هدفك: ${goal.title}` : ''}
              {existing.field ? ` · ${existing.field}` : ''}
            </p>
            <p className="ik-done__note">
              {g('يراجعها د. علي بنفسه ويشكّل مسارك على أساسها. إن تغيّر شيء، عدّل إجاباتك متى شئت.',
                 'يراجعها د. علي بنفسه ويشكّل مسارك على أساسها. إن تغيّر شيء، عدّلي إجاباتك متى شئتِ.')}
            </p>
            <div className="ik-done__actions">
              <button type="button" className="ik-btn ik-btn--ghost" onClick={() => { setEditing(true); setStep(0) }}>
                تعديل إجاباتي
              </button>
              <button type="button" className="ik-btn" onClick={() => navigate('/student')}>
                {g('ابدأ التعلّم', 'ابدئي التعلّم')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Closing screen after a fresh submit.
  if (step >= STEPS.length) {
    return (
      <div className="ik-root">
        <div className="ik-atmo" aria-hidden="true" />
        <div className="ik-shell">
          <motion.div className="ik-done" {...rise}>
            <span className="ik-done__mark"><Check size={22} /></span>
            <h1 className="ik-done__title">شكراً — وصلتنا</h1>
            <p className="ik-done__note">
              {g('د. علي يقرأ إجاباتك بنفسه. ابدأ من المنهج الآن — وإن كان مسارك يحتاج تفصيلاً خاصاً، يوصلك منه خبر.',
                 'د. علي يقرأ إجاباتكِ بنفسه. ابدئي من المنهج الآن — وإن كان مسارك يحتاج تفصيلاً خاصاً، يوصلكِ منه خبر.')}
            </p>
            <div className="ik-done__actions">
              <button type="button" className="ik-btn" onClick={() => navigate('/student')}>
                {g('ابدأ التعلّم', 'ابدئي التعلّم')}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  const idx = Math.max(0, Math.floor(step))
  const s = STEPS[idx]
  const isLast = idx === STEPS.length - 1

  return (
    <div className="ik-root">
      <div className="ik-atmo" aria-hidden="true" />
      <div className="ik-shell">
        <div className="ik-progress" role="presentation">
          {STEPS.map((_, i) => (
            <span key={i} className={`ik-progress__seg ${i <= idx ? 'is-on' : ''}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={s.id} className="ik-step" {...rise}>
            <div className="ik-step__eyebrow">{s.eyebrow}</div>
            <h1 className="ik-step__title">{s.title}</h1>
            <p className="ik-step__lede">{s.lede}</p>
            <div className="ik-step__body">{s.render()}</div>
          </motion.div>
        </AnimatePresence>

        {error && <p className="ik-error">{error}</p>}

        <div className="ik-nav">
          {idx > 0 && (
            <button type="button" className="ik-btn ik-btn--ghost" onClick={() => setStep(idx - 1)}>
              السابق
            </button>
          )}
          <button type="button" className="ik-btn" disabled={!s.canAdvance || saving}
            onClick={() => (isLast ? submit() : setStep(idx + 1))}>
            {saving ? <Loader2 size={16} className="ik-spin" /> : null}
            {isLast ? (saving ? 'نحفظ إجاباتك…' : 'إرسال') : 'التالي'}
            {!isLast && <ArrowLeft size={16} />}
          </button>
        </div>
      </div>
    </div>
  )
}
