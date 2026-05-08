import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, MapPin } from 'lucide-react'
import './HelpPage.css'

const SECTIONS = [
  {
    id: 'morning',
    emoji: '🌅',
    title: 'روتين الصباح',
    items: [
      {
        q: 'وش أول شيء أفتحه؟',
        a: 'ابدأ دائماً من الكوكبيت (/trainer). في ٦٠ ثانية تشوف: حصتك القادمة، طلاب يحتاجون تدخل، وواجبات معلّقة. كل شيء تحتاجه في نظرة واحدة.',
      },
      {
        q: 'ليش نبيه مهم؟',
        a: 'نبيه يعرف كل طلابك ويعطيك ملخص ذكي: مين صامت، مين متفوق، ومين يحتاج رسالة منك اليوم. اسأله بلغتك العادية — يجاوب بأرقام حقيقية.',
      },
      {
        q: 'كيف أكسب XP كمدرب؟',
        a: 'كل عمل له XP: تصحيح خلال ٢٤ ساعة (+٥)، تدخل ناجح (+١٠)، إكمال debrief حصة (+١٠)، streaks يومية. شوف التفاصيل الكاملة في /trainer/my-growth.',
      },
      {
        q: 'وش تعني الألوان في خريطة النبض؟',
        a: 'الخريطة تعرض آخر ٧ أيام لكل طالب. الخلايا الداكنة = نشاط عالي. الخلايا الفاتحة أو الرمادية = صمت. اضغط على أي طالب لتفتح ملف ٣٦٠ الخاص به.',
      },
    ],
  },
  {
    id: 'prep',
    emoji: '🎬',
    title: 'قبل الحصة',
    items: [
      {
        q: 'متى يظهر زر "ابدأ الحصة"؟',
        a: 'يظهر ٣٠ دقيقة قبل موعد الحصة المجدولة في تقويمك. لو مو ظاهر، تحقق إن المجموعة عندها موعد مدخّل في النظام.',
      },
      {
        q: 'وش يعمله AI في تحضير الحصة؟',
        a: 'يحلل نشاط طلابك آخر ١٤ يوم ويعطيك: ٣-٥ نقاط حوار مخصصة، طلاب تستحق التحدي، وقصة نجاح لتبدأ بها. أول تحميل ~١٥ ثانية، بعدها يُحفظ في cache.',
      },
      {
        q: 'لو ما طلع تحضير AI؟',
        a: 'احتمال البيانات شحيحة أو الـ cache قديم. اضغط أيقونة التحديث (🔄) بجانب "نقاط الحوار" لإجبار إعادة التوليد.',
      },
    ],
  },
  {
    id: 'live',
    emoji: '⚡',
    title: 'في الحصة',
    items: [
      {
        q: 'شلون أعطي نقاط أثناء الكلاس؟',
        a: 'اضغط 🎯 في الشريط السفلي، اختر الطالبة من القائمة، ثم +٥ أو +١٠. يمكنك التراجع خلال ١٠ ثواني من الإضافة. النقاط تظهر للطالبة فوراً.',
      },
      {
        q: 'هل الطلاب يشوفون شاشتي بوضع الحصة؟',
        a: 'نعم — الطلاب يشوفون محتوى الوحدة فقط (النص، التمارين، الأسئلة). أدوات المدرب في الشريط السفلي غير مرئية لهم.',
      },
      {
        q: 'وش الفرق بين "ملاحظة" و"نقاط"؟',
        a: 'النقاط XP تذهب للطالبة وتظهر في سجلها. الملاحظة للمدرب فقط — تُحفظ في ملف الطالب ولا تظهر لها.',
      },
      {
        q: 'لو نسيت تنهي الحصة؟',
        a: 'لا مشكلة — لو أغلقت المتصفح بدون إنهاء، الحصة تُحفظ تلقائياً بعد ٤ ساعات من بدايتها. تقدر تكمل الـ debrief لاحقاً من /trainer/debrief.',
      },
    ],
  },
  {
    id: 'after',
    emoji: '📝',
    title: 'بعد الحصة',
    items: [
      {
        q: 'ليش الـ debrief مهم؟',
        a: '+١٠ XP لك، وملخص جميل للطلاب على dashboard يكتبه AI بناءً على ملاحظاتك. الطلاب يشوفونه فور نشره — يحفزهم ويُشعرهم بالاهتمام.',
      },
      {
        q: 'وش يشوف الطالب من ملخص الحصة؟',
        a: 'فقط النص المُولَّد بالـ AI (الجزء العام). التقييمات الخاصة، درجات الطلاب الفردية، وملاحظاتك الشخصية — سرية ولا تُعرض.',
      },
      {
        q: 'كيف أصحح واجبات الكتابة والتحدث؟',
        a: 'اذهب لـ /trainer/grading. AI يقيّم كل واجب ويضع درجة مقترحة. أنت تراجع، تعدّل لو لزم، وتضغط "موافقة ونشر". صحّح خلال ٢٤ ساعة = +٥ XP.',
      },
    ],
  },
  {
    id: 'weekly',
    emoji: '📊',
    title: 'المراجعة الأسبوعية',
    items: [
      {
        q: 'وش يحدد العمولة الشهرية؟',
        a: 'مكوّنات العمولة: راتب أساسي + (عدد الحصص × سعر الحصة) + KPI bonus (حسب أداء الطلاب) + retention bonus (لكل طالب محتفظ به). التفاصيل في /trainer/my-growth.',
      },
      {
        q: 'كيف أحسّن KPI Score؟',
        a: 'الـ KPI يقيس ٤ أشياء: Retention (٤٠٪)، Progress (٣٠٪)، Engagement (٢٠٪)، Satisfaction (١٠٪). صفحة "نمّوي" فيها قسم "كيف تكسب أكثر" بنصائح عملية.',
      },
      {
        q: 'كيف أتابع تقدم طالب بعينه؟',
        a: 'من الكوكبيت → اضغط على الطالب في خريطة النبض → يفتح ملف ٣٦٠. فيه: XP التاريخي، Streak، مهارات، سجل التدخلات، ملاحظاتك، وتقييم AI مخصص.',
      },
      {
        q: 'وش فايدة قسم المسابقة؟',
        a: '/trainer/competition يعرض نتائج المسابقة الجارية بين الفرق، Victory Points، وأفضل الطلاب أداءً. يمكنك مراجعة التعريف بالجميل من الطلاب.',
      },
    ],
  },
]

function AccordionItem({ q, a, searchQuery }) {
  const [open, setOpen] = useState(false)
  const highlighted = searchQuery
    ? q.toLowerCase().includes(searchQuery.toLowerCase()) || a.toLowerCase().includes(searchQuery.toLowerCase())
    : true

  if (!highlighted) return null

  return (
    <div className={`hp-faq-item ${open ? 'is-open' : ''}`}>
      <button className="hp-faq-q" onClick={() => setOpen(!open)}>
        <span>{q}</span>
        <ChevronDown size={16} className="hp-faq-chevron" />
      </button>
      {open && <div className="hp-faq-a">{a}</div>}
    </div>
  )
}

export default function HelpPage() {
  const { t, i18n } = useTranslation()
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const visibleSections = useMemo(() => {
    if (!search.trim()) return SECTIONS
    const q = search.toLowerCase()
    return SECTIONS.map(s => ({
      ...s,
      items: s.items.filter(i =>
        i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q)
      ),
    })).filter(s => s.items.length > 0)
  }, [search])

  const sectionTitleMap = {
    morning: t('trainer.help.sections.morning'),
    prep: t('trainer.help.sections.prep'),
    live: t('trainer.help.sections.live'),
    after: t('trainer.help.sections.after'),
    weekly: t('trainer.help.sections.weekly'),
  }

  return (
    <div className="hp-page" dir="rtl">
      <div className="hp-hero">
        <h1 className="hp-hero__title">{t('trainer.help.title')}</h1>
        <p className="hp-hero__sub">{t('trainer.help.subtitle')}</p>
        <div className="hp-search-wrap">
          <Search size={15} className="hp-search-icon" />
          <input
            className="hp-search"
            type="text"
            placeholder={t('trainer.help.search_placeholder')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            dir="rtl"
          />
        </div>
      </div>

      {i18n.language === 'en' && (
        <div className="hp-arabic-notice" style={{ margin: '0 16px 16px', padding: '10px 14px', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: 10, fontSize: 13, color: 'var(--tr-text-muted, #8b9ab2)', fontFamily: 'Tajawal, sans-serif' }}>
          {t('trainer.help.arabic_content_notice')}
        </div>
      )}

      <div className="hp-content">
        {visibleSections.length === 0 ? (
          <div className="hp-empty">
            <p>{t('trainer.help.no_results')} "<strong>{search}</strong>"</p>
          </div>
        ) : (
          visibleSections.map(section => (
            <div key={section.id} className="hp-section">
              <h2 className="hp-section__title">
                <span>{section.emoji}</span>
                <span>{sectionTitleMap[section.id] || section.title}</span>
              </h2>
              <div className="hp-faq-list">
                {section.items.map((item, i) => (
                  <AccordionItem
                    key={i}
                    q={item.q}
                    a={item.a}
                    searchQuery={search}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hp-tour-cta">
        <p>{t('trainer.help.tour_cta_title')}</p>
        <button
          className="hp-tour-btn"
          onClick={() => navigate('/trainer?tour=1')}
        >
          <MapPin size={14} />
          {t('trainer.help.tour_cta_button')}
        </button>
      </div>
    </div>
  )
}
