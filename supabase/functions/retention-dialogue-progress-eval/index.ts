// retention-dialogue-progress-eval — final scoring + feedback for a finished
// dialogue attempt. Pure rule-based. Awards XP. Does not call Claude/OpenAI.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface TranscriptEntry {
  turn_id: string
  student_text: string
  duration_seconds?: number
  audio_path?: string
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ ok: false, error: 'Server misconfig' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!bearer) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing Authorization' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
  const { data: { user }, error: userErr } = await supabase.auth.getUser(bearer)
  if (userErr || !user) {
    return new Response(JSON.stringify({ ok: false, error: 'Invalid token' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: { attempt_id?: string; scenario_id?: string; transcript?: TranscriptEntry[] } = {}
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Bad JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const { attempt_id, scenario_id, transcript } = body
  if (!scenario_id || !Array.isArray(transcript)) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing scenario_id or transcript' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Load turns + feedback templates
    const { data: turns, error: turnsErr } = await supabase
      .from('retention_dialogue_turns')
      .select('id, expected_vocab, min_words, expected_response_type, is_terminal')
      .eq('scenario_id', scenario_id)
      .order('turn_number', { ascending: true })
    if (turnsErr) throw turnsErr

    const { data: templates } = await supabase
      .from('retention_feedback_templates')
      .select('*')
      .or(`scenario_id.eq.${scenario_id},scenario_id.is.null`)

    // 2. Compute per-turn + aggregate scoring (mirrors src/lib/retention/dialogueEval.js)
    const allExpectedVocab = new Set<string>()
    for (const t of turns ?? []) for (const v of (t.expected_vocab ?? [])) allExpectedVocab.add(v.toLowerCase())

    const hits = new Set<string>()
    let totalSeconds = 0
    let completedTurnCount = 0
    for (const entry of transcript ?? []) {
      const t = (turns ?? []).find((x) => x.id === entry.turn_id)
      if (!t) continue
      completedTurnCount += 1
      const text = (entry.student_text || '').toLowerCase().trim()
      for (const v of (t.expected_vocab ?? [])) {
        if (text.includes(v.toLowerCase())) hits.add(v.toLowerCase())
      }
      totalSeconds += entry.duration_seconds || 0
    }

    const vocabHitPct = allExpectedVocab.size > 0 ? Math.round((hits.size / allExpectedVocab.size) * 1000) / 10 : 0
    const completion = completedTurnCount >= (turns ?? []).length
      ? 'full' : completedTurnCount >= Math.ceil((turns ?? []).length / 2) ? 'partial' : 'minimal'

    // 3. Pick feedback template (most-specific match)
    const sortedTemplates = [...(templates ?? [])].sort((a, b) =>
      Object.keys(b.trigger_condition ?? {}).length - Object.keys(a.trigger_condition ?? {}).length
    )
    let pickedTemplate: any = null
    for (const t of sortedTemplates) {
      const cond = t.trigger_condition ?? {}
      let match = true
      for (const [k, v] of Object.entries(cond)) {
        if (k === 'vocab_hit_pct') {
          const op = String(v).match(/^(>=|<=|>|<|=)(.+)$/)
          if (!op) continue
          const target = parseFloat(op[2])
          const got = vocabHitPct
          if (op[1] === '>=' && !(got >= target)) match = false
          else if (op[1] === '<=' && !(got <= target)) match = false
          else if (op[1] === '>' && !(got > target)) match = false
          else if (op[1] === '<' && !(got < target)) match = false
          else if (op[1] === '=' && !(got === target)) match = false
        } else if (k === 'completion') {
          if (completion !== v) match = false
        }
      }
      if (match) { pickedTemplate = t; break }
    }

    // 4. XP — scale to effort: full + ≥80% vocab → +25, full → +15, partial → +8, minimal → +3
    let xp = 3
    if (completion === 'full' && vocabHitPct >= 80) xp = 25
    else if (completion === 'full' && vocabHitPct >= 50) xp = 18
    else if (completion === 'full') xp = 12
    else if (completion === 'partial') xp = 8

    // 5. Update the attempt row (must belong to caller)
    if (attempt_id) {
      const { error: updateErr } = await supabase
        .from('retention_dialogue_attempts')
        .update({
          completed_at: new Date().toISOString(),
          branch_path: (transcript ?? []).map((e) => e.turn_id),
          total_speaking_seconds: totalSeconds,
          vocab_hit_count: hits.size,
          vocab_hit_pct: vocabHitPct,
          feedback_template_id: pickedTemplate?.id ?? null,
          xp_awarded: xp,
          transcript,
        })
        .eq('id', attempt_id)
        .eq('student_id', user.id)
      if (updateErr) throw updateErr
    }

    // 6. Award XP
    await supabase.from('xp_transactions').insert({
      student_id: user.id,
      amount: xp,
      reason: 'challenge',
      description: 'محادثة يومية مكتملة',
      related_id: attempt_id ?? null,
    })

    // 7. log_activity (extends streak coverage)
    try {
      await supabase.rpc('log_activity' as any, {
        p_student_id: user.id,
        p_event_type: 'retention_dialogue',
        p_ref_table: 'retention_dialogue_attempts',
        p_ref_id: attempt_id,
        p_xp_delta: xp,
      })
    } catch {
      // log_activity signature may differ across deployments — fail soft
    }

    return new Response(
      JSON.stringify({
        ok: true,
        eval: {
          completion,
          vocab_hit_count: hits.size,
          vocab_total: allExpectedVocab.size,
          vocab_hit_pct: vocabHitPct,
          total_speaking_seconds: totalSeconds,
          completed_turn_count: completedTurnCount,
        },
        feedback_template: pickedTemplate ?? null,
        xp_awarded: xp,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e: any) {
    await supabase.from('system_errors').insert({
      error_type: 'retention_dialogue_progress_eval.error',
      service: 'retention-dialogue-progress-eval',
      error_message: e?.message ?? String(e),
      error_context: { user_id: user.id, scenario_id, attempt_id },
    })
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
