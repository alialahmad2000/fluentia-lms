// scripts/send-welcome-ali-2026-04-27.cjs
// Welcome email send via Resend API
// Student: علي سعيد القحطاني · A1 · tamayuz · 1500 SAR
//
// USAGE:
//   Test send (to your personal email):
//     node scripts/send-welcome-ali-2026-04-27.cjs alialahmad2000@gmail.com
//
//   Production send (to actual student):
//     node scripts/send-welcome-ali-2026-04-27.cjs
//     (no arg = sends to alialq146@gmail.com)

require('dotenv').config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// RESEND_API_KEY lives in Supabase Edge Function secrets (not in local .env).
// If not present locally, we route through the deployed send-email edge function.
const USE_EDGE_FN = !RESEND_API_KEY;

if (USE_EDGE_FN && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error('❌ No RESEND_API_KEY and no Supabase credentials — cannot send email');
  process.exit(1);
}

const STUDENT_EMAIL = 'alialq146@gmail.com';
const RECIPIENT = (process.argv[2] || STUDENT_EMAIL).trim().toLowerCase();
const IS_TEST = RECIPIENT !== STUDENT_EMAIL;

const SUBJECT = IS_TEST
  ? '[TEST] أهلاً بك في أكاديمية طلاقة 🎓 — حسابك جاهز'
  : 'أهلاً بك في أكاديمية طلاقة 🎓 — حسابك جاهز';

const FROM = 'Fluentia Academy <ali@fluentia.academy>';
const REPLY_TO = 'fluentia.sa@gmail.com';

const HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>أهلاً بك في أكاديمية طلاقة - علي القحطاني</title>
</head>
<body style="margin:0;padding:0;background:#0a1628;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">

<!-- ╔════════════════ EMAIL CONTENT (everything below is the email body) ════════════════╗ -->

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;padding:24px 12px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#0a1628 0%,#1e3a5f 60%,#2563eb 100%);padding:36px 32px;text-align:center;">
        <div style="font-size:13px;color:#fbbf24;letter-spacing:3px;font-weight:700;margin-bottom:8px;">FLUENTIA · باقة تميّز</div>
        <div style="font-size:30px;color:#ffffff;font-weight:800;margin:0;letter-spacing:-0.5px;">أهلاً بك يا علي 🎓</div>
        <div style="font-size:15px;color:#7dd3fc;margin-top:10px;line-height:1.6;">رحلتك مع الإنجليزية بدأت — ونحن متحمسون لها</div>
      </td></tr>

      <!-- APOLOGY -->
      <tr><td style="padding:28px 32px 4px;">
        <div style="background:#fef3c7;border-right:4px solid #f59e0b;padding:18px 20px;border-radius:8px;">
          <div style="font-size:14px;color:#78350f;font-weight:700;margin-bottom:8px;">🙏 اعتذار صادق</div>
          <div style="font-size:14px;color:#78350f;line-height:1.8;">
            تأخرنا في تجهيز حسابك على المنصة وحضرت كلاس الأمس بدون وصول كامل للمحتوى. نعتذر منك بصدق — هذا تقصير منّا، وقد جهّزنا كل شي لك الآن. شكراً على صبرك وثقتك ✨
          </div>
        </div>
      </td></tr>

      <!-- WELCOME BODY -->
      <tr><td style="padding:24px 32px 8px;">
        <p style="font-size:16px;color:#374151;line-height:1.9;margin:0;">
          اخترت <strong style="color:#1a2d50;">باقة التميّز</strong> — وهذي أعلى باقة جماعية عندنا، صُممت لمن يبي يكتسب لغة قوية وممارسة كثيفة. أنت معاك:
        </p>
        <ul style="font-size:15px;color:#374151;line-height:2.1;margin:12px 0 0;padding:0 22px 0 0;">
          <li>كلاسات جماعية مرتين أسبوعياً مع <strong>د. محمد شربط</strong></li>
          <li>منصة LMS تفاعلية كاملة (مفردات، قواعد، قراءة، استماع، كتابة، نطق)</li>
          <li>تصحيح ذكي بالذكاء الاصطناعي للكتابة والنطق</li>
          <li>متابعة شخصية ومحادثات مع المدرب</li>
        </ul>
      </td></tr>

      <!-- CREDENTIALS BOX -->
      <tr><td style="padding:24px 32px 8px;">
        <div style="font-size:13px;color:#1a2d50;font-weight:700;letter-spacing:1.5px;margin-bottom:14px;">🔐 بيانات الدخول</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a1628;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:24px 26px;">
            <div style="font-size:12px;color:#7dd3fc;margin-bottom:6px;letter-spacing:0.5px;">رابط المنصة</div>
            <div style="font-size:16px;color:#ffffff;font-weight:600;margin-bottom:18px;">
              <a href="https://app.fluentia.academy" style="color:#38bdf8;text-decoration:none;">app.fluentia.academy</a>
            </div>
            <div style="font-size:12px;color:#7dd3fc;margin-bottom:6px;letter-spacing:0.5px;">البريد الإلكتروني</div>
            <div style="font-size:15px;color:#ffffff;font-family:'Courier New',monospace;margin-bottom:18px;direction:ltr;text-align:right;background:#1a2d50;padding:10px 14px;border-radius:6px;">alialq146@gmail.com</div>
            <div style="font-size:12px;color:#7dd3fc;margin-bottom:6px;letter-spacing:0.5px;">كلمة المرور المؤقتة</div>
            <div style="font-size:18px;color:#fbbf24;font-family:'Courier New',monospace;direction:ltr;text-align:right;font-weight:700;background:#1a2d50;padding:10px 14px;border-radius:6px;letter-spacing:1px;">Fluentia2025!</div>
          </td></tr>
        </table>
        <p style="font-size:13px;color:#6b7280;margin:14px 4px 0;line-height:1.7;">
          🛡️ عند أول تسجيل دخول، المنصة راح تطلب منك تغيير كلمة المرور إلى كلمة خاصة فيك.
        </p>
      </td></tr>

      <!-- iOS INSTALL -->
      <tr><td style="padding:24px 32px 8px;">
        <div style="font-size:13px;color:#1a2d50;font-weight:700;letter-spacing:1.5px;margin-bottom:14px;">📱 ثبّت التطبيق على جوالك (موصى به)</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
          <tr><td style="padding:22px 24px;">
            <div style="font-size:13px;color:#1a2d50;font-weight:700;margin-bottom:10px;">للآيفون / الآيباد:</div>
            <ol style="margin:0 0 18px;padding:0 20px 0 0;color:#374151;font-size:14px;line-height:2;">
              <li>افتح <strong>app.fluentia.academy</strong> من متصفح <strong>Safari</strong> (مهم — لازم Safari)</li>
              <li>اضغط زر <strong>المشاركة</strong> في الأسفل (المربع مع السهم لأعلى ⬆️)</li>
              <li>اختر <strong>"إضافة إلى الشاشة الرئيسية"</strong></li>
              <li>اضغط <strong>"إضافة"</strong></li>
            </ol>
            <div style="font-size:13px;color:#1a2d50;font-weight:700;margin-bottom:10px;">للأندرويد:</div>
            <ol style="margin:0;padding:0 20px 0 0;color:#374151;font-size:14px;line-height:2;">
              <li>افتح <strong>app.fluentia.academy</strong> من <strong>Chrome</strong></li>
              <li>اضغط القائمة (⋮) في الأعلى</li>
              <li>اختر <strong>"تثبيت التطبيق"</strong></li>
            </ol>
            <div style="margin-top:16px;padding:12px 14px;background:#dbeafe;border-radius:8px;font-size:13px;color:#1e3a8a;line-height:1.7;">
              💡 بعد التثبيت، فعّل <strong>الإشعارات</strong> من إعدادات المنصة — تجيك تذكيرات الكلاسات والواجبات.
            </div>
          </td></tr>
        </table>
      </td></tr>

      <!-- CLASS SCHEDULE -->
      <tr><td style="padding:24px 32px 8px;">
        <div style="font-size:13px;color:#1a2d50;font-weight:700;letter-spacing:1.5px;margin-bottom:14px;">🗓️ جدول الكلاسات</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#1a2d50 0%,#2563eb 100%);border-radius:12px;">
          <tr><td style="padding:22px 24px;color:#ffffff;">
            <div style="font-size:14px;color:#fbbf24;font-weight:700;margin-bottom:6px;">📍 المجموعة 2 · مستوى A1</div>
            <div style="font-size:14px;color:#ffffff;line-height:1.9;margin-bottom:14px;">المدرب: د. محمد شربط</div>
            <div style="font-size:13px;color:#7dd3fc;margin-bottom:6px;">الوقت:</div>
            <div style="font-size:18px;color:#ffffff;font-weight:700;margin-bottom:14px;">9:15 مساءً · مرتين أسبوعياً</div>
            <div style="font-size:13px;color:#7dd3fc;margin-bottom:6px;">رابط الحضور:</div>
            <div style="font-size:14px;color:#ffffff;line-height:1.7;">
              📌 رابط Google Meet موجود <strong>داخل المنصة</strong> في صفحة "الكلاس القادم"
            </div>
          </td></tr>
        </table>
      </td></tr>

      <!-- FIRST STEPS -->
      <tr><td style="padding:24px 32px 8px;">
        <div style="font-size:13px;color:#1a2d50;font-weight:700;letter-spacing:1.5px;margin-bottom:14px;">🚀 خطواتك الأولى</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding:0;">
            <div style="background:#f8fafc;border-right:3px solid #2563eb;padding:14px 18px;border-radius:6px;margin-bottom:10px;font-size:14px;color:#374151;line-height:1.7;">
              <strong style="color:#1a2d50;">١.</strong> ادخل المنصة وغيّر كلمة المرور
            </div>
            <div style="background:#f8fafc;border-right:3px solid #2563eb;padding:14px 18px;border-radius:6px;margin-bottom:10px;font-size:14px;color:#374151;line-height:1.7;">
              <strong style="color:#1a2d50;">٢.</strong> ثبّت التطبيق على جوالك (الخطوات بالأعلى)
            </div>
            <div style="background:#f8fafc;border-right:3px solid #2563eb;padding:14px 18px;border-radius:6px;margin-bottom:10px;font-size:14px;color:#374151;line-height:1.7;">
              <strong style="color:#1a2d50;">٣.</strong> فعّل الإشعارات لتذكيرات الكلاس
            </div>
            <div style="background:#f8fafc;border-right:3px solid #2563eb;padding:14px 18px;border-radius:6px;margin-bottom:10px;font-size:14px;color:#374151;line-height:1.7;">
              <strong style="color:#1a2d50;">٤.</strong> ابدأ بصفحة "المنهج" واستكشف الوحدة الأولى
            </div>
            <div style="background:#f8fafc;border-right:3px solid #2563eb;padding:14px 18px;border-radius:6px;font-size:14px;color:#374151;line-height:1.7;">
              <strong style="color:#1a2d50;">٥.</strong> احضر كلاس الجاي الساعة 9:15 مساءً عبر الرابط في المنصة
            </div>
          </td></tr>
        </table>
      </td></tr>

      <!-- SUPPORT -->
      <tr><td style="padding:24px 32px 8px;">
        <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:12px;padding:20px 24px;text-align:center;">
          <div style="font-size:14px;color:#065f46;font-weight:700;margin-bottom:8px;">💬 محتاج مساعدة؟</div>
          <div style="font-size:14px;color:#065f46;line-height:1.8;">
            تواصل معنا على واتساب الأكاديمية:<br>
            <a href="https://wa.me/966558669974" style="color:#047857;font-weight:700;text-decoration:none;font-size:18px;direction:ltr;display:inline-block;margin-top:6px;">+966 55 866 9974</a>
          </div>
        </div>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#0a1628;padding:28px 32px;text-align:center;">
        <div style="font-size:14px;color:#7dd3fc;letter-spacing:2px;font-weight:700;margin-bottom:8px;">FLUENTIA ACADEMY</div>
        <div style="font-size:13px;color:#94a3b8;line-height:1.8;margin-bottom:12px;">
          أكاديمية طلاقة · رحلتك للإنجليزية تبدأ هنا
        </div>
        <div style="font-size:12px;color:#64748b;">
          fluentia.academy · fluentia.sa@gmail.com
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>

</body>
</html>
`;

(async () => {
  console.log('═══════════════════════════════════════════════════════');
  if (IS_TEST) {
    console.log('🧪 TEST MODE — sending to your personal email');
  } else {
    console.log('🚀 PRODUCTION MODE — sending to actual student');
  }
  console.log('═══════════════════════════════════════════════════════');
  console.log(`To:      ${RECIPIENT}`);
  console.log(`From:    ${FROM}`);
  console.log(`Subject: ${SUBJECT}`);
  console.log(`HTML:    ${HTML.length} chars`);
  console.log('───────────────────────────────────────────────────────');

  if (!IS_TEST) {
    console.log('⚠️  This will send to the REAL STUDENT.');
    console.log('   If this is wrong, hit Ctrl+C in the next 3 seconds...');
    await new Promise(r => setTimeout(r, 3000));
  }

  let res, data;

  if (USE_EDGE_FN) {
    console.log('ℹ️  No local RESEND_API_KEY — routing through Supabase send-email edge function');
    res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: RECIPIENT, subject: SUBJECT, html: HTML }),
    });
    data = await res.json();
    // Edge function returns { success, id } or { error }
    if (res.ok && (data.id || data.success)) {
      console.log(`✅ EMAIL SENT via edge function — Resend ID: ${data.id || '(queued)'}`);
      console.log(`   Check inbox: ${RECIPIENT}`);
      if (data.id) console.log(`   Resend log:  https://resend.com/emails/${data.id}`);
    } else {
      console.error('❌ SEND FAILED (edge function)');
      console.error('   HTTP status:', res.status);
      console.error('   Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } else {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: RECIPIENT, subject: SUBJECT, html: HTML, reply_to: REPLY_TO }),
    });
    data = await res.json();
  }

  if (!USE_EDGE_FN) {
    if (res.ok && data.id) {
      console.log(`✅ EMAIL SENT — Resend ID: ${data.id}`);
      console.log(`   Check inbox: ${RECIPIENT}`);
      console.log(`   Resend log:  https://resend.com/emails/${data.id}`);
    } else {
      console.error('❌ SEND FAILED');
      console.error('   HTTP status:', res.status);
      console.error('   Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }
  }

  if (IS_TEST) {
    console.log('');
    console.log('───────────────────────────────────────────────────────');
    console.log('NEXT STEP — if the test looks good:');
    console.log('  node scripts/send-welcome-ali-2026-04-27.cjs');
    console.log('───────────────────────────────────────────────────────');
  }
})().catch(err => {
  console.error('💥 SCRIPT ERROR:', err.message);
  console.error(err);
  process.exit(1);
});
