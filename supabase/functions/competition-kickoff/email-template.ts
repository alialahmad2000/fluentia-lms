export interface KickoffEmailData {
  studentName: string
  teamName: string
  teamEmoji: string
  teamColor: string
  teamBattleCry: string
  opponentName: string
  vpOwn: number
  vpOpp: number
  gapXp: number
  endDate: string
}

export function renderKickoffEmail(d: KickoffEmailData): { subject: string; html: string } {
  const subject = `⚔️ بدأ تحدي طلاقة — فريقك يحتاجك! | ${d.studentName}`

  const isLeading = d.vpOwn >= d.vpOpp
  const standingLine = isLeading
    ? `فريقك يتصدر بـ <span style="color:#38bdf8;font-weight:bold">${d.vpOwn} نقطة نصر</span> مقابل ${d.vpOpp} للخصم`
    : `الخصم يتقدم — فريقك عند <span style="color:#38bdf8;font-weight:bold">${d.vpOwn} نقطة نصر</span>، الخصم عند ${d.vpOpp}`

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحدي طلاقة أبريل</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif;
      background: #060e1c;
      color: #e2e8f0;
      direction: rtl;
      text-align: right;
    }
    .wrapper { background: linear-gradient(160deg, #0f172a 0%, #0c1a35 50%, #082040 100%); min-height: 100vh; padding: 24px 16px; }
    .container { max-width: 560px; margin: 0 auto; }
    .header { text-align: center; padding: 32px 0 24px; border-bottom: 1px solid rgba(56,189,248,0.2); margin-bottom: 32px; }
    .logo { font-size: 26px; font-weight: 900; color: #38bdf8; letter-spacing: -0.5px; }
    .logo span { color: #7dd3fc; }
    .tagline { color: #64748b; font-size: 12px; margin-top: 4px; }
    .hero { text-align: center; padding: 32px 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(56,189,248,0.15); border-radius: 20px; margin-bottom: 28px; }
    .hero-title { font-size: 32px; font-weight: 900; color: #f8fafc; line-height: 1.2; margin-bottom: 8px; }
    .hero-vs { font-size: 48px; margin: 16px 0; letter-spacing: 4px; }
    .hero-sub { font-size: 14px; color: #94a3b8; }
    .team-badge { display: inline-block; background: rgba(56,189,248,0.1); border: 2px solid; border-radius: 14px; padding: 12px 28px; font-size: 22px; font-weight: 900; margin: 16px 0; }
    .personal { background: rgba(255,255,255,0.04); border-right: 4px solid #38bdf8; padding: 20px 20px 20px 16px; border-radius: 12px; margin-bottom: 24px; }
    .personal p { font-size: 16px; line-height: 1.8; color: #cbd5e1; }
    .personal .name { color: #38bdf8; font-weight: 900; font-size: 18px; }
    .standing { background: rgba(15,23,42,0.6); border: 1px solid rgba(56,189,248,0.2); border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center; }
    .standing p { font-size: 15px; color: #cbd5e1; line-height: 1.7; }
    .section-title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .bullets { background: rgba(255,255,255,0.03); border-radius: 12px; padding: 20px 20px 20px 12px; margin-bottom: 28px; }
    .bullet { display: flex; align-items: flex-start; gap: 12px; padding: 8px 0; font-size: 14px; color: #cbd5e1; line-height: 1.6; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .bullet:last-child { border-bottom: none; }
    .bullet-icon { flex-shrink: 0; width: 28px; height: 28px; background: rgba(56,189,248,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; }
    .cta { text-align: center; margin-bottom: 28px; }
    .cta a { display: inline-block; background: linear-gradient(135deg, #0ea5e9, #38bdf8); color: white !important; text-decoration: none; padding: 16px 40px; border-radius: 14px; font-size: 17px; font-weight: 700; letter-spacing: 0.3px; }
    .battle-cry { text-align: center; font-size: 20px; font-weight: 900; color: #38bdf8; padding: 16px; margin-bottom: 24px; }
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #475569; line-height: 2; }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
<div class="wrapper">
<div class="container">

  <div class="header">
    <div class="logo">Flu<span>entia</span></div>
    <div class="tagline">أكاديمية طلاقة</div>
  </div>

  <div class="hero">
    <div class="hero-title">⚔️ تحدي طلاقة أبريل</div>
    <div class="hero-vs">🔵 ⚔️ 🔴</div>
    <div class="hero-sub">المنافسة بدأت — كل نقطة XP تُحسب لفريقك</div>
  </div>

  <div class="personal">
    <p>مرحباً <span class="name">${d.studentName}</span>،</p>
    <p style="margin-top:8px">انضممت تلقائياً إلى <strong style="color:${d.teamColor}">${d.teamEmoji} ${d.teamName}</strong> في تحدي طلاقة أبريل 2026.</p>
    <p style="margin-top:8px; font-size:14px; color:#94a3b8">التحدي ينتهي ${d.endDate} — لديك 13 يوماً كاملاً.</p>
  </div>

  <div class="standing">
    <div style="font-size:13px;color:#94a3b8;margin-bottom:8px">الوضع الحالي</div>
    <p>${standingLine}</p>
    <div style="margin-top:16px;display:flex;justify-content:center;gap:32px">
      <div>
        <div style="font-size:28px;font-weight:900;color:#38bdf8">${d.vpOwn}</div>
        <div style="font-size:11px;color:#64748b">${d.teamName}</div>
      </div>
      <div style="font-size:28px;color:#475569;font-weight:900;padding-top:4px">VS</div>
      <div>
        <div style="font-size:28px;font-weight:900;color:#ef4444">${d.vpOpp}</div>
        <div style="font-size:11px;color:#64748b">${d.opponentName}</div>
      </div>
    </div>
    <div style="font-size:12px;color:#64748b;margin-top:8px">نقاط النصر = مجموع XP الفريق ÷ 50</div>
  </div>

  <div class="section-title">كيف تكسب لفريقك؟</div>
  <div class="bullets">
    <div class="bullet">
      <div class="bullet-icon">📚</div>
      <div>كل درس وتمرين وكلمات تتعلمها = XP فورية لفريقك</div>
    </div>
    <div class="bullet">
      <div class="bullet-icon">🔥</div>
      <div>إذا انشط 80% من فريقك كل يوم → ستريك جماعي + بونص كبير (3 أيام = 75XP، 7 أيام = 500XP)</div>
    </div>
    <div class="bullet">
      <div class="bullet-icon">🎯</div>
      <div>أكمل وحدة الأسبوع → بونص الفريق (50% = 150XP، 70% = 400XP، 100% = 1200XP)</div>
    </div>
    <div class="bullet">
      <div class="bullet-icon">🤝</div>
      <div>شجّع زميلك في الفريق → +2XP لك وَ +3XP له (حتى 5 مرات يومياً)</div>
    </div>
    <div class="bullet">
      <div class="bullet-icon">🏆</div>
      <div>الفريق الفائز يحصل على شهادات + بادجات + مفاجأة من الأكاديمية</div>
    </div>
  </div>

  <div class="cta">
    <a href="https://app.fluentia.academy/student/competition">ادخل المنصة وابدأ الآن →</a>
  </div>

  <div class="battle-cry">${d.teamEmoji} ${d.teamBattleCry}</div>

  <div class="footer">
    <p><strong>Fluentia Academy — أكاديمية طلاقة</strong></p>
    <p>التحدي ينتهي 30 أبريل 2026 الساعة 11:59 مساءً بتوقيت الرياض</p>
    <p style="margin-top:8px">للاستفسار: <a href="https://wa.me/966500000000">واتساب الأكاديمية</a></p>
    <p style="margin-top:4px">هذا البريد مُرسل تلقائياً — لا ترد عليه.</p>
  </div>

</div>
</div>
</body>
</html>`

  return { subject, html }
}

export function renderAdminEmail(data: {
  studentCountA: number
  studentCountB: number
  vpA: number
  vpB: number
  xpA: number
  xpB: number
  emailsSent: number
  pushSent: number
  notifCreated: number
}): { subject: string; html: string } {
  const subject = `🎯 انطلقت مسابقة أبريل — لوحة المدرب/الأدمن جاهزة`

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #060e1c; color: #e2e8f0; direction: rtl; margin: 0; padding: 24px 16px; }
    .c { max-width: 520px; margin: 0 auto; }
    h1 { font-size: 24px; color: #38bdf8; margin-bottom: 16px; }
    h2 { font-size: 16px; color: #f1f5f9; margin: 20px 0 8px; }
    p,li { font-size: 14px; color: #cbd5e1; line-height: 1.8; }
    .stat { background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .stat-row:last-child { border-bottom: none; }
    .v { color: #38bdf8; font-weight: bold; }
    ul { padding-right: 20px; margin: 8px 0; }
    .btn { display: inline-block; background: #0ea5e9; color: white !important; text-decoration: none; padding: 10px 24px; border-radius: 10px; font-weight: bold; margin-top: 12px; }
    .note { background: rgba(251,191,36,0.1); border-right: 3px solid #fbbf24; padding: 12px 14px; border-radius: 8px; margin-top: 16px; font-size: 13px; color: #fde68a; }
    .footer { text-align: center; margin-top: 32px; font-size: 11px; color: #475569; }
  </style>
</head>
<body>
<div class="c">
  <h1>🎯 انطلقت مسابقة أبريل 2026</h1>

  <div class="stat">
    <div class="stat-row"><span>طلاب فريق A1 (المجموعة 2)</span><span class="v">${data.studentCountA}</span></div>
    <div class="stat-row"><span>طلاب فريق B1 (المجموعة 4)</span><span class="v">${data.studentCountB}</span></div>
    <div class="stat-row"><span>إجمالي الطلاب</span><span class="v">${data.studentCountA + data.studentCountB}</span></div>
  </div>

  <div class="stat">
    <div class="stat-row"><span>نقاط نصر فريق A1 (الآن)</span><span class="v">${data.vpA} VP</span></div>
    <div class="stat-row"><span>نقاط نصر فريق B1 (الآن)</span><span class="v">${data.vpB} VP</span></div>
    <div class="stat-row"><span>XP A1 (كل الوقت)</span><span class="v">${data.xpA.toLocaleString()}</span></div>
    <div class="stat-row"><span>XP B1 (كل الوقت)</span><span class="v">${data.xpB.toLocaleString()}</span></div>
  </div>

  <div class="stat">
    <div class="stat-row"><span>إيميلات أُرسلت</span><span class="v">${data.emailsSent}</span></div>
    <div class="stat-row"><span>إشعارات Push أُرسلت</span><span class="v">${data.pushSent}</span></div>
    <div class="stat-row"><span>إشعارات داخل التطبيق</span><span class="v">${data.notifCreated}</span></div>
  </div>

  <h2>لوحة المشرف</h2>
  <p>ستكون لوحة الأدمن متاحة قريباً عبر: <strong>/admin/competition</strong></p>
  <a class="btn" href="https://app.fluentia.academy/admin">الدخول للوحة الإدارة →</a>

  <h2>تعليمات للمدرب</h2>
  <ul>
    <li>استخدم <strong>Quick Points</strong> لمنح XP للطلاب في الكلاس — كل نقطة تُحسب تلقائياً لفريقهم</li>
    <li>الطلاب النشطون يومياً يحصل فريقهم على ستريك جماعي + بونص XP</li>
    <li>شجع الطلاب على إكمال وحدة الأسبوع (الوحدة 4 هذا الأسبوع)</li>
    <li>يمكنك تشجيع الطلاب عبر التطبيق (peer recognition)</li>
  </ul>

  <div class="note">
    <strong>ملاحظة لد. محمد:</strong> تدريسك للفريقين أمر طبيعي وموضع ثقة. البونصات تعتمد على أداء الطلاب فقط — لا تحيز في النظام.
  </div>

  <div class="footer">Fluentia Academy — تحدي أبريل 2026 — ينتهي 30 أبريل 11:59 مساءً</div>
</div>
</body>
</html>`

  return { subject, html }
}
