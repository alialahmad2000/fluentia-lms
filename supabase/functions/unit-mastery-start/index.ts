import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Check if student can start
    const { data: checkResult } = await db.rpc("fn_can_start_unit_assessment", {
      p_student_id: userId,
      p_assessment_id: assessment_id,
    });

    if (!checkResult?.can_start) {
      return new Response(JSON.stringify({ error: "cannot_start", details: checkResult }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count prior attempts for variant selection
    const { count: priorAttempts } = await db
      .from("unit_mastery_attempts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("assessment_id", assessment_id);

    const attemptNumber = (priorAttempts || 0) + 1;

    // Variant selection: A(1), B(2), C(3), then random excluding last
    let variantCode: string;
    if (attemptNumber <= 3) {
      variantCode = ["A", "B", "C"][attemptNumber - 1];
    } else {
      // Get last used variant
      const { data: lastAttempt } = await db
        .from("unit_mastery_attempts")
        .select("variant_id")
        .eq("student_id", userId)
        .eq("assessment_id", assessment_id)
        .order("attempt_number", { ascending: false })
        .limit(1)
        .single();

      let lastCode = "";
      if (lastAttempt) {
        const { data: lastVar } = await db
          .from("unit_mastery_variants")
          .select("variant_code")
          .eq("id", lastAttempt.variant_id)
          .single();
        lastCode = lastVar?.variant_code || "";
      }

      const options = ["A", "B", "C"].filter((c) => c !== lastCode);
      variantCode = options[Math.floor(Math.random() * options.length)];
    }

    // Get variant
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

    // Fetch questions (service role bypasses RLS)
    const { data: questions } = await db
      .from("unit_mastery_questions")
      .select("id, order_index, question_type, skill_tag, question_text, question_context, options, points")
      .eq("variant_id", variant.id)
      .order("order_index");

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_questions", message: "This assessment has no questions yet." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get assessment total_possible
    const totalPossible = questions.reduce((sum: number, q: any) => sum + q.points, 0);

    // Create attempt
    const { data: attempt, error: insertErr } = await db
      .from("unit_mastery_attempts")
      .insert({
        student_id: userId,
        assessment_id,
        variant_id: variant.id,
        attempt_number: attemptNumber,
        total_possible: totalPossible,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (insertErr) throw insertErr;

    // Strip correct answers from questions
    const safeQuestions = questions.map((q: any) => ({
      id: q.id,
      order_index: q.order_index,
      question_type: q.question_type,
      skill_tag: q.skill_tag,
      question_text: q.question_text,
      question_context: q.question_context,
      options: q.options,
      points: q.points,
    }));

    return new Response(
      JSON.stringify({
        attempt_id: attempt.id,
        variant_code: variantCode,
        attempt_number: attemptNumber,
        questions: safeQuestions,
        total_possible: totalPossible,
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
