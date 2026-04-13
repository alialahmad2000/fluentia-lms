// TikTok Events API - Server-Side Event Sender
// Sends Lead/CompleteRegistration events to TikTok with SHA-256 hashing + deduplication

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TIKTOK_PIXEL_ID = Deno.env.get("TIKTOK_PIXEL_ID_V3")!;
const TIKTOK_ACCESS_TOKEN = Deno.env.get("TIKTOK_ACCESS_TOKEN")!;
const TIKTOK_EVENTS_API_URL = "https://business-api.tiktok.com/open_api/v1.3/event/track/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// SHA-256 hash helper (TikTok requires hashing PII)
async function sha256(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const buffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Normalize phone to E.164 (Saudi: +966...)
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("966")) return "+" + cleaned;
  if (cleaned.startsWith("0")) return "+966" + cleaned.slice(1);
  if (cleaned.startsWith("5") && cleaned.length === 9) return "+966" + cleaned;
  return "+" + cleaned;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      event_name,       // "Lead" or "CompleteRegistration"
      event_id,         // Shared with Pixel for deduplication
      email,
      phone,
      external_id,      // Optional: user ID from your system
      url,              // Page URL where event occurred
      user_agent,
      value = 750,
      currency = "SAR",
    } = body;

    // Validate
    if (!event_name || !event_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: event_name, event_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";

    // Hash PII
    const hashedEmail = email ? await sha256(email) : undefined;
    const hashedPhone = phone ? await sha256(normalizePhone(phone)) : undefined;
    const hashedExternalId = external_id ? await sha256(external_id) : undefined;

    // Build TikTok Events API payload
    const payload = {
      event_source: "web",
      event_source_id: TIKTOK_PIXEL_ID,
      data: [
        {
          event: event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          user: {
            ...(hashedEmail && { email: hashedEmail }),
            ...(hashedPhone && { phone: hashedPhone }),
            ...(hashedExternalId && { external_id: hashedExternalId }),
            ip: clientIp,
            user_agent: user_agent || req.headers.get("user-agent") || "",
          },
          properties: {
            contents: [
              {
                content_id: "fluentia_registration",
                content_type: "product",
                content_name: "Fluentia English Course",
              },
            ],
            value,
            currency,
          },
          page: {
            url: url || "https://fluentia.academy/start",
          },
        },
      ],
    };

    // Send to TikTok
    const ttResponse = await fetch(TIKTOK_EVENTS_API_URL, {
      method: "POST",
      headers: {
        "Access-Token": TIKTOK_ACCESS_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const ttResult = await ttResponse.json();

    console.log("[tiktok-events-api]", event_name, "response:", JSON.stringify(ttResult));

    if (ttResult.code !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: ttResult.message || "TikTok API error",
          tiktok_response: ttResult,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_id,
        event_name,
        tiktok_response: ttResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[tiktok-events-api] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
