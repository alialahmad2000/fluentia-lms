// Academy digest — a detailed AI-powered DAILY (midnight) + WEEKLY (Sat night)
// email of everything that happened on the platform: per-student time spent,
// what they did, performance, highlights, an academy overview, and a smart
// "should I worry?" read. Sent to the admin via Resend.
//
// Auth: service-role (cron) OR admin JWT. Deploy with --no-verify-jwt.
// Body: { period?: 'daily'|'weekly', date?: 'YYYY-MM-DD', test_email?: string, send?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const RESEND_API = "https://api.resend.com/emails";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// ── Riyadh date helpers ────────────────────────────────────────────────────
function riyadhToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtMin(sec = 0): string {
  const m = Math.round((sec || 0) / 60);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h}س ${r}د` : `${h} س`;
}
const arDate = (ymd: string) =>
  new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${ymd}T12:00:00Z`));

const SKILL_AR: Record<string, string> = {
  reading: "القراءة", grammar: "القواعد", listening: "الاستماع", writing: "الكتابة",
  speaking: "المحادثة", vocabulary: "المفردات", vocabulary_exercise: "تمارين المفردات",
  pronunciation: "النطق", assessment: "التقييم",
  // Non-curriculum surfaces. They became visible to the rollup on 2026-08-11
  // (migration 20260811120000) — before that, a student could work only here and
  // the report still filed her under «لم ينشط».
  ielts_reading: "آيلتس — القراءة", ielts_listening: "آيلتس — الاستماع",
  ielts_writing: "آيلتس — الكتابة", ielts_speaking: "آيلتس — المحادثة",
  ielts_mock: "آيلتس — اختبار كامل", ielts_drill: "آيلتس — تدريب سريع",
  ielts_other: "آيلتس", library: "المكتبة", step: "ستيب", spelling_lab: "مختبر الإملاء",
  games: "الألعاب", retention: "واجبات التثبيت", unit_mastery: "اختبار الوحدة",
  everyday_english: "إنجليزية يومية",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let body: any = {};
    try { body = await req.json(); } catch { /* cron may send {} */ }

    const period: "daily" | "weekly" = body.period === "weekly" ? "weekly" : "daily";
    const endDate: string = body.date || (period === "weekly" ? riyadhToday() : addDays(riyadhToday(), -1));
    const startDate = period === "weekly" ? addDays(endDate, -6) : endDate;

    // Ensure the rollup exists for the day(s) in range (idempotent, cheap).
    for (let d = startDate; d <= endDate; d = addDays(d, 1)) {
      try { await supabase.rpc("refresh_daily_activity", { p_date: d }); } catch { /* best effort */ }
    }

    // ── Gather data ──────────────────────────────────────────────────────────
    const { data: students } = await supabase
      .from("students")
      .select("id, academic_level, group_id, status, access_expires_at, profiles(display_name, full_name, is_test_account), groups(name)")
      .eq("status", "active").is("deleted_at", null);
    // Exclude lapsed-subscription accounts (access_expires_at in the past = soft-blocked).
    // They are no longer enrolled, so they must NOT skew the denominator or the AI's read.
    const nowMs = Date.now();
    const isLapsed = (s: any) => s.access_expires_at && new Date(s.access_expires_at).getTime() <= nowMs;
    // Test rigs are not students. «حساب اختبار ستيب» was sitting in the denominator and
    // in the «لم ينشطوا» list every day, making 3/11 read as 3/12 and inflating the
    // inactive count by one — refresh_daily_activity() already skips them, the digest didn't.
    const isTest = (s: any) => s?.profiles?.is_test_account === true;
    const allActive = (students || []).filter((s: any) => !isTest(s));
    const testCount = (students || []).length - allActive.length;
    const lapsedCount = allActive.filter(isLapsed).length;
    const sList = allActive.filter((s: any) => !isLapsed(s));
    const ids = sList.map((s: any) => s.id);
    const nameOf = (s: any) => s?.profiles?.display_name || s?.profiles?.full_name || "طالب";

    const { data: activity } = await supabase
      .from("student_daily_activity")
      .select("student_id, activity_date, learning_seconds, sections_completed, words_mastered, xp_earned, avg_score, submissions_count, speaking_recordings, quizzes_taken, skill_breakdown")
      .gte("activity_date", startDate).lte("activity_date", endDate).in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const { data: interventions } = await supabase
      .from("student_interventions")
      .select("student_id, severity, reason_ar, created_at")
      .gte("created_at", `${startDate}T00:00:00+03:00`)
      .lte("created_at", `${endDate}T23:59:59+03:00`)
      .in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    // Aggregate per student
    const per: Record<string, any> = {};
    for (const s of sList) {
      per[s.id] = {
        id: s.id, name: nameOf(s), level: s.academic_level, group: s?.groups?.name || "",
        sec: 0, sections: 0, words: 0, xp: 0, subs: 0, speaking: 0, quizzes: 0,
        scoreSum: 0, scoreN: 0, daysActive: 0, skills: {} as Record<string, { sec: number; done: number; scoreSum: number; scoreN: number }>,
      };
    }
    for (const a of activity || []) {
      const p = per[a.student_id]; if (!p) continue;
      p.sec += a.learning_seconds || 0; p.sections += a.sections_completed || 0; p.words += a.words_mastered || 0;
      p.xp += a.xp_earned || 0; p.subs += a.submissions_count || 0; p.speaking += a.speaking_recordings || 0; p.quizzes += a.quizzes_taken || 0;
      if (a.avg_score != null) { p.scoreSum += Number(a.avg_score); p.scoreN += 1; }
      if ((a.learning_seconds || 0) > 0 || (a.sections_completed || 0) > 0) p.daysActive += 1;
      const sb = a.skill_breakdown || {};
      for (const [k, v] of Object.entries<any>(sb)) {
        if (!p.skills[k]) p.skills[k] = { sec: 0, done: 0, scoreSum: 0, scoreN: 0 };
        p.skills[k].sec += v?.time_seconds || 0; p.skills[k].done += v?.completed || 0;
        if (v?.avg_score != null) { p.skills[k].scoreSum += Number(v.avg_score); p.skills[k].scoreN += 1; }
      }
    }
    const rows = Object.values(per).map((p: any) => ({
      ...p, avgScore: p.scoreN ? Math.round(p.scoreSum / p.scoreN) : null,
      topSkill: Object.entries(p.skills).sort((a: any, b: any) => b[1].sec - a[1].sec)[0]?.[0] || null,
    }));
    rows.sort((a: any, b: any) => b.xp - a.xp || b.sec - a.sec);

    const active = rows.filter((r: any) => r.sec > 0 || r.sections > 0);
    const inactive = rows.filter((r: any) => r.sec === 0 && r.sections === 0);
    const academy = {
      totalStudents: rows.length,
      activeCount: active.length,
      totalMinutes: Math.round(rows.reduce((s: number, r: any) => s + r.sec, 0) / 60),
      totalSections: rows.reduce((s: number, r: any) => s + r.sections, 0),
      totalWords: rows.reduce((s: number, r: any) => s + r.words, 0),
      totalXp: rows.reduce((s: number, r: any) => s + r.xp, 0),
      totalSubs: rows.reduce((s: number, r: any) => s + r.subs, 0),
      // «تسليم» was a dead tile: public.submissions has never held a single row, so it
      // printed 0 every day and read as "nobody handed anything in". Replaced on the
      // report by speaking recordings — real, AI-graded student output.
      totalSpeaking: rows.reduce((s: number, r: any) => s + r.speaking, 0),
      avgScore: (() => { const sc = active.filter((r: any) => r.avgScore != null); return sc.length ? Math.round(sc.reduce((s: number, r: any) => s + r.avgScore, 0) / sc.length) : null; })(),
    };
    // Academy-wide skill breakdown
    const skillTotals: Record<string, number> = {};
    for (const r of rows) for (const [k, v] of Object.entries<any>(r.skills)) skillTotals[k] = (skillTotals[k] || 0) + v.sec;

    const intv = { urgent: 0, attention: 0, celebrate: 0, list: [] as any[] };
    for (const i of interventions || []) {
      if (i.severity === "urgent") intv.urgent++; else if (i.severity === "attention") intv.attention++; else if (i.severity === "celebrate") intv.celebrate++;
      const nm = per[i.student_id]?.name || "طالب";
      if (i.severity !== "celebrate" && intv.list.length < 12) intv.list.push({ name: nm, reason: i.reason_ar });
    }

    // ── Baseline: what a NORMAL day looks like ────────────────────────────────
    // Without this the report has no sense of scale, so every day reads as a crisis.
    // On 10 Aug the academy had 3 active students and 48 minutes — roughly TWICE the
    // 30-day average — and the AI narrative called it «حضوراً ضعيفاً جداً… مقلق».
    // A report that cries wolf on an above-average day stops being read.
    let baseline: any = null;
    try {
      const bStart = addDays(startDate, -30);
      const { data: hist } = await supabase
        .from("student_daily_activity")
        .select("student_id, activity_date, learning_seconds, sections_completed")
        .gte("activity_date", bStart).lt("activity_date", startDate)
        .in("student_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
      const byDay: Record<string, { act: Set<string>; sec: number }> = {};
      for (const h of hist || []) {
        const worked = (h.learning_seconds || 0) > 0 || (h.sections_completed || 0) > 0;
        if (!worked) continue;
        (byDay[h.activity_date] ??= { act: new Set(), sec: 0 });
        byDay[h.activity_date].act.add(h.student_id);
        byDay[h.activity_date].sec += h.learning_seconds || 0;
      }
      // Divide by CALENDAR days, not by days that happened to have rows — otherwise
      // the zero days silently vanish and the average flatters itself.
      const span = (d: number) => {
        const from = addDays(startDate, -d);
        let act = 0, sec = 0;
        for (const [day, v] of Object.entries(byDay)) {
          if (day >= from && day < startDate) { act += v.act.size; sec += v.sec; }
        }
        return { avgActive: act / d, avgMin: sec / 60 / d };
      };
      const d7 = span(7), d30 = span(30);
      const todayActive = academy.activeCount, todayMin = academy.totalMinutes;
      const cmp = (now: number, base: number) =>
        base <= 0 ? (now > 0 ? 999 : 0) : Math.round(((now - base) / base) * 100);
      baseline = {
        avgActive7: Math.round(d7.avgActive * 10) / 10, avgMin7: Math.round(d7.avgMin),
        avgActive30: Math.round(d30.avgActive * 10) / 10, avgMin30: Math.round(d30.avgMin),
        activeDelta30: cmp(todayActive, d30.avgActive), minDelta30: cmp(todayMin, d30.avgMin),
        verdict: (() => {
          const dv = cmp(todayActive, d30.avgActive);
          if (dv >= 50) return "above";      // clearly a good day — say so
          if (dv <= -50) return "below";     // a genuine drop worth flagging
          return "normal";
        })(),
      };
    } catch { /* baseline is best-effort — never block the digest */ }

    // ── Platform health: client errors during the period (capture exists since
    // migration 20260525010000 but nothing ever pushed them to the admin) ──────
    let errHealth: any = null;
    try {
      const { data: errRows } = await supabase
        .from("client_error_log")
        .select("message, error_kind, user_id, app_version, created_at")
        .gte("created_at", `${startDate}T00:00:00+03:00`)
        .lte("created_at", `${endDate}T23:59:59+03:00`)
        .order("created_at", { ascending: false })
        .limit(1000);
      const list = errRows || [];
      const sig: Record<string, { count: number; kind: string; users: Set<string> }> = {};
      for (const e of list) {
        const k = (e.message || "—").slice(0, 100);
        if (!sig[k]) sig[k] = { count: 0, kind: e.error_kind, users: new Set() };
        sig[k].count++;
        if (e.user_id) sig[k].users.add(e.user_id);
      }
      errHealth = {
        total: list.length,
        users: new Set(list.filter((e) => e.user_id).map((e) => e.user_id)).size,
        top: Object.entries(sig).sort((a, b) => b[1].count - a[1].count).slice(0, 5)
          .map(([msg, v]) => ({ msg, count: v.count, kind: v.kind, users: v.users.size })),
      };
    } catch { /* health section is best-effort — never block the digest */ }

    // ── Stranded work: sections a student FINISHED that progress cannot count ──
    // Two classes, both from v_stranded_student_work: fully-answered-but-never-
    // submitted, and duplicate rows from an autosave race. Four active students
    // were sitting in the first state undetected for weeks (audit 2026-08-11);
    // nothing surfaced it until a student complained. Now it is on this email.
    let stranded: any = null;
    try {
      const { data: sRows } = await supabase
        .from("v_stranded_student_work")
        .select("full_name, section_type, answered, total, issue");
      const list = sRows || [];
      stranded = {
        total: list.length,
        unsubmitted: list.filter((r: any) => r.issue === "FINISHED_NOT_SUBMITTED"),
        contentGrew: list.filter((r: any) => r.issue === "CONTENT_GREW_AFTER_ATTEMPT"),
        duplicates: list.filter((r: any) => r.issue === "DUPLICATE_ROWS"),
      };
    } catch { /* best-effort — never block the digest */ }

    const data = { period, startDate, endDate, academy, rows, active, inactive, skillTotals, intv, lapsed: lapsedCount, tests: testCount, errHealth, baseline, stranded };

    // ── AI feedback (one Claude call, with template fallback) ───────────────
    let ai = null, aiErr: string | null = null;
    try { ai = await aiFeedback(data); } catch (e) { aiErr = (e as Error).message; }

    // ── Compose + send email ────────────────────────────────────────────────
    const html = renderEmail(data, ai);
    const subject = period === "weekly"
      ? `📊 تقرير طلاقة الأسبوعي — ${arDate(startDate)} ← ${arDate(endDate)}`
      : `📊 تقرير طلاقة اليومي — ${arDate(endDate)}`;

    const recipients: string[] = body.test_email
      ? [body.test_email]
      : (body.recipients || (Deno.env.get("ADMIN_DIGEST_RECIPIENTS")?.split(",").map((x) => x.trim())) || ["alialahmad2000@gmail.com", "admin@fluentia.academy"]);

    let sent = false, resendId = null, sendErr = null;
    if (body.send !== false) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const FROM = Deno.env.get("RESEND_FROM_EMAIL") ?? Deno.env.get("RESEND_FROM_ADDRESS") ?? "Fluentia Academy <noreply@fluentia.academy>";
      if (!resendKey) { sendErr = "RESEND_API_KEY missing"; }
      else {
        const resp = await fetch(RESEND_API, {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: FROM, to: recipients, subject, html }),
        });
        const jr = await resp.json().catch(() => ({}));
        if (resp.ok) { sent = true; resendId = jr?.id || null; } else { sendErr = JSON.stringify(jr).slice(0, 300); }
      }
    }

    // Log the run (best effort)
    try {
      await supabase.from("digest_runs").insert({
        period, period_start: startDate, period_end: endDate, recipients,
        sent, resend_id: resendId, ai_used: !!ai, error: sendErr,
        stats: { active: academy.activeCount, minutes: academy.totalMinutes, sections: academy.totalSections, xp: academy.totalXp },
      });
    } catch { /* table optional */ }

    return J({ ok: true, period, startDate, endDate, recipients, sent, resendId, ai_used: !!ai, ai_error: aiErr, error: sendErr,
      summary: { active: academy.activeCount, of: academy.totalStudents, minutes: academy.totalMinutes } });
  } catch (e) {
    return J({ ok: false, error: (e as Error).message }, 500);
  }
});

// ── AI feedback ──────────────────────────────────────────────────────────────
async function aiFeedback(d: any) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
  if (!apiKey) throw new Error("no_api_key");
  const lines = d.rows.map((r: any) =>
    `${r.name} (مستوى ${r.level ?? "—"}): ${fmtMin(r.sec)}، ${r.sections} نشاط، ${r.daysActive} يوم نشط، ${r.avgScore != null ? r.avgScore + "%" : "—"}، ${r.xp}xp${r.topSkill ? "، أكثر نشاط: " + (SKILL_AR[r.topSkill] || r.topSkill) : ""}`
  ).join("\n");
  const periodWord = d.period === "weekly" ? "هذا الأسبوع" : "هذا اليوم";
  const B = d.baseline;
  const baselineBlock = !B ? "" : `
المعدّل الطبيعي للأكاديمية (آخر ٣٠ يوماً): ${B.avgActive30} طالب نشِط و${B.avgMin30} دقيقة في اليوم. آخر ٧ أيام: ${B.avgActive7} طالب و${B.avgMin7} دقيقة.
اليوم مقارنةً بالمعدّل: عدد النشطين ${B.activeDelta30 >= 0 ? "+" : ""}${B.activeDelta30}%، دقائق التعلّم ${B.minDelta30 >= 0 ? "+" : ""}${B.minDelta30}%.
تصنيف اليوم: ${B.verdict === "above" ? "أعلى من المعتاد" : B.verdict === "below" ? "أقل من المعتاد" : "ضمن المعتاد"}.`;
  const prompt = `أنت محلل أداء تعليمي خبير في أكاديمية طلاقة لتعليم الإنجليزية. حلّل بيانات ${periodWord} (${d.startDate} إلى ${d.endDate}) وأعطِ المدير تقريراً ذكياً.

ملخص الأكاديمية: ${d.academy.activeCount} من ${d.academy.totalStudents} طالباً نشطوا، إجمالي ${d.academy.totalMinutes} دقيقة تعلّم، ${d.academy.totalSections} نشاط مكتمل، ${d.academy.totalWords} كلمة، ${d.academy.totalSpeaking} تسجيل صوتي، متوسط الدرجات ${d.academy.avgScore ?? "—"}%. طلاب غير نشطين: ${d.inactive.length}. إشارات تحذير: ${d.intv.urgent} عاجلة، ${d.intv.attention} متابعة.
${baselineBlock}

تفاصيل الطلاب:
${lines}

أعد JSON فقط بهذا الشكل (عربي، مبني على الأرقام الحقيقية، عملي ومحدد):
{
  "overall_ar": "فقرتان تلخصان حال الأكاديمية ${periodWord} — الإيجابيات والمخاوف بلغة واضحة للمدير",
  "worry": [{"name":"اسم الطالب","reason_ar":"سبب القلق من الأرقام","action_ar":"إجراء محدد"}],
  "highlights": [{"name":"اسم الطالب","note_ar":"إنجاز مميز اليوم"}],
  "recommendations_ar": ["توصية عملية 1","توصية 2","توصية 3"]
}
قواعد صارمة:
- worry فقط للطلاب الذين تقلق أرقامهم فعلاً (غياب طويل، تراجع واضح، درجات متدنية). highlights للأفضل أداءً. لا تختلق أرقاماً.
- **احكم على اليوم مقارنةً بالمعدّل الطبيعي أعلاه، لا بمقياس مثالي.** إذا كان اليوم «أعلى من المعتاد» أو «ضمن المعتاد» فلا تصفه بأنه ضعيف أو مقلق — قل بوضوح إنه يوم طبيعي أو أفضل من المعتاد. لا تُطلق إنذاراً إلا حين يكون اليوم «أقل من المعتاد» فعلاً.
- إذا كان المستوى الطبيعي نفسه منخفضاً، فالمشكلة في المعدّل العام وليست في هذا اليوم — قلها هكذا صراحةً في overall_ar، ووجّه التوصيات إلى رفع المعدّل لا إلى إنقاذ يوم واحد.
- «غير نشِط» تعني لا نشاط في أيٍّ من سطوح المنصة (المنهج، آيلتس، ستيب، المكتبة، المختبرات) — لا تفترض غياباً لمجرد أن الطالب لم يفتح المنهج.
قدّم تحليلك باستدعاء الأداة report.`;

  // Tool use → the API returns structured input (guaranteed valid JSON; no text parsing).
  const tools = [{
    name: "report",
    description: "تقرير أداء الأكاديمية بالعربية",
    input_schema: {
      type: "object",
      properties: {
        overall_ar: { type: "string", description: "فقرتان عن حال الأكاديمية" },
        worry: { type: "array", items: { type: "object", properties: { name: { type: "string" }, reason_ar: { type: "string" }, action_ar: { type: "string" } }, required: ["name", "reason_ar", "action_ar"] } },
        highlights: { type: "array", items: { type: "object", properties: { name: { type: "string" }, note_ar: { type: "string" } }, required: ["name", "note_ar"] } },
        recommendations_ar: { type: "array", items: { type: "string" } },
      },
      required: ["overall_ar", "worry", "highlights", "recommendations_ar"],
    },
  }];
  const resp = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 1600, tools, tool_choice: { type: "tool", name: "report" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) throw new Error("anthropic_" + resp.status + ": " + (await resp.text()).slice(0, 250));
  const jr = await resp.json();
  const tu = (jr?.content || []).find((c: any) => c.type === "tool_use");
  if (!tu?.input) throw new Error("no_tool_use: " + JSON.stringify(jr).slice(0, 200));
  return tu.input;
}

// ── Email HTML (RTL, email-safe inline styles) ───────────────────────────────
function renderEmail(d: any, ai: any) {
  const A = d.academy;
  const periodLabel = d.period === "weekly" ? "التقرير الأسبوعي" : "التقرير اليومي";
  const dateLabel = d.period === "weekly" ? `${arDate(d.startDate)} — ${arDate(d.endDate)}` : arDate(d.endDate);
  const C = { ink: "#0f172a", sub: "#475569", line: "#e2e8f0", sky: "#0284c7", gold: "#b45309", rose: "#be123c", green: "#15803d", bg: "#f8fafc", card: "#ffffff" };

  const stat = (val: string | number, label: string, color = C.ink) =>
    `<td style="padding:10px 8px;text-align:center;border:1px solid ${C.line};border-radius:12px;background:${C.card}">
       <div style="font-size:22px;font-weight:800;color:${color};font-family:Tajawal,Arial,sans-serif">${val}</div>
       <div style="font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">${label}</div></td>`;

  const studentRows = d.rows.map((r: any) => {
    const statusColor = r.sec === 0 && r.sections === 0 ? C.rose : (r.sec >= 1200 ? C.green : C.gold);
    const statusTxt = r.sec === 0 && r.sections === 0 ? "لم ينشط" : (r.sec >= 1200 ? "نشِط جداً" : "نشِط");
    const skillsTxt = Object.entries(r.skills).sort((a: any, b: any) => b[1].sec - a[1].sec).slice(0, 3)
      .map(([k, v]: any) => `${SKILL_AR[k] || k} (${fmtMin(v.sec)})`).join("، ") || "—";
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid ${C.line};font-family:Tajawal,Arial,sans-serif;font-size:13px;color:${C.ink};font-weight:700">${r.name}<div style="font-size:11px;color:${C.sub};font-weight:400">مستوى ${r.level ?? "—"}${r.group ? " · " + r.group : ""}</div></td>
      <td style="padding:8px;border-bottom:1px solid ${C.line};text-align:center;font-family:Tajawal,Arial,sans-serif;font-size:13px;color:${C.ink}">${fmtMin(r.sec)}</td>
      <td style="padding:8px;border-bottom:1px solid ${C.line};text-align:center;font-family:Tajawal,Arial,sans-serif;font-size:13px;color:${C.ink}">${r.sections}</td>
      <td style="padding:8px;border-bottom:1px solid ${C.line};text-align:center;font-family:Tajawal,Arial,sans-serif;font-size:13px;color:${C.ink}">${r.avgScore != null ? r.avgScore + "%" : "—"}</td>
      <td style="padding:8px;border-bottom:1px solid ${C.line};text-align:center;font-family:Tajawal,Arial,sans-serif;font-size:13px;color:${C.ink}">${r.xp}</td>
      <td style="padding:8px;border-bottom:1px solid ${C.line};font-family:Tajawal,Arial,sans-serif;font-size:11px;color:${C.sub}">${skillsTxt}</td>
      <td style="padding:8px;border-bottom:1px solid ${C.line};text-align:center;font-family:Tajawal,Arial,sans-serif;font-size:11px;font-weight:700;color:${statusColor}">${statusTxt}</td>
    </tr>`;
  }).join("");

  const aiBlock = ai ? `
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;margin:18px 0">
      <div style="font-size:13px;font-weight:800;color:${C.sky};font-family:Tajawal,Arial,sans-serif;margin-bottom:6px">🧠 تحليل الذكاء الاصطناعي</div>
      <div style="font-size:13.5px;color:${C.ink};font-family:Tajawal,Arial,sans-serif;line-height:1.9;white-space:pre-line">${ai.overall_ar || ""}</div>
    </div>
    ${Array.isArray(ai.worry) && ai.worry.length ? `
    <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:14px;padding:16px;margin:14px 0">
      <div style="font-size:13px;font-weight:800;color:${C.rose};font-family:Tajawal,Arial,sans-serif;margin-bottom:8px">⚠️ طلاب يستحقون انتباهك</div>
      ${ai.worry.map((w: any) => `<div style="margin-bottom:8px;font-family:Tajawal,Arial,sans-serif"><span style="font-weight:700;color:${C.ink};font-size:13px">${w.name}</span><span style="color:${C.sub};font-size:12.5px"> — ${w.reason_ar}</span><div style="font-size:12px;color:${C.rose}">↩ ${w.action_ar}</div></div>`).join("")}
    </div>` : ""}
    ${Array.isArray(ai.highlights) && ai.highlights.length ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:16px;margin:14px 0">
      <div style="font-size:13px;font-weight:800;color:${C.green};font-family:Tajawal,Arial,sans-serif;margin-bottom:8px">🌟 أبرز الإنجازات</div>
      ${ai.highlights.map((h: any) => `<div style="font-family:Tajawal,Arial,sans-serif;font-size:13px;margin-bottom:4px"><span style="font-weight:700;color:${C.ink}">${h.name}</span><span style="color:${C.sub}"> — ${h.note_ar}</span></div>`).join("")}
    </div>` : ""}
    ${Array.isArray(ai.recommendations_ar) && ai.recommendations_ar.length ? `
    <div style="margin:14px 0">
      <div style="font-size:13px;font-weight:800;color:${C.gold};font-family:Tajawal,Arial,sans-serif;margin-bottom:6px">✅ توصيات</div>
      <ul style="margin:0;padding-inline-start:20px;color:${C.ink};font-family:Tajawal,Arial,sans-serif;font-size:13px;line-height:1.9">${ai.recommendations_ar.map((r: string) => `<li>${r}</li>`).join("")}</ul>
    </div>` : ""}
  ` : `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px;margin:14px 0;font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.gold}">تعذّر توليد التحليل الذكي هذه المرة — الأرقام أدناه كاملة.</div>`;

  // Baseline strip — gives the numbers above a sense of scale so a good day reads
  // as a good day. Sits directly under the stat tiles, before the AI narrative.
  const B = d.baseline;
  const arrow = (n: number) => (n > 0 ? "▲" : n < 0 ? "▼" : "■");
  const deltaTxt = (n: number) => `${arrow(n)} ${n > 0 ? "+" : ""}${n}%`;
  const baselineBlock = !B ? "" : (() => {
    const tone = B.verdict === "above" ? C.green : B.verdict === "below" ? C.rose : C.sub;
    const label = B.verdict === "above" ? "يوم أفضل من المعتاد"
      : B.verdict === "below" ? "يوم أقل من المعتاد" : "يوم ضمن المعتاد";
    const bg = B.verdict === "above" ? "#f0fdf4" : B.verdict === "below" ? "#fff1f2" : C.bg;
    const bd = B.verdict === "above" ? "#bbf7d0" : B.verdict === "below" ? "#fecdd3" : C.line;
    return `<div style="background:${bg};border:1px solid ${bd};border-radius:14px;padding:12px 14px;margin:14px 0">
      <div style="font-family:Tajawal,Arial,sans-serif;font-size:13px;font-weight:800;color:${tone};margin-bottom:4px">📈 ${label}</div>
      <div style="font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.sub};line-height:1.8">
        المعدّل الطبيعي (٣٠ يوماً): <b style="color:${C.ink}">${B.avgActive30}</b> طالب نشِط و<b style="color:${C.ink}">${B.avgMin30}</b> دقيقة يومياً · آخر ٧ أيام: <b style="color:${C.ink}">${B.avgActive7}</b> طالب و<b style="color:${C.ink}">${B.avgMin7}</b> دقيقة<br/>
        اليوم: النشطون <b style="color:${tone}">${deltaTxt(B.activeDelta30)}</b> · دقائق التعلّم <b style="color:${tone}">${deltaTxt(B.minDelta30)}</b> مقارنةً بالمعدّل
      </div></div>`;
  })();

  const skillBreakdown = Object.entries(d.skillTotals).sort((a: any, b: any) => b[1] - a[1])
    .map(([k, v]: any) => `<span style="display:inline-block;background:${C.bg};border:1px solid ${C.line};border-radius:999px;padding:4px 10px;margin:3px;font-family:Tajawal,Arial,sans-serif;font-size:12px;color:${C.ink}">${SKILL_AR[k] || k}: <b>${fmtMin(v)}</b></span>`).join("");


  // Work a student finished that the engine cannot count — the failure mode that
  // made students say "I did it and it doesn't show". Silent when clean.
  const S = d.stranded;
  const SEC_AR: Record<string, string> = { reading: "القراءة", listening: "الاستماع", grammar: "القواعد" };
  const strandedBlock = !S ? "" : S.total === 0 ? `
    <div style="margin:16px 0;font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.green}">📥 لا يوجد عمل مكتمل غير محتسب ✓</div>` : `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:16px;margin:16px 0">
      <div style="font-size:13px;font-weight:800;color:#92400e;font-family:Tajawal,Arial,sans-serif;margin-bottom:8px">
        📥 عمل مكتمل لم يُحتسب: ${S.total} ${S.total === 1 ? "حالة" : "حالات"}
      </div>
      ${S.unsubmitted.map((r: any) => `<div style="font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.ink};margin-bottom:4px">• <b>${r.full_name}</b> — ${SEC_AR[r.section_type] || r.section_type}: أجابت ${r.answered}/${r.total} ولم تُسلّم بعد</div>`).join("")}
      ${S.contentGrew.map((r: any) => `<div style="font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.ink};margin-bottom:4px">• <b>${r.full_name}</b> — ${SEC_AR[r.section_type] || r.section_type}: أجابت على كل الأسئلة الموجودة وقتها، ثم أُضيفت أسئلة جديدة (${r.answered}/${r.total}) — لا تستطيع التسليم دون إعادة</div>`).join("")}
      ${S.duplicates.map((r: any) => `<div style="font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.rose};margin-bottom:4px">• <b>${r.full_name}</b> — ${SEC_AR[r.section_type] || r.section_type}: صفوف مكرّرة (تكرار حفظ)</div>`).join("")}
      <div style="font-family:Tajawal,Arial,sans-serif;font-size:11.5px;color:${C.sub};margin-top:8px">«لم تُسلّم» = تذكيرها بالضغط على «تسليم الإجابات» يحتسب القسم فوراً. «أُضيفت أسئلة» = المحتوى تغيّر بعد محاولتها.</div>
    </div>`;

  // Platform health — only shouts when something is actually wrong.
  const H = d.errHealth;
  const healthBlock = !H ? "" : H.total === 0 ? `
    <div style="margin:16px 0;font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.green}">🩺 صحة المنصة: لا أخطاء تقنية ${d.period === "weekly" ? "هذا الأسبوع" : "اليوم"} ✓</div>` : `
    <div style="background:${H.total >= 30 ? "#fff1f2" : C.bg};border:1px solid ${H.total >= 30 ? "#fecdd3" : C.line};border-radius:14px;padding:16px;margin:16px 0">
      <div style="font-size:13px;font-weight:800;color:${H.total >= 30 ? C.rose : C.ink};font-family:Tajawal,Arial,sans-serif;margin-bottom:6px">
        🩺 صحة المنصة: ${H.total} خطأ تقني عند ${H.users} ${H.users === 1 ? "طالب" : "طلاب"} — التفاصيل في «تشخيص النظام»
      </div>
      ${H.top.map((t: any) => `<div style="font-family:Tajawal,Arial,sans-serif;font-size:12px;color:${C.sub};margin-bottom:3px;direction:ltr;text-align:left"><b style="color:${C.ink}">${t.count}×</b> ${t.msg.replace(/</g, "&lt;").slice(0, 90)}</div>`).join("")}
    </div>`;

  const inactiveBlock = d.inactive.length ? `
    <div style="margin:16px 0">
      <div style="font-size:13px;font-weight:800;color:${C.rose};font-family:Tajawal,Arial,sans-serif;margin-bottom:6px">😴 لم ينشطوا (${d.inactive.length})</div>
      <div style="font-family:Tajawal,Arial,sans-serif;font-size:12.5px;color:${C.sub}">${d.inactive.map((r: any) => r.name).join(" · ")}</div>
    </div>` : "";

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet"></head>
  <body style="margin:0;background:${C.bg};padding:18px 0;font-family:Tajawal,Arial,sans-serif">
    <div style="max-width:680px;margin:0 auto;background:${C.card};border:1px solid ${C.line};border-radius:18px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#0a1225,#1a2d50);padding:22px;text-align:center">
        <img src="https://fluentia-lms.vercel.app/logo-full-light.png" alt="أكاديمية طلاقة" width="180" style="width:180px;max-width:70%;height:auto;display:block;margin:0 auto 8px" />
        <div style="font-size:14px;color:#cbd5e1;margin-top:2px;font-family:Tajawal,Arial,sans-serif">${periodLabel} · ${dateLabel}</div>
      </div>
      <div style="padding:20px 22px">
        <table width="100%" cellspacing="6" cellpadding="0" style="border-collapse:separate"><tr>
          ${stat(`${A.activeCount}/${A.totalStudents}`, "طالب نشِط", C.sky)}
          ${stat(`${A.totalMinutes} د`, "إجمالي التعلّم", C.ink)}
          ${stat(A.totalSections, "نشاط مكتمل", C.green)}
          ${stat(A.avgScore != null ? A.avgScore + "%" : "—", "متوسط الدرجات", C.gold)}
        </tr><tr>
          ${stat(A.totalWords, "كلمة أُتقنت", C.ink)}
          ${stat(A.totalSpeaking, "تسجيل صوتي", C.ink)}
          ${stat(A.totalXp.toLocaleString("en"), "نقطة", C.gold)}
          ${stat(d.intv.urgent + d.intv.attention, "إشارة متابعة", d.intv.urgent ? C.rose : C.sub)}
        </tr></table>

        ${baselineBlock}

        ${aiBlock}

        <div style="font-size:14px;font-weight:800;color:${C.ink};margin:18px 0 8px">📚 ماذا فعل الطلاب (حسب المهارة)</div>
        <div>${skillBreakdown || "<span style='color:" + C.sub + ";font-size:13px'>لا يوجد نشاط</span>"}</div>

        <div style="font-size:14px;font-weight:800;color:${C.ink};margin:20px 0 8px">👤 تفصيل كل طالب</div>
        <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid ${C.line};border-radius:10px;overflow:hidden">
          <tr style="background:${C.bg}">
            <th style="padding:8px;text-align:start;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">الطالب</th>
            <th style="padding:8px;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">الوقت</th>
            <th style="padding:8px;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">أنشطة</th>
            <th style="padding:8px;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">الدرجة</th>
            <th style="padding:8px;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">نقاط</th>
            <th style="padding:8px;text-align:start;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">أبرز ما فعل</th>
            <th style="padding:8px;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">الحالة</th>
          </tr>
          ${studentRows}
        </table>

        ${inactiveBlock}

        ${healthBlock}
        ${strandedBlock}

        <div style="margin-top:22px;padding-top:14px;border-top:1px solid ${C.line};text-align:center;font-size:11px;color:${C.sub};font-family:Tajawal,Arial,sans-serif">
          تقرير تلقائي من منصة طلاقة · ${d.period === "weekly" ? "أسبوعي (نهاية السبت)" : "يومي (منتصف الليل)"}
          ${d.lapsed ? `<div style="margin-top:4px">التقرير يشمل الطلاب المشتركين فقط — تم استبعاد ${d.lapsed} حساباً منتهي الاشتراك</div>` : ""}
          ${d.tests ? `<div style="margin-top:4px">تم استبعاد ${d.tests} حساباً تجريبياً من العدّ</div>` : ""}
        </div>
      </div>
    </div>
  </body></html>`;
}
