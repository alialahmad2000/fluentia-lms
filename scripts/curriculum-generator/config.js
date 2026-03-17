// ─── Fluentia Content Generator Configuration ────────────────────────

export default {
  // API
  CLAUDE_MODEL: 'claude-sonnet-4-20250514',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 2000,

  // Cost tracking (approximate per 1M tokens for Sonnet)
  COST_PER_1M_INPUT: 3.0,
  COST_PER_1M_OUTPUT: 15.0,

  // Content generation settings per level
  levels: {
    0: {
      name_en: 'Foundation', name_ar: 'تأسيس', cefr: 'Pre-A1',
      reading_words: { min: 200, max: 300 },
      vocabulary_per_reading: 8,
      mcq_choices: 3,
      comprehension_questions: 5,
      grammar_exercises: 6,
      vocabulary_exercises: 6,
      writing_word_limit: { min: 50, max: 80 },
      listening_duration_sec: { min: 60, max: 90 },
      speaking_prep_time_sec: 60,
      speaking_response_sec: 60,
      assessment_questions: 15,
      sentence_complexity: 'simple sentences, present tense mostly, familiar topics',
      vocabulary_type: 'high-frequency concrete nouns, basic adjectives, common verbs',
      grammar_focus: 'be verb, simple present, articles, this/that, plurals, pronouns',
      topics: 'family, home, food, animals, colors, body, classroom, daily routine, weather, clothes, jobs, hobbies'
    },
    1: {
      name_en: 'Basics', name_ar: 'أساسيات', cefr: 'A1',
      reading_words: { min: 300, max: 400 },
      vocabulary_per_reading: 10,
      mcq_choices: 3,
      comprehension_questions: 6,
      grammar_exercises: 8,
      vocabulary_exercises: 8,
      writing_word_limit: { min: 80, max: 120 },
      listening_duration_sec: { min: 90, max: 120 },
      speaking_prep_time_sec: 60,
      speaking_response_sec: 90,
      assessment_questions: 20,
      sentence_complexity: 'simple and some compound sentences, present and past tense, familiar and some new topics',
      vocabulary_type: 'everyday vocabulary, action verbs, descriptive adjectives, basic adverbs',
      grammar_focus: 'simple past, present continuous, can/cant, there is/are, prepositions, countable/uncountable',
      topics: 'travel, health, shopping, technology, nature, traditions, sports, education, friendship, community, cities, celebrations'
    },
    2: {
      name_en: 'Development', name_ar: 'تطوير', cefr: 'A2',
      reading_words: { min: 400, max: 500 },
      vocabulary_per_reading: 12,
      mcq_choices: 4,
      comprehension_questions: 7,
      grammar_exercises: 10,
      vocabulary_exercises: 10,
      writing_word_limit: { min: 120, max: 180 },
      listening_duration_sec: { min: 120, max: 180 },
      speaking_prep_time_sec: 45,
      speaking_response_sec: 120,
      assessment_questions: 25,
      sentence_complexity: 'compound sentences, past continuous, future plans, comparing things',
      vocabulary_type: 'topic-specific vocabulary, phrasal verbs (basic), collocations, word families',
      grammar_focus: 'past continuous, going to/will, comparatives/superlatives, modals (should/must), present perfect intro',
      topics: 'environment, media, culture, science discoveries, social issues, work life, innovation, art, migration, food science, architecture, oceans'
    },
    3: {
      name_en: 'Fluency', name_ar: 'طلاقة', cefr: 'B1',
      reading_words: { min: 500, max: 600 },
      vocabulary_per_reading: 14,
      mcq_choices: 4,
      comprehension_questions: 8,
      grammar_exercises: 10,
      vocabulary_exercises: 12,
      writing_word_limit: { min: 180, max: 250 },
      listening_duration_sec: { min: 180, max: 240 },
      speaking_prep_time_sec: 30,
      speaking_response_sec: 150,
      assessment_questions: 30,
      sentence_complexity: 'complex sentences, relative clauses, conditionals, passive voice, reported speech',
      vocabulary_type: 'academic vocabulary, idioms, phrasal verbs (intermediate), formal vs informal register',
      grammar_focus: 'present perfect vs past, conditionals (1st/2nd), passive voice, relative clauses, reported speech',
      topics: 'global challenges, psychology, economics, space exploration, language & identity, sustainability, AI & ethics, history lessons, human rights, medical advances, urbanization, creativity'
    },
    4: {
      name_en: 'Mastery', name_ar: 'تمكّن', cefr: 'B2',
      reading_words: { min: 700, max: 1000 },
      vocabulary_per_reading: 16,
      mcq_choices: 4,
      comprehension_questions: 10,
      grammar_exercises: 12,
      vocabulary_exercises: 14,
      writing_word_limit: { min: 250, max: 350 },
      listening_duration_sec: { min: 240, max: 300 },
      speaking_prep_time_sec: 30,
      speaking_response_sec: 180,
      assessment_questions: 35,
      sentence_complexity: 'sophisticated structures, nominalization, cleft sentences, inversion for emphasis',
      vocabulary_type: 'advanced academic, discipline-specific, nuanced synonyms, collocations with abstract nouns',
      grammar_focus: '3rd conditional, mixed conditionals, advanced passive, cleft sentences, inversion, wish/if only',
      topics: 'philosophy of science, geopolitics, behavioral economics, neuroscience, climate engineering, digital ethics, genetic research, cultural evolution, artificial intelligence, quantum physics, forensic science, deep-sea exploration'
    },
    5: {
      name_en: 'Proficiency', name_ar: 'احتراف', cefr: 'C1',
      reading_words: { min: 1000, max: 1200 },
      vocabulary_per_reading: 18,
      mcq_choices: 4,
      comprehension_questions: 12,
      grammar_exercises: 12,
      vocabulary_exercises: 14,
      writing_word_limit: { min: 350, max: 500 },
      listening_duration_sec: { min: 300, max: 360 },
      speaking_prep_time_sec: 15,
      speaking_response_sec: 240,
      assessment_questions: 40,
      sentence_complexity: 'near-native complexity, rhetorical devices, hedging, academic register, persuasive structures',
      vocabulary_type: 'low-frequency academic, discipline jargon, literary vocabulary, rhetorical devices',
      grammar_focus: 'subjunctive, advanced inversion, ellipsis, fronting, nominalization, discourse markers',
      topics: 'philosophy of mind, post-colonialism, information warfare, bioethics, mathematical modeling, existentialism, linguistic relativity, cryptography, cognitive biases, dark matter, synthetic biology, narrative psychology'
    }
  },

  // Grammar mapping per level (12 topics per level = 1 per unit)
  grammarMapping: {
    0: ['am/is/are', 'simple present positive', 'simple present negative/questions', 'this/that/these/those', 'plurals', 'a/an/the basics', 'there is/there are', 'possessive s', 'pronouns (I/me/my)', 'imperatives', 'adjective order basics', 'prepositions of place'],
    1: ['simple past (regular)', 'simple past (irregular)', 'past negative/questions', 'present continuous', 'can/cant', 'countable/uncountable', 'some/any', 'how much/how many', 'prepositions of time', 'adverbs of frequency', 'going to (future)', 'want/would like'],
    2: ['will vs going to', 'present perfect (ever/never)', 'present perfect (just/already/yet)', 'comparatives', 'superlatives', 'should/shouldnt', 'must/have to', 'may/might', 'too/enough', 'gerund vs infinitive basics', 'first conditional', 'past continuous'],
    3: ['present perfect vs past simple', 'present perfect continuous', 'second conditional', 'passive voice (present)', 'passive voice (past)', 'relative clauses (who/which/that)', 'reported speech basics', 'used to', 'get used to/be used to', 'both/either/neither', 'so/such', 'unless/as long as'],
    4: ['third conditional', 'mixed conditionals', 'wish + past/past perfect', 'advanced passive (by/with)', 'have something done', 'relative clauses (advanced)', 'participle clauses', 'inversion after negative adverbs', 'cleft sentences', 'future perfect', 'future continuous', 'advanced modal perfects'],
    5: ['subjunctive', 'fronting', 'ellipsis in speech', 'nominalization', 'advanced discourse markers', 'hedging and vague language', 'formal vs informal register', 'advanced reported speech', 'complex noun phrases', 'advanced linking devices', 'rhetorical questions', 'emphatic structures']
  },

  // Irregular verbs per level
  irregularVerbsPerLevel: {
    0: ['be', 'have', 'do', 'go', 'come', 'see', 'get', 'make', 'say', 'know'],
    1: ['take', 'give', 'find', 'think', 'tell', 'become', 'leave', 'feel', 'put', 'bring', 'begin', 'keep', 'hold', 'write', 'stand'],
    2: ['run', 'read', 'grow', 'draw', 'show', 'hear', 'pay', 'meet', 'sit', 'speak', 'lie', 'lead', 'understand', 'lose', 'catch'],
    3: ['build', 'send', 'fall', 'choose', 'deal', 'rise', 'wear', 'hang', 'throw', 'break', 'drive', 'buy', 'spend', 'cut', 'win'],
    4: ['seek', 'strike', 'withdraw', 'overcome', 'undertake', 'forbid', 'forgive', 'arise', 'bind', 'breed', 'creep', 'flee', 'grind', 'leap', 'weave'],
    5: ['strive', 'thrust', 'wring', 'cling', 'forsake', 'smite', 'slay', 'tread', 'behold', 'beseech', 'cleave', 'rend', 'sow', 'abide', 'partake']
  }
};
