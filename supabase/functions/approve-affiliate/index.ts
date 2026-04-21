import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

    // ─── 1. Verify caller is admin ────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) {
      console.error("auth.getUser failed:", authErr);
      return json({ error: "invalid token" }, 401);
    }

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role,email")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin") {
      return json({ error: "admin only" }, 403);
    }

    // ─── 2. Load the affiliate row ───────────────────────────────────────────
    const { data: aff, error: affErr } = await admin
      .from("affiliates")
      .select("*")
      .eq("id", affiliate_id)
      .single();
    if (affErr || !aff) {
      console.error("affiliate lookup failed:", affErr);
      return json({ error: "affiliate not found" }, 404);
    }

    const applicantEmail = (aff.email || "").toLowerCase().trim();
    if (!applicantEmail) return json({ error: "affiliate has no email" }, 400);

    // ─── 3. SAFETY: reject self-referral ─────────────────────────────────────
    if (applicantEmail === (callerProfile?.email || "").toLowerCase().trim()) {
      return json(
        {
          error:
            "هذا الإيميل هو إيميل الأدمن نفسه. لا يمكن اعتماد حساب مسوّق بإيميل الأدمن. اطلب من المتقدم استخدام إيميل مختلف.",
        },
        400
      );
    }

    // ─── 4. SAFETY: block admin/trainer email collisions ─────────────────────
    const { data: existingProfile } = await admin
      .from("profiles")
      .select("id,role,email")
      .ilike("email", applicantEmail)
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

    // ─── 5. Find or create the auth user ─────────────────────────────────────
    let userId: string | null = aff.user_id ?? existingProfile?.id ?? null;
    let didCreateUser = false;

    if (!userId) {
      const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listErr) {
        console.error("listUsers failed:", listErr);
        return json({ error: "failed to check existing users", detail: listErr.message }, 500);
      }
      const byEmail = usersList?.users?.find(
        (u) => u.email?.toLowerCase() === applicantEmail
      );
      if (byEmail) {
        userId = byEmail.id;
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
    }

    // ─── 6. Upsert the profile as affiliate ─────────────────────────────────
    const { error: profileErr } = await admin.from("profiles").upsert(
      {
        id: userId,
        full_name: aff.full_name,
        email: aff.email,
        role: "affiliate",
        phone: aff.phone ?? null,
      },
      { onConflict: "id" }
    );
    if (profileErr) {
      console.error("profile upsert failed:", profileErr);
      if (didCreateUser) {
        await admin.auth.admin.deleteUser(userId!).catch((e) =>
          console.error("rollback deleteUser failed:", e)
        );
      }
      return json({ error: "failed to upsert profile", detail: profileErr.message }, 500);
    }

    // ─── 7. Update the affiliate row ────────────────────────────────────────
    const { error: updateErr } = await admin
      .from("affiliates")
      .update({
        user_id: userId,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: caller.id,
      })
      .eq("id", affiliate_id);
    if (updateErr) {
      console.error("affiliate update failed:", updateErr);
      if (didCreateUser) {
        await admin.auth.admin.deleteUser(userId!).catch((e) =>
          console.error("rollback deleteUser failed:", e)
        );
      }
      return json({ error: "failed to update affiliate", detail: updateErr.message }, 500);
    }

    // ─── 8. Generate the magic link ─────────────────────────────────────────
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: aff.email,
      options: { redirectTo: "https://app.fluentia.academy/partner/set-password" },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error("generateLink failed:", linkErr);
      return json(
        {
          error: "approval succeeded but link generation failed — use resend button",
          detail: linkErr?.message,
        },
        500
      );
    }

    return json({
      success: true,
      user_id: userId,
      magic_link: linkData.properties.action_link,
      affiliate: {
        id: aff.id,
        full_name: aff.full_name,
        email: aff.email,
        ref_code: aff.ref_code,
      },
    });
  } catch (e) {
    console.error("unhandled error:", e);
    return json({ error: "internal error", detail: String(e) }, 500);
  }
});
