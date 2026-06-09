// library-shadow-score — score a student reading a novel sentence aloud (shadowing).
// Whisper transcribes their audio; we score it against the target sentence (LCS over
// normalized words) and save to library_shadow_attempts. Env: OPENAI_API_KEY, SUPABASE_*.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const J = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status })

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').split(/\s+/).filter(Boolean)
function lcs(a: string[], b: string[]) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return dp[m][n]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '')
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return J({ error: 'Unauthorized' }, 401)

    let body: any
    try { body = await req.json() } catch { return J({ error: 'Invalid body' }, 400) }
    const { audio_base64, mime, target_text, p, s, chapter_id, book_id } = body
    if (!audio_base64 || !target_text || !chapter_id) return J({ error: 'Missing fields' }, 400)
    if (!OPENAI_API_KEY) return J({ error: 'STT unavailable' }, 503)

    // decode base64 → bytes
    const bin = atob(String(audio_base64).split(',').pop() || '')
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const ext = (mime || '').includes('mp4') ? 'mp4' : (mime || '').includes('mpeg') ? 'mp3' : 'webm'

    const fd = new FormData()
    fd.append('file', new Blob([bytes], { type: mime || 'audio/webm' }), `shadow.${ext}`)
    fd.append('model', 'whisper-1')
    fd.append('language', 'en')
    fd.append('response_format', 'text')
    const wr = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: fd })
    if (!wr.ok) return J({ error: 'transcription_failed', detail: (await wr.text()).slice(0, 200) }, 502)
    const transcript = (await wr.text()).trim()

    const T = norm(target_text), H = norm(transcript)
    const matched = lcs(T, H)
    const score = T.length ? Math.round((matched / T.length) * 100) : 0
    const hset = new Set(H)
    const missed = T.filter((w) => !hset.has(w)).slice(0, 6)
    const feedback_ar = score >= 90 ? 'نطقٌ ممتاز — واضح ومتقن'
      : score >= 75 ? 'جيد جداً — قريبة جداً من الراوي'
      : score >= 55 ? 'جيد — ركّزي على الكلمات الملوّنة وأعيدي'
      : 'لا بأس — استمعي للراوي مرة أخرى ثم ردّدي ببطء'

    // best-effort save (never blocks the response)
    try {
      await supabase.from('library_shadow_attempts').insert({
        student_id: user.id, chapter_id, book_id: book_id ?? null, p: p ?? 0, s: s ?? 0,
        target_text, transcript, score,
      })
    } catch (_e) { /* ignore */ }

    return J({ score, transcript, feedback_ar, missed_words: missed })
  } catch (e) {
    return J({ error: String((e as Error)?.message || e) }, 500)
  }
})
