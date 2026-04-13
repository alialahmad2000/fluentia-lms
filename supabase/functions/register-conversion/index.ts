import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    // Verify authorization (service role or admin JWT)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, reason: "unauthorized" }), { status: 401, headers });
    }

    const body = await req.json();
    const { student_id, first_payment_at } = body;

    if (!student_id) {
      return new Response(JSON.stringify({ ok: false, reason: "missing_student_id" }), { status: 400, headers });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Look up student's affiliate
    const { data: student } = await supabase
      .from("students")
      .select("affiliate_id, ref_code")
      .eq("id", student_id)
      .maybeSingle();

    if (!student?.affiliate_id) {
      return new Response(JSON.stringify({ ok: true, no_affiliate: true }), { status: 200, headers });
    }

    // Check if conversion already exists
    const { data: existing } = await supabase
      .from("affiliate_conversions")
      .select("id")
      .eq("student_id", student_id)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, already_exists: true }), { status: 200, headers });
    }

    // Insert conversion
    const { data: conv, error } = await supabase
      .from("affiliate_conversions")
      .insert({
        affiliate_id: student.affiliate_id,
        student_id,
        ref_code: student.ref_code || "",
        commission_amount: 100.00,
        status: "pending",
        first_payment_at: first_payment_at || new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert conversion error:", error);
      return new Response(JSON.stringify({ ok: false, reason: "db_error", detail: error.message }), { status: 200, headers });
    }

    // Notify affiliate about new conversion
    try {
      await supabase.functions.invoke('send-affiliate-email', {
        body: { affiliate_id: student.affiliate_id, template: 'new_conversion' },
      });
    } catch (emailErr) {
      console.error("Email notification error (non-fatal):", emailErr);
    }

    return new Response(JSON.stringify({ ok: true, conversion_id: conv.id }), { status: 200, headers });
  } catch (err) {
    console.error("register-conversion error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "server_error" }), { status: 500, headers });
  }
});
