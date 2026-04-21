import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendResend, welcomeEmail } from "../_shared/affiliate-emails.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { affiliate_id } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user: caller } } = await admin.auth.getUser(token);
    if (!caller) return json({ error: "unauthorized" }, 401);
    const { data: callerProfile } = await admin
      .from("profiles").select("role").eq("id", caller.id).single();
    if (callerProfile?.role !== "admin") return json({ error: "admin only" }, 403);

    const { data: aff } = await admin
      .from("affiliates").select("id,full_name,email,ref_code,status,user_id")
      .eq("id", affiliate_id).single();
    if (!aff) return json({ error: "not found" }, 404);
    if (aff.status !== "approved") return json({ error: "affiliate not approved" }, 400);

    // SAFETY: block if linked user is an admin/trainer
    if (aff.user_id) {
      const { data: collidingProfile } = await admin
        .from("profiles").select("id,role").eq("id", aff.user_id).maybeSingle();
      if (collidingProfile && ["admin", "trainer"].includes(collidingProfile.role)) {
        return json(
          {
            error: `هذا المسوّق مربوط بحساب ${
              collidingProfile.role === "admin" ? "مدير" : "مدرب"
            } — لا يمكن إعادة إرسال رابط دخول المسوّق. تحقّق من سلامة البيانات.`,
          },
          409
        );
      }
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: aff.email,
      options: { redirectTo: "https://app.fluentia.academy/partner/set-password" },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: "link generation failed", detail: linkErr?.message }, 500);
    }

    // Send welcome email inline
    let emailSent = false;
    let emailError: string | undefined;
    try {
      const { subject, html } = welcomeEmail({
        full_name: aff.full_name,
        ref_code: aff.ref_code,
        magic_link: linkData.properties.action_link,
      });
      await sendResend({ to: aff.email, subject, html });
      emailSent = true;
    } catch (emailErr) {
      console.error("resend welcome email failed:", emailErr);
      emailError = String(emailErr);
    }

    return json({
      success: true,
      email_sent: emailSent,
      email_error: emailError,
      affiliate: { id: aff.id, full_name: aff.full_name, email: aff.email, ref_code: aff.ref_code },
    });
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, "Content-Type": "application/json" },
  });
}
