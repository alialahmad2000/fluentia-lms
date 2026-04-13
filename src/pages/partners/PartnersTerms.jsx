import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export default function PartnersTerms() {
  return (
    <div className="min-h-dvh py-12 px-4" dir="rtl" style={{ background: '#060e1c', color: '#e2e8f0' }}>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-3 mb-8">
          <Link to="/partners" className="p-2 rounded-lg hover:bg-white/10 transition text-white/50 hover:text-white">
            <ArrowRight size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-white font-['Tajawal']">
            شروط وأحكام برنامج شركاء طلاقة
          </h1>
        </div>

        <p className="text-sm text-white/40 font-['Tajawal']">آخر تحديث: أبريل 2026</p>

        <Section title="1. التعريف بالبرنامج">
          برنامج شركاء طلاقة ("البرنامج") هو برنامج تسويق بالعمولة تديره أكاديمية طلاقة لتعليم اللغة الإنجليزية ("الأكاديمية"). يتيح البرنامج للأفراد المعتمدين ("الشريك") كسب عمولة عن كل طالب ينضم للأكاديمية عبر رابط الإحالة الخاص بالشريك.
        </Section>

        <Section title="2. العمولة">
          <ul className="list-disc pr-5 space-y-2">
            <li>العمولة ثابتة: <strong>100 ريال سعودي</strong> عن كل طالب مؤكد (enrollment واحد = عمولة واحدة).</li>
            <li>لا توجد نسبة مئوية ولا تتغير العمولة حسب الباقة.</li>
            <li>العمولة لمرة واحدة فقط لكل طالب — لا توجد عمولات متكررة.</li>
          </ul>
        </Section>

        <Section title="3. متى تُستحق العمولة؟">
          <ul className="list-disc pr-5 space-y-2">
            <li>تُستحق العمولة فقط بعد أن يُسدد الطالب أول دفعة مالية — التسجيل وحده لا يكفي.</li>
            <li>تمر العمولة بفترة حماية مدتها <strong>14 يوماً</strong> من تاريخ أول دفعة. إذا طلب الطالب استرداد خلال هذه الفترة، تُلغى العمولة.</li>
            <li>بعد انتهاء فترة الحماية، تصبح العمولة مؤكدة وجاهزة للصرف.</li>
          </ul>
        </Section>

        <Section title="4. الدفع">
          <ul className="list-disc pr-5 space-y-2">
            <li>يتم الدفع شهرياً في <strong>اليوم الخامس</strong> من كل شهر ميلادي عن عمولات الشهر السابق المؤكدة.</li>
            <li>الحد الأدنى للصرف: <strong>200 ريال</strong>. إذا كان الرصيد أقل، يُرحّل للشهر التالي.</li>
            <li>طرق الدفع المتاحة: تحويل بنكي (IBAN) أو STC Pay.</li>
            <li>العملة: ريال سعودي (SAR) فقط.</li>
          </ul>
        </Section>

        <Section title="5. تتبع الإحالات (Attribution)">
          <ul className="list-disc pr-5 space-y-2">
            <li>يُمنح كل شريك رابط إحالة فريد بالصيغة: <code className="text-sky-400">fluentia.academy/?ref=CODE</code></li>
            <li>مدة تتبع الرابط (Cookie): <strong>30 يوماً</strong> من آخر نقرة.</li>
            <li>في حال تعدد المسوّقين: يُحتسب التسجيل <strong>للنقرة الأولى</strong> (First-click attribution).</li>
          </ul>
        </Section>

        <Section title="6. الممارسات المحظورة">
          <ul className="list-disc pr-5 space-y-2">
            <li><strong>ممنوع</strong> المزايدة على الكلمات المفتاحية "Fluentia" أو "طلاقة" أو "فلوينشا" في Google Ads أو TikTok Ads أو أي منصة إعلانية (حماية العلامة التجارية).</li>
            <li><strong>ممنوع</strong> إرسال رسائل مزعجة (Spam) عبر الإيميل أو الواتساب أو أي قناة.</li>
            <li><strong>ممنوع</strong> استخدام قوائم بريد إلكتروني مشتراة.</li>
            <li><strong>ممنوع</strong> نشر ادعاءات مضللة أو وعود كاذبة عن الأكاديمية.</li>
            <li><strong>ممنوع</strong> إحالة نفسك أو أفراد عائلتك المباشرين (الدرجة الأولى).</li>
            <li><strong>ممنوع</strong> أن يكون الشريك طالباً نشطاً في الأكاديمية في نفس الوقت (تعارض مصالح).</li>
          </ul>
        </Section>

        <Section title="7. الإنهاء والإيقاف">
          <ul className="list-disc pr-5 space-y-2">
            <li>يحق للأكاديمية إيقاف أو إنهاء عضوية أي شريك يخالف هذه الشروط دون إنذار مسبق.</li>
            <li>في حال الإنهاء، تُصرف العمولات المؤكدة غير المدفوعة فقط.</li>
            <li>العمولات المعلقة (في فترة الحماية) تُلغى عند الإنهاء.</li>
          </ul>
        </Section>

        <Section title="8. الاسترداد والإلغاء">
          إذا طلب الطالب المُحال استرداد المبلغ المدفوع لأي سبب، تُلغى العمولة المرتبطة به تلقائياً. إذا كانت العمولة قد صُرفت فعلاً، يُخصم المبلغ من رصيد الشريك في الدورة التالية.
        </Section>

        <Section title="9. التسجيل اليدوي">
          إذا تم تسجيل طالب يدوياً (خارج النظام الإلكتروني)، لا تُحتسب العمولة إلا إذا ثبت أن رابط الإحالة كان المصدر الفعلي للتواصل.
        </Section>

        <Section title="10. الخصوصية">
          يلتزم الشريك بعدم مشاركة أي بيانات شخصية للطلاب أو المتقدمين تصل إليه عبر البرنامج. أي انتهاك للخصوصية يُعد سبباً للإنهاء الفوري.
        </Section>

        <Section title="11. التعديلات">
          يحق للأكاديمية تعديل هذه الشروط في أي وقت مع إشعار الشركاء عبر البريد الإلكتروني قبل 30 يوماً من سريان التعديلات.
        </Section>

        <Section title="12. القانون الحاكم">
          تخضع هذه الشروط لأنظمة وقوانين المملكة العربية السعودية. أي نزاع يُحل ودياً أولاً، وفي حال تعذر ذلك يُحال إلى الجهات القضائية المختصة في المملكة.
        </Section>

        <div className="pt-8 border-t border-white/10">
          <Link to="/partners#apply" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold font-['Tajawal'] transition">
            قدّم طلبك الآن
          </Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-white font-['Tajawal']">{title}</h2>
      <div className="text-sm text-white/60 font-['Tajawal'] leading-relaxed">
        {children}
      </div>
    </div>
  )
}
