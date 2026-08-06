// Generate listening-clip audio for STEP from authored transcripts.
//
// Bulk TTS runs on OpenAI, not ElevenLabs, on purpose: voice is this project's
// real cost line (past months: SAR ~1,173 voice vs ~SAR 22 tokens), and there
// are ~105 clips totalling roughly 100k characters. ElevenLabs is reserved for
// hero clips only.
//
// Two mono voices are used so a conversation has two distinct speakers, and the
// output is uniform mono — a past incident had mixed mono/stereo frames play in
// Chrome and go SILENT in Safari, which is most of this platform's traffic.
//
// Admin-only. Deployed with --no-verify-jwt; auth is checked here.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const BUCKET = 'curriculum-audio'
const VOICE_LECTURE = 'onyx'
const VOICE_CONVO_A = 'nova'
const VOICE_CONVO_B = 'echo'

async function tts(text: string, voice: string, key: string): Promise<Uint8Array> {
  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', voice, input: text, response_format: 'mp3', speed: 0.95 }),
  })
  if (!r.ok) throw new Error(`openai tts ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return new Uint8Array(await r.arrayBuffer())
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const openai = Deno.env.get('OPENAI_API_KEY')
    if (!openai) return json({ error: 'OPENAI_API_KEY not configured' }, 500)

    const { data: u } = await admin.auth.getUser((req.headers.get('Authorization') ?? '').replace('Bearer ', ''))
    if (!u?.user) return json({ error: 'unauthorized' }, 401)
    const { data: prof } = await admin.from('profiles').select('role').eq('id', u.user.id).maybeSingle()
    if (prof?.role !== 'admin') return json({ error: 'admin only' }, 403)

    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { return json({ error: 'bad json' }, 400) }
    const limit = Math.min(Number(body.limit ?? 5), 25)
    const only = body.clip_id ? String(body.clip_id) : null

    // Only clips that have a transcript and no audio yet — idempotent by design,
    // so a re-run resumes rather than re-billing what is already voiced.
    let q = admin.from('step_recordings')
      .select('id,clip_id,kind,transcript')
      .eq('audio_status', 'scripted')
      .not('transcript', 'is', null)
      .limit(limit)
    if (only) q = admin.from('step_recordings')
      .select('id,clip_id,kind,transcript').eq('clip_id', only).limit(1)

    const { data: clips, error } = await q
    if (error) return json({ error: error.message }, 500)
    if (!clips?.length) return json({ done: true, generated: 0, message: 'nothing scripted and unvoiced' })

    const results: unknown[] = []
    for (const c of clips) {
      try {
        const script = String(c.transcript ?? '').trim()
        if (!script) { results.push({ clip_id: c.clip_id, skipped: 'empty transcript' }); continue }

        // A conversation is written with "— " turn markers; alternate voices so
        // the two speakers are actually distinguishable.
        let audio: Uint8Array
        if (c.kind === 'conversation' && script.includes('—')) {
          const turns = script.split('\n').map((t) => t.replace(/^—\s*/, '').trim()).filter(Boolean)
          const parts: Uint8Array[] = []
          for (let i = 0; i < turns.length; i++) {
            parts.push(await tts(turns[i], i % 2 === 0 ? VOICE_CONVO_A : VOICE_CONVO_B, openai))
          }
          const total = parts.reduce((n, p) => n + p.length, 0)
          audio = new Uint8Array(total)
          let off = 0
          for (const p of parts) { audio.set(p, off); off += p.length }
        } else {
          audio = await tts(script, VOICE_LECTURE, openai)
        }

        const path = `step/listening/${c.clip_id}.mp3`
        const { error: upErr } = await admin.storage.from(BUCKET)
          .upload(path, audio, { contentType: 'audio/mpeg', upsert: true })
        if (upErr) throw new Error(`upload: ${upErr.message}`)

        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path)
        await admin.from('step_recordings').update({
          audio_url: pub.publicUrl,
          audio_status: 'voiced',
          voice_id: c.kind === 'conversation' ? `${VOICE_CONVO_A}+${VOICE_CONVO_B}` : VOICE_LECTURE,
          audio_generated_at: new Date().toISOString(),
          is_published: true,
        }).eq('id', c.id)

        results.push({ clip_id: c.clip_id, bytes: audio.length, url: pub.publicUrl })
      } catch (e) {
        results.push({ clip_id: c.clip_id, error: String((e as Error)?.message ?? e) })
      }
    }

    const { count: remaining } = await admin.from('step_recordings')
      .select('id', { count: 'exact', head: true }).eq('audio_status', 'scripted')

    return json({
      generated: results.filter((r: any) => r.url).length,
      failed: results.filter((r: any) => r.error).length,
      remaining_scripted: remaining ?? 0,
      results,
    })
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500)
  }
})
