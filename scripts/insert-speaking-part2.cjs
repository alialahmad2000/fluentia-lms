require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insertPart2() {
  const { data: existing } = await supabase.from('ielts_speaking_questions').select('id').eq('part', 2);
  if (existing && existing.length > 0) {
    console.log('Part 2 already exists:', existing.length, 'records. Skipping.');
    return;
  }

  const cueCards = [
    {
      part: 2, sort_order: 21, is_published: true,
      topic: 'Describe a teacher who influenced you',
      cue_card: {
        prompt: 'Describe a teacher who had a significant influence on you.',
        bullet_points: ['Who this teacher was', 'What subject they taught', 'What made them special', 'How they influenced you'],
        preparation_tips_ar: 'اكتب اسم المعلم/ة والمادة. فكر في موقف محدد يوضح تأثيرهم عليك. رتب إجابتك: من، ماذا، لماذا.',
        model_answer_outline: 'Introduction (who & when) → Subject and teaching style → Specific memorable incident → Long-term impact on your life/career choices'
      },
      questions: [
        { q: 'Describe a teacher who had a significant influence on you.' }
      ],
      useful_phrases: ['had a profound impact on', 'inspired me to', 'went above and beyond', 'shaped my perspective', 'passionate about teaching', 'encouraged us to think critically', 'made the subject come alive', 'I owe my interest in... to'],
      model_answer_text: 'Vocabulary: influential, dedicated, approachable, knowledgeable, patient, supportive, innovative, motivating, mentor, role model',
      band_descriptors: {
        grammar_structures: ['Past simple for narratives', 'Used to for regular past actions', 'Would + infinitive for past habits', 'Third conditional for hypothetical outcomes'],
        common_mistakes_ar: ['خطأ: She teached me → صح: She taught me', 'خطأ: She was very good to explain → صح: She was very good at explaining', 'لا تنسَ استخدام الماضي عند الحديث عن تجربة سابقة']
      }
    },
    {
      part: 2, sort_order: 22, is_published: true,
      topic: 'Describe a place you visited recently',
      cue_card: {
        prompt: 'Describe a place you visited recently that left an impression on you.',
        bullet_points: ['Where this place was', 'When and why you went there', 'What you did there', 'Why it left an impression on you'],
        preparation_tips_ar: 'حدد المكان والوقت. فكر في التفاصيل الحسية: ماذا رأيت، سمعت، شممت. اذكر مشاعرك.',
        model_answer_outline: 'Setting the scene (location, time, companions) → Description of the place → Activities and experiences → Why it was memorable and would you return'
      },
      questions: [
        { q: 'Describe a place you visited recently that left an impression on you.' }
      ],
      useful_phrases: ['nestled in the heart of', 'breathtaking scenery', 'a feast for the eyes', 'steeped in history', 'off the beaten track', 'left a lasting impression', 'I was struck by', 'worth visiting'],
      model_answer_text: 'Vocabulary: picturesque, bustling, tranquil, vibrant, spectacular, charming, atmospheric, stunning, captivating, awe-inspiring',
      band_descriptors: {
        grammar_structures: ['Past simple and continuous for narratives', 'Passive voice for descriptions', 'Relative clauses for adding detail', 'So + adjective + that for emphasis'],
        common_mistakes_ar: ['خطأ: I went to there → صح: I went there', 'خطأ: It was very beauty → صح: It was very beautiful', 'تجنب استخدام nice وgood فقط. نوّع صفاتك.']
      }
    },
    {
      part: 2, sort_order: 23, is_published: true,
      topic: 'Describe a book you enjoyed reading',
      cue_card: {
        prompt: 'Describe a book you read recently that you particularly enjoyed.',
        bullet_points: ['What the book was about', 'How you found out about it', 'Why you enjoyed reading it', 'Whether you would recommend it to others'],
        preparation_tips_ar: 'اختر كتاب قرأته فعلا. لخص القصة في جملتين. ركز على ما أعجبك ولماذا تنصح به.',
        model_answer_outline: 'Book title and genre → Brief plot/content summary → What made it engaging → Personal takeaway and recommendation'
      },
      questions: [
        { q: 'Describe a book you read recently that you particularly enjoyed.' }
      ],
      useful_phrases: ['page-turner', 'I could not put it down', 'thought-provoking', 'resonated with me', 'highly recommended', 'a must-read', 'opened my eyes to', 'beautifully written'],
      model_answer_text: 'Vocabulary: compelling, gripping, insightful, relatable, genre, protagonist, narrative, theme, plot twist, bestseller',
      band_descriptors: {
        grammar_structures: ['Past simple for narrating the story', 'Present simple for recommending', 'Reported speech for quoting', 'It made me realize/think about'],
        common_mistakes_ar: ['خطأ: The book was talking about → صح: The book was about / dealt with', 'خطأ: I finished to read it → صح: I finished reading it', 'استخدم أفعال متنوعة مثل explore, delve into, portray']
      }
    },
    {
      part: 2, sort_order: 24, is_published: true,
      topic: 'Describe a celebration or festival you attended',
      cue_card: {
        prompt: 'Describe a celebration or festival that you attended and enjoyed.',
        bullet_points: ['What the celebration was', 'When and where it took place', 'What happened during the event', 'Why you enjoyed it'],
        preparation_tips_ar: 'اختر مناسبة واضحة: عيد، حفل تخرج، مهرجان. صف الأجواء والناس والأنشطة بالتفصيل.',
        model_answer_outline: 'Event name and occasion → Setting and attendees → Key activities and highlights → Personal feelings and significance'
      },
      questions: [
        { q: 'Describe a celebration or festival that you attended and enjoyed.' }
      ],
      useful_phrases: ['festive atmosphere', 'in full swing', 'a joyous occasion', 'brought people together', 'steeped in tradition', 'the highlight of the event', 'decorated with', 'a sense of community'],
      model_answer_text: 'Vocabulary: vibrant, lively, memorable, ceremonial, gathering, reunion, feast, customs, heritage, spectacular',
      band_descriptors: {
        grammar_structures: ['Past continuous for setting the scene', 'Past simple for events', 'There was/were for descriptions', 'Adjective + noun collocations'],
        common_mistakes_ar: ['خطأ: We were very enjoy → صح: We really enjoyed ourselves', 'خطأ: All the people was happy → صح: All the people were happy', 'استخدم تعبيرات وصفية عن الأجواء بدل كلمة fun فقط']
      }
    },
    {
      part: 2, sort_order: 25, is_published: true,
      topic: 'Describe a skill you learned recently',
      cue_card: {
        prompt: 'Describe a new skill you learned recently.',
        bullet_points: ['What the skill is', 'How you learned it', 'How long it took you', 'How this skill has been useful'],
        preparation_tips_ar: 'اختر مهارة حقيقية تعلمتها: طبخ، قيادة، برمجة. صف الصعوبات والإنجازات.',
        model_answer_outline: 'What skill and motivation to learn → Learning process and resources → Challenges faced → Current level and practical benefits'
      },
      questions: [
        { q: 'Describe a new skill you learned recently.' }
      ],
      useful_phrases: ['steep learning curve', 'trial and error', 'picked it up quickly', 'practice makes perfect', 'hands-on experience', 'came naturally to me', 'out of my comfort zone', 'rewarding experience'],
      model_answer_text: 'Vocabulary: proficient, competent, novice, self-taught, tutorial, determination, perseverance, breakthrough, milestone, versatile',
      band_descriptors: {
        grammar_structures: ['Present perfect for results', 'Past simple for the learning process', 'Gerunds as subjects', 'It took me + time + to infinitive'],
        common_mistakes_ar: ['خطأ: I learned since 2 months → صح: I learned it two months ago', 'خطأ: It was difficult to me → صح: It was difficult for me', 'استخدم تعبيرات متنوعة عن التعلم مثل master, get the hang of']
      }
    },
    {
      part: 2, sort_order: 26, is_published: true,
      topic: 'Describe a person you admire',
      cue_card: {
        prompt: 'Describe a person you admire and look up to.',
        bullet_points: ['Who this person is', 'How you know about them', 'What qualities they have', 'Why you admire them'],
        preparation_tips_ar: 'اختر شخص تعرفه شخصيا أو شخصية عامة. ركز على صفاته وتأثيره عليك.',
        model_answer_outline: 'Introduction (relationship/how you know them) → Key character traits → Specific examples of admirable actions → Impact on your life and values'
      },
      questions: [
        { q: 'Describe a person you admire and look up to.' }
      ],
      useful_phrases: ['look up to', 'a source of inspiration', 'leads by example', 'has a strong work ethic', 'selfless and generous', 'overcame adversity', 'a role model for', 'embodies the qualities of'],
      model_answer_text: 'Vocabulary: admirable, compassionate, resilient, determined, humble, visionary, principled, courageous, charismatic, devoted',
      band_descriptors: {
        grammar_structures: ['Present simple for qualities', 'Present perfect for achievements', 'Relative clauses for defining', 'What I admire most is...'],
        common_mistakes_ar: ['خطأ: He is a generous person that → صح: He is a generous person who', 'خطأ: I admire to him → صح: I admire him', 'صف الشخص بصفات متعددة ولا تكرر nice وgood']
      }
    },
    {
      part: 2, sort_order: 27, is_published: true,
      topic: 'Describe a trip that did not go as planned',
      cue_card: {
        prompt: 'Describe a trip or journey that did not go as you had planned.',
        bullet_points: ['Where you were going', 'What went wrong', 'How you dealt with the situation', 'What you learned from the experience'],
        preparation_tips_ar: 'اختر رحلة فيها مشكلة حقيقية: تأخير، ضياع، طقس سيء. صف المشكلة وكيف تعاملت معها.',
        model_answer_outline: 'Original plan and expectations → What went wrong (sequence of events) → How you handled it → Lessons learned and current perspective'
      },
      questions: [
        { q: 'Describe a trip or journey that did not go as you had planned.' }
      ],
      useful_phrases: ['things took a turn', 'it did not go according to plan', 'to make matters worse', 'on the bright side', 'learned to adapt', 'a blessing in disguise', 'looking back on it', 'every cloud has a silver lining'],
      model_answer_text: 'Vocabulary: unexpected, disrupted, stranded, frustrated, flexible, resourceful, memorable, mishap, detour, resilient',
      band_descriptors: {
        grammar_structures: ['Past perfect for earlier events', 'Past continuous for background', 'Despite + gerund for contrast', 'If I had known... (third conditional)'],
        common_mistakes_ar: ['خطأ: I was suppose to go → صح: I was supposed to go', 'خطأ: Despite I was tired → صح: Despite being tired', 'استخدم Past Perfect لتوضيح ترتيب الأحداث']
      }
    },
    {
      part: 2, sort_order: 28, is_published: true,
      topic: 'Describe a piece of technology you use daily',
      cue_card: {
        prompt: 'Describe a piece of technology that you use every day.',
        bullet_points: ['What the technology is', 'When you first started using it', 'What you use it for', 'How it has changed your daily life'],
        preparation_tips_ar: 'اختر جهاز أو تطبيق تستخدمه يوميا. صف كيف يساعدك وماذا ستفعل بدونه.',
        model_answer_outline: 'Device/app introduction → How you discovered/got it → Daily usage patterns → Life before vs after having it'
      },
      questions: [
        { q: 'Describe a piece of technology that you use every day.' }
      ],
      useful_phrases: ['I could not live without', 'streamlined my workflow', 'at my fingertips', 'user-friendly interface', 'cutting-edge technology', 'keeps me connected', 'multitask efficiently', 'an indispensable tool'],
      model_answer_text: 'Vocabulary: innovative, portable, versatile, seamless, intuitive, reliable, efficient, digital, automated, compatible',
      band_descriptors: {
        grammar_structures: ['Present simple for daily use', 'Present perfect for changes', 'Comparatives for before/after', 'Second conditional for hypothetical'],
        common_mistakes_ar: ['خطأ: I use it since 3 years → صح: I have used it for 3 years', 'خطأ: It is very benefit → صح: It is very beneficial', 'فرّق بين since (نقطة زمنية) وfor (مدة زمنية)']
      }
    },
    {
      part: 2, sort_order: 29, is_published: true,
      topic: 'Describe a time you helped someone',
      cue_card: {
        prompt: 'Describe a time when you helped someone who needed your assistance.',
        bullet_points: ['Who you helped', 'What they needed help with', 'How you helped them', 'How you felt afterwards'],
        preparation_tips_ar: 'اختر موقف حقيقي ساعدت فيه شخص. صف الموقف والمشاعر بالتفصيل.',
        model_answer_outline: 'Context and who needed help → The problem/situation → Your actions step by step → Outcome and your feelings'
      },
      questions: [
        { q: 'Describe a time when you helped someone who needed your assistance.' }
      ],
      useful_phrases: ['lend a hand', 'went out of my way to', 'it was the least I could do', 'made a difference', 'rewarding experience', 'without hesitation', 'put myself in their shoes', 'heartwarming moment'],
      model_answer_text: 'Vocabulary: compassionate, selfless, grateful, supportive, voluntary, initiative, empathy, contribution, assist, meaningful',
      band_descriptors: {
        grammar_structures: ['Past simple for the narrative', 'Past continuous for context', 'Felt + adjective for emotions', 'It turned out that...'],
        common_mistakes_ar: ['خطأ: I helped to him → صح: I helped him', 'خطأ: He was very thank → صح: He was very thankful/grateful', 'استخدم أفعال مشاعر متنوعة: gratified, fulfilled, proud']
      }
    },
    {
      part: 2, sort_order: 30, is_published: true,
      topic: 'Describe your favorite childhood memory',
      cue_card: {
        prompt: 'Describe a favorite memory from your childhood.',
        bullet_points: ['What the memory is about', 'How old you were', 'Who was involved', 'Why this memory is special to you'],
        preparation_tips_ar: 'اختر ذكرى واحدة محددة ومفرحة. صف المشهد بالتفاصيل الحسية والمشاعر.',
        model_answer_outline: 'Setting the scene (age, place) → What happened in detail → People involved and interactions → Why it remains a cherished memory'
      },
      questions: [
        { q: 'Describe a favorite memory from your childhood.' }
      ],
      useful_phrases: ['takes me back to', 'as far as I can remember', 'those were the days', 'a vivid memory', 'holds a special place in my heart', 'the good old days', 'innocent and carefree', 'etched in my memory'],
      model_answer_text: 'Vocabulary: nostalgic, carefree, innocent, joyful, unforgettable, precious, playful, heartfelt, treasured, enchanting',
      band_descriptors: {
        grammar_structures: ['Used to / would for past habits', 'Past simple for specific events', 'I remember + gerund', 'As a child, I...'],
        common_mistakes_ar: ['خطأ: When I was child → صح: When I was a child', 'خطأ: I remember to play → صح: I remember playing', 'استخدم used to لوصف عادات الطفولة المتكررة']
      }
    },
    {
      part: 2, sort_order: 31, is_published: true,
      topic: 'Describe a building you find interesting',
      cue_card: {
        prompt: 'Describe a building or structure that you find architecturally interesting.',
        bullet_points: ['Where the building is located', 'What it looks like', 'What it is used for', 'Why you find it interesting'],
        preparation_tips_ar: 'اختر مبنى تعرفه جيدا: مسجد، برج، مكتبة. صف شكله الخارجي والداخلي وما يميزه.',
        model_answer_outline: 'Location and first impression → Physical description (exterior and interior) → Purpose and significance → What makes it architecturally remarkable'
      },
      questions: [
        { q: 'Describe a building or structure that you find architecturally interesting.' }
      ],
      useful_phrases: ['architectural masterpiece', 'stands out from', 'a blend of traditional and modern', 'an iconic landmark', 'designed by', 'state-of-the-art', 'towers over the surrounding area', 'a work of art in itself'],
      model_answer_text: 'Vocabulary: facade, contemporary, heritage, symmetrical, spacious, ornate, sustainable, innovative, majestic, monumental',
      band_descriptors: {
        grammar_structures: ['Passive voice for construction', 'Relative clauses for description', 'Comparatives and superlatives', 'It is said to be / known as'],
        common_mistakes_ar: ['خطأ: It was builded in → صح: It was built in', 'خطأ: It is very beauty building → صح: It is a very beautiful building', 'استخدم صفات معمارية محددة بدل الصفات العامة']
      }
    },
    {
      part: 2, sort_order: 32, is_published: true,
      topic: 'Describe a movie or show you recommend',
      cue_card: {
        prompt: 'Describe a movie or TV show that you would recommend to others.',
        bullet_points: ['What the movie/show is about', 'When you watched it', 'Why you liked it', 'Who you would recommend it to'],
        preparation_tips_ar: 'اختر فيلم أو مسلسل أعجبك حقا. لخص القصة بدون حرق الأحداث واذكر سبب إعجابك.',
        model_answer_outline: 'Title, genre, and basic premise → Plot summary (no spoilers) → What makes it outstanding → Target audience and recommendation'
      },
      questions: [
        { q: 'Describe a movie or TV show that you would recommend to others.' }
      ],
      useful_phrases: ['edge-of-your-seat', 'critically acclaimed', 'binge-worthy', 'stellar performance', 'plot twist', 'a must-watch', 'strikes a chord', 'visually stunning'],
      model_answer_text: 'Vocabulary: blockbuster, sequel, protagonist, screenplay, cinematography, soundtrack, compelling, gripping, heartwarming, suspenseful',
      band_descriptors: {
        grammar_structures: ['Present simple for recommendations', 'Past simple for when you watched', 'Would + infinitive for suggestions', 'What makes it special is...'],
        common_mistakes_ar: ['خطأ: The film was very excited → صح: The film was very exciting', 'خطأ: I suggest to watch → صح: I suggest watching / I recommend watching', 'فرق بين -ed (مشاعرك) و-ing (صفة الشيء)']
      }
    },
    {
      part: 2, sort_order: 33, is_published: true,
      topic: 'Describe a time you made a difficult decision',
      cue_card: {
        prompt: 'Describe a time when you had to make a difficult decision.',
        bullet_points: ['What the decision was', 'What options you had', 'How you made the decision', 'Whether you are satisfied with the outcome'],
        preparation_tips_ar: 'اختر قرار حقيقي واجهته: دراسة، عمل، شخصي. صف الخيارات والنتيجة.',
        model_answer_outline: 'The situation and dilemma → Options available → Decision-making process → Outcome and reflection'
      },
      questions: [
        { q: 'Describe a time when you had to make a difficult decision.' }
      ],
      useful_phrases: ['weigh the pros and cons', 'at a crossroads', 'after much deliberation', 'took the plunge', 'no turning back', 'in hindsight', 'the right call', 'a turning point in my life'],
      model_answer_text: 'Vocabulary: dilemma, consequence, rational, impulsive, compromise, alternative, outcome, regret, conviction, resolution',
      band_descriptors: {
        grammar_structures: ['Had to for obligation', 'Second conditional for alternatives', 'After + gerund for sequencing', 'Looking back, I realize...'],
        common_mistakes_ar: ['خطأ: I must to decide → صح: I had to decide', 'خطأ: If I chose the other → صح: If I had chosen the other', 'استخدم تعبيرات التفكير: weigh up, consider, reflect on']
      }
    },
    {
      part: 2, sort_order: 34, is_published: true,
      topic: 'Describe a gift you gave or received',
      cue_card: {
        prompt: 'Describe a memorable gift you gave to someone or received from someone.',
        bullet_points: ['What the gift was', 'Who gave/received it', 'When and why it was given', 'Why it was memorable'],
        preparation_tips_ar: 'اختر هدية مميزة أعطيتها أو استلمتها. صف المناسبة وردة الفعل والقيمة المعنوية.',
        model_answer_outline: 'The gift and the occasion → Choosing/receiving process → The reaction → Sentimental value and significance'
      },
      questions: [
        { q: 'Describe a memorable gift you gave to someone or received from someone.' }
      ],
      useful_phrases: ['means the world to me', 'the thought that counts', 'pleasantly surprised', 'wrapped beautifully', 'a token of appreciation', 'brought tears of joy', 'sentimental value', 'a thoughtful gesture'],
      model_answer_text: 'Vocabulary: thoughtful, generous, sentimental, priceless, meaningful, gratitude, cherish, handmade, symbolic, touching',
      band_descriptors: {
        grammar_structures: ['Past simple for the event', 'Present perfect for ongoing significance', 'It reminded me of...', 'What made it special was...'],
        common_mistakes_ar: ['خطأ: She gifted to me → صح: She gave me / gifted me', 'خطأ: I was very surprising → صح: I was very surprised', 'صف المشاعر بدقة: overwhelmed, touched, delighted']
      }
    },
    {
      part: 2, sort_order: 35, is_published: true,
      topic: 'Describe a place where you feel relaxed',
      cue_card: {
        prompt: 'Describe a place where you go to relax and unwind.',
        bullet_points: ['Where this place is', 'How often you go there', 'What you do there', 'Why it helps you relax'],
        preparation_tips_ar: 'صف المكان بالتفاصيل الحسية: الأصوات، الروائح، المناظر. اشرح كيف يؤثر على مزاجك.',
        model_answer_outline: 'Location and description → Frequency and routine → Activities and atmosphere → Why it provides relaxation'
      },
      questions: [
        { q: 'Describe a place where you go to relax and unwind.' }
      ],
      useful_phrases: ['escape from the daily grind', 'peace and quiet', 'a breath of fresh air', 'recharge my batteries', 'take my mind off things', 'a sense of tranquility', 'my go-to spot', 'wind down after a long day'],
      model_answer_text: 'Vocabulary: serene, peaceful, secluded, therapeutic, soothing, ambient, cozy, spacious, refreshing, harmonious',
      band_descriptors: {
        grammar_structures: ['Present simple for habits', 'Whenever I feel stressed...', 'It helps me to + infinitive', 'Sensory language (I can hear/smell/feel)'],
        common_mistakes_ar: ['خطأ: I feel relax → صح: I feel relaxed', 'خطأ: It is very quite → صح: It is very quiet', 'استخدم الحواس الخمس في وصفك لإثراء إجابتك']
      }
    },
    {
      part: 2, sort_order: 36, is_published: true,
      topic: 'Describe a time you learned from a mistake',
      cue_card: {
        prompt: 'Describe a time when you learned something valuable from a mistake.',
        bullet_points: ['What the mistake was', 'When and how it happened', 'What you learned from it', 'How it changed your behavior'],
        preparation_tips_ar: 'اختر خطأ حقيقي ولكن ليس محرج جدا. ركز على الدرس المستفاد والتغيير الإيجابي.',
        model_answer_outline: 'Context and the mistake → Consequences and realization → The lesson learned → How it changed you positively'
      },
      questions: [
        { q: 'Describe a time when you learned something valuable from a mistake.' }
      ],
      useful_phrases: ['learned the hard way', 'a wake-up call', 'turned things around', 'from that point on', 'every mistake is a lesson', 'made me realize', 'never looked back', 'grew as a person'],
      model_answer_text: 'Vocabulary: miscalculation, oversight, consequence, accountability, reflection, maturity, wisdom, growth, humility, resilience',
      band_descriptors: {
        grammar_structures: ['Past simple for events', 'If I had + past participle (regrets)', 'Since then, I have...', 'It taught me that...'],
        common_mistakes_ar: ['خطأ: I did a mistake → صح: I made a mistake', 'خطأ: I learnt that I should to → صح: I learnt that I should', 'استخدم Past Perfect لشرح ما حصل قبل الخطأ']
      }
    },
    {
      part: 2, sort_order: 37, is_published: true,
      topic: 'Describe an activity you do to stay healthy',
      cue_card: {
        prompt: 'Describe an activity or habit you have that helps you stay healthy.',
        bullet_points: ['What the activity is', 'How often you do it', 'How you got started', 'How it benefits your health'],
        preparation_tips_ar: 'اختر نشاط صحي تمارسه فعلا. صف روتينك وفوائده الجسدية والنفسية.',
        model_answer_outline: 'The activity and your routine → How you started → Physical and mental benefits → Future plans to maintain or improve'
      },
      questions: [
        { q: 'Describe an activity or habit you have that helps you stay healthy.' }
      ],
      useful_phrases: ['maintain a healthy lifestyle', 'part of my daily routine', 'boosts my energy levels', 'clears my mind', 'keeps me in shape', 'make time for', 'consistency is key', 'a positive impact on my wellbeing'],
      model_answer_text: 'Vocabulary: endurance, flexibility, nutritious, stamina, metabolism, cardiovascular, meditation, discipline, moderation, vitality',
      band_descriptors: {
        grammar_structures: ['Present simple for routines', 'Present perfect for results', 'Gerunds as subjects', 'Not only... but also for emphasis'],
        common_mistakes_ar: ['خطأ: I do sport → صح: I do exercise / play sports', 'خطأ: It is good for the healthy → صح: It is good for my health', 'فرق بين health (اسم) وhealthy (صفة)']
      }
    },
    {
      part: 2, sort_order: 38, is_published: true,
      topic: 'Describe a friend who is important to you',
      cue_card: {
        prompt: 'Describe a close friend who plays an important role in your life.',
        bullet_points: ['How you met this friend', 'What they are like', 'What you do together', 'Why they are important to you'],
        preparation_tips_ar: 'اختر صديق/ة مقرب/ة. صف شخصيتهم وذكرى محددة معهم ولماذا هم مهمين لك.',
        model_answer_outline: 'How you met and became friends → Personality description → Shared activities and memories → Why this friendship matters'
      },
      questions: [
        { q: 'Describe a close friend who plays an important role in your life.' }
      ],
      useful_phrases: ['hit it off immediately', 'been through thick and thin', 'a shoulder to lean on', 'on the same wavelength', 'brings out the best in me', 'a true friend', 'stood by me through', 'our friendship has stood the test of time'],
      model_answer_text: 'Vocabulary: trustworthy, loyal, dependable, genuine, empathetic, supportive, cheerful, thoughtful, compatible, inseparable',
      band_descriptors: {
        grammar_structures: ['Present perfect for duration', 'Present simple for qualities', 'Whenever I need...', 'What I value most about them is...'],
        common_mistakes_ar: ['خطأ: She is my friend since 10 years → صح: She has been my friend for 10 years', 'خطأ: We are friends from childhood → صح: We have been friends since childhood', 'استخدم for للمدة وsince لنقطة البداية']
      }
    },
    {
      part: 2, sort_order: 39, is_published: true,
      topic: 'Describe a goal you want to achieve',
      cue_card: {
        prompt: 'Describe an important goal that you hope to achieve in the future.',
        bullet_points: ['What the goal is', 'Why it is important to you', 'What steps you are taking to achieve it', 'When you hope to achieve it'],
        preparation_tips_ar: 'اختر هدف واقعي ومحدد. صف خطواتك لتحقيقه والتحديات المتوقعة.',
        model_answer_outline: 'The goal and its significance → Motivation behind it → Action plan and current progress → Timeline and expected challenges'
      },
      questions: [
        { q: 'Describe an important goal that you hope to achieve in the future.' }
      ],
      useful_phrases: ['set my sights on', 'a long-term ambition', 'taking steps towards', 'stay motivated', 'inch closer to my goal', 'a dream come true', 'the road ahead', 'nothing worth having comes easy'],
      model_answer_text: 'Vocabulary: aspiration, milestone, determination, perseverance, feasible, ambitious, dedication, accomplishment, priority, persistence',
      band_descriptors: {
        grammar_structures: ['Future forms (will, going to, hope to)', 'Present continuous for plans in progress', 'By the time I... I will have...', 'In order to + infinitive'],
        common_mistakes_ar: ['خطأ: I wish to can → صح: I hope to be able to', 'خطأ: I am planning since long → صح: I have been planning for a long time', 'استخدم تعبيرات متنوعة عن المستقبل بدل will فقط']
      }
    },
    {
      part: 2, sort_order: 40, is_published: true,
      topic: 'Describe a time you felt proud of yourself',
      cue_card: {
        prompt: 'Describe an achievement or moment when you felt particularly proud of yourself.',
        bullet_points: ['What the achievement was', 'When it happened', 'What challenges you overcame', 'Why it made you feel proud'],
        preparation_tips_ar: 'اختر إنجاز شخصي أو أكاديمي. صف التحديات التي واجهتها ولحظة النجاح.',
        model_answer_outline: 'The achievement and context → Challenges and preparation → The moment of success → Feelings and impact on your confidence'
      },
      questions: [
        { q: 'Describe an achievement or moment when you felt particularly proud of yourself.' }
      ],
      useful_phrases: ['a sense of accomplishment', 'all my hard work paid off', 'exceeded my own expectations', 'a defining moment', 'proved to myself that', 'against all odds', 'walked away with', 'a proud moment'],
      model_answer_text: 'Vocabulary: triumphant, fulfilled, accomplished, perseverance, milestone, breakthrough, confident, validated, elated, rewarding',
      band_descriptors: {
        grammar_structures: ['Past simple for the event', 'Past perfect for preparation', 'It was the first time I had...', 'Not only did I... but I also...'],
        common_mistakes_ar: ['خطأ: I was pride → صح: I was proud / I felt proud', 'خطأ: I succeed to pass → صح: I succeeded in passing / managed to pass', 'استخدم تعبيرات متنوعة عن الفخر والإنجاز']
      }
    }
  ];

  const { data, error } = await supabase.from('ielts_speaking_questions').insert(cueCards).select('id');
  if (error) {
    console.log('ERROR inserting Part 2:', error.message);
  } else {
    console.log('Part 2 inserted successfully:', data.length, 'cue cards');
  }
}

insertPart2();
