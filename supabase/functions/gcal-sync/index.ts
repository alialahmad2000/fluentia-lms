// Fluentia CS Ops — gcal-sync edge function.
// Creates/updates/deletes a Google Calendar event for a booking, with native
// popup reminders (60 + 10 min). Gated: returns {skipped} until Google is configured + connected.
// Modes: { booking_id } (one) or { mode: 'sweep' } (stragglers). Deploy with --no-verify-jwt.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const TYPE_TITLES: Record<string, string> = { initial_meeting: "لقاء مبدئي", private_class: "حصة فردية" };

async function getAccess(supabase: any) {
  const { data: tok } = await supabase.from("integration_tokens").select("*").eq("provider", "google").maybeSingle();
  if (!tok?.refresh_token) return null;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: tok.refresh_token, grant_type: "refresh_token",
    }),
  });
  const j = await r.json();
  if (!j.access_token) return null;
  return { accessToken: j.access_token as string, calendarId: tok.calendar_id || "primary" };
}

function buildEvent(b: any) {
  const title = `${TYPE_TITLES[b.type] || "موعد"} — ${b.contact_name || ""}`.trim();
  const lines: string[] = [];
  if (b.notes) lines.push(b.notes);
  if (b.contact_whatsapp) lines.push("واتساب: https://wa.me/" + String(b.contact_whatsapp).replace(/\D/g, ""));
  return {
    summary: title,
    description: lines.join("\n"),
    start: { dateTime: new Date(b.start_at).toISOString() },
    end: { dateTime: new Date(b.end_at).toISOString() },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 60 }, { method: "popup", minutes: 10 }] },
  };
}

async function syncOne(supabase: any, accessToken: string, calendarId: string, b: any) {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const auth = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };
  if (b.status === "cancelled") {
    if (b.gcal_event_id) {
      await fetch(`${base}/${b.gcal_event_id}`, { method: "DELETE", headers: auth });
      await supabase.from("cs_bookings").update({ gcal_event_id: null, gcal_synced_at: new Date().toISOString() }).eq("id", b.id);
    }
    return;
  }
  const ev = buildEvent(b);
  const res = b.gcal_event_id
    ? await fetch(`${base}/${b.gcal_event_id}`, { method: "PATCH", headers: auth, body: JSON.stringify(ev) })
    : await fetch(base, { method: "POST", headers: auth, body: JSON.stringify(ev) });
  const j = await res.json();
  if (j.id) {
    await supabase.from("cs_bookings").update({ gcal_event_id: j.id, gcal_synced_at: new Date().toISOString() }).eq("id", b.id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return json({ skipped: "not_configured" });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const tokenInfo = await getAccess(supabase);
  if (!tokenInfo) return json({ skipped: "not_connected" });

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  let bookings: any[] = [];
  if (body.mode === "sweep") {
    const { data } = await supabase.from("cs_bookings").select("*")
      .eq("status", "scheduled").or("gcal_event_id.is.null,gcal_synced_at.is.null").limit(25);
    bookings = data || [];
  } else if (body.booking_id) {
    const { data } = await supabase.from("cs_bookings").select("*").eq("id", body.booking_id).maybeSingle();
    if (data) bookings = [data];
  }

  const results: any[] = [];
  for (const b of bookings) {
    try { await syncOne(supabase, tokenInfo.accessToken, tokenInfo.calendarId, b); results.push({ id: b.id, ok: true }); }
    catch (e) { results.push({ id: b.id, ok: false, error: String(e) }); }
  }
  return json({ synced: results.length, results });
});
