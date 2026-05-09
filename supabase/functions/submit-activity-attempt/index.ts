import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Grading ─────────────────────────────────────────────────────────────────
function normalize(s: string) { return String(s).trim().toLowerCase() }

function gradeQuestion(
  question_type: string,
  correct_answer: unknown,
  accepted_answers: unknown,
  student_answer: unknown,
): boolean {
  if (student_answer == null) return false

  switch (question_type) {
    case "mcq":
    case "true_false":
      return String(student_answer) === String(correct_answer)

    case "fill_blank": {
      const ca = normalize(correct_answer as string)
      if (normalize(student_answer as string) === ca) return true
      if (Array.isArray(accepted_answers)) {
        return accepted_answers.some((a: string) => normalize(a) === normalize(student_answer as string))
      }
      return false
    }

    case "matching": {
      if (!Array.isArray(correct_answer) || !Array.isArray(student_answer)) return false
      if (correct_answer.length !== (student_answer as unknown[]).length) return false
      const map = new Map(
        (correct_answer as {left: string; right: string}[]).map(p => [String(p.left), String(p.right)])
      )
      return (student_answer as {left: string; right: string}[]).every(
        p => map.get(String(p.left)) === String(p.right)
      )
    }

    case "ordering": {
      if (!Array.isArray(correct_answer) || !Array.isArray(student_answer)) return false
      return JSON.stringify(student_answer) === JSON.stringify(correct_answer)
    }

    default:
      return false
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const db = createClient(SUPABASE_URL, SUPABASE_SVC_KEY)

    // Verify caller identity
    const { data: { user }, error: authErr } = await db.auth.getUser(
      authHeader.replace("Bearer ", "")
    )
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { attempt_id } = await req.json()
    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Load attempt — must belong to user and be in_progress
    const { data: attempt, error: attErr } = await db
      .from("activity_attempts")
      .select("*, curriculum_assessments:activity_id(questions, passing_score, assessment_type, is_promotion_gate)")
      .eq("id", attempt_id)
      .eq("student_id", user.id)
      .eq("status", "in_progress")
      .is("deleted_at", null)
      .single()

    if (attErr || !attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found or already submitted" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const assessment = (attempt as any).curriculum_assessments
    const questions: any[] = assessment?.questions ?? []
    const studentAnswers: Record<string, unknown> = (attempt as any).answers ?? {}

    // Grade each question
    let correctCount = 0
    const gradedDetails: any[] = []

    for (const q of questions) {
      const studentAnswer = studentAnswers[q.id] ?? null
      const isCorrect = gradeQuestion(
        q.question_type ?? "mcq",
        q.correct_answer,
        q.accepted_answers ?? null,
        studentAnswer,
      )
      if (isCorrect) correctCount++
      gradedDetails.push({
        question_id:    q.id,
        student_answer: studentAnswer,
        correct_answer: q.correct_answer,
        is_correct:     isCorrect,
      })
    }

    const total = questions.length
    const score = total > 0 ? Math.round((correctCount / total) * 100) : 0
    const passingScore = assessment?.passing_score ?? 70
    const passed = score >= passingScore

    // Update attempt to submitted
    const { error: updateErr } = await db
      .from("activity_attempts")
      .update({
        status:          "submitted",
        submitted_at:    new Date().toISOString(),
        score,
        correct_count:   correctCount,
        total_questions: total,
        graded_details:  gradedDetails,
      })
      .eq("id", attempt_id)

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to save submission" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Award XP if passed (non-assessment / practice only; assessments award separately)
    if (passed && assessment?.assessment_type !== "level_cumulative") {
      const xpAmount = Math.round(score * 0.5) // 50 XP for 100%
      await db.rpc("log_activity", {
        p_student_id:    user.id,
        p_event_type:    "activity_completed",
        p_ref_table:     "activity_attempts",
        p_ref_id:        attempt_id,
        p_xp_delta:      xpAmount,
        p_skill_impact:  { overall: 1 },
        p_metadata:      { score, passed, assessment_type: assessment?.assessment_type },
      }).catch(() => {})
    }

    return new Response(
      JSON.stringify({ success: true, score, correct_count: correctCount, total_questions: total, passed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e) {
    console.error("submit-activity-attempt error:", e)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
