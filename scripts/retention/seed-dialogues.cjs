#!/usr/bin/env node
/* eslint-disable no-console */
// Seed Module 1 personas + scenarios + linear dialogue turns + feedback templates.
// Idempotent (skips by slug).

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
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 700)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

const esc = (s) => s == null ? 'NULL' : `$${'p'}$${String(s).replace(/\$p\$/g, "$_p_$")}$${'p'}$`
const arrText = (a) => !a || a.length === 0 ? "'{}'::text[]" : `ARRAY[${a.map(esc).join(',')}]::text[]`

// ─── PERSONAS ────────────────────────────────────────────────────────────────
const PERSONAS = [
  { slug: 'sarah-barista',  name_en: 'Sarah',  name_ar: 'سارة',  voice_id: 'EXAVITQu4vr4xnSDxMaL',
    personality_description: 'A friendly café barista in her 20s. Casual, smiles often.', language_register: 'casual' },
  { slug: 'khalid-gym',     name_en: 'Khalid', name_ar: 'خالد',  voice_id: 'JBFqnCBsd6RMkjVDRZzb',
    personality_description: 'Energetic gym buddy. Encouraging, uses simple language.', language_register: 'casual' },
  { slug: 'dr-lopez',       name_en: 'Dr. Lopez', name_ar: 'دكتور لوبيز', voice_id: 'TxGEqnHWrfWFTfGW9XjX',
    personality_description: 'Calm, attentive family doctor. Professional but warm.', language_register: 'professional' },
  { slug: 'amira-hotel',    name_en: 'Amira',  name_ar: 'أميرة',  voice_id: 'AZnzlk1XvdvUeBnXmlld',
    personality_description: 'Helpful hotel receptionist. Polite, asks clarifying questions.', language_register: 'professional' },
  { slug: 'omar-taxi',      name_en: 'Omar',   name_ar: 'عمر',   voice_id: 'pNInz6obpgDQGcFmaJgB',
    personality_description: 'Chatty taxi driver who loves giving recommendations.', language_register: 'casual' },
  { slug: 'lina-shopkeeper', name_en: 'Lina',  name_ar: 'لينا',  voice_id: 'XB0fDUnXU5powFXDhCwa',
    personality_description: 'Local clothing shop owner. Friendly, patient with non-native speakers.', language_register: 'casual' },
  { slug: 'noor-waiter',    name_en: 'Noor',   name_ar: 'نور',   voice_id: 'XrExE9yKIg1WjnnlVkGX',
    personality_description: 'Restaurant waitress, professional, helpful with menu choices.', language_register: 'professional' },
  { slug: 'fahad-receptionist', name_en: 'Fahad', name_ar: 'فهد', voice_id: 'VR6AewLTigWG4xSOukaG',
    personality_description: 'University admin office receptionist. Formal but kind.', language_register: 'formal' },
]

// ─── SCENARIOS (linear turn sequences for v1) ───────────────────────────────
// Each scenario: { slug, personaSlug, title_en, title_ar, setting_en, goal_en,
//                  difficulty, target_level, target_vocab, target_grammar,
//                  turns: [ { ai_text_en, expected_response_type, expected_vocab, min_words } ] }
const SCENARIOS = [
  // L1 — Sarah Barista — order coffee
  {
    slug: 'l1-order-coffee', personaSlug: 'sarah-barista', target_level: 'L1', difficulty: 'easy',
    title_en: 'Order a coffee', title_ar: 'اطلبي قهوة',
    setting_en: "At a busy café counter. You're ordering for the first time.",
    goal_en: "Order a coffee and ask about today's special.",
    estimated_minutes: 4,
    target_vocab: ['hello','coffee','please','thank you','small','medium','large'],
    target_grammar: ['articles','politeness'],
    turns: [
      { ai_text_en: "Hi! Welcome to our café. What can I get you today?", expected_response_type: 'open', expected_vocab: ['hello','coffee','please'], min_words: 3 },
      { ai_text_en: "Great choice! What size would you like? Small, medium, or large?", expected_response_type: 'description', expected_vocab: ['small','medium','large','please'], min_words: 2 },
      { ai_text_en: "And would you like to try our special today? It's an iced caramel latte.", expected_response_type: 'yes_no', expected_vocab: ['yes','no','please','thank you'], min_words: 2 },
      { ai_text_en: "Perfect. Anything else?", expected_response_type: 'yes_no', expected_vocab: ['no','thank you'], min_words: 2 },
      { ai_text_en: "Your total is fifteen riyals. Have a wonderful day!", expected_response_type: 'closing', expected_vocab: ['thank you','goodbye','you too'], min_words: 1, is_terminal: true },
    ],
  },
  // L1 — Khalid Gym — first day intro
  {
    slug: 'l1-gym-introduction', personaSlug: 'khalid-gym', target_level: 'L1', difficulty: 'easy',
    title_en: 'First day at the gym', title_ar: 'أول يوم في النادي',
    setting_en: "You meet a friendly gym member who offers to show you around.",
    goal_en: "Introduce yourself and ask about gym hours.",
    estimated_minutes: 4,
    target_vocab: ['hi','name','from','first time','open','close'],
    target_grammar: ['present_simple_be','question_word_order'],
    turns: [
      { ai_text_en: "Hey! I haven't seen you before. Is this your first time here?", expected_response_type: 'yes_no', expected_vocab: ['yes','first time','hi'], min_words: 3 },
      { ai_text_en: "Welcome! I'm Khalid. What's your name?", expected_response_type: 'open', expected_vocab: ['name','my'], min_words: 2 },
      { ai_text_en: "Nice to meet you. Where are you from?", expected_response_type: 'open', expected_vocab: ['from'], min_words: 2 },
      { ai_text_en: "Cool. Do you want me to show you the machines?", expected_response_type: 'yes_no', expected_vocab: ['yes','please','no','thank you'], min_words: 2 },
      { ai_text_en: "Awesome. The gym is open every day from 6 AM. See you around!", expected_response_type: 'closing', expected_vocab: ['thank you','bye','see you'], min_words: 2, is_terminal: true },
    ],
  },
  // L1 — Noor Waiter — order food
  {
    slug: 'l1-restaurant-order', personaSlug: 'noor-waiter', target_level: 'L1', difficulty: 'easy',
    title_en: 'Order at a restaurant', title_ar: 'اطلبي في مطعم',
    setting_en: "You sit down at a restaurant and the waitress brings the menu.",
    goal_en: "Order food and a drink politely.",
    estimated_minutes: 4,
    target_vocab: ['menu','water','chicken','rice','please','thank you'],
    target_grammar: ['polite_requests','articles'],
    turns: [
      { ai_text_en: "Hello, welcome to our restaurant. Here is the menu. Can I get you anything to drink?", expected_response_type: 'description', expected_vocab: ['water','please'], min_words: 2 },
      { ai_text_en: "Sure. Are you ready to order food?", expected_response_type: 'yes_no', expected_vocab: ['yes','no'], min_words: 1 },
      { ai_text_en: "Great. What would you like?", expected_response_type: 'description', expected_vocab: ['chicken','rice','please'], min_words: 3 },
      { ai_text_en: "Excellent choice. Anything else?", expected_response_type: 'yes_no', expected_vocab: ['no','thank you'], min_words: 2 },
      { ai_text_en: "Your food will be ready in fifteen minutes. Enjoy!", expected_response_type: 'closing', expected_vocab: ['thank you'], min_words: 1, is_terminal: true },
    ],
  },
  // L1 — Lina Shopkeeper — buy clothes
  {
    slug: 'l1-buy-shirt', personaSlug: 'lina-shopkeeper', target_level: 'L1', difficulty: 'easy',
    title_en: 'Buy a shirt', title_ar: 'اشتري قميص',
    setting_en: "A small clothes shop. You're looking at the shirts.",
    goal_en: "Ask about sizes and price.",
    estimated_minutes: 4,
    target_vocab: ['shirt','size','small','medium','large','how much','price'],
    target_grammar: ['question_word_order','demonstratives'],
    turns: [
      { ai_text_en: "Hi! Are you looking for something specific?", expected_response_type: 'description', expected_vocab: ['shirt','looking'], min_words: 3 },
      { ai_text_en: "We have many. What size do you wear?", expected_response_type: 'description', expected_vocab: ['size','small','medium','large'], min_words: 2 },
      { ai_text_en: "Here is a medium. Do you like the color?", expected_response_type: 'yes_no', expected_vocab: ['yes','no','like','color'], min_words: 2 },
      { ai_text_en: "It's eighty riyals. Would you like it?", expected_response_type: 'yes_no', expected_vocab: ['yes','please','no','thank you'], min_words: 2 },
      { ai_text_en: "Wonderful. Here's your bag. Have a great day!", expected_response_type: 'closing', expected_vocab: ['thank you'], min_words: 1, is_terminal: true },
    ],
  },
  // L1 — Omar Taxi — destination
  {
    slug: 'l1-taxi-ride', personaSlug: 'omar-taxi', target_level: 'L1', difficulty: 'easy',
    title_en: 'Take a taxi', title_ar: 'خذي تكسي',
    setting_en: "You hop in a taxi and need to tell the driver your destination.",
    goal_en: "Give your destination and ask about the price.",
    estimated_minutes: 4,
    target_vocab: ['hello','where','to','airport','mall','please','how much'],
    target_grammar: ['prepositions_to'],
    turns: [
      { ai_text_en: "Hello! Where would you like to go?", expected_response_type: 'description', expected_vocab: ['to','mall','airport'], min_words: 3 },
      { ai_text_en: "OK, no problem. About how much time do you have?", expected_response_type: 'description', expected_vocab: ['hour','minutes','time'], min_words: 2 },
      { ai_text_en: "I can take the short road if you're in a hurry. Is that OK?", expected_response_type: 'yes_no', expected_vocab: ['yes','please','no'], min_words: 2 },
      { ai_text_en: "Here we are. That's twenty riyals.", expected_response_type: 'closing', expected_vocab: ['thank you','keep change'], min_words: 1, is_terminal: true },
    ],
  },
  // L1 — Dr Lopez — appointment booking
  {
    slug: 'l1-doctor-appointment', personaSlug: 'dr-lopez', target_level: 'L1', difficulty: 'easy',
    title_en: 'Book a doctor appointment', title_ar: 'احجزي موعد طبيب',
    setting_en: "You're calling the clinic to book an appointment.",
    goal_en: "Ask for an appointment and choose a time.",
    estimated_minutes: 5,
    target_vocab: ['appointment','tomorrow','morning','afternoon','please','name'],
    target_grammar: ['polite_requests','time_expressions'],
    turns: [
      { ai_text_en: "Good morning, this is Dr. Lopez's office. How can I help you?", expected_response_type: 'description', expected_vocab: ['appointment','please'], min_words: 3 },
      { ai_text_en: "Of course. We have openings tomorrow morning or afternoon. Which works for you?", expected_response_type: 'description', expected_vocab: ['morning','afternoon','tomorrow','please'], min_words: 2 },
      { ai_text_en: "Great. May I have your name, please?", expected_response_type: 'description', expected_vocab: ['my','name'], min_words: 2 },
      { ai_text_en: "Thank you. You're booked. Anything else?", expected_response_type: 'yes_no', expected_vocab: ['no','thank you'], min_words: 2 },
      { ai_text_en: "Have a lovely day!", expected_response_type: 'closing', expected_vocab: ['thank you'], min_words: 1, is_terminal: true },
    ],
  },

  // L3 — Sarah Barista — small talk
  {
    slug: 'l3-cafe-smalltalk', personaSlug: 'sarah-barista', target_level: 'L3', difficulty: 'medium',
    title_en: 'Café small talk', title_ar: 'دردشة في الكوفي',
    setting_en: "You're a regular customer. Sarah recognises you.",
    goal_en: "Have a natural 2-minute small-talk exchange while ordering.",
    estimated_minutes: 6,
    target_vocab: ['busy','weekend','plans','tired','usually','recently'],
    target_grammar: ['present_perfect','adverbs_of_frequency'],
    turns: [
      { ai_text_en: "Hey, good to see you again! The usual?", expected_response_type: 'yes_no', expected_vocab: ['yes','usual','actually'], min_words: 3 },
      { ai_text_en: "How has your week been so far?", expected_response_type: 'description', expected_vocab: ['busy','tired','good','okay','recently'], min_words: 5 },
      { ai_text_en: "Oh nice. Doing anything special this weekend?", expected_response_type: 'description', expected_vocab: ['weekend','plans','going','meeting'], min_words: 6 },
      { ai_text_en: "Sounds fun. Hope you enjoy it!", expected_response_type: 'closing', expected_vocab: ['thank you','too','same'], min_words: 3, is_terminal: true },
    ],
  },
  // L3 — Amira Hotel — booking
  {
    slug: 'l3-hotel-checkin', personaSlug: 'amira-hotel', target_level: 'L3', difficulty: 'medium',
    title_en: 'Hotel check-in', title_ar: 'تسجيل دخول الفندق',
    setting_en: "You arrive at a hotel with a reservation under your name.",
    goal_en: "Check in, confirm details, ask about facilities.",
    estimated_minutes: 6,
    target_vocab: ['reservation','two nights','double room','breakfast','included','pool','wifi'],
    target_grammar: ['present_perfect','passive_simple'],
    turns: [
      { ai_text_en: "Good evening, welcome. Do you have a reservation with us?", expected_response_type: 'yes_no', expected_vocab: ['yes','reservation','under'], min_words: 3 },
      { ai_text_en: "I see your booking — two nights, double room. Is that correct?", expected_response_type: 'yes_no', expected_vocab: ['yes','correct','that'], min_words: 2 },
      { ai_text_en: "Lovely. Breakfast is included from 7 to 10 AM. Do you have any questions?", expected_response_type: 'open', expected_vocab: ['pool','wifi','where','time'], min_words: 5 },
      { ai_text_en: "Here are your key cards. The lift is to your right. Enjoy your stay!", expected_response_type: 'closing', expected_vocab: ['thank you','appreciate'], min_words: 2, is_terminal: true },
    ],
  },
  // L3 — Dr Lopez — describe symptoms
  {
    slug: 'l3-describe-symptoms', personaSlug: 'dr-lopez', target_level: 'L3', difficulty: 'challenging',
    title_en: 'Describe symptoms to a doctor', title_ar: 'وصفي الأعراض للدكتور',
    setting_en: "You visit the clinic with a headache and tiredness.",
    goal_en: "Describe symptoms clearly and answer follow-up questions.",
    estimated_minutes: 7,
    target_vocab: ['headache','tired','sleep','since','medicine','allergic'],
    target_grammar: ['present_perfect','since_for'],
    turns: [
      { ai_text_en: "Hello, please have a seat. What seems to be the problem today?", expected_response_type: 'description', expected_vocab: ['headache','tired','feel'], min_words: 6 },
      { ai_text_en: "I'm sorry to hear that. How long have you had these symptoms?", expected_response_type: 'description', expected_vocab: ['since','for','days','week'], min_words: 4 },
      { ai_text_en: "OK. How is your sleep? Are you getting enough rest?", expected_response_type: 'description', expected_vocab: ['sleep','hours','enough','tired'], min_words: 5 },
      { ai_text_en: "I'll prescribe you something mild. Are you allergic to any medicine?", expected_response_type: 'yes_no', expected_vocab: ['no','yes','allergic','medicine'], min_words: 2 },
      { ai_text_en: "Great. Take this twice a day for three days. Any questions?", expected_response_type: 'yes_no', expected_vocab: ['no','thank you','question'], min_words: 2 },
      { ai_text_en: "Take care and feel better soon!", expected_response_type: 'closing', expected_vocab: ['thank you'], min_words: 1, is_terminal: true },
    ],
  },
  // L3 — Fahad Receptionist — university enrollment
  {
    slug: 'l3-university-inquiry', personaSlug: 'fahad-receptionist', target_level: 'L3', difficulty: 'medium',
    title_en: 'Ask about a university program', title_ar: 'استفسري عن برنامج جامعي',
    setting_en: "You visit the admin office to ask about an English program.",
    goal_en: "Ask about requirements, duration, and fees.",
    estimated_minutes: 6,
    target_vocab: ['program','requirements','duration','fees','documents','register'],
    target_grammar: ['polite_questions','present_perfect'],
    turns: [
      { ai_text_en: "Good morning. How may I assist you today?", expected_response_type: 'description', expected_vocab: ['program','interested','ask'], min_words: 5 },
      { ai_text_en: "Certainly. The program is one year. Have you completed your high school certificate?", expected_response_type: 'yes_no', expected_vocab: ['yes','completed','have'], min_words: 2 },
      { ai_text_en: "Excellent. The fees are six thousand riyals per semester. Would you like the documents list?", expected_response_type: 'yes_no', expected_vocab: ['yes','please','documents'], min_words: 2 },
      { ai_text_en: "Here you are. You can register online or come back next week.", expected_response_type: 'closing', expected_vocab: ['thank you','online','come back'], min_words: 2, is_terminal: true },
    ],
  },
  // L3 — Omar Taxi — recommendation
  {
    slug: 'l3-restaurant-recommendation', personaSlug: 'omar-taxi', target_level: 'L3', difficulty: 'medium',
    title_en: 'Ask for a restaurant recommendation', title_ar: 'اسألي عن مطعم منيح',
    setting_en: "Omar is your taxi driver — he knows the city well.",
    goal_en: "Ask for a restaurant suggestion that fits your taste and budget.",
    estimated_minutes: 5,
    target_vocab: ['recommend','traditional','affordable','spicy','quiet','near'],
    target_grammar: ['question_word_order','comparatives'],
    turns: [
      { ai_text_en: "So, what kind of food are you in the mood for tonight?", expected_response_type: 'description', expected_vocab: ['traditional','spicy','light','want'], min_words: 4 },
      { ai_text_en: "Good choice. Do you want something fancy or more affordable?", expected_response_type: 'description', expected_vocab: ['affordable','cheap','expensive','medium'], min_words: 3 },
      { ai_text_en: "I know a place. It's quiet, family-run. Want me to drive you there?", expected_response_type: 'yes_no', expected_vocab: ['yes','please','sounds good'], min_words: 2 },
      { ai_text_en: "Great, you'll love it!", expected_response_type: 'closing', expected_vocab: ['thank you'], min_words: 1, is_terminal: true },
    ],
  },
  // L3 — Lina Shopkeeper — return/exchange
  {
    slug: 'l3-return-item', personaSlug: 'lina-shopkeeper', target_level: 'L3', difficulty: 'challenging',
    title_en: 'Return an item', title_ar: 'رجعي قطعة',
    setting_en: "You bought a shirt yesterday but the size doesn't fit.",
    goal_en: "Ask to exchange it or get a refund.",
    estimated_minutes: 6,
    target_vocab: ['return','exchange','receipt','size','too small','refund','policy'],
    target_grammar: ['present_perfect','polite_requests'],
    turns: [
      { ai_text_en: "Hi again! Is everything OK with what you bought?", expected_response_type: 'description', expected_vocab: ['return','exchange','too small','large'], min_words: 5 },
      { ai_text_en: "Oh I'm sorry. Do you have the receipt?", expected_response_type: 'yes_no', expected_vocab: ['yes','no','receipt','have'], min_words: 2 },
      { ai_text_en: "Perfect. Would you like a different size or a refund?", expected_response_type: 'description', expected_vocab: ['exchange','refund','larger','different'], min_words: 3 },
      { ai_text_en: "OK, here's the larger one. Anything else?", expected_response_type: 'yes_no', expected_vocab: ['no','thank you'], min_words: 2 },
      { ai_text_en: "Glad it worked out!", expected_response_type: 'closing', expected_vocab: ['thank you'], min_words: 1, is_terminal: true },
    ],
  },
]

// ─── FEEDBACK TEMPLATES ─────────────────────────────────────────────────────
// Slot fillers: {{student_name}}, {{vocab_hits}}, {{vocab_total}}
const FEEDBACK_TEMPLATES = [
  { trigger_condition: { vocab_hit_pct: '>=80', completion: 'full' },
    template_ar: 'محادثة ممتازة! استخدمتِ {{vocab_hits}} من {{vocab_total}} كلمات مستهدفة. لسانك يتحسّن — استمري!' },
  { trigger_condition: { vocab_hit_pct: '>=60', completion: 'full' },
    template_ar: 'محادثة جيدة. أكملتي كل الجولات واستخدمتِ {{vocab_hits}} من {{vocab_total}} كلمات. حاولي توسعي الجمل أكثر مرة جاية.' },
  { trigger_condition: { vocab_hit_pct: '>=40', completion: 'full' },
    template_ar: 'أكملتيها — أحسنتِ! نقطة للتركيز: استخدمي كلمات الموضوع المستهدفة أكثر. هذا راح يثبت المفردات في ذهنك.' },
  { trigger_condition: { vocab_hit_pct: '<40', completion: 'full' },
    template_ar: 'أكملتي المحادثة! المرة الجاية حاولي تستخدمي ٢-٣ كلمات على الأقل من الكلمات الموجودة في وصف المحادثة قبل ما تبدئي.' },
  { trigger_condition: { completion: 'partial' },
    template_ar: 'بدأتي بشكل جيد. حاولي تكملي المحادثة كاملة المرة الجاية — كل جولة تبني ثقتك أكثر.' },
]

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref = process.env.BRANCH_REF
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and BRANCH_REF required')

  // 1. Personas
  console.log('Seeding personas...')
  for (const p of PERSONAS) {
    const sql = `INSERT INTO retention_personas (slug, name_en, name_ar, voice_id, personality_description, language_register)
      VALUES (${esc(p.slug)}, ${esc(p.name_en)}, ${esc(p.name_ar)}, ${esc(p.voice_id)}, ${esc(p.personality_description)}, ${esc(p.language_register)})
      ON CONFLICT (slug) DO NOTHING`
    await call(token, ref, sql)
  }

  // 2. Scenarios + turns
  console.log('Seeding scenarios + turns...')
  for (const sc of SCENARIOS) {
    // Find persona id
    const pres = await call(token, ref, `SELECT id FROM retention_personas WHERE slug = ${esc(sc.personaSlug)} LIMIT 1`)
    if (!Array.isArray(pres) || pres.length === 0) {
      console.error(`  Persona not found for ${sc.slug}`); continue
    }
    const personaId = pres[0].id

    // Insert scenario
    const scSql = `INSERT INTO retention_scenarios (slug, persona_id, title_en, title_ar, setting_en, goal_en, difficulty, target_level, estimated_minutes, target_vocab, target_grammar, active)
      VALUES (${esc(sc.slug)}, '${personaId}', ${esc(sc.title_en)}, ${esc(sc.title_ar)}, ${esc(sc.setting_en)}, ${esc(sc.goal_en)}, '${sc.difficulty}', '${sc.target_level}', ${sc.estimated_minutes || 5}, ${arrText(sc.target_vocab)}, ${arrText(sc.target_grammar)}, true)
      ON CONFLICT (slug) DO NOTHING
      RETURNING id`
    const scRes = await call(token, ref, scSql)
    let scenarioId
    if (Array.isArray(scRes) && scRes.length > 0) {
      scenarioId = scRes[0].id
    } else {
      const fetch = await call(token, ref, `SELECT id FROM retention_scenarios WHERE slug = ${esc(sc.slug)} LIMIT 1`)
      scenarioId = fetch[0].id
    }

    // Insert turns
    const existingTurns = await call(token, ref,
      `SELECT count(*) AS c FROM retention_dialogue_turns WHERE scenario_id = '${scenarioId}'`
    )
    if (existingTurns[0].c >= sc.turns.length) continue

    for (let i = 0; i < sc.turns.length; i++) {
      const t = sc.turns[i]
      const turnSql = `INSERT INTO retention_dialogue_turns
        (scenario_id, turn_number, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal)
        VALUES ('${scenarioId}', ${i + 1}, ${esc(t.ai_text_en)}, '${t.expected_response_type}', ${arrText(t.expected_vocab)}, ${t.min_words || 3}, ${t.is_terminal ? 'true' : 'false'})`
      await call(token, ref, turnSql)
    }
  }

  // 3. Global feedback templates (scenario_id NULL = applies to all)
  console.log('Seeding feedback templates...')
  for (const f of FEEDBACK_TEMPLATES) {
    const sql = `INSERT INTO retention_feedback_templates (scenario_id, trigger_condition, template_ar)
      VALUES (NULL, ${esc(JSON.stringify(f.trigger_condition))}::jsonb, ${esc(f.template_ar)})`
    await call(token, ref, sql)
  }

  // Verify
  const summary = await call(token, ref,
    `SELECT (SELECT count(*) FROM retention_personas) AS personas, (SELECT count(*) FROM retention_scenarios) AS scenarios, (SELECT count(*) FROM retention_dialogue_turns) AS turns, (SELECT count(*) FROM retention_feedback_templates) AS templates`
  )
  console.log('Summary:', summary)
})()
