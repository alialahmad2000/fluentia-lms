const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { words, student_level } = req.body;
    if (!words || !Array.isArray(words) || words.length < 1) {
      return res.status(400).json({ error: "Missing or empty words array" });
    }

    const quizWords = words.slice(0, 5);
    const wordList = quizWords.map((w) => `- "${w.word}"${w.context ? ` (context: "${w.context}")` : ""}`).join("\n");
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
        max_tokens: 2048,
        temperature: 0.5,
        system: "You are an English vocabulary quiz generator for Arabic-speaking students. Create multiple choice questions testing understanding of given words. Each question should have 4 options with exactly one correct answer. Provide Arabic explanations.",
        messages: [{
          role: "user",
          content: `Create a ${Math.min(3, quizWords.length)}-question multiple choice quiz for these words:${levelContext}\n\n${wordList}\n\nReturn JSON:\n{\n  "questions": [\n    {\n      "question": "What does 'word' mean?",\n      "options": ["option A", "option B", "option C", "option D"],\n      "correct_index": 0,\n      "explanation_ar": "الشرح بالعربي"\n    }\n  ]\n}`,
        }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return res.json({ error: "Failed to parse quiz", questions: [] });
    }

    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    return res.json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
