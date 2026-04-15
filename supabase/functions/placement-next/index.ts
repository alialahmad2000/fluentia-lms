import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CEFR theta boundaries
const CEFR_BOUNDARIES = [
  { level: "pre_a1", max: -0.5, fluentia: 0 },
  { level: "a1", max: 0.5, fluentia: 1 },
  { level: "a2", max: 1.5, fluentia: 2 },
  { level: "b1", max: 2.25, fluentia: 3 },
  { level: "b2", max: 2.8, fluentia: 4 },
  { level: "c1", max: Infinity, fluentia: 5 },
];

function thetaToCefr(theta: number): { cefr: string; level: number } {
  for (const b of CEFR_BOUNDARIES) {
    if (theta < b.max) return { cefr: b.level, level: b.fluentia };
  }
  return { cefr: "c1", level: 5 };
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    let { session_id, answer } = body as {
      session_id?: string;
      answer?: {
        question_id: string;
        selected_option_id: string;
        response_time_ms: number;
      };
    };

    // ─── START OR RESUME SESSION ───
    if (!session_id) {
      // Check for in-progress session
      const { data: existing } = await db
        .from("placement_sessions")
        .select("id")
        .eq("student_id", userId)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (existing) {
        session_id = existing.id;
      } else {
        // Check 30-day cooldown
        const { data: lastCompleted } = await db
          .from("placement_sessions")
          .select("completed_at")
          .eq("student_id", userId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        if (lastCompleted?.completed_at) {
          const daysSince = Math.floor(
            (Date.now() - new Date(lastCompleted.completed_at).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysSince < 30) {
            return new Response(
              JSON.stringify({
                error: "cooldown",
                retry_after_days: 30 - daysSince,
              }),
              {
                status: 429,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }

        // Create new session
        const sessionSeed = Math.floor(Math.random() * 2147483647);
        const { data: newSession, error: insertErr } = await db
          .from("placement_sessions")
          .insert({
            student_id: userId,
            session_seed: sessionSeed,
            current_theta: 1.0,
            question_count: 0,
            target_question_count: 14,
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        session_id = newSession.id;
      }
    }

    // Load session
    const { data: session, error: sessErr } = await db
      .from("placement_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("student_id", userId)
      .single();

    if (sessErr || !session) {
      return new Response(
        JSON.stringify({ error: "Session not found or not yours" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (session.status === "completed") {
      // Return existing result
      const { data: result } = await db
        .from("placement_results")
        .select("*")
        .eq("session_id", session_id)
        .single();
      return new Response(JSON.stringify({ done: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let currentTheta = parseFloat(session.current_theta);
    let questionCount = session.question_count;

    // ─── GRADE ANSWER ───
    if (answer) {
      const { data: question } = await db
        .from("placement_question_bank")
        .select("correct_option_id, difficulty")
        .eq("id", answer.question_id)
        .single();

      if (!question) {
        return new Response(
          JSON.stringify({ error: "Question not found" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const isCorrect =
        answer.selected_option_id === question.correct_option_id;
      const difficulty = parseFloat(question.difficulty);
      const thetaBefore = currentTheta;

      if (isCorrect) {
        currentTheta =
          currentTheta + (difficulty - currentTheta + 1) * 0.4;
      } else {
        currentTheta =
          currentTheta - (currentTheta - difficulty + 1) * 0.4;
      }
      currentTheta = clamp(currentTheta, -1.0, 4.0);
      questionCount++;

      // Update response row
      await db
        .from("placement_responses")
        .update({
          selected_option_id: answer.selected_option_id,
          is_correct: isCorrect,
          theta_after: currentTheta,
          response_time_ms: answer.response_time_ms,
          answered_at: new Date().toISOString(),
        })
        .eq("session_id", session_id)
        .eq("question_id", answer.question_id);

      // Update session
      await db
        .from("placement_sessions")
        .update({
          current_theta: currentTheta,
          question_count: questionCount,
        })
        .eq("id", session_id);
    }

    // ─── CHECK STOPPING CONDITIONS ───
    let shouldStop = false;

    if (questionCount >= session.target_question_count) {
      shouldStop = true;
    }

    if (questionCount >= 10 && !shouldStop) {
      // Check oscillation: last 3 responses theta change < 0.15
      const { data: recentResponses } = await db
        .from("placement_responses")
        .select("theta_before, theta_after")
        .eq("session_id", session_id)
        .not("theta_after", "is", null)
        .order("question_order", { ascending: false })
        .limit(3);

      if (recentResponses && recentResponses.length >= 3) {
        const totalChange = recentResponses.reduce(
          (sum: number, r: { theta_before: number; theta_after: number }) =>
            sum + Math.abs(parseFloat(String(r.theta_after)) - parseFloat(String(r.theta_before))),
          0
        );
        if (totalChange < 0.15) shouldStop = true;
      }
    }

    // ─── FINALIZE SESSION ───
    if (shouldStop && questionCount > 0) {
      const { cefr: finalCefr, level: finalLevel } =
        thetaToCefr(currentTheta);

      // Compute skill breakdown from responses
      const { data: allResponses } = await db
        .from("placement_responses")
        .select("question_id, is_correct")
        .eq("session_id", session_id)
        .not("is_correct", "is", null);

      const skillStats: Record<string, { correct: number; total: number }> = {
        grammar: { correct: 0, total: 0 },
        vocabulary: { correct: 0, total: 0 },
        reading: { correct: 0, total: 0 },
        context: { correct: 0, total: 0 },
      };

      if (allResponses) {
        const questionIds = allResponses.map(
          (r: { question_id: string }) => r.question_id
        );
        const { data: questionSkills } = await db
          .from("placement_question_bank")
          .select("id, skill")
          .in("id", questionIds);

        const skillMap = new Map(
          (questionSkills || []).map((q: { id: string; skill: string }) => [
            q.id,
            q.skill,
          ])
        );

        for (const r of allResponses) {
          const skill = skillMap.get(r.question_id) || "grammar";
          if (skillStats[skill]) {
            skillStats[skill].total++;
            if (r.is_correct) skillStats[skill].correct++;
          }
        }
      }

      const skillBreakdown: Record<string, number> = {};
      for (const [skill, stats] of Object.entries(skillStats)) {
        skillBreakdown[skill] =
          stats.total > 0
            ? Math.round((stats.correct / stats.total) * 100) / 100
            : 0;
      }

      // Determine alternate level
      const spread =
        Math.max(...Object.values(skillBreakdown)) -
        Math.min(...Object.values(skillBreakdown));
      let alternateLevel: number;
      if (spread > 0.4 && finalLevel > 0) {
        alternateLevel = finalLevel - 1;
      } else {
        alternateLevel = Math.min(5, finalLevel + 1);
      }

      // Strengths/weaknesses
      const sorted = Object.entries(skillBreakdown).sort(
        (a, b) => b[1] - a[1]
      );
      const skillLabels: Record<string, string> = {
        grammar: "قواعد",
        vocabulary: "مفردات",
        reading: "قراءة",
        context: "سياق",
      };
      const strengths = sorted
        .filter((s) => s[1] >= 0.6)
        .map((s) => skillLabels[s[0]]);
      const weaknesses = sorted
        .filter((s) => s[1] < 0.5)
        .map((s) => skillLabels[s[0]]);

      // Find recommended groups
      const { data: groups } = await db
        .from("groups")
        .select("id, name, level, max_students")
        .eq("is_active", true)
        .in("level", [finalLevel, alternateLevel]);

      // Count students per group via active_students
      let recommendedGroupId = null;
      let alternateGroupId = null;

      if (groups && groups.length > 0) {
        for (const g of groups) {
          const { count } = await db
            .from("active_students")
            .select("id", { count: "exact", head: true })
            .eq("group_id", g.id);
          (g as any).currentCount = count || 0;
        }

        const primaryGroups = groups
          .filter((g: any) => g.level === finalLevel && g.currentCount < g.max_students)
          .sort((a: any, b: any) => a.currentCount - b.currentCount);

        const altGroups = groups
          .filter((g: any) => g.level === alternateLevel && g.currentCount < g.max_students)
          .sort((a: any, b: any) => a.currentCount - b.currentCount);

        if (primaryGroups.length > 0) recommendedGroupId = primaryGroups[0].id;
        if (altGroups.length > 0) alternateGroupId = altGroups[0].id;
      }

      // Update session
      await db
        .from("placement_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          final_cefr: finalCefr,
          final_level: finalLevel,
          alternate_level: alternateLevel,
          skill_breakdown: skillBreakdown,
        })
        .eq("id", session_id);

      // Insert result
      const { data: result } = await db
        .from("placement_results")
        .insert({
          session_id,
          student_id: userId,
          recommended_level: finalLevel,
          alternate_level: alternateLevel,
          recommended_group_id: recommendedGroupId,
          alternate_group_id: alternateGroupId,
          skill_breakdown: skillBreakdown,
          strengths,
          weaknesses,
          admin_action: "pending",
        })
        .select()
        .single();

      return new Response(JSON.stringify({ done: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── PICK NEXT QUESTION ───
    // Get already-seen question IDs
    const { data: seenRows } = await db
      .from("placement_responses")
      .select("question_id")
      .eq("session_id", session_id);

    const seenIds = (seenRows || []).map(
      (r: { question_id: string }) => r.question_id
    );

    // Skill balance check
    const { data: skillCounts } = await db
      .from("placement_responses")
      .select("question_id")
      .eq("session_id", session_id);

    let excludeSkill: string | null = null;
    if (skillCounts && skillCounts.length > 0) {
      const scIds = skillCounts.map(
        (r: { question_id: string }) => r.question_id
      );
      const { data: scQuestions } = await db
        .from("placement_question_bank")
        .select("skill")
        .in("id", scIds);

      if (scQuestions) {
        const counts: Record<string, number> = {};
        for (const q of scQuestions) {
          counts[q.skill] = (counts[q.skill] || 0) + 1;
        }
        const total = scQuestions.length;
        for (const [skill, count] of Object.entries(counts)) {
          if (count > total / 4 + 1) {
            excludeSkill = skill;
            break;
          }
        }
      }
    }

    // Query candidates
    let query = db
      .from("placement_question_bank")
      .select("id, question_text, question_context, options, skill, difficulty")
      .eq("is_active", true)
      .gte("difficulty", currentTheta - 0.75)
      .lte("difficulty", currentTheta + 0.75);

    if (seenIds.length > 0) {
      // Filter out seen questions — use not.in
      query = query.not("id", "in", `(${seenIds.join(",")})`);
    }

    if (excludeSkill) {
      query = query.neq("skill", excludeSkill);
    }

    const { data: candidates } = await query.limit(20);

    if (!candidates || candidates.length === 0) {
      // Widen search if no candidates
      const { data: wideCandidates } = await db
        .from("placement_question_bank")
        .select(
          "id, question_text, question_context, options, skill, difficulty"
        )
        .eq("is_active", true)
        .not(
          "id",
          "in",
          seenIds.length > 0 ? `(${seenIds.join(",")})` : "()"
        )
        .limit(20);

      if (!wideCandidates || wideCandidates.length === 0) {
        // No more questions — force stop
        // Recurse with stopping condition by setting high question count
        await db
          .from("placement_sessions")
          .update({ question_count: session.target_question_count })
          .eq("id", session_id);

        return new Response(
          JSON.stringify({
            done: false,
            error: "no_more_questions",
            message: "Question bank exhausted",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Pick from wide candidates
      const pick =
        wideCandidates[
          Math.abs(session.session_seed + questionCount) %
            wideCandidates.length
        ];
      return await serveQuestion(db, session_id, pick, questionCount, currentTheta, session.target_question_count);
    }

    // Pick using session seed for reproducibility
    const pick =
      candidates[
        Math.abs(session.session_seed + questionCount) % candidates.length
      ];

    return await serveQuestion(db, session_id, pick, questionCount, currentTheta, session.target_question_count);
  } catch (err: any) {
    console.error("placement-next error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function serveQuestion(
  db: any,
  sessionId: string,
  question: any,
  questionCount: number,
  currentTheta: number,
  targetCount: number
) {
  // Insert stub response row
  await db.from("placement_responses").insert({
    session_id: sessionId,
    question_id: question.id,
    question_order: questionCount + 1,
    theta_before: currentTheta,
  });

  // Strip correct answer from options
  const safeOptions = question.options.map((o: any) => ({
    id: o.id,
    text: o.text,
  }));

  return new Response(
    JSON.stringify({
      done: false,
      session_id: sessionId,
      question: {
        id: question.id,
        question_text: question.question_text,
        question_context: question.question_context,
        options: safeOptions,
      },
      progress: {
        current: questionCount + 1,
        total: targetCount,
      },
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
