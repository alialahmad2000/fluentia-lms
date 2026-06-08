// Fluentia LMS — Speaking Conversation: turn orchestrator
// One edge fn for: (action='start') open the conversation with a warm AI greeting + first
// question (voiced), and (action='turn') process one student spoken turn:
//   download student audio (voice-notes) → Whisper STT → Claude reply (level/topic-aware,
//   gentle recast, 1–2 sentences, one question) → ElevenLabs TTS (warm female English) →
//   persist both turns → return { transcript, reply, reply_audio_url, done }.
//
// Each student turn is committed to the DB BEFORE the AI reply is requested, so a dropped
// connection / closed tab never loses work (the conversation is resumable from the DB).
// Idempotent per client_turn_uuid so a retried submit is a no-op (returns the same reply).
//
// Deploy: node scripts/_deploy-fn.cjs speaking-conversation-turn   (verify_jwt:false)
// Env: OPENAI_API_KEY, CLAUDE_API_KEY, ELEVENLABS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY  = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const ELEVEN_KEY      = Deno.env.get('ELEVENLABS_API_KEY') || ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// Warm, gentle female English voice for the coach (ElevenLabs default "Rachel").
const VOICE_ID  = '21m00Tcm4TlvDq8ikWAM'
const TTS_BUCKET = 'curriculum-audio'

const MAX_STUDENT_TURNS = 8   // hard cap — after this the AI wraps up (done=true)
const WRAP_HINT_AFTER    = 5  // begin steering toward a graceful close from here

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: s })

async function fetchWithTimeout(url: string, init: RequestInit, ms = 45000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try { return await fetch(url, { ...init, signal: ctrl.signal }) }
  catch (e: any) { if (e.name === 'AbortError') throw new Error(`timeout ${ms}ms: ${url}`); throw e }
  finally { clearTimeout(t) }
}

async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

const LEVEL_DESCRIPTORS: Record<number, string> = {
  1: 'A1 Beginner — use VERY simple words and short present-tense sentences, one easy idea at a time. Concrete, friendly, slow.',
  2: 'A2 Elementary — simple everyday language, short follow-up questions like "why?" / "what else?".',
  3: 'B1 Intermediate — natural questions, opinions, ask them to give reasons and a little detail.',
  4: 'B2 Upper-intermediate — richer vocabulary, gentle challenge, follow-ups that push for nuance.',
  5: 'C1 Advanced — near-natural, nuanced, can lightly debate the topic while staying warm.',
}

// ── ElevenLabs sentence TTS, content-addressed cache in the public curriculum-audio bucket ──
async function synthesize(sb: any, text: string): Promise<string | null> {
  const clean = (text || '').trim()
  if (!clean) return null
  const hash = await sha256hex(VOICE_ID + '|v2t|' + clean)
  const path = `conversation-tts/${hash}.mp3`
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${TTS_BUCKET}/${path}`
  try {
    const head = await fetch(publicUrl, { method: 'HEAD' })
    if (head.ok) return publicUrl
  } catch { /* fall through to synth */ }
  if (!ELEVEN_KEY) return null
  try {
    const tts = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_KEY, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text: clean,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    }, 30000)
    if (!tts.ok) return null
    const bytes = new Uint8Array(await tts.arrayBuffer())
    await sb.storage.from(TTS_BUCKET).upload(path, bytes, {
      contentType: 'audio/mpeg', cacheControl: '31536000', upsert: true,
    })
    return publicUrl
  } catch { return null }
}

// ── Whisper STT of a voice-notes storage path ──
async function transcribe(sb: any, audioPath: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set')
  const { data: blob, error } = await sb.storage.from('voice-notes').download(audioPath)
  if (error || !blob) throw new Error(`audio download failed: ${error?.message}`)
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const mime = blob.type || 'audio/mp4'
  const ext = mime.includes('webm') ? 'webm' : mime.includes('mpeg') ? 'mp3' : mime.includes('wav') ? 'wav' : 'mp4'
  const fd = new FormData()
  fd.append('file', new Blob([bytes], { type: mime }), `turn.${ext}`)
  fd.append('model', 'whisper-1')
  fd.append('language', 'en')
  const r = await fetchWithTimeout('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, body: fd,
  }, 45000)
  if (!r.ok) throw new Error(`whisper ${r.status}: ${(await r.text()).slice(0, 160)}`)
  const j = await r.json()
  return (j.text || '').trim()
}

function buildSystemPrompt(topic: any, levelDesc: string, wrap: boolean): string {
  const phrases = Array.isArray(topic?.useful_phrases) && topic.useful_phrases.length
    ? topic.useful_phrases.join('; ') : ''
  return `You are "Layla", a warm, patient English conversation partner for an adult Arabic-speaking learner at Fluentia Academy in Saudi Arabia. You are having a friendly SPOKEN conversation to help them practice speaking English about ONE topic.

TOPIC (keep the whole conversation on this, never drift): "${topic?.title_en || topic?.prompt_en || 'a friendly chat'}"
${topic?.prompt_en ? `Prompt: ${topic.prompt_en}` : ''}
${phrases ? `Phrases from their lesson you can naturally invite them to use: ${phrases}` : ''}
Learner level: ${levelDesc}

HOW TO TALK:
- Reply in ENGLISH only. Keep every reply to 1–2 short sentences and end most replies with ONE simple question, so they keep talking. They should talk much more than you.
- Match their level (above). Be warm, encouraging and human — no lists, no meta talk, never say you are an AI or a model.
- NEVER correct their grammar explicitly during the chat. If they make a meaning-blocking mistake, gently model the correct form INSIDE your reply (a natural recast): if they say "I go market yesterday", you reply "Oh, you went to the market yesterday — what did you buy?".
- If they answer in Arabic or get stuck, kindly receive the meaning, give them the simple English way to say it, then continue with your question. Never shame a mistake.
${wrap ? '- IMPORTANT: this conversation has gone on nicely — start to warmly wrap it up now. Acknowledge their effort, say something kind, and gently bring it to a close.' : ''}`
}

async function callClaude(system: string, messages: any[], maxTokens = 160): Promise<{ text: string; inT: number; outT: number }> {
  const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens, temperature: 0.7, system, messages }),
  }, 45000)
  if (!r.ok) throw new Error(`claude ${r.status}: ${(await r.text()).slice(0, 160)}`)
  const j = await r.json()
  return { text: (j.content?.[0]?.text || '').trim(), inT: j.usage?.input_tokens || 0, outT: j.usage?.output_tokens || 0 }
}

async function logUsage(sb: any, type: string, studentId: string, model: string, inT: number, outT: number) {
  try {
    const costSAR = ((inT * 1 + outT * 5) / 1_000_000) * 3.75
    await sb.from('ai_usage').insert({
      type, student_id: studentId, model, input_tokens: inT, output_tokens: outT,
      estimated_cost_sar: costSAR.toFixed(4),
    })
  } catch { /* non-blocking */ }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad body' }, 400) }
  const { action } = body

  // ── Auth: the student must own this conversation ──
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)
  const studentId = user.id

  // Resolve topic + level (shared by both actions)
  async function loadContext(unitId: string, speakingId?: string) {
    let topic: any = null
    if (speakingId) {
      const { data } = await sb.from('curriculum_speaking').select('*').eq('id', speakingId).maybeSingle()
      topic = data
    }
    if (!topic) {
      const { data } = await sb.from('curriculum_speaking').select('*')
        .eq('unit_id', unitId).order('sort_order').limit(1).maybeSingle()
      topic = data
    }
    let level = 1
    const { data: unitData } = await sb.from('curriculum_units')
      .select('level:curriculum_levels(level_number)').eq('id', unitId).maybeSingle()
    if ((unitData?.level as any)?.level_number) level = (unitData?.level as any).level_number
    if (level === 1) {
      const { data: s } = await sb.from('students').select('academic_level').eq('id', studentId).maybeSingle()
      if (s?.academic_level) level = s.academic_level
    }
    return { topic, level }
  }

  try {
    // ── START: create the conversation + warm opening (voiced) ──
    if (action === 'start') {
      const { unit_id, speaking_id, question_index = 0 } = body
      if (!unit_id) return json({ error: 'unit_id required' }, 400)
      const { topic, level } = await loadContext(unit_id, speaking_id)
      const levelDesc = LEVEL_DESCRIPTORS[level] || LEVEL_DESCRIPTORS[1]

      const { data: convo, error: cErr } = await sb.from('speaking_conversations').insert({
        student_id: studentId, unit_id, speaking_id: topic?.id || speaking_id || null,
        question_index, status: 'in_progress',
      }).select().single()
      if (cErr || !convo) return json({ error: `create failed: ${cErr?.message}` }, 500)

      const system = buildSystemPrompt(topic, levelDesc, false)
      const openUser = '[The learner just opened the speaking task and may be a little nervous. Greet them warmly, start the conversation in 1–2 short sentences, then ask your first VERY simple question about the topic.]'
      let replyText = ''
      try {
        const c = await callClaude(system, [{ role: 'user', content: openUser }], 160)
        replyText = c.text
        await logUsage(sb, 'chatbot', studentId, 'claude-haiku-4-5', c.inT, c.outT)
      } catch (_e) {
        replyText = `Hi! Let's have a little chat in English about ${topic?.title_en || 'today\'s topic'}. Don't worry — just speak slowly. To start, can you tell me a little about it?`
      }
      const audioUrl = await synthesize(sb, replyText)
      await sb.from('speaking_conversation_turns').insert({
        conversation_id: convo.id, student_id: studentId, turn_index: 0, role: 'ai',
        content: replyText, audio_path: audioUrl,
      })
      return json({
        conversation_id: convo.id,
        topic: topic ? {
          id: topic.id, title_en: topic.title_en, prompt_en: topic.prompt_en,
          prompt_ar: topic.prompt_ar, useful_phrases: topic.useful_phrases || [],
          min_duration_seconds: topic.min_duration_seconds, max_duration_seconds: topic.max_duration_seconds,
        } : null,
        reply: replyText, reply_audio_url: audioUrl, turn_index: 0, done: false, turn_count: 0,
      })
    }

    // ── TURN: one student spoken turn ──
    if (action === 'turn') {
      const { conversation_id, audio_path, audio_duration_seconds = 0, client_turn_uuid } = body
      if (!conversation_id || !audio_path) return json({ error: 'conversation_id and audio_path required' }, 400)

      const { data: convo } = await sb.from('speaking_conversations').select('*').eq('id', conversation_id).maybeSingle()
      if (!convo) return json({ error: 'conversation not found' }, 404)
      if (convo.student_id !== studentId) return json({ error: 'Forbidden' }, 403)
      if (convo.status !== 'in_progress') return json({ error: 'conversation already finished', done: true }, 409)

      // Idempotency: same client_turn_uuid already processed → return the AI reply that followed it
      if (client_turn_uuid) {
        const { data: existing } = await sb.from('speaking_conversation_turns').select('turn_index, content')
          .eq('conversation_id', conversation_id).eq('client_turn_uuid', client_turn_uuid).maybeSingle()
        if (existing) {
          const { data: aiTurn } = await sb.from('speaking_conversation_turns')
            .select('content, audio_path').eq('conversation_id', conversation_id)
            .eq('role', 'ai').gt('turn_index', existing.turn_index).order('turn_index').limit(1).maybeSingle()
          return json({
            transcript: existing.content || '', reply: aiTurn?.content || '',
            reply_audio_url: aiTurn?.audio_path || null,
            done: (convo.turn_count || 0) >= MAX_STUDENT_TURNS, turn_count: convo.turn_count || 0, idempotent: true,
          })
        }
      }

      // Whisper
      let transcript = ''
      try { transcript = await transcribe(sb, audio_path) } catch (e: any) {
        return json({ ok: false, error: 'transcribe_failed', message: e.message }, 200)
      }

      // Empty / silent → gentle nudge, do not advance, no DB write
      if (!transcript || transcript.replace(/[^a-zA-Z؀-ۿ]/g, '').length < 2) {
        const nudge = "I didn't quite catch that — could you say it again, a little louder?"
        const nudgeAudio = await synthesize(sb, nudge)
        return json({ transcript: '', reply: nudge, reply_audio_url: nudgeAudio, done: false, no_advance: true, turn_count: convo.turn_count || 0 })
      }

      // Load existing turns → next index + history
      const { data: turns } = await sb.from('speaking_conversation_turns')
        .select('turn_index, role, content').eq('conversation_id', conversation_id).order('turn_index')
      const nextIdx = (turns && turns.length) ? turns[turns.length - 1].turn_index + 1 : 0

      // Persist the STUDENT turn FIRST (durable before any AI work)
      await sb.from('speaking_conversation_turns').insert({
        conversation_id, student_id: studentId, turn_index: nextIdx, role: 'student',
        content: transcript, audio_path, audio_duration_seconds: Math.round(audio_duration_seconds), client_turn_uuid: client_turn_uuid || null,
      })
      const newStudentTurnCount = (convo.turn_count || 0) + 1
      await sb.from('speaking_conversations').update({
        turn_count: newStudentTurnCount,
        total_speaking_seconds: (convo.total_speaking_seconds || 0) + Math.round(audio_duration_seconds),
        updated_at: new Date().toISOString(),
      }).eq('id', conversation_id)

      // Context + reply
      const { topic, level } = await loadContext(convo.unit_id, convo.speaking_id)
      const levelDesc = LEVEL_DESCRIPTORS[level] || LEVEL_DESCRIPTORS[1]
      const wrap = newStudentTurnCount >= MAX_STUDENT_TURNS || newStudentTurnCount >= WRAP_HINT_AFTER
      const done = newStudentTurnCount >= MAX_STUDENT_TURNS
      const system = buildSystemPrompt(topic, levelDesc, wrap)

      const history = [
        ...(turns || []).filter((t: any) => t.content).map((t: any) => ({ role: t.role === 'ai' ? 'assistant' : 'user', content: t.content })),
        { role: 'user', content: transcript },
      ]
      if (history[0]?.role === 'assistant') history.unshift({ role: 'user', content: 'Hi' })

      let replyText = ''
      try {
        const c = await callClaude(system, history, 160)
        replyText = c.text || "That's great. Tell me a little more?"
        await logUsage(sb, 'chatbot', studentId, 'claude-haiku-4-5', c.inT, c.outT)
      } catch (_e) {
        replyText = "That's great — tell me a little more about that?"
      }

      const audioUrl = await synthesize(sb, replyText)
      await sb.from('speaking_conversation_turns').insert({
        conversation_id, student_id: studentId, turn_index: nextIdx + 1, role: 'ai',
        content: replyText, audio_path: audioUrl,
      })

      return json({ transcript, reply: replyText, reply_audio_url: audioUrl, done, turn_count: newStudentTurnCount, turn_index: nextIdx })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500)
  }
})
