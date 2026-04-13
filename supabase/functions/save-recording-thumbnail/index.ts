// Save recording thumbnail — accepts base64 image, uploads to storage, updates class_recordings
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    const { recording_id, image_base64 } = await req.json()
    if (!recording_id || !image_base64) {
      return new Response(JSON.stringify({ error: 'recording_id and image_base64 required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    // Use service role to bypass RLS for updating class_recordings
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify user is authenticated
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      })
    }

    // Verify recording exists
    const { data: recording, error: recError } = await supabaseAdmin
      .from('class_recordings')
      .select('id, thumbnail_url')
      .eq('id', recording_id)
      .single()

    if (recError || !recording) {
      return new Response(JSON.stringify({ error: 'Recording not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
      })
    }

    // Skip if thumbnail already exists
    if (recording.thumbnail_url) {
      return new Response(JSON.stringify({ url: recording.thumbnail_url, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Decode base64 to bytes
    const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '')
    const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    const filePath = `${recording_id}.jpg`

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('recording-thumbnails')
      .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true })

    if (uploadError) {
      console.error('[save-recording-thumbnail] Upload error:', uploadError)
      return new Response(JSON.stringify({ error: 'Upload failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
      })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('recording-thumbnails')
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    // Update recording
    const { error: updateError } = await supabaseAdmin
      .from('class_recordings')
      .update({ thumbnail_url: publicUrl })
      .eq('id', recording_id)

    if (updateError) {
      console.error('[save-recording-thumbnail] Update error:', updateError)
    }

    return new Response(JSON.stringify({ url: publicUrl, success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    console.error('[save-recording-thumbnail] Error:', error)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
