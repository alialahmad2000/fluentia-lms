import { Suspense, useEffect, Fragment } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import '../_ui/ielts-theme.css'
import { Icon, NavItem } from '../_ui/primitives'
import { useStudentId } from '../_helpers/resolveStudentId'
import { useSkillProgress, useErrorBankCount, useAdaptivePlan } from '@/hooks/ielts/useIELTSHub'
import { useAuthStore } from '@/stores/authStore'

const BASE = '/student/ielts-atelier'
const SKILLS = ['reading', 'listening', 'writing', 'speaking']
const SKILL_LABEL = { reading: 'القراءة', listening: 'الاستماع', writing: 'الكتابة', speaking: 'المحادثة' }
// Every skill is a parent whose click opens its PERFORMANCE page (the monitor);
// the sub-items are the ways to learn/practise that skill.
const READING_SUB = [
  { path: 'reading', label: 'دليل القراءة', exact: true },
  { path: 'reading/types', label: 'أنواع الأسئلة' },
  { path: 'reading/tests', label: 'الاختبارات' },
]
const SKILL_SUB = {
  listening: [{ path: 'listening', label: 'التدريب', exact: true }],
  writing: [{ path: 'writing', label: 'التدريب', exact: true }],
  speaking: [{ path: 'speaking', label: 'التدريب', exact: true }],
}

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
          {/* Reading — parent opens performance; sub-items are the teach→practise parts */}
          <NavItem icon={Icon.reading} label="القراءة" badge={bandOf('reading')} active={pathname.startsWith(`${BASE}/reading`)} onClick={() => go('reading/monitor')} />
          <div className="iel-subnav">
            {READING_SUB.map((it) => (
              <button key={it.path} type="button" className={`iel-subitem${subActive(it.path, it.exact) ? ' on' : ''}`} onClick={() => go(it.path)}>
                <span className="dot" aria-hidden />{it.label}
              </button>
            ))}
          </div>
          {['listening', 'writing', 'speaking'].map((s) => (
            <Fragment key={s}>
              <NavItem icon={Icon[s]} label={SKILL_LABEL[s]} badge={bandOf(s)} active={isActive(s)} onClick={() => go(`${s}/monitor`)} />
              <div className="iel-subnav">
                {SKILL_SUB[s].map((it) => (
                  <button key={it.path} type="button" className={`iel-subitem${subActive(it.path, it.exact) ? ' on' : ''}`} onClick={() => go(it.path)}>
                    <span className="dot" aria-hidden />{it.label}
                  </button>
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
