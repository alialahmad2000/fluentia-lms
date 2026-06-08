// Transcribe a CHAT voice note (chat-voice bucket) → cache on group_messages.voice_transcript.
// On-demand: called from the voice player. Language auto-detected (Arabic or English).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: ae } = await sb.auth.getUser(token);
    if (ae || !user) return json({ error: "unauthorized" }, 401);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const messageId = body.message_id;
    if (!messageId) return json({ error: "missing message_id" }, 400);

    const { data: msg } = await sb.from("group_messages")
      .select("id, voice_url, voice_transcript").eq("id", messageId).maybeSingle();
    if (!msg?.voice_url) return json({ error: "no_voice" }, 404);
    if (msg.voice_transcript) return json({ transcript: msg.voice_transcript, cached: true });
    if (!OPENAI_API_KEY) return json({ error: "not_configured" }, 503);

    const { data: fileData, error: dErr } = await sb.storage.from("chat-voice").download(msg.voice_url);
    if (dErr || !fileData) return json({ error: "download_failed" }, 502);

    const fd = new FormData();
    fd.append("file", fileData, "audio.webm");
    fd.append("model", "whisper-1");
    const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` }, body: fd,
    });
    if (!wr.ok) { console.error("[transcribe] whisper", wr.status, await wr.text()); return json({ error: "transcribe_failed" }, 502); }
    const wd = await wr.json();
    const transcript = (wd.text || "").trim();

    await sb.from("group_messages").update({ voice_transcript: transcript, voice_transcript_lang: "auto" }).eq("id", messageId);
    try { await sb.from("ai_usage").insert({ type: "whisper_transcription", student_id: user.id, model: "whisper-1", estimated_cost_sar: "0.0225" }); } catch { /* non-fatal */ }

    return json({ transcript });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
