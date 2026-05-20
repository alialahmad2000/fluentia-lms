// Admin preview panel for the IELTS Masterclass V2 scaffold.
// Renders 11 cards, one per sacred page. Each opens the student V2 page in a new tab.
// ?ielts-v2=1 is appended defensively for any admin account not yet on the allowlist.
import {
  Compass, Sparkles, BookOpen, Headphones, PenLine, Mic,
  Map, Library, Timer, UserRound, ShieldCheck, ExternalLink,
} from 'lucide-react'

const SKY   = '#38bdf8'
const AMBER = '#fbbf24'

const SACRED_PAGES = [
  { id: 'home',        icon: Compass,      title: 'الرئيسية — The Home',         desc: 'بوابة المتعلّم. شبكة العشر صفحات.',     path: '/student/ielts-v2',           phase: 'Phase 0B',  color: SKY   },
  { id: 'diagnostic',  icon: Sparkles,     title: 'الاختبار التشخيصي',           desc: 'طقس عبور — لا حكم.',                    path: '/student/ielts-v2/diagnostic', phase: 'Phase 2',   color: AMBER },
  { id: 'reading',     icon: BookOpen,     title: 'القراءة — The Study',          desc: 'غرفة الدراسة.',                          path: '/student/ielts-v2/reading',    phase: 'Phase 3',   color: AMBER },
  { id: 'listening',   icon: Headphones,   title: 'الاستماع — The Theater',       desc: 'المسرح.',                                path: '/student/ielts-v2/listening',  phase: 'Phase 3',   color: AMBER },
  { id: 'writing',     icon: PenLine,      title: 'الكتابة — The Workshop',       desc: 'الورشة.',                                path: '/student/ielts-v2/writing',    phase: 'Phase 3',   color: AMBER },
  { id: 'speaking',    icon: Mic,          title: 'المحادثة — The Interview Room',desc: 'غرفة المقابلة.',                          path: '/student/ielts-v2/speaking',   phase: 'Phase 3',   color: AMBER },
  { id: 'journey',     icon: Map,          title: 'الرحلة الكاملة',               desc: '١٢ أسبوعاً — إيقاع ثابت.',              path: '/student/ielts-v2/journey',    phase: 'Phase 1',   color: SKY   },
  { id: 'errors',      icon: Library,      title: 'بنك الدروس',                   desc: 'أخطاؤك معلّموك.',                        path: '/student/ielts-v2/errors',     phase: 'Phase 5',   color: AMBER },
  { id: 'mock',        icon: Timer,        title: 'الاختبار التجريبي',            desc: 'بلا تنازل عن الواقع.',                   path: '/student/ielts-v2/mock',       phase: 'Phase 4',   color: AMBER },
  { id: 'trainer',     icon: UserRound,    title: 'مدربك',                        desc: 'الطبقة الإنسانية.',                       path: '/student/ielts-v2/trainer',    phase: 'Phase 5',   color: AMBER },
  { id: 'readiness',   icon: ShieldCheck,  title: 'أسبوع الجاهزية',              desc: 'الأسبوع ١٢.',                            path: '/student/ielts-v2/readiness',  phase: 'Phase 6',   color: AMBER },
]

function SacredPageCard({ page }) {
  const Icon = page.icon
  const c = page.color
  const href = `${page.path}?ielts-v2=1`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.18s, transform 0.18s, box-shadow 0.18s',
        fontFamily: 'Tajawal, sans-serif',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = c
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 24px -12px ${c}40`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: `${c}22`,
          color: c,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={17} strokeWidth={1.8} />
        </div>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          color: c,
          letterSpacing: 1.2,
          padding: '2px 8px',
          borderRadius: 999,
          background: `${c}18`,
          fontFamily: 'Tajawal, sans-serif',
        }}>
          {page.phase}
        </span>
      </div>

      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.35 }}>
          {page.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {page.desc}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, color: c, fontWeight: 700 }}>
        <ExternalLink size={11} />
        فتح في تبويب جديد
      </div>
    </a>
  )
}

export default function IELTSMasterclassV2Preview() {
  return (
    <section dir="rtl" style={{ fontFamily: 'Tajawal, sans-serif' }}>
      {/* Header */}
      <div className="mb-5">
        <div style={{ fontSize: 10, fontWeight: 700, color: AMBER, letterSpacing: 2, marginBottom: 6, fontFamily: 'Tajawal, sans-serif' }}>
          MASTERCLASS V2 — ADMIN PREVIEW
        </div>
        <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal, sans-serif' }}>
          معاينة Masterclass V2
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 640 }}>
          الصفحات الإحدى عشر المقدّسة لـ IELTS Masterclass V2. كل كارت يفتح الصفحة الحقيقية كما سيراها الطالب.
          Phase 0B = scaffold placeholders — المحتوى الفعلي يأتي في Phase 1–6.
        </p>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        {SACRED_PAGES.map((page) => (
          <SacredPageCard key={page.id} page={page} />
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-4 rounded-xl px-4 py-3 text-xs" style={{
        background: `${AMBER}12`,
        border: `1px solid ${AMBER}28`,
        color: 'var(--text-muted)',
        lineHeight: 1.7,
      }}>
        <strong style={{ color: AMBER }}>ملاحظة:</strong>{' '}
        الطلاب لا يرون هذه الصفحات — مُقفلة خلف feature flag. الـ cutover الرسمي في Phase 6 بعد اكتمال كل الـ sacred pages.
      </div>
    </section>
  )
}
