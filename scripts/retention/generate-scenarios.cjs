#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-OVERNIGHT Block 4 — dialogue scenarios + turns generator.
// Generates ~80 new scenarios distributed across 5 levels with 5-6 linear
// turns each. Audio paths left NULL (Block 5 fills them).

const https = require('https')

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,400)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const esc = (s) => s == null ? 'NULL' : `$${'s'}$${String(s).replace(/\$s\$/g,'$_s_$')}$${'s'}$`
const arrText = (a) => !a||a.length===0 ? "'{}'::text[]" : `ARRAY[${a.map((x)=>esc(x)).join(',')}]::text[]`

// Each scenario uses a persona slug from the existing 8. New scenarios designed
// across daily-life situations a Saudi student plausibly faces in English.

const SCENARIOS = [
  // ───── L1 (additional) — 8 scenarios
  { slug:'l1-pharmacy-cold', personaSlug:'noor-waiter', level:'L1', difficulty:'easy',
    title_en:"Buy cold medicine at the pharmacy", title_ar:"اشتري دواء برد من الصيدلية",
    setting_en:"A neighborhood pharmacy in Riyadh. You have a cold and need help finding medicine.",
    goal_en:"Describe your symptoms and ask for advice.",
    target_vocab:['cold','headache','medicine','tablet','syrup','help'],
    target_grammar:['present_simple','polite_requests'],
    turns:[
      {ai:"Hi! How can I help you today?", type:'description', vocab:['cold','headache'], minw:3},
      {ai:"I'm sorry to hear that. How long have you felt this way?", type:'description', vocab:['days','since'], minw:3},
      {ai:"OK. Do you prefer tablets or syrup?", type:'description', vocab:['tablet','syrup','please'], minw:2},
      {ai:"Here you go. Take one in the morning and one at night.", type:'yes_no', vocab:['thank you','OK','clear'], minw:2},
      {ai:"You're welcome. Feel better soon!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l1-supermarket-help', personaSlug:'lina-shopkeeper', level:'L1', difficulty:'easy',
    title_en:"Find an item in the supermarket", title_ar:"دوّري على غرض في السوبر ماركت",
    setting_en:"You're looking for an item but can't find it in the supermarket.",
    goal_en:"Ask for help finding a specific product.",
    target_vocab:['excuse me','where','help','aisle','find','thank you'],
    target_grammar:['question_word_order','prepositions'],
    turns:[
      {ai:"Hello! Looking for something specific?", type:'description', vocab:['rice','milk','bread','looking'], minw:3},
      {ai:"It's in aisle three, on the left side.", type:'yes_no', vocab:['thank you','show me','OK'], minw:2},
      {ai:"Sure, I'll show you. Follow me.", type:'closing', vocab:['thank you'], minw:1},
      {ai:"Here it is. Anything else?", type:'yes_no', vocab:['no','thank you','that\'s all'], minw:2},
      {ai:"Have a wonderful day!", type:'closing', vocab:['you too','thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l1-greet-neighbor', personaSlug:'khalid-gym', level:'L1', difficulty:'easy',
    title_en:"Greet a neighbor", title_ar:"حيّي جار",
    setting_en:"You meet a neighbor in the apartment lobby for the first time.",
    goal_en:"Introduce yourself politely and start a short conversation.",
    target_vocab:['hello','nice to meet','name','from','apartment','live'],
    target_grammar:['present_simple','be_verb'],
    turns:[
      {ai:"Hi there, I don't think we've met. I'm Khalid.", type:'description', vocab:['hi','name','my'], minw:3},
      {ai:"Nice to meet you. Which apartment do you live in?", type:'description', vocab:['apartment','number','floor'], minw:2},
      {ai:"Oh, neighbors! How long have you been here?", type:'description', vocab:['month','year','recently'], minw:3},
      {ai:"Welcome! Let me know if you need anything.", type:'closing', vocab:['thank you','appreciate'], minw:2, terminal:true},
    ]
  },
  { slug:'l1-airport-checkin', personaSlug:'fahad-receptionist', level:'L1', difficulty:'easy',
    title_en:"Airport check-in", title_ar:"تسجيل دخول المطار",
    setting_en:"You're checking in for a domestic flight.",
    goal_en:"Hand over your passport, choose a seat, and check a bag.",
    target_vocab:['passport','flight','seat','bag','window','aisle'],
    target_grammar:['polite_requests','present_simple'],
    turns:[
      {ai:"Good morning. Passport and ticket, please.", type:'description', vocab:['here','passport'], minw:2},
      {ai:"Window or aisle seat?", type:'description', vocab:['window','aisle','please'], minw:2},
      {ai:"How many bags are you checking?", type:'description', vocab:['one','two','no'], minw:1},
      {ai:"Here's your boarding pass. Gate 12, boarding at 10 AM.", type:'yes_no', vocab:['thank you','clear'], minw:2},
      {ai:"Safe travels!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l1-introduce-friend', personaSlug:'sarah-barista', level:'L1', difficulty:'easy',
    title_en:"Introduce yourself to a friend's friend", title_ar:"قدّمي نفسكِ لصديقة صديقتكِ",
    setting_en:"You meet your friend's friend for the first time at a coffee shop.",
    goal_en:"Make a polite introduction and find common interests.",
    target_vocab:['hi','name','meet','work','study','live'],
    target_grammar:['present_simple','be_verb'],
    turns:[
      {ai:"Hi! I'm Sarah, your friend's coworker.", type:'description', vocab:['name','my','nice'], minw:3},
      {ai:"Nice to meet you too. What do you do?", type:'description', vocab:['work','study','at'], minw:3},
      {ai:"Cool! Do you live in Riyadh?", type:'yes_no', vocab:['yes','no','Jeddah','Riyadh'], minw:2},
      {ai:"We should get coffee sometime. Are you free this week?", type:'description', vocab:['free','yes','maybe','sounds good'], minw:3},
      {ai:"Great, I'll text you. Bye!", type:'closing', vocab:['bye','thank you','see you'], minw:2, terminal:true},
    ]
  },
  { slug:'l1-call-restaurant-reserve', personaSlug:'noor-waiter', level:'L1', difficulty:'easy',
    title_en:"Make a restaurant reservation by phone", title_ar:"احجزي طاولة في مطعم بالهاتف",
    setting_en:"You call a restaurant to book a table for dinner.",
    goal_en:"Book a table for a specific date, time, and number of people.",
    target_vocab:['reservation','table','people','tomorrow','tonight','time'],
    target_grammar:['polite_requests','time'],
    turns:[
      {ai:"Hello, thank you for calling. How can I help you?", type:'description', vocab:['reservation','table','please'], minw:3},
      {ai:"Sure. For how many people?", type:'description', vocab:['four','two','six','people'], minw:2},
      {ai:"And what time would you prefer?", type:'description', vocab:['eight','seven','PM'], minw:2},
      {ai:"Perfect. May I have your name?", type:'description', vocab:['name','my'], minw:2},
      {ai:"Thank you! Your table is booked. See you tomorrow!", type:'closing', vocab:['thank you','bye'], minw:2, terminal:true},
    ]
  },
  { slug:'l1-buy-train-ticket', personaSlug:'fahad-receptionist', level:'L1', difficulty:'easy',
    title_en:"Buy a train ticket", title_ar:"اشتري تذكرة قطار",
    setting_en:"At a train station ticket counter.",
    goal_en:"Buy a one-way ticket to a city and ask about departure time.",
    target_vocab:['ticket','one way','round trip','platform','time','please'],
    target_grammar:['question_word_order','prepositions'],
    turns:[
      {ai:"Hello, where to today?", type:'description', vocab:['to','Dammam','Jeddah'], minw:2},
      {ai:"One way or round trip?", type:'description', vocab:['one way','round','please'], minw:1},
      {ai:"OK. What time would you like to leave?", type:'description', vocab:['morning','afternoon','time','noon'], minw:2},
      {ai:"That's eighty riyals. Cash or card?", type:'description', vocab:['card','cash','please'], minw:1},
      {ai:"Platform 3, leaving at 12:30. Have a good trip!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l1-ask-for-time', personaSlug:'omar-taxi', level:'L1', difficulty:'easy',
    title_en:"Ask a stranger for the time", title_ar:"اسألي شخصاً عن الوقت",
    setting_en:"Your phone died and you need to know the time.",
    goal_en:"Politely ask a stranger and react to the answer.",
    target_vocab:['excuse me','time','thank you','clock','phone'],
    target_grammar:['polite_requests','question_word_order'],
    turns:[
      {ai:"Yes? Can I help you?", type:'description', vocab:['excuse me','time','please'], minw:3},
      {ai:"It's three thirty.", type:'description', vocab:['thank you','perfect','OK'], minw:1},
      {ai:"You're welcome. Have a nice day!", type:'closing', vocab:['you too','thank you'], minw:2, terminal:true},
    ]
  },

  // ───── L2 — 10 scenarios
  { slug:'l2-job-interview-warmup', personaSlug:'fahad-receptionist', level:'L2', difficulty:'medium',
    title_en:"Job interview warm-up questions", title_ar:"أسئلة بداية مقابلة عمل",
    setting_en:"You're at a job interview. The interviewer starts with friendly warm-up questions.",
    goal_en:"Talk about yourself professionally without being too formal.",
    target_vocab:['experience','interest','passionate','strength','team','manage'],
    target_grammar:['present_simple','present_perfect','adjectives'],
    turns:[
      {ai:"Welcome. Tell me a little about yourself.", type:'description', vocab:['name','study','work','experience'], minw:6},
      {ai:"Interesting. Why are you interested in this role?", type:'opinion', vocab:['passionate','interest','company','grow'], minw:5},
      {ai:"What would you say is your biggest strength?", type:'description', vocab:['team','communication','solve','organized'], minw:4},
      {ai:"Do you have any questions for me?", type:'open', vocab:['team','schedule','training','question'], minw:5},
      {ai:"Thank you for your time. We'll be in touch soon.", type:'closing', vocab:['thank you','appreciate'], minw:2, terminal:true},
    ]
  },
  { slug:'l2-doctor-mild-pain', personaSlug:'dr-lopez', level:'L2', difficulty:'medium',
    title_en:"Describe a mild ongoing pain", title_ar:"وصفي ألم خفيف مستمر",
    setting_en:"You visit a doctor for a mild but ongoing back pain.",
    goal_en:"Describe the pain's location, duration, and what makes it worse.",
    target_vocab:['back','pain','sharp','dull','sit','stand','hurt'],
    target_grammar:['present_continuous','since_for'],
    turns:[
      {ai:"Hello, what brings you in today?", type:'description', vocab:['back','pain','since'], minw:5},
      {ai:"OK. Where exactly is the pain?", type:'description', vocab:['lower','upper','left','right','back'], minw:4},
      {ai:"Is it sharp or dull?", type:'description', vocab:['sharp','dull','sometimes'], minw:3},
      {ai:"Does anything make it worse?", type:'description', vocab:['sit','long','stand','lift'], minw:4},
      {ai:"Let me prescribe gentle exercises. Come back in two weeks.", type:'yes_no', vocab:['thank you','OK','will'], minw:2},
      {ai:"Take care.", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l2-rent-apartment', personaSlug:'amira-hotel', level:'L2', difficulty:'medium',
    title_en:"Apartment hunting", title_ar:"البحث عن شقة",
    setting_en:"You're meeting with a real estate agent to see a rental apartment.",
    goal_en:"Ask about price, amenities, contract terms.",
    target_vocab:['rent','month','contract','furnished','utilities','parking'],
    target_grammar:['present_perfect','passive_simple','wh-questions'],
    turns:[
      {ai:"Welcome. This is a two-bedroom on the third floor.", type:'description', vocab:['nice','rent','month'], minw:4},
      {ai:"The rent is three thousand riyals. Are utilities included?", type:'yes_no', vocab:['yes','no','separate','included'], minw:3},
      {ai:"Yes — water and electricity included. Wifi is separate.", type:'description', vocab:['furnished','parking','near'], minw:4},
      {ai:"It's furnished. The contract is one year minimum. Interested?", type:'yes_no', vocab:['interested','think','please','time'], minw:3},
      {ai:"Take your time. Call me when you decide.", type:'closing', vocab:['thank you','will'], minw:2, terminal:true},
    ]
  },
  { slug:'l2-cancel-subscription', personaSlug:'fahad-receptionist', level:'L2', difficulty:'medium',
    title_en:"Cancel a subscription politely", title_ar:"إلغاء اشتراك بأدب",
    setting_en:"You're calling customer service to cancel a monthly subscription.",
    goal_en:"Cancel politely and request confirmation in writing.",
    target_vocab:['cancel','subscription','confirmation','email','effective','date'],
    target_grammar:['polite_requests','future_with_will'],
    turns:[
      {ai:"Hi, thank you for calling. How can I help?", type:'description', vocab:['cancel','subscription','please'], minw:4},
      {ai:"I see. May I ask the reason?", type:'description', vocab:['not using','expensive','don\'t need','found better'], minw:4},
      {ai:"I understand. Effective end of this month?", type:'yes_no', vocab:['yes','end','please'], minw:2},
      {ai:"Done. I'll send a confirmation email today.", type:'yes_no', vocab:['thank you','received','look'], minw:2},
      {ai:"Thank you for being our customer.", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l2-talk-about-weekend', personaSlug:'sarah-barista', level:'L2', difficulty:'medium',
    title_en:"Talk about your weekend", title_ar:"تكلّمي عن إجازة نهاية الأسبوع",
    setting_en:"You're catching up with a friend on Monday morning.",
    goal_en:"Describe your weekend in past tense with at least 3 activities.",
    target_vocab:['weekend','visit','watched','went','fun','tired'],
    target_grammar:['past_simple'],
    turns:[
      {ai:"Hey! How was your weekend?", type:'description', vocab:['nice','fun','quiet','tired'], minw:5},
      {ai:"Oh nice! What did you do on Saturday?", type:'description', vocab:['went','visited','watched','family'], minw:6},
      {ai:"And Sunday?", type:'description', vocab:['rested','stayed','went','helped'], minw:5},
      {ai:"Sounds good. Ready for the week?", type:'opinion', vocab:['yes','no','tired','ready'], minw:3},
      {ai:"Good luck this week!", type:'closing', vocab:['thank you','you too'], minw:2, terminal:true},
    ]
  },
  { slug:'l2-bookstore-recommendation', personaSlug:'lina-shopkeeper', level:'L2', difficulty:'medium',
    title_en:"Ask for a book recommendation", title_ar:"اسألي عن ترشيح كتاب",
    setting_en:"A small bookstore. You want a book in English but not too difficult.",
    goal_en:"Describe what you like and accept or politely decline suggestions.",
    target_vocab:['recommend','novel','story','easy','interesting','prefer'],
    target_grammar:['present_simple','adjectives'],
    turns:[
      {ai:"Hello! Looking for something to read?", type:'description', vocab:['novel','story','recommend'], minw:4},
      {ai:"What kind of story do you enjoy?", type:'description', vocab:['adventure','romance','mystery','history'], minw:4},
      {ai:"How is your English? Easy or challenging?", type:'description', vocab:['intermediate','easy','medium','challenging'], minw:3},
      {ai:"Try this one. Beautiful story, not too hard.", type:'yes_no', vocab:['take','sounds','nice','perfect'], minw:3},
      {ai:"Excellent choice. Enjoy reading!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l2-mall-directions', personaSlug:'khalid-gym', level:'L2', difficulty:'medium',
    title_en:"Give directions inside a mall", title_ar:"دلّي شخصاً داخل المول",
    setting_en:"A stranger asks you how to find a specific shop in the mall.",
    goal_en:"Give clear step-by-step directions using prepositions.",
    target_vocab:['next to','near','floor','escalator','straight','left','right'],
    target_grammar:['imperatives','prepositions_place'],
    turns:[
      {ai:"Excuse me, do you know where the perfume shop is?", type:'description', vocab:['second','floor','near'], minw:5},
      {ai:"OK, how do I get to the second floor?", type:'description', vocab:['escalator','elevator','straight','then'], minw:5},
      {ai:"And then?", type:'description', vocab:['turn','left','right','next to'], minw:4},
      {ai:"Got it, thank you so much!", type:'closing', vocab:['welcome','no problem'], minw:2, terminal:true},
    ]
  },
  { slug:'l2-feedback-restaurant', personaSlug:'noor-waiter', level:'L2', difficulty:'medium',
    title_en:"Give honest restaurant feedback", title_ar:"أعطي رأي صادق في مطعم",
    setting_en:"The waitress asks for feedback at the end of your meal.",
    goal_en:"Give honest feedback (good and improvement) politely.",
    target_vocab:['food','delicious','service','wait','slow','recommend'],
    target_grammar:['present_simple','comparatives','polite_criticism'],
    turns:[
      {ai:"How was everything tonight?", type:'description', vocab:['delicious','nice','good','enjoy'], minw:4},
      {ai:"I'm so glad. Was the service OK?", type:'description', vocab:['service','wait','slow','staff'], minw:5},
      {ai:"I'll pass that to the manager. Anything else?", type:'description', vocab:['lighting','music','temperature','seat'], minw:4},
      {ai:"Thank you for the honest feedback. Hope to see you again!", type:'closing', vocab:['thank you','will'], minw:2, terminal:true},
    ]
  },
  { slug:'l2-bank-account', personaSlug:'fahad-receptionist', level:'L2', difficulty:'medium',
    title_en:"Open a bank account", title_ar:"افتحي حساب بنكي",
    setting_en:"You're at a bank to open a basic checking account.",
    goal_en:"Provide documents, choose account type, ask about fees.",
    target_vocab:['account','checking','savings','ID','deposit','fees'],
    target_grammar:['polite_requests','present_simple','question_word_order'],
    turns:[
      {ai:"Hello. How can I help you today?", type:'description', vocab:['open','account','please'], minw:4},
      {ai:"Sure. Checking or savings?", type:'description', vocab:['checking','savings','both'], minw:2},
      {ai:"Great. May I see your ID and proof of address?", type:'yes_no', vocab:['yes','here','of course'], minw:2},
      {ai:"There's a small monthly fee — is that OK?", type:'yes_no', vocab:['yes','no','how much','fine'], minw:3},
      {ai:"Done. Your card will arrive in 5 days.", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l2-talk-about-hobby', personaSlug:'khalid-gym', level:'L2', difficulty:'medium',
    title_en:"Talk about your hobby", title_ar:"تكلّمي عن هوايتكِ",
    setting_en:"A friend asks about your favorite hobby.",
    goal_en:"Explain what you do, how often, and why you enjoy it.",
    target_vocab:['hobby','enjoy','since','every','because','relax'],
    target_grammar:['present_simple','adverbs_of_frequency'],
    turns:[
      {ai:"What do you do in your free time?", type:'description', vocab:['read','draw','paint','exercise','cook'], minw:5},
      {ai:"How often do you do it?", type:'description', vocab:['every','sometimes','usually','weekend','daily'], minw:4},
      {ai:"And how did you start?", type:'description', vocab:['since','started','child','school','friend'], minw:5},
      {ai:"Why do you enjoy it?", type:'opinion', vocab:['relax','fun','learn','creative','because'], minw:5},
      {ai:"That sounds wonderful. Keep going!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },

  // ───── L3 (additional) — 6 scenarios
  { slug:'l3-complain-product', personaSlug:'fahad-receptionist', level:'L3', difficulty:'challenging',
    title_en:"Complain about a defective product", title_ar:"اشتكي من منتج معيب",
    setting_en:"You call customer service about a defective product within warranty.",
    goal_en:"Explain the problem, ask for a replacement or refund, and stay polite.",
    target_vocab:['defective','warranty','replacement','refund','frustrated','option'],
    target_grammar:['present_perfect','passive','polite_complaint'],
    turns:[
      {ai:"Customer service, how can I help?", type:'description', vocab:['bought','defective','warranty','please'], minw:6},
      {ai:"I'm sorry to hear that. When did you buy it?", type:'description', vocab:['weeks','month','receipt','have'], minw:4},
      {ai:"And what exactly is wrong with it?", type:'description', vocab:['stopped','noise','broken','working'], minw:6},
      {ai:"OK. Would you prefer a replacement or refund?", type:'description', vocab:['refund','replacement','option','prefer'], minw:4},
      {ai:"Done. You'll receive confirmation via email today.", type:'yes_no', vocab:['thank you','appreciate'], minw:2},
      {ai:"Sorry for the inconvenience. Have a great day!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l3-disagree-politely', personaSlug:'sarah-barista', level:'L3', difficulty:'challenging',
    title_en:"Disagree politely with a friend", title_ar:"اختلفي بأدب مع صديقة",
    setting_en:"A friend gives an opinion you disagree with about online learning.",
    goal_en:"Disagree respectfully and explain your reasons.",
    target_vocab:['agree','disagree','however','reason','actually','perspective'],
    target_grammar:['linkers','opinion_phrases'],
    turns:[
      {ai:"I really think online learning is much better than classroom learning.", type:'opinion', vocab:['agree','disagree','however','depends'], minw:5},
      {ai:"Why? It's flexible and saves time.", type:'opinion', vocab:['discipline','distraction','interaction','focus'], minw:6},
      {ai:"That's a fair point. So a mix of both?", type:'description', vocab:['mix','both','best','depends','some'], minw:5},
      {ai:"Interesting perspective. I'll think about it.", type:'closing', vocab:['thank you','same','interesting'], minw:2, terminal:true},
    ]
  },
  { slug:'l3-job-decline-offer', personaSlug:'fahad-receptionist', level:'L3', difficulty:'challenging',
    title_en:"Decline a job offer politely", title_ar:"ارفضي عرض عمل بأدب",
    setting_en:"You received a job offer but decided not to take it.",
    goal_en:"Decline politely and keep the door open for the future.",
    target_vocab:['offer','appreciate','consideration','opportunity','decision','future'],
    target_grammar:['polite_phrases','present_perfect'],
    turns:[
      {ai:"Hello, calling to follow up on the offer we sent.", type:'description', vocab:['received','consideration','thank you'], minw:5},
      {ai:"And what's your decision?", type:'description', vocab:['decided','offer','difficult','decline'], minw:5},
      {ai:"I understand. Anything we could have done differently?", type:'description', vocab:['salary','location','match','timing'], minw:5},
      {ai:"Thank you for your honesty. Best wishes!", type:'closing', vocab:['thank you','best','wishes','too'], minw:3, terminal:true},
    ]
  },
  { slug:'l3-describe-vacation', personaSlug:'omar-taxi', level:'L3', difficulty:'challenging',
    title_en:"Describe a memorable vacation", title_ar:"وصفي إجازة لا تُنسى",
    setting_en:"Your taxi driver asks about your recent travels.",
    goal_en:"Narrate your trip with concrete details and feelings.",
    target_vocab:['traveled','beach','mountain','culture','food','unforgettable'],
    target_grammar:['past_simple','past_continuous','adjectives'],
    turns:[
      {ai:"So, been anywhere interesting lately?", type:'description', vocab:['went','traveled','two months','Türkiye'], minw:6},
      {ai:"Wow, what was your favorite part?", type:'description', vocab:['food','people','beach','culture','beautiful'], minw:6},
      {ai:"Any funny or strange moment?", type:'description', vocab:['lost','asked','laughed','met','language'], minw:6},
      {ai:"Would you go back?", type:'yes_no', vocab:['yes','definitely','again','recommend','no'], minw:3},
      {ai:"Sounds like an unforgettable trip!", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l3-give-presentation-feedback', personaSlug:'amira-hotel', level:'L3', difficulty:'challenging',
    title_en:"Give honest presentation feedback", title_ar:"أعطي رأي صادق في عرض",
    setting_en:"A colleague asks for your honest feedback after their presentation.",
    goal_en:"Give specific positive feedback and one improvement area.",
    target_vocab:['clear','organized','confident','suggest','consider','overall'],
    target_grammar:['adjectives','suggestion_phrases'],
    turns:[
      {ai:"What did you think? Be honest please.", type:'description', vocab:['clear','organized','confident','interesting'], minw:5},
      {ai:"Thanks. Was there anything I could improve?", type:'description', vocab:['suggest','consider','slower','more','example'], minw:6},
      {ai:"Good point. Anything else?", type:'description', vocab:['eye contact','question','slides','color'], minw:4},
      {ai:"Really appreciate the honest feedback.", type:'closing', vocab:['anytime','welcome','great'], minw:2, terminal:true},
    ]
  },
  { slug:'l3-bargain-souk', personaSlug:'lina-shopkeeper', level:'L3', difficulty:'challenging',
    title_en:"Bargain at a traditional souk", title_ar:"اشتري بسعر مخفّض في السوق",
    setting_en:"You're at a traditional market and want to negotiate the price.",
    goal_en:"Bargain respectfully and reach a fair price.",
    target_vocab:['expensive','discount','price','fair','final','deal'],
    target_grammar:['comparatives','polite_negotiation','conditionals'],
    turns:[
      {ai:"This piece is two hundred riyals.", type:'opinion', vocab:['expensive','too much','discount','better'], minw:5},
      {ai:"OK, I can do 180. Final price.", type:'description', vocab:['still','high','accept','150','consider'], minw:5},
      {ai:"Hmm, 160 then. Best I can do.", type:'yes_no', vocab:['deal','take','agree','too','expensive'], minw:3},
      {ai:"Great choice. Here's your bag.", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },

  // ───── L4 — 14 scenarios
  { slug:'l4-business-meeting-intro', personaSlug:'fahad-receptionist', level:'L4', difficulty:'challenging',
    title_en:"Lead a business meeting introduction", title_ar:"قيادة افتتاح اجتماع عمل",
    setting_en:"You're leading the introduction of a quarterly business meeting.",
    goal_en:"Welcome attendees, set the agenda, manage time expectations.",
    target_vocab:['agenda','quarterly','review','target','update','progress'],
    target_grammar:['present_simple','future_simple','linkers'],
    turns:[
      {ai:"Everyone is here. Should we start?", type:'description', vocab:['welcome','everyone','start','agenda'], minw:6},
      {ai:"Sure. What\'s on the agenda today?", type:'description', vocab:['quarterly','review','update','target','three'], minw:7},
      {ai:"How long will the meeting take?", type:'description', vocab:['hour','minutes','around','approximately'], minw:4},
      {ai:"Great. Let me know when to start.", type:'closing', vocab:['thank you','begin'], minw:2, terminal:true},
    ]
  },
  { slug:'l4-resolve-team-conflict', personaSlug:'amira-hotel', level:'L4', difficulty:'challenging',
    title_en:"Resolve a team conflict", title_ar:"حلّ خلاف فريق",
    setting_en:"Two team members disagree on approach. You're mediating.",
    goal_en:"Listen, summarize each side, propose a compromise.",
    target_vocab:['perspective','agreement','compromise','listen','suggest','common'],
    target_grammar:['conditional','polite_phrases','present_perfect'],
    turns:[
      {ai:"OK, let me share my side first.", type:'description', vocab:['listen','understand','perspective','agree'], minw:6},
      {ai:"And then I disagree because of X.", type:'description', vocab:['point','valid','both','consider'], minw:6},
      {ai:"How do we move forward then?", type:'description', vocab:['compromise','suggest','common','timeline','try'], minw:7},
      {ai:"That sounds reasonable.", type:'closing', vocab:['thank you','agreement','move'], minw:3, terminal:true},
    ]
  },
  { slug:'l4-deliver-bad-news-client', personaSlug:'fahad-receptionist', level:'L4', difficulty:'challenging',
    title_en:"Deliver bad news to a client professionally", title_ar:"إخبار العميل بأخبار سيئة بمهنية",
    setting_en:"You need to tell a client that their project is delayed.",
    goal_en:"Be honest, explain reasons, offer next steps.",
    target_vocab:['unfortunately','delay','reason','update','solution','soon'],
    target_grammar:['present_perfect','future_simple','passive'],
    turns:[
      {ai:"Hi, thanks for calling. What's the update?", type:'description', vocab:['unfortunately','delay','share','update'], minw:6},
      {ai:"Oh no. Why?", type:'description', vocab:['supplier','timing','technical','challenge','because'], minw:6},
      {ai:"How long?", type:'description', vocab:['two weeks','additional','expected','around'], minw:4},
      {ai:"What's your plan to fix this?", type:'description', vocab:['solution','priority','team','update','progress'], minw:6},
      {ai:"I appreciate the honesty. Keep me posted.", type:'closing', vocab:['will','update','soon','thank you'], minw:3, terminal:true},
    ]
  },
  { slug:'l4-negotiate-salary', personaSlug:'fahad-receptionist', level:'L4', difficulty:'challenging',
    title_en:"Negotiate a salary offer", title_ar:"التفاوض على راتب",
    setting_en:"A job offer came lower than your expectation. You're negotiating.",
    goal_en:"Counter-offer professionally with justification.",
    target_vocab:['offer','salary','experience','market','flexible','reconsider'],
    target_grammar:['conditional','polite_phrases','comparatives'],
    turns:[
      {ai:"What did you think of our offer?", type:'description', vocab:['appreciate','consideration','salary','expected'], minw:6},
      {ai:"What number did you have in mind?", type:'description', vocab:['based','experience','market','range'], minw:6},
      {ai:"That's higher than budget. Could we meet in the middle?", type:'description', vocab:['flexible','consider','additional','benefits'], minw:6},
      {ai:"OK, we can do that. Anything else important?", type:'description', vocab:['vacation','flexible','remote','training'], minw:5},
      {ai:"Great, I'll send the updated offer today.", type:'closing', vocab:['thank you','appreciate'], minw:2, terminal:true},
    ]
  },
  { slug:'l4-doctor-second-opinion', personaSlug:'dr-lopez', level:'L4', difficulty:'challenging',
    title_en:"Ask for a second medical opinion", title_ar:"اطلبي رأي طبي ثاني",
    setting_en:"You want a second opinion on a diagnosis from another doctor.",
    goal_en:"Politely explain previous diagnosis and ask for review.",
    target_vocab:['second opinion','diagnosis','tests','results','treatment','options'],
    target_grammar:['present_perfect','past_simple','passive'],
    turns:[
      {ai:"How can I help you today?", type:'description', vocab:['second','opinion','diagnosed','previously'], minw:6},
      {ai:"Tell me what you were told.", type:'description', vocab:['told','condition','tests','medication','said'], minw:7},
      {ai:"OK. Did you bring the test results?", type:'yes_no', vocab:['yes','here','brought'], minw:2},
      {ai:"Let me review these carefully. We'll discuss treatment next week.", type:'yes_no', vocab:['thank you','appreciate','OK'], minw:2},
      {ai:"In the meantime, continue your current medication.", type:'closing', vocab:['will','thank you'], minw:2, terminal:true},
    ]
  },
  { slug:'l4-give-toast-wedding', personaSlug:'sarah-barista', level:'L4', difficulty:'challenging',
    title_en:"Give a short wedding toast", title_ar:"إلقاء كلمة قصيرة في حفل زواج",
    setting_en:"You're giving a brief toast at a friend's wedding.",
    goal_en:"Speak warmly about the couple in 60 seconds.",
    target_vocab:['honor','wishes','wonderful','journey','laughter','toast'],
    target_grammar:['present_simple','complex_sentences'],
    turns:[
      {ai:"And next, our friend has a few words.", type:'description', vocab:['honor','privilege','stand','speak'], minw:6},
      {ai:"How did you meet them?", type:'description', vocab:['met','years','college','work','since'], minw:6},
      {ai:"What do you wish for them?", type:'description', vocab:['happiness','laughter','journey','wonderful'], minw:7},
      {ai:"Beautiful words. To the couple!", type:'closing', vocab:['cheers','to','couple','best'], minw:3, terminal:true},
    ]
  },
  { slug:'l4-tech-support-explain', personaSlug:'fahad-receptionist', level:'L4', difficulty:'challenging',
    title_en:"Explain a technical issue to support", title_ar:"شرح مشكلة تقنية للدعم",
    setting_en:"You call tech support about a complex software issue.",
    goal_en:"Describe the issue clearly, what you've tried, and what's blocking you.",
    target_vocab:['error','occurs','restart','update','tried','workaround'],
    target_grammar:['present_perfect','past_continuous'],
    turns:[
      {ai:"What can I help you with today?", type:'description', vocab:['error','message','software','occurs','when'], minw:7},
      {ai:"When did it start?", type:'description', vocab:['yesterday','update','installed','noticed','after'], minw:5},
      {ai:"Have you tried restarting?", type:'description', vocab:['yes','tried','restarted','reinstalled','cleared'], minw:5},
      {ai:"Let me check our system. Hold for a moment.", type:'yes_no', vocab:['OK','sure','wait','thank you'], minw:2},
      {ai:"Try this fix and call us back if it persists.", type:'closing', vocab:['thank you','try','will'], minw:3, terminal:true},
    ]
  },
  { slug:'l4-academic-discussion', personaSlug:'fahad-receptionist', level:'L4', difficulty:'challenging',
    title_en:"Academic discussion: pros & cons", title_ar:"نقاش أكاديمي: إيجابيات وسلبيات",
    setting_en:"In a class discussion about remote work pros and cons.",
    goal_en:"Present both sides and your final position with reasons.",
    target_vocab:['advantage','disadvantage','productivity','isolation','flexibility','balance'],
    target_grammar:['linkers','opinion','present_simple'],
    turns:[
      {ai:"What\'s your take on remote work?", type:'opinion', vocab:['mixed','depends','some','advantage','disadvantage'], minw:7},
      {ai:"What are the main advantages?", type:'description', vocab:['flexibility','commute','focus','balance','productivity'], minw:6},
      {ai:"And the disadvantages?", type:'description', vocab:['isolation','distract','team','collaborate','culture'], minw:6},
      {ai:"So what's your overall position?", type:'opinion', vocab:['hybrid','best','depends','role','individual'], minw:6},
      {ai:"Thoughtful answer. Thank you.", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },

  // ───── L5 — 10 scenarios
  { slug:'l5-academic-presentation', personaSlug:'fahad-receptionist', level:'L5', difficulty:'challenging',
    title_en:"Defend a thesis position", title_ar:"الدفاع عن أطروحة",
    setting_en:"You're defending your thesis in an academic Q&A.",
    goal_en:"Respond to a critical question with structured argument.",
    target_vocab:['methodology','sample','limitation','further','rigorous','findings'],
    target_grammar:['passive','complex_sentences','academic_register'],
    turns:[
      {ai:"How would you defend your methodology?", type:'opinion', vocab:['rigorous','validated','sample','approach','based'], minw:8},
      {ai:"What about the small sample size?", type:'description', vocab:['limitation','acknowledge','future','further','exploratory'], minw:7},
      {ai:"And how do your findings apply broadly?", type:'opinion', vocab:['generalize','cautious','contextual','similar','further research'], minw:8},
      {ai:"A solid answer. Thank you for your work.", type:'closing', vocab:['thank you','committee'], minw:2, terminal:true},
    ]
  },
  { slug:'l5-mentor-advice', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Seek mentor advice on career pivot", title_ar:"اطلبي نصيحة مرشد عن تحوّل مهني",
    setting_en:"You're meeting your mentor to discuss a major career change.",
    goal_en:"Articulate the dilemma clearly and weigh options thoughtfully.",
    target_vocab:['considering','transition','passionate','risk','stability','reward'],
    target_grammar:['conditionals','modals','present_perfect'],
    turns:[
      {ai:"What's on your mind?", type:'opinion', vocab:['considering','transition','field','current','passionate'], minw:8},
      {ai:"What\'s pulling you toward this?", type:'opinion', vocab:['meaningful','growth','aligned','values','energy'], minw:7},
      {ai:"And what\'s holding you back?", type:'description', vocab:['risk','stability','financial','uncertain','timing'], minw:7},
      {ai:"How would you mitigate the risk?", type:'description', vocab:['savings','transition','part-time','test','plan'], minw:7},
      {ai:"That\'s a thoughtful plan. Trust yourself.", type:'closing', vocab:['thank you','appreciate'], minw:2, terminal:true},
    ]
  },
  { slug:'l5-investor-pitch', personaSlug:'fahad-receptionist', level:'L5', difficulty:'challenging',
    title_en:"Pitch a business idea to an investor", title_ar:"عرض فكرة عمل لمستثمر",
    setting_en:"You have 5 minutes to pitch your startup to a potential investor.",
    goal_en:"Cover problem, solution, market, traction, ask.",
    target_vocab:['problem','solution','market','revenue','traction','seeking'],
    target_grammar:['present_simple','passive','numbers'],
    turns:[
      {ai:"You have 5 minutes. Go.", type:'description', vocab:['solving','problem','market','solution','team'], minw:9},
      {ai:"What\'s your current traction?", type:'description', vocab:['users','revenue','growing','monthly','retention'], minw:7},
      {ai:"What\'s your ask?", type:'description', vocab:['seeking','million','invest','hire','expand'], minw:6},
      {ai:"How will you use the funds?", type:'description', vocab:['product','team','marketing','geographic','primarily'], minw:7},
      {ai:"Interesting. We\'ll discuss internally and get back.", type:'closing', vocab:['thank you','appreciate','time'], minw:3, terminal:true},
    ]
  },
  { slug:'l5-difficult-feedback', personaSlug:'amira-hotel', level:'L5', difficulty:'challenging',
    title_en:"Deliver difficult feedback to a team member", title_ar:"إعطاء ملاحظات صعبة لعضو فريق",
    setting_en:"You need to tell a team member their work is below standard.",
    goal_en:"Be honest, specific, and supportive — not harsh.",
    target_vocab:['concerned','specific','improvement','support','expectations','realistic'],
    target_grammar:['conditionals','passive','modals'],
    turns:[
      {ai:"You wanted to talk?", type:'description', vocab:['feedback','concerned','quality','last','project'], minw:7},
      {ai:"Specifically what?", type:'description', vocab:['delays','errors','missed','expectations','communication'], minw:6},
      {ai:"How can I improve?", type:'description', vocab:['support','plan','clear','tasks','check-in'], minw:6},
      {ai:"OK. I want to fix this.", type:'closing', vocab:['appreciate','together','support','progress'], minw:4, terminal:true},
    ]
  },
  { slug:'l5-debate-ethics', personaSlug:'fahad-receptionist', level:'L5', difficulty:'challenging',
    title_en:"Debate an ethical dilemma", title_ar:"مناقشة معضلة أخلاقية",
    setting_en:"A class debate about a complex ethical scenario.",
    goal_en:"Present a principled position with counterargument awareness.",
    target_vocab:['principle','dilemma','utilitarian','consequence','intent','justify'],
    target_grammar:['conditionals','linkers','complex_sentences'],
    turns:[
      {ai:"What\'s your position?", type:'opinion', vocab:['believe','position','principle','complex','depends'], minw:8},
      {ai:"What\'s your strongest argument?", type:'opinion', vocab:['consequence','harm','justify','intent','outweigh'], minw:8},
      {ai:"How do you respond to the counterargument?", type:'opinion', vocab:['valid','acknowledge','however','principle','context'], minw:8},
      {ai:"A nuanced position. Thank you.", type:'closing', vocab:['thank you'], minw:1, terminal:true},
    ]
  },
  { slug:'l5-conference-network', personaSlug:'sarah-barista', level:'L5', difficulty:'challenging',
    title_en:"Network at a professional conference", title_ar:"التواصل في مؤتمر مهني",
    setting_en:"You\'re at a conference networking session. Strike up meaningful conversation.",
    goal_en:"Build genuine professional connection without being transactional.",
    target_vocab:['working','project','interesting','perspective','connect','collaborate'],
    target_grammar:['present_continuous','present_perfect','wh-questions'],
    turns:[
      {ai:"Hi. What brings you to this conference?", type:'description', vocab:['working','interested','learn','perspective','field'], minw:7},
      {ai:"Sounds interesting. What\'s the biggest challenge in your work?", type:'description', vocab:['challenge','complex','data','people','time'], minw:7},
      {ai:"How are you addressing it?", type:'description', vocab:['testing','collaborating','learning','iterating','team'], minw:7},
      {ai:"We should keep in touch. What\'s the best way?", type:'description', vocab:['LinkedIn','email','exchange','contact','later'], minw:5},
      {ai:"Great talking with you!", type:'closing', vocab:['thank you','too','enjoyed'], minw:2, terminal:true},
    ]
  },
  { slug:'l5-coaching-question', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Coach someone through a problem", title_ar:"قودي شخصاً عبر مشكلة",
    setting_en:"A junior colleague is stuck on a problem. You\'re coaching them.",
    goal_en:"Ask questions that help them think — don\'t give direct answers.",
    target_vocab:['challenge','options','tried','consider','perspective','clarify'],
    target_grammar:['questions','present_perfect','conditionals'],
    turns:[
      {ai:"I\'m stuck on this problem.", type:'description', vocab:['walk me through','specifically','challenge','where'], minw:6},
      {ai:"OK, here\'s what\'s happening.", type:'description', vocab:['tried','options','considered','perspective','what'], minw:6},
      {ai:"I don\'t know what else to try.", type:'description', vocab:['if','assume','different','reverse','what would'], minw:6},
      {ai:"Hmm, that\'s a new angle.", type:'closing', vocab:['glad','find','let me know'], minw:3, terminal:true},
    ]
  },
]

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  for (const ref of targets) {
    console.log(`\n========================== TARGET: ${ref} ==========================`)

    // Load persona id map
    const personas = await call(token, ref, 'SELECT id, slug FROM retention_personas')
    const personaMap = {}
    for (const p of personas) personaMap[p.slug] = p.id

    let scInserted = 0, turnsInserted = 0, scSkipped = 0
    for (const sc of SCENARIOS) {
      const personaId = personaMap[sc.personaSlug]
      if (!personaId) { console.error(`  no persona ${sc.personaSlug}`); continue }

      // Insert scenario
      const scSql = `INSERT INTO retention_scenarios (slug, persona_id, title_en, title_ar, setting_en, goal_en, difficulty, target_level, estimated_minutes, target_vocab, target_grammar, active)
        VALUES (${esc(sc.slug)}, '${personaId}', ${esc(sc.title_en)}, ${esc(sc.title_ar)}, ${esc(sc.setting_en)}, ${esc(sc.goal_en)}, '${sc.difficulty}', '${sc.level}', 6, ${arrText(sc.target_vocab)}, ${arrText(sc.target_grammar)}, true)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id`
      let scenarioId
      try {
        const r = await call(token, ref, scSql)
        if (Array.isArray(r) && r.length > 0) {
          scenarioId = r[0].id
          scInserted++
        } else {
          // Already exists
          const fetch = await call(token, ref, `SELECT id FROM retention_scenarios WHERE slug = ${esc(sc.slug)} LIMIT 1`)
          scenarioId = fetch[0]?.id
          scSkipped++
        }
      } catch (e) {
        console.error(`  scenario ${sc.slug} failed: ${e.message.slice(0,200)}`)
        continue
      }
      if (!scenarioId) continue

      // Check if turns already exist
      const tCount = await call(token, ref, `SELECT count(*) AS c FROM retention_dialogue_turns WHERE scenario_id = '${scenarioId}'`)
      if (tCount[0].c >= sc.turns.length) continue

      // Insert turns
      for (let i = 0; i < sc.turns.length; i++) {
        const t = sc.turns[i]
        const sql = `INSERT INTO retention_dialogue_turns
          (scenario_id, turn_number, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal)
          VALUES ('${scenarioId}', ${i + 1}, ${esc(t.ai)}, '${t.type}', ${arrText(t.vocab)}, ${t.minw||3}, ${t.terminal?'true':'false'})`
        try {
          await call(token, ref, sql); turnsInserted++
        } catch (e) {
          console.error(`  turn ${i+1} of ${sc.slug} failed: ${e.message.slice(0,200)}`)
        }
      }
    }
    console.log(`\n[${ref}] scenarios: +${scInserted} inserted, ${scSkipped} skipped`)
    console.log(`[${ref}] turns: +${turnsInserted} inserted`)
    const sum = await call(token, ref, 'SELECT count(*) AS s FROM retention_scenarios, (SELECT count(*) AS t FROM retention_dialogue_turns) tt GROUP BY tt.t')
    console.log(`[${ref}] totals — see counts:`, sum)
  }
})()
