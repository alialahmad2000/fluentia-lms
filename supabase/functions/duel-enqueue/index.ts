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

// ─── ACTIVE GAME TYPES ──────────────────────────────────
const ACTIVE_GAMES = ['vocab_sprint', 'irregular_verbs', 'grammar_clash', 'sentence_builder']

// ─── Vocab Sprint Questions ─────────────────────────────
async function generateVocabSprintQuestions(playerA: string, playerB: string): Promise<any[]> {
  const { data: masteryA } = await supabase
    .from('vocabulary_word_mastery').select('vocabulary_id')
    .eq('student_id', playerA).in('mastery_level', ['learning', 'mastered'])

  const { data: masteryB } = await supabase
    .from('vocabulary_word_mastery').select('vocabulary_id')
    .eq('student_id', playerB).in('mastery_level', ['learning', 'mastered'])

  const setA = new Set((masteryA || []).map((m: any) => m.vocabulary_id))
  const setB = new Set((masteryB || []).map((m: any) => m.vocabulary_id))
  let commonIds = [...setA].filter(id => setB.has(id))

  if (commonIds.length < 10) {
    const smaller = setA.size < setB.size ? setA : setB
    commonIds = [...smaller]
  }
  if (commonIds.length < 10) {
    const { data: randomVocab } = await supabase.from('curriculum_vocabulary').select('id').limit(30)
    if (randomVocab) {
      const extra = randomVocab.map((v: any) => v.id).filter((id: string) => !new Set(commonIds).has(id))
      commonIds = [...commonIds, ...extra]
    }
  }

  commonIds = commonIds.sort(() => Math.random() - 0.5).slice(0, 10)

  const { data: words } = await supabase
    .from('curriculum_vocabulary').select('id, word, meaning_ar, meaning_en, part_of_speech')
    .in('id', commonIds)

  if (!words || words.length === 0) {
    const { data: fallback } = await supabase
      .from('curriculum_vocabulary').select('id, word, meaning_ar, meaning_en, part_of_speech').limit(50)
    if (fallback) return buildMCQQuestions(fallback.sort(() => Math.random() - 0.5).slice(0, 10), fallback)
    return []
  }

  const { data: allVocab } = await supabase.from('curriculum_vocabulary').select('id, meaning_ar').limit(200)
  return buildMCQQuestions(words, allVocab || words)
}

function buildMCQQuestions(words: any[], distractorPool: any[]): any[] {
  const questions: any[] = []
  const allMeanings = distractorPool.map((v: any) => v.meaning_ar).filter(Boolean)

  for (const word of words) {
    const correct = word.meaning_ar
    if (!correct) continue
    const distractors: string[] = []
    const shuffledMeanings = allMeanings.filter((m: string) => m !== correct).sort(() => Math.random() - 0.5)
    for (const m of shuffledMeanings) {
      if (distractors.length >= 3) break
      if (!distractors.includes(m)) distractors.push(m)
    }
    while (distractors.length < 3) distractors.push(['كلمة', 'معنى', 'جملة'][distractors.length])

    const choices = [...distractors]
    const correctIndex = Math.floor(Math.random() * 4)
    choices.splice(correctIndex, 0, correct)

    questions.push({
      type: 'meaning_mcq',
      word: word.word,
      word_id: word.id,
      choices,
      correct_index: correctIndex,
      sent_at: null,
    })
  }
  return questions
}

// ─── Irregular Verbs Questions ──────────────────────────
async function generateIrregularVerbsQuestions(_playerA: string, _playerB: string): Promise<any[]> {
  const { data: verbs } = await supabase
    .from('irregular_verbs')
    .select('base_form, past_simple, past_participle, meaning_ar')
    .limit(100)

  if (!verbs || verbs.length < 10) return []

  const shuffled = verbs.sort(() => Math.random() - 0.5).slice(0, 10)
  const questions: any[] = []

  for (const verb of shuffled) {
    const askType = Math.random() > 0.5 ? 'past' : 'past_participle'
    const correctAnswer = askType === 'past' ? verb.past_simple : verb.past_participle

    // Handle multi-form answers like "got/gotten"
    const acceptedAnswers = correctAnswer.split('/').map((a: string) => a.trim().toLowerCase())

    questions.push({
      type: 'irregular_form',
      word: verb.base_form,
      ask: askType,
      meaning_ar: verb.meaning_ar,
      correct_answer: correctAnswer,
      accepted_answers: acceptedAnswers,
      sent_at: null,
    })
  }
  return questions
}

// ─── Grammar Clash Questions ────────────────────────────
async function generateGrammarClashQuestions(_playerA: string, _playerB: string): Promise<any[]> {
  // Get MCQ-type grammar exercises
  const { data: exercises } = await supabase
    .from('curriculum_grammar_exercises')
    .select('items, exercise_type')
    .in('exercise_type', ['choose', 'fill_blank'])
    .limit(200)

  if (!exercises || exercises.length < 10) return []

  const pool: any[] = []
  for (const ex of exercises) {
    const items = ex.items as any[]
    if (!items) continue
    for (const item of items) {
      if (item.correct_answer && (item.options?.length >= 2 || item.question)) {
        pool.push({ ...item, exercise_type: ex.exercise_type })
      }
    }
  }

  if (pool.length < 10) return []
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, 10)
  const questions: any[] = []

  for (const item of shuffled) {
    let choices: string[] = []
    let correctIndex = 0

    if (item.options && item.options.length >= 3) {
      // Already has options — use them + correct answer
      choices = [...item.options]
      if (!choices.includes(item.correct_answer)) {
        choices.push(item.correct_answer)
      }
      // Shuffle and find correct index
      choices = choices.sort(() => Math.random() - 0.5)
      correctIndex = choices.indexOf(item.correct_answer)
      // Ensure 4 choices
      while (choices.length < 4) choices.push('—')
      choices = choices.slice(0, 4)
      correctIndex = choices.indexOf(item.correct_answer)
    } else {
      // Fill-blank: generate distractors
      const correct = item.correct_answer
      const distractors = generateGrammarDistractors(correct)
      choices = [...distractors]
      correctIndex = Math.floor(Math.random() * 4)
      choices.splice(correctIndex, 0, correct)
    }

    questions.push({
      type: 'grammar_mcq',
      word: item.question,
      choices,
      correct_index: correctIndex,
      explanation_ar: item.explanation_ar || '',
      sent_at: null,
    })
  }
  return questions
}

function generateGrammarDistractors(correct: string): string[] {
  // Generate plausible grammar distractors
  const bases = [correct]
  // Common verb form variations
  if (correct.endsWith('ed')) bases.push(correct.slice(0, -2), correct.slice(0, -2) + 'ing', correct.slice(0, -1) + 's')
  else if (correct.endsWith('ing')) bases.push(correct.slice(0, -3), correct.slice(0, -3) + 'ed', correct.slice(0, -3) + 's')
  else if (correct.endsWith('s')) bases.push(correct.slice(0, -1), correct + 'ed', correct + 'ing')
  else bases.push(correct + 'ed', correct + 'ing', correct + 's')

  const distractors = bases.filter(b => b !== correct && b.length > 0).slice(0, 3)
  while (distractors.length < 3) distractors.push(['is', 'are', 'was', 'were', 'has', 'have'][distractors.length] || 'does')
  return distractors
}

// ─── Sentence Builder Questions ─────────────────────────
async function generateSentenceBuilderQuestions(_playerA: string, _playerB: string): Promise<any[]> {
  // Source 1: Grammar exercise sentences
  const { data: exercises } = await supabase
    .from('curriculum_grammar_exercises')
    .select('items')
    .eq('exercise_type', 'fill_blank')
    .limit(100)

  const sentences: string[] = []
  if (exercises) {
    for (const ex of exercises) {
      const items = ex.items as any[]
      if (!items) continue
      for (const item of items) {
        // Use the question as the sentence, filling in the blank with the answer
        if (item.question && item.correct_answer) {
          const sentence = item.question.replace(/_{2,}|_+\s*\([^)]*\)/, item.correct_answer).trim()
          // Only use sentences with 4-10 words
          const wordCount = sentence.split(/\s+/).length
          if (wordCount >= 4 && wordCount <= 10 && !sentence.includes('___')) {
            sentences.push(sentence)
          }
        }
      }
    }
  }

  // Source 2: Irregular verb example sentences
  const { data: verbs } = await supabase
    .from('irregular_verbs').select('example_sentence').not('example_sentence', 'is', null).limit(50)
  if (verbs) {
    for (const v of verbs) {
      if (v.example_sentence) {
        const wordCount = v.example_sentence.split(/\s+/).length
        if (wordCount >= 4 && wordCount <= 10) sentences.push(v.example_sentence)
      }
    }
  }

  if (sentences.length < 10) return []

  const shuffled = sentences.sort(() => Math.random() - 0.5).slice(0, 10)
  const questions: any[] = []

  for (const sentence of shuffled) {
    const words = sentence.replace(/[.!?]$/, '').split(/\s+/)
    const correctOrder = [...words]
    const shuffledWords = [...words].sort(() => Math.random() - 0.5)

    // Ensure shuffled is actually different from correct
    if (shuffledWords.join(' ') === correctOrder.join(' ')) {
      const temp = shuffledWords[0]
      shuffledWords[0] = shuffledWords[shuffledWords.length - 1]
      shuffledWords[shuffledWords.length - 1] = temp
    }

    questions.push({
      type: 'sentence_order',
      word: sentence, // original sentence (for display after)
      chips: shuffledWords,
      correct_order: correctOrder,
      sent_at: null,
    })
  }
  return questions
}

// ─── Question Generator Dispatch ────────────────────────
async function generateQuestions(gameType: string, playerA: string, playerB: string): Promise<any[]> {
  switch (gameType) {
    case 'vocab_sprint': return generateVocabSprintQuestions(playerA, playerB)
    case 'irregular_verbs': return generateIrregularVerbsQuestions(playerA, playerB)
    case 'grammar_clash': return generateGrammarClashQuestions(playerA, playerB)
    case 'sentence_builder': return generateSentenceBuilderQuestions(playerA, playerB)
    default: return []
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

    const { game_type } = await req.json()
    if (!game_type) return json({ error: 'game_type required' }, 400)

    if (!ACTIVE_GAMES.includes(game_type)) {
      return json({ error: 'هذا النوع من التحديات غير متاح حالياً' }, 400)
    }

    const userId = user.id

    const { data: existing } = await supabase
      .from('duel_queue').select('id').eq('student_id', userId).maybeSingle()
    if (existing) return json({ error: 'Already in queue', status: 'queued' }, 409)

    const { data: student } = await supabase
      .from('students').select('id, group_id, team_id, academic_level')
      .eq('id', userId).single()
    if (!student) return json({ error: 'Student not found' }, 404)

    await supabase.from('duel_stats').upsert(
      { student_id: userId },
      { onConflict: 'student_id', ignoreDuplicates: true }
    )

    const { data: stats } = await supabase
      .from('duel_stats').select('last_daily_reset, duels_today')
      .eq('student_id', userId).single()

    const today = new Date().toISOString().slice(0, 10)
    if (!stats?.last_daily_reset || stats.last_daily_reset < today) {
      await supabase.from('duel_stats').update({
        duels_today: 0, xp_lost_today: 0, last_daily_reset: today
      }).eq('student_id', userId)
    }

    // Tiered matchmaking
    let opponent = null
    let matchTier = 'none'

    if (student.team_id) {
      const { data } = await supabase.from('duel_queue').select('*')
        .eq('game_type', game_type).eq('team_id', student.team_id)
        .neq('student_id', userId).order('queued_at', { ascending: true }).limit(1).maybeSingle()
      if (data) { opponent = data; matchTier = 'team' }
    }
    if (!opponent && student.group_id) {
      const { data } = await supabase.from('duel_queue').select('*')
        .eq('game_type', game_type).eq('group_id', student.group_id)
        .neq('student_id', userId).order('queued_at', { ascending: true }).limit(1).maybeSingle()
      if (data) { opponent = data; matchTier = 'group' }
    }
    if (!opponent) {
      const { data } = await supabase.from('duel_queue').select('*')
        .eq('game_type', game_type).eq('level', student.academic_level)
        .neq('student_id', userId).order('queued_at', { ascending: true }).limit(1).maybeSingle()
      if (data) { opponent = data; matchTier = 'level' }
    }
    if (!opponent) {
      const { data } = await supabase.from('duel_queue').select('*')
        .eq('game_type', game_type)
        .neq('student_id', userId).order('queued_at', { ascending: true }).limit(1).maybeSingle()
      if (data) { opponent = data; matchTier = 'any' }
    }

    if (opponent) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase.from('duels').select('id', { count: 'exact', head: true })
        .or(`and(player_a.eq.${userId},player_b.eq.${opponent.student_id}),and(player_a.eq.${opponent.student_id},player_b.eq.${userId})`)
        .gte('created_at', todayStart.toISOString())
      if (count && count >= 5) opponent = null
    }

    if (opponent) {
      const questions = await generateQuestions(game_type, userId, opponent.student_id)

      if (questions.length < 5) {
        return json({ error: 'Not enough content to generate questions. Keep studying!' }, 400)
      }

      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name, avatar_url')
        .in('id', [userId, opponent.student_id])

      const { data: playerStats } = await supabase
        .from('duel_stats').select('student_id, elo, current_streak')
        .in('student_id', [userId, opponent.student_id])

      const roundCount = Math.min(questions.length, 10)
      const { data: duel, error: duelErr } = await supabase.from('duels').insert({
        game_type, player_a: userId, player_b: opponent.student_id,
        questions, round_count: roundCount, current_round: 0,
      }).select('id').single()

      if (duelErr) return json({ error: 'Failed to create duel' }, 500)

      await supabase.from('duel_queue').delete().eq('id', opponent.id)

      // Build safe questions (no correct answers leaked)
      const safeQuestions = questions.map((q: any, i: number) => {
        const base: any = { round: i + 1, type: q.type }
        if (q.type === 'meaning_mcq' || q.type === 'grammar_mcq') {
          base.word = q.word; base.choices = q.choices
          if (q.explanation_ar) base.explanation_ar = q.explanation_ar
        } else if (q.type === 'irregular_form') {
          base.word = q.word; base.ask = q.ask; base.meaning_ar = q.meaning_ar
        } else if (q.type === 'sentence_order') {
          base.chips = q.chips
        }
        return base
      })

      const profileMap: any = {}
      for (const p of (profiles || [])) profileMap[p.id] = p
      const statsMap: any = {}
      for (const s of (playerStats || [])) statsMap[s.student_id] = s

      const matchPayload = {
        duel_id: duel.id, game_type, round_count: roundCount, match_tier: matchTier,
        player_a: {
          id: userId, name: profileMap[userId]?.full_name || 'لاعب',
          avatar_url: profileMap[userId]?.avatar_url,
          elo: statsMap[userId]?.elo || 1000, streak: statsMap[userId]?.current_streak || 0,
        },
        player_b: {
          id: opponent.student_id, name: profileMap[opponent.student_id]?.full_name || 'لاعب',
          avatar_url: profileMap[opponent.student_id]?.avatar_url,
          elo: statsMap[opponent.student_id]?.elo || 1000, streak: statsMap[opponent.student_id]?.current_streak || 0,
        },
        questions: safeQuestions,
      }

      await broadcast(`duel:${userId}`, 'duel:start', matchPayload)
      await broadcast(`duel:${opponent.student_id}`, 'duel:start', matchPayload)

      return json({ status: 'matched', duel_id: duel.id, match: matchPayload })
    }

    // No match — queue
    const { error: queueErr } = await supabase.from('duel_queue').insert({
      student_id: userId, group_id: student.group_id, team_id: student.team_id,
      level: student.academic_level, game_type,
    })
    if (queueErr) return json({ error: 'Failed to join queue' }, 500)

    return json({ status: 'queued', message: 'Searching for opponent...' })
  } catch (err) {
    console.error('duel-enqueue error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})
