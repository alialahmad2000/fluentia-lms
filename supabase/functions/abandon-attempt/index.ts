import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SVC_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // Verify ownership and current status
    const { data: attempt, error: attErr } = await db
      .from("activity_attempts")
      .select("id, student_id, status")
      .eq("id", attempt_id)
      .eq("student_id", user.id)
      .eq("status", "in_progress")
      .is("deleted_at", null)
      .single()

    if (attErr || !attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found, already completed, or not yours" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { error: updateErr } = await db
      .from("activity_attempts")
      .update({ status: "abandoned", abandoned_at: new Date().toISOString() })
      .eq("id", attempt_id)

    if (updateErr) {
      return new Response(JSON.stringify({ error: "Failed to abandon attempt" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e) {
    console.error("abandon-attempt error:", e)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
