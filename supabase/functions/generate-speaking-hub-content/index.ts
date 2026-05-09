// @ts-nocheck — Deno
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("CLAUDE_API_KEY");
const MODEL = "claude-sonnet-4-6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── Helpers ──────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchOEmbed(videoUrl: string) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("oEmbed failed:", e);
    return null;
  }
}

async function fetchTranscript(videoId: string): Promise<string | null> {
  try {
    const html = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }).then((r) => r.text());

    const match =
      html.match(/var ytInitialPlayerResponse = ({.+?});<\/script>/) ||
      html.match(/var ytInitialPlayerResponse = ({.+?});/);
    if (!match) { console.warn("No ytInitialPlayerResponse"); return null; }

    const playerResponse = JSON.parse(match[1]);
    const tracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) { console.warn("No caption tracks"); return null; }

    const track =
      tracks.find((t: any) => t.languageCode === "en" && !t.kind) ||
      tracks.find((t: any) => t.languageCode === "en") ||
      tracks[0];
    if (!track?.baseUrl) return null;

    const xml = await fetch(track.baseUrl).then((r) => r.text());
    const text = xml
      .replace(/<\/?[^>]+(>|$)/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text || null;
  } catch (e) {
    console.error("Transcript fetch failed:", e);
    return null;
  }
}

function buildSystemPrompt() {
  return `You are an expert English language teacher at Fluentia Academy, an online ESL school for adult Saudi learners (primarily women, B1-B2 level). You create "Speaking Hub" content — listening tasks paired with live discussion sessions.

Given a YouTube video (title, channel, and ideally a transcript), you generate Speaking Hub content tailored to:
- B1-B2 English level (adult learners, not children)
- Saudi cultural context (avoid topics conflicting with conservative norms — alcohol, dating, religion criticism, etc.)
- Adult learner motivations (career, IELTS, self-improvement, communication confidence)

Output requirements:
1. **title** — Catchy Arabic title, 5-10 words. Should make a learner curious.
2. **title_en** — English equivalent, can match the video's actual theme.
3. **description** — 2-3 sentences in Arabic explaining what the learner will get out of watching + the discussion. Sell the value.
4. **description_en** — English equivalent.
5. **video_title** — The video's actual English title (from oEmbed).
6. **video_channel** — The channel name.
7. **video_duration_minutes** — Estimated, integer. If unsure, default to 5.
8. **note_prompts** — 3 questions IN ENGLISH that focus the learner's attention while watching. Should require active listening, not passive. Avoid yes/no questions. Reference specific concepts from the video.
9. **vocab_focus** — 3-5 words IN ENGLISH that appear in the video and are useful for B1-B2 learners. Each item: { word, meaning_ar, example_en (one short sentence using the word, ideally from or near the video's context) }. Choose words that are useful beyond this video. Skip basic words (good, bad, big).
10. **discussion_questions** — 3 open-ended questions IN ENGLISH for the live discussion session. They should:
    - Connect the video's ideas to the learner's own life
    - Encourage extended speaking (no yes/no)
    - Be discussable for 5-10 minutes each
    - Be culturally appropriate for Saudi adult learners

Return ONLY valid JSON. No markdown fences. No prose before or after. The JSON MUST exactly match this schema:

{
  "title": "string",
  "title_en": "string",
  "description": "string",
  "description_en": "string",
  "video_title": "string",
  "video_channel": "string",
  "video_duration_minutes": number,
  "note_prompts": ["string", "string", "string"],
  "vocab_focus": [
    { "word": "string", "meaning_ar": "string", "example_en": "string" }
  ],
  "discussion_questions": ["string", "string", "string"]
}`;
}

function buildUserPrompt(meta: any, transcript: string | null) {
  const transcriptSection = transcript
    ? `Transcript (may be auto-generated, treat with care):\n${transcript.slice(0, 6000)}`
    : `Transcript: NOT AVAILABLE. Generate based on title + channel + your knowledge of this video/topic.`;

  return `Video title: ${meta?.title ?? "(unknown)"}
Channel: ${meta?.author_name ?? "(unknown)"}

${transcriptSection}

Generate the Speaking Hub JSON now.`;
}

async function callClaude(systemPrompt: string, userPrompt: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  const clean = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return JSON.parse(clean);
}

// ── Main handler ─────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "missing_api_key", message: "Anthropic API key not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { video_url } = await req.json();
    if (!video_url || typeof video_url !== "string") {
      return new Response(
        JSON.stringify({ error: "missing_url", message: "video_url is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = extractYouTubeId(video_url);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "invalid_url", message: "URL must be a valid YouTube video link." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing video:", videoId);

    const [meta, transcript] = await Promise.all([
      fetchOEmbed(video_url),
      fetchTranscript(videoId),
    ]);

    if (!meta) {
      return new Response(
        JSON.stringify({ error: "video_unavailable", message: "Could not fetch video metadata. Is the video public?" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Meta:", meta.title, "| Transcript chars:", transcript?.length ?? 0);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(meta, transcript);

    let generated;
    try {
      generated = await callClaude(systemPrompt, userPrompt);
    } catch (e) {
      console.error("Claude call failed, retrying once...", e);
      generated = await callClaude(systemPrompt, userPrompt);
    }

    const required = ["title", "description", "note_prompts", "vocab_focus", "discussion_questions"];
    for (const f of required) {
      if (!(f in generated)) throw new Error(`Generated content missing field: ${f}`);
    }

    const result = {
      ...generated,
      video_title: generated.video_title || meta.title,
      video_channel: generated.video_channel || meta.author_name,
      video_thumbnail_url: meta.thumbnail_url ?? null,
      _meta: {
        had_transcript: !!transcript,
        transcript_chars: transcript?.length ?? 0,
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Generation failed:", e);
    return new Response(
      JSON.stringify({ error: "generation_failed", message: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
