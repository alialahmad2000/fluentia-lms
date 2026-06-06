import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

const TITLES = [
  [/^\/trainer\/students\/[^/]+\/answers/, 'إجابات الطالب'],
  [/^\/trainer\/students\/[^/]+\/report/,  'تقرير النشاط'],
  [/^\/trainer\/students\/[^/]+/,          'ملف الطالب'],
  [/^\/trainer\/students/,                 'طلابي'],
  [/^\/trainer\/work/,                     'الأعمال والتقييم'],
  [/^\/trainer\/curriculum/,               'المنهج'],
  [/^\/trainer\/settings/,                 'الإعدادات'],
  [/^\/trainer\/?$/,                       'الرئيسية'],
]

function titleFor(pathname) {
  for (const [re, title] of TITLES) if (re.test(pathname)) return title
  return 'مساحة المدرّب'
}

export default function TeacherHeader() {
  const location = useLocation()
  const profile = useAuthStore((s) => s.profile)
  const name = profile?.display_name || profile?.full_name || ''

  return (
    <header className="tea-header">
      <h1 className="tea-header__title">{titleFor(location.pathname)}</h1>
      <div className="tea-header__spacer" />
      {name && <span className="tea-pill tea-pill--sky">{name}</span>}
    </header>
  )
}
