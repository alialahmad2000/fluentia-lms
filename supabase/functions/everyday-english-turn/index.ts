// Fluentia LMS — إنجليزي يومي (Everyday English): voiced real-life roleplay turn orchestrator.
// A SIBLING of speaking-conversation-turn, fully ISOLATED from the curriculum: its own tables
// (everyday_english_*), never writes student_curriculum_progress or speaking_recordings.
//
// Actions:
//   start  → open a session for a scenario with a warm in-character opening line (voiced)
//   turn   → one student spoken turn: download audio (voice-notes) → Whisper → Claude reply
//            (in character, gentle recast, 1–2 sentences, one question) → ElevenLabs TTS
//   finish → a short, WARM recap (not a harsh grade): one thing done well, one natural upgrade,
//            one tip — and the student's strongest spoken line. Marks the session completed.
//
// Each student turn is committed to the DB BEFORE the AI reply is requested (resumable).
// Idempotent per client_turn_uuid. The partner speaks clear English; د. علي is the Arabic frame.
//
// Deploy: node scripts/_deploy-fn.cjs everyday-english-turn   (verify_jwt:false)
// Env: OPENAI_API_KEY, CLAUDE_API_KEY, ELEVENLABS_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || ''
const CLAUDE_API_KEY  = Deno.env.get('CLAUDE_API_KEY') || Deno.env.get('ANTHROPIC_API_KEY') || ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') || ''
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

// English partner voice via OpenAI TTS. OPENAI_API_KEY is already provisioned + working
// (Whisper uses it). This feature deliberately does NOT depend on ElevenLabs (retired ~June 2026),
// so the partner always has a voice regardless of the ElevenLabs subscription state.
const TTS_VOICE  = 'nova'   // warm, friendly female English voice
const TTS_MODEL  = 'tts-1'
const TTS_BUCKET = 'curriculum-audio'

const MAX_STUDENT_TURNS = 6   // shorter than curriculum — it's a quick daily
const WRAP_HINT_AFTER   = 4

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
  3: 'B1 Intermediate — natural questions, opinions, ask for reasons and a little detail.',
  4: 'B2 Upper-intermediate — richer vocabulary, gentle challenge, follow-ups that push for nuance.',
  5: 'C1 Advanced — near-natural, nuanced, can lightly riff on the topic while staying warm.',
}

// ── OpenAI TTS, content-addressed cache (public curriculum-audio bucket) ──
async function synthesize(sb: any, text: string): Promise<string | null> {
  const clean = (text || '').trim()
  if (!clean || !OPENAI_API_KEY) return null
  const hash = await sha256hex(`${TTS_VOICE}|oai-${TTS_MODEL}|${clean}`)
  const path = `everyday-tts/${hash}.mp3`
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${TTS_BUCKET}/${path}`
  try {
    const head = await fetch(publicUrl, { method: 'HEAD' })
    if (head.ok) return publicUrl
  } catch { /* fall through to synth */ }
  try {
    const tts = await fetchWithTimeout('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: TTS_MODEL, voice: TTS_VOICE, input: clean, response_format: 'mp3' }),
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

// In-character roleplay system prompt built from the scenario row.
function buildScenarioPrompt(s: any, levelDesc: string, wrap: boolean): string {
  const phrases = Array.isArray(s?.useful_phrases) && s.useful_phrases.length ? s.useful_phrases.join('; ') : ''
  return `${s?.ai_role || 'You are a friendly person in an everyday real-life situation with an adult Arabic-speaking English learner at Fluentia Academy in Saudi Arabia.'}

This is a SPOKEN everyday-English roleplay to help the learner practise real-life English.
SITUATION (stay inside it, never drift): "${s?.title_en || 'an everyday conversation'}"
${s?.situation_en ? `Scene: ${s.situation_en}` : ''}
${s?.student_role ? `The learner's goal: ${s.student_role}` : ''}
${phrases ? `Natural phrases you can create openings for: ${phrases}` : ''}
Learner level: ${levelDesc}

HOW TO TALK:
- Your reply is SPOKEN ALOUD by text-to-speech. Output ONLY the words your character says — NEVER stage directions, actions, asterisks, brackets, or narration.
- Stay IN CHARACTER the whole time. Reply in ENGLISH only, 1–2 short sentences, and end most replies with ONE question or prompt that moves the situation forward. The learner should talk much more than you.
- Match their level (above). Be warm, natural and human — no lists, no meta talk, never say you are an AI, never break character to teach.
- NEVER correct grammar explicitly. If they make a meaning-blocking mistake, gently model the correct form INSIDE your in-character reply (a natural recast): if they say "I want two coffee", you say "Sure, two coffees coming up — anything else?".
- If they answer in Arabic or get stuck, kindly receive the meaning, give them the simple English way to say it as part of your reply, then continue the scene.
${wrap ? '- IMPORTANT: begin wrapping the scene up now IN CHARACTER — move to a natural conclusion (the order is placed, the booking is made, a friendly goodbye), warmly.' : ''}`
}

// Stage-direction strip (TTS-safe): remove *smiles*, [laughs], (waves)… keep ≤2-word emphasis.
function stripStageDirections(text: string): string {
  return (text || '')
    .replace(/\*([^*\n]{1,80})\*/g, (_m, inner) => inner.trim().split(/\s+/).length <= 2 ? inner : ' ')
    .replace(/\[[^\]\n]{1,80}\]/g, ' ')
    .replace(/^\([^)\n]{1,80}\)\s*/gm, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function callClaude(system: string, messages: any[], maxTokens = 220): Promise<{ text: string; inT: number; outT: number }> {
  const r = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: maxTokens, temperature: 0.7, system, messages }),
  }, 45000)
  if (!r.ok) throw new Error(`claude ${r.status}: ${(await r.text()).slice(0, 160)}`)
  const j = await r.json()
  return { text: (j.content?.[0]?.text || '').trim(), inT: j.usage?.input_tokens || 0, outT: j.usage?.output_tokens || 0 }
}

async function logUsage(sb: any, studentId: string, inT: number, outT: number) {
  try {
    const costSAR = ((inT * 1 + outT * 5) / 1_000_000) * 3.75
    await sb.from('ai_usage').insert({
      type: 'chatbot', student_id: studentId, model: 'claude-haiku-4-5', input_tokens: inT, output_tokens: outT,
      estimated_cost_sar: costSAR.toFixed(4),
    })
  } catch { /* non-blocking */ }
}

async function loadContext(sb: any, scenarioId: string, studentId: string) {
  const { data: scn } = await sb.from('everyday_english_scenarios').select('*').eq('id', scenarioId).maybeSingle()
  let level = 1
  const { data: s } = await sb.from('students').select('academic_level, gender').eq('id', studentId).maybeSingle()
  if (s?.academic_level) level = Math.min(5, Math.max(1, s.academic_level))
  // clamp to scenario's suitable range
  if (scn) level = Math.min(scn.level_max || 5, Math.max(scn.level_min || 1, level))
  return { scn, level, gender: s?.gender === 'male' ? 'male' : 'female' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

  let body: any
  try { body = await req.json() } catch { return json({ error: 'bad body' }, 400) }
  const { action } = body

  // Auth + effective student (impersonation-aware, mirrors the speaking engine)
  const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401)
  const callerId = user.id
  const { data: caller } = await sb.from('profiles').select('role').eq('id', callerId).maybeSingle()
  const isStaff = caller?.role === 'admin' || caller?.role === 'trainer'

  try {
    // ── START ──
    if (action === 'start') {
      const { scenario_id } = body
      if (!scenario_id) return json({ error: 'scenario_id required' }, 400)
      const studentId = (body.as_student_id && isStaff && body.as_student_id !== callerId) ? body.as_student_id : callerId

      const { scn, level } = await loadContext(sb, scenario_id, studentId)
      if (!scn) return json({ error: 'scenario not found' }, 404)
      const levelDesc = LEVEL_DESCRIPTORS[level] || LEVEL_DESCRIPTORS[1]

      const { data: sess, error: sErr } = await sb.from('everyday_english_sessions').insert({
        student_id: studentId, scenario_id, status: 'in_progress',
      }).select().single()
      if (sErr || !sess) return json({ error: `create failed: ${sErr?.message}` }, 500)

      const system = buildScenarioPrompt(scn, levelDesc, false)
      const openUser = '[The learner just entered the scene and may be a little nervous. Open IN CHARACTER in 1–2 short sentences (greet them the way your character naturally would in this situation), then ask your first simple question to get the scene going.]'
      let replyText = ''
      try {
        const c = await callClaude(system, [{ role: 'user', content: openUser }], 200)
        replyText = stripStageDirections(c.text)
        if (!replyText) replyText = `Hi there! How can I help you today?`
        await logUsage(sb, studentId, c.inT, c.outT)
      } catch (_e) {
        replyText = `Hi there! Let's get started — how can I help you today?`
      }
      const audioUrl = await synthesize(sb, replyText)
      await sb.from('everyday_english_turns').insert({
        session_id: sess.id, student_id: studentId, turn_index: 0, role: 'ai', content: replyText, audio_path: audioUrl,
      })
      return json({
        session_id: sess.id,
        scenario: { id: scn.id, title_en: scn.title_en, title_ar: scn.title_ar, emoji: scn.emoji, useful_phrases: scn.useful_phrases || [], student_role: scn.student_role },
        reply: replyText, reply_audio_url: audioUrl, turn_count: 0, done: false,
      })
    }

    // ── TURN ──
    if (action === 'turn') {
      const { session_id, audio_path, audio_duration_seconds = 0, client_turn_uuid } = body
      if (!session_id || !audio_path) return json({ error: 'session_id and audio_path required' }, 400)

      const { data: sess } = await sb.from('everyday_english_sessions').select('*').eq('id', session_id).maybeSingle()
      if (!sess) return json({ error: 'session not found' }, 404)
      if (sess.student_id !== callerId && !isStaff) return json({ error: 'Forbidden' }, 403)
      if (sess.status !== 'in_progress') return json({ error: 'session already finished', done: true }, 409)
      const studentId = sess.student_id

      // Idempotency
      if (client_turn_uuid) {
        const { data: existing } = await sb.from('everyday_english_turns').select('turn_index, content')
          .eq('session_id', session_id).eq('client_turn_uuid', client_turn_uuid).maybeSingle()
        if (existing) {
          const { data: aiTurn } = await sb.from('everyday_english_turns')
            .select('content, audio_path').eq('session_id', session_id)
            .eq('role', 'ai').gt('turn_index', existing.turn_index).order('turn_index').limit(1).maybeSingle()
          return json({
            transcript: existing.content || '', reply: aiTurn?.content || '', reply_audio_url: aiTurn?.audio_path || null,
            done: (sess.turn_count || 0) >= MAX_STUDENT_TURNS, turn_count: sess.turn_count || 0, idempotent: true,
          })
        }
      }

      let transcript = ''
      try { transcript = await transcribe(sb, audio_path) } catch (e: any) {
        return json({ ok: false, error: 'transcribe_failed', message: e.message }, 200)
      }
      if (!transcript || transcript.replace(/[^a-zA-Z؀-ۿ]/g, '').length < 2) {
        const nudge = "I didn't quite catch that — could you say it again, a little louder?"
        const nudgeAudio = await synthesize(sb, nudge)
        return json({ transcript: '', reply: nudge, reply_audio_url: nudgeAudio, done: false, no_advance: true, turn_count: sess.turn_count || 0 })
      }

      const { data: turns } = await sb.from('everyday_english_turns')
        .select('turn_index, role, content').eq('session_id', session_id).order('turn_index')
      const nextIdx = (turns && turns.length) ? turns[turns.length - 1].turn_index + 1 : 0

      await sb.from('everyday_english_turns').insert({
        session_id, student_id: studentId, turn_index: nextIdx, role: 'student',
        content: transcript, audio_path, audio_duration_seconds: Math.round(audio_duration_seconds), client_turn_uuid: client_turn_uuid || null,
      })
      const newCount = (sess.turn_count || 0) + 1
      await sb.from('everyday_english_sessions').update({
        turn_count: newCount,
        total_speaking_seconds: (sess.total_speaking_seconds || 0) + Math.round(audio_duration_seconds),
        updated_at: new Date().toISOString(),
      }).eq('id', session_id)

      const { scn, level } = await loadContext(sb, sess.scenario_id, studentId)
      const levelDesc = LEVEL_DESCRIPTORS[level] || LEVEL_DESCRIPTORS[1]
      const wrap = newCount >= MAX_STUDENT_TURNS || newCount >= WRAP_HINT_AFTER
      const done = newCount >= MAX_STUDENT_TURNS
      const system = buildScenarioPrompt(scn, levelDesc, wrap)

      const history = [
        ...(turns || []).filter((t: any) => t.content).map((t: any) => ({ role: t.role === 'ai' ? 'assistant' : 'user', content: t.content })),
        { role: 'user', content: transcript },
      ]
      if (history[0]?.role === 'assistant') history.unshift({ role: 'user', content: 'Hi' })

      let replyText = ''
      try {
        const c = await callClaude(system, history, 200)
        replyText = stripStageDirections(c.text) || "That's great. Tell me a little more?"
        await logUsage(sb, studentId, c.inT, c.outT)
      } catch (_e) {
        replyText = "Got it — and what else?"
      }
      const audioUrl = await synthesize(sb, replyText)
      await sb.from('everyday_english_turns').insert({
        session_id, student_id: studentId, turn_index: nextIdx + 1, role: 'ai', content: replyText, audio_path: audioUrl,
      })
      return json({ transcript, reply: replyText, reply_audio_url: audioUrl, done, turn_count: newCount, turn_index: nextIdx })
    }

    // ── FINISH (warm recap, never a harsh grade) ──
    if (action === 'finish') {
      const { session_id } = body
      if (!session_id) return json({ error: 'session_id required' }, 400)

      const { data: sess } = await sb.from('everyday_english_sessions').select('*').eq('id', session_id).maybeSingle()
      if (!sess) return json({ error: 'session not found' }, 404)
      if (sess.student_id !== callerId && !isStaff) return json({ error: 'Forbidden' }, 403)
      const studentId = sess.student_id

      // Already finished → return stored recap
      if (sess.status === 'completed' && sess.recap) {
        return json({ ok: true, recap: sess.recap, your_best_line: sess.your_best_line, already: true })
      }

      const { data: turns } = await sb.from('everyday_english_turns')
        .select('role, content').eq('session_id', session_id).order('turn_index')
      const studentTurns = (turns || []).filter((t: any) => t.role === 'student' && t.content)
      if (studentTurns.length < 1) {
        return json({ ok: false, reason: 'need_more', message: 'Say at least one line first.' }, 200)
      }
      const bestLine = studentTurns.map((t: any) => t.content).sort((a: string, b: string) => b.length - a.length)[0] || ''

      const { scn, gender } = await loadContext(sb, sess.scenario_id, studentId)
      const transcriptText = (turns || []).map((t: any) => `${t.role === 'ai' ? 'Partner' : 'Learner'}: ${t.content}`).join('\n')
      const genderNote = gender === 'male' ? 'The learner is MALE — use masculine Arabic 2nd-person forms.' : 'The learner is FEMALE — use feminine Arabic 2nd-person forms.'

      let recap: any = null
      try {
        const sys = `You are د. علي, a warm, encouraging English coach at Fluentia (طلاقة) in Saudi Arabia. A learner just finished a short everyday-English roleplay ("${scn?.title_en || 'a conversation'}"). Give SHORT, kind, motivating feedback in ARABIC (Najdi-friendly, warm). ${genderNote} Be specific and reference what they actually said. NEVER be harsh — this is optional daily practice, the goal is confidence. Use the brand name طلاقة (never transliterate). Respond with ONLY a JSON object, no markdown:
{
  "headline_ar": "one warm celebratory line (≤12 words)",
  "did_well_ar": "one specific thing they did well, referencing their words (≤25 words)",
  "upgrade": { "you_said": "a short phrase they actually said (English)", "nicer": "a more natural native version (English)" },
  "tip_ar": "one short practical tip for next time (≤20 words)"
}
If there is nothing worth upgrading, set "upgrade" to null.`
        const c = await callClaude(sys, [{ role: 'user', content: `Conversation:\n"""\n${transcriptText}\n"""\n\nReturn the JSON now.` }], 500)
        const raw = c.text.replace(/^```(json)?/i, '').replace(/```$/,'').trim()
        const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
        if (start >= 0 && end > start) recap = JSON.parse(raw.slice(start, end + 1))
        await logUsage(sb, studentId, c.inT, c.outT)
      } catch (_e) { recap = null }

      // Never-fail fallback so finish ALWAYS completes the session
      if (!recap || !recap.headline_ar) {
        recap = {
          headline_ar: gender === 'male' ? 'أحسنت! خلّصت محادثتك بالإنجليزي 🎉' : 'أحسنتِ! خلّصتِ محادثتكِ بالإنجليزي 🎉',
          did_well_ar: gender === 'male' ? 'تكلّمت بثقة وكمّلت الموقف للنهاية — هذا أهم شي.' : 'تكلّمتِ بثقة وكمّلتِ الموقف للنهاية — هذا أهم شي.',
          upgrade: null,
          tip_ar: gender === 'male' ? 'جرّب تضيف تفصيل بسيط في كل جواب المرة الجاية.' : 'جرّبي تضيفين تفصيل بسيط في كل جواب المرة الجاية.',
          fallback: true,
        }
      }

      await sb.from('everyday_english_sessions').update({
        status: 'completed', recap, your_best_line: bestLine, completed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('id', session_id)

      return json({ ok: true, recap, your_best_line: bestLine })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e: any) {
    return json({ error: String(e?.message || e) }, 500)
  }
})
