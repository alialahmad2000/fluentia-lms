#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 Block 4 — additive scenarios generator (v2).
// Adds new scenarios across all 5 levels, idempotent against existing slugs.
// 40 hand-crafted scenarios with 6-9 linear turns each (total ~280 new turns).
//
// Quality bar per FINISH-100 §3 Block 4:
// - Specific setting (sensory details — time of day, location, sound)
// - Winnable goal
// - Persona consistency (each uses one of 8 existing personas with matching voice/register)
// - Target vocab pulled from realistic L1-L5 vocabulary

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

// Persona slugs in prod (8): sarah-barista, khalid-gym, dr-lopez, amira-friend,
// noor-waiter, fahad-receptionist, lina-shopkeeper, omar-coworker

const SCENARIOS = [
  // ───── L1 — 10 new scenarios (basic everyday situations)
  { slug:'l1-bus-driver-route', personaSlug:'fahad-receptionist', level:'L1', difficulty:'easy',
    title_en:"Ask the bus driver about a route", title_ar:"اسألي السائق عن المسار",
    setting_en:"Morning rush hour in Riyadh. You boarded the wrong bus and need to confirm which way it's going.",
    goal_en:"Confirm the destination and get off safely if needed.",
    target_vocab:['excuse me','bus','stop','where','get off','sorry'],
    target_grammar:['question_word_order','present_simple'],
    turns:[
      {ai:"Good morning! Welcome aboard. Where are you going?", type:'description', vocab:['going to','please','help'], minw:3},
      {ai:"Hmm, this bus doesn't go directly there. You'll need to change at Olaya Stop.", type:'yes_no', vocab:['change','where','OK','thank'], minw:3},
      {ai:"Sure. I'll tell you when we reach it. Just wait calmly.", type:'closing', vocab:['thank you','appreciate'], minw:2},
      {ai:"Here we are — Olaya Stop. Take bus 24 from across the street.", type:'yes_no', vocab:['thank you','perfect','clear'], minw:2},
      {ai:"You're welcome. Have a safe day!", type:'closing', vocab:['you too','bye'], minw:1, terminal:true},
    ]},
  { slug:'l1-buy-prepaid-sim', personaSlug:'lina-shopkeeper', level:'L1', difficulty:'easy',
    title_en:"Buy a prepaid SIM card", title_ar:"اشتري شريحة جوال مسبقة الدفع",
    setting_en:"You walk into a phone shop on a Saturday afternoon. The shop smells of new electronics.",
    goal_en:"Pick a plan with enough data, hand over your ID, and activate the SIM.",
    target_vocab:['SIM card','data','plan','month','ID','activate'],
    target_grammar:['present_simple','quantity_questions'],
    turns:[
      {ai:"Hello! Looking for a SIM card today?", type:'description', vocab:['yes','need','SIM'], minw:2},
      {ai:"Sure. How much data do you need per month?", type:'description', vocab:['GB','data','calls','enough'], minw:3},
      {ai:"OK. That plan is 100 riyals. Do you have your ID with you?", type:'yes_no', vocab:['yes','here','ID','passport'], minw:2},
      {ai:"Perfect. I'll activate it now. Give me two minutes.", type:'closing', vocab:['OK','thank you','wait'], minw:2},
      {ai:"All done! Your new number is on this paper. Save it.", type:'closing', vocab:['thank you','great','perfect'], minw:2, terminal:true},
    ]},
  { slug:'l1-laundry-pickup', personaSlug:'noor-waiter', level:'L1', difficulty:'easy',
    title_en:"Pick up clothes from the laundry", title_ar:"استلمي ملابسكِ من المغسلة",
    setting_en:"A small laundry shop. You handed in clothes three days ago and came to pick them up.",
    goal_en:"Give your ticket number, check the clothes, and pay.",
    target_vocab:['ticket','clothes','pick up','ready','pay','here you go'],
    target_grammar:['present_simple','polite_requests'],
    turns:[
      {ai:"Hello, ticket please?", type:'description', vocab:['here','ticket','number'], minw:2},
      {ai:"Let me check. Ah yes — three pieces. Hang on.", type:'closing', vocab:['OK','wait','thank you'], minw:1},
      {ai:"Here you go. Please check them before you leave.", type:'description', vocab:['check','all','good','perfect'], minw:2},
      {ai:"Great. That'll be 45 riyals.", type:'yes_no', vocab:['here','pay','thank you'], minw:2},
      {ai:"Thanks! See you next time.", type:'closing', vocab:['bye','thank you'], minw:1, terminal:true},
    ]},
  { slug:'l1-ask-time-stranger', personaSlug:'sarah-barista', level:'L1', difficulty:'easy',
    title_en:"Ask a stranger for the time", title_ar:"اسألي شخص غريب عن الوقت",
    setting_en:"Outside a mall in the late afternoon. Your phone died. You stop a friendly-looking person.",
    goal_en:"Politely ask for the time and thank them.",
    target_vocab:['excuse me','time','phone','died','thank you'],
    target_grammar:['polite_requests','question_word_order'],
    turns:[
      {ai:"Excuse me? Are you talking to me?", type:'description', vocab:['yes','sorry','time','please'], minw:3},
      {ai:"Sure! It's 5:30. Your phone died?", type:'yes_no', vocab:['yes','died','battery','thank'], minw:3},
      {ai:"That happens. Need to charge somewhere?", type:'yes_no', vocab:['no','fine','thank you','OK'], minw:2},
      {ai:"No problem. Have a good evening.", type:'closing', vocab:['you too','thank you','bye'], minw:2, terminal:true},
    ]},
  { slug:'l1-call-plumber-leak', personaSlug:'fahad-receptionist', level:'L1', difficulty:'easy',
    title_en:"Call a plumber about a leak", title_ar:"اتصلي بسبّاك بسبب تسرّب",
    setting_en:"There's water dripping under your kitchen sink. You call the plumber's number on a magnet.",
    goal_en:"Describe the problem and arrange a visit.",
    target_vocab:['leak','sink','water','today','address','tomorrow'],
    target_grammar:['present_continuous','time'],
    turns:[
      {ai:"Hello, this is Fahad's plumbing. How can I help?", type:'description', vocab:['water','kitchen','sink','leak'], minw:4},
      {ai:"OK. Is it a small drip or flowing?", type:'description', vocab:['small','drip','slow','little'], minw:3},
      {ai:"Got it. Can someone come tomorrow at 10 AM?", type:'yes_no', vocab:['yes','OK','perfect','tomorrow'], minw:2},
      {ai:"Great. What's your address?", type:'description', vocab:['street','number','district'], minw:3},
      {ai:"See you tomorrow morning. Thanks for calling!", type:'closing', vocab:['thank you','bye'], minw:2, terminal:true},
    ]},
  { slug:'l1-dentist-appointment', personaSlug:'noor-waiter', level:'L1', difficulty:'easy',
    title_en:"Book a dentist appointment", title_ar:"احجزي موعد عند طبيب الأسنان",
    setting_en:"You call the dental clinic — it's a quiet morning. You have a small toothache.",
    goal_en:"Describe the pain and book the earliest available slot.",
    target_vocab:['tooth','pain','appointment','soon','available','tomorrow'],
    target_grammar:['present_simple','time'],
    turns:[
      {ai:"Hello, Riyadh Dental Center. May I help?", type:'description', vocab:['tooth','hurts','appointment','please'], minw:4},
      {ai:"Sorry to hear. When did it start hurting?", type:'description', vocab:['yesterday','last night','two days'], minw:3},
      {ai:"We have a slot tomorrow at 2 PM. Does that work?", type:'yes_no', vocab:['yes','OK','perfect','time'], minw:2},
      {ai:"Great. Please bring your insurance card.", type:'closing', vocab:['OK','thank you','remember'], minw:2, terminal:true},
    ]},
  { slug:'l1-rent-car-pickup', personaSlug:'fahad-receptionist', level:'L1', difficulty:'easy',
    title_en:"Pick up a rental car", title_ar:"استلمي سيارة من تأجير السيارات",
    setting_en:"At a rental car counter at the airport. You're tired from your flight.",
    goal_en:"Show your driver's license, sign the contract, and get the keys.",
    target_vocab:['rent','car','license','keys','parking','floor'],
    target_grammar:['polite_requests','present_simple'],
    turns:[
      {ai:"Welcome! Reservation under your name?", type:'description', vocab:['yes','name','reservation','here'], minw:2},
      {ai:"Found it. Driver's license, please?", type:'description', vocab:['here','license','passport'], minw:1},
      {ai:"Initial here, sign at the bottom. Insurance with or without?", type:'yes_no', vocab:['with','insurance','please','yes'], minw:2},
      {ai:"Your car is on parking floor 2, spot B14. Here are the keys.", type:'closing', vocab:['thank you','clear','perfect'], minw:2, terminal:true},
    ]},
  { slug:'l1-return-purchase', personaSlug:'lina-shopkeeper', level:'L1', difficulty:'easy',
    title_en:"Return a wrong-size shirt", title_ar:"ارجعي قميص بمقاس غلط",
    setting_en:"A clothing store. You bought a shirt yesterday but it's too small.",
    goal_en:"Explain the issue and exchange for the right size.",
    target_vocab:['return','shirt','small','exchange','receipt','larger'],
    target_grammar:['present_simple','comparatives'],
    turns:[
      {ai:"Hi! Need help with something?", type:'description', vocab:['return','small','shirt','exchange'], minw:3},
      {ai:"Sure, do you have the receipt?", type:'yes_no', vocab:['yes','here','receipt'], minw:1},
      {ai:"OK. What size do you need?", type:'description', vocab:['medium','large','size'], minw:2},
      {ai:"Let me check… yes, we have it. Same color OK?", type:'yes_no', vocab:['yes','color','perfect'], minw:1},
      {ai:"All done. Enjoy it this time!", type:'closing', vocab:['thank you','bye'], minw:2, terminal:true},
    ]},
  { slug:'l1-park-question', personaSlug:'amira-friend', level:'L1', difficulty:'easy',
    title_en:"Ask a stranger if a path is open", title_ar:"اسألي شخص إذا الطريق مفتوح",
    setting_en:"At a public park around sunset. You see a path but aren't sure if it's still open.",
    goal_en:"Politely ask and decide whether to continue your walk.",
    target_vocab:['excuse me','park','open','close','time','until'],
    target_grammar:['present_simple','time'],
    turns:[
      {ai:"Are you talking to me?", type:'description', vocab:['yes','excuse me','question'], minw:2},
      {ai:"Sure, what's up?", type:'description', vocab:['path','open','park','close'], minw:3},
      {ai:"Yes, it's open until 10 PM. Plenty of time.", type:'yes_no', vocab:['thank you','great','perfect'], minw:2},
      {ai:"Have a nice walk!", type:'closing', vocab:['thank you','you too'], minw:2, terminal:true},
    ]},
  { slug:'l1-photo-tourist', personaSlug:'sarah-barista', level:'L1', difficulty:'easy',
    title_en:"Take a photo for a tourist", title_ar:"التقطي صورة لسائح",
    setting_en:"In front of the Kingdom Tower at noon. A family asks you to take their photo.",
    goal_en:"Take the photo and offer to take another if needed.",
    target_vocab:['photo','smile','again','perfect','here','one more'],
    target_grammar:['imperatives','polite_requests'],
    turns:[
      {ai:"Excuse me! Could you take our photo, please?", type:'description', vocab:['sure','yes','of course'], minw:2},
      {ai:"Just press the white button. We're ready!", type:'description', vocab:['OK','smile','ready'], minw:2},
      {ai:"How did it turn out?", type:'yes_no', vocab:['perfect','great','one more','again'], minw:2},
      {ai:"Thank you so much. You were very kind!", type:'closing', vocab:['you welcome','no problem'], minw:2, terminal:true},
    ]},

  // ───── L2 — 8 new scenarios (slightly more complex)
  { slug:'l2-doctor-fever-child', personaSlug:'dr-lopez', level:'L2', difficulty:'medium',
    title_en:"Describe a child's fever to the doctor", title_ar:"وصفي حمى الطفل للطبيب",
    setting_en:"A pediatric clinic on a busy weekday morning. Your child has had a fever since last night.",
    goal_en:"Describe the symptoms in detail and follow the doctor's instructions.",
    target_vocab:['fever','since','medicine','rest','temperature','worse'],
    target_grammar:['present_perfect','since_for','comparatives'],
    turns:[
      {ai:"Good morning. What brings you in today?", type:'description', vocab:['fever','child','since','last night'], minw:5},
      {ai:"OK. Has the temperature gotten worse or stayed the same?", type:'description', vocab:['same','worse','higher','38','39'], minw:5},
      {ai:"Any other symptoms — cough, sore throat?", type:'description', vocab:['cough','throat','tired','little'], minw:5},
      {ai:"Has she been drinking water and eating?", type:'yes_no', vocab:['water','yes','little','not much'], minw:4},
      {ai:"OK, I'll prescribe medicine for the fever. Give one dose every 6 hours.", type:'closing', vocab:['OK','thank you','understand','clear'], minw:4, terminal:true},
    ]},
  { slug:'l2-job-interview-call', personaSlug:'omar-coworker', level:'L2', difficulty:'medium',
    title_en:"Schedule a job interview by phone", title_ar:"حدّدي موعد مقابلة عمل بالهاتف",
    setting_en:"You receive an unexpected call about a job application you submitted last week.",
    goal_en:"Confirm interest, agree on a time, and ask about format (in-person or video).",
    target_vocab:['interview','available','position','prefer','schedule','confirm'],
    target_grammar:['future_simple','present_perfect','prefer'],
    turns:[
      {ai:"Hi, this is Omar from HR at TechCo. I have good news — we'd like to interview you.", type:'description', vocab:['thank you','excited','interested','position'], minw:5},
      {ai:"Great! Are you available next Tuesday at 2 PM?", type:'yes_no', vocab:['yes','available','works','OK','Tuesday'], minw:4},
      {ai:"Would you prefer in-person or video?", type:'description', vocab:['prefer','video','person','OK'], minw:4},
      {ai:"Perfect. I'll send you the meeting link by email. Anything you'd like to know?", type:'description', vocab:['dress code','prepare','team','questions'], minw:4},
      {ai:"Smart casual is fine. Looking forward to meeting you!", type:'closing', vocab:['thank you','look forward','bye'], minw:3, terminal:true},
    ]},
  { slug:'l2-rent-apartment-tour', personaSlug:'fahad-receptionist', level:'L2', difficulty:'medium',
    title_en:"Tour an apartment with a landlord", title_ar:"شوفي شقة مع المالك",
    setting_en:"A bright new apartment on the 6th floor. The landlord is showing you around.",
    goal_en:"Ask about utilities, length of lease, and report any issues.",
    target_vocab:['rent','utilities','lease','deposit','furnished','available'],
    target_grammar:['present_simple','quantity_questions'],
    turns:[
      {ai:"Welcome! This unit is 80 square meters, two bedrooms. What do you think?", type:'description', vocab:['nice','bright','clean','spacious'], minw:4},
      {ai:"Rent is 3,500 a month. Are utilities included?", type:'description', vocab:['utilities','included','separate','water','electricity'], minw:5},
      {ai:"Utilities are separate. Lease is one year minimum.", type:'yes_no', vocab:['OK','one year','sign','contract'], minw:3},
      {ai:"Security deposit is one month's rent. Available from next week.", type:'yes_no', vocab:['perfect','OK','take it','interested'], minw:3},
      {ai:"Excellent. I'll prepare the contract.", type:'closing', vocab:['thank you','great','tomorrow'], minw:3, terminal:true},
    ]},
  { slug:'l2-give-feedback-cafe', personaSlug:'sarah-barista', level:'L2', difficulty:'medium',
    title_en:"Give honest feedback about a coffee", title_ar:"أعطي ملاحظة صريحة عن قهوة",
    setting_en:"A quiet cafe at 3 PM. Your latte tastes burnt. The barista asks how it is.",
    goal_en:"Politely give feedback without being rude, ask for a remake.",
    target_vocab:['actually','little','burnt','remake','sorry','of course'],
    target_grammar:['polite_requests','present_perfect'],
    turns:[
      {ai:"How's your latte? Is everything OK?", type:'description', vocab:['actually','little','strong','burnt'], minw:5},
      {ai:"Oh, I'm so sorry! Would you like me to remake it?", type:'yes_no', vocab:['yes','please','if','OK'], minw:3},
      {ai:"Any preference on the milk this time — oat or regular?", type:'description', vocab:['oat','regular','prefer','milk'], minw:3},
      {ai:"Coming right up. On the house, of course.", type:'closing', vocab:['thank you','kind','appreciate'], minw:3, terminal:true},
    ]},
  { slug:'l2-bank-card-blocked', personaSlug:'fahad-receptionist', level:'L2', difficulty:'medium',
    title_en:"Resolve a blocked bank card", title_ar:"حلّي مشكلة بطاقة بنكية محظورة",
    setting_en:"You're at the bank. Your card was blocked after an unusual transaction.",
    goal_en:"Verify your identity and reactivate the card.",
    target_vocab:['card','blocked','unusual','verify','identity','reactivate'],
    target_grammar:['present_perfect','passive_voice'],
    turns:[
      {ai:"Welcome. How may I assist?", type:'description', vocab:['card','blocked','yesterday','help'], minw:4},
      {ai:"Let me check your account. Can I see ID?", type:'description', vocab:['here','ID','passport','license'], minw:2},
      {ai:"There was an unusual transaction in another city. Did you make it?", type:'yes_no', vocab:['no','wasn\'t me','yes','suspicious'], minw:3},
      {ai:"OK, we'll unblock it but issue a new card to be safe.", type:'yes_no', vocab:['agree','OK','sounds','careful'], minw:3},
      {ai:"You'll get the new card in 3-5 days. Anything else?", type:'closing', vocab:['no','thank you','that\'s all'], minw:3, terminal:true},
    ]},
  { slug:'l2-volunteer-signup', personaSlug:'amira-friend', level:'L2', difficulty:'medium',
    title_en:"Sign up for a volunteer event", title_ar:"سجّلي في فعالية تطوعية",
    setting_en:"A community center on a Friday evening. You want to help with a charity event next month.",
    goal_en:"Ask about the role, time commitment, and sign your name.",
    target_vocab:['volunteer','event','role','hours','help','sign up'],
    target_grammar:['future_simple','present_continuous'],
    turns:[
      {ai:"Welcome! Are you interested in volunteering?", type:'description', vocab:['yes','interested','sign up','help'], minw:3},
      {ai:"Great! We have two roles — setup or registration. Which suits you?", type:'description', vocab:['registration','prefer','meeting people','quiet'], minw:4},
      {ai:"Registration is 4 hours, from 8 AM to noon. Free lunch after.", type:'yes_no', vocab:['OK','works','perfect','sounds good'], minw:3},
      {ai:"Wonderful! Please fill in this form with your name and number.", type:'description', vocab:['here','OK','name','phone'], minw:2},
      {ai:"All set! We'll send a reminder a week before. Thank you!", type:'closing', vocab:['thank you','look forward','bye'], minw:3, terminal:true},
    ]},
  { slug:'l2-tech-support-internet', personaSlug:'omar-coworker', level:'L2', difficulty:'medium',
    title_en:"Report internet outage to support", title_ar:"بلّغي عن انقطاع الإنترنت",
    setting_en:"You call your ISP at noon. Your home internet has been down for two hours.",
    goal_en:"Explain the issue, follow the troubleshooting, and arrange a fix.",
    target_vocab:['internet','down','router','reset','technician','tomorrow'],
    target_grammar:['present_perfect','imperatives'],
    turns:[
      {ai:"Hello, tech support. How can I help?", type:'description', vocab:['internet','down','two hours','router'], minw:5},
      {ai:"Have you restarted the router?", type:'yes_no', vocab:['yes','tried','twice','no change'], minw:3},
      {ai:"OK, the issue might be in your area. Let me check.", type:'closing', vocab:['OK','wait','please','take time'], minw:2},
      {ai:"Confirmed — there's an outage in your district. We'll send a technician tomorrow morning.", type:'yes_no', vocab:['OK','time','morning','thank'], minw:3},
      {ai:"Sorry for the inconvenience. We'll text you when fixed.", type:'closing', vocab:['thank you','appreciate','bye'], minw:3, terminal:true},
    ]},
  { slug:'l2-gym-trial-signup', personaSlug:'khalid-gym', level:'L2', difficulty:'medium',
    title_en:"Take a gym trial day", title_ar:"جربي يوم تدريب في النادي",
    setting_en:"A new modern gym in Olaya district. You want to try before committing.",
    goal_en:"Ask about facilities, equipment, and trainer support before signing up.",
    target_vocab:['trial','equipment','trainer','membership','contract','fitness'],
    target_grammar:['present_simple','prefer'],
    turns:[
      {ai:"Welcome! First time here?", type:'description', vocab:['yes','trial','interested','member'], minw:3},
      {ai:"Sure! Tour first or jump right in?", type:'description', vocab:['tour','prefer','show me','equipment'], minw:3},
      {ai:"We have free weights, cardio area, and a yoga room. Any preference?", type:'description', vocab:['weights','cardio','yoga','all'], minw:4},
      {ai:"Need a trainer to guide you today?", type:'yes_no', vocab:['yes','please','first time','no thanks'], minw:3},
      {ai:"Great. I'll set you up. Enjoy your trial!", type:'closing', vocab:['thank you','exciting','look forward'], minw:3, terminal:true},
    ]},

  // ───── L3 — 8 new scenarios (intermediate, real choices)
  { slug:'l3-negotiate-salary', personaSlug:'omar-coworker', level:'L3', difficulty:'medium',
    title_en:"Negotiate salary at job offer", title_ar:"تفاوضي على الراتب في عرض العمل",
    setting_en:"You've received a job offer 10% below your target. You're in a call with HR.",
    goal_en:"Politely push back, give justification, and agree on a counter-offer.",
    target_vocab:['offer','salary','market','experience','consider','agree'],
    target_grammar:['conditionals','modal_verbs','comparatives'],
    turns:[
      {ai:"Thanks for the offer. I have a question about the salary.", type:'opinion', vocab:['appreciate','offer','however','question'], minw:6},
      {ai:"Of course. What's on your mind?", type:'opinion', vocab:['research','market','experience','expected','range'], minw:7},
      {ai:"That's a reasonable point. What number would work for you?", type:'opinion', vocab:['fair','figure','within','consider','reasonable'], minw:6},
      {ai:"Let me check with leadership. Anything else flexible — benefits, vacation?", type:'description', vocab:['vacation','remote','benefits','flexible'], minw:5},
      {ai:"OK. I'll get back to you by tomorrow.", type:'closing', vocab:['thank you','appreciate','look forward'], minw:3, terminal:true},
    ]},
  { slug:'l3-roommate-conflict', personaSlug:'amira-friend', level:'L3', difficulty:'medium',
    title_en:"Discuss a roommate conflict", title_ar:"ناقشي خلاف مع شريكة سكن",
    setting_en:"Your roommate has been loud at night for two weeks. You want to discuss without conflict.",
    goal_en:"Express your concern calmly and propose a solution together.",
    target_vocab:['noticed','sleep','schedule','agree','compromise','quiet hours'],
    target_grammar:['present_perfect','conditionals','suggestions'],
    turns:[
      {ai:"Hey, you wanted to talk?", type:'opinion', vocab:['yes','something','bothering','noticed'], minw:5},
      {ai:"OK, what's on your mind?", type:'opinion', vocab:['noise','night','sleep','affecting','please'], minw:7},
      {ai:"I didn't realize. I'm sorry. What would help?", type:'opinion', vocab:['could','quiet','after','agree'], minw:5},
      {ai:"That works for me. Anything else?", type:'opinion', vocab:['kitchen','clean','schedule','clarify'], minw:5},
      {ai:"Great, glad we talked. Friends?", type:'closing', vocab:['yes','of course','appreciate','bye'], minw:3, terminal:true},
    ]},
  { slug:'l3-explain-misunderstanding', personaSlug:'omar-coworker', level:'L3', difficulty:'medium',
    title_en:"Clear up a misunderstanding with a colleague", title_ar:"وضّحي سوء فهم مع زميل",
    setting_en:"A coworker thought you ignored their email. You explain what really happened.",
    goal_en:"Apologize for the confusion, give the real reason, agree on next steps.",
    target_vocab:['email','noticed','wasn\'t','intentional','apologize','clarify'],
    target_grammar:['past_simple','present_perfect','reported_speech'],
    turns:[
      {ai:"I felt you were ignoring my email all week.", type:'opinion', vocab:['sorry','wasn\'t','intentional','swamped'], minw:6},
      {ai:"OK, what happened?", type:'opinion', vocab:['busy','project','missed','genuinely'], minw:5},
      {ai:"I see. So you didn't see the part about the deadline?", type:'opinion', vocab:['no','missed','catch up','today'], minw:5},
      {ai:"OK, can you reply by EOD then?", type:'yes_no', vocab:['yes','before','five','sure'], minw:3},
      {ai:"Thanks. Let's not let this happen again.", type:'closing', vocab:['agree','better','communication'], minw:3, terminal:true},
    ]},
  { slug:'l3-return-defective-laptop', personaSlug:'lina-shopkeeper', level:'L3', difficulty:'medium',
    title_en:"Return a defective laptop", title_ar:"ارجعي لابتوب فيه عيب",
    setting_en:"You bought a laptop a week ago. The screen flickers. Customer service desk.",
    goal_en:"Explain the issue, push for an exchange (not just repair), get confirmation.",
    target_vocab:['defective','screen','flickers','exchange','warranty','repair'],
    target_grammar:['present_perfect','passive_voice','comparatives'],
    turns:[
      {ai:"How can I help you today?", type:'opinion', vocab:['laptop','defective','screen','flickers','bought'], minw:6},
      {ai:"Sorry to hear. Do you have the receipt and warranty?", type:'yes_no', vocab:['yes','here','both','seven days'], minw:3},
      {ai:"Within 7 days you can exchange. Same model or different?", type:'opinion', vocab:['exchange','same','model','prefer'], minw:4},
      {ai:"OK, let me get that for you.", type:'closing', vocab:['thank you','appreciate','quick'], minw:3},
      {ai:"All set. Test it before leaving, please.", type:'closing', vocab:['OK','will do','thank you'], minw:2, terminal:true},
    ]},
  { slug:'l3-give-directions-tourist', personaSlug:'sarah-barista', level:'L3', difficulty:'medium',
    title_en:"Give directions to a lost tourist", title_ar:"أعطي اتجاهات لسائح ضايع",
    setting_en:"A tourist stops you in a shopping district. They're looking for a museum.",
    goal_en:"Give clear, step-by-step directions; check they understand; suggest landmarks.",
    target_vocab:['straight','right','left','past','until','landmark'],
    target_grammar:['imperatives','prepositions_of_place','sequence_words'],
    turns:[
      {ai:"Excuse me, do you speak English?", type:'description', vocab:['yes','of course','help'], minw:2},
      {ai:"I'm looking for the National Museum. Is it far?", type:'opinion', vocab:['not far','minutes','straight','direction'], minw:5},
      {ai:"OK, so I go straight, then what?", type:'opinion', vocab:['turn right','past','until','intersection','left'], minw:6},
      {ai:"Got it. Any landmark I'll see?", type:'opinion', vocab:['fountain','big building','sign','can\'t miss'], minw:5},
      {ai:"Thank you so much! That's very helpful.", type:'closing', vocab:['welcome','enjoy','visit'], minw:3, terminal:true},
    ]},
  { slug:'l3-complain-loud-neighbor', personaSlug:'fahad-receptionist', level:'L3', difficulty:'medium',
    title_en:"File a complaint about a loud neighbor", title_ar:"قدّمي شكوى عن جار صاخب",
    setting_en:"Your apartment building's office. Your neighbor's music is loud every night.",
    goal_en:"File a formal complaint, calmly explain the impact, ask about next steps.",
    target_vocab:['complaint','noise','nightly','impact','steps','formal'],
    target_grammar:['present_perfect','present_continuous','reported_speech'],
    turns:[
      {ai:"Welcome. How can I help?", type:'opinion', vocab:['complaint','neighbor','noise','formal'], minw:5},
      {ai:"How often does this happen?", type:'opinion', vocab:['nightly','two weeks','impact','sleep'], minw:5},
      {ai:"Have you spoken to them directly first?", type:'opinion', vocab:['yes','politely','asked','responded','quietly'], minw:6},
      {ai:"OK, I'll file a formal warning. What's the apartment number?", type:'description', vocab:['number','floor','beside','above'], minw:3},
      {ai:"You'll hear back within 5 business days. Anything else?", type:'closing', vocab:['no','thank you','appreciate'], minw:3, terminal:true},
    ]},
  { slug:'l3-tutor-first-meeting', personaSlug:'dr-lopez', level:'L3', difficulty:'medium',
    title_en:"Meet a private tutor for the first time", title_ar:"التق بمدرّس خصوصي لأول مرة",
    setting_en:"A quiet coffee shop on a weekend afternoon. You're discussing your study goals.",
    goal_en:"Explain your level, set goals, and agree on schedule and price.",
    target_vocab:['level','goal','schedule','price','session','progress'],
    target_grammar:['present_simple','future_simple','conditionals'],
    turns:[
      {ai:"Tell me about your current level.", type:'opinion', vocab:['intermediate','understand','speaking','writing','struggle'], minw:6},
      {ai:"What's your main goal?", type:'opinion', vocab:['business','interviews','travel','confidence','fluency'], minw:5},
      {ai:"How many sessions per week works for you?", type:'description', vocab:['two','one','depends','flexible'], minw:3},
      {ai:"My rate is 200 riyals per hour. Acceptable?", type:'yes_no', vocab:['yes','fair','price','works'], minw:3},
      {ai:"Great. Let's start next week. I'll send a schedule.", type:'closing', vocab:['thank you','look forward','exciting'], minw:3, terminal:true},
    ]},
  { slug:'l3-restaurant-allergy', personaSlug:'noor-waiter', level:'L3', difficulty:'medium',
    title_en:"Inform the waiter about a food allergy", title_ar:"أخبري النادل عن حساسية طعام",
    setting_en:"A new restaurant for dinner. Your friend has a serious peanut allergy.",
    goal_en:"Ask carefully about ingredients, alert the kitchen, choose safely.",
    target_vocab:['allergy','peanuts','kitchen','careful','ingredients','dish'],
    target_grammar:['present_simple','modal_verbs','questions'],
    turns:[
      {ai:"Ready to order?", type:'opinion', vocab:['question','allergy','peanuts','careful'], minw:5},
      {ai:"Important to know. Let me check with the kitchen.", type:'opinion', vocab:['thank you','really','appreciate','important'], minw:4},
      {ai:"They confirmed — these three dishes are safe. Anything else allergic?", type:'description', vocab:['no','just','peanuts','three','choose'], minw:4},
      {ai:"Great, what'll you have?", type:'description', vocab:['I\'ll have','prefer','one of','sounds good'], minw:3},
      {ai:"I'll mark it allergy-priority. Enjoy your meal!", type:'closing', vocab:['thank you','careful','appreciate'], minw:3, terminal:true},
    ]},

  // ───── L4 — 7 new scenarios (upper-intermediate, abstract)
  { slug:'l4-disagree-meeting', personaSlug:'omar-coworker', level:'L4', difficulty:'challenging',
    title_en:"Disagree respectfully in a meeting", title_ar:"اختلفي باحترام في اجتماع",
    setting_en:"A team meeting where the leader proposes an approach you think is flawed.",
    goal_en:"Voice your disagreement respectfully, give reasoning, suggest alternative.",
    target_vocab:['perspective','concern','data','suggest','alternative','rather'],
    target_grammar:['conditionals','modal_verbs','linkers'],
    turns:[
      {ai:"Everyone agree with the proposal?", type:'opinion', vocab:['perspective','concern','data','approach'], minw:7},
      {ai:"OK, share your concern.", type:'opinion', vocab:['risk','data','suggest','consider','alternative'], minw:7},
      {ai:"Interesting. What do you propose instead?", type:'opinion', vocab:['suggest','approach','phased','test','first'], minw:7},
      {ai:"Let's table this and revisit with more data.", type:'opinion', vocab:['fair','agree','appreciate','understanding'], minw:5},
      {ai:"Thanks for raising it. Good discussion.", type:'closing', vocab:['thank you','appreciate','glad'], minw:3, terminal:true},
    ]},
  { slug:'l4-mentorship-meeting', personaSlug:'dr-lopez', level:'L4', difficulty:'challenging',
    title_en:"Ask a senior for mentorship", title_ar:"اطلبي توجيه من شخص خبير",
    setting_en:"You approach a respected senior at a networking event after their talk.",
    goal_en:"Express genuine admiration, ask thoughtfully for mentorship, propose a structure.",
    target_vocab:['admire','appreciate','grateful','mentor','structure','grow'],
    target_grammar:['present_perfect','conditionals','polite_requests'],
    turns:[
      {ai:"Your talk was excellent.", type:'opinion', vocab:['admire','work','appreciate','perspective'], minw:6},
      {ai:"Thank you. What did resonate most?", type:'opinion', vocab:['point','reframed','specifically','case'], minw:7},
      {ai:"I'd love to ask — would you consider mentoring me?", type:'opinion', vocab:['grateful','specific','area','growth'], minw:7},
      {ai:"Tell me what you'd want from it.", type:'opinion', vocab:['monthly','call','question','feedback','structured'], minw:7},
      {ai:"Let's try one session and see how it goes.", type:'closing', vocab:['thank you','appreciate','look forward'], minw:4, terminal:true},
    ]},
  { slug:'l4-explain-complex-idea', personaSlug:'omar-coworker', level:'L4', difficulty:'challenging',
    title_en:"Explain a complex idea to a non-expert", title_ar:"اشرحي فكرة معقدة لشخص غير متخصص",
    setting_en:"A friend asks you to explain something technical from your work. They have no background.",
    goal_en:"Use analogies, check understanding, avoid jargon.",
    target_vocab:['like','imagine','think of','essentially','make sense','example'],
    target_grammar:['present_simple','linkers','comparatives'],
    turns:[
      {ai:"Can you explain what you do at work? I never quite got it.", type:'opinion', vocab:['essentially','imagine','think of','like'], minw:8},
      {ai:"OK, give me an analogy.", type:'opinion', vocab:['like','similar to','difference','imagine','postal'], minw:7},
      {ai:"That makes more sense. So who decides what's important?", type:'opinion', vocab:['decided by','team','data','priorities','collaborate'], minw:7},
      {ai:"What's the hardest part?", type:'opinion', vocab:['hardest','people','disagree','consensus','tradeoff'], minw:7},
      {ai:"Got it. Thanks for explaining patiently.", type:'closing', vocab:['welcome','glad','easy ask','anytime'], minw:3, terminal:true},
    ]},
  { slug:'l4-decline-invitation-tactfully', personaSlug:'amira-friend', level:'L4', difficulty:'challenging',
    title_en:"Decline an invitation tactfully", title_ar:"اعتذري عن دعوة بلباقة",
    setting_en:"A friend invites you to a wedding you don't want to attend. You don't want to lie or hurt her.",
    goal_en:"Decline kindly with a real reason, preserve the friendship.",
    target_vocab:['unfortunately','conflict','rain check','meaningful','catch up','soon'],
    target_grammar:['conditionals','polite_requests','future_simple'],
    turns:[
      {ai:"I'd love it if you came to my wedding.", type:'opinion', vocab:['thank you','honored','unfortunately','conflict'], minw:6},
      {ai:"Oh no, what's happening?", type:'opinion', vocab:['family','obligation','travel','timing'], minw:6},
      {ai:"I understand. Can we celebrate separately?", type:'opinion', vocab:['yes','coffee','before','after','meaningful'], minw:6},
      {ai:"That'd be lovely. I'll miss you.", type:'closing', vocab:['miss you','soon','catch up','congratulations'], minw:4, terminal:true},
    ]},
  { slug:'l4-give-presentation-feedback', personaSlug:'dr-lopez', level:'L4', difficulty:'challenging',
    title_en:"Give thoughtful presentation feedback", title_ar:"أعطي ملاحظات مدروسة على عرض",
    setting_en:"A junior colleague gave a presentation. They ask for honest feedback.",
    goal_en:"Lead with what worked, suggest improvements specifically, end with encouragement.",
    target_vocab:['strongest','effective','suggest','specifically','improve','overall'],
    target_grammar:['comparatives','linkers','suggestions'],
    turns:[
      {ai:"Honest feedback please — don't sugarcoat.", type:'opinion', vocab:['strongest','effective','data','engagement','suggest'], minw:8},
      {ai:"OK, what would you change?", type:'opinion', vocab:['specifically','slide','transition','pace','clarity'], minw:8},
      {ai:"What about the questions section?", type:'opinion', vocab:['handled','well','expand','depth','example'], minw:7},
      {ai:"Anything I should keep doing?", type:'opinion', vocab:['energy','clear','structured','confidence','keep'], minw:7},
      {ai:"Thanks. Really useful.", type:'closing', vocab:['welcome','glad','growing','keep going'], minw:3, terminal:true},
    ]},
  { slug:'l4-business-pitch-investor', personaSlug:'omar-coworker', level:'L4', difficulty:'challenging',
    title_en:"Pitch your business idea to an investor", title_ar:"قدّمي فكرة عملكِ لمستثمر",
    setting_en:"A 10-minute pitch meeting at a co-working space. Coffee in hand, slides ready.",
    goal_en:"State the problem, your solution, your traction, what you need.",
    target_vocab:['problem','solution','traction','customer','revenue','seeking'],
    target_grammar:['present_continuous','present_perfect','future_simple'],
    turns:[
      {ai:"You have 10 minutes. Start with the problem.", type:'opinion', vocab:['millions','problem','time','money','frustration'], minw:8},
      {ai:"OK, what's your solution?", type:'opinion', vocab:['unique','platform','simpler','faster','cheaper'], minw:7},
      {ai:"Traction so far?", type:'opinion', vocab:['users','growing','month','revenue','positive'], minw:6},
      {ai:"What are you seeking?", type:'opinion', vocab:['seeking','million','runway','hire','expand'], minw:6},
      {ai:"Interesting. Let me think and follow up.", type:'closing', vocab:['thank you','appreciate','available'], minw:4, terminal:true},
    ]},
  { slug:'l4-resolve-customer-complaint', personaSlug:'lina-shopkeeper', level:'L4', difficulty:'challenging',
    title_en:"Resolve a serious customer complaint", title_ar:"حلّي شكوى عميل جدية",
    setting_en:"An angry customer is at your counter. Their order was wrong and they want full refund.",
    goal_en:"Listen empathetically, validate frustration, offer fair resolution.",
    target_vocab:['understand','frustrating','apologize','resolve','reasonable','make right'],
    target_grammar:['present_perfect','conditionals','passive_voice'],
    turns:[
      {ai:"This is unacceptable. I want a refund now.", type:'opinion', vocab:['understand','frustrating','apologize','listen'], minw:6},
      {ai:"OK, what happened?", type:'opinion', vocab:['order','wrong','time','expected','damage'], minw:7},
      {ai:"What would feel fair?", type:'opinion', vocab:['refund','partial','replacement','discount','reasonable'], minw:7},
      {ai:"I'll process a full refund and add a 20% discount on your next order.", type:'yes_no', vocab:['accept','fair','appreciate','OK'], minw:4},
      {ai:"Thank you for giving us a chance to fix it.", type:'closing', vocab:['thank you','better','effort'], minw:3, terminal:true},
    ]},

  // ───── L5 — 7 new scenarios (advanced, nuanced)
  { slug:'l5-ethical-dilemma-work', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Discuss an ethical dilemma at work", title_ar:"ناقشي معضلة أخلاقية في العمل",
    setting_en:"You discovered a coworker is taking credit for someone's else's work. You're seeking advice.",
    goal_en:"Articulate the dilemma clearly, weigh options, decide on a path.",
    target_vocab:['noticed','dilemma','consequences','principle','direct','escalate'],
    target_grammar:['conditionals','complex_sentences','modal_verbs'],
    turns:[
      {ai:"You said you needed advice — what's going on?", type:'opinion', vocab:['noticed','dilemma','credit','work','principle'], minw:9},
      {ai:"What's at stake if you say nothing?", type:'opinion', vocab:['precedent','fairness','culture','grow','tolerate'], minw:8},
      {ai:"And if you speak up?", type:'opinion', vocab:['confrontation','relationship','retaliation','consequences','reputation'], minw:8},
      {ai:"What does your gut say?", type:'opinion', vocab:['principle','aligned','can\'t pretend','speak','privately'], minw:7},
      {ai:"Trust that instinct. Start with a private direct conversation.", type:'closing', vocab:['thank you','helpful','clarity'], minw:4, terminal:true},
    ]},
  { slug:'l5-defend-thesis', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Defend a thesis position", title_ar:"دافعي عن أطروحة بحثية",
    setting_en:"Your thesis defense. A skeptical examiner challenges your central claim.",
    goal_en:"Defend without being defensive — concede where valid, push back where needed.",
    target_vocab:['claim','evidence','contrary','concede','strengthens','distinguish'],
    target_grammar:['conditionals','passive_voice','linkers'],
    turns:[
      {ai:"Your central claim seems vulnerable. Defend it.", type:'opinion', vocab:['acknowledge','however','evidence','specifically','stands'], minw:9},
      {ai:"How do you reconcile your data with the contrary findings?", type:'opinion', vocab:['contrary','difference','methodology','population','distinguish'], minw:9},
      {ai:"What's the strongest objection you've considered?", type:'opinion', vocab:['strongest','sample','generalize','address','acknowledge'], minw:9},
      {ai:"Why should we trust this approach?", type:'opinion', vocab:['triangulate','validate','peer-reviewed','reproducible','rigor'], minw:8},
      {ai:"A solid defense. Thank you.", type:'closing', vocab:['thank you','appreciate','rigor'], minw:3, terminal:true},
    ]},
  { slug:'l5-negotiate-multi-party', personaSlug:'omar-coworker', level:'L5', difficulty:'challenging',
    title_en:"Mediate a multi-party negotiation", title_ar:"وسّطي في تفاوض متعدد الأطراف",
    setting_en:"Three teams have conflicting requirements for a shared resource. You mediate.",
    goal_en:"Surface each party's actual interest, propose a synthesis, get agreement.",
    target_vocab:['interest','position','synthesis','tradeoff','prioritize','consensus'],
    target_grammar:['conditionals','linkers','suggestions'],
    turns:[
      {ai:"We're at an impasse. Help us.", type:'opinion', vocab:['underlying','interest','real','need','clarify'], minw:8},
      {ai:"OK — team A says speed. team B says quality. team C says cost. What now?", type:'opinion', vocab:['identify','tradeoff','phase','prioritize','sequence'], minw:9},
      {ai:"Walk us through a possible synthesis.", type:'opinion', vocab:['phase one','phase two','tradeoff','agreed','metric'], minw:9},
      {ai:"Can all teams live with this?", type:'opinion', vocab:['acceptable','reservations','adjustments','majority','consensus'], minw:7},
      {ai:"Let's commit to it for 90 days, then reassess.", type:'closing', vocab:['agreed','accountable','revisit'], minw:5, terminal:true},
    ]},
  { slug:'l5-give-difficult-feedback', personaSlug:'omar-coworker', level:'L5', difficulty:'challenging',
    title_en:"Tell a friend hard truth about their business", title_ar:"قولي لصديق حقيقة صعبة عن عمله",
    setting_en:"Your close friend asks for honest feedback on their business — which is failing.",
    goal_en:"Be honest yet kind, support without enabling delusion, suggest concrete next steps.",
    target_vocab:['honest','difficult','reality','signs','pivot','step back'],
    target_grammar:['conditionals','modal_verbs','linkers'],
    turns:[
      {ai:"Tell me the truth. Is my business viable?", type:'opinion', vocab:['honest','difficult','say this','reality','seeing'], minw:9},
      {ai:"OK, what specifically?", type:'opinion', vocab:['signs','revenue','retention','market','adoption','underwhelming'], minw:9},
      {ai:"So what should I do?", type:'opinion', vocab:['step back','pivot','close','question','passionate'], minw:8},
      {ai:"That's a lot to process.", type:'opinion', vocab:['I know','support','process','support','here'], minw:6},
      {ai:"Thanks for being real with me.", type:'closing', vocab:['care','here for you','rooting'], minw:4, terminal:true},
    ]},
  { slug:'l5-discuss-philosophy', personaSlug:'dr-lopez', level:'L5', difficulty:'challenging',
    title_en:"Discuss a philosophical question", title_ar:"ناقشي سؤال فلسفي",
    setting_en:"A late evening discussion about free will. The conversation has been going for an hour.",
    goal_en:"Hold a position with humility, engage with counterarguments honestly.",
    target_vocab:['position','assumption','intuition','compatible','reductio','distinguish'],
    target_grammar:['conditionals','linkers','complex_sentences'],
    turns:[
      {ai:"Do you think free will is real?", type:'opinion', vocab:['position','compatible','depends','assumption','distinguish'], minw:9},
      {ai:"What's the strongest challenge to your view?", type:'opinion', vocab:['strongest','physical','determinism','reductio','complete'], minw:9},
      {ai:"How do you handle that?", type:'opinion', vocab:['acknowledge','redefine','level','practical','useful'], minw:8},
      {ai:"Where might you be wrong?", type:'opinion', vocab:['intuition','limited','blind','arguments','convinced'], minw:8},
      {ai:"Good honest engagement. Thanks.", type:'closing', vocab:['enjoyed','rare','well'], minw:4, terminal:true},
    ]},
  { slug:'l5-policy-debate-formal', personaSlug:'omar-coworker', level:'L5', difficulty:'challenging',
    title_en:"Participate in a formal policy debate", title_ar:"شاركي في نقاش سياسات رسمي",
    setting_en:"A panel discussion on remote work policy. You have 60 seconds to make your case.",
    goal_en:"Be concise, evidence-based, anticipate counterarguments, propose middle ground.",
    target_vocab:['evidence','position','claim','counterargument','synthesize','propose'],
    target_grammar:['present_perfect','conditionals','linkers'],
    turns:[
      {ai:"You have 60 seconds. Make your case.", type:'opinion', vocab:['evidence','position','specifically','data','claim'], minw:8},
      {ai:"The opposition says you're ignoring team cohesion. Response?", type:'opinion', vocab:['concede','partial','however','hybrid','synthesis'], minw:8},
      {ai:"What would you propose?", type:'opinion', vocab:['propose','three days','negotiated','measured','results'], minw:7},
      {ai:"And how do you measure success?", type:'opinion', vocab:['metrics','engagement','retention','output','satisfaction'], minw:7},
      {ai:"Thank you for the contribution.", type:'closing', vocab:['thank you','panel','question'], minw:3, terminal:true},
    ]},
  { slug:'l5-deliver-bad-news-team', personaSlug:'omar-coworker', level:'L5', difficulty:'challenging',
    title_en:"Deliver bad news to your team", title_ar:"اخبري فريقكِ بأخبار سيئة",
    setting_en:"Friday afternoon. You must tell your team a layoff is coming next week.",
    goal_en:"Be honest, take responsibility, give them space to respond, end with respect.",
    target_vocab:['difficult','responsibility','transparent','support','process','respect'],
    target_grammar:['present_continuous','modal_verbs','passive_voice'],
    turns:[
      {ai:"What's the news?", type:'opinion', vocab:['difficult','transparent','restructuring','layoff','coming'], minw:8},
      {ai:"Why is this happening?", type:'opinion', vocab:['financial','reality','responsibility','decisions','approved'], minw:8},
      {ai:"What support will affected people get?", type:'opinion', vocab:['severance','outplacement','reference','transition','support'], minw:8},
      {ai:"This isn't fair.", type:'opinion', vocab:['agree','painful','wish','different','sorry'], minw:6},
      {ai:"Thanks for being honest at least.", type:'closing', vocab:['respect','available','listen','process'], minw:4, terminal:true},
    ]},
]

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  for (const ref of targets) {
    console.log(`\n========================== TARGET: ${ref} ==========================`)
    const personas = await call(token, ref, 'SELECT id, slug FROM retention_personas')
    const personaMap = {}
    for (const p of personas) personaMap[p.slug] = p.id

    let scInserted = 0, scSkipped = 0, turnsInserted = 0
    for (const sc of SCENARIOS) {
      const personaId = personaMap[sc.personaSlug]
      if (!personaId) { console.error(`  no persona ${sc.personaSlug} — skipping ${sc.slug}`); continue }

      const scSql = `INSERT INTO retention_scenarios (slug, persona_id, title_en, title_ar, setting_en, goal_en, difficulty, target_level, estimated_minutes, target_vocab, target_grammar, active)
        VALUES (${esc(sc.slug)}, '${personaId}', ${esc(sc.title_en)}, ${esc(sc.title_ar)}, ${esc(sc.setting_en)}, ${esc(sc.goal_en)}, '${sc.difficulty}', '${sc.level}', ${sc.turns.length+2}, ${arrText(sc.target_vocab)}, ${arrText(sc.target_grammar)}, true)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id`
      let scenarioId
      try {
        const r = await call(token, ref, scSql)
        if (Array.isArray(r) && r.length > 0) { scenarioId = r[0].id; scInserted++ }
        else {
          const fetch = await call(token, ref, `SELECT id FROM retention_scenarios WHERE slug = ${esc(sc.slug)} LIMIT 1`)
          scenarioId = fetch[0]?.id; scSkipped++
        }
      } catch (e) {
        console.error(`  scenario ${sc.slug} failed: ${e.message.slice(0,200)}`); continue
      }
      if (!scenarioId) continue

      const tCount = await call(token, ref, `SELECT count(*)::int AS c FROM retention_dialogue_turns WHERE scenario_id = '${scenarioId}'`)
      if (tCount[0].c >= sc.turns.length) continue

      for (let i = 0; i < sc.turns.length; i++) {
        const t = sc.turns[i]
        const sql = `INSERT INTO retention_dialogue_turns
          (scenario_id, turn_number, ai_text_en, expected_response_type, expected_vocab, min_words, is_terminal)
          VALUES ('${scenarioId}', ${i + 1}, ${esc(t.ai)}, '${t.type}', ${arrText(t.vocab)}, ${t.minw||3}, ${t.terminal?'true':'false'})`
        try { await call(token, ref, sql); turnsInserted++ }
        catch (e) { console.error(`  turn ${i+1} of ${sc.slug} failed: ${e.message.slice(0,150)}`) }
      }
    }
    const s = await call(token, ref, 'SELECT count(*)::int AS c FROM retention_scenarios')
    const t = await call(token, ref, 'SELECT count(*)::int AS c FROM retention_dialogue_turns')
    console.log(`[${ref}] +${scInserted} scenarios (${scSkipped} existed), +${turnsInserted} turns; totals: ${s[0].c}/${t[0].c}`)
  }
})().catch(e => { console.error('FATAL:', e); process.exit(1) })
