import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ClipboardCheck,
  Link2,
  Share2,
  Banknote,
  TrendingUp,
  Tag,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  ArrowDown,
  Users,
  Calculator,
  HelpCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ─────────── Section Heading ─────────── */
function SectionHeading({ icon: Icon, children, id }) {
  return (
    <motion.h2
      id={id}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      variants={fadeUp}
      className="flex items-center justify-center gap-3 text-3xl md:text-4xl font-bold mb-10"
      style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}
    >
      {Icon && <Icon className="w-7 h-7 text-sky-400 shrink-0" />}
      {children}
    </motion.h2>
  );
}

/* ─────────── FAQ Item ─────────── */
function FAQItem({ q, a, open, toggle }) {
  return (
    <motion.div
      variants={fadeUp}
      className="border rounded-xl overflow-hidden"
      style={{
        borderColor: 'var(--border-subtle)',
        background: 'var(--surface-raised)',
      }}
    >
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-right cursor-pointer"
        style={{ color: 'var(--text-primary)', fontFamily: 'Tajawal' }}
      >
        <span className="font-semibold text-base md:text-lg leading-relaxed">
          {q}
        </span>
        {open ? (
          <ChevronUp className="w-5 h-5 shrink-0 text-sky-400" />
        ) : (
          <ChevronDown className="w-5 h-5 shrink-0 text-sky-400" />
        )}
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="px-5 pb-4 text-sm md:text-base leading-relaxed"
          style={{ color: 'var(--text-muted)', fontFamily: 'Tajawal' }}
        >
          {a}
        </motion.div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════
   Main Component
   ═══════════════════════════════════════ */
export default function PartnersLanding() {
  const navigate = useNavigate();

  /* ── Commission calculator ── */
  const [students, setStudents] = useState(10);

  /* ── FAQ ── */
  const [openFAQ, setOpenFAQ] = useState(null);
  const faqData = [
    {
      q: 'متى أستلم عمولتي؟',
      a: 'أول كل شهر، عن مبيعات الشهر الماضي (بعد 14 يوم من أول دفعة كفترة حماية).',
    },
    {
      q: 'هل ممكن أكون طالب ومسوّق معاً؟',
      a: 'لا، لتجنب تعارض المصالح.',
    },
    {
      q: 'هل أقدر أروّج في جوجل ادز؟',
      a: 'ممنوع المزايدة على كلمة "فلوينشا" أو "طلاقة" (حماية العلامة).',
    },
    {
      q: 'كم أقل مبلغ للصرف؟',
      a: '200 ريال، ما نقصها يترحّل للشهر الجاي.',
    },
    {
      q: 'هل أستطيع متابعة أدائي؟',
      a: 'نعم، لوحة تحكم مباشرة فيها كل النقرات والمبيعات.',
    },
    {
      q: 'إذا استرد الطالب فلوسه؟',
      a: 'تُلغى العمولة.',
    },
    {
      q: 'كم مدة تتبع الرابط؟',
      a: '30 يوم (لو ضغط اليوم وسجّل بعد 25 يوم ينحسب لك).',
    },
    {
      q: 'هل أحتاج سجل تجاري؟',
      a: 'لا.',
    },
    {
      q: 'كيف الدفع؟',
      a: 'تحويل بنكي (IBAN) أو STC Pay.',
    },
    {
      q: 'متى تُحتسب المبيعة؟',
      a: 'فقط بعد أول دفعة من الطالب، مو مجرد تسجيل.',
    },
  ];

  /* ── Form state ── */
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    city: '',
    ref_code: '',
    twitter: '',
    instagram: '',
    tiktok: '',
    followers_count: '',
    motivation: '',
    source: '',
    terms_accepted: false,
  });
  const [errors, setErrors] = useState({});
  const [refCodeStatus, setRefCodeStatus] = useState(null); // null | 'checking' | 'available' | 'taken'
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const applyRef = useRef(null);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    if (field === 'ref_code') setRefCodeStatus(null);
  };

  /* ── Ref code uniqueness check ── */
  const checkRefCode = async (code) => {
    if (!code || code.length < 4) return;
    setRefCodeStatus('checking');
    const { data } = await supabase
      .from('affiliates')
      .select('id')
      .eq('ref_code', code)
      .maybeSingle();
    setRefCodeStatus(data ? 'taken' : 'available');
  };

  /* ── Validate ── */
  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'مطلوب';
    // Saudi phone: +966XXXXXXXXX or 05XXXXXXXX
    const phoneClean = form.phone.replace(/\s/g, '');
    if (!/^(\+966|05)\d{8}$/.test(phoneClean)) e.phone = 'رقم سعودي غير صحيح';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'إيميل غير صحيح';
    if (!form.city.trim()) e.city = 'مطلوب';
    if (!/^[A-Za-z0-9]{4,12}$/.test(form.ref_code))
      e.ref_code = 'من 4 إلى 12 حرف/رقم إنجليزي فقط';
    if (refCodeStatus === 'taken') e.ref_code = 'الكود مستخدم، اختر كود آخر';
    if (!form.twitter.trim() && !form.instagram.trim() && !form.tiktok.trim())
      e.social = 'أدخل حساب واحد على الأقل';
    if (form.motivation.trim().length < 20 || form.motivation.trim().length > 500)
      e.motivation = 'من 20 إلى 500 حرف';
    if (!form.source) e.source = 'مطلوب';
    if (!form.terms_accepted) e.terms_accepted = 'يجب الموافقة على الشروط';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setSubmitting(true);

    const refCode = form.ref_code.toUpperCase();

    // Check ref_code uniqueness one more time
    const { data: existingCode } = await supabase
      .from('affiliates')
      .select('id')
      .eq('ref_code', refCode)
      .maybeSingle();
    if (existingCode) {
      setSubmitError('الكود مستخدم من شخص آخر، اختر كود مختلف');
      setSubmitting(false);
      return;
    }

    // Check duplicate phone/email
    const phoneClean = form.phone.replace(/\s/g, '');
    const { data: existingPhone } = await supabase
      .from('affiliates')
      .select('id')
      .eq('phone', phoneClean)
      .in('status', ['pending', 'approved'])
      .maybeSingle();
    if (existingPhone) {
      setSubmitError(
        'يوجد طلب سابق بهذا الرقم، راسلنا على الواتساب إذا تبي متابعة'
      );
      setSubmitting(false);
      return;
    }

    const { data: existingEmail } = await supabase
      .from('affiliates')
      .select('id')
      .eq('email', form.email.trim().toLowerCase())
      .in('status', ['pending', 'approved'])
      .maybeSingle();
    if (existingEmail) {
      setSubmitError(
        'يوجد طلب سابق بهذا الرقم، راسلنا على الواتساب إذا تبي متابعة'
      );
      setSubmitting(false);
      return;
    }

    const social_handles = {};
    if (form.twitter.trim()) social_handles.twitter = form.twitter.trim();
    if (form.instagram.trim()) social_handles.instagram = form.instagram.trim();
    if (form.tiktok.trim()) social_handles.tiktok = form.tiktok.trim();

    const { error } = await supabase.from('affiliates').insert({
      full_name: form.full_name.trim(),
      phone: phoneClean,
      email: form.email.trim().toLowerCase(),
      city: form.city.trim(),
      ref_code: refCode,
      social_handles,
      followers_count: form.followers_count
        ? parseInt(form.followers_count, 10)
        : null,
      motivation: form.motivation.trim(),
      source: form.source,
      status: 'pending',
      terms_accepted_at: new Date().toISOString(),
    });

    setSubmitting(false);
    if (error) {
      setSubmitError('حدث خطأ، حاول مرة ثانية');
      return;
    }
    navigate(
      `/partners/submitted?name=${encodeURIComponent(form.full_name.trim())}`
    );
  };

  /* ── Smooth scroll helper ── */
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Shared input styles ── */
  const inputClass =
    'w-full rounded-xl px-4 py-3 text-sm md:text-base outline-none transition-colors focus:ring-2 focus:ring-sky-500/40 placeholder:text-gray-500';
  const inputStyle = {
    background: 'var(--surface-base)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-subtle)',
    fontFamily: 'Tajawal',
  };

  /* ═══════════════════════════════════════
     Render
     ═══════════════════════════════════════ */
  return (
    <div
      dir="rtl"
      className="min-h-screen overflow-x-hidden"
      style={{
        background: 'var(--surface-base)',
        fontFamily: 'Tajawal',
        color: 'var(--text-primary)',
      }}
    >
      {/* ───────── HERO ───────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(56,189,248,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(56,189,248,0.06) 0%, transparent 60%)',
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            كن شريكاً في أكاديمية طلاقة
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
            style={{ color: 'var(--text-muted)' }}
          >
            اربح 100 ريال عن كل طالب ينضم عبر رابطك الخاص. دفع شهري. شفافية
            كاملة.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => scrollTo('apply')}
              className="px-8 py-3.5 rounded-xl font-bold text-base cursor-pointer transition-transform hover:scale-105 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
                color: '#0c1222',
              }}
            >
              قدّم الآن
            </button>
            <button
              onClick={() => scrollTo('how')}
              className="px-8 py-3.5 rounded-xl font-bold text-base cursor-pointer transition-transform hover:scale-105 active:scale-95 border"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                background: 'transparent',
              }}
            >
              كيف يعمل البرنامج؟
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 1 }}
            className="mt-16"
          >
            <ArrowDown className="w-5 h-5 mx-auto text-sky-400 animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="py-20 px-6">
        <SectionHeading icon={Share2} id="how">
          كيف يعمل البرنامج
        </SectionHeading>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={stagger}
          className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {[
            {
              icon: ClipboardCheck,
              title: 'قدّم طلب الانضمام',
              desc: '2 دقيقة',
              step: 1,
            },
            {
              icon: Link2,
              title: 'احصل على رابطك الفريد + QR',
              desc: 'بعد الموافقة',
              step: 2,
            },
            {
              icon: Share2,
              title: 'شاركه في حساباتك',
              desc: 'صور، ستوريز، فيديوهات',
              step: 3,
            },
            {
              icon: Banknote,
              title: 'اربح 100 ريال عن كل طالب ينضم',
              desc: '+ دفع شهري',
              step: 4,
            },
          ].map(({ icon: Icon, title, desc, step }) => (
            <motion.div
              key={step}
              variants={fadeUp}
              custom={step - 1}
              className="relative rounded-2xl p-6 text-center border"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold bg-sky-500/15 text-sky-400">
                {step}
              </div>
              <Icon className="w-8 h-8 mx-auto mb-3 text-sky-400" />
              <h3
                className="font-bold text-base md:text-lg mb-1"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                {desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ───────── COMMISSION CALCULATOR ───────── */}
      <section className="py-20 px-6">
        <SectionHeading icon={Calculator}>
          احسب أرباحك
        </SectionHeading>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="max-w-xl mx-auto rounded-2xl p-8 border text-center"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <label
            className="block text-base md:text-lg font-semibold mb-6"
            style={{ color: 'var(--text-primary)' }}
          >
            كم طالب تقدر تجيب شهرياً؟
          </label>

          <input
            type="range"
            min={1}
            max={100}
            value={students}
            onChange={(e) => setStudents(Number(e.target.value))}
            className="w-full mb-2 accent-sky-500"
          />

          <div className="flex items-center justify-center gap-3 mb-8">
            <input
              type="number"
              min={1}
              max={100}
              value={students}
              onChange={(e) => {
                const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                setStudents(v);
              }}
              className="w-20 rounded-lg px-3 py-2 text-center text-lg font-bold outline-none focus:ring-2 focus:ring-sky-500/40"
              style={{
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>طالب</span>
          </div>

          <motion.div
            key={students}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <p
              className="text-4xl md:text-5xl font-extrabold mb-1"
              style={{ color: 'var(--accent-sky, #38bdf8)' }}
            >
              {(students * 100).toLocaleString('ar-SA')} ريال
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              شهرياً
            </p>
          </motion.div>

          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {(students * 1200).toLocaleString('ar-SA')} ريال
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              سنوياً
            </p>
          </div>
        </motion.div>
      </section>

      {/* ───────── WHY FLUENTIA ───────── */}
      <section className="py-20 px-6">
        <SectionHeading icon={Star}>
          لماذا طلاقة
        </SectionHeading>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: TrendingUp,
              title: 'منتج مطلوب',
              desc: 'طلب متزايد على تعلم الإنجليزي',
            },
            {
              icon: Tag,
              title: 'أسعار تنافسية',
              desc: 'تبدأ من 500 ريال',
            },
            {
              icon: Star,
              title: 'سمعة قوية',
              desc: 'تقييمات حقيقية من طلاب فعليين',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              variants={fadeUp}
              custom={i}
              className="rounded-2xl p-6 border text-center"
              style={{
                background: 'var(--surface-raised)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <Icon className="w-9 h-9 mx-auto mb-4 text-sky-400" />
              <h3
                className="font-bold text-lg mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {title}
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ───────── FAQ ───────── */}
      <section className="py-20 px-6">
        <SectionHeading icon={HelpCircle}>
          الأسئلة الشائعة
        </SectionHeading>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="max-w-2xl mx-auto flex flex-col gap-3"
        >
          {faqData.map((item, i) => (
            <FAQItem
              key={i}
              q={item.q}
              a={item.a}
              open={openFAQ === i}
              toggle={() => setOpenFAQ(openFAQ === i ? null : i)}
            />
          ))}
        </motion.div>
      </section>

      {/* ───────── APPLICATION FORM ───────── */}
      <section id="apply" className="py-20 px-6" ref={applyRef}>
        <SectionHeading icon={FileText}>
          قدّم طلبك الآن
        </SectionHeading>

        <motion.form
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto rounded-2xl p-6 md:p-10 border space-y-5"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
          }}
          noValidate
        >
          {/* الاسم الكامل */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              الاسم الكامل
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="مثال: محمد العتيبي"
            />
            {errors.full_name && (
              <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>
            )}
          </div>

          {/* الجوال */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              الجوال
            </label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="05XXXXXXXX"
              dir="ltr"
            />
            {errors.phone && (
              <p className="text-red-400 text-xs mt-1">{errors.phone}</p>
            )}
          </div>

          {/* الإيميل */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              الإيميل
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="email@example.com"
              dir="ltr"
            />
            {errors.email && (
              <p className="text-red-400 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          {/* المدينة */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              المدينة
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="مثال: الرياض"
            />
            {errors.city && (
              <p className="text-red-400 text-xs mt-1">{errors.city}</p>
            )}
          </div>

          {/* الكود المطلوب */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              الكود المطلوب (ref_code)
            </label>
            <div className="relative">
              <input
                type="text"
                value={form.ref_code}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                  set('ref_code', v);
                }}
                onBlur={() => checkRefCode(form.ref_code)}
                maxLength={12}
                className={inputClass}
                style={inputStyle}
                placeholder="مثال: AHMED10"
                dir="ltr"
              />
              {refCodeStatus === 'checking' && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400 animate-spin" />
              )}
              {refCodeStatus === 'available' && (
                <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
              )}
              {refCodeStatus === 'taken' && (
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              من 4 إلى 12 حرف/رقم إنجليزي فقط
            </p>
            {refCodeStatus === 'taken' && (
              <p className="text-red-400 text-xs mt-1">الكود مستخدم، اختر كود آخر</p>
            )}
            {errors.ref_code && (
              <p className="text-red-400 text-xs mt-1">{errors.ref_code}</p>
            )}
          </div>

          {/* حسابات التواصل الاجتماعي */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              حسابات التواصل الاجتماعي (حساب واحد على الأقل)
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={form.twitter}
                onChange={(e) => set('twitter', e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="Twitter / X"
                dir="ltr"
              />
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => set('instagram', e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="Instagram"
                dir="ltr"
              />
              <input
                type="text"
                value={form.tiktok}
                onChange={(e) => set('tiktok', e.target.value)}
                className={inputClass}
                style={inputStyle}
                placeholder="TikTok"
                dir="ltr"
              />
            </div>
            {errors.social && (
              <p className="text-red-400 text-xs mt-1">{errors.social}</p>
            )}
          </div>

          {/* عدد المتابعين */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              تقريباً كم يبلغ مجموع متابعيك؟{' '}
              <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
                (اختياري)
              </span>
            </label>
            <input
              type="number"
              value={form.followers_count}
              onChange={(e) => set('followers_count', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="مثال: 5000"
              dir="ltr"
            />
          </div>

          {/* الدافع */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              ليش تبي تنضم لبرنامج شركاء طلاقة؟
            </label>
            <textarea
              value={form.motivation}
              onChange={(e) => set('motivation', e.target.value)}
              rows={4}
              className={inputClass + ' resize-none'}
              style={inputStyle}
              placeholder="اكتب هنا... (20 إلى 500 حرف)"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {form.motivation.length}/500
            </p>
            {errors.motivation && (
              <p className="text-red-400 text-xs mt-1">{errors.motivation}</p>
            )}
          </div>

          {/* مصدر */}
          <div>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
              من وين سمعت عنا؟
            </label>
            <select
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              className={inputClass + ' cursor-pointer'}
              style={inputStyle}
            >
              <option value="">اختر...</option>
              <option value="صديق">صديق</option>
              <option value="سوشال ميديا">سوشال ميديا</option>
              <option value="إعلان">إعلان</option>
              <option value="غير ذلك">غير ذلك</option>
            </select>
            {errors.source && (
              <p className="text-red-400 text-xs mt-1">{errors.source}</p>
            )}
          </div>

          {/* الشروط */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.terms_accepted}
                onChange={(e) => set('terms_accepted', e.target.checked)}
                className="mt-1 accent-sky-500 w-4 h-4"
              />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                أوافق على{' '}
                <a
                  href="/partners/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-sky-400 hover:text-sky-300"
                >
                  الشروط والأحكام
                </a>
              </span>
            </label>
            {errors.terms_accepted && (
              <p className="text-red-400 text-xs mt-1">{errors.terms_accepted}</p>
            )}
          </div>

          {/* Submit error */}
          {submitError && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-bold text-base cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
              color: '#0c1222',
            }}
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                قدّم طلبي
              </>
            )}
          </button>
        </motion.form>
      </section>

      {/* ───────── Footer strip ───────── */}
      <footer
        className="py-8 text-center text-sm border-t"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-muted)',
          fontFamily: 'Tajawal',
        }}
      >
        أكاديمية طلاقة &mdash; برنامج الشركاء
      </footer>
    </div>
  );
}
