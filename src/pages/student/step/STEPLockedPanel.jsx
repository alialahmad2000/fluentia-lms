import { Lock, BookOpen, Headphones, Brain, Target, MessageCircle } from 'lucide-react'
import { useG } from '@/i18n/gender'
import { Atmosphere } from './_ui/primitives'
import './_ui/hall.css'

const WHATSAPP = '966558669974'
const WHATSAPP_MSG = encodeURIComponent(
  'السلام عليكم، أبي أعرف تفاصيل الاشتراك في قسم اختبار ستيب STEP'
)

// A factory, not a const: module scope cannot reach useG(), and the middle
// entry addresses the student directly.
const supporting = (g) => [
  { icon: Brain, title: 'شرح بالعربي لكل قاعدة', body: 'كل سؤال تراكيب مربوط بالقاعدة اللي يختبرها، وبالفخ اللي يقع فيه أغلب المتقدّمين.' },
  { icon: Target, title: 'أخطاؤك محفوظة', body: g(
    'كل سؤال تخطئ فيه ينحفظ بإجابتك والإجابة الصحيحة، ونعيده عليك لين تتقنه.',
    'كل سؤال تخطئين فيه ينحفظ بإجابتك والإجابة الصحيحة، ونعيده عليك لين تتقنينه.',
  ) },
  { icon: Headphones, title: 'فهم المسموع', body: 'أسئلة القسم جاهزة ومعها تسجيلاتها الصوتية.' },
]

export default function STEPLockedPanel() {
  const g = useG()
  return (
    <div dir="rtl" className="hall-root" style={{ position: 'relative' }}>
      <Atmosphere />
      <div style={{
        position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'center',
        paddingBlock: 44, paddingBottom: 'calc(44px + env(safe-area-inset-bottom, 0px))',
        paddingInline: 20,
      }}>
        <div style={{ width: '100%', maxWidth: 660 }}>
          <div className="hall-panel" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBlockEnd: 28 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, flex: 'none', display: 'grid', placeItems: 'center',
                background: 'rgba(227,185,92,.12)', border: '1px solid var(--hall-line)',
              }}>
                <Lock size={19} style={{ color: 'var(--hall-gold)' }} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontFamily: 'var(--hall-display)', fontSize: 25, fontWeight: 700 }}>
                  قاعة ستيب
                </h1>
                <p style={{ margin: 0, marginBlockStart: 4, fontSize: 13, color: 'var(--hall-ink-2)' }}>
                  هذا القسم غير مفعّل على حسابك حالياً
                </p>
              </div>
            </div>

            {/* The strongest number leads. Both figures are the LIVE published
                counts, and the paper figure is bound by the SCARCEST section
                (reading: 269 published ÷ 40 per paper = 6), not by the total.
                Do not round either one up. */}
            <div style={{
              borderRadius: 16, padding: 26, marginBlockEnd: 14,
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--hall-line-2)',
            }}>
              <p style={{
                margin: 0, fontFamily: 'var(--hall-display)', fontSize: 46, fontWeight: 700, lineHeight: 1,
                background: 'linear-gradient(180deg,#FFFDF6,#E3B95C)',
                WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
              }}>
                أكثر من 2,000
                <span style={{
                  fontFamily: 'var(--hall-sans)', fontSize: 15, fontWeight: 700,
                  color: 'var(--hall-ink-3)', WebkitTextFillColor: 'var(--hall-ink-3)',
                }}> سؤال</span>
              </p>
              <p style={{ margin: 0, marginBlockStart: 12, fontSize: 14, lineHeight: 1.95, color: 'var(--hall-ink-2)' }}>
                كلها مستخرجة من تجميعات ستيب الحقيقية، ولكل سؤال إجابته الصحيحة —
                وتكفي لستة نماذج كاملة بدون ما يتكرر عليك سؤال واحد.
              </p>
            </div>

            <div style={{
              borderRadius: 16, padding: 24, marginBlockEnd: 14,
              background: 'rgba(255,255,255,.04)', border: '1px solid var(--hall-line-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBlockEnd: 8 }}>
                <BookOpen size={17} style={{ color: 'var(--hall-gold)', flexShrink: 0 }} />
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>اختبار كامل 100 سؤال</h2>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.9, color: 'var(--hall-ink-2)' }}>
                بنفس ترتيب الاختبار الحقيقي: فهم المسموع 20، استيعاب المقروء 40،
                تراكيب وتحليل كتابي 40، مع درجة لكل قسم على حدة.
              </p>
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))',
              gap: 14, marginBlockEnd: 28,
            }}>
              {supporting(g).map(({ icon: Icon, title, body }) => (
                <div key={title} style={{
                  borderRadius: 13, padding: 22,
                  background: 'rgba(255,255,255,.03)', border: '1px solid var(--hall-line-2)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBlockEnd: 7 }}>
                    <Icon size={14} style={{ color: 'var(--hall-gold)', flexShrink: 0 }} />
                    <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800 }}>{title}</h3>
                  </div>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.8, color: 'var(--hall-ink-2)' }}>{body}</p>
                </div>
              ))}
            </div>

            {/* No price here on purpose: STEP pricing is not set, and a number in
                the product that the WhatsApp reply contradicts is worse than none. */}
            <p style={{ margin: 0, marginBlockEnd: 14, fontSize: 12.5, lineHeight: 1.9, color: 'var(--hall-ink-3)' }}>
              {g('راسلنا', 'راسلينا')} وبنرد عليك بتفاصيل الاشتراك ومدته، ونفعّل القسم على حسابك مباشرة.
            </p>

            <a
              href={`https://wa.me/${WHATSAPP}?text=${WHATSAPP_MSG}`}
              target="_blank" rel="noopener noreferrer"
              className="hall-btn hall-tap"
              style={{ width: '100%', textDecoration: 'none' }}
            >
              <MessageCircle size={17} /> {g('تواصل معنا لتفعيل القسم', 'تواصلي معنا لتفعيل القسم')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
