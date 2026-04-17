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
  const totalVP = d.vpOwn + d.vpOpp || 1
  const ownPct = Math.round((d.vpOwn / totalVP) * 100)
  const oppPct = 100 - ownPct

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحدي طلاقة أبريل</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Tajawal', 'Segoe UI', Arial, sans-serif; background: #060e1c; color: #e2e8f0; direction: rtl; text-align: right; }
    .wrapper { background: linear-gradient(160deg, #0f172a 0%, #0c1a35 50%, #082040 100%); min-height: 100vh; padding: 24px 16px; }
    .container { max-width: 580px; margin: 0 auto; }

    /* Header */
    .header { text-align: center; padding: 28px 0 20px; border-bottom: 1px solid rgba(56,189,248,0.15); margin-bottom: 0; }
    .logo { font-size: 28px; font-weight: 900; color: #38bdf8; letter-spacing: -0.5px; }
    .logo span { color: #7dd3fc; }
    .tagline { color: #64748b; font-size: 12px; margin-top: 4px; }

    /* Hero */
    .hero { text-align: center; padding: 36px 24px 28px; background: linear-gradient(180deg, rgba(56,189,248,0.06) 0%, transparent 100%); border-bottom: 1px solid rgba(56,189,248,0.08); margin-bottom: 28px; }
    .hero-icon { font-size: 56px; margin-bottom: 12px; display: block; }
    .hero-title { font-size: 30px; font-weight: 900; color: #f8fafc; line-height: 1.2; margin-bottom: 8px; }
    .hero-sub { font-size: 15px; color: #94a3b8; margin-bottom: 20px; }
    .team-badge { display: inline-block; border: 2px solid ${d.teamColor}; background: ${d.teamColor}15; border-radius: 16px; padding: 10px 28px; font-size: 20px; font-weight: 900; color: ${d.teamColor}; margin-bottom: 8px; }
    .battle-cry-hero { font-size: 14px; color: #64748b; font-style: italic; }

    /* Personal greeting */
    .personal { background: rgba(255,255,255,0.03); border-right: 4px solid ${d.teamColor}; padding: 18px 18px 18px 14px; border-radius: 12px; margin-bottom: 24px; }
    .personal p { font-size: 15px; line-height: 1.9; color: #cbd5e1; }
    .name { color: ${d.teamColor}; font-weight: 900; font-size: 17px; }

    /* Scoreboard */
    .scoreboard { background: rgba(15,23,42,0.7); border: 1px solid rgba(56,189,248,0.18); border-radius: 16px; padding: 20px; margin-bottom: 24px; }
    .scoreboard-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-bottom: 16px; }
    .score-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .score-team { text-align: center; flex: 1; }
    .score-num { font-size: 36px; font-weight: 900; line-height: 1; }
    .score-label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .score-vs { font-size: 14px; font-weight: 700; color: #475569; padding: 0 16px; flex-shrink: 0; }
    .vp-bar-wrapper { margin-top: 12px; }
    .vp-bar-labels { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px; }
    .vp-bar { height: 8px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; display: flex; }
    .vp-bar-own { height: 100%; background: ${d.teamColor}; border-radius: 99px 0 0 99px; transition: width 0.3s; }
    .vp-bar-opp { height: 100%; background: #ef4444; border-radius: 0 99px 99px 0; }
    .vp-note { font-size: 11px; color: #475569; text-align: center; margin-top: 8px; }
    .leading-badge { display: inline-block; background: ${isLeading ? d.teamColor + '20' : 'rgba(239,68,68,0.12)'}; color: ${isLeading ? d.teamColor : '#ef4444'}; border: 1px solid ${isLeading ? d.teamColor + '40' : 'rgba(239,68,68,0.3)'}; border-radius: 99px; font-size: 12px; font-weight: 700; padding: 4px 14px; margin-top: 12px; }

    /* Section heading */
    .section-heading { font-size: 16px; font-weight: 700; color: #f1f5f9; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.07); }

    /* XP table */
    .xp-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 14px; }
    .xp-table th { font-size: 11px; font-weight: 700; color: #64748b; text-align: right; padding: 8px 12px; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .xp-table td { padding: 10px 12px; color: #cbd5e1; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; line-height: 1.6; }
    .xp-table tr:last-child td { border-bottom: none; }
    .xp-table .xp-amt { color: #38bdf8; font-weight: 900; white-space: nowrap; text-align: left; }
    .xp-table .icon-col { width: 32px; }
    .xp-row-alt { background: rgba(255,255,255,0.02); }

    /* Bonus panels */
    .bonus-grid { display: flex; gap: 12px; margin-bottom: 28px; }
    .bonus-panel { flex: 1; border-radius: 14px; overflow: hidden; }
    .bonus-header { padding: 10px 14px; font-size: 12px; font-weight: 700; }
    .bonus-body { padding: 12px 14px; background: rgba(255,255,255,0.02); font-size: 13px; color: #94a3b8; line-height: 1.7; }
    .bonus-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
    .bonus-row:last-child { border-bottom: none; }
    .bonus-xp { font-weight: 700; }

    /* Rewards */
    .rewards-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }
    .reward-card { flex: 1; min-width: 120px; background: rgba(56,189,248,0.05); border: 1px solid rgba(56,189,248,0.15); border-radius: 12px; padding: 14px 12px; text-align: center; }
    .reward-icon { font-size: 24px; display: block; margin-bottom: 6px; }
    .reward-name { font-size: 12px; font-weight: 700; color: #f1f5f9; margin-bottom: 2px; }
    .reward-desc { font-size: 11px; color: #64748b; }

    /* First steps */
    .steps { margin-bottom: 28px; }
    .step { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px; color: #cbd5e1; line-height: 1.6; }
    .step:last-child { border-bottom: none; }
    .step-num { flex-shrink: 0; width: 26px; height: 26px; background: ${d.teamColor}; color: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 900; }

    /* CTA */
    .cta { text-align: center; margin-bottom: 28px; }
    .cta a { display: inline-block; background: linear-gradient(135deg, ${d.teamColor}cc, ${d.teamColor}); color: #0f172a !important; text-decoration: none; padding: 16px 48px; border-radius: 16px; font-size: 18px; font-weight: 900; letter-spacing: 0.3px; box-shadow: 0 4px 24px ${d.teamColor}40; }

    /* FAQ */
    .faq { margin-bottom: 28px; }
    .faq-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 14px 16px; margin-bottom: 8px; }
    .faq-q { font-size: 14px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px; }
    .faq-a { font-size: 13px; color: #94a3b8; line-height: 1.7; }

    /* Footer */
    .footer { text-align: center; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.07); font-size: 12px; color: #475569; line-height: 2.2; }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
<div class="wrapper">
<div class="container">

  <!-- Header -->
  <div class="header">
    <div class="logo">Flu<span>entia</span></div>
    <div class="tagline">أكاديمية طلاقة</div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <span class="hero-icon">⚔️</span>
    <div class="hero-title">تحدي طلاقة أبريل 2026</div>
    <div class="hero-sub">المنافسة بدأت — كل XP تكسبه يُحسب لفريقك</div>
    <div class="team-badge">${d.teamEmoji} ${d.teamName}</div><br>
    <div class="battle-cry-hero">${d.teamBattleCry}</div>
  </div>

  <!-- Personal greeting -->
  <div class="personal">
    <p>مرحباً <span class="name">${d.studentName}</span>،</p>
    <p style="margin-top:6px">أنت الآن في <strong style="color:${d.teamColor}">${d.teamEmoji} ${d.teamName}</strong> — فريقك جاهز ويحتاج مساهمتك!</p>
    <p style="margin-top:6px; color:#94a3b8; font-size:13px">التحدي ينتهي ${d.endDate} — كل نقطة XP تكسبها تُضاف تلقائياً لرصيد فريقك.</p>
  </div>

  <!-- Live scoreboard -->
  <div class="scoreboard">
    <div class="scoreboard-title">الوضع الحالي</div>
    <div class="score-row">
      <div class="score-team">
        <div class="score-num" style="color:${d.teamColor}">${d.vpOwn}</div>
        <div class="score-label">${d.teamEmoji} ${d.teamName}</div>
      </div>
      <div class="score-vs">VS</div>
      <div class="score-team">
        <div class="score-num" style="color:#ef4444">${d.vpOpp}</div>
        <div class="score-label">⚡ ${d.opponentName}</div>
      </div>
    </div>
    <div class="vp-bar-wrapper">
      <div class="vp-bar-labels">
        <span>${ownPct}%</span>
        <span>نقاط النصر</span>
        <span>${oppPct}%</span>
      </div>
      <div class="vp-bar">
        <div class="vp-bar-own" style="width:${ownPct}%"></div>
        <div class="vp-bar-opp" style="width:${oppPct}%"></div>
      </div>
    </div>
    <div style="text-align:center; margin-top:10px">
      <span class="leading-badge">${isLeading ? `✅ فريقك في المقدمة بـ ${Math.abs(d.vpOwn - d.vpOpp)} VP` : `⚠️ الخصم يتقدم بـ ${Math.abs(d.vpOwn - d.vpOpp)} VP`}</span>
    </div>
    <div class="vp-note">نقاط النصر VP = مجموع XP الفريق ÷ 50</div>
  </div>

  <!-- XP Earning Table -->
  <div class="section-heading">📊 كيف تكسب XP لفريقك؟</div>
  <table class="xp-table">
    <thead>
      <tr>
        <th class="icon-col"></th>
        <th>النشاط</th>
        <th>XP</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>📚</td>
        <td>كل درس أو تمرين أو قراءة تُكملها</td>
        <td class="xp-amt">+5 XP</td>
      </tr>
      <tr class="xp-row-alt">
        <td>✏️</td>
        <td>تمارين الكتابة والإملاء</td>
        <td class="xp-amt">+5 XP</td>
      </tr>
      <tr>
        <td>🎤</td>
        <td>تمارين المحادثة والنطق</td>
        <td class="xp-amt">+10 XP</td>
      </tr>
      <tr class="xp-row-alt">
        <td>📖</td>
        <td>إكمال وحدة كاملة</td>
        <td class="xp-amt">+20 XP</td>
      </tr>
      <tr>
        <td>🎮</td>
        <td>ألعاب المفردات والتحديات</td>
        <td class="xp-amt">+5 XP</td>
      </tr>
      <tr class="xp-row-alt">
        <td>💪</td>
        <td>تشجيع زميل في الفريق</td>
        <td class="xp-amt">+2 XP لك / +3 XP له</td>
      </tr>
      <tr>
        <td>⭐</td>
        <td>نقاط المدرب (حضور، مشاركة)</td>
        <td class="xp-amt">يحددها المدرب</td>
      </tr>
    </tbody>
  </table>

  <!-- Team Bonuses -->
  <div class="section-heading">🔥 مكافآت الفريق الجماعية</div>
  <div class="bonus-grid">
    <div class="bonus-panel">
      <div class="bonus-header" style="background:rgba(251,146,60,0.12); color:#fb923c;">🔥 ستريك الفريق اليومي</div>
      <div class="bonus-body">
        إذا نشط 80%+ من فريقك يومياً — الستريك يستمر!
        <div style="margin-top:10px">
          <div class="bonus-row"><span>3 أيام</span><span class="bonus-xp" style="color:#fb923c">+75 XP</span></div>
          <div class="bonus-row"><span>5 أيام</span><span class="bonus-xp" style="color:#fb923c">+200 XP</span></div>
          <div class="bonus-row"><span>7 أيام</span><span class="bonus-xp" style="color:#fb923c">+500 XP</span></div>
          <div class="bonus-row"><span>14 يوماً</span><span class="bonus-xp" style="color:#fb923c">+1500 XP</span></div>
        </div>
      </div>
    </div>
    <div class="bonus-panel">
      <div class="bonus-header" style="background:rgba(34,197,94,0.12); color:#22c55e;">🎯 تحدي الوحدة الأسبوعية</div>
      <div class="bonus-body">
        الأسبوع 1: وحدة 4 · الأسبوع 2: وحدة 5
        <div style="margin-top:10px">
          <div class="bonus-row"><span>50% يكملون</span><span class="bonus-xp" style="color:#22c55e">+150 XP</span></div>
          <div class="bonus-row"><span>70% يكملون</span><span class="bonus-xp" style="color:#22c55e">+400 XP</span></div>
          <div class="bonus-row"><span>90% يكملون</span><span class="bonus-xp" style="color:#22c55e">+800 XP</span></div>
          <div class="bonus-row"><span>100% يكملون</span><span class="bonus-xp" style="color:#22c55e">+1200 XP</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Rewards -->
  <div class="section-heading">🏆 ماذا يحدث لو فزتم؟</div>
  <div class="rewards-grid">
    <div class="reward-card">
      <span class="reward-icon">🏆</span>
      <div class="reward-name">بادج البطل</div>
      <div class="reward-desc">دائم على ملفك الشخصي</div>
    </div>
    <div class="reward-card">
      <span class="reward-icon">📤</span>
      <div class="reward-name">بطاقة نصر</div>
      <div class="reward-desc">قابلة للمشاركة على السوشال</div>
    </div>
    <div class="reward-card">
      <span class="reward-icon">⭐</span>
      <div class="reward-name">لقب MVP</div>
      <div class="reward-desc">لأعلى مساهم في الفريق</div>
    </div>
    <div class="reward-card">
      <span class="reward-icon">📜</span>
      <div class="reward-name">شهادة تقدير</div>
      <div class="reward-desc">للمشارك الفاعل</div>
    </div>
  </div>

  <!-- First steps -->
  <div class="section-heading">✅ خطواتك الأولى الآن:</div>
  <div class="steps">
    <div class="step">
      <div class="step-num">١</div>
      <div>افتح المنهج وأكمل درساً أو تمريناً واحداً على الأقل — كل XP يُحسب لفريقك فوراً</div>
    </div>
    <div class="step">
      <div class="step-num">٢</div>
      <div>أرسل تشجيعاً لزميل واحد من فريقك — تكسب +2 XP وتمنحه +3 XP (حتى 5 مرات يومياً)</div>
    </div>
    <div class="step">
      <div class="step-num">٣</div>
      <div>تأكد من الدخول للمنصة غداً — 80% دخول يومي يُبقي الستريك الجماعي حياً</div>
    </div>
    <div class="step">
      <div class="step-num">٤</div>
      <div>اطلع على صفحة المسابقة لمتابعة الترتيب والنقاط لحظة بلحظة</div>
    </div>
  </div>

  <!-- CTA -->
  <div class="cta">
    <a href="https://app.fluentia.academy/student/competition">⚔️ ادخل المسابقة الآن</a>
  </div>

  <!-- FAQ -->
  <div class="section-heading">❓ أسئلة شائعة</div>
  <div class="faq">
    <div class="faq-item">
      <div class="faq-q">هل يمكنني الانضمام لفريق مختلف؟</div>
      <div class="faq-a">لا — الفرق مُعيّنة تلقائياً حسب مجموعتك الدراسية. هذا يضمن التوازن والعدالة.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">ماذا لو فاتني يوم؟</div>
      <div class="faq-a">لا مشكلة! الستريك الجماعي يحتاج 80% من الفريق فقط — ليس 100%. لكن حضورك يُفرق كثيراً.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">هل المدرب يعطي نقاطاً؟</div>
      <div class="faq-a">نعم! المدرب يمكنه منح نقاط XP من خلال Quick Points للمشاركة والحضور وغيرها. كل نقطة تُحسب لفريقك.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">متى تُعلن النتائج؟</div>
      <div class="faq-a">مباشرة عند انتهاء التحدي في ${d.endDate} — ستصلك إشعارات وبريد إلكتروني بالنتائج.</div>
    </div>
    <div class="faq-item">
      <div class="faq-q">أين أرى مراكز الفريق والنقاط؟</div>
      <div class="faq-a">صفحة المسابقة داخل التطبيق تُحدَّث لحظة بلحظة — ترى نقاط النصر، ترتيب الفريق، وأبرز المساهمين.</div>
    </div>
  </div>

  <div class="footer">
    <p><strong>Fluentia Academy — أكاديمية طلاقة</strong></p>
    <p>التحدي ينتهي ${d.endDate} الساعة 11:59 مساءً بتوقيت الرياض</p>
    <p style="margin-top:6px">للاستفسار: <a href="https://wa.me/966558669974">واتساب الأكاديمية</a> · <a href="https://app.fluentia.academy/student/competition/rules">قواعد المسابقة الكاملة</a></p>
    <p style="margin-top:4px; color:#334155">هذا البريد مُرسل تلقائياً — لا ترد عليه.</p>
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
  <p>لوحة الأدمن متاحة عبر: <strong>/admin/competition</strong></p>
  <a class="btn" href="https://app.fluentia.academy/admin/competition">الدخول للوحة المسابقة →</a>

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
