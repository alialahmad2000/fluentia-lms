-- Migration 028: Seed test question bank for adaptive testing
-- 100 questions across skills and levels for the adaptive testing engine

INSERT INTO test_questions (skill, level, difficulty, question_type, question_text, question_text_ar, options, correct_answer, explanation, explanation_ar, grammar_topic) VALUES

-- ═══════════════════════════════════════════════════════════
-- GRAMMAR — Level 1 (A1)
-- ═══════════════════════════════════════════════════════════
('grammar', 1, 0.25, 'mcq', 'She ___ a student.', 'هي ___ طالبة', '["am", "is", "are", "be"]', 'is', 'We use "is" with he/she/it.', 'نستخدم "is" مع he/she/it', 'be_verb'),
('grammar', 1, 0.30, 'mcq', 'I ___ from Saudi Arabia.', 'أنا ___ من السعودية', '["is", "am", "are", "be"]', 'am', 'We use "am" with I.', 'نستخدم "am" مع I', 'be_verb'),
('grammar', 1, 0.35, 'mcq', 'They ___ happy today.', 'هم ___ سعداء اليوم', '["is", "am", "are", "was"]', 'are', 'We use "are" with they/we/you.', 'نستخدم "are" مع they/we/you', 'be_verb'),
('grammar', 1, 0.40, 'mcq', 'He ___ to school every day.', 'هو ___ للمدرسة كل يوم', '["go", "goes", "going", "gone"]', 'goes', 'We add -s/-es for he/she/it in present simple.', 'نضيف s/es مع he/she/it في المضارع البسيط', 'present_simple'),
('grammar', 1, 0.45, 'mcq', 'She ___ breakfast at 7 AM.', 'هي ___ الفطور الساعة 7', '["have", "has", "having", "had"]', 'has', '"Has" is used with he/she/it in present simple.', 'نستخدم "has" مع he/she/it في المضارع البسيط', 'present_simple'),

-- GRAMMAR — Level 2 (A2)
('grammar', 2, 0.35, 'mcq', 'I ___ to the mall yesterday.', 'أنا ___ للمول أمس', '["go", "goes", "went", "going"]', 'went', '"Went" is the past tense of "go".', '"went" هي صيغة الماضي من "go"', 'past_simple'),
('grammar', 2, 0.40, 'mcq', 'She ___ a cake last night.', 'هي ___ كعكة أمس بالليل', '["make", "makes", "made", "making"]', 'made', '"Made" is the past tense of "make".', '"made" هي صيغة الماضي من "make"', 'past_simple'),
('grammar', 2, 0.45, 'mcq', 'We are going ___ visit our family.', 'نحن رايحين ___ نزور عائلتنا', '["for", "to", "at", "in"]', 'to', 'We use "going to" for future plans.', 'نستخدم "going to" للخطط المستقبلية', 'going_to'),
('grammar', 2, 0.50, 'mcq', 'You ___ eat more vegetables.', 'لازم ___ تاكل خضار أكثر', '["should", "can", "will", "would"]', 'should', '"Should" is used for advice.', 'نستخدم "should" للنصيحة', 'modals'),
('grammar', 2, 0.55, 'mcq', 'This book is ___ than that one.', 'هذا الكتاب ___ من ذاك', '["interesting", "more interesting", "most interesting", "interestinger"]', 'more interesting', 'Long adjectives use "more" for comparatives.', 'الصفات الطويلة تستخدم "more" للمقارنة', 'comparatives'),

-- GRAMMAR — Level 3 (B1)
('grammar', 3, 0.45, 'mcq', 'I have ___ in this city for five years.', 'أنا ساكن في هذي المدينة ___ خمس سنوات', '["live", "lived", "living", "been living"]', 'lived', 'Present perfect: have + past participle.', 'المضارع التام: have + التصريف الثالث', 'present_perfect'),
('grammar', 3, 0.50, 'mcq', 'If it rains, I ___ stay home.', 'إذا مطرت، ___ أقعد في البيت', '["will", "would", "had", "might have"]', 'will', 'First conditional: If + present simple, will + base verb.', 'الشرط الأول: إذا + مضارع بسيط، will + الفعل', 'first_conditional'),
('grammar', 3, 0.55, 'mcq', 'The window ___ by the storm last night.', 'النافذة ___ من العاصفة أمس', '["broke", "was broken", "has broken", "breaking"]', 'was broken', 'Past simple passive: was/were + past participle.', 'المبني للمجهول: was/were + التصريف الثالث', 'passive_voice'),
('grammar', 3, 0.60, 'mcq', 'She asked me where I ___.', 'سألتني وين ___', '["live", "lived", "living", "do live"]', 'lived', 'In reported speech, present becomes past.', 'في الكلام المنقول، المضارع يتحول لماضي', 'reported_speech'),
('grammar', 3, 0.65, 'mcq', 'I used to ___ football when I was young.', 'كنت ___ كرة قدم لما كنت صغير', '["play", "played", "playing", "plays"]', 'play', '"Used to" is followed by base form of the verb.', '"used to" يأتي بعدها الفعل بصيغته الأساسية', 'used_to'),

-- GRAMMAR — Level 4 (B2)
('grammar', 4, 0.55, 'mcq', 'If I had studied harder, I ___ the exam.', 'لو درست أكثر، كنت ___ الاختبار', '["pass", "passed", "would pass", "would have passed"]', 'would have passed', 'Third conditional: If + past perfect, would have + past participle.', 'الشرط الثالث: لو + ماضي تام، would have + التصريف الثالث', 'third_conditional'),
('grammar', 4, 0.60, 'mcq', 'I wish I ___ more time to travel.', 'أتمنى لو ___ وقت أكثر للسفر', '["have", "had", "would have", "having"]', 'had', 'Wish + past simple for present unreal situations.', 'نستخدم wish + ماضي بسيط للأمنيات الحالية', 'wish_conditionals'),
('grammar', 4, 0.65, 'mcq', 'The report ___ by the team by next Friday.', 'التقرير ___ من الفريق قبل الجمعة', '["will complete", "will be completed", "has completed", "completes"]', 'will be completed', 'Future passive: will be + past participle.', 'المبني للمجهول المستقبلي: will be + التصريف الثالث', 'passive_voice'),
('grammar', 4, 0.70, 'mcq', 'Not only ___ he arrive late, but he also forgot the documents.', 'ليس فقط ___ متأخر، بل نسى الأوراق أيضاً', '["did", "does", "has", "was"]', 'did', 'Inversion after "Not only" for emphasis.', 'انقلاب ترتيب الجملة بعد "Not only" للتأكيد', 'inversion'),
('grammar', 4, 0.75, 'mcq', 'She speaks as if she ___ a native speaker.', 'تتكلم وكأنها ___ متحدثة أصلية', '["is", "was", "were", "be"]', 'were', 'Subjunctive mood: "as if" + were (for unreal).', 'صيغة الشرط: "as if" + were (لغير الحقيقي)', 'subjunctive'),

-- GRAMMAR — Level 5 (C1)
('grammar', 5, 0.65, 'mcq', '___ had the government acted sooner, the crisis could have been averted.', '___ تصرفت الحكومة أبكر، كان ممكن تجنب الأزمة', '["If", "Had", "Should", "Were"]', 'Had', 'Inverted conditional: Had + subject + past participle.', 'الشرط المعكوس: Had + الفاعل + التصريف الثالث', 'inversion'),
('grammar', 5, 0.70, 'mcq', 'What concerns me most ___ the lack of transparency.', 'اللي يقلقني أكثر ___ عدم الشفافية', '["are", "is", "were", "being"]', 'is', 'Cleft sentence: "What" clause takes singular verb.', 'جملة التركيز: عبارة "What" تأخذ فعل مفرد', 'cleft_sentences'),
('grammar', 5, 0.75, 'mcq', 'Under no circumstances ___ this information be shared.', 'تحت أي ظرف ___ مشاركة هذه المعلومات', '["should", "must", "can", "will"]', 'should', 'Negative adverbial + inversion for formal emphasis.', 'الظرف السلبي + انقلاب للتأكيد الرسمي', 'inversion'),
('grammar', 5, 0.80, 'mcq', 'The nominalization of the verb "decide" is ___.', 'تحويل الفعل "decide" لاسم يصبح ___', '["deciding", "decided", "decision", "decisive"]', 'decision', 'Nominalization: converting verbs to noun forms.', 'التسمية: تحويل الأفعال لصيغ اسمية', 'nominalization'),
('grammar', 5, 0.85, 'mcq', 'It is imperative that he ___ the meeting.', 'من الضروري أنه ___ الاجتماع', '["attends", "attend", "attended", "attending"]', 'attend', 'Subjunctive after "imperative that": base form.', 'بعد "imperative that" نستخدم صيغة المصدر', 'subjunctive'),

-- ═══════════════════════════════════════════════════════════
-- VOCABULARY — Level 1 (A1)
-- ═══════════════════════════════════════════════════════════
('vocabulary', 1, 0.25, 'mcq', 'What is the opposite of "big"?', 'ما عكس "big"?', '["small", "tall", "fast", "old"]', 'small', 'Big = كبير, Small = صغير', 'big = كبير، small = صغير', null),
('vocabulary', 1, 0.30, 'mcq', 'Which word means "happy"?', 'أي كلمة تعني "سعيد"?', '["sad", "glad", "mad", "bad"]', 'glad', 'Glad = happy = سعيد', 'glad = happy = سعيد', null),
('vocabulary', 1, 0.35, 'mcq', '"Breakfast" is a meal you eat in the ___.', '"الفطور" هي وجبة تأكلها في ___', '["morning", "evening", "night", "afternoon"]', 'morning', 'Breakfast = the first meal of the day.', 'الفطور = أول وجبة في اليوم', null),
('vocabulary', 1, 0.40, 'mcq', 'A "doctor" works in a ___.', '"الطبيب" يشتغل في ___', '["school", "hospital", "restaurant", "bank"]', 'hospital', 'Doctor = طبيب, Hospital = مستشفى', 'Doctor = طبيب، Hospital = مستشفى', null),
('vocabulary', 1, 0.45, 'mcq', 'Which word means "brother"?', 'أي كلمة تعني "أخ"?', '["sister", "brother", "father", "mother"]', 'brother', 'Brother = أخ', 'brother = أخ', null),

-- VOCABULARY — Level 2 (A2)
('vocabulary', 2, 0.40, 'mcq', 'A person who flies a plane is called a ___.', 'الشخص اللي يسوق الطيارة اسمه ___', '["driver", "pilot", "captain", "engineer"]', 'pilot', 'Pilot = طيار', 'pilot = طيار', null),
('vocabulary', 2, 0.45, 'mcq', '"Luggage" means ___.', '"Luggage" تعني ___', '["tickets", "passport", "bags and suitcases", "souvenirs"]', 'bags and suitcases', 'Luggage = الأمتعة والحقائب', 'luggage = الأمتعة والحقائب', null),
('vocabulary', 2, 0.50, 'mcq', 'To "postpone" means to ___.', '"Postpone" تعني ___', '["cancel", "delay", "start", "finish"]', 'delay', 'Postpone = تأجيل', 'postpone = تأجيل', null),
('vocabulary', 2, 0.55, 'mcq', 'Which word describes the weather when it''s very hot?', 'أي كلمة تصف الطقس لما يكون حار جداً?', '["freezing", "cool", "scorching", "mild"]', 'scorching', 'Scorching = حار جداً (لاذع)', 'scorching = حار جداً', null),
('vocabulary', 2, 0.60, 'mcq', '"Exhausted" means very ___.', '"Exhausted" تعني ___ جداً', '["hungry", "tired", "happy", "angry"]', 'tired', 'Exhausted = منهك/تعبان جداً', 'exhausted = منهك جداً', null),

-- VOCABULARY — Level 3 (B1)
('vocabulary', 3, 0.50, 'mcq', '"Deadline" means ___.', '"Deadline" تعني ___', '["the last date to complete something", "a death sentence", "a fast line", "a new beginning"]', 'the last date to complete something', 'Deadline = الموعد النهائي', 'deadline = الموعد النهائي', null),
('vocabulary', 3, 0.55, 'mcq', 'To "compromise" means to ___.', '"Compromise" تعني ___', '["fight", "agree by both sides giving something", "win completely", "ignore"]', 'agree by both sides giving something', 'Compromise = حل وسط', 'compromise = حل وسط / تسوية', null),
('vocabulary', 3, 0.60, 'mcq', '"Efficient" means ___.', '"Efficient" تعني ___', '["slow and careful", "producing results with minimum waste", "very expensive", "complicated"]', 'producing results with minimum waste', 'Efficient = فعّال/كفء', 'efficient = فعّال', null),
('vocabulary', 3, 0.65, 'mcq', 'A "colleague" is ___.', '"Colleague" هو ___', '["a family member", "a neighbor", "a person you work with", "a classmate"]', 'a person you work with', 'Colleague = زميل عمل', 'colleague = زميل عمل', null),
('vocabulary', 3, 0.70, 'mcq', '"To withdraw" money means to ___.', '"Withdraw" المال تعني ___', '["deposit money", "take money out", "save money", "invest money"]', 'take money out', 'Withdraw = سحب', 'withdraw = سحب (من الحساب)', null),

-- VOCABULARY — Level 4 (B2)
('vocabulary', 4, 0.60, 'mcq', '"Ambiguous" means ___.', '"Ambiguous" تعني ___', '["clear", "having more than one meaning", "wrong", "simple"]', 'having more than one meaning', 'Ambiguous = غامض/ملتبس', 'ambiguous = غامض، يحمل أكثر من معنى', null),
('vocabulary', 4, 0.65, 'mcq', '"To advocate" means to ___.', '"Advocate" تعني ___', '["argue against", "publicly support", "investigate", "avoid"]', 'publicly support', 'Advocate = يدافع عن / يؤيد', 'advocate = يدافع عن / يؤيد علناً', null),
('vocabulary', 4, 0.70, 'mcq', '"Mitigate" means to ___.', '"Mitigate" تعني ___', '["make worse", "make less severe", "eliminate", "increase"]', 'make less severe', 'Mitigate = يخفف/يقلل من حدة', 'mitigate = يخفف من حدة الشيء', null),
('vocabulary', 4, 0.75, 'mcq', '"Unprecedented" means ___.', '"Unprecedented" تعني ___', '["expected", "repeated", "never happened before", "usual"]', 'never happened before', 'Unprecedented = غير مسبوق', 'unprecedented = غير مسبوق، لم يحدث من قبل', null),
('vocabulary', 4, 0.80, 'mcq', '"Paradigm" means ___.', '"Paradigm" تعني ___', '["a small example", "a model or pattern of thinking", "a paragraph", "a paradox"]', 'a model or pattern of thinking', 'Paradigm = نموذج فكري', 'paradigm = نموذج فكري / إطار مرجعي', null),

-- VOCABULARY — Level 5 (C1)
('vocabulary', 5, 0.70, 'mcq', '"Ubiquitous" means ___.', '"Ubiquitous" تعني ___', '["rare", "present everywhere", "invisible", "expensive"]', 'present everywhere', 'Ubiquitous = منتشر في كل مكان', 'ubiquitous = موجود في كل مكان', null),
('vocabulary', 5, 0.75, 'mcq', '"Pragmatic" means ___.', '"Pragmatic" تعني ___', '["idealistic", "practical and realistic", "theoretical", "emotional"]', 'practical and realistic', 'Pragmatic = عملي وواقعي', 'pragmatic = عملي وواقعي', null),
('vocabulary', 5, 0.80, 'mcq', '"Dichotomy" means ___.', '"Dichotomy" تعني ___', '["similarity", "a division into two opposing parts", "a democracy", "a dictionary"]', 'a division into two opposing parts', 'Dichotomy = انقسام/ثنائية', 'dichotomy = انقسام إلى قسمين متعارضين', null),
('vocabulary', 5, 0.85, 'mcq', '"Ephemeral" means ___.', '"Ephemeral" تعني ___', '["eternal", "lasting a very short time", "important", "physical"]', 'lasting a very short time', 'Ephemeral = سريع الزوال/مؤقت', 'ephemeral = سريع الزوال، عابر', null),
('vocabulary', 5, 0.90, 'mcq', '"Sycophant" means ___.', '"Sycophant" تعني ___', '["a wise person", "a person who flatters for advantage", "a pessimist", "a scientist"]', 'a person who flatters for advantage', 'Sycophant = متملّق', 'sycophant = متملّق / مداهن للمصلحة', null),

-- ═══════════════════════════════════════════════════════════
-- READING — Level 1-2 (A1-A2)
-- ═══════════════════════════════════════════════════════════
('reading', 1, 0.30, 'mcq', 'Read: "My name is Ahmed. I am 25 years old. I live in Riyadh." — Where does Ahmed live?', 'اقرأ: "اسمي أحمد. عمري ٢٥ سنة. أسكن في الرياض." — وين يسكن أحمد?', '["Jeddah", "Riyadh", "Dubai", "Cairo"]', 'Riyadh', 'The text says "I live in Riyadh".', 'النص يقول "I live in Riyadh"', null),
('reading', 1, 0.35, 'mcq', 'Read: "Sara likes coffee. She drinks it every morning." — What does Sara drink every morning?', 'سارة تحب القهوة. تشربها كل صباح. — ماذا تشرب سارة كل صباح?', '["tea", "coffee", "juice", "water"]', 'coffee', 'The text says Sara drinks coffee every morning.', 'النص يقول سارة تشرب القهوة كل صباح', null),
('reading', 2, 0.45, 'mcq', 'Read: "Last summer, we traveled to Turkey. The weather was warm and we visited many beautiful places." — When did they travel?', 'الصيف الماضي سافرنا لتركيا. الطقس كان دافئ وزرنا أماكن جميلة. — متى سافروا?', '["Last winter", "Last summer", "Next month", "Yesterday"]', 'Last summer', 'The text begins with "Last summer".', 'النص يبدأ بـ "Last summer" = الصيف الماضي', null),
('reading', 2, 0.50, 'mcq', 'Read: "Technology has changed how we communicate. Today, people can video call anyone in the world." — What has technology changed?', 'التقنية غيرت طريقة تواصلنا. اليوم الناس تقدر تتصل فيديو مع أي شخص في العالم. — ماذا غيرت التقنية?', '["food", "communication", "weather", "sports"]', 'communication', 'The text says technology changed "how we communicate".', 'النص يقول التقنية غيرت "طريقة تواصلنا"', null),

-- READING — Level 3-4 (B1-B2)
('reading', 3, 0.55, 'mcq', 'Read: "Working from home has advantages and disadvantages. While it saves time on commuting, it can lead to isolation." — What is a disadvantage mentioned?', 'العمل من البيت له مميزات وعيوب. يوفر وقت المواصلات لكن ممكن يسبب العزلة. — ما العيب المذكور?', '["Saving time", "Isolation", "More money", "Better food"]', 'Isolation', 'The text mentions isolation as a disadvantage.', 'النص يذكر العزلة كعيب', null),
('reading', 3, 0.60, 'mcq', 'Read: "The study found that students who sleep at least 8 hours perform 20% better on exams." — What did the study find?', 'الدراسة وجدت أن الطلاب اللي ينامون 8 ساعات على الأقل أداؤهم أفضل 20% في الامتحانات. — ماذا وجدت الدراسة?', '["Sleep is not important", "8 hours of sleep improves exam performance", "Students should study at night", "Exams are easy"]', '8 hours of sleep improves exam performance', 'Sleeping 8+ hours leads to 20% better performance.', 'النوم 8 ساعات يؤدي لأداء أفضل 20%', null),
('reading', 4, 0.65, 'mcq', 'Read: "The author argues that sustainable development requires balancing economic growth with environmental protection." — What is the author''s main argument?', 'الكاتب يقول أن التنمية المستدامة تتطلب التوازن بين النمو الاقتصادي وحماية البيئة. — ما الحجة الرئيسية للكاتب?', '["Economic growth is most important", "Environment should be the only priority", "Balance between economy and environment", "Development is unnecessary"]', 'Balance between economy and environment', 'The author emphasizes balancing both aspects.', 'الكاتب يؤكد على التوازن بين الجانبين', null),
('reading', 4, 0.70, 'mcq', 'The word "mitigate" in the passage most likely means ___.', 'كلمة "mitigate" في النص على الأرجح تعني ___', '["to increase", "to eliminate", "to reduce the severity of", "to ignore"]', 'to reduce the severity of', 'Mitigate = to make less severe.', 'mitigate = تخفيف الحدة', null),

-- READING — Level 5 (C1)
('reading', 5, 0.75, 'mcq', 'The author''s use of irony in the passage serves to ___.', 'استخدام الكاتب للسخرية في النص يهدف إلى ___', '["confuse the reader", "highlight contradictions in the argument", "add humor only", "show agreement"]', 'highlight contradictions in the argument', 'Irony is used as a rhetorical device to expose contradictions.', 'السخرية أداة بلاغية لكشف التناقضات', null),
('reading', 5, 0.80, 'mcq', 'Which of the following best describes the author''s tone?', 'أي مما يلي يصف لهجة الكاتب بشكل أفضل?', '["enthusiastic", "cautiously optimistic", "indifferent", "hostile"]', 'cautiously optimistic', 'The author shows hope but with reservations.', 'الكاتب يظهر أمل لكن مع تحفظات', null),

-- ═══════════════════════════════════════════════════════════
-- LISTENING — Levels 1-5 (simulated as reading comprehension)
-- ═══════════════════════════════════════════════════════════
('listening', 1, 0.30, 'mcq', '[Audio transcript] "Hello, my name is Ali. I am a teacher. I work at a school." — What is Ali''s job?', '[نص صوتي] "مرحباً، اسمي علي. أنا معلم. أشتغل في مدرسة." — ما وظيفة علي?', '["Doctor", "Teacher", "Engineer", "Driver"]', 'Teacher', 'Ali says "I am a teacher".', 'علي يقول "I am a teacher"', null),
('listening', 1, 0.35, 'mcq', '[Audio] "The train leaves at 3:30 PM from platform 2." — What time does the train leave?', '[صوتي] "القطار يطلع الساعة 3:30 من رصيف 2." — متى يطلع القطار?', '["2:30 PM", "3:30 PM", "3:00 PM", "4:30 PM"]', '3:30 PM', 'The announcement says 3:30 PM.', 'الإعلان يقول 3:30 مساءً', null),
('listening', 2, 0.45, 'mcq', '[Audio] "I went to the supermarket and bought milk, bread, and some fruit. Then I went home and cooked dinner." — What did the speaker do after shopping?', '[صوتي] رحت السوبرماركت وشريت حليب وخبز وفواكه. بعدين رجعت البيت وطبخت عشا. — ماذا فعل بعد التسوق?', '["Went to work", "Cooked dinner", "Watched TV", "Called a friend"]', 'Cooked dinner', 'After shopping, the speaker went home and cooked dinner.', 'بعد التسوق، رجع البيت وطبخ عشا', null),
('listening', 2, 0.50, 'mcq', '[Audio] "Excuse me, could you tell me where the nearest pharmacy is? — Yes, go straight and turn left at the traffic light." — Where is the pharmacy?', '[صوتي] لو سمحت، وين أقرب صيدلية؟ — امشِ على طول ولف يسار عند الإشارة. — وين الصيدلية?', '["Turn right", "Go straight then left at traffic light", "Behind the bank", "Next to the school"]', 'Go straight then left at traffic light', 'The directions say straight then left at the traffic light.', 'التوجيهات: على طول ثم يسار عند الإشارة', null),
('listening', 3, 0.55, 'mcq', '[Audio lecture] "The main cause of global warming is the increase in greenhouse gases, particularly CO2." — What is identified as the main cause?', '[محاضرة صوتية] السبب الرئيسي للاحتباس الحراري هو زيادة غازات الدفيئة خاصة CO2. — ما السبب الرئيسي?', '["Deforestation", "Greenhouse gases", "Water pollution", "Overpopulation"]', 'Greenhouse gases', 'The lecture identifies greenhouse gases as the main cause.', 'المحاضرة تحدد غازات الدفيئة كسبب رئيسي', null),
('listening', 3, 0.60, 'mcq', '[Audio interview] "I believe education should be practical, not just theoretical." — What is the speaker''s opinion?', '[مقابلة] أعتقد أن التعليم لازم يكون عملي مو بس نظري. — ما رأي المتحدث?', '["Education should be only theoretical", "Education should be practical", "Education is not important", "Students should not study"]', 'Education should be practical', 'The speaker advocates for practical education.', 'المتحدث يدعو للتعليم العملي', null),
('listening', 4, 0.65, 'mcq', '[Audio debate] "While some argue renewable energy is too expensive, the long-term benefits far outweigh initial costs." — What is the speaker''s stance?', '[مناظرة] البعض يقول الطاقة المتجددة غالية، لكن الفوائد طويلة المدى تفوق التكاليف. — ما موقف المتحدث?', '["Renewable energy is too expensive", "Benefits of renewable energy outweigh costs", "Traditional energy is better", "Cost does not matter"]', 'Benefits of renewable energy outweigh costs', 'The speaker argues benefits outweigh costs.', 'المتحدث يقول الفوائد تفوق التكاليف', null),
('listening', 4, 0.70, 'mcq', '[Audio] The speaker implies that the policy change was ___.',  '[صوتي] المتحدث يلمح أن تغيير السياسة كان ___', '["well-planned", "rushed and poorly considered", "unnecessary", "popular with everyone"]', 'rushed and poorly considered', 'The speaker''s tone and word choice suggest criticism.', 'نبرة وألفاظ المتحدث تشير للانتقاد', null),
('listening', 5, 0.75, 'mcq', '[Academic lecture] The professor''s use of the phrase "at best, a temporary solution" suggests ___.', '[محاضرة أكاديمية] استخدام الأستاذ لعبارة "في أفضل الأحوال، حل مؤقت" يشير إلى ___', '["strong approval", "skepticism about long-term effectiveness", "indifference", "full agreement"]', 'skepticism about long-term effectiveness', '"At best" indicates a low expectation — skepticism.', '"at best" تشير لتوقعات منخفضة — تشكك', null),
('listening', 5, 0.80, 'mcq', '[Audio discussion] What can be inferred about the speaker''s attitude toward globalization?', '[مناقشة] ماذا يمكن استنتاجه عن موقف المتحدث من العولمة?', '["Fully supportive", "Critical but acknowledges benefits", "Completely against", "Has no opinion"]', 'Critical but acknowledges benefits', 'The speaker balances criticism with acknowledgment.', 'المتحدث يوازن بين النقد والاعتراف بالفوائد', null)

ON CONFLICT DO NOTHING;
