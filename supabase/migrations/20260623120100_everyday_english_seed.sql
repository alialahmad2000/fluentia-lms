-- إنجليزي يومي — starter scenario library (idempotent: re-runnable, upserts on slug).
-- Real-life everyday situations. Arabic titles are gender-neutral nouns (brand = طلاقة).
-- ai_role tells the model who to BE and how to behave; student_role is the learner's mission.

insert into public.everyday_english_scenarios
  (slug, title_en, title_ar, emoji, category, level_min, level_max, situation_en, ai_role, student_role, goal_en, useful_phrases, sort_order)
values
  ('order-coffee', 'Ordering coffee', 'تطلب قهوتك', '☕', 'daily_life', 1, 3,
   'A busy specialty coffee shop. The learner walks up to the counter to order.',
   'You are a warm, friendly barista. Greet them, take their order, ask one simple follow-up (size, milk, to stay or to go), and confirm the total. Keep it light and everyday.',
   'Order a drink (and maybe a snack), answer the barista''s questions, and pay.',
   'They successfully order a drink and respond to the size/milk/total questions.',
   array['Can I get a …, please?', 'For here or to go?', 'A small / medium / large', 'How much is that?'], 10),

  ('small-talk-weekend', 'Weekend small talk', 'دردشة عن نهاية الأسبوع', '🗓️', 'social', 1, 3,
   'Monday morning. A friendly coworker starts a casual chat by the coffee machine.',
   'You are a friendly, easygoing coworker. Ask how their weekend was, react warmly, share a tiny bit about yours, and keep the small talk going naturally.',
   'Have a relaxed chat about your weekend and ask about theirs.',
   'They describe their weekend and ask the coworker a question back.',
   array['How was your weekend?', 'I went to … / I stayed home and …', 'That sounds nice!', 'What about you?'], 20),

  ('ask-directions', 'Asking for directions', 'تسأل عن الطريق', '🗺️', 'travel', 1, 3,
   'A street in a new city. The learner is a little lost and stops a friendly local.',
   'You are a kind local passer-by. Give simple, clear directions (turn left/right, go straight, it''s next to…), and check they understood.',
   'Politely stop someone and ask how to get to the train station.',
   'They ask for directions and confirm they understood the way.',
   array['Excuse me, how do I get to …?', 'Is it far from here?', 'Go straight / turn left / turn right', 'Thank you so much!'], 30),

  ('supermarket', 'At the supermarket', 'في السوبر ماركت', '🛒', 'shopping', 1, 3,
   'Inside a large supermarket. The learner can''t find an item and asks a staff member.',
   'You are a helpful store assistant. Help them find the item, mention the aisle, and offer one more bit of help.',
   'Ask where to find an item and whether they have a specific brand.',
   'They ask for help finding an item and understand where it is.',
   array['Excuse me, where can I find …?', 'Which aisle is it in?', 'Do you have …?', 'Thanks for your help.'], 40),

  ('introduce-yourself', 'Meeting someone new', 'تتعرّف على شخص جديد', '👋', 'social', 1, 2,
   'A relaxed gathering. The learner is introduced to a friendly new person.',
   'You are a warm, curious new acquaintance. Exchange names, ask where they''re from and what they do, and find one thing in common.',
   'Introduce yourself, say where you''re from, and ask about them.',
   'They introduce themselves and ask the other person two questions.',
   array['Hi, I''m …', 'Nice to meet you!', 'Where are you from?', 'What do you do?'], 50),

  ('taxi-ride', 'Taking a taxi', 'في سيارة الأجرة', '🚕', 'travel', 1, 3,
   'The learner gets into a taxi and needs to reach a destination.',
   'You are a friendly taxi driver. Confirm the destination, make a little small talk, and tell them the fare at the end.',
   'Tell the driver where you want to go and ask roughly how long it takes.',
   'They give the destination clearly and ask about time or price.',
   array['Could you take me to …?', 'How long will it take?', 'How much will it be?', 'You can stop here, thanks.'], 60),

  ('restaurant-order', 'Ordering at a restaurant', 'تطلب في مطعم', '🍽️', 'daily_life', 2, 4,
   'A nice restaurant at dinner time. The waiter comes to take the order.',
   'You are an attentive, friendly waiter. Recommend a dish, take their order, ask about drinks, and check if they need anything else.',
   'Order a starter and a main, ask the waiter for a recommendation.',
   'They order food, ask a question about the menu, and respond to the waiter.',
   array['Could I see the menu, please?', 'What do you recommend?', 'I''ll have the …', 'Could we get the bill, please?'], 70),

  ('hotel-checkin', 'Checking into a hotel', 'تسجيل الدخول في الفندق', '🏨', 'travel', 2, 4,
   'A hotel front desk. The learner arrives to check in for a reservation.',
   'You are a polite hotel receptionist. Confirm the booking, ask for a name, explain breakfast and Wi-Fi, and hand over the room.',
   'Check in under your name and ask about breakfast and Wi-Fi.',
   'They check in and ask at least two questions about the stay.',
   array['I have a reservation under …', 'What time is breakfast?', 'Is Wi-Fi included?', 'Could I get a wake-up call?'], 80),

  ('airport-checkin', 'Checking in at the airport', 'تسجيل الوصول في المطار', '✈️', 'travel', 2, 4,
   'An airline check-in desk before a flight. The learner approaches with a passport.',
   'You are a courteous airline check-in agent. Ask for the passport, confirm the destination, ask about bags and seat preference, and give the boarding details.',
   'Check in for your flight, check a bag, and ask for a window seat.',
   'They check in, mention their bag, and make a seat request.',
   array['I''d like to check in for the flight to …', 'I have one bag to check.', 'Could I get a window seat?', 'Which gate is it?'], 90),

  ('phone-appointment', 'Booking an appointment by phone', 'تحجز موعد بالهاتف', '📞', 'phone', 2, 4,
   'A phone call to a clinic to book an appointment. The learner cannot see the other person.',
   'You are a clinic receptionist on the phone. Greet them, ask what they need, offer a couple of time slots, take their name, and confirm.',
   'Call to book an appointment and agree on a day and time.',
   'They explain why they''re calling and confirm a specific time.',
   array['Hi, I''d like to book an appointment.', 'Do you have anything on …?', 'Morning would be better for me.', 'Let me confirm that.'], 100),

  ('doctor-visit', 'At the doctor', 'عند الطبيب', '🩺', 'health', 2, 4,
   'A doctor''s office. The learner describes how they''ve been feeling.',
   'You are a kind, calm doctor. Ask about the symptoms, how long it''s been, and give simple, reassuring advice.',
   'Describe a mild symptom (headache, sore throat…) and answer the doctor''s questions.',
   'They describe a symptom and answer follow-up questions clearly.',
   array['I''ve had a … for a few days.', 'It hurts when I …', 'Should I take anything?', 'Thank you, doctor.'], 110),

  ('invite-friend', 'Inviting a friend out', 'تدعو صديق للخروج', '🎉', 'social', 2, 4,
   'A casual chat with a friend. The learner wants to make plans for the weekend.',
   'You are a close, easygoing friend. React with interest, ask about details (when, where), maybe suggest an alternative, and agree on a plan.',
   'Invite your friend to do something and agree on a time and place.',
   'They make an invitation and settle on the details together.',
   array['Do you want to … this weekend?', 'Are you free on …?', 'How about we meet at …?', 'Sounds great, see you then!'], 120),

  ('make-complaint', 'Making a polite complaint', 'تقدّم شكوى بأدب', '🙋', 'daily_life', 3, 5,
   'A customer service desk. Something the learner bought isn''t working.',
   'You are a professional, helpful customer-service rep. Listen, apologise, ask for details, and offer a solution (refund/replacement).',
   'Explain the problem politely and ask for a refund or replacement.',
   'They describe the issue calmly and reach a resolution.',
   array['I''d like to report a problem with …', 'It stopped working after …', 'Could I get a refund or a replacement?', 'I appreciate your help.'], 130),

  ('job-interview', 'A job interview', 'مقابلة عمل', '💼', 'work', 3, 5,
   'A professional job interview. The learner is the candidate.',
   'You are a friendly but professional interviewer. Ask about their background, a strength, and why they want the role. Stay warm and encouraging.',
   'Introduce yourself, talk about your experience, and ask one question about the job.',
   'They answer interview questions confidently and ask one good question.',
   array['Thanks for having me.', 'In my previous role, I …', 'One of my strengths is …', 'Could you tell me more about the team?'], 140),

  ('meeting-opinion', 'Sharing your opinion in a meeting', 'تشارك رأيك في اجتماع', '🗣️', 'work', 3, 5,
   'A team meeting. The learner is asked for their opinion on a proposal.',
   'You are a respectful colleague leading a short discussion. Ask for their view, gently push back once, and look for agreement.',
   'Give your opinion on a plan, support it with a reason, and respond to a counter-point.',
   'They state an opinion, give a reason, and respond to push-back.',
   array['In my opinion, …', 'I think we should … because …', 'That''s a good point, but …', 'Could we try …?'], 150),

  ('returning-item', 'Returning something to a shop', 'ترجع منتج للمتجر', '🔁', 'shopping', 2, 4,
   'A shop''s returns counter. The learner wants to return an item bought recently.',
   'You are a polite shop assistant at the returns desk. Ask why they''re returning it, whether they have the receipt, and process the return.',
   'Explain why you''re returning the item and ask for a refund.',
   'They explain the return and complete it with the assistant.',
   array['I''d like to return this, please.', 'It''s the wrong size.', 'Here''s the receipt.', 'Can I get my money back?'], 160)

on conflict (slug) do update set
  title_en      = excluded.title_en,
  title_ar      = excluded.title_ar,
  emoji         = excluded.emoji,
  category      = excluded.category,
  level_min     = excluded.level_min,
  level_max     = excluded.level_max,
  situation_en  = excluded.situation_en,
  ai_role       = excluded.ai_role,
  student_role  = excluded.student_role,
  goal_en       = excluded.goal_en,
  useful_phrases = excluded.useful_phrases,
  sort_order    = excluded.sort_order,
  is_published  = true;
