import { createClient } from "@supabase/supabase-js";

const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { passage_id, passage_text, student_level } = req.body;
    if (!passage_id || !passage_text) {
      return res.status(400).json({ error: "Missing passage_id or passage_text" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache
    const { data: cached } = await supabase
      .from("passage_ai_content")
      .select("*")
      .eq("passage_id", passage_id)
      .maybeSingle();

    if (cached?.summary_ar) {
      return res.json({ summary_ar: cached.summary_ar });
    }

    const levelContext = student_level != null ? ` The student is at level ${student_level}.` : "";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        temperature: 0.3,
        system: "You are a reading comprehension assistant for Arabic-speaking English learners. Summarize the given English passage in Arabic (3-4 sentences). Use clear, simple Arabic.",
        messages: [{
          role: "user",
          content: `Summarize this passage in Arabic (3-4 sentences):${levelContext}\n\n${passage_text}\n\nReturn JSON: {"summary_ar": "الملخص بالعربي"}`,
        }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    let summary_ar = text;
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      try {
        const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
        summary_ar = parsed.summary_ar || text;
      } catch {}
    }

    // Cache
    const wordCount = passage_text.split(/\s+/).length;
    await supabase.from("passage_ai_content").upsert({
      passage_id,
      summary_ar,
      word_count: wordCount,
    });

    return res.json({ summary_ar });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
