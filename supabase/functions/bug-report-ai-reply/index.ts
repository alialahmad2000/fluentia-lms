// Fluentia LMS — Bug-report AI first-responder.
// Invoked (fire-and-forget, via pg_net from the notify_bug_report_reply trigger)
// whenever a STUDENT posts a message on a bug ticket. It reads the whole thread,
// drafts a warm, gender-aware Arabic acknowledgement with Claude, posts it back
// into the ticket AS the team (so the student gets notified), and reassures the
// student that the technical team will follow up. It NEVER claims the bug is
// fixed — it acknowledges, optionally asks ONE smart follow-up, and reassures.
// Deploy with verify_jwt=false (called server-side by the DB trigger).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY") || Deno.env.get("ANTHROPIC_API_KEY") || "";

// Post AI replies under the academy's contactable admin (د. علي الأحمد) so the
// student-facing thread reads as "the team", and the staff-branch of the trigger
// notifies the student. (This is sender_id, not who actually wrote it.)
const TEAM_SENDER_ID = "e5528ced-b3e2-45bb-8c89-9368dc9b5b96";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function callClaude(system: string, user: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      temperature: 0.5,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return {
    text: data.content?.[0]?.text || "",
    usage: data.usage || { input_tokens: 0, output_tokens: 0 },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({} as any));
    const reportId = body?.report_id;
    if (!reportId) return json({ error: "missing report_id" }, 400);

    // Load the report.
    const { data: report } = await admin
      .from("bug_reports")
      .select("id, reporter_id, reporter_name, reporter_role, description, page_url, status, device_info")
      .eq("id", reportId)
      .maybeSingle();
    if (!report) return json({ error: "report not found" }, 404);

    // Load the full thread (oldest → newest).
    const { data: msgs } = await admin
      .from("bug_report_messages")
      .select("sender_role, body, created_at")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    const thread = msgs || [];
    if (!thread.length) return json({ skipped: "no_messages" });

    // Only auto-reply when the LAST message is from the reporter (not staff/AI) —
    // prevents replying to our own messages and any loop.
    const last = thread[thread.length - 1];
    if (last.sender_role === "admin" || last.sender_role === "trainer") {
      return json({ skipped: "last_message_is_staff" });
    }

    // Reporter gender (Arabic is gendered) — default female (the academy's majority).
    let gender: "male" | "female" = "female";
    if (report.reporter_id) {
      const { data: st } = await admin.from("students").select("gender").eq("id", report.reporter_id).maybeSingle();
      if (st?.gender === "male") gender = "male";
    }

    if (!CLAUDE_API_KEY) return json({ error: "CLAUDE_API_KEY not configured" }, 500);

    // Build context.
    const di: any = report.device_info || {};
    const ctx: any = di.context || {};
    const area = [ctx.area_label, ctx.subsection_label, ctx.problem_type_label].filter(Boolean).join(" › ");
    const platform = di.platform || "";
    const ua = di.userAgent || "";
    const isApple = /iphone|ipad|mac|safari/i.test(`${platform} ${ua}`);
    const standalone = di.standalone === true; // installed PWA

    const convo = thread
      .map((m: any) => `${m.sender_role === "admin" || m.sender_role === "trainer" ? "الفريق" : "الطالبة/الطالب"}: ${m.body}`)
      .join("\n");

    const g = gender === "male" ? "بصيغة المذكّر" : "بصيغة المؤنّث";
    const system =
`أنت «مساعد طلاقة الذكي» — أول من يردّ على بلاغات الطلاب في أكاديمية طلاقة لتعلّم الإنجليزية. أنت لست بديلاً عن الفريق التقني؛ أنت ردّ أوّليّ سريع يطمئن الطالب لحين متابعة الفريق له.

أسلوبك:
- عربي دافئ بسيط بلهجة سعودية مهذّبة، خاطِب الطالب ${g}.
- ردّ قصير جداً: من جملتين إلى أربع جمل فقط. بلا رسميّة زائدة وبلا حشو.
- اعترف بالمشكلة بدقّة واذكر تحديداً ما يشتكي منه (لا ردود عامة مكرّرة).
- إن نقصت معلومة تلزم الفريق لتشخيص المشكلة، اسأل سؤالاً واحداً فقط، ذكيّاً وسهلاً (لا تستجوب، ولا تسأل إن كانت المعلومات كافية).
- طمئنه أن «الفريق التقني» اطّلع على بلاغه وراح يتابع معه بأسرع وقت.
- إن قال الطالب إن المشكلة انحلّت أو شكر، اشكره بحرارة وتمنّ له التوفيق ولا تطرح أي سؤال.
${isApple ? `- شكوى «الصوت لا يعمل» على آيفون/آيباد/سفاري غالباً سببها نسخة قديمة من التطبيق عالقة على الجهاز. اقترح بلطف حلّاً سريعاً: إغلاق التطبيق تماماً وإعادة فتحه، وإن استمرّت المشكلة ${standalone ? "حذف تطبيق طلاقة من الشاشة الرئيسية، ثم فتح سفاري والدخول على app.fluentia.academy وإعادة التثبيت (شارك ← أضف إلى الشاشة الرئيسية)" : "فتح الصفحة في متصفّح سفاري العادي على app.fluentia.academy وتجربة الصوت هناك"} — هذا ينظّف النسخة القديمة. اذكر الرابط app.fluentia.academy صراحةً حتى تقدر ترجع بعد الحذف. لكن لا تجزم أبداً أن المشكلة انحلّت.` : ""}

ممنوع تماماً:
- لا تَعِد أبداً بأن المشكلة «تم حلّها» أو «انحلّت» — أنت تطمئن فقط، والحلّ يؤكّده الطالب أو الفريق.
- لا تختلق تفاصيل تقنية غير مؤكّدة، ولا تَعِد بمواعيد محدّدة.
- لا تطلب بيانات حسّاسة (كلمة مرور، رقم بطاقة، رمز تحقّق...).

اختم الرسالة دائماً بسطر توقيع منفصل:
«— مساعد طلاقة الذكي 🤖 (الفريق التقني راح يتواصل معك قريب)»`;

    const user =
`سياق البلاغ:
- المكان: ${area || "غير محدد"}
- الجهاز: ${platform || "غير معروف"}${ua ? ` (${ua.slice(0, 120)})` : ""}
- الصفحة: ${report.page_url || "—"}

نص البلاغ الأصلي: ${report.description || "—"}

المحادثة حتى الآن:
${convo}

اكتب ردّك الآن وفق التعليمات (لا تكرّر التحية إن سبق أن ردّ الفريق).`;

    const { text, usage } = await callClaude(system, user);
    const replyBody = (text || "").trim();
    if (!replyBody) return json({ skipped: "empty_completion" });

    // Post as the team → the trigger's staff branch notifies the student (in-app + push).
    const { error: insErr } = await admin.from("bug_report_messages").insert({
      report_id: reportId,
      sender_id: TEAM_SENDER_ID,
      sender_role: "admin",
      body: replyBody,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    // Signal in triage that the AI acknowledged and a human follow-up is pending.
    if (report.status === "new") {
      await admin.from("bug_reports").update({ status: "in_progress" }).eq("id", reportId);
    }

    // Best-effort usage logging.
    try {
      await admin.from("ai_usage").insert({
        type: "bug_report_reply",
        student_id: report.reporter_id,
        model: "claude-sonnet-4-6",
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated_cost_sar: ((usage.input_tokens * 3 + usage.output_tokens * 15) / 1_000_000) * 3.75,
      });
    } catch (_e) { /* ai_usage.type may be an enum without this value — non-fatal */ }

    return json({ success: true, posted: true });
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
