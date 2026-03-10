// Fluentia LMS — Whisper Transcription Edge Function
// Receives a voice note, sends to OpenAI Whisper API, returns transcription.
// This is a skeleton — full implementation comes in Phase 6.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // TODO Phase 6: Implement Whisper transcription
    // 1. Receive voice note URL
    // 2. Download from storage
    // 3. Send to OpenAI Whisper API
    // 4. Store transcription in submissions.content_voice_transcript
    // 5. Log usage to ai_usage

    return new Response(
      JSON.stringify({ message: 'Whisper Transcription — coming in Phase 6' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
