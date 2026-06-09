// Phrasebook builder (دفتر عباراتي) — mines speaking-recording transcripts for
// "you said X → a native says Y" pairs and voices the corrected sentence in
// Dr. Ali's cloned Najdi voice. Only THIS platform can ship this: it needs the
// students' real recordings + Dr. Ali's voice + their level context together.
//
// - Claude (tool-use) extracts at most 3 pairs per recording — only genuinely
//   useful ones; perfect recordings yield zero. note_ar is warm Arabic.
// - Voicing is BEST-EFFORT (ElevenLabs may be cancelled ~June 11): entries are
//   text-first; audio backfills whenever a later run finds the key working.
// - Auth: admin JWT or sb_secret service key. Weekly pg_cron (Vault bearer).
//   Heavy work runs via EdgeRuntime.waitUntil — the response returns instantly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
// Locked Najdi recipe — scripts/grammar-voice/_process_unit.sh
const NAJDI_VOICE_ID = "D6V3XntWeusiNMR4kdSw";
const ELEVEN_MODEL = "eleven_multilingual_v2";
const MAX_RECORDINGS_PER_RUN = 25;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
    let allowed = !!token && token === serviceKey;
    if (!allowed && token) {
      const { data: { user } } = await admin.auth.getUser(token);
      if (user) {
        const { data: p } = await admin.from("profiles").select("role").eq("id", user.id).single();
        allowed = p?.role === "admin";
      }
    }
    if (!allowed) return J({ ok: false, error: "admin_only" }, 403);

    // ── pick unmined recordings that have a transcript ──────────────────────
    const { data: processed } = await admin.from("phrasebook_processed").select("recording_id");
    const done = new Set((processed || []).map((r) => r.recording_id));

    const { data: recs } = await admin
      .from("speaking_recordings")
      .select("id, student_id, unit_id, ai_evaluation, created_at")
      .not("ai_evaluation", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);

    const todo = (recs || [])
      .filter((r) => !done.has(r.id) && (r.ai_evaluation?.transcript || "").trim().length >= 20)
      .slice(0, MAX_RECORDINGS_PER_RUN);

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
    const elevenKey = Deno.env.get("ELEVENLABS_API_KEY") || "";

    const run = async () => {
      let entriesMade = 0, voiced = 0, aiErrors = 0;
      for (const rec of todo) {
        try {
          const pairs = await extractPairs(apiKey!, rec.ai_evaluation);
          let n = 0;
          for (const p of pairs) {
            const dedupe = `${rec.student_id}:${hash(p.native_text.toLowerCase().trim())}`;
            const { data: ins, error } = await admin.from("phrasebook_entries").upsert({
              student_id: rec.student_id,
              recording_id: rec.id,
              unit_id: rec.unit_id,
              said_text: p.said_text.slice(0, 400),
              native_text: p.native_text.slice(0, 400),
              note_ar: p.note_ar?.slice(0, 600) || null,
              category: ["grammar", "word_choice", "expression", "pronunciation"].includes(p.category) ? p.category : "expression",
              dedupe_key: dedupe,
            }, { onConflict: "dedupe_key" }).select("id, audio_url").single();
            if (error || !ins) continue;
            n++; entriesMade++;
            if (!ins.audio_url && elevenKey) {
              const ok = await voiceEntry(admin, elevenKey, ins.id, p.native_text);
              if (ok) voiced++;
            }
          }
          await admin.from("phrasebook_processed").upsert({ recording_id: rec.id, entries_n: n }, { onConflict: "recording_id" });
        } catch (_e) { aiErrors++; }
      }
      // backfill audio for older text-only entries while the key works
      if (elevenKey) {
        const { data: silent } = await admin.from("phrasebook_entries")
          .select("id, native_text").is("audio_url", null).limit(15);
        for (const e of silent || []) {
          const ok = await voiceEntry(admin, elevenKey, e.id, e.native_text);
          if (ok) voiced++;
        }
      }
      console.log(`phrasebook run: ${todo.length} recordings, ${entriesMade} entries, ${voiced} voiced, ${aiErrors} ai errors`);
    };

    // @ts-ignore — Supabase edge runtime global
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(run());
    } else {
      await run();
    }

    return J({ ok: true, started: true, recordings_queued: todo.length, eleven_available: !!elevenKey });
  } catch (e) {
    return J({ ok: false, error: (e as Error).message }, 500);
  }
});

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}

async function extractPairs(apiKey: string, evaluation: any) {
  const transcript = String(evaluation?.transcript || "").slice(0, 2500);
  const level = evaluation?.level_context || "";
  const prompt = `أنت مدرّب لغة إنجليزية في أكاديمية طلاقة. هذا تفريغ حرفي لتسجيل صوتي لطالب${level ? ` (مستواه: ${level})` : ""}:

"${transcript}"

استخرج حتى ٣ جمل قالها الطالب فعلاً وفيها صياغة غير طبيعية أو خطأ يستحق الحفظ، وأعد صياغة كل واحدة كما يقولها متحدث أصلي بشكل طبيعي وبنفس المعنى الذي قصده الطالب. هذه ستدخل «دفتر عبارات» شخصياً يراجعه الطالب ويسمع الجملة الصحيحة بصوت مدرّبه.

قواعد صارمة:
- said_text يجب أن تكون جملة وردت في التفريغ نصاً (يمكن تقصيرها لكن لا تخترع).
- native_text بنفس مستوى الطالب تقريباً — طبيعية، لا أكاديمية متكلفة.
- note_ar جملة عربية دافئة وقصيرة تشرح اللفتة (لماذا الصياغة الأصلية غير طبيعية).
- لا تستخرج شيئاً من أخطاء التفريغ الصوتي الواضحة (كلمات مقطوعة/مكررة بسبب التسجيل).
- إذا كان كلام الطالب سليماً وطبيعياً: أعد قائمة فارغة. الجودة قبل الكمية.

أجب عبر الأداة pairs فقط.`;

  const tools = [{
    name: "pairs",
    description: "أزواج قالها الطالب → كما يقولها متحدث أصلي",
    input_schema: {
      type: "object",
      properties: {
        pairs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              said_text: { type: "string" },
              native_text: { type: "string" },
              note_ar: { type: "string" },
              category: { type: "string", enum: ["grammar", "word_choice", "expression", "pronunciation"] },
            },
            required: ["said_text", "native_text", "note_ar", "category"],
          },
        },
      },
      required: ["pairs"],
    },
  }];

  const resp = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 900, tools, tool_choice: { type: "tool", name: "pairs" }, messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}`);
  const jr = await resp.json();
  const tu = (jr?.content || []).find((x: any) => x.type === "tool_use");
  return Array.isArray(tu?.input?.pairs) ? tu.input.pairs.slice(0, 3) : [];
}

async function voiceEntry(admin: any, elevenKey: string, entryId: string, text: string): Promise<boolean> {
  try {
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${NAJDI_VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": elevenKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: ELEVEN_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.9, style: 0.0, use_speaker_boost: true, speed: 0.92 },
      }),
    });
    if (!tts.ok) return false;
    const audio = new Uint8Array(await tts.arrayBuffer());
    if (audio.byteLength < 1000) return false;
    const path = `phrasebook/${entryId}.mp3`;
    const { error: upErr } = await admin.storage.from("curriculum-audio").upload(path, audio, {
      contentType: "audio/mpeg", upsert: true,
    });
    if (upErr) return false;
    const { data: pub } = admin.storage.from("curriculum-audio").getPublicUrl(path);
    if (!pub?.publicUrl) return false;
    await admin.from("phrasebook_entries").update({ audio_url: pub.publicUrl }).eq("id", entryId);
    return true;
  } catch {
    return false;
  }
}
