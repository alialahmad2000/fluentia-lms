import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function errResp(code: string, details: object, status = 403) {
  return new Response(JSON.stringify({ error: code, details }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { assessment_id } = await req.json();

    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch assessment config (includes new columns from v2 migration)
    const { data: assessment } = await db
      .from("unit_mastery_assessments")
      .select("id, unit_id, pass_score_percent, unlock_threshold_percent, total_questions, retake_cooldown_minutes, xp_on_pass, xp_on_attempt, time_limit_seconds, is_published, max_attempts, post_pass_retake_days, pre_pass_lockout_hours")
      .eq("id", assessment_id)
      .eq("is_published", true)
      .maybeSingle();

    if (!assessment) {
      return new Response(JSON.stringify({ error: "Assessment not found or not published" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Activity completion gate (preserve existing fn)
    const { data: activityPct } = await db.rpc("fn_unit_activity_completion", {
      p_student_id: userId,
      p_unit_id: assessment.unit_id,
    });

    const requiredPct = assessment.unlock_threshold_percent ?? 70;
    if ((activityPct ?? 0) < requiredPct) {
      return errResp("cannot_start", {
        reason: "activities_incomplete",
        current_pct: activityPct ?? 0,
        required_pct: requiredPct,
        message: `أكملي ${requiredPct}% من أنشطة الوحدة لفتح الاختبار`,
      });
    }

    const MAX_ATTEMPTS = assessment.max_attempts ?? 3;
    const COOLDOWN_MIN = assessment.retake_cooldown_minutes ?? 60;
    const LOCKOUT_HOURS = assessment.pre_pass_lockout_hours ?? 24;
    const RETAKE_DAYS = assessment.post_pass_retake_days ?? 7;
    const NOW = new Date();

    // 2) Fetch all finished attempts for state machine
    const { data: allAttempts } = await db
      .from("unit_mastery_attempts")
      .select("id, passed, percentage, started_at, completed_at, variant_id, status, attempt_number")
      .eq("student_id", userId)
      .eq("assessment_id", assessment_id)
      .in("status", ["completed", "timed_out"])
      .order("started_at", { ascending: true });

    const attempts = allAttempts ?? [];
    const passedAttempt = attempts.find((a: any) => a.passed === true) ?? null;
    const failedAttempts = attempts.filter((a: any) => a.passed === false);

    // ─── POST-PASS BRANCH ───
    if (passedAttempt) {
      const passedAt = new Date(passedAttempt.started_at);
      const daysSincePass = (NOW.getTime() - passedAt.getTime()) / 86400000;
      const attemptsAfterPass = attempts.filter(
        (a: any) => new Date(a.started_at) > passedAt
      );

      // Already used the retake → locked permanently
      if (attemptsAfterPass.length >= 1) {
        return errResp("cannot_start", {
          reason: "complete",
          message: "لقد أكملتِ هذا التقييم. لا يمكن إعادة المحاولة بعد الآن.",
          best_score: passedAttempt.percentage,
        });
      }

      // Within 7-day cooling window → not yet eligible for retake
      if (daysSincePass < RETAKE_DAYS) {
        const retakeAt = new Date(passedAt.getTime() + RETAKE_DAYS * 86400000).toISOString();
        return errResp("cannot_start", {
          reason: "passed_cooling",
          message: `يمكنكِ إعادة المحاولة لتحسين درجتكِ بعد ${RETAKE_DAYS} أيام من نجاحكِ.`,
          retake_available_at: retakeAt,
          current_score: passedAttempt.percentage,
        });
      }

      // Post-pass retake allowed — pick random variant, preferring not the one that was passed
      const { data: passedVar } = await db
        .from("unit_mastery_variants")
        .select("variant_code")
        .eq("id", passedAttempt.variant_id)
        .single();
      const exclude = (passedVar as any)?.variant_code ?? "";
      const retakeOptions = ["A", "B", "C"].filter((c) => c !== exclude);
      const variantCode = retakeOptions[Math.floor(Math.random() * retakeOptions.length)];

      const { data: variant } = await db
        .from("unit_mastery_variants")
        .select("id")
        .eq("assessment_id", assessment_id)
        .eq("variant_code", variantCode)
        .single();
      if (!variant) return errResp("Variant not found", {}, 404);

      const { data: questions } = await db
        .from("unit_mastery_questions")
        .select("id, order_index, question_type, skill_tag, question_text, question_context, options, points")
        .eq("variant_id", (variant as any).id)
        .order("order_index");
      if (!questions || questions.length === 0) {
        return new Response(JSON.stringify({ error: "no_questions", message: "هذا الاختبار غير متوفر حالياً." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const totalPossible = questions.reduce((sum: number, q: any) => sum + q.points, 0);
      const attemptNumber = attempts.length + 1;

      const { data: attempt, error: insertErr } = await db
        .from("unit_mastery_attempts")
        .insert({
          student_id: userId,
          assessment_id,
          variant_id: (variant as any).id,
          attempt_number: attemptNumber,
          total_possible: totalPossible,
          status: "in_progress",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      const safeQuestions = questions.map((q: any) => ({
        id: q.id, order_index: q.order_index, question_type: q.question_type,
        skill_tag: q.skill_tag, question_text: q.question_text,
        question_context: q.question_context, options: q.options, points: q.points,
      }));

      return new Response(JSON.stringify({
        attempt_id: (attempt as any).id,
        variant_code: variantCode,
        attempt_number: attemptNumber,
        questions: safeQuestions,
        total_possible: totalPossible,
        time_limit_seconds: assessment.time_limit_seconds,
        max_attempts: MAX_ATTEMPTS,
        mode: "post_pass_retake",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PRE-PASS BRANCH ───

    // Compute current cycle position
    let cyclePos = 0;
    for (let i = 0; i < failedAttempts.length; i++) {
      if (i > 0) {
        const prev = new Date((failedAttempts[i - 1] as any).started_at);
        const cur = new Date((failedAttempts[i] as any).started_at);
        const hoursBetween = (cur.getTime() - prev.getTime()) / 3600000;
        if (hoursBetween >= LOCKOUT_HOURS) {
          cyclePos = 0; // new cycle started after lockout gap
        }
      }
      cyclePos++;
    }

    const lastFail = failedAttempts.length > 0
      ? failedAttempts[failedAttempts.length - 1]
      : null;

    // 3-fail lockout check
    if (cyclePos >= MAX_ATTEMPTS && lastFail) {
      const lastFailAt = new Date((lastFail as any).started_at);
      const hoursSinceLast = (NOW.getTime() - lastFailAt.getTime()) / 3600000;
      if (hoursSinceLast < LOCKOUT_HOURS) {
        const lockoutEndsAt = new Date(lastFailAt.getTime() + LOCKOUT_HOURS * 3600000).toISOString();
        return errResp("cannot_start", {
          reason: "locked_out",
          message: `استنفدتِ محاولاتكِ الـ${MAX_ATTEMPTS}. يمكنكِ المحاولة من جديد بعد ${LOCKOUT_HOURS} ساعة من آخر محاولة.`,
          lockout_ends_at: lockoutEndsAt,
        });
      }
      // 24h passed → cycle resets
      cyclePos = 0;
    }

    // Inter-attempt cooldown (60 min between fails within a cycle)
    if (cyclePos > 0 && lastFail) {
      const lastFailTime = new Date(
        (lastFail as any).completed_at || (lastFail as any).started_at
      );
      const minSinceLast = (NOW.getTime() - lastFailTime.getTime()) / 60000;
      if (minSinceLast < COOLDOWN_MIN) {
        const cooldownEndsAt = new Date(lastFailTime.getTime() + COOLDOWN_MIN * 60000).toISOString();
        return errResp("cannot_start", {
          reason: "cooldown",
          message: `يرجى الانتظار ${Math.ceil(COOLDOWN_MIN - minSinceLast)} دقيقة قبل المحاولة التالية.`,
          cooldown_ends_at: cooldownEndsAt,
        });
      }
    }

    // Pick variant by cycle position (A=first attempt, B=second, C=third)
    const variantCode = ["A", "B", "C"][cyclePos] ?? "A";

    const { data: variant } = await db
      .from("unit_mastery_variants")
      .select("id")
      .eq("assessment_id", assessment_id)
      .eq("variant_code", variantCode)
      .single();

    if (!variant) {
      return new Response(JSON.stringify({ error: "Variant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: questions } = await db
      .from("unit_mastery_questions")
      .select("id, order_index, question_type, skill_tag, question_text, question_context, options, points")
      .eq("variant_id", (variant as any).id)
      .order("order_index");

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_questions", message: "هذا الاختبار غير متوفر حالياً." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalPossible = questions.reduce((sum: number, q: any) => sum + q.points, 0);
    const attemptNumber = attempts.length + 1;

    const { data: attempt, error: insertErr } = await db
      .from("unit_mastery_attempts")
      .insert({
        student_id: userId,
        assessment_id,
        variant_id: (variant as any).id,
        attempt_number: attemptNumber,
        total_possible: totalPossible,
        status: "in_progress",
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;

    const safeQuestions = questions.map((q: any) => ({
      id: q.id, order_index: q.order_index, question_type: q.question_type,
      skill_tag: q.skill_tag, question_text: q.question_text,
      question_context: q.question_context, options: q.options, points: q.points,
    }));

    return new Response(
      JSON.stringify({
        attempt_id: (attempt as any).id,
        variant_code: variantCode,
        attempt_number: attemptNumber,
        questions: safeQuestions,
        total_possible: totalPossible,
        time_limit_seconds: assessment.time_limit_seconds,
        max_attempts: MAX_ATTEMPTS,
        mode: "pre_pass",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("unit-mastery-start error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
