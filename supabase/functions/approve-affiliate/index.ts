import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { affiliate_id } = await req.json();
    if (!affiliate_id) return json({ error: "affiliate_id required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Verify caller is admin (via JWT in Authorization header)
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const { data: { user: caller }, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !caller) return json({ error: "invalid token" }, 401);

    const { data: callerProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();
    if (callerProfile?.role !== "admin") return json({ error: "admin only" }, 403);

    // 2. Load the affiliate row
    const { data: aff, error: affErr } = await admin
      .from("affiliates")
      .select("*")
      .eq("id", affiliate_id)
      .single();
    if (affErr || !aff) return json({ error: "affiliate not found" }, 404);

    // 3. Find or create the auth user
    let userId: string | null = aff.user_id ?? null;

    if (!userId) {
      // Try to find existing user by email first
      const { data: usersList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = usersList?.users?.find(
        (u) => u.email?.toLowerCase() === aff.email.toLowerCase()
      );

      if (existing) {
        userId = existing.id;
      } else {
        // Create new auth user with a random unguessable password
        const randomPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: aff.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { full_name: aff.full_name, source: "affiliate" },
        });
        if (createErr || !created.user) {
          return json({ error: "failed to create auth user", detail: createErr?.message }, 500);
        }
        userId = created.user.id;
      }
    }

    // 4. Upsert the profile row with role='affiliate'
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
      return json({ error: "failed to upsert profile", detail: profileErr.message }, 500);
    }

    // 5. Update the affiliate row (link user_id + status)
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
      return json({ error: "failed to update affiliate", detail: updateErr.message }, 500);
    }

    // 6. Generate one-time recovery link (acts as magic link)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: aff.email,
      options: {
        redirectTo: "https://app.fluentia.academy/partner/set-password",
      },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: "failed to generate magic link", detail: linkErr?.message }, 500);
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
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
