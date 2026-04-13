const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { word, context_sentence, action_type } = req.body;
    if (!word || !action_type) {
      return res.status(400).json({ error: "Missing word or action_type" });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action_type === "translate") {
      systemPrompt = "You are a bilingual English-Arabic dictionary assistant. Provide a clear, concise Arabic translation.";
      userPrompt = `Translate the English word/phrase "${word}" to Arabic.${context_sentence ? ` Context: "${context_sentence}"` : ""}\n\nReturn JSON: {"meaning_ar": "المعنى بالعربي", "part_of_speech": "noun/verb/adj/etc"}`;
    } else if (action_type === "explain") {
      systemPrompt = "You are an English language teacher explaining vocabulary to Arabic-speaking students. Explain in Arabic with simple, clear language.";
      userPrompt = `Explain the word "${word}" in Arabic. Use simple language suitable for English learners.${context_sentence ? ` The word appeared in this context: "${context_sentence}"` : ""}\n\nReturn JSON: {"meaning_ar": "الشرح بالعربي", "explanation": "Short English explanation of usage"}`;
    } else if (action_type === "examples") {
      systemPrompt = "You are an English language teacher providing example sentences. Keep examples natural and at intermediate level.";
      userPrompt = `Give 3 example sentences using the word "${word}".${context_sentence ? ` Original context: "${context_sentence}"` : ""}\n\nReturn JSON: {"examples": ["sentence 1", "sentence 2", "sentence 3"]}`;
    } else {
      return res.status(400).json({ error: "Invalid action_type" });
    }

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
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return res.json({ meaning_ar: text });
    }

    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
