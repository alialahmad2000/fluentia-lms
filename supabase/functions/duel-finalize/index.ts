// Deploy: supabase functions deploy duel-finalize --no-verify-jwt --project-ref nmjexpuycmqcxuxljier
// Standalone finalization endpoint — for disconnect handling and manual triggers

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

async function broadcast(topic: string, event: string, payload: any) {
  const url = Deno.env.get('SUPABASE_URL')!
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ messages: [{ topic, event, payload }] }),
  })
}

function calculateElo(ratingA: number, ratingB: number, scoreA: number): [number, number] {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const expectedB = 1 - expectedA
  const newA = Math.round(ratingA + 32 * (scoreA - expectedA))
  const newB = Math.round(ratingB + 32 * ((1 - scoreA) - expectedB))
  return [newA, newB]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No auth header' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { duel_id, reason } = await req.json()
    if (!duel_id) return json({ error: 'duel_id required' }, 400)

    const userId = user.id

    const { data: duel } = await supabase.from('duels').select('*').eq('id', duel_id).single()
    if (!duel) return json({ error: 'Duel not found' }, 404)
    if (duel.player_a !== userId && duel.player_b !== userId) return json({ error: 'Not your duel' }, 403)
    if (duel.status === 'finished') return json({ error: 'Already finished' }, 400)

    // If reason is 'disconnect' — the caller is reporting that THEY disconnected
    // or timing out — the other player wins by default
    if (reason === 'disconnect' || reason === 'abandon') {
      const winnerId = userId === duel.player_a ? duel.player_b : duel.player_a
      const loserId = userId

      await supabase.from('duels').update({
        status: 'abandoned',
        winner_id: winnerId,
        finished_at: new Date().toISOString(),
      }).eq('id', duel_id)

      // Update stats
      const { data: winnerStats } = await supabase.from('duel_stats').select('*').eq('student_id', winnerId).single()
      const { data: loserStats } = await supabase.from('duel_stats').select('*').eq('student_id', loserId).single()

      const eloW = winnerStats?.elo || 1000
      const eloL = loserStats?.elo || 1000
      const [newEloW, newEloL] = calculateElo(eloW, eloL, 1)

      await supabase.from('duel_stats').update({
        wins: (winnerStats?.wins || 0) + 1,
        elo: newEloW,
        current_streak: (winnerStats?.current_streak || 0) + 1,
        best_streak: Math.max((winnerStats?.best_streak || 0), (winnerStats?.current_streak || 0) + 1),
        duels_today: (winnerStats?.duels_today || 0) + 1,
        last_duel_at: new Date().toISOString(),
      }).eq('student_id', winnerId)

      await supabase.from('duel_stats').update({
        losses: (loserStats?.losses || 0) + 1,
        elo: newEloL,
        current_streak: 0,
        duels_today: (loserStats?.duels_today || 0) + 1,
        last_duel_at: new Date().toISOString(),
      }).eq('student_id', loserId)

      // Winner gets +20 XP
      await supabase.from('xp_transactions').insert({
        student_id: winnerId,
        amount: 20,
        reason: 'duel_win',
        note: `فوز بانسحاب الخصم — مبارزة #${duel_id.slice(0, 8)}`
      })

      const resultPayload = {
        duel_id,
        winner_id: winnerId,
        reason: 'opponent_disconnected',
        elo_winner: newEloW,
        elo_loser: newEloL,
        xp_delta_winner: 20,
        xp_delta_loser: 0,
      }

      await broadcast(`duel:${duel.player_a}`, 'duel:finished', resultPayload)
      await broadcast(`duel:${duel.player_b}`, 'duel:finished', resultPayload)

      return json({ status: 'abandoned', winner_id: winnerId })
    }

    return json({ error: 'Invalid reason' }, 400)
  } catch (err) {
    console.error('duel-finalize error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
