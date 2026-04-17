export function renderWinnersEmail(data: {
  studentName: string
  teamName: string
  teamEmoji: string
  teamColor: string
  teamXP: number
  teamVP: number
  mvpName: string
  myRank: number
}) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>body{margin:0;padding:0;background:#0f172a;font-family:Tajawal,Arial,sans-serif;direction:rtl}
.wrap{max-width:600px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden}
.hero{background:linear-gradient(135deg,#0f172a,${data.teamColor}33);padding:48px 32px;text-align:center}
.trophy{font-size:64px;margin-bottom:16px}
h1{color:#fff;font-size:28px;margin:0 0 8px;font-weight:800}
.sub{color:${data.teamColor};font-size:16px;font-weight:700}
.body{padding:32px}
.stat-row{display:flex;justify-content:space-around;margin:24px 0;gap:16px}
.stat{text-align:center;background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;flex:1}
.stat-val{color:#f5c842;font-size:32px;font-weight:800}
.stat-label{color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px}
.mvp-badge{background:${data.teamColor}22;border:1px solid ${data.teamColor}44;border-radius:12px;padding:16px;text-align:center;margin:20px 0}
.cta{display:block;background:${data.teamColor};color:#0f172a;text-decoration:none;font-weight:800;font-size:16px;padding:16px 32px;border-radius:12px;text-align:center;margin:24px 0}
.footer{padding:24px 32px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;border-top:1px solid rgba(255,255,255,0.06)}
</style></head><body><div class="wrap">
<div class="hero">
  <div class="trophy">🏆</div>
  <h1>مبروك ${data.studentName}!</h1>
  <div class="sub">فريقك ${data.teamEmoji} ${data.teamName} فاز في تحدي طلاقة أبريل 2026</div>
</div>
<div class="body">
  <div class="stat-row">
    <div class="stat"><div class="stat-val">${data.teamVP}</div><div class="stat-label">نقاط النصر</div></div>
    <div class="stat"><div class="stat-val">${data.teamXP.toLocaleString('ar')}</div><div class="stat-label">إجمالي XP</div></div>
    <div class="stat"><div class="stat-val">#${data.myRank}</div><div class="stat-label">ترتيبي</div></div>
  </div>
  <div class="mvp-badge">
    <div style="font-size:24px">⭐</div>
    <div style="color:#f5c842;font-weight:700;margin-top:8px">MVP الفريق: ${data.mvpName}</div>
    <div style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:4px">أعلى مساهم في الفريق</div>
  </div>
  <a href="https://fluentia.academy/student/competition" class="cta">شاهد كامل النتائج</a>
</div>
<div class="footer">أكاديمية طلاقة · fluentia.academy</div>
</div></body></html>`
}

export function renderRunnersUpEmail(data: {
  studentName: string
  teamName: string
  teamEmoji: string
  teamColor: string
  teamXP: number
  teamVP: number
  winnerTeamName: string
  winnerTeamEmoji: string
}) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>body{margin:0;padding:0;background:#0f172a;font-family:Tajawal,Arial,sans-serif;direction:rtl}
.wrap{max-width:600px;margin:0 auto;background:#1e293b;border-radius:16px;overflow:hidden}
.hero{background:linear-gradient(135deg,#0f172a,rgba(100,116,139,0.3));padding:48px 32px;text-align:center}
h1{color:#fff;font-size:24px;margin:0 0 8px;font-weight:800}
.sub{color:${data.teamColor};font-size:15px}
.body{padding:32px}
.stat-row{display:flex;justify-content:space-around;margin:24px 0;gap:16px}
.stat{text-align:center;background:rgba(255,255,255,0.05);border-radius:12px;padding:16px;flex:1}
.stat-val{color:${data.teamColor};font-size:28px;font-weight:800}
.stat-label{color:rgba(255,255,255,0.5);font-size:12px;margin-top:4px}
.cta{display:block;background:rgba(56,189,248,0.15);border:1px solid rgba(56,189,248,0.3);color:#38bdf8;text-decoration:none;font-weight:800;font-size:15px;padding:14px 32px;border-radius:12px;text-align:center;margin:24px 0}
.footer{padding:24px 32px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px;border-top:1px solid rgba(255,255,255,0.06)}
</style></head><body><div class="wrap">
<div class="hero">
  <div style="font-size:48px">⚔️</div>
  <h1>انتهت المسابقة يا ${data.studentName}</h1>
  <div class="sub">فريقك ${data.teamEmoji} ${data.teamName} قدّم مجهوداً رائعاً</div>
</div>
<div class="body">
  <p style="color:rgba(255,255,255,0.7);line-height:1.8">فريق ${data.winnerTeamEmoji} ${data.winnerTeamName} فاز هذه الجولة — لكن جهود فريقك تُحتسب وتُشرّف. كل XP كسبتموه يعكس تقدمكم الحقيقي.</p>
  <div class="stat-row">
    <div class="stat"><div class="stat-val">${data.teamVP}</div><div class="stat-label">نقاط النصر</div></div>
    <div class="stat"><div class="stat-val">${data.teamXP.toLocaleString('ar')}</div><div class="stat-label">إجمالي XP</div></div>
  </div>
  <a href="https://fluentia.academy/student/competition" class="cta">شاهد النتائج الكاملة</a>
</div>
<div class="footer">أكاديمية طلاقة · fluentia.academy</div>
</div></body></html>`
}

export function renderMVPEmail(data: { studentName: string; teamName: string; teamEmoji: string; xp: number }) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<style>body{margin:0;padding:0;background:#0f172a;font-family:Tajawal,Arial,sans-serif;direction:rtl}
.wrap{max-width:600px;margin:0 auto;background:linear-gradient(135deg,#0f172a,rgba(245,200,66,0.08));border-radius:16px;overflow:hidden;border:1px solid rgba(245,200,66,0.2)}
.hero{padding:48px 32px;text-align:center}
h1{color:#f5c842;font-size:26px;margin:0 0 8px;font-weight:800}
.body{padding:32px;text-align:center}
.xp{font-size:48px;font-weight:900;color:#f5c842}
.footer{padding:24px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px}
</style></head><body><div class="wrap">
<div class="hero">
  <div style="font-size:48px">⭐</div>
  <h1>${data.studentName}، أنت MVP فريقك!</h1>
</div>
<div class="body">
  <p style="color:rgba(255,255,255,0.7)">كنت أعلى مساهم في فريق ${data.teamEmoji} ${data.teamName} طوال تحدي طلاقة أبريل 2026</p>
  <div class="xp">${data.xp.toLocaleString('ar')} XP</div>
  <p style="color:rgba(245,200,66,0.6);font-size:13px">مجموع XP أضفته للفريق</p>
</div>
<div class="footer">أكاديمية طلاقة · fluentia.academy</div>
</div></body></html>`
}

export function renderAdminSummaryEmail(data: {
  winnerTeam: string; winnerEmoji: string
  teamAName: string; teamAEmoji: string; teamAXP: number; teamAVP: number
  teamBName: string; teamBEmoji: string; teamBXP: number; teamBVP: number
  mvpAName: string; mvpBName: string
  totalStudents: number; emailsSent: number; pushSent: number
}) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:32px">
<h1 style="color:#38bdf8">🏆 Competition Victory Summary — تحدي طلاقة أبريل 2026</h1>
<table style="border-collapse:collapse;width:100%">
<tr><td style="padding:8px;border:1px solid #334155">Winner</td><td style="padding:8px;border:1px solid #334155">${data.winnerEmoji} ${data.winnerTeam}</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">${data.teamAEmoji} ${data.teamAName}</td><td style="padding:8px;border:1px solid #334155">${data.teamAXP} XP / ${data.teamAVP} VP</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">${data.teamBEmoji} ${data.teamBName}</td><td style="padding:8px;border:1px solid #334155">${data.teamBXP} XP / ${data.teamBVP} VP</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">MVP A</td><td style="padding:8px;border:1px solid #334155">${data.mvpAName}</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">MVP B</td><td style="padding:8px;border:1px solid #334155">${data.mvpBName}</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">Students notified</td><td style="padding:8px;border:1px solid #334155">${data.totalStudents}</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">Emails sent</td><td style="padding:8px;border:1px solid #334155">${data.emailsSent}</td></tr>
<tr><td style="padding:8px;border:1px solid #334155">Push sent</td><td style="padding:8px;border:1px solid #334155">${data.pushSent}</td></tr>
</table>
</body></html>`
}
