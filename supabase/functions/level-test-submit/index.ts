// ============================================================================
// level-test-submit — public endpoint for the marketing-site level test.
//
//   POST { action: "start",  name, age, gender, ... }        → { id }
//   POST { action: "finish", attempt_id, ...full result }    → { ok, id }
//
// Public on purpose (no JWT — the taker is an anonymous visitor), so the table
// itself grants nothing to anon: every write here goes through the service role
// after validation. Deployed with verify_jwt=false.
//
// NOTE: deployed as a SINGLE file by scripts/_deploy-fn.cjs — do not add
// imports from ../_shared, they will not be uploaded.
// ============================================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM =
  Deno.env.get("RESEND_FROM_ADDRESS") ||
  Deno.env.get("RESEND_FROM_EMAIL") ||
  "Fluentia Academy <noreply@fluentia.academy>";
const ADMIN_EMAIL = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "alialahmad2000@gmail.com";

async function sendResend(opts: { to: string; subject: string; html: string }) {
  if (!RESEND_KEY) {
    console.log("[level-test-submit] RESEND_API_KEY not set — skipping email");
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${data?.message ?? "unknown"}`);
  return { id: data?.id };
}

/* ─── Validation helpers ──────────────────────────────────────────────── */

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
};

const int = (v: unknown, lo: number, hi: number): number | null => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r >= lo && r <= hi ? r : null;
};

/** Saudi mobile, stored as 05XXXXXXXX. */
function normPhone(v: unknown): string | null {
  const d = String(v ?? "").replace(/[^\d]/g, "");
  if (/^05\d{8}$/.test(d)) return d;
  if (/^9665\d{8}$/.test(d)) return `0${d.slice(3)}`;
  if (/^5\d{8}$/.test(d)) return `0${d}`;
  return null;
}

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const GENDER_AR: Record<string, string> = { male: "ذكر", female: "أنثى" };
const GOAL_AR: Record<string, string> = {
  work: "شغله", study: "دراسته", ielts: "آيلتس", travel: "السفر", confidence: "ثقته بنفسه",
};
const CONF_AR: Record<string, string> = { high: "عالية", medium: "متوسطة", low: "مبدئية" };

/* ─── Admin email ─────────────────────────────────────────────────────── */

function adminEmail(r: Record<string, unknown>) {
  const skills = Array.isArray(r.skills) ? (r.skills as Array<Record<string, unknown>>) : [];
  const skillRows = skills
    .map((s) => {
      const mark = s.verdict === "strong" ? "▲" : s.verdict === "weak" ? "▼" : "•";
      const colour = s.verdict === "strong" ? "#4ade80" : s.verdict === "weak" ? "#fbbf24" : "#94a3b8";
      return `<tr>
        <td style="padding:6px 0;color:${colour};width:22px">${mark}</td>
        <td style="padding:6px 0;color:#cbd5e1">${esc(s.ar)}</td>
        <td style="padding:6px 0;color:#f1f5f9;text-align:left;font-weight:700">${esc(s.pct)}% <span style="color:#64748b;font-weight:400">(${esc(s.correct)}/${esc(s.total)})</span></td>
      </tr>`;
    })
    .join("");

  const borderline = r.alt_level
    ? `<p style="margin:8px 0 0;color:#fbbf24;font-size:14px">على الحدود مع ${esc(r.alt_level)} (${esc(r.alt_prob)}%) — يحتاج تأكيد بشري.</p>`
    : "";

  const writing = r.writing
    ? `<div style="margin-top:22px">
         <h3 style="color:#f1f5f9;font-size:15px;margin:0 0 8px">عينة الكتابة</h3>
         <div style="background:rgba(255,255,255,0.04);border-right:3px solid #38bdf8;border-radius:10px;padding:14px;direction:ltr;text-align:left;color:#e2e8f0;font-size:14px;line-height:1.8;white-space:pre-wrap">${esc(r.writing)}</div>
       </div>`
    : `<p style="margin-top:20px;color:#64748b;font-size:13px">لم يكتب عينة كتابة.</p>`;

  const flags = (r.writing_signals as Record<string, unknown>) || null;
  const flagLine = flags
    ? `<p style="color:#64748b;font-size:12px;margin-top:8px">${esc(flags.words)} كلمة · ${esc(flags.sentences)} جمل · متوسط الجملة ${esc(flags.avgSentence)} · روابط ${esc(flags.linkers)}${
        Array.isArray(flags.flags) && flags.flags.length ? ` · ملاحظات: ${esc((flags.flags as string[]).join("، "))}` : ""
      }</p>`
    : "";

  const integrity = Number(r.left_page) > 2
    ? `<p style="color:#fbbf24;font-size:12px;margin-top:14px">⚠ غادر الصفحة ${esc(r.left_page)} مرات أثناء الاختبار.</p>`
    : "";

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><body style="margin:0;background:#060e1c;font-family:'Tajawal',Segoe UI,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:28px 22px;color:#cbd5e1">
    <p style="color:#38bdf8;font-size:12px;letter-spacing:.12em;margin:0 0 4px">اختبار تحديد المستوى — نتيجة جديدة</p>
    <h1 style="color:#f1f5f9;font-size:23px;margin:0 0 18px">${esc(r.name)}</h1>

    <div style="background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.22);border-radius:14px;padding:18px">
      <div style="font-size:30px;font-weight:800;color:#38bdf8;line-height:1">${esc(r.level_code)} · ${esc(r.cefr)}</div>
      <div style="color:#e2e8f0;font-size:16px;margin-top:6px">${esc(r.level_ar)}</div>
      <p style="margin:10px 0 0;color:#94a3b8;font-size:14px">
        المسار: ${esc(r.track)} · دقة التقييم: ${esc(CONF_AR[String(r.confidence)] || r.confidence)} (${esc(r.top_prob)}%)
      </p>
      ${borderline}
    </div>

    <table style="width:100%;margin-top:20px;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:7px 0;color:#64748b">الجوال</td><td style="padding:7px 0;color:#f1f5f9;font-weight:700"><a href="https://wa.me/966${String(r.phone ?? "").replace(/^0/, "")}" style="color:#4ade80;text-decoration:none">${esc(r.phone)}</a></td></tr>
      <tr><td style="padding:7px 0;color:#64748b">العمر</td><td style="padding:7px 0;color:#e2e8f0">${esc(r.age)}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b">الجنس</td><td style="padding:7px 0;color:#e2e8f0">${esc(GENDER_AR[String(r.gender)] || "—")}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b">الهدف</td><td style="padding:7px 0;color:#e2e8f0">${esc(GOAL_AR[String(r.goal)] || "—")}</td></tr>
      <tr><td style="padding:7px 0;color:#64748b">الدرجة</td><td style="padding:7px 0;color:#e2e8f0">${esc(r.correct)}/${esc(r.total)} (${esc(r.pct)}%) · ${esc(r.minutes)} دقيقة</td></tr>
      <tr><td style="padding:7px 0;color:#64748b">المصدر</td><td style="padding:7px 0;color:#e2e8f0">${esc(r.utm_source || "مباشر")}${r.ref_code ? ` · إحالة ${esc(r.ref_code)}` : ""}</td></tr>
    </table>

    <h3 style="color:#f1f5f9;font-size:15px;margin:22px 0 6px">المهارات</h3>
    <table style="width:100%;font-size:14px;border-collapse:collapse">${skillRows}</table>
    ${r.listening_done ? "" : `<p style="color:#64748b;font-size:12px;margin-top:8px">قسم الاستماع لم يُنفَّذ على جهازه.</p>`}

    ${writing}
    ${flagLine}
    ${integrity}

    <p style="margin-top:26px;color:#64748b;font-size:12px;border-top:1px solid rgba(255,255,255,.1);padding-top:16px">
      المستوى بمقياس المنصة: ${esc(r.level_index)} (0=Pre-A1 … 5=C1) — نفس عمود academic_level.
    </p>
  </div></body></html>`;

  return {
    subject: `نتيجة تحديد مستوى — ${r.name} · ${r.level_code} ${r.cefr}`,
    html,
  };
}

/* ─── Handler ─────────────────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const name = str(body?.name, 80);
    if (!name) return json({ error: "name required" }, 400);
    const age = int(body?.age, 5, 99);
    const gender = body?.gender === "male" || body?.gender === "female" ? body.gender : null;

    const attribution = {
      ref_code: str(body?.ref_code, 24),
      visitor_id: str(body?.visitor_id, 64),
      utm_source: str(body?.utm_source, 64),
      utm_medium: str(body?.utm_medium, 64),
      utm_campaign: str(body?.utm_campaign, 120),
    };

    /* ── start ─────────────────────────────────────────────────────── */
    if (action === "start") {
      const { data, error } = await admin
        .from("level_test_results")
        .insert({ name, age, gender, status: "started", ...attribution })
        .select("id")
        .single();
      if (error) {
        console.error("start insert failed:", error);
        return json({ error: "insert failed" }, 500);
      }
      return json({ id: data.id });
    }

    /* ── finish ────────────────────────────────────────────────────── */
    if (action === "finish") {
      const phone = normPhone(body?.phone);
      if (!phone) return json({ error: "valid Saudi phone required" }, 400);

      const levelIndex = int(body?.level_index, 0, 5);
      if (levelIndex === null) return json({ error: "level_index required" }, 400);

      const payload = {
        name,
        age,
        gender,
        phone,
        goal: str(body?.goal, 32),
        level_index: levelIndex,
        level_code: str(body?.level_code, 8),
        cefr: str(body?.cefr, 12),
        level_ar: str(body?.level_ar, 64),
        track: str(body?.track, 48),
        confidence: ["high", "medium", "low"].includes(body?.confidence) ? body.confidence : null,
        top_prob: int(body?.top_prob, 0, 100),
        alt_level: str(body?.alt_level, 8),
        alt_prob: int(body?.alt_prob, 0, 100),
        theta: Number.isFinite(Number(body?.theta)) ? Number(body.theta) : null,
        se: Number.isFinite(Number(body?.se)) ? Number(body.se) : null,
        correct: int(body?.correct, 0, 200),
        total: int(body?.total, 0, 200),
        pct: int(body?.pct, 0, 100),
        skills: Array.isArray(body?.skills) ? body.skills.slice(0, 12) : null,
        listening_done: !!body?.listening_done,
        writing: str(body?.writing, 4000),
        writing_signals: body?.writing_signals && typeof body.writing_signals === "object"
          ? body.writing_signals
          : null,
        minutes: int(body?.minutes, 0, 600),
        left_page: int(body?.left_page, 0, 999) ?? 0,
        status: "completed",
        completed_at: new Date().toISOString(),
        ...attribution,
      };

      let row: Record<string, unknown> | null = null;
      const attemptId = str(body?.attempt_id, 40);

      if (attemptId) {
        // Only a row still awaiting its result may be finalised — a completed
        // result can never be overwritten by replaying its id.
        const { data, error } = await admin
          .from("level_test_results")
          .update(payload)
          .eq("id", attemptId)
          .eq("status", "started")
          .select("*")
          .maybeSingle();
        if (error) console.error("finish update failed:", error);
        row = data ?? null;

        // Nothing updated + the row is already completed → this is a replay or
        // a double-submit. Acknowledge it instead of writing a duplicate.
        if (!row) {
          const { data: existing } = await admin
            .from("level_test_results")
            .select("id, status")
            .eq("id", attemptId)
            .maybeSingle();
          if (existing?.status === "completed") {
            return json({ ok: true, id: existing.id, duplicate: true });
          }
        }
      }

      if (!row) {
        const { data, error } = await admin
          .from("level_test_results")
          .insert(payload)
          .select("*")
          .single();
        if (error) {
          console.error("finish insert failed:", error);
          return json({ error: "insert failed" }, 500);
        }
        row = data;
      }

      // Email is best-effort: the result is already saved, and a Resend outage
      // must never surface as a failure on the student's result screen. Its
      // outcome is reported back so delivery can actually be verified.
      let email = "sent";
      try {
        const tpl = adminEmail(row!);
        const sent = await sendResend({ to: ADMIN_EMAIL, subject: tpl.subject, html: tpl.html });
        if ((sent as { skipped?: boolean })?.skipped) email = "skipped_no_api_key";
      } catch (e) {
        console.error("admin email failed:", e);
        email = `failed: ${e instanceof Error ? e.message : "unknown"}`;
      }

      return json({ ok: true, id: row!.id, email });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("level-test-submit error:", e);
    return json({ error: "internal error" }, 500);
  }
});
