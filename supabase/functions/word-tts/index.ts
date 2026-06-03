// word-tts — on-demand pronunciation audio for ANY English word (reading section).
//
// Highlighted (vocabulary) words have pre-generated MP3s in curriculum_vocabulary.
// NON-highlighted words had no audio and fell back to Web Speech, which is silently
// unreliable on iOS — so students "can't hear certain words." This function gives
// every word a REAL MP3, generated once with the SAME voice as the vocab audio
// (ElevenLabs "George", JBFqnCBsd6RMkjVDRZzb) and cached permanently in storage.
// The client plays it via an in-memory blob (Safari-safe), so it's reliable.
//
// Deterministic, content-addressed cache: curriculum-audio/word-tts/<word>.mp3
// → a HEAD hit means "already generated", so repeat requests are instant and free.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ELEVEN_KEY = Deno.env.get("ELEVENLABS_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George — British male, matches vocab audio
const BUCKET = "curriculum-audio";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// MUST match the client's normalize(): lowercase, trim, keep only a-z ' -
const norm = (w: string) => (w || "").toLowerCase().trim().replace(/[^a-z'-]/g, "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { word } = await req.json();
    const w = norm(word);
    if (!w || w.length < 1 || w.length > 40) return json({ error: "bad_word" }, 400);

    const path = `word-tts/${w}.mp3`;
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    // Cache hit? (the object already exists → instant, no synthesis)
    const head = await fetch(publicUrl, { method: "HEAD" });
    if (head.ok) return json({ url: publicUrl, word: w, cached: true });

    if (!ELEVEN_KEY) return json({ error: "tts_unavailable" }, 503);

    // Synthesize with the same voice as the vocabulary audio.
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text: w,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true },
      }),
    });
    if (!tts.ok) {
      const detail = await tts.text().catch(() => "");
      return json({ error: "tts_failed", status: tts.status, detail: detail.slice(0, 200) }, 502);
    }

    const bytes = new Uint8Array(await tts.arrayBuffer());
    const sb = createClient(SUPABASE_URL, SERVICE_KEY);
    const up = await sb.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "audio/mpeg", cacheControl: "31536000", upsert: true });
    if (up.error) return json({ error: "upload_failed", detail: up.error.message }, 500);

    return json({ url: publicUrl, word: w, cached: false });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
