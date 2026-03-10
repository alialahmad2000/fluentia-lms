// Fluentia LMS — Email Sending Edge Function (via Resend)
// Accepts email parameters, renders HTML template, sends via Resend API.
// This is a skeleton — full implementation comes in Phase 5.

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
    // TODO Phase 5: Implement email sending via Resend
    // 1. Accept email params (to, subject, template, data)
    // 2. Render HTML template
    // 3. Send via Resend API
    // 4. Log result

    return new Response(
      JSON.stringify({ message: 'Email Sending — coming in Phase 5' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
