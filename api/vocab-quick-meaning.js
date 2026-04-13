import { createClient } from "@supabase/supabase-js";

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { word } = req.body;
    if (!word) return res.status(400).json({ error: "Missing word" });

    const cleanWord = word.trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache
    const { data: cached } = await supabase
      .from("vocab_cache")
      .select("*")
      .eq("word", cleanWord)
      .maybeSingle();

    if (cached) return res.json(cached);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        temperature: 0.1,
        system: "You are a concise English-Arabic dictionary. Return ONLY JSON.",
        messages: [{
          role: "user",
          content: `Translate "${cleanWord}" to Arabic. Return JSON: {"word": "${cleanWord}", "meaning_ar": "المعنى", "part_of_speech": "noun/verb/adj/adv/etc"}`,
        }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    let parsed = { word: cleanWord, meaning_ar: text, part_of_speech: "" };
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try { parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1)); } catch {}
    }

    // Cache
    await supabase.from("vocab_cache").upsert({
      word: cleanWord,
      meaning_ar: parsed.meaning_ar,
      part_of_speech: parsed.part_of_speech || "",
    });

    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
