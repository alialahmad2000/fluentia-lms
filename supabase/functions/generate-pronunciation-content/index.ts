// Fluentia LMS — Generate Pronunciation Content (Claude API)
// Generates structured pronunciation drills per unit
// Deploy: supabase functions deploy generate-pronunciation-content --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CEFR_LABELS: Record<number, string> = {
  0: 'Pre-A1', 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1',
}

const FOCUS_MAP: Record<number, string> = {
  0: 'minimal_pairs_vowels',
  1: 'minimal_pairs_consonants',
  2: 'word_stress',
  3: 'connected_speech_linking',
  4: 'connected_speech_reduction',
  5: 'intonation',
}

const SYSTEM_PROMPTS: Record<string, string> = {
  minimal_pairs_vowels: `You are a pronunciation coach for adult Arabic-speaking Pre-A1 learners. Generate minimal pairs focusing on vowel distinctions that Arabic speakers commonly struggle with (ship/sheep, bit/beat, cat/cut, pull/pool). Use real IPA. Return JSON only.`,
  minimal_pairs_consonants: `You are a pronunciation coach for adult Arabic-speaking A1 learners. Generate minimal pairs focusing on consonant distinctions that Arabic speakers struggle with (p/b, v/f, th/s, l/r). Use real IPA. Return JSON only.`,
  word_stress: `You are a pronunciation coach for adult Arabic-speaking A2 learners. Generate word stress exercises with 2-3 syllable words. Clearly mark stressed syllables. Use real IPA. Return JSON only.`,
  connected_speech_linking: `You are a pronunciation coach for adult Arabic-speaking B1 learners. Generate connected speech exercises showing linking, elision, and contractions in natural speech. Use real IPA. Return JSON only.`,
  connected_speech_reduction: `You are a pronunciation coach for adult Arabic-speaking B2 learners. Generate exercises on vowel reduction, weak forms, and schwa in function words. Use real IPA. Return JSON only.`,
  intonation: `You are a pronunciation coach for adult Arabic-speaking C1 learners. Generate intonation pattern exercises covering rising, falling, fall-rise patterns for questions, statements, lists, and emphasis. Use real IPA where relevant. Return JSON only.`,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY') || ''
  if (!CLAUDE_API_KEY) {
    return new Response(JSON.stringify({ error: 'CLAUDE_API_KEY not set' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }

  try {
    const { level_number, unit_theme_en, unit_theme_ar, unit_id, level_id } = await req.json()
    const focus = FOCUS_MAP[level_number] || 'minimal_pairs_vowels'
    const cefr = CEFR_LABELS[level_number] || 'A1'
    const system = SYSTEM_PROMPTS[focus]

    const userPrompt = `Unit theme: "${unit_theme_en}" (Arabic: "${unit_theme_ar}")
Level: ${level_number} (${cefr})

Generate a complete pronunciation drill set for this unit. Content should feel connected to the unit theme where possible.

Return ONLY this JSON structure (no preamble, no markdown fences):

{
  "focus_type": "${focus}",
  "title_en": "short descriptive title",
  "title_ar": "عنوان قصير وصفي بالعربي",
  "description_ar": "شرح مفصل للقاعدة بالعربية (3-4 جمل واضحة ومفيدة)",
  "rule_summary_ar": "القاعدة باختصار في جملة واحدة",
  "items": [
    ${focus.startsWith('minimal_pairs') ? '{"word1": "ship", "word2": "sheep", "ipa1": "/ʃɪp/", "ipa2": "/ʃiːp/", "hint_ar": "الفرق بين الصوتين: ɪ قصير و iː طويل"}' :
      focus === 'word_stress' ? '{"word": "important", "ipa": "/ɪmˈpɔːtənt/", "stressed_syllable": 2, "syllables": ["im","POR","tant"], "hint_ar": "التشديد على المقطع الثاني"}' :
      focus.startsWith('connected_speech') ? '{"written": "What are you doing?", "spoken": "Whatcha doin?", "ipa_spoken": "/ˈwɒtʃə ˈduːɪn/", "explanation_ar": "في الكلام السريع تندمج الكلمات"}' :
      '{"sentence": "Are you coming?", "pattern": "rising", "tone_curve": "↗", "explanation_ar": "نغمة صاعدة للأسئلة بنعم/لا"}'}
  ],
  "practice_sentences": [
    {"sentence_en": "The ship sailed across the sea.", "translation_ar": "أبحرت السفينة عبر البحر.", "target_words": ["ship", "sea"]}
  ]
}

Requirements:
- At least 10 items in "items" array
- At least 6 practice sentences
- Real, accurate IPA (standard British pronunciation)
- Arabic explanations must be natural, clear, and helpful for Saudi adults
- Content pedagogically sound and thematically connected to "${unit_theme_en}"
- No placeholder or dummy content`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      console.error('[generate-pronunciation] Claude error:', errText)
      return new Response(JSON.stringify({ error: 'Claude API error', detail: errText }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
      })
    }

    const claudeData = await claudeRes.json()
    const text = claudeData.content?.[0]?.text || ''

    // Extract JSON
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return new Response(JSON.stringify({ error: 'No JSON in response', raw: text.slice(0, 500) }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
      })
    }

    const content = JSON.parse(text.slice(start, end + 1))

    // If unit_id provided, insert directly into DB
    if (unit_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      const { error: insertError } = await supabase
        .from('curriculum_pronunciation')
        .upsert({
          unit_id,
          level_id,
          focus_type: content.focus_type || focus,
          title_en: content.title_en,
          title_ar: content.title_ar,
          description_ar: content.description_ar,
          content: {
            rule_summary_ar: content.rule_summary_ar,
            items: content.items,
            practice_sentences: content.practice_sentences,
          },
        }, { onConflict: 'unit_id' })

      if (insertError) {
        console.error('[generate-pronunciation] Insert error:', insertError)
        return new Response(JSON.stringify({ error: 'DB insert failed', detail: insertError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
        })
      }
    }

    return new Response(JSON.stringify({ success: true, content }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-pronunciation] Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
