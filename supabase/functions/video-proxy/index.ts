// Fluentia LMS — Google Drive Video Proxy
// Streams Google Drive videos with proper CORS + Range headers so the
// native <video> player works on all devices (phone, tablet, desktop).
// Deploy: supabase functions deploy video-proxy

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Authorization',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
}

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const url = new URL(req.url)
  const fileId = url.searchParams.get('id')
  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return err('Missing or invalid file id')
  }

  try {
    // Forward Range header for seeking support
    const fetchHeaders: Record<string, string> = {}
    const range = req.headers.get('Range')
    if (range) fetchHeaders['Range'] = range

    // Step 1: Try direct download URL
    let driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
    let response = await fetch(driveUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
    })

    // Step 2: Handle Google virus-scan confirmation page (files > ~100MB)
    const ct = response.headers.get('Content-Type') || ''
    if (ct.includes('text/html')) {
      const html = await response.text()

      // Extract confirmation token from the warning page
      const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/)
        || html.match(/id="download-form"[\s\S]*?name="confirm"\s+value="([^"]+)"/)
        || html.match(/\/uc\?export=download[^"]*confirm=([a-zA-Z0-9_-]+)/)

      if (confirmMatch) {
        driveUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${confirmMatch[1]}`
        response = await fetch(driveUrl, { headers: fetchHeaders, redirect: 'follow' })
      } else {
        // Try the newer usercontent domain
        const ucUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`
        response = await fetch(ucUrl, { headers: fetchHeaders, redirect: 'follow' })

        const ct2 = response.headers.get('Content-Type') || ''
        if (ct2.includes('text/html')) {
          return err('Could not resolve video stream — check sharing settings', 502)
        }
      }
    }

    // Build response headers
    const respHeaders = new Headers(CORS)
    const videoType = response.headers.get('Content-Type')
    respHeaders.set('Content-Type', videoType || 'video/mp4')
    respHeaders.set('Accept-Ranges', 'bytes')
    respHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=7200')

    const contentLength = response.headers.get('Content-Length')
    if (contentLength) respHeaders.set('Content-Length', contentLength)

    const contentRange = response.headers.get('Content-Range')
    if (contentRange) respHeaders.set('Content-Range', contentRange)

    // Stream the video body through without buffering
    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    })
  } catch (e) {
    console.error('[video-proxy] Error:', e)
    return err('Failed to fetch video', 502)
  }
})
