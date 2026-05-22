// mock-exam-grade-writing
// 3-layer reliable writing grader for the cumulative midterm mock.
//   Layer 1 (primary): Claude Sonnet via Anthropic SDK with level-aware rubric
//   Layer 2 (retry): one automatic retry after 2s backoff
//   Layer 3 (fallback): smart deterministic heuristic
//
// Called fire-and-forget by the student's submit flow + from the trainer's
// "إعادة التقييم" retry button. Idempotent (skips if already graded by AI).

// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.27.0";

// claude-sonnet-4-20250514 was retired and replaced project-wide with
// claude-sonnet-4-6 on 2026-03-14 (see CLAUDE.md change log). Honor that.
const CLAUDE_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const TIMEOUT_MS = 25_000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });

  const startedAt = Date.now();
  let attemptId: string | null = null;

  try {
    const body = await req.json().catch(() => ({}));
    attemptId = body.attempt_id ?? null;
    if (!attemptId) throw new Error("attempt_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // Accept either env-var name — project legacy is CLAUDE_API_KEY,
    // prompt spec is ANTHROPIC_API_KEY.
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("CLAUDE_API_KEY");

    const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

    // Fetch the attempt + nested exam
    const { data: attempt, error: aErr } = await admin
      .from("mock_exam_attempts")
      .select(
        "id, exam_id, student_id, writing_response, writing_word_count, is_submitted, ai_writing_status, manual_writing_score, exam:mock_exams(code, min_writing_words)"
      )
      .eq("id", attemptId)
      .single();
    if (aErr || !attempt) throw new Error("attempt_not_found");
    if (!attempt.is_submitted) throw new Error("attempt_not_submitted");

    // Idempotency: if already graded by AI (not pending/failed), skip.
    // Trainer retry path resets status to 'pending' first via mock_exam_reset_ai_status.
    if (attempt.ai_writing_status === "graded" || attempt.ai_writing_status === "fallback") {
      return jsonResponse({ success: true, idempotent: true, status: attempt.ai_writing_status });
    }

    // Fetch the writing question stem
    const { data: writingQ, error: wErr } = await admin
      .from("mock_exam_questions")
      .select("stem, writing_min_words")
      .eq("exam_id", attempt.exam_id)
      .eq("section", "writing")
      .single();
    if (wErr || !writingQ) throw new Error("writing_question_not_found");

    const examCode = (attempt.exam as any)?.code as string;
    const level: "A1" | "B1" = examCode?.includes("a1") ? "A1" : "B1";
    const writingText = (attempt.writing_response || "").trim();
    const wordCount = attempt.writing_word_count ?? 0;
    const minWords = writingQ.writing_min_words || (attempt.exam as any)?.min_writing_words || 50;
    const writingPrompt = writingQ.stem;

    // ── Try AI primary (then retry) ──────────────────────────
    let aiResult: GradeResult | null = null;
    let aiLayer: "primary" | "retry" | "fallback" = "primary";
    let aiSuccess = false;
    let lastError: unknown = null;
    let tokenUsage: { input: number; output: number } | null = null;

    if (anthropicKey && writingText.length > 0) {
      const anthropic = new Anthropic({ apiKey: anthropicKey, timeout: TIMEOUT_MS });
      const systemPrompt = buildSystemPrompt(level);
      const userMessage = buildUserMessage(writingPrompt, writingText, wordCount, minWords);

      try {
        const resp = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: MAX_TOKENS,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });
        const parsed = parseAndValidateClaudeResponse(resp);
        aiResult = parsed.result;
        tokenUsage = parsed.usage;
        aiSuccess = true;
        aiLayer = "primary";
      } catch (err1) {
        lastError = err1;
        console.warn("[grade-writing] primary failed, retrying:", String(err1));
        // Log the retry attempt
        await admin.from("mock_exam_ai_writing_log").insert({
          attempt_id: attemptId,
          status: "retry",
          layer: "primary",
          error_message: String((err1 as any)?.message || err1),
          ai_model: CLAUDE_MODEL,
          duration_ms: Date.now() - startedAt,
        }).then(() => {}).catch(() => {});
        await sleep(2000);
        try {
          const resp = await anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
          });
          const parsed = parseAndValidateClaudeResponse(resp);
          aiResult = parsed.result;
          tokenUsage = parsed.usage;
          aiSuccess = true;
          aiLayer = "retry";
        } catch (err2) {
          lastError = err2;
          console.error("[grade-writing] retry failed:", String(err2));
          aiSuccess = false;
        }
      }
    } else if (!anthropicKey) {
      console.warn("[grade-writing] ANTHROPIC_API_KEY/CLAUDE_API_KEY not set — falling back");
    }

    // ── Fallback ─────────────────────────────────────────────
    if (!aiSuccess || !aiResult) {
      const fb = smartFallbackScore(writingText, minWords);
      aiResult = {
        score: fb.score,
        justification_ar: `تعذّر التقييم التلقائي بالذكاء الاصطناعي في الوقت الحالي. تم احتساب الدرجة بناءً على معايير أساسية: ${fb.reason_ar}. سيراجع المدرب كتابتك يدوياً.`,
        strengths_ar: [],
        improvements_ar: ["تواصلي مع المدرب لمراجعة كتابتك بتفصيل أكثر"],
      };
      aiLayer = "fallback";
    }

    // ── Apply via RPC ────────────────────────────────────────
    const status = aiSuccess ? "graded" : "fallback";
    const { data: applyData, error: applyErr } = await admin.rpc("mock_exam_apply_ai_writing_score", {
      p_attempt_id: attemptId,
      p_score: aiResult.score,
      p_justification: aiResult.justification_ar,
      p_strengths: aiResult.strengths_ar,
      p_improvements: aiResult.improvements_ar,
      p_status: status,
    });
    if (applyErr) throw applyErr;

    // ── Audit log ────────────────────────────────────────────
    await admin.from("mock_exam_ai_writing_log").insert({
      attempt_id: attemptId,
      status: aiSuccess ? "success" : "fallback",
      layer: aiLayer,
      score: aiResult.score,
      ai_model: aiSuccess ? CLAUDE_MODEL : null,
      prompt_tokens: tokenUsage?.input ?? null,
      output_tokens: tokenUsage?.output ?? null,
      error_message: aiSuccess ? null : String((lastError as any)?.message || lastError || "fallback_used"),
      duration_ms: Date.now() - startedAt,
    }).then(() => {}).catch((e: any) => console.warn("audit log insert failed:", e));

    return jsonResponse({
      success: true,
      ai_success: aiSuccess,
      layer: aiLayer,
      score: aiResult.score,
      status,
      apply: applyData,
    });
  } catch (err) {
    console.error("[grade-writing] fatal:", err);
    if (attemptId) {
      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false } }
        );
        await admin.from("mock_exam_ai_writing_log").insert({
          attempt_id: attemptId,
          status: "error",
          layer: "primary",
          error_message: String((err as any)?.message || err),
          duration_ms: Date.now() - startedAt,
        });
      } catch {/* noop */}
    }
    return jsonResponse({ success: false, error: String((err as any)?.message || err) }, 500);
  }
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
type GradeResult = {
  score: number;
  justification_ar: string;
  strengths_ar: string[];
  improvements_ar: string[];
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function buildSystemPrompt(level: "A1" | "B1"): string {
  return `You are an experienced English teacher at Fluentia Academy (Saudi Arabia) grading writing for a ${level} CEFR-level student.

Be realistic, fair, and pedagogically sound:
- A1 (beginner, used to Arabic as L1): reward basic communication even with grammar errors. Expect simple sentences using present simple, basic vocabulary, short structure.
- B1 (intermediate, used to Arabic as L1): expect more complex sentences (past tense, present perfect, conditionals), varied vocabulary, clearer organization, multi-sentence paragraphs.

PENALIZE HEAVILY (score 0-3):
- Gibberish or random characters with no meaning
- Single repeated word/phrase (e.g. "word word word..." or "hi hi hi hi")
- Copy-pasted spam text with no relation to the prompt
- Failure to address the writing prompt at all

REWARD (score 6-10):
- Genuine attempt at the topic given in the prompt
- Clear sentences (even if simple at A1)
- Vocabulary appropriate to ${level} level
- Logical flow from one sentence to the next
- Direct response to the question asked

Use the full scale 0-10 honestly. A grade of 10 means truly excellent work for the ${level} level. A grade of 5-6 means acceptable but with clear room to improve. A grade of 0-2 means the response is essentially unusable.

Respond ONLY with valid JSON. No markdown code fences, no prose before or after. The justification and feedback MUST be in Arabic (the student's native language).`;
}

function buildUserMessage(prompt: string, writingText: string, wordCount: number, minWords: number): string {
  return `Writing prompt given to the student:
"${prompt}"

Student's writing (${wordCount} words; minimum required: ${minWords}):
"""
${writingText}
"""

Grade this writing on a scale of 0 to 10 (one decimal place allowed, e.g. 7.5).

Respond with EXACTLY this JSON shape (no markdown, no code fences):
{
  "score": <number between 0 and 10>,
  "justification_ar": "<2 to 3 sentences in Arabic explaining the score>",
  "strengths_ar": ["<short Arabic strength>", "<short Arabic strength>"],
  "improvements_ar": ["<short Arabic improvement note>", "<short Arabic improvement note>"]
}

Be honest. If the writing is poor, score it low and explain why in Arabic. If the writing is great, score it high and praise specifically in Arabic.`;
}

function parseAndValidateClaudeResponse(resp: any): { result: GradeResult; usage: { input: number; output: number } } {
  const block = resp?.content?.[0];
  if (!block || block.type !== "text") throw new Error("no_text_block_in_response");
  let text: string = block.text;
  // Strip code fences if Claude returns them despite instructions
  text = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(text);
  if (typeof parsed.score !== "number") throw new Error("score_not_a_number");
  if (parsed.score < 0 || parsed.score > 10) throw new Error("score_out_of_range");
  if (typeof parsed.justification_ar !== "string" || parsed.justification_ar.length < 5) {
    throw new Error("justification_too_short_or_missing");
  }
  if (!Array.isArray(parsed.strengths_ar)) parsed.strengths_ar = [];
  if (!Array.isArray(parsed.improvements_ar)) parsed.improvements_ar = [];
  // Round to one decimal
  parsed.score = Math.round(parsed.score * 10) / 10;
  return {
    result: parsed,
    usage: {
      input: resp?.usage?.input_tokens ?? 0,
      output: resp?.usage?.output_tokens ?? 0,
    },
  };
}

function smartFallbackScore(text: string, minWords: number): { score: number; reason_ar: string } {
  const trimmed = (text || "").trim();
  if (!trimmed) return { score: 0, reason_ar: "النص فارغ" };

  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < minWords) {
    return { score: 0, reason_ar: `عدد الكلمات (${wordCount}) أقل من الحد الأدنى (${minWords})` };
  }

  const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const uniqueWords = new Set(words.map(norm));
  const uniqueRatio = uniqueWords.size / wordCount;

  if (uniqueRatio < 0.2) {
    return { score: 2, reason_ar: `النص يحتوي على تكرار شديد للكلمات (نسبة التفرّد ${(uniqueRatio * 100).toFixed(0)}٪)` };
  }
  if (uniqueRatio < 0.35) {
    return { score: 4, reason_ar: `النص يحتوي على تكرار للكلمات (نسبة التفرّد ${(uniqueRatio * 100).toFixed(0)}٪)` };
  }

  const avgWordLength = words.reduce((s, w) => s + w.length, 0) / wordCount;
  if (avgWordLength < 2.5) {
    return { score: 3, reason_ar: `متوسط طول الكلمات قصير جداً (${avgWordLength.toFixed(1)} حرف) — قد يكون النص غير حقيقي` };
  }

  return { score: 6, reason_ar: "تجاوز النص المعايير الأساسية لكن تعذّر التقييم العميق" };
}

