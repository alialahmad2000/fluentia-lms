import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  const headers = { "Content-Type": "application/json" };

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Compute previous month range
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    const periodStart = start.toISOString().slice(0, 10);
    const periodEnd = end.toISOString().slice(0, 10);

    // Get all approved conversions with no payout
    const { data: conversions, error: fetchErr } = await supabase
      .from("affiliate_conversions")
      .select("id, affiliate_id, commission_amount")
      .eq("status", "approved")
      .is("payout_id", null);

    if (fetchErr) {
      console.error("Fetch conversions error:", fetchErr);
      return new Response(JSON.stringify({ ok: false, reason: "fetch_error" }), { status: 500, headers });
    }

    if (!conversions || conversions.length === 0) {
      return new Response(JSON.stringify({ ok: true, created: 0, message: "No approved conversions without payouts" }), { status: 200, headers });
    }

    // Group by affiliate
    const byAffiliate: Record<string, { ids: string[]; total: number }> = {};
    for (const c of conversions) {
      if (!byAffiliate[c.affiliate_id]) {
        byAffiliate[c.affiliate_id] = { ids: [], total: 0 };
      }
      byAffiliate[c.affiliate_id].ids.push(c.id);
      byAffiliate[c.affiliate_id].total += Number(c.commission_amount);
    }

    let created = 0;

    for (const [affiliateId, { ids, total }] of Object.entries(byAffiliate)) {
      if (total < 200) {
        console.log(`Skipping ${affiliateId}: ${total} SAR (below 200 minimum)`);
        continue;
      }

      // Create payout
      const { data: payout, error: insertErr } = await supabase
        .from("affiliate_payouts")
        .insert({
          affiliate_id: affiliateId,
          amount: total,
          conversion_count: ids.length,
          period_start: periodStart,
          period_end: periodEnd,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error(`Payout insert error for ${affiliateId}:`, insertErr);
        continue;
      }

      // Link conversions to this payout
      const { error: updateErr } = await supabase
        .from("affiliate_conversions")
        .update({ payout_id: payout.id })
        .in("id", ids);

      if (updateErr) {
        console.error(`Conversion link error for ${affiliateId}:`, updateErr);
        continue;
      }

      created++;
      console.log(`Created payout for ${affiliateId}: ${total} SAR (${ids.length} conversions)`);
    }

    return new Response(JSON.stringify({ ok: true, created, period: `${periodStart} — ${periodEnd}` }), { status: 200, headers });
  } catch (err) {
    console.error("generate-monthly-payouts error:", err);
    return new Response(JSON.stringify({ ok: false, reason: "server_error" }), { status: 500, headers });
  }
});
