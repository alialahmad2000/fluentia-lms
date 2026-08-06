import { Suspense, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Home, FileText, PenLine, AlertTriangle, TrendingUp, LogOut, ArrowRight } from 'lucide-react'
import '../_ui/hall.css'
import { Atmosphere, Spinner } from '../_ui/primitives'
import { useAuthStore } from '@/stores/authStore'
import { useG } from '@/i18n/gender'
import { useStepOverview, useStepErrorBank } from '@/hooks/step/useStepProgress'
import { enterAcademy, clearAcademyIntent } from '@/lib/academyIntent'

const BASE = '/student/step'

/**
 * «القاعة» — the STEP shell.
 *
 * Mounts as a full-screen takeover (body.step-app hides the global rail, header
 * and mobile bar) so STEP reads as its own place rather than a page inside the
 * LMS. Same mechanism the IELTS atelier uses.
 */
export default function HallLayout() {
  const g = useG()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const studentData = useAuthStore((s) => s.studentData)
  const signOut = useAuthStore((s) => s.signOut)
  const isImpersonating = useAuthStore((s) => !!s.impersonation)
  const { target, score } = useStepOverview()
  const { data: bank } = useStepErrorBank()

  useEffect(() => {
    document.body.classList.add('step-app')
    // Re-entering the Hall ends any academy visit, so the next stray link
    // bounces back here rather than silently leaking into the curriculum.
    clearAcademyIntent()
    return () => document.body.classList.remove('step-app')
  }, [])

  const openErrors = bank?.open?.length ?? 0
  const isOn = (p, index) => {
    const full = p ? `${BASE}/${p}` : BASE
    if (index) return pathname === BASE || pathname === `${BASE}/`
    return pathname === full || pathname.startsWith(`${full}/`)
  }
  const go = (p) => navigate(p ? `${BASE}/${p}` : BASE)

  const name = profile?.display_name || profile?.full_name || g('طالب ستيب', 'طالبة ستيب')
  const NAV = [
    { p: '', label: 'القاعة', Icon: Home, index: true },
    { p: 'exam', label: 'نموذج كامل', Icon: FileText },
    { p: 'rules', label: 'القواعد', Icon: PenLine },
    { p: 'errors', label: 'أخطائي', Icon: AlertTriangle, badge: openErrors || null, hot: true },
    { p: 'progress', label: 'تقدّمي', Icon: TrendingUp },
  ]

  return (
    <div dir="rtl" className="hall-root">
      <Atmosphere />
      <div className="hall-shell">
        <aside className="hall-nav">
          <div className="hall-crest">
            <svg width="42" height="42" viewBox="0 0 52 52" fill="none" style={{ flex: 'none' }}>
              <circle cx="26" cy="26" r="24" stroke="rgba(227,185,92,.45)" strokeWidth="1" />
              <circle cx="26" cy="26" r="18" stroke="rgba(227,185,92,.25)" strokeWidth="1" />
              <path d="M26 9 L31.6 21.4 L45 23 L35.2 32 L37.8 45 L26 38.6 L14.2 45 L16.8 32 L7 23 L20.4 21.4 Z"
                fill="url(#crestG)" opacity=".95" />
              <defs>
                <linearGradient id="crestG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FBE4A8" /><stop offset="1" stopColor="#C9992F" />
                </linearGradient>
              </defs>
            </svg>
            <div className="nm">القاعة<small>STEP</small></div>
          </div>

          <div className="hall-navlab">المسار</div>
          {NAV.map(({ p, label, Icon, index, badge, hot }) => (
            <button
              key={p || 'home'}
              type="button"
              className={`hall-navitem${isOn(p, index) ? ' on' : ''}`}
              onClick={() => go(p)}
            >
              <span className="ico"><Icon size={16} /></span>
              {label}
              {badge ? <span className={`badge${hot ? ' hot' : ''}`}>{badge}</span> : null}
            </button>
          ))}

          {studentData?.keep_academy_access === true && (
            <>
              <div className="hall-navlab">حسابي في الأكاديمية</div>
              <button type="button" className="hall-navitem" onClick={() => enterAcademy(navigate)}>
                <span className="ico"><ArrowRight size={16} /></span>
                منهجي ودروسي
              </button>
            </>
          )}

          <div className="hall-navfoot">
            <div className="av">{name.trim().charAt(0)}</div>
            <div className="who" style={{ minWidth: 0 }}>
              {name}
              <small>
                {target != null ? `الهدف ${target}` : g('ما حددت هدفك بعد', 'ما حددتِ هدفك بعد')}
                {score != null ? ` · الآن ${score}` : ''}
              </small>
            </div>
            {!isImpersonating && (
              <button
                onClick={async () => { try { await signOut?.() } catch { /* ignore */ } navigate('/login', { replace: true }) }}
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
                style={{
                  marginInlineStart: 'auto', flex: 'none', width: 32, height: 32, borderRadius: 9,
                  display: 'grid', placeItems: 'center', cursor: 'pointer',
                  border: '1px solid var(--hall-line-2)', background: 'transparent', color: 'var(--hall-ink-3)',
                }}
              >
                <LogOut size={14} />
              </button>
            )}
          </div>
        </aside>

        <main className="hall-main">
          <div className="hall-wrap" key={pathname}>
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
