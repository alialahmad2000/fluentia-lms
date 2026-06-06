// Fluentia — admin-staff edge function. Admin-only.
// actions: create (new staff account) | reset_password | set_active (ban/unban).
// Deploy with --no-verify-jwt (caller is verified internally as an admin).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // verify caller is an admin
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return json({ error: "unauthorized" }, 401);
  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return json({ error: "admin only" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const action = body.action || "create";

  if (action === "create") {
    const { name, email, password, role } = body;
    if (!name || !email || !password || !["admin", "trainer", "agent"].includes(role)) {
      return json({ error: "invalid input" }, 400);
    }
    const { data: created, error: cErr } = await sb.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name, role },
    });
    if (cErr || !created?.user) return json({ error: cErr?.message || "create failed" }, 400);
    const uid = created.user.id;
    await sb.from("profiles").upsert(
      { id: uid, email, full_name: name, role, ui_language: "ar", must_change_password: true },
      { onConflict: "id" },
    );
    if (role === "trainer") await sb.from("trainers").upsert({ id: uid }, { onConflict: "id" });
    return json({ ok: true, uid });
  }

  if (action === "reset_password") {
    const { user_id, password } = body;
    if (!user_id || !password) return json({ error: "invalid input" }, 400);
    if (user_id === user.id) return json({ error: "use account settings for your own password" }, 400);
    const { error } = await sb.auth.admin.updateUserById(user_id, { password });
    if (error) return json({ error: error.message }, 400);
    await sb.from("profiles").update({ must_change_password: true }).eq("id", user_id);
    return json({ ok: true });
  }

  if (action === "set_active") {
    const { user_id, active } = body;
    if (!user_id || typeof active !== "boolean") return json({ error: "invalid input" }, 400);
    if (user_id === user.id) return json({ error: "cannot deactivate yourself" }, 400);
    const { error } = await sb.auth.admin.updateUserById(user_id, { ban_duration: active ? "none" : "876000h" });
    if (error) return json({ error: error.message }, 400);
    await sb.from("trainers").update({ is_active: active }).eq("id", user_id);
    return json({ ok: true });
  }

  if (action === "delete") {
    const { user_id } = body;
    if (!user_id) return json({ error: "invalid input" }, 400);
    if (user_id === user.id) return json({ error: "لا يمكنك حذف حسابك" }, 400);
    const { data: target } = await sb.from("profiles").select("role").eq("id", user_id).maybeSingle();
    if (!target) return json({ error: "الحساب غير موجود" }, 404);
    // never remove the last admin
    if (target.role === "admin") {
      const { count } = await sb.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
      if ((count || 0) <= 1) return json({ error: "لا يمكن حذف آخر مدير" }, 400);
    }
    // clear the only soft refs that block a profile delete (the user's own notifications),
    // plus a trainers stub row if present.
    await sb.from("notifications").delete().eq("user_id", user_id);
    await sb.from("trainers").delete().eq("id", user_id);
    // Delete the profile. FK NO-ACTION constraints on REAL data (lessons, grading,
    // payments, messages, students…) will block this — which is the safety net:
    // an account with history can't be hard-deleted, only deactivated.
    const { error: pErr } = await sb.from("profiles").delete().eq("id", user_id);
    if (pErr) {
      return json({ error: "هذا الحساب مرتبط ببيانات سابقة (دروس/تصحيح/طلاب…) فلا يمكن حذفه نهائياً — عطّله بدلاً من ذلك." }, 409);
    }
    // Remove the auth user (no profiles↔auth cascade in this project).
    const { error: aErr } = await sb.auth.admin.deleteUser(user_id);
    if (aErr) return json({ ok: true, warning: "profile deleted; auth remained: " + aErr.message });
    return json({ ok: true });
  }

  return json({ error: "unknown action" }, 400);
});
