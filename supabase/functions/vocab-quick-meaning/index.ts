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
    const { word } = await req.json();
    if (!word) {
      return new Response(JSON.stringify({ error: "Missing word" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanWord = word.trim().toLowerCase();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check cache first
    const { data: cached } = await supabase
      .from("vocab_cache")
      .select("*")
      .eq("word", cleanWord)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Claude for translation
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 256,
        temperature: 0.1,
        system: "You are a concise English-Arabic dictionary. Return ONLY JSON.",
        messages: [{
          role: "user",
          content: `Translate "${cleanWord}" to Arabic. Return JSON: {"word": "${cleanWord}", "meaning_ar": "المعنى", "part_of_speech": "noun/verb/adj/adv/etc"}`
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

    // Cache the result (ignore errors — cache is optional)
    await supabase.from("vocab_cache").upsert({
      word: cleanWord,
      meaning_ar: parsed.meaning_ar,
      part_of_speech: parsed.part_of_speech || "",
    }).then(() => {});

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
