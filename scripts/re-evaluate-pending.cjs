// Re-evaluates ONLY ungraded speaking submissions using existing transcriptions.
// Calls Claude directly — skips Whisper re-transcription (no extra cost, no audio download).
// Safe: double-checks trainer_reviewed on UPDATE, throttles 300ms between calls.
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

const CLAUDE_KEY = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY

if (!CLAUDE_KEY) {
  console.error('CLAUDE_API_KEY or ANTHROPIC_API_KEY required in env')
  process.exit(1)
}

const LEVEL_DESCRIPTORS = {
  0: 'Pre-A1 Beginner — memorized words only. Any sentence is a win.',
  1: 'A1 Beginner — very simple sentences, basic vocabulary. Grammatical errors are normal. A score of 5 means good for this level.',
  2: 'A2 Elementary — short responses on everyday topics. Some variety in vocabulary. A score of 5 means meeting expectations.',
  3: 'B1 Intermediate — connected speech, linking words, some complex sentences. Hold to higher standards.',
  4: 'B2 Upper-intermediate — detailed responses, variety of tenses, nuanced vocabulary. Accuracy matters more.',
  5: 'C1 Advanced — complex, well-structured speech with nuanced expression. Near-native accuracy expected.',
}

async function claudeEval(transcription, level) {
  const levelDesc = LEVEL_DESCRIPTORS[level] || LEVEL_DESCRIPTORS[1]

  const systemPrompt = `You are a strict but encouraging ESL speaking examiner at Fluentia Academy (Saudi Arabia). You evaluate Arabic-speaking students' spoken English from Whisper transcripts.

MANDATORY PROCESS — follow in order:
Step 1 ANALYZE: Before scoring ANYTHING, quote 3 specific phrases from the transcript as evidence of strengths, and 3 specific phrases as evidence of weaknesses.
Step 2 SCORE: Use your quoted evidence to justify each dimension score. Scores must be derivable from the quoted evidence.
Step 3 COMPUTE: overall_score = (grammar_score×0.25 + vocabulary_score×0.20 + fluency_score×0.30 + task_completion_score×0.25), rounded to one decimal.

SCORING — use 0.5 increments (e.g. 5.5, 6.5, 7.5). Do NOT round everything to whole numbers.

GRAMMAR (0-10):
0-2: No control of basic structures. Every sentence has errors.
3-4: Frequent errors. Only present simple, often wrong.
5-6: Basic structures mostly correct. Attempts past/future with some errors.
7-8: Good control. Occasional errors in complex grammar.
9-10: Near-native accuracy.

VOCABULARY (0-10):
0-2: Fewer than 20 unique words. Cannot express basic ideas.
3-4: Very limited. Heavy repetition.
5-6: Adequate. Mostly high-frequency words.
7-8: Good range. Some less common words and collocations.
9-10: Rich, precise, idiomatic throughout.

FLUENCY (0-10):
0-2: Cannot produce connected speech.
3-4: Very hesitant. Under 40 words per minute.
5-6: Noticeable hesitation but completes thoughts. 40-80 wpm.
7-8: Generally smooth. 80-120 wpm. Uses linking words.
9-10: Natural flow. Over 120 wpm.

TASK COMPLETION (0-10):
0-2: Does not address topic.
3-4: Barely touches topic. Under 3 sentences.
5-6: Addresses topic superficially.
7-8: Good coverage. Provides details.
9-10: Thorough, well-developed.

⚠️ SCORE BIAS WARNING: 7.0 is the single most common score AI evaluators produce — avoid it unless you can write a specific quoted-phrase justification. When in doubt between 6.5 and 7.5, pick based on evidence, not convenience. Use the full range.

Student level: ${levelDesc}
All Arabic text: Modern Standard Arabic or simple colloquial. Be warm but honest.`

  const userPrompt = `Evaluate this student's speaking sample.
Student Level: L${level}

Transcript:
"""
${transcription}
"""

Respond ONLY with valid JSON (no markdown, no backticks):
{
  "level_context": "Level ${level}",
  "analysis": {
    "strengths": ["<quoted phrase + why good>", "<quoted phrase>", "<quoted phrase>"],
    "weaknesses": ["<quoted phrase + what is wrong>", "<quoted phrase>", "<quoted phrase>"]
  },
  "grammar_score": <number one decimal e.g. 6.5>,
  "vocabulary_score": <number one decimal>,
  "fluency_score": <number one decimal>,
  "task_completion_score": <number one decimal>,
  "overall_score": <number one decimal — computed as grammar×0.25+vocab×0.20+fluency×0.30+task×0.25>,
  "score_justification": "<1 sentence tying score to quoted evidence>",
  "strengths": "<Arabic warm specific praise>",
  "improvement_tip": "<Arabic ONE specific next step>",
  "feedback_ar": "<Arabic summary 3-4 sentences>",
  "feedback_en": "<English summary>",
  "suggestions": ["<actionable tip 1>", "<actionable tip 2>"]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      temperature: 0.35,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON in response')
  const parsed = JSON.parse(text.slice(start, end + 1))

  // Always recompute from subscores
  const g = Number(parsed.grammar_score) || 0
  const v = Number(parsed.vocabulary_score) || 0
  const f = Number(parsed.fluency_score) || 0
  const t = Number(parsed.task_completion_score) || 0
  if (g || v || f || t) {
    parsed.overall_score = Math.round((g * 0.25 + v * 0.20 + f * 0.30 + t * 0.25) * 10) / 10
  }
  parsed.score = parsed.overall_score

  return parsed
}

;(async () => {
  const { data: pending, error } = await sb
    .from('speaking_recordings')
    .select('id, student_id, ai_evaluation, students!inner(group_id, groups!inner(level))')
    .neq('trainer_reviewed', true)
    .not('ai_evaluation', 'is', null)
    .eq('is_latest', true)
    .order('ai_evaluated_at', { ascending: true })

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  const withTranscripts = (pending || []).filter(r => {
    const t = r.ai_evaluation?.transcript
    return t && !t.startsWith('[') && t.length > 5
  })

  console.log(`Total ungraded pending: ${pending?.length || 0}`)
  console.log(`With usable transcription: ${withTranscripts.length}`)
  if (withTranscripts.length === 0) { console.log('Nothing to re-evaluate.'); process.exit(0) }

  let reScored = 0, unchanged = 0, errors = 0

  for (const s of withTranscripts) {
    const oldScore = s.ai_evaluation?.overall_score ?? s.ai_evaluation?.score
    const level = s.students?.groups?.level ?? 1
    const transcription = s.ai_evaluation.transcript

    try {
      const newEval = await claudeEval(transcription, level)
      const newScore = newEval.overall_score

      const scoreDiff = Math.abs(Number(oldScore) - Number(newScore))
      const wasLazy7 = Number(oldScore) === 7

      if (scoreDiff > 0.2 || wasLazy7) {
        const merged = { ...s.ai_evaluation, ...newEval, transcript: transcription }
        const { error: updateErr } = await sb
          .from('speaking_recordings')
          .update({ ai_evaluation: merged })
          .eq('id', s.id)
          .neq('trainer_reviewed', true)   // double-check still ungraded

        if (updateErr) {
          errors++
          console.log(`UPDATE ERR ${s.id.slice(0, 8)}:`, updateErr.message)
        } else {
          reScored++
          console.log(`✓ ${s.id.slice(0, 8)} L${level}: ${oldScore} → ${newScore}`)
        }
      } else {
        unchanged++
        console.log(`~ ${s.id.slice(0, 8)} L${level}: ${oldScore} → ${newScore} (no significant change)`)
      }
    } catch (e) {
      errors++
      console.log(`ERR ${s.id.slice(0, 8)}:`, e.message)
    }

    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n=== Done ===`)
  console.log(`Re-scored:  ${reScored}`)
  console.log(`Unchanged:  ${unchanged}`)
  console.log(`Errors:     ${errors}`)
})()
