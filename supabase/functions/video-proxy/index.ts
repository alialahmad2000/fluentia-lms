// Fluentia LMS — Google Drive Video Proxy
// Streams Google Drive videos with proper CORS + Range headers so the
// native <video> player works on all devices (phone, tablet, desktop).
// Deploy: supabase functions deploy video-proxy --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Authorization',
  'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges, Content-Type',
}

function jsonErr(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function isVideoResponse(resp: Response): boolean {
  const ct = resp.headers.get('Content-Type') || ''
  return ct.startsWith('video/') || ct === 'application/octet-stream'
}

async function tryFetch(url: string, headers: Record<string, string>): Promise<Response> {
  return await fetch(url, { headers, redirect: 'follow' })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const url = new URL(req.url)
  const fileId = url.searchParams.get('id')
  if (!fileId || !/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return jsonErr('Missing or invalid file id')
  }

  try {
    const fetchHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
    const range = req.headers.get('Range')
    if (range) fetchHeaders['Range'] = range

    // URLs to try in order — different Google Drive endpoints that may work
    const urls = [
      // New usercontent domain with confirm=t (skips virus scan)
      `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`,
      // Classic uc endpoint with confirm
      `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
      // Classic uc endpoint without confirm (follows redirect for small files)
      `https://drive.google.com/uc?export=download&id=${fileId}`,
    ]

    let response: Response | null = null
    let lastHtml = ''

    for (const tryUrl of urls) {
      const resp = await tryFetch(tryUrl, fetchHeaders)

      if (isVideoResponse(resp)) {
        response = resp
        break
      }

      // Got HTML — might be confirmation page, extract token and retry
      const ct = resp.headers.get('Content-Type') || ''
      if (ct.includes('text/html')) {
        const html = await resp.text()
        lastHtml = html

        // Look for confirmation token in the HTML
        const tokenMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/)
          || html.match(/name="confirm"\s+value="([^"]+)"/)
          || html.match(/&amp;confirm=([^&"]+)/)
          || html.match(/confirm%3D([a-zA-Z0-9_-]+)/)

        if (tokenMatch) {
          // Retry with extracted token
          const confirmedUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=${tokenMatch[1]}`
          const confirmedResp = await tryFetch(confirmedUrl, fetchHeaders)
          if (isVideoResponse(confirmedResp)) {
            response = confirmedResp
            break
          }
          // Also try classic domain
          const confirmedUrl2 = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=${tokenMatch[1]}`
          const confirmedResp2 = await tryFetch(confirmedUrl2, fetchHeaders)
          if (isVideoResponse(confirmedResp2)) {
            response = confirmedResp2
            break
          }
        }

        // Check if the HTML contains a download URL we can extract
        const dlMatch = html.match(/href="(\/uc\?export=download[^"]*)"/)
          || html.match(/action="([^"]*download[^"]*)"/)
        if (dlMatch) {
          let dlUrl = dlMatch[1].replace(/&amp;/g, '&')
          if (dlUrl.startsWith('/')) dlUrl = `https://drive.google.com${dlUrl}`
          const dlResp = await tryFetch(dlUrl, fetchHeaders)
          if (isVideoResponse(dlResp)) {
            response = dlResp
            break
          }
        }
      }
    }

    if (!response) {
      console.error('[video-proxy] All URL patterns failed for file:', fileId)
      console.error('[video-proxy] Last HTML snippet:', lastHtml.substring(0, 500))
      return jsonErr('Could not resolve video stream — file may not be shared publicly', 502)
    }

    // Build response with CORS headers
    const respHeaders = new Headers(CORS)
    respHeaders.set('Content-Type', response.headers.get('Content-Type') || 'video/mp4')
    respHeaders.set('Accept-Ranges', 'bytes')
    respHeaders.set('Cache-Control', 'public, max-age=3600, s-maxage=7200')

    const contentLength = response.headers.get('Content-Length')
    if (contentLength) respHeaders.set('Content-Length', contentLength)

    const contentRange = response.headers.get('Content-Range')
    if (contentRange) respHeaders.set('Content-Range', contentRange)

    return new Response(response.body, {
      status: response.status,
      headers: respHeaders,
    })
  } catch (e) {
    console.error('[video-proxy] Error:', e)
    return jsonErr('Failed to fetch video', 502)
  }
})
