// Curriculum Mistake Detector — REPORT-ONLY (Ali, 2026-06-09):
// scans real student answers for questions where the data smells wrong
// (everyone failing, everyone picking the same "wrong" option, grading too
// strict), asks Claude whether the CURRICULUM item itself is the likely
// culprit, and files a flag in curriculum_quality_flags for HUMAN review.
// It never edits curriculum content. Audio failures + vocab confusion pairs
// are flagged directly from stats (no AI needed).
//
// Triggered weekly by pg_cron (migration 20260609210000) and on demand from
// /admin/curriculum-quality. Auth: admin JWT or the service-role key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Mirrors src/utils/answerValidator.js. Keep the two in sync — the model's
// too_strict_grading judgements are only as good as this description.
const GRADER_DESCRIPTION = [
  "The app grades free-text answers with a tolerant validator, NOT exact string matching:",
  "- case-insensitive, trims whitespace, collapses repeated spaces, normalises smart quotes",
  "- ignores punctuation differences (a missing full stop never fails an answer)",
  "- expands contractions (\"don't\" == \"do not\", \"it's\" == \"it is\")",
  "- multi-blank answers are separator-tolerant: \"told, had been\" == \"Told / had been\" == \"told - had been\"",
  "- a key containing single-word slash alternatives (\"who/that\") accepts either alternative",
  "- fill_blank also accepts the whole sentence when it contains the keyed word",
  "- transform / error_correction also accept just the changed word(s)",
  "- a key marked \"(sample answer)\" accepts any answer of 3+ words",
  "- every entry in accepted_answers is accepted",
  "So only call it too_strict_grading when a wrong-marked answer would still fail THIS validator.",
].join("\n");

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-5";
const MAX_AI_ITEMS = 20; // per run — keeps the weekly AI spend trivial

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    // ── auth: service-role key (cron) or an admin user ──────────────────────
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let allowed = !!token && token === serviceKey;
    if (!allowed && token) {
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        const { data: p } = await admin.from("profiles").select("role").eq("id", user.id).single();
        allowed = p?.role === "admin";
      }
    }
    if (!allowed) return J({ ok: false, error: "admin_only" }, 403);

    const existing = new Map<string, any>();
    {
      const { data } = await admin.from("curriculum_quality_flags").select("dedupe_key, status, evidence");
      for (const f of data || []) existing.set(f.dedupe_key, f);
    }

    // ── 1. collect AI-review candidates from the stats views ────────────────
    type Candidate = {
      dedupe_key: string; source: string; unit_id: string | null;
      item_ref: any; evidence: any; content: any;
    };
    const candidates: Candidate[] = [];

    const { data: reading } = await admin
      .from("v_cq_reading_question_stats").select("*")
      .gte("attempts", 4).order("wrong_pct", { ascending: false }).limit(40);
    for (const r of reading || []) {
      if (!(Number(r.wrong_pct) >= 60 || r.top_wrong_n >= r.attempts * 0.5)) continue;
      candidates.push({
        dedupe_key: `reading:${r.question_id}`, source: "reading_question", unit_id: r.unit_id,
        item_ref: { question_id: r.question_id, reading_id: r.reading_id },
        evidence: { attempts: r.attempts, students: r.students, wrong_n: r.wrong_n, wrong_pct: r.wrong_pct, wrong_distribution: r.wrong_distribution, question_en: r.question_en },
        content: { kind: "reading comprehension MCQ", question: r.question_en, choices: r.choices, keyed_correct_answer: r.correct_answer },
      });
    }

    const { data: listening } = await admin
      .from("v_cq_listening_question_stats").select("*")
      .gte("attempts", 4).order("wrong_pct", { ascending: false }).limit(40);
    for (const r of listening || []) {
      if (!(Number(r.wrong_pct) >= 60 || r.top_wrong_n >= r.attempts * 0.5)) continue;
      candidates.push({
        dedupe_key: `listening:${r.listening_id}:${r.qidx}`, source: "listening_question", unit_id: r.unit_id,
        item_ref: { listening_id: r.listening_id, question_index: r.qidx, title_en: r.title_en },
        evidence: { attempts: r.attempts, students: r.students, wrong_n: r.wrong_n, wrong_pct: r.wrong_pct, wrong_distribution: r.wrong_distribution, question_en: r.exercise?.question_en },
        content: { kind: "listening MCQ (answers are option indexes)", exercise: r.exercise },
      });
    }

    const { data: grammar } = await admin
      .from("v_cq_grammar_exercise_stats").select("*")
      .gte("attempts", 4).order("wrong_pct", { ascending: false }).limit(60);
    for (const r of grammar || []) {
      if (!(Number(r.wrong_pct) >= 60 || r.top_wrong_n >= r.attempts * 0.5)) continue;
      candidates.push({
        dedupe_key: `grammar:${r.item_id}`, source: "grammar_exercise", unit_id: r.unit_id,
        item_ref: { item_id: r.item_id, grammar_id: r.grammar_id, exercise_type: r.exercise_type },
        evidence: {
          attempts: r.attempts, students: r.students, wrong_n: r.wrong_n,
          wrong_pct: r.wrong_pct, wrong_distribution: r.wrong_distribution,
          // question_en powers the flag title in /admin/curriculum-quality — without
          // it the card fell back to printing the raw dedupe_key (a bare UUID).
          question_en: r.item?.question ?? null,
          keyed_correct_answer: r.correct_answer ?? null,
        },
        content: {
          kind: `grammar exercise (${r.exercise_type})`,
          item: r.item,
          keyed_correct_answer: r.correct_answer,
          accepted_answers: r.item?.accepted_answers ?? null,
          // The app does NOT compare strings exactly. Describing the real grader
          // matters: an earlier version of this prompt claimed "graded by EXACT
          // string match", which pushed the model toward a too_strict_grading
          // verdict on items the grader actually accepts.
          how_it_is_graded: GRADER_DESCRIPTION,
        },
      });
    }

    // skip items already reviewed unless meaningful new data arrived
    const toReview = candidates.filter((c) => {
      const f = existing.get(c.dedupe_key);
      if (!f) return true;
      if (f.status === "open") return false; // already waiting for a human
      if (f.status === "fixed" || f.status === "dismissed") return false; // human decided — never silently re-open (2026-06-10)
      const prev = Number(f.evidence?.attempts || 0);
      return c.evidence.attempts - prev >= 5; // re-judge only auto_ok with fresh signal
    }).slice(0, MAX_AI_ITEMS);

    // ── 2. AI verdicts (report-only) — batched 4-wide, upserted as they land,
    // and the whole scan runs AFTER the response via waitUntil so neither the
    // cron nor the admin button ever hits the 150s idle timeout. ─────────────
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
    const flags: any[] = [];
    let aiErrors = 0;

    const runAiScan = async () => {
      for (let i = 0; i < toReview.length; i += 4) {
        const batch = toReview.slice(i, i + 4);
        const results = await Promise.allSettled(batch.map((c) => aiVerdict(apiKey!, c)));
        for (let b = 0; b < batch.length; b++) {
          const r = results[b];
          if (r.status !== "fulfilled") { aiErrors++; continue; }
          const verdict = r.value as any;
          const c = batch[b];
          const sev = verdict.suspected
            ? (verdict.confidence >= 0.75 ? "high" : verdict.confidence >= 0.45 ? "medium" : "low")
            : "low";
          const flag = {
            dedupe_key: c.dedupe_key, source: c.source, unit_id: c.unit_id,
            item_ref: c.item_ref, evidence: c.evidence, ai_verdict: verdict,
            severity: sev, status: verdict.suspected ? "open" : "auto_ok",
            updated_at: new Date().toISOString(),
          };
          await admin.from("curriculum_quality_flags").upsert(flag, { onConflict: "dedupe_key" });
          flags.push(flag);
        }
      }
    };

    // ── 3. no-AI flags: audio health + vocab confusion ──────────────────────
    const { data: audio } = await admin.from("v_cq_audio_health").select("*");
    for (const a of audio || []) {
      const bad = (a.errors || 0) + (a.stalls || 0);
      if (bad < 5) continue;
      const key = `audio:${a.audio_url}`;
      const f = existing.get(key);
      if (f && f.status !== "open") continue;
      flags.push({
        dedupe_key: key, source: "audio_health", unit_id: null,
        item_ref: { audio_url: a.audio_url },
        evidence: { errors: a.errors, stalls: a.stalls, students: a.students, reasons: a.reasons, latest_at: a.latest_at },
        ai_verdict: { suspected: true, confidence: 1, reason_ar: `ملف صوتي يفشل أو يتقطّع عند الطلاب (${bad} حادثة لـ ${a.students} طالب خلال ١٤ يوماً) — افحص الملف/الترميز.`, suggested_fix_ar: "أعد توليد أو إعادة ترميز الملف الصوتي وتحقق من تشغيله على Safari/iPhone." },
        severity: bad >= 15 ? "high" : "medium", status: "open",
        updated_at: new Date().toISOString(),
      });
    }

    const { data: pairs } = await admin.from("v_cq_vocab_confusion_pairs").select("*").gte("n", 2);
    for (const p of pairs || []) {
      const key = `vocab:${p.target_id}:${p.chosen_id}`;
      const f = existing.get(key);
      if (f && f.status !== "open") continue;
      flags.push({
        dedupe_key: key, source: "vocab_confusion", unit_id: null,
        item_ref: { target_id: p.target_id, chosen_id: p.chosen_id, reading_id: p.reading_id },
        evidence: { n: p.n, students: p.students, target_word: p.target_word, chosen_word: p.chosen_word },
        ai_verdict: { suspected: true, confidence: 0.5, reason_ar: `الطلاب يخلطون بين «${p.target_word}» و«${p.chosen_word}» (${p.n} مرة) — قد تكون الكلمتان متقاربتين أكثر من اللازم في نفس التمرين، أو فرصة لتمرين تمييز موجّه.`, suggested_fix_ar: "راجع تمرين المطابقة، أو أضف تمرين تمييز تقابلي بين الكلمتين." },
        severity: "low", status: "open",
        updated_at: new Date().toISOString(),
      });
    }

    // ── 4. upsert the stat-only flags now, then run the AI scan in the
    // background and return immediately. The admin page reads the flags table,
    // so results appear there as the scan progresses. ───────────────────────
    let written = 0;
    for (const f of flags) {
      const { error } = await admin.from("curriculum_quality_flags")
        .upsert(f, { onConflict: "dedupe_key" });
      if (!error) written++;
    }

    // @ts-ignore — EdgeRuntime is provided by the Supabase edge environment.
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runAiScan());
    } else {
      await runAiScan();
    }

    return J({
      ok: true,
      started: true,
      candidates: candidates.length,
      ai_reviewing: toReview.length,
      stat_flags_written: written,
    });
  } catch (e) {
    return J({ ok: false, error: (e as Error).message }, 500);
  }
});

async function aiVerdict(apiKey: string, c: any) {
  const prompt = `أنت مدقّق جودة مناهج في أكاديمية طلاقة لتعليم الإنجليزية لطلاب عرب. السؤال التالي أظهر نمط إجابات مريباً عند الطلاب، والمطلوب حكمك: هل الخلل على الأغلب في السؤال/الإجابة المعتمدة نفسها (خطأ منهج يجب أن يصلحه الفريق)، أم السؤال سليم والطلاب فقط يجدونه صعباً؟

محتوى السؤال (JSON):
${JSON.stringify(c.content, null, 1).slice(0, 3500)}

إحصاءات إجابات الطلاب الحقيقية:
- عدد المحاولات: ${c.evidence.attempts} (من ${c.evidence.students} طالب)
- نسبة الخطأ: ${c.evidence.wrong_pct}%
- توزيع الإجابات الخاطئة: ${JSON.stringify(c.evidence.wrong_distribution || {}).slice(0, 800)}

انتبه لهذه الأنماط:
- إجابة معتمدة خاطئة أو غامضة (أغلب الطلاب يختارون نفس البديل "الخاطئ")
- تصحيح صارم أكثر من اللازم: إجابة صحيحة المعنى رُفضت رغم أن المُصحِّح الموصوف في الحقل how_it_is_graded كان يجب أن يقبلها
- خيارات متشابهة لدرجة الالتباس، أو سؤال لا يُجاب من النص/الصوت
- إذا كانت الإجابات الخاطئة عشوائية/عبثية (حرف واحد مثل "G") فالأغلب سلوك طلاب لا خطأ منهج

قواعد صارمة قبل الحكم:
- احكم على محتوى السؤال المعروض أعلاه فقط. لا تفترض أن السؤال ناقص أو غائب عن شاشة الطالب: المحتوى المعروض هنا هو نفسه ما يراه الطالب.
- إذا كان الحقل item فارغاً (null) فهذه مشكلة في أداة الفحص لا في المنهج: أعطِ suspected=false و category=other واذكر أن المحتوى لم يصل للمراجعة.
- لا تحكم بـ too_strict_grading إلا بعد أن تتحقق فعلياً من how_it_is_graded ومن accepted_answers، وتتأكد أن الإجابة المرفوضة كانت سترسب حتى مع هذا التساهل.
- اختلاف حالة الأحرف أو علامات الترقيم أو فاصل الفراغات وحده ليس سبباً كافياً لـ too_strict_grading — المُصحِّح يتجاوزها.

أصدر حكمك عبر الأداة verdict فقط.`;

  const tools = [{
    name: "verdict",
    description: "حكم جودة سؤال المنهج",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        suspected: { type: "boolean", description: "هل تشتبه أن الخلل في المنهج نفسه؟" },
        confidence: { type: "number", description: "0 إلى 1" },
        category: { type: "string", enum: ["wrong_key", "too_strict_grading", "ambiguous_options", "unanswerable", "student_behavior", "other"] },
        reason_ar: { type: "string", description: "سبب الاشتباه بالعربية، مبني على الأدلة" },
        suggested_fix_ar: { type: "string", description: "اقتراح الإصلاح للفريق (الفريق ينفّذ، ليس الذكاء الاصطناعي)" },
      },
      required: ["suspected", "confidence", "category", "reason_ar", "suggested_fix_ar"],
      additionalProperties: false,
    },
  }];

  const resp = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    // max_tokens caps thinking + output together on Opus 5 (thinking is on by
    // default), so leave headroom above the small verdict payload or the tool
    // call gets truncated.
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      tools,
      tool_choice: { type: "tool", name: "verdict" },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}`);
  const jr = await resp.json();
  const tu = (jr?.content || []).find((x: any) => x.type === "tool_use");
  if (!tu?.input) throw new Error("no_tool_use");
  return tu.input;
}
