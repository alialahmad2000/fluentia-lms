import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { sendResend, welcomeEmail } from "../_shared/affiliate-emails.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { affiliate_id } = await req.json();
    if (!affiliate_id) return json({ error: "affiliate_id required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ─── 1. Verify caller is admin ──────────────────────────────────────────
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) {
      console.error("auth.getUser failed:", authErr);
      return json({ error: "invalid token" }, 401);
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("id,role,email")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return json({ error: "admin only" }, 403);
    }

    // ─── 2. Load the affiliate row ─────────────────────────────────────────
    const { data: aff, error: affErr } = await admin
      .from("affiliates").select("*").eq("id", affiliate_id).single();
    if (affErr || !aff) {
      console.error("affiliate lookup failed:", affErr);
      return json({ error: "affiliate not found" }, 404);
    }

    const applicantEmail = (aff.email || "").toLowerCase().trim();
    if (!applicantEmail) return json({ error: "affiliate has no email" }, 400);

    // ─── 3. SAFETY: reject self-referral (use auth.users.email — always populated) ─
    if (applicantEmail === (caller.email || "").toLowerCase().trim()) {
      return json(
        { error: "هذا الإيميل هو إيميل الأدمن نفسه. لا يمكن اعتماد حساب مسوّق بإيميل الأدمن." },
        400
      );
    }

    // ─── 4. SAFETY: find auth user by email (SOURCE OF TRUTH for collisions) ─
    let existingAuthUser: any = null;
    let page = 1;
    while (true) {
      const { data: pageData, error: listErr } = await admin.auth.admin.listUsers({
        page, perPage: 1000,
      });
      if (listErr) {
        console.error("listUsers failed:", listErr);
        return json({ error: "failed to check existing users", detail: listErr.message }, 500);
      }
      const match = pageData?.users?.find(u => (u.email || "").toLowerCase() === applicantEmail);
      if (match) { existingAuthUser = match; break; }
      if (!pageData?.users || pageData.users.length < 1000) break;
      page++;
      if (page > 20) break;
    }

    // ─── 5. SAFETY: if auth user exists, check their profile role BY ID ────
    let userId: string;
    let didCreateUser = false;

    if (existingAuthUser) {
      const { data: existingProfile } = await admin
        .from("profiles")
        .select("id,role,email")
        .eq("id", existingAuthUser.id)
        .maybeSingle();

      if (existingProfile && ["admin", "trainer"].includes(existingProfile.role)) {
        return json(
          {
            error: `هذا الإيميل مربوط بحساب ${
              existingProfile.role === "admin" ? "مدير" : "مدرب"
            } في النظام. لا يمكن اعتماده كمسوّق. اطلب من المتقدم استخدام إيميل مختلف.`,
          },
          409
        );
      }

      if (existingProfile?.role === "student") {
        const { count: submissionCount } = await admin
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("student_id", existingAuthUser.id);
        if ((submissionCount ?? 0) > 0) {
          return json(
            { error: "هذا الإيميل مربوط بحساب طالب نشط في الأكاديمية. اطلب من المتقدم استخدام إيميل مختلف." },
            409
          );
        }
      }

      userId = existingAuthUser.id;
    } else {
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: aff.email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: aff.full_name, source: "affiliate" },
      });
      if (createErr || !created?.user) {
        console.error("createUser failed:", createErr);
        return json({ error: "failed to create auth user", detail: createErr?.message }, 500);
      }
      userId = created.user.id;
      didCreateUser = true;
    }

    // ─── 6. Upsert the profile as affiliate ─────────────────────────────────
    const { error: profileErr } = await admin.from("profiles").upsert(
      { id: userId, full_name: aff.full_name, email: aff.email, role: "affiliate", phone: aff.phone ?? null },
      { onConflict: "id" }
    );
    if (profileErr) {
      console.error("profile upsert failed:", profileErr);
      if (didCreateUser) {
        await admin.auth.admin.deleteUser(userId).catch(e => console.error("rollback failed:", e));
      }
      return json({ error: "failed to upsert profile", detail: profileErr.message }, 500);
    }

    // ─── 7. Update the affiliate row ───────────────────────────────────────
    const { error: updateErr } = await admin
      .from("affiliates")
      .update({ user_id: userId, status: "approved", approved_at: new Date().toISOString(), approved_by: caller.id })
      .eq("id", affiliate_id);
    if (updateErr) {
      console.error("affiliate update failed:", updateErr);
      if (didCreateUser) {
        await admin.auth.admin.deleteUser(userId).catch(e => console.error("rollback failed:", e));
      }
      return json({ error: "failed to update affiliate", detail: updateErr.message }, 500);
    }

    // ─── 8. Generate the magic link ────────────────────────────────────────
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: aff.email,
      options: { redirectTo: "https://app.fluentia.academy/partner/set-password" },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("generateLink failed:", linkErr);
      return json(
        { error: "approval succeeded but link generation failed — use resend button", detail: linkErr?.message },
        500
      );
    }

    // ─── 9. Send welcome email inline ──────────────────────────────────────
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
      console.error("welcome email failed:", emailErr);
      emailError = String(emailErr);
    }

    return json({
      success: true,
      email_sent: emailSent,
      email_error: emailError,
      user_id: userId,
      affiliate: { id: aff.id, full_name: aff.full_name, email: aff.email, ref_code: aff.ref_code },
    });
  } catch (e) {
    console.error("unhandled error:", e);
    return json({ error: "internal error", detail: String(e) }, 500);
  }
});
