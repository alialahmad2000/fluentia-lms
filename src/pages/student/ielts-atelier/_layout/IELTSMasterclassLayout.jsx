import { Suspense, useEffect, Fragment } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import '../_ui/ielts-theme.css'
import { Icon, NavItem } from '../_ui/primitives'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useSkillProgress, useErrorBankCount, useErrorBankBySkill, useAdaptivePlan } from '@/hooks/ielts/useIELTSHub'
import { useAuthStore } from '@/stores/authStore'

const BASE = '/student/ielts-atelier'
const SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SKILL_LABEL = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }
// Every skill is a parent whose click opens its PERFORMANCE page (the monitor);
// the sub-items are the ways to learn/practise that skill.
//
// Reading is a LADDER, not a table of contents: know the method → know each
// type's trap → drill the raw sub-skill → one passage under a clock → the full
// exam. «أخطائي» closes the loop by sending you back to the rung you fell off.
//
// That order used to be invisible: six identical dots read as six peer options,
// so nothing told the student where to start. It is now carried WITHOUT any
// numbering, by two cues that are also real information:
//   1. the group names are themselves a sequence — التعلّم → التدريب → المراجعة.
//      Nouns, not imperatives: a nav label is a category, and nouns carry no
//      gender, so one string is correct for every student (see src/i18n/gender).
//   2. `intensity` draws ascending bars showing how much pressure a drill puts
//      her under. Set it ONLY where a genuine ramp exists — reading goes untimed
//      drill (1) → one passage in 20 minutes (2) → the full 60-minute test (3).
//      Exam parts that merely have a fixed order (speaking 1/2/3, writing 1/2)
//      get no bars: there the bars would be decoration, not meaning.
// `loop: true` marks the feedback surface — it is a report about the student,
// not another rung, so it is toned gold instead of the green practice track.
//
// Group headings are rendered only for skills with 3+ sub-items (see
// GROUP_HEADING_MIN). On a two-item list they cost two heading rows to separate
// two rows — more chrome than the split is worth, and the pair already reads as
// guide-then-practice on its own.
const SKILL_SUB = {
  reading: [
    { group: 'التعلّم', items: [
      { path: 'reading', label: 'دليل القراءة', exact: true },
      { path: 'reading/types', label: 'أنواع الأسئلة' },
    ] },
    { group: 'التدريب', items: [
      { path: 'reading/micro', label: 'المهارات المصغّرة', intensity: 1 },
      { path: 'reading/clock', label: 'تحت الساعة', intensity: 2 },
      { path: 'reading/tests', label: 'الاختبارات', intensity: 3 },
    ] },
    { group: 'المراجعة', items: [
      { path: 'reading/errors', label: 'أخطائي في القراءة', loop: true },
    ] },
  ],
  // Listening's ramp is neither time (reading) nor scaffolding (writing): the
  // recording sets the clock, so what escalates is HOW MANY TIMES she may hear
  // it. Replay freely while drilling → one play only, as in the exam.
  listening: [
    { group: 'التعلّم', items: [{ path: 'listening/guide', label: 'دليل الاستماع' }] },
    { group: 'التدريب', items: [
      { path: 'listening', label: 'التمارين', exact: true, intensity: 1 },
    ] },
    { group: 'المراجعة', items: [
      { path: 'listening/errors', label: 'أخطائي في الاستماع', loop: true },
    ] },
  ],
  // Writing's ramp is neither time (reading) nor replays (listening) — there is
  // no right answer at all, it is scored on four criteria and improves by
  // iterating on the same text. What escalates is how much SCAFFOLDING is taken
  // away: template + key phrases on screen → one task on its own clock → both
  // tasks in 60 minutes with nothing.
  writing: [
    { group: 'التعلّم', items: [
      { path: 'writing', label: 'دليل الكتابة', exact: true },
      { path: 'writing/criteria', label: 'المعايير الأربعة' },
      { path: 'writing/models', label: 'نماذج مشروحة' },
    ] },
    { group: 'التدريب', items: [
      { path: 'writing/micro', label: 'المهارات المصغّرة', intensity: 1 },
      { path: 'writing/task1', label: 'المهمة الأولى', intensity: 2 },
      { path: 'writing/task2', label: 'المهمة الثانية', intensity: 2 },
      { path: 'writing/full', label: 'الاختبار الكامل', intensity: 3 },
    ] },
    { group: 'المراجعة', items: [
      { path: 'writing/errors', label: 'أخطائي في الكتابة', loop: true },
    ] },
  ],
  speaking: [
    { group: 'التعلّم', items: [{ path: 'speaking/guide', label: 'دليل المحادثة' }] },
    { group: 'التدريب', items: [
      { path: 'speaking', label: 'الجزء الأول', exact: true },
      { path: 'speaking/part2', label: 'الجزء الثاني' },
      { path: 'speaking/part3', label: 'الجزء الثالث' },
    ] },
  ],
}

// Below this many sub-items, group headings add more rows than they clarify.
const GROUP_HEADING_MIN = 3
const countItems = (groups) => groups.reduce((n, g) => n + g.items.length, 0)

const INTENSITY_LABEL = { 1: 'تمرين قصير بلا وقت', 2: 'قطعة واحدة بوقت', 3: 'اختبار كامل بوقت' }

// `level` ascending bars — the ramp cue that replaces numbering inside a
// practice group. Renders exactly `level` bars (not three with some dimmed) so
// the outline differs between levels; see .iel-bars in ielts-theme.css.
// aria-label carries the same meaning for screen readers, since bars are visual.
const IntensityBars = ({ level }) => (
  <span className="iel-bars" role="img" aria-label={INTENSITY_LABEL[level] || ''}>
    <span>{Array.from({ length: level }, (_, i) => <i key={i} />)}</span>
  </span>
)

const LoadingFallback = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
    <div style={{ width: 24, height: 24, border: '2px solid var(--iel-border)', borderTopColor: 'var(--iel-accent)', borderRadius: '50%', animation: 'iel-spin .7s linear infinite' }} />
  </div>
)

export default function IELTSMasterclassLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const studentId = useStudentId()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const signOut = useAuthStore((s) => s.signOut)
  const isImpersonating = useAuthStore((s) => !!s.impersonation)
  const { data: skills } = useSkillProgress(studentId)
  const { data: errCount } = useErrorBankCount(studentId)
  const { data: errBySkill } = useErrorBankBySkill(studentId)
  const { data: plan } = useAdaptivePlan(studentId)

  // Full-screen focus: hide the global chrome while the section is mounted.
  useEffect(() => {
    document.body.classList.add('ielts-app')
    return () => document.body.classList.remove('ielts-app')
  }, [])

  const isActive = (path, index) => {
    const full = path ? `${BASE}/${path}` : BASE
    if (index) return pathname === BASE || pathname === `${BASE}/`
    return pathname === full || pathname.startsWith(`${full}/`)
  }
  const subActive = (path, exact) => {
    const full = `${BASE}/${path}`
    return exact ? pathname === full : (pathname === full || pathname.startsWith(`${full}/`))
  }
  const go = (path) => navigate(path ? `${BASE}/${path}` : BASE)
  const handleLogout = async () => {
    try { await signOut?.() } catch { /* ignore */ }
    navigate('/login', { replace: true })
  }
  const bandOf = (s) => {
    const b = skills?.[s]?.band
    return b != null ? Number(b).toFixed(1) : ''
  }
  const name = profile?.display_name || profile?.full_name || 'طالب IELTS'
  const target = plan?.target_band != null ? `الهدف · Band ${Number(plan.target_band).toFixed(1)}` : 'مسار IELTS'

  return (
    <div dir="rtl" className="iel-root">
      <div className="iel-atmo" aria-hidden="true">
        <div className="iel-atmo-grain" />
        <div className="iel-atmo-vig" />
      </div>
      <div className="iel-shell">
        <aside className="iel-nav">
          <div className="iel-brand">
            <div className="mark">ط</div>
            <div className="wm">طلاقة<small>IELTS</small></div>
          </div>

          <div className="iel-nav-label">التقدّم</div>
          <NavItem icon={Icon.overview} label="نظرة عامة" active={isActive('', true)} onClick={() => go('')} />
          <NavItem icon={Icon.diagnostic} label="الاختبار التشخيصي" active={isActive('diagnostic')} onClick={() => go('diagnostic')} />

          <div className="iel-nav-label">التدريب</div>
          {/* Each skill parent opens its performance monitor; the sub-nav below is
              the teach→practise→review path through that skill. */}
          {SKILLS.map((s) => (
            <Fragment key={s}>
              <NavItem
                icon={Icon[s]}
                label={SKILL_LABEL[s]}
                badge={bandOf(s)}
                active={s === 'reading' ? pathname.startsWith(`${BASE}/reading`) : isActive(s)}
                onClick={() => go(`${s}/monitor`)}
              />
              <div className="iel-subnav">
                {SKILL_SUB[s].map((grp) => (
                  <Fragment key={grp.group || 'ungrouped'}>
                    {grp.group && countItems(SKILL_SUB[s]) >= GROUP_HEADING_MIN
                      && <div className="iel-subgroup">{grp.group}</div>}
                    {grp.items.map((it) => (
                      <button
                        key={it.path}
                        type="button"
                        className={`iel-subitem${it.loop ? ' loop' : ''}${subActive(it.path, it.exact) ? ' on' : ''}`}
                        onClick={() => go(it.path)}
                      >
                        <span className="dot" aria-hidden />
                        {it.label}
                        {it.intensity && <IntensityBars level={it.intensity} />}
                        {it.loop && errBySkill?.[s] ? <span className="cnt">{errBySkill[s]}</span> : null}
                      </button>
                    ))}
                  </Fragment>
                ))}
              </div>
            </Fragment>
          ))}

          <div className="iel-nav-label">الاستعداد</div>
          <NavItem icon={Icon.plan} label="خطة الدراسة" active={isActive('journey')} onClick={() => go('journey')} />
          <NavItem icon={Icon.errors} label="بنك الأخطاء" badge={errCount ? String(errCount) : ''} active={isActive('errors')} onClick={() => go('errors')} />
          <NavItem icon={Icon.mock} label="الاختبار الكامل" active={isActive('mock')} onClick={() => go('mock')} />
          <NavItem icon={Icon.readiness} label="الجاهزية" active={isActive('readiness')} onClick={() => go('readiness')} />
          <NavItem icon={Icon.coach} label="مدرّبك" active={isActive('trainer')} onClick={() => go('trainer')} />

          {studentData?.keep_academy_access === true && (
            <>
              <div className="iel-nav-label">حسابي في الأكاديمية</div>
              <NavItem icon={Icon.home} label="منهجي ودروسي" onClick={() => navigate('/student')} />
            </>
          )}

          <div className="iel-navfoot">
            <div className="av">{name.trim().charAt(0)}</div>
            <div className="who" style={{ minWidth: 0 }}>{name}<small>{target}</small></div>
            {!isImpersonating && (
              <button onClick={handleLogout} title="تسجيل الخروج" aria-label="تسجيل الخروج"
                style={{ marginInlineStart: 'auto', flex: 'none', width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--iel-border)', background: 'transparent', color: 'var(--iel-ink-3)' }}>
                <LogOut size={15} />
              </button>
            )}
          </div>
        </aside>

        <main className="iel-main">
          <div className="iel-content" key={pathname}>
            <Suspense fallback={<LoadingFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
