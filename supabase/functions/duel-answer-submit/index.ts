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

function calculateElo(ratingA: number, ratingB: number, scoreA: number): [number, number] {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
  const expectedB = 1 - expectedA
  const newA = Math.round(ratingA + 32 * (scoreA - expectedA))
  const newB = Math.round(ratingB + 32 * ((1 - scoreA) - expectedB))
  return [newA, newB]
}

// ─── Answer Checking ────────────────────────────────────
function normalize(s: string): string {
  return s.trim().toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // normalize smart quotes
    .replace(/'/g, "'") // normalize apostrophes
    .replace(/\s+/g, ' ')
}

function checkAnswer(question: any, answer: any): boolean {
  const type = question.type

  if (type === 'meaning_mcq' || type === 'grammar_mcq') {
    // MCQ: answer is an index
    const answerIndex = typeof answer === 'number' ? answer : parseInt(answer)
    return answerIndex === question.correct_index
  }

  if (type === 'irregular_form') {
    // Text input: case-insensitive, trim, normalize
    const given = normalize(String(answer))
    const accepted = (question.accepted_answers || [question.correct_answer])
      .map((a: string) => normalize(a))
    return accepted.includes(given)
  }

  if (type === 'sentence_order') {
    // Array of words in order
    const given = Array.isArray(answer) ? answer : []
    const correct = question.correct_order || []
    if (given.length !== correct.length) return false
    // Exact word order, case-insensitive
    return given.every((w: string, i: number) => normalize(w) === normalize(correct[i]))
  }

  return false
}

function getCorrectAnswerForReveal(question: any): any {
  if (question.type === 'meaning_mcq' || question.type === 'grammar_mcq') {
    return { correct_index: question.correct_index, correct_answer: question.choices[question.correct_index] }
  }
  if (question.type === 'irregular_form') {
    return { correct_answer: question.correct_answer }
  }
  if (question.type === 'sentence_order') {
    return { correct_order: question.correct_order }
  }
  return {}
}

// ─── Scoring per game type ──────────────────────────────
function calculatePoints(question: any, isCorrect: boolean, responseMs: number): number {
  if (!isCorrect) return 0

  if (question.type === 'sentence_order') {
    // Sentence Builder: correct = 10 + speed_bonus (max 15 - floor(ms/1000)), capped at 20
    const speedBonus = Math.max(0, 15 - Math.floor(responseMs / 1000))
    return Math.min(20, 10 + speedBonus)
  }

  // Default (MCQ, irregular verbs): 10 + speed_bonus (max 10 - floor(ms/1000))
  const speedBonus = Math.max(0, 10 - Math.floor(responseMs / 1000))
  return 10 + speedBonus
}

// ─── Finalize Duel ──────────────────────────────────────
async function finalizeDuel(duelId: string) {
  const { data: duel } = await supabase.from('duels').select('*').eq('id', duelId).single()
  if (!duel || duel.status === 'finished') return

  const winnerId = duel.score_a > duel.score_b ? duel.player_a
    : duel.score_b > duel.score_a ? duel.player_b : null

  await supabase.from('duels').update({
    status: 'finished', winner_id: winnerId, finished_at: new Date().toISOString(),
  }).eq('id', duelId)

  const { data: statsA } = await supabase.from('duel_stats').select('*').eq('student_id', duel.player_a).single()
  const { data: statsB } = await supabase.from('duel_stats').select('*').eq('student_id', duel.player_b).single()

  const eloA = statsA?.elo || 1000
  const eloB = statsB?.elo || 1000
  let xpDeltaA = 0, xpDeltaB = 0

  if (winnerId) {
    const loserId = winnerId === duel.player_a ? duel.player_b : duel.player_a
    const winnerIsA = winnerId === duel.player_a
    const [newEloA, newEloB] = calculateElo(eloA, eloB, winnerIsA ? 1 : 0)

    xpDeltaA = winnerIsA ? 20 : 0
    xpDeltaB = winnerIsA ? 0 : 20

    const winnerStats = winnerIsA ? statsA : statsB
    const today = new Date().toISOString().slice(0, 10)
    if (!winnerStats?.last_daily_reset || winnerStats.last_daily_reset < today || winnerStats.duels_today === 0) {
      if (winnerIsA) xpDeltaA += 5; else xpDeltaB += 5
    }

    const loserStats = winnerId === duel.player_a ? statsB : statsA
    const loserIsA = loserId === duel.player_a

    if (loserStats && loserStats.duels_grace_remaining > 0) {
      await supabase.from('duel_stats').update({
        duels_grace_remaining: loserStats.duels_grace_remaining - 1
      }).eq('student_id', loserId)
    } else if (loserStats && loserStats.xp_lost_today < 30) {
      if (loserIsA) xpDeltaA = -10; else xpDeltaB = -10
    }

    await supabase.from('duel_stats').update({
      wins: (winnerStats?.wins || 0) + 1, elo: winnerIsA ? newEloA : newEloB,
      current_streak: (winnerStats?.current_streak || 0) + 1,
      best_streak: Math.max((winnerStats?.best_streak || 0), (winnerStats?.current_streak || 0) + 1),
      duels_today: (winnerStats?.duels_today || 0) + 1, last_duel_at: new Date().toISOString(),
    }).eq('student_id', winnerId)

    await supabase.from('duel_stats').update({
      losses: (loserStats?.losses || 0) + 1, elo: loserIsA ? newEloA : newEloB,
      current_streak: 0, duels_today: (loserStats?.duels_today || 0) + 1,
      xp_lost_today: (loserStats?.xp_lost_today || 0) + Math.abs(loserIsA ? xpDeltaA : xpDeltaB),
      last_duel_at: new Date().toISOString(),
    }).eq('student_id', loserId)

    for (const [pid, xp, reason] of [
      [duel.player_a, xpDeltaA, xpDeltaA > 0 ? 'duel_win' : 'duel_loss'],
      [duel.player_b, xpDeltaB, xpDeltaB > 0 ? 'duel_win' : 'duel_loss'],
    ] as [string, number, string][]) {
      if (xp !== 0) {
        await supabase.from('xp_transactions').insert({
          student_id: pid, amount: xp, reason, note: `مبارزة #${duelId.slice(0, 8)}`
        })
      }
    }

    const resultPayload = {
      duel_id: duelId, winner_id: winnerId,
      score_a: duel.score_a, score_b: duel.score_b,
      xp_delta_a: xpDeltaA, xp_delta_b: xpDeltaB,
      elo_a: newEloA, elo_b: newEloB,
      elo_change_a: newEloA - eloA, elo_change_b: newEloB - eloB,
      grace_a: statsA?.duels_grace_remaining || 0, grace_b: statsB?.duels_grace_remaining || 0,
    }
    await broadcast(`duel:${duel.player_a}`, 'duel:finished', resultPayload)
    await broadcast(`duel:${duel.player_b}`, 'duel:finished', resultPayload)
  } else {
    // Draw
    const [newEloA, newEloB] = calculateElo(eloA, eloB, 0.5)
    xpDeltaA = 5; xpDeltaB = 5

    for (const [playerId, stats, newElo] of [
      [duel.player_a, statsA, newEloA], [duel.player_b, statsB, newEloB],
    ] as [string, any, number][]) {
      await supabase.from('duel_stats').update({
        draws: (stats?.draws || 0) + 1, elo: newElo,
        duels_today: (stats?.duels_today || 0) + 1, last_duel_at: new Date().toISOString(),
      }).eq('student_id', playerId)
      await supabase.from('xp_transactions').insert({
        student_id: playerId, amount: 5, reason: 'duel_draw',
        note: `تعادل في مبارزة #${duelId.slice(0, 8)}`
      })
    }

    const resultPayload = {
      duel_id: duelId, winner_id: null,
      score_a: duel.score_a, score_b: duel.score_b,
      xp_delta_a: 5, xp_delta_b: 5,
      elo_a: newEloA, elo_b: newEloB,
      elo_change_a: newEloA - eloA, elo_change_b: newEloB - eloB,
      grace_a: statsA?.duels_grace_remaining || 0, grace_b: statsB?.duels_grace_remaining || 0,
    }
    await broadcast(`duel:${duel.player_a}`, 'duel:finished', resultPayload)
    await broadcast(`duel:${duel.player_b}`, 'duel:finished', resultPayload)
  }
}

// ─── Main Handler ───────────────────────────────────────
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

    const { data: duel } = await supabase.from('duels').select('*').eq('id', duel_id).single()
    if (!duel) return json({ error: 'Duel not found' }, 404)
    if (duel.player_a !== userId && duel.player_b !== userId) return json({ error: 'Not your duel' }, 403)
    if (duel.status !== 'active') return json({ error: 'Duel not active' }, 400)

    const questions = duel.questions as any[]
    const questionIndex = round_number - 1
    const question = questions[questionIndex]
    if (!question) return json({ error: 'Invalid round' }, 400)

    const sentAt = question.sent_at?.[userId]
    if (!sentAt) return json({ error: 'Question not delivered yet' }, 400)

    const responseMs = answerReceivedAt - sentAt
    if (responseMs < 300) return json({ error: 'Answer too fast — rejected' }, 400)

    const { data: existingRound } = await supabase
      .from('duel_rounds').select('id')
      .eq('duel_id', duel_id).eq('round_number', round_number).eq('player_id', userId).maybeSingle()
    if (existingRound) return json({ error: 'Already answered this round' }, 409)

    // Check answer based on question type
    const isCorrect = checkAnswer(question, answer)
    const points = calculatePoints(question, isCorrect, responseMs)

    await supabase.from('duel_rounds').insert({
      duel_id, round_number, player_id: userId,
      answer: JSON.stringify(answer),
      is_correct: isCorrect,
      response_ms: Math.round(responseMs),
      points_earned: points,
    })

    const isPlayerA = userId === duel.player_a
    const newScore = (isPlayerA ? duel.score_a : duel.score_b) + points
    await supabase.from('duels').update({
      [isPlayerA ? 'score_a' : 'score_b']: newScore,
    }).eq('id', duel_id)

    const opponentId = isPlayerA ? duel.player_b : duel.player_a
    await broadcast(`duel:${opponentId}`, 'duel:opponent_answered', { duel_id, round_number })

    const { data: roundAnswers } = await supabase
      .from('duel_rounds').select('player_id, is_correct, response_ms, points_earned')
      .eq('duel_id', duel_id).eq('round_number', round_number)

    const bothAnswered = roundAnswers && roundAnswers.length >= 2

    if (bothAnswered) {
      const correctReveal = getCorrectAnswerForReveal(question)
      const updatedScoreA = duel.score_a + (roundAnswers.find((a: any) => a.player_id === duel.player_a)?.points_earned || 0)
      const updatedScoreB = duel.score_b + (roundAnswers.find((a: any) => a.player_id === duel.player_b)?.points_earned || 0)

      const roundResult = {
        duel_id, round_number, ...correctReveal,
        answers: roundAnswers.map((a: any) => ({
          player_id: a.player_id, is_correct: a.is_correct,
          response_ms: a.response_ms, points: a.points_earned,
        })),
        score_a: updatedScoreA, score_b: updatedScoreB,
      }

      await broadcast(`duel:${duel.player_a}`, 'duel:round_result', roundResult)
      await broadcast(`duel:${duel.player_b}`, 'duel:round_result', roundResult)

      const { count: totalAnswers } = await supabase
        .from('duel_rounds').select('id', { count: 'exact', head: true }).eq('duel_id', duel_id)

      if (totalAnswers && totalAnswers >= duel.round_count * 2) {
        const { data: finalDuel } = await supabase.from('duels').select('score_a, score_b').eq('id', duel_id).single()
        if (finalDuel) { duel.score_a = finalDuel.score_a; duel.score_b = finalDuel.score_b }
        await finalizeDuel(duel_id)
      }
    }

    return json({
      is_correct: isCorrect, points_earned: points,
      response_ms: Math.round(responseMs),
      ...(bothAnswered ? getCorrectAnswerForReveal(question) : {}),
      both_answered: bothAnswered,
    })
  } catch (err) {
    console.error('duel-answer-submit error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
