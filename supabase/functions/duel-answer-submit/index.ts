// Deploy: supabase functions deploy duel-answer-submit --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

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

// ELO calculation (K=32)
function calculateElo(ratingA: number, ratingB: number, scoreA: number): [number, number] {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const expectedB = 1 - expectedA
  const newA = Math.round(ratingA + 32 * (scoreA - expectedA))
  const newB = Math.round(ratingB + 32 * ((1 - scoreA) - expectedB))
  return [newA, newB]
}

async function finalizeDuel(duelId: string) {
  const { data: duel } = await supabase.from('duels').select('*').eq('id', duelId).single()
  if (!duel || duel.status === 'finished') return

  const winnerId = duel.score_a > duel.score_b ? duel.player_a
    : duel.score_b > duel.score_a ? duel.player_b
    : null // draw

  // Update duel status
  await supabase.from('duels').update({
    status: 'finished',
    winner_id: winnerId,
    finished_at: new Date().toISOString(),
  }).eq('id', duelId)

  // Get both players' stats
  const { data: statsA } = await supabase.from('duel_stats').select('*').eq('student_id', duel.player_a).single()
  const { data: statsB } = await supabase.from('duel_stats').select('*').eq('student_id', duel.player_b).single()

  const eloA = statsA?.elo || 1000
  const eloB = statsB?.elo || 1000

  let xpDeltaA = 0
  let xpDeltaB = 0

  if (winnerId) {
    // There's a winner
    const loserId = winnerId === duel.player_a ? duel.player_b : duel.player_a
    const winnerIsA = winnerId === duel.player_a

    // ELO update
    const [newEloA, newEloB] = calculateElo(eloA, eloB, winnerIsA ? 1 : 0)

    // Winner XP: +20
    xpDeltaA = winnerIsA ? 20 : 0
    xpDeltaB = winnerIsA ? 0 : 20

    // Check daily first-win bonus
    const winnerStats = winnerIsA ? statsA : statsB
    const today = new Date().toISOString().slice(0, 10)
    if (!winnerStats?.last_daily_reset || winnerStats.last_daily_reset < today || winnerStats.duels_today === 0) {
      if (winnerIsA) xpDeltaA += 5
      else xpDeltaB += 5
    }

    // Loser XP: -10 if past grace period and under daily cap
    const loserStats = winnerId === duel.player_a ? statsB : statsA
    const loserIsA = loserId === duel.player_a
    let loserXpLoss = 0

    if (loserStats && loserStats.duels_grace_remaining > 0) {
      // Still in grace period — no XP loss
      await supabase.from('duel_stats').update({
        duels_grace_remaining: loserStats.duels_grace_remaining - 1
      }).eq('student_id', loserId)
    } else if (loserStats && loserStats.xp_lost_today < 30) {
      loserXpLoss = -10
      if (loserIsA) xpDeltaA = loserXpLoss
      else xpDeltaB = loserXpLoss
    }

    // Winner stats update
    const winnerStatsUpdate: any = {
      wins: (winnerStats?.wins || 0) + 1,
      elo: winnerIsA ? newEloA : newEloB,
      current_streak: (winnerStats?.current_streak || 0) + 1,
      best_streak: Math.max((winnerStats?.best_streak || 0), (winnerStats?.current_streak || 0) + 1),
      duels_today: (winnerStats?.duels_today || 0) + 1,
      last_duel_at: new Date().toISOString(),
    }
    await supabase.from('duel_stats').update(winnerStatsUpdate).eq('student_id', winnerId)

    // Loser stats update
    const loserStatsUpdate: any = {
      losses: (loserStats?.losses || 0) + 1,
      elo: loserIsA ? newEloA : newEloB,
      current_streak: 0,
      duels_today: (loserStats?.duels_today || 0) + 1,
      xp_lost_today: (loserStats?.xp_lost_today || 0) + Math.abs(loserXpLoss),
      last_duel_at: new Date().toISOString(),
    }
    await supabase.from('duel_stats').update(loserStatsUpdate).eq('student_id', loserId)

    // XP transactions
    if (xpDeltaA > 0) {
      await supabase.from('xp_transactions').insert({
        student_id: duel.player_a,
        amount: xpDeltaA,
        reason: winnerId === duel.player_a ? 'duel_win' : 'duel_loss',
        note: `مبارزة #${duelId.slice(0, 8)}`
      })
    }
    if (xpDeltaA < 0) {
      await supabase.from('xp_transactions').insert({
        student_id: duel.player_a,
        amount: xpDeltaA,
        reason: 'duel_loss',
        note: `مبارزة #${duelId.slice(0, 8)}`
      })
    }
    if (xpDeltaB > 0) {
      await supabase.from('xp_transactions').insert({
        student_id: duel.player_b,
        amount: xpDeltaB,
        reason: winnerId === duel.player_b ? 'duel_win' : 'duel_loss',
        note: `مبارزة #${duelId.slice(0, 8)}`
      })
    }
    if (xpDeltaB < 0) {
      await supabase.from('xp_transactions').insert({
        student_id: duel.player_b,
        amount: xpDeltaB,
        reason: 'duel_loss',
        note: `مبارزة #${duelId.slice(0, 8)}`
      })
    }

    // Broadcast results
    const [finalEloA, finalEloB] = [newEloA, newEloB]
    const resultPayload = {
      duel_id: duelId,
      winner_id: winnerId,
      score_a: duel.score_a + (winnerId === duel.player_a ? 0 : 0), // scores already updated
      score_b: duel.score_b,
      xp_delta_a: xpDeltaA,
      xp_delta_b: xpDeltaB,
      elo_a: finalEloA,
      elo_b: finalEloB,
      elo_change_a: finalEloA - eloA,
      elo_change_b: finalEloB - eloB,
      grace_a: statsA?.duels_grace_remaining || 0,
      grace_b: statsB?.duels_grace_remaining || 0,
    }

    await broadcast(`duel:${duel.player_a}`, 'duel:finished', resultPayload)
    await broadcast(`duel:${duel.player_b}`, 'duel:finished', resultPayload)
  } else {
    // Draw
    const [newEloA, newEloB] = calculateElo(eloA, eloB, 0.5)
    xpDeltaA = 5
    xpDeltaB = 5

    // Update both stats
    for (const [playerId, stats, newElo] of [
      [duel.player_a, statsA, newEloA],
      [duel.player_b, statsB, newEloB],
    ] as [string, any, number][]) {
      await supabase.from('duel_stats').update({
        draws: (stats?.draws || 0) + 1,
        elo: newElo,
        duels_today: (stats?.duels_today || 0) + 1,
        last_duel_at: new Date().toISOString(),
      }).eq('student_id', playerId)

      await supabase.from('xp_transactions').insert({
        student_id: playerId,
        amount: 5,
        reason: 'duel_draw',
        note: `تعادل في مبارزة #${duelId.slice(0, 8)}`
      })
    }

    const resultPayload = {
      duel_id: duelId,
      winner_id: null,
      score_a: duel.score_a,
      score_b: duel.score_b,
      xp_delta_a: xpDeltaA,
      xp_delta_b: xpDeltaB,
      elo_a: newEloA,
      elo_b: newEloB,
      elo_change_a: newEloA - eloA,
      elo_change_b: newEloB - eloB,
      grace_a: statsA?.duels_grace_remaining || 0,
      grace_b: statsB?.duels_grace_remaining || 0,
    }

    await broadcast(`duel:${duel.player_a}`, 'duel:finished', resultPayload)
    await broadcast(`duel:${duel.player_b}`, 'duel:finished', resultPayload)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No auth header' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { duel_id, round_number, answer } = await req.json()
    if (!duel_id || !round_number || answer === undefined) {
      return json({ error: 'duel_id, round_number, and answer required' }, 400)
    }

    const userId = user.id
    const answerReceivedAt = Date.now()

    // Get duel
    const { data: duel } = await supabase.from('duels').select('*').eq('id', duel_id).single()
    if (!duel) return json({ error: 'Duel not found' }, 404)
    if (duel.player_a !== userId && duel.player_b !== userId) return json({ error: 'Not your duel' }, 403)
    if (duel.status !== 'active') return json({ error: 'Duel not active' }, 400)

    const questions = duel.questions as any[]
    const questionIndex = round_number - 1
    const question = questions[questionIndex]
    if (!question) return json({ error: 'Invalid round' }, 400)

    // Anti-cheat: check if question was sent to this player
    const sentAt = question.sent_at?.[userId]
    if (!sentAt) return json({ error: 'Question not delivered yet' }, 400)

    // Anti-cheat: reject answers faster than 300ms (impossible human speed)
    const responseMs = answerReceivedAt - sentAt
    if (responseMs < 300) return json({ error: 'Answer too fast — rejected' }, 400)

    // Check for duplicate answer
    const { data: existingRound } = await supabase
      .from('duel_rounds')
      .select('id')
      .eq('duel_id', duel_id)
      .eq('round_number', round_number)
      .eq('player_id', userId)
      .maybeSingle()

    if (existingRound) return json({ error: 'Already answered this round' }, 409)

    // Check answer correctness
    const answerIndex = typeof answer === 'number' ? answer : parseInt(answer)
    const isCorrect = answerIndex === question.correct_index

    // Calculate points: correct = 10 + speed_bonus (max 10 - floor(responseMs/1000))
    let points = 0
    if (isCorrect) {
      const speedBonus = Math.max(0, 10 - Math.floor(responseMs / 1000))
      points = 10 + speedBonus
    }

    // Insert round answer
    await supabase.from('duel_rounds').insert({
      duel_id,
      round_number,
      player_id: userId,
      answer: String(answerIndex),
      is_correct: isCorrect,
      response_ms: Math.round(responseMs),
      points_earned: points,
    })

    // Update duel score
    const isPlayerA = userId === duel.player_a
    const scoreField = isPlayerA ? 'score_a' : 'score_b'
    const newScore = (isPlayerA ? duel.score_a : duel.score_b) + points

    await supabase.from('duels').update({
      [scoreField]: newScore,
    }).eq('id', duel_id)

    // Broadcast round update to opponent
    const opponentId = isPlayerA ? duel.player_b : duel.player_a
    await broadcast(`duel:${opponentId}`, 'duel:opponent_answered', {
      duel_id,
      round_number,
      // Don't reveal if correct or what they answered — just that they answered
    })

    // Check if both players answered this round — if so, reveal round results
    const { data: roundAnswers } = await supabase
      .from('duel_rounds')
      .select('player_id, is_correct, response_ms, points_earned')
      .eq('duel_id', duel_id)
      .eq('round_number', round_number)

    const bothAnswered = roundAnswers && roundAnswers.length >= 2

    if (bothAnswered) {
      const roundResult = {
        duel_id,
        round_number,
        correct_index: question.correct_index,
        correct_answer: question.choices[question.correct_index],
        answers: roundAnswers.map((a: any) => ({
          player_id: a.player_id,
          is_correct: a.is_correct,
          response_ms: a.response_ms,
          points: a.points_earned,
        })),
        score_a: isPlayerA ? newScore : duel.score_a,
        score_b: isPlayerA ? duel.score_b : newScore,
      }

      // Update scores from both answers
      const otherAnswer = roundAnswers.find((a: any) => a.player_id !== userId)
      const updatedScoreA = duel.score_a + (roundAnswers.find((a: any) => a.player_id === duel.player_a)?.points_earned || 0)
      const updatedScoreB = duel.score_b + (roundAnswers.find((a: any) => a.player_id === duel.player_b)?.points_earned || 0)
      roundResult.score_a = updatedScoreA
      roundResult.score_b = updatedScoreB

      await broadcast(`duel:${duel.player_a}`, 'duel:round_result', roundResult)
      await broadcast(`duel:${duel.player_b}`, 'duel:round_result', roundResult)

      // Check if duel is complete
      const { count: totalAnswers } = await supabase
        .from('duel_rounds')
        .select('id', { count: 'exact', head: true })
        .eq('duel_id', duel_id)

      const expectedAnswers = duel.round_count * 2 // both players for all rounds
      if (totalAnswers && totalAnswers >= expectedAnswers) {
        // Refetch duel with updated scores
        const { data: finalDuel } = await supabase.from('duels').select('score_a, score_b').eq('id', duel_id).single()
        if (finalDuel) {
          // Update duel object for finalization
          duel.score_a = finalDuel.score_a
          duel.score_b = finalDuel.score_b
        }
        await finalizeDuel(duel_id)
      }
    }

    return json({
      is_correct: isCorrect,
      points_earned: points,
      response_ms: Math.round(responseMs),
      correct_index: bothAnswered ? question.correct_index : undefined,
      both_answered: bothAnswered,
    })
  } catch (err) {
    console.error('duel-answer-submit error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
