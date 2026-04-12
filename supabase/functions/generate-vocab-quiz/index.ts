import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLAUDE_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { words, student_level } = await req.json();
    if (!words || !Array.isArray(words) || words.length < 1) {
      return new Response(JSON.stringify({ error: "Missing or empty words array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Take up to 5 words for the quiz
    const quizWords = words.slice(0, 5);
    const wordList = quizWords.map((w: any) => `- "${w.word}"${w.context ? ` (context: "${w.context}")` : ""}`).join("\n");
    const levelContext = student_level != null ? ` The student is at level ${student_level}.` : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        temperature: 0.5,
        system: "You are an English vocabulary quiz generator for Arabic-speaking students. Create multiple choice questions testing understanding of given words. Each question should have 4 options with exactly one correct answer. Provide Arabic explanations.",
        messages: [{
          role: "user",
          content: `Create a ${Math.min(3, quizWords.length)}-question multiple choice quiz for these words:${levelContext}

${wordList}

Return JSON:
{
  "questions": [
    {
      "question": "What does 'word' mean?",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_index": 0,
      "explanation_ar": "الشرح بالعربي"
    }
  ]
}`
        }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text || "";

    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return new Response(JSON.stringify({ error: "Failed to parse quiz", questions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(text.substring(jsonStart, jsonEnd + 1));
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
