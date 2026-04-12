import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CLAUDE_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { word, context_sentence, action_type } = await req.json();

    if (!word || !action_type) {
      return new Response(JSON.stringify({ error: "Missing word or action_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (action_type === "translate") {
      systemPrompt = "You are a bilingual English-Arabic dictionary assistant. Provide a clear, concise Arabic translation.";
      userPrompt = `Translate the English word/phrase "${word}" to Arabic.${context_sentence ? ` Context: "${context_sentence}"` : ""}

Return JSON: {"meaning_ar": "المعنى بالعربي", "part_of_speech": "noun/verb/adj/etc"}`;
    } else if (action_type === "explain") {
      systemPrompt = "You are an English language teacher explaining vocabulary to Arabic-speaking students. Explain in Arabic with simple, clear language.";
      userPrompt = `Explain the word "${word}" in Arabic. Use simple language suitable for English learners.${context_sentence ? ` The word appeared in this context: "${context_sentence}"` : ""}

Return JSON: {"meaning_ar": "الشرح بالعربي", "explanation": "Short English explanation of usage"}`;
    } else if (action_type === "examples") {
      systemPrompt = "You are an English language teacher providing example sentences. Keep examples natural and at intermediate level.";
      userPrompt = `Give 3 example sentences using the word "${word}".${context_sentence ? ` Original context: "${context_sentence}"` : ""}

Return JSON: {"examples": ["sentence 1", "sentence 2", "sentence 3"]}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action_type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY!,
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

    // Extract JSON from response
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      return new Response(JSON.stringify({ meaning_ar: text }), {
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
