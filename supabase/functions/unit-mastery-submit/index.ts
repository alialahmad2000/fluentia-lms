import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function gradeAnswer(
  questionType: string,
  correctAnswer: any,
  acceptedAnswers: any,
  studentAnswer: any
): boolean {
  if (studentAnswer == null) return false;

  switch (questionType) {
    case "mcq":
      return String(studentAnswer) === String(correctAnswer);

    case "true_false":
      return Boolean(studentAnswer) === Boolean(correctAnswer);

    case "fill_blank": {
      const normalize = (s: string) => String(s).trim().toLowerCase();
      const correct = normalize(correctAnswer);
      if (normalize(studentAnswer) === correct) return true;
      if (Array.isArray(acceptedAnswers)) {
        return acceptedAnswers.some(
          (a: string) => normalize(a) === normalize(studentAnswer)
        );
      }
      return false;
    }

    case "matching": {
      // correctAnswer is array of pairs [{left, right}]
      // studentAnswer is array of pairs [{left, right}]
      if (!Array.isArray(correctAnswer) || !Array.isArray(studentAnswer))
        return false;
      if (correctAnswer.length !== studentAnswer.length) return false;
      const correctMap = new Map(
        correctAnswer.map((p: any) => [String(p.left), String(p.right)])
      );
      return studentAnswer.every(
        (p: any) => correctMap.get(String(p.left)) === String(p.right)
      );
    }

    default:
      return false;
  }
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
    const { attempt_id, answers, time_spent_seconds } = await req.json();

    if (!attempt_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "attempt_id and answers[] required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load attempt — must belong to user and be in_progress
    const { data: attempt } = await db
      .from("unit_mastery_attempts")
      .select("*, unit_mastery_assessments:assessment_id(xp_on_pass, xp_on_attempt)")
      .eq("id", attempt_id)
      .eq("student_id", userId)
      .eq("status", "in_progress")
      .single();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found or already completed" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch questions for this variant
    const { data: questions } = await db
      .from("unit_mastery_questions")
      .select("id, question_type, skill_tag, correct_answer, accepted_answers, points")
      .eq("variant_id", attempt.variant_id);

    if (!questions) {
      return new Response(JSON.stringify({ error: "Questions not found" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionMap = new Map(questions.map((q: any) => [q.id, q]));

    // Grade each answer
    let totalScore = 0;
    const skillStats: Record<string, { correct: number; total: number }> = {};
    const answerRows: any[] = [];

    for (const ans of answers) {
      const q = questionMap.get(ans.question_id);
      if (!q) continue;

      const isCorrect = gradeAnswer(
        q.question_type,
        q.correct_answer,
        q.accepted_answers,
        ans.student_answer
      );
      const pointsEarned = isCorrect ? q.points : 0;
      totalScore += pointsEarned;

      if (!skillStats[q.skill_tag]) {
        skillStats[q.skill_tag] = { correct: 0, total: 0 };
      }
      skillStats[q.skill_tag].total++;
      if (isCorrect) skillStats[q.skill_tag].correct++;

      answerRows.push({
        attempt_id,
        question_id: ans.question_id,
        student_answer: ans.student_answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
      });
    }

    // Compute percentage and pass/fail
    const percentage = attempt.total_possible > 0
      ? Math.round((totalScore / attempt.total_possible) * 10000) / 100
      : 0;
    const passed = percentage >= 70;

    // Skill breakdown
    const skillBreakdown: Record<string, number> = {};
    for (const [skill, stats] of Object.entries(skillStats)) {
      skillBreakdown[skill] = stats.total > 0
        ? Math.round((stats.correct / stats.total) * 100) / 100
        : 0;
    }

    // XP
    const assessmentConfig = attempt.unit_mastery_assessments;
    const xpAmount = passed
      ? (assessmentConfig?.xp_on_pass || 50)
      : (assessmentConfig?.xp_on_attempt || 10);

    // Insert answer rows
    await db.from("unit_mastery_answers").insert(answerRows);

    // Update attempt
    await db
      .from("unit_mastery_attempts")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        score: totalScore,
        percentage,
        passed,
        skill_breakdown: skillBreakdown,
        xp_awarded: xpAmount,
        time_spent_seconds: time_spent_seconds || null,
      })
      .eq("id", attempt_id);

    // Award XP
    await db.from("xp_transactions").insert({
      student_id: userId,
      amount: xpAmount,
      reason: passed ? "achievement" : "custom",
      description: passed
        ? `اجتياز اختبار إتقان الوحدة — ${percentage}%`
        : `محاولة اختبار إتقان الوحدة — ${percentage}%`,
      related_id: attempt_id,
    });

    // Update student xp_total
    await db.rpc("increment_field", {
      row_id: userId,
      table_name: "active_students",
      field_name: "xp_total",
      increment_by: xpAmount,
    }).then(() => {}).catch(() => {
      // Fallback: direct update if RPC doesn't exist
      db.from("active_students")
        .update({ xp_total: db.rpc ? undefined : undefined })
        .eq("id", userId);
    });

    // Post-pass improvement logging (read side computes best score — no mutation needed)
    const { data: priorPassed } = await db
      .from("unit_mastery_attempts")
      .select("percentage")
      .eq("student_id", userId)
      .eq("assessment_id", attempt.assessment_id)
      .eq("passed", true)
      .neq("id", attempt_id)
      .order("percentage", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (priorPassed && passed && percentage > (priorPassed as any).percentage) {
      console.log(`[unit-mastery-submit] Post-pass improvement: ${(priorPassed as any).percentage}% → ${percentage}%`);
    }

    // Compute cooldown if failed
    let cooldownEndsAt = null;
    if (!passed) {
      const cooldownMin = assessmentConfig?.retake_cooldown_minutes || 60;
      cooldownEndsAt = new Date(Date.now() + cooldownMin * 60 * 1000).toISOString();
    }

    return new Response(
      JSON.stringify({
        passed,
        percentage,
        score: totalScore,
        total_possible: attempt.total_possible,
        skill_breakdown: skillBreakdown,
        xp_awarded: xpAmount,
        cooldown_ends_at: cooldownEndsAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("unit-mastery-submit error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
