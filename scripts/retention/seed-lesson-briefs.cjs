#!/usr/bin/env node
/* eslint-disable no-console */
// Generate 72×2 = 144 lesson briefs procedurally from curriculum metadata.
// Each unit gets: 1 prep brief + 1 review brief, built from theme + 3 vocab
// words + 1 grammar concept.

const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function esc(s) {
  if (s == null) return 'NULL'
  return `$${'b'}$${s}$${'b'}$`
}

function arrText(arr) {
  if (!arr || arr.length === 0) return "'{}'::text[]"
  return `ARRAY[${arr.map(x => esc(x)).join(',')}]::text[]`
}

function jsonbVal(v) {
  if (v == null) return 'NULL'
  return `${esc(JSON.stringify(v))}::jsonb`
}

function buildPrepBrief(unit, vocab, grammar) {
  const theme = unit.theme_ar || unit.theme || `الوحدة ${unit.unit_number}`
  const vocabList = vocab.slice(0, 3).map(v => v.word || v.english || '').filter(Boolean)
  const grammarTopic = grammar?.title_ar || grammar?.title_en || 'النقطة النحوية الأساسية'

  return {
    brief_type: 'prep',
    title_ar: `تحضير الكلاس: ${theme}`,
    body_ar: `قبل كلاسكِ القادم، خذي دقيقة لمراجعة موضوع "${theme}".\n\n` +
             `**كلمات راح تسمعينها:**\n${vocabList.map(w => `- ${w}`).join('\n') || '- (لا توجد كلمات محددة لهذه الوحدة)'}\n\n` +
             `**النقطة النحوية:** ${grammarTopic}\n\n` +
             `**سؤال للتفكير:** ${pickWarmupQuestion(theme)}`,
    vocab_words: vocabList,
    grammar_concept_ar: grammarTopic,
    warmup_question_ar: pickWarmupQuestion(theme),
    self_check_question_ar: null,
    self_check_options: null,
    self_check_correct: null,
    mini_task_ar: null,
    audio_path: null,
  }
}

function buildReviewBrief(unit, vocab, grammar) {
  const theme = unit.theme_ar || unit.theme || `الوحدة ${unit.unit_number}`
  const vocabList = vocab.slice(0, 3).map(v => v.word || v.english || '').filter(Boolean)
  const grammarTopic = grammar?.title_ar || grammar?.title_en || 'النقطة النحوية الأساسية'

  const firstVocab = vocabList[0] || 'a new word'
  const correct = 'يقصد به استخدام صحيح'
  const opt2 = 'يقصد به استخدام مختلف'
  const opt3 = 'لا أعرف'
  const checkQ = `بعد ما درستِ "${theme}" في الكلاس، أيش الجملة الصحيحة لاستخدام "${firstVocab}"؟`

  return {
    brief_type: 'review',
    title_ar: `مراجعة الكلاس: ${theme}`,
    body_ar: `أحسنتِ على حضوركِ! ٩٠ ثانية لتثبيت ما تعلّمتِه:\n\n` +
             `**اليوم تعلّمتِ:**\n` +
             `- موضوع ${theme}\n` +
             (vocabList.length > 0 ? `- كلمات جديدة: ${vocabList.join('، ')}\n` : '') +
             `- ${grammarTopic}\n\n` +
             `**مهمة قصيرة:** ${pickMiniTask(theme, firstVocab)}`,
    vocab_words: vocabList,
    grammar_concept_ar: grammarTopic,
    warmup_question_ar: null,
    self_check_question_ar: checkQ,
    self_check_options: [
      { key: 'a', text: correct },
      { key: 'b', text: opt2 },
      { key: 'c', text: opt3 },
    ],
    self_check_correct: 'a',
    mini_task_ar: pickMiniTask(theme, firstVocab),
    audio_path: null,
  }
}

function pickWarmupQuestion(theme) {
  return `قبل الكلاس: فكّري في موقف من حياتكِ يتعلق بـ "${theme}". راح يساعدكِ هذا تتكلمين أحسن في الكلاس.`
}

function pickMiniTask(theme, sampleWord) {
  return sampleWord
    ? `اكتبي جملة واحدة بالإنجليزي تستخدمين فيها "${sampleWord}".`
    : `اكتبي جملتين بالإنجليزي عن "${theme}".`
}

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref = process.env.BRANCH_REF
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and BRANCH_REF required')

  console.log('Fetching units...')
  const unitsRes = await call(token, ref,
    `SELECT u.id, u.unit_number, COALESCE(u.theme_ar, u.theme_en) AS theme_ar,
            u.theme_en, l.level_number
     FROM curriculum_units u
     JOIN curriculum_levels l ON l.id = u.level_id
     WHERE l.level_number IN (1, 3)  -- L1 + L3 first (active student levels)
     ORDER BY l.level_number, u.unit_number`
  )
  if (!Array.isArray(unitsRes)) {
    console.error('Failed to fetch units:', unitsRes)
    process.exit(1)
  }
  console.log(`Found ${unitsRes.length} units for L1+L3.`)

  let inserted = 0
  let skipped = 0
  for (const unit of unitsRes) {
    // Fetch vocab for this unit (via reading_id join)
    const vocabRes = await call(token, ref,
      `SELECT cv.word, cv.definition_ar FROM curriculum_vocabulary cv
       JOIN curriculum_readings cr ON cr.id = cv.reading_id
       WHERE cr.unit_id = '${unit.id}' ORDER BY cv.sort_order NULLS LAST, cv.id LIMIT 5`
    )
    // Fetch grammar (first) — curriculum_grammar.unit_id is direct
    const grammarRes = await call(token, ref,
      `SELECT topic_name_ar AS title_ar, topic_name_en AS title_en FROM curriculum_grammar
       WHERE unit_id = '${unit.id}' ORDER BY sort_order NULLS LAST, id LIMIT 1`
    )

    const vocab = Array.isArray(vocabRes) ? vocabRes : []
    const grammar = Array.isArray(grammarRes) && grammarRes.length > 0 ? grammarRes[0] : null

    for (const builder of [buildPrepBrief, buildReviewBrief]) {
      const brief = builder(unit, vocab, grammar)
      // Check existence
      const check = await call(token, ref,
        `SELECT id FROM retention_lesson_briefs WHERE unit_id = '${unit.id}' AND brief_type = '${brief.brief_type}' LIMIT 1`
      )
      if (Array.isArray(check) && check.length > 0) {
        skipped += 1
        continue
      }
      const sql = `INSERT INTO retention_lesson_briefs
        (unit_id, brief_type, title_ar, body_ar, vocab_words, grammar_concept_ar, warmup_question_ar,
         self_check_question_ar, self_check_options, self_check_correct, mini_task_ar)
        VALUES (
          '${unit.id}',
          '${brief.brief_type}',
          ${esc(brief.title_ar)},
          ${esc(brief.body_ar)},
          ${arrText(brief.vocab_words)},
          ${esc(brief.grammar_concept_ar)},
          ${esc(brief.warmup_question_ar)},
          ${esc(brief.self_check_question_ar)},
          ${jsonbVal(brief.self_check_options)},
          ${esc(brief.self_check_correct)},
          ${esc(brief.mini_task_ar)}
        )`
      try {
        await call(token, ref, sql)
        inserted += 1
      } catch (e) {
        console.error(`  FAIL unit=${unit.unit_number} type=${brief.brief_type}:`, e.message.slice(0, 200))
      }
    }
    if ((inserted + skipped) % 10 === 0) {
      console.log(`  progress: ${inserted} inserted, ${skipped} skipped, ${unitsRes.length * 2} total`)
    }
  }

  const rollup = await call(token, ref,
    `SELECT brief_type, count(*) FROM retention_lesson_briefs GROUP BY brief_type`
  )
  console.log(`\nDone. Inserted: ${inserted}, Skipped (already exists): ${skipped}.`)
  console.log('Bank state:', rollup)
})()
