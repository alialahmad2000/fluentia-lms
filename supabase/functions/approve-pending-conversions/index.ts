import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Find pending conversions older than 14 days
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: pending, error: fetchErr } = await supabase
      .from("affiliate_conversions")
      .select("id")
      .eq("status", "pending")
      .lt("first_payment_at", cutoff);

    if (fetchErr) {
      console.error("Fetch pending error:", fetchErr);
      return new Response(JSON.stringify({ ok: false, reason: "fetch_error" }), { status: 500, headers });
    }

    if (!pending || pending.length === 0) {
      console.log("No pending conversions to approve.");
      return new Response(JSON.stringify({ ok: true, approved: 0 }), { status: 200, headers });
    }

    const ids = pending.map((c) => c.id);

    const { error: updateErr } = await supabase
      .from("affiliate_conversions")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .in("id", ids);

    if (updateErr) {
      console.error("Update error:", updateErr);
      return new Response(JSON.stringify({ ok: false, reason: "update_error" }), { status: 500, headers });
    }

    console.log(`Approved ${ids.length} conversions.`);
    return new Response(JSON.stringify({ ok: true, approved: ids.length }), { status: 200, headers });
  } catch (err) {
    console.error("approve-pending-conversions error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "server_error" }), { status: 500, headers });
  }
});
