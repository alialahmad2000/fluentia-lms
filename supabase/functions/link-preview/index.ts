// Returns OG metadata for a URL — used by MessageComposer link preview
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchOG(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Fluentia/1.0)' },
    signal: AbortSignal.timeout(5000),
  })
  const html = await res.text()

  function meta(name: string) {
    const patterns = [
      new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${name}["']`, 'i'),
      new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    ]
    for (const re of patterns) {
      const m = html.match(re)
      if (m) return m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()
    }
    return null
  }

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const domain = new URL(url).hostname.replace('www.', '')

  return {
    title: meta('title') || titleMatch?.[1]?.trim() || domain,
    description: meta('description'),
    image: meta('image'),
    domain,
    url,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
  if (error || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  let body: any
  try { body = await req.json() } catch {
    return new Response('Bad request', { status: 400, headers: corsHeaders })
  }

  const { url } = body
  if (!url || !/^https?:\/\//i.test(url)) {
    return new Response(JSON.stringify({ error: 'invalid url' }), { status: 400, headers: corsHeaders })
  }

  try {
    const og = await fetchOG(url)
    return new Response(JSON.stringify(og), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'fetch failed' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
