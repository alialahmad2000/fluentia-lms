// Fluentia — impersonate edge function. Admin-only.
// Mints a ONE-TIME magic-link token for a target (non-admin) user so an admin can
// "view as" them with a REAL session (auth.uid() becomes the target) — which is the
// only way student-scoped writes (RLS / SECURITY DEFINER RPCs that derive the student
// from auth.uid()) persist correctly during preview. No email is sent: we return the
// token hash and the client exchanges it via supabase.auth.verifyOtp().
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

  // 1) verify the caller is an admin
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: { user }, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !user) return json({ error: "unauthorized" }, 401);
  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (prof?.role !== "admin") return json({ error: "admin only" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const targetId = body.target_user_id;
  if (!targetId) return json({ error: "target_user_id required" }, 400);
  if (targetId === user.id) return json({ error: "cannot impersonate yourself" }, 400);

  // 2) resolve the target + guard against impersonating another admin
  const { data: targetProf } = await sb.from("profiles")
    .select("role, email").eq("id", targetId).maybeSingle();
  if (!targetProf) return json({ error: "target not found" }, 404);
  if (targetProf.role === "admin") return json({ error: "cannot impersonate an admin" }, 403);

  const { data: targetUser } = await sb.auth.admin.getUserById(targetId);
  const email = targetUser?.user?.email || targetProf.email;
  if (!email) return json({ error: "target has no email" }, 400);

  // 3) mint a one-time magic-link token (no email sent — client verifies the hash)
  const { data: link, error: lErr } = await sb.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (lErr || !link?.properties?.hashed_token) {
    return json({ error: lErr?.message || "could not create login token" }, 400);
  }

  return json({
    token_hash: link.properties.hashed_token,
    type: link.properties.verification_type || "magiclink",
    email,
  });
});
