// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_HISTORY = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { conversation_id, user_message, trainer_id } = await req.json();
    if (!conversation_id || !user_message || !trainer_id) {
      throw new Error("conversation_id, user_message, trainer_id required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Save trainer message immediately
    const { data: trainerMsg, error: tmErr } = await supabase
      .from("nabih_messages")
      .insert({ conversation_id, role: "trainer", content: user_message })
      .select("id, created_at")
      .single();
    if (tmErr) throw tmErr;

    // 2. Bump conversation last_message_at
    await supabase
      .from("nabih_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    // 3. Load conversation history (last MAX_HISTORY messages)
    const { data: history } = await supabase
      .from("nabih_messages")
      .select("role, content, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(MAX_HISTORY);

    // 4. Load trainer live context
    const ctx = await loadTrainerContext(supabase, trainer_id);

    // 5. Build system prompt
    const systemPrompt = buildSystemPrompt(ctx);

    // 6. Map history to Claude format: 'trainer' → 'user', 'nabih' → 'assistant'
    const claudeMessages = (history || [])
      .filter((m: any) => m.role === "trainer" || m.role === "nabih")
      .map((m: any) => ({
        role: m.role === "trainer" ? "user" : "assistant",
        content: m.content,
      }));

    // Ensure last message is from user (the one we just saved)
    if (claudeMessages.length === 0 || claudeMessages[claudeMessages.length - 1].role !== "user") {
      claudeMessages.push({ role: "user", content: user_message });
    }

    // 7. Call Claude
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY"),
    });
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const assistantText = (resp.content[0] as any).text as string;

    // 8. Save nabih response
    const { data: nabihMsg, error: nmErr } = await supabase
      .from("nabih_messages")
      .insert({ conversation_id, role: "nabih", content: assistantText })
      .select("id, created_at")
      .single();
    if (nmErr) throw nmErr;

    // 9. Auto-title if first exchange (still has default title)
    const isFirstExchange = (history?.filter((m: any) => m.role === "trainer").length || 0) <= 1;
    if (isFirstExchange) {
      const autoTitle = await generateTitle(anthropic, user_message);
      if (autoTitle) {
        await supabase
          .from("nabih_conversations")
          .update({ title: autoTitle })
          .eq("id", conversation_id)
          .eq("title", "محادثة جديدة");
      }
    }

    return new Response(JSON.stringify({
      nabih_message: { id: nabihMsg.id, content: assistantText, created_at: nabihMsg.created_at },
      trainer_message: trainerMsg,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("nabih-chat error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

async function loadTrainerContext(supabase: any, trainer_id: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", trainer_id)
    .single();

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name, level, current_unit_id")
    .eq("trainer_id", trainer_id);

  const groupIds = (groups || []).map((g: any) => g.id);

  const { data: students } = groupIds.length
    ? await supabase
        .from("students")
        .select("id, xp_total, current_streak, last_active_at, status, profiles(full_name), group_id")
        .in("group_id", groupIds)
        .eq("status", "active")
        .is("deleted_at", null)
    : { data: [] };

  const studentSummary = (students || []).map((s: any) => ({
    id: s.id,
    name: s.profiles?.full_name,
    group_id: s.group_id,
    xp_total: s.xp_total,
    streak: s.current_streak,
    hours_since_active: s.last_active_at
      ? Math.floor((Date.now() - new Date(s.last_active_at).getTime()) / 3_600_000)
      : null,
  }));

  const studentIds = studentSummary.map((s: any) => s.id);

  const { data: interventions } = studentIds.length
    ? await supabase
        .from("student_interventions")
        .select("student_id, severity, reason_code, short_message")
        .eq("status", "pending")
        .in("student_id", studentIds)
    : { data: [] };

  const { data: recentGrading } = await supabase
    .from("grading_events")
    .select("submission_type, action, final_score, created_at")
    .eq("trainer_id", trainer_id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: growth } = await supabase
    .rpc("get_trainer_growth_dashboard", { p_trainer_id: trainer_id });

  return {
    trainer_name: profile?.full_name || "المدرب",
    groups: groups || [],
    students: studentSummary,
    pending_interventions: interventions || [],
    recent_grading: recentGrading || [],
    growth_snapshot: growth || {},
  };
}

function buildSystemPrompt(ctx: any) {
  const groupsList = ctx.groups.map((g: any) => `• ${g.name} (${g.level})`).join("\n");
  const studentsList = ctx.students.map((s: any) =>
    `• ${s.name} — XP: ${s.xp_total}, Streak: ${s.streak}d, آخر نشاط: ${s.hours_since_active !== null ? s.hours_since_active + ' ساعة' : 'غير معروف'}`
  ).join("\n");
  const interventionsList = ctx.pending_interventions.map((i: any) =>
    `• ${i.student_id} — ${i.severity}: ${i.short_message || i.reason_code}`
  ).join("\n") || "لا توجد تدخلات معلّقة";
  const kpis = ctx.growth_snapshot?.kpis || {};
  const xp = ctx.growth_snapshot?.xp || {};
  const streak = ctx.growth_snapshot?.streak || {};

  return `أنت "نبيه" — مساعد ذكي ومستشار تعليمي شخصي للمدرب ${ctx.trainer_name} في أكاديمية طلاقة.

شخصيتك:
- زميل دافئ وعارف، مو مستشار رسمي
- ترد بالعربية الفصحى البسيطة، تتنقل للإنجليزية للمصطلحات التقنية
- مختصر ومفيد — المدرب مشغول، ما يقرأ مقالات
- مبني دائماً على الأرقام الحقيقية أدناه — اذكر أسماء الطلاب وأرقامهم بالضبط
- اقتراحاتك عملية ومحددة ("أرسل واتساب الآن: ...") مو نصائح عامة
- لا تتملق ولا تجامل، لكن إيجابي وداعم
- تعترف بعدم اليقين لو البيانات شحيحة

السياق المباشر:

مجموعات ${ctx.trainer_name} (${ctx.groups.length}):
${groupsList || "لا توجد مجموعات"}

طلابه النشطون (${ctx.students.length}):
${studentsList || "لا يوجد طلاب نشطون"}

تدخلات معلّقة (${ctx.pending_interventions.length}):
${interventionsList}

أداء المدرب نفسه:
- XP الشهر: ${xp.month || 0}
- Streak الحالي: ${streak.current || 0} يوم
- KPI Score: ${kpis.composite_score || 'غير متاح'}
- Retention: ${kpis.retention_pct !== undefined ? kpis.retention_pct + '%' : 'غير متاح'}

قواعد ذهبية:
1. لو سُئلت عن طالب، اذكره بالاسم وأعطِ أرقامه الفعلية
2. لو السؤال عام، حدّد الـ ٣ الأهم وعلّق عليهم
3. لو اقترحت رسالة واتساب، اكتبها كاملة جاهزة للنسخ
4. لا تذكر بيانات مالية أو معلومات طلاب بنكية
5. لا تطلب توضيحاً لو السياق أعلاه يكفي للإجابة
6. إذا اقترحت شي يحتاج بيانات ما عندك — قل "احتاج معلومة عن X"`;
}

async function generateTitle(anthropic: any, firstMessage: string): Promise<string | null> {
  try {
    const resp = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 30,
      messages: [{
        role: "user",
        content: `Generate a 3-5 word Arabic title summarizing this question. Return ONLY the title, no quotes:\n\n${firstMessage}`,
      }],
    });
    return ((resp.content[0] as any).text as string).trim().slice(0, 60);
  } catch {
    return null;
  }
}
