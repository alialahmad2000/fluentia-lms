// Deploy: supabase functions deploy duel-question-next --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

import { createClient } from 'npm:@supabase/supabase-js@2.39.0'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No auth header' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { duel_id, round_number } = await req.json()
    if (!duel_id || round_number === undefined) return json({ error: 'duel_id and round_number required' }, 400)

    const userId = user.id

    // Get duel
    const { data: duel, error: duelErr } = await supabase
      .from('duels')
      .select('*')
      .eq('id', duel_id)
      .single()

    if (duelErr || !duel) return json({ error: 'Duel not found' }, 404)

    // Verify player is in this duel
    if (duel.player_a !== userId && duel.player_b !== userId) {
      return json({ error: 'Not your duel' }, 403)
    }

    if (duel.status !== 'active') {
      return json({ error: 'Duel is not active' }, 400)
    }

    if (round_number < 1 || round_number > duel.round_count) {
      return json({ error: 'Invalid round number' }, 400)
    }

    const questionIndex = round_number - 1
    const questions = duel.questions as any[]

    if (!questions[questionIndex]) {
      return json({ error: 'Question not found' }, 404)
    }

    // Record server timestamp for when question was sent to this player
    const now = Date.now()
    const updatedQuestions = [...questions]
    if (!updatedQuestions[questionIndex].sent_at) {
      updatedQuestions[questionIndex].sent_at = {}
    }
    updatedQuestions[questionIndex].sent_at[userId] = now

    await supabase
      .from('duels')
      .update({ questions: updatedQuestions, current_round: round_number })
      .eq('id', duel_id)

    // Return question WITHOUT correct answer
    const q = questions[questionIndex]
    return json({
      round_number,
      total_rounds: duel.round_count,
      question: {
        type: q.type,
        word: q.word,
        choices: q.choices,
      },
      server_timestamp: now,
    })
  } catch (err) {
    console.error('duel-question-next error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
