import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLAUDE_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || Deno.env.get("CLAUDE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { passage_id, passage_text, student_level } = await req.json();
    if (!passage_id || !passage_text) {
      return new Response(JSON.stringify({ error: "Missing passage_id or passage_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache first
    const { data: cached } = await supabase
      .from("passage_ai_content")
      .select("*")
      .eq("passage_id", passage_id)
      .maybeSingle();

    if (cached?.summary_ar) {
      return new Response(JSON.stringify({ summary_ar: cached.summary_ar }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate summary with Claude
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
        max_tokens: 1024,
        temperature: 0.3,
        system: "You are a reading comprehension assistant for Arabic-speaking English learners. Summarize the given English passage in Arabic (3-4 sentences). Use clear, simple Arabic.",
        messages: [{
          role: "user",
          content: `Summarize this passage in Arabic (3-4 sentences):${levelContext}\n\n${passage_text}\n\nReturn JSON: {"summary_ar": "الملخص بالعربي"}`
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

    // Cache the result
    const wordCount = passage_text.split(/\s+/).length;
    await supabase.from("passage_ai_content").upsert({
      passage_id,
      summary_ar,
      word_count: wordCount,
    }).then(() => {});

    return new Response(JSON.stringify({ summary_ar }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
