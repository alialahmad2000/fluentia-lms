// Deploy: supabase functions deploy duel-enqueue --no-verify-jwt --project-ref nmjexpuycmqcxuxljier

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

async function generateVocabSprintQuestions(playerA: string, playerB: string): Promise<any[]> {
  // Get both players' mastered/learning vocabulary
  const { data: masteryA } = await supabase
    .from('vocabulary_word_mastery')
    .select('vocabulary_id')
    .eq('student_id', playerA)
    .in('mastery_level', ['learning', 'mastered'])

  const { data: masteryB } = await supabase
    .from('vocabulary_word_mastery')
    .select('vocabulary_id')
    .eq('student_id', playerB)
    .in('mastery_level', ['learning', 'mastered'])

  const setA = new Set((masteryA || []).map((m: any) => m.vocabulary_id))
  const setB = new Set((masteryB || []).map((m: any) => m.vocabulary_id))

  // Find intersection
  let commonIds = [...setA].filter(id => setB.has(id))

  // If not enough, use the smaller set
  if (commonIds.length < 10) {
    const smaller = setA.size < setB.size ? setA : setB
    commonIds = [...smaller]
  }

  // If still not enough, pull random vocab from the DB
  if (commonIds.length < 10) {
    const { data: randomVocab } = await supabase
      .from('curriculum_vocabulary')
      .select('id')
      .limit(30)
    if (randomVocab) {
      const extra = randomVocab.map((v: any) => v.id).filter((id: string) => !new Set(commonIds).has(id))
      commonIds = [...commonIds, ...extra]
    }
  }

  // Shuffle and take 10
  commonIds = commonIds.sort(() => Math.random() - 0.5).slice(0, 10)

  // Fetch full vocab data
  const { data: words } = await supabase
    .from('curriculum_vocabulary')
    .select('id, word, meaning_ar, meaning_en, part_of_speech')
    .in('id', commonIds)

  if (!words || words.length === 0) {
    // Fallback: just grab 10 random words
    const { data: fallback } = await supabase
      .from('curriculum_vocabulary')
      .select('id, word, meaning_ar, meaning_en, part_of_speech')
      .limit(50)
    if (fallback) {
      const shuffled = fallback.sort(() => Math.random() - 0.5).slice(0, 10)
      return buildQuestions(shuffled, fallback)
    }
    return []
  }

  // Get distractor pool (all vocab meanings at similar level)
  const { data: allVocab } = await supabase
    .from('curriculum_vocabulary')
    .select('id, meaning_ar')
    .limit(200)

  return buildQuestions(words, allVocab || words)
}

function buildQuestions(words: any[], distractorPool: any[]): any[] {
  const questions: any[] = []
  const allMeanings = distractorPool.map((v: any) => v.meaning_ar).filter(Boolean)

  for (const word of words) {
    const correct = word.meaning_ar
    if (!correct) continue

    // Pick 3 random distractors (different from correct)
    const distractors: string[] = []
    const shuffledMeanings = allMeanings.filter((m: string) => m !== correct).sort(() => Math.random() - 0.5)
    for (const m of shuffledMeanings) {
      if (distractors.length >= 3) break
      if (!distractors.includes(m)) distractors.push(m)
    }

    // Pad with generic distractors if needed
    while (distractors.length < 3) {
      distractors.push(['كلمة', 'معنى', 'جملة'][distractors.length])
    }

    // Build choices array with correct answer at random position
    const choices = [...distractors]
    const correctIndex = Math.floor(Math.random() * 4)
    choices.splice(correctIndex, 0, correct)

    questions.push({
      type: 'meaning_mcq',
      word: word.word,
      word_id: word.id,
      choices,
      correct_index: correctIndex,
      sent_at: null, // will be set when question is delivered
    })
  }

  return questions
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No auth header' }, 401)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { game_type } = await req.json()
    if (!game_type) return json({ error: 'game_type required' }, 400)

    // Only vocab_sprint is live
    if (game_type !== 'vocab_sprint') {
      return json({ error: 'هذا النوع من التحديات غير متاح حالياً' }, 400)
    }

    const userId = user.id

    // Rate limit: check if already in queue
    const { data: existing } = await supabase
      .from('duel_queue')
      .select('id')
      .eq('student_id', userId)
      .maybeSingle()

    if (existing) {
      return json({ error: 'Already in queue', status: 'queued' }, 409)
    }

    // Get student data for matchmaking
    const { data: student } = await supabase
      .from('students')
      .select('id, group_id, team_id, academic_level')
      .eq('id', userId)
      .single()

    if (!student) return json({ error: 'Student not found' }, 404)

    // Ensure duel_stats row exists
    await supabase.from('duel_stats').upsert(
      { student_id: userId },
      { onConflict: 'student_id', ignoreDuplicates: true }
    )

    // Reset daily counters if needed
    const { data: stats } = await supabase
      .from('duel_stats')
      .select('last_daily_reset, duels_today')
      .eq('student_id', userId)
      .single()

    const today = new Date().toISOString().slice(0, 10)
    if (!stats?.last_daily_reset || stats.last_daily_reset < today) {
      await supabase.from('duel_stats').update({
        duels_today: 0, xp_lost_today: 0, last_daily_reset: today
      }).eq('student_id', userId)
    }

    // Try tiered matching: 1) same team, 2) same group, 3) same level
    let opponent = null
    let matchTier = 'none'

    // Tier 1: same team
    if (student.team_id) {
      const { data } = await supabase
        .from('duel_queue')
        .select('*')
        .eq('game_type', game_type)
        .eq('team_id', student.team_id)
        .neq('student_id', userId)
        .order('queued_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (data) { opponent = data; matchTier = 'team' }
    }

    // Tier 2: same group
    if (!opponent && student.group_id) {
      const { data } = await supabase
        .from('duel_queue')
        .select('*')
        .eq('game_type', game_type)
        .eq('group_id', student.group_id)
        .neq('student_id', userId)
        .order('queued_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (data) { opponent = data; matchTier = 'group' }
    }

    // Tier 3: same level
    if (!opponent) {
      const { data } = await supabase
        .from('duel_queue')
        .select('*')
        .eq('game_type', game_type)
        .eq('level', student.academic_level)
        .neq('student_id', userId)
        .order('queued_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (data) { opponent = data; matchTier = 'level' }
    }

    // Tier 4: anyone
    if (!opponent) {
      const { data } = await supabase
        .from('duel_queue')
        .select('*')
        .eq('game_type', game_type)
        .neq('student_id', userId)
        .order('queued_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (data) { opponent = data; matchTier = 'any' }
    }

    if (opponent) {
      // Check same-opponent daily limit (max 5)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('duels')
        .select('id', { count: 'exact', head: true })
        .or(`and(player_a.eq.${userId},player_b.eq.${opponent.student_id}),and(player_a.eq.${opponent.student_id},player_b.eq.${userId})`)
        .gte('created_at', todayStart.toISOString())

      if (count && count >= 5) {
        // Skip this opponent, fall through to queue
        opponent = null
      }
    }

    if (opponent) {
      // MATCH FOUND — generate questions and create duel
      const questions = await generateVocabSprintQuestions(userId, opponent.student_id)

      if (questions.length < 5) {
        return json({ error: 'Not enough vocabulary to generate questions. Keep studying!' }, 400)
      }

      // Get both players' profiles for display
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', [userId, opponent.student_id])

      const { data: playerStats } = await supabase
        .from('duel_stats')
        .select('student_id, elo, current_streak')
        .in('student_id', [userId, opponent.student_id])

      // Create duel
      const { data: duel, error: duelErr } = await supabase
        .from('duels')
        .insert({
          game_type,
          player_a: userId,
          player_b: opponent.student_id,
          questions,
          round_count: Math.min(questions.length, 10),
          current_round: 0,
        })
        .select('id')
        .single()

      if (duelErr) return json({ error: 'Failed to create duel' }, 500)

      // Remove opponent from queue
      await supabase.from('duel_queue').delete().eq('id', opponent.id)

      // Build match payload (no correct answers)
      const safeQuestions = questions.map((q: any, i: number) => ({
        round: i + 1,
        type: q.type,
        word: q.word,
        choices: q.choices,
      }))

      const profileMap: any = {}
      for (const p of (profiles || [])) profileMap[p.id] = p
      const statsMap: any = {}
      for (const s of (playerStats || [])) statsMap[s.student_id] = s

      const matchPayload = {
        duel_id: duel.id,
        game_type,
        round_count: Math.min(questions.length, 10),
        match_tier: matchTier,
        player_a: {
          id: userId,
          name: profileMap[userId]?.full_name || 'لاعب',
          avatar_url: profileMap[userId]?.avatar_url,
          elo: statsMap[userId]?.elo || 1000,
          streak: statsMap[userId]?.current_streak || 0,
        },
        player_b: {
          id: opponent.student_id,
          name: profileMap[opponent.student_id]?.full_name || 'لاعب',
          avatar_url: profileMap[opponent.student_id]?.avatar_url,
          elo: statsMap[opponent.student_id]?.elo || 1000,
          streak: statsMap[opponent.student_id]?.current_streak || 0,
        },
        questions: safeQuestions,
      }

      // Broadcast to both players
      await broadcast(`duel:${userId}`, 'duel:start', matchPayload)
      await broadcast(`duel:${opponent.student_id}`, 'duel:start', matchPayload)

      return json({ status: 'matched', duel_id: duel.id, match: matchPayload })
    }

    // No match — add to queue
    const { error: queueErr } = await supabase.from('duel_queue').insert({
      student_id: userId,
      group_id: student.group_id,
      team_id: student.team_id,
      level: student.academic_level,
      game_type,
    })

    if (queueErr) return json({ error: 'Failed to join queue' }, 500)

    return json({ status: 'queued', message: 'Searching for opponent...' })
  } catch (err) {
    console.error('duel-enqueue error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
