require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insertDiagnostic() {
  // Check if diagnostic mock test already exists
  const { data: existingMock } = await supabase.from('ielts_mock_tests').select('id').eq('test_number', 0);
  if (existingMock && existingMock.length > 0) {
    console.log('Diagnostic test already exists. Skipping.');
    return;
  }

  // ═══════════════════════════════════════════
  // 1. READING SECTION — Diagnostic Passage
  // ═══════════════════════════════════════════
  const readingPassage = {
    passage_number: 0,
    title: 'The Science of Sleep: Why Rest Matters More Than You Think',
    difficulty_band: '5-6',
    topic_category: 'Science / Health',
    word_count: 580,
    time_limit_minutes: 20,
    is_published: true,
    content: `Sleep is one of the most fundamental human needs, yet it remains one of the least understood aspects of our biology. For centuries, people dismissed sleep as a passive state during which the body simply shut down. However, modern science has revealed that sleep is an extraordinarily active process, essential for physical health, mental clarity, and emotional wellbeing.

During sleep, the brain cycles through several distinct stages. The first stage is light sleep, during which the body begins to relax and brain activity starts to slow down. This is followed by a deeper stage where the body temperature drops and the heart rate decreases. The third stage, known as deep sleep or slow-wave sleep, is when the body carries out most of its physical repair work. Tissues are regenerated, muscles are rebuilt, and the immune system is strengthened during this critical phase.

Perhaps the most fascinating stage is REM sleep, which stands for Rapid Eye Movement. During REM sleep, the brain becomes highly active, almost as active as when a person is awake. This is the stage most closely associated with dreaming. Scientists believe that REM sleep plays a vital role in memory consolidation — the process by which short-term memories are converted into long-term ones. Studies have shown that students who get adequate REM sleep after studying perform significantly better on tests than those who do not.

The consequences of insufficient sleep are far-reaching. In the short term, sleep deprivation leads to reduced concentration, impaired judgment, and slower reaction times. Research conducted at several major universities has demonstrated that staying awake for twenty-four hours produces cognitive impairment comparable to having a blood alcohol level above the legal driving limit. In the long term, chronic sleep deprivation has been linked to serious health conditions including obesity, diabetes, cardiovascular disease, and weakened immune function.

Despite this growing body of evidence, many societies continue to undervalue sleep. In some cultures, sleeping less is even seen as a badge of honor, with successful people often boasting about surviving on minimal rest. This attitude is slowly changing as public health campaigns highlight the importance of adequate sleep, typically seven to nine hours per night for adults.

Technology has added another dimension to the sleep challenge. The blue light emitted by smartphones, tablets, and computer screens suppresses the production of melatonin, a hormone that regulates the sleep-wake cycle. Experts recommend avoiding screens for at least one hour before bedtime, though surveys suggest that the majority of adults check their phones within thirty minutes of going to sleep.

Fortunately, improving sleep quality does not require dramatic lifestyle changes. Simple adjustments such as maintaining a consistent sleep schedule, creating a dark and quiet sleeping environment, limiting caffeine intake in the afternoon, and engaging in regular physical exercise can significantly enhance both the duration and quality of sleep. As our understanding of sleep science continues to advance, one thing has become abundantly clear: sleep is not a luxury but a biological necessity that deserves far greater respect and attention.`,
    questions: [
      // MCQ (3)
      { id: 'dr1', type: 'mcq', question: 'According to the passage, what was the historical view of sleep?', options: ['A) It was considered an active process', 'B) It was seen as a passive state where the body shut down', 'C) It was believed to be essential for memory', 'D) It was thought to strengthen the immune system'], correct: 'B' },
      { id: 'dr2', type: 'mcq', question: 'What happens during REM sleep?', options: ['A) The body temperature drops significantly', 'B) Physical repair work is carried out', 'C) The brain becomes highly active and dreaming occurs', 'D) The heart rate reaches its lowest point'], correct: 'C' },
      { id: 'dr3', type: 'mcq', question: 'What does the passage suggest about the effect of staying awake for 24 hours?', options: ['A) It has no measurable effect on performance', 'B) It only affects physical abilities', 'C) It causes impairment similar to being legally drunk', 'D) It primarily impacts long-term memory'], correct: 'C' },
      // T/F/NG (3)
      { id: 'dr4', type: 'tfng', question: 'Deep sleep is when most dreaming takes place.', correct: 'FALSE' },
      { id: 'dr5', type: 'tfng', question: 'Chronic sleep deprivation can lead to cardiovascular disease.', correct: 'TRUE' },
      { id: 'dr6', type: 'tfng', question: 'Most adults follow the recommendation to avoid screens before bedtime.', correct: 'FALSE' },
      // Sentence completion (4)
      { id: 'dr7', type: 'completion', question: 'The process of converting short-term memories into long-term ones is called _______.', correct: 'memory consolidation' },
      { id: 'dr8', type: 'completion', question: 'The hormone that regulates the sleep-wake cycle is called _______.', correct: 'melatonin' },
      { id: 'dr9', type: 'completion', question: 'Adults typically need _______ to _______ hours of sleep per night.', correct: 'seven to nine' },
      { id: 'dr10', type: 'completion', question: 'Blue light from screens suppresses the production of _______.', correct: 'melatonin' }
    ],
    answer_key: {
      dr1: 'B', dr2: 'C', dr3: 'C', dr4: 'FALSE', dr5: 'TRUE', dr6: 'FALSE',
      dr7: 'memory consolidation', dr8: 'melatonin', dr9: 'seven to nine', dr10: 'melatonin'
    }
  };

  const { data: rData, error: rErr } = await supabase.from('ielts_reading_passages').insert(readingPassage).select('id');
  if (rErr) { console.log('Reading insert error:', rErr.message); return; }
  console.log('Diagnostic reading passage inserted:', rData[0].id);

  // ═══════════════════════════════════════════
  // 2. LISTENING SECTION — Diagnostic Script
  // ═══════════════════════════════════════════
  const listeningSection = {
    test_id: 0,
    section_number: 1,
    title: 'Community Wellness Program — Information Session',
    speaker_count: 1,
    accent: 'british',
    context_description: 'A community center coordinator explains a new wellness program to local residents.',
    is_published: true,
    transcript: `Good morning, everyone, and welcome to the Greenfield Community Center. My name is Sarah Mitchell, and I am the wellness coordinator here. Thank you all for coming to learn about our brand-new Community Wellness Program, which we are very excited to be launching next month.

So, let me give you an overview of what the program involves. First of all, the program is designed for adults of all ages and fitness levels. You do not need any previous experience in exercise or nutrition to join. The whole idea is to make healthy living accessible to everyone in our community.

The program runs for twelve weeks, starting on the third of March and finishing on the twenty-fifth of May. We will meet three times a week — on Mondays, Wednesdays, and Fridays. Monday sessions focus on physical fitness, with activities like walking groups, gentle yoga, and low-impact aerobics. Wednesday sessions are all about nutrition, where we will cover topics like meal planning on a budget, understanding food labels, and cooking simple, healthy meals together. Friday sessions are dedicated to mental wellbeing, including mindfulness exercises, stress management techniques, and group discussion circles.

Now, regarding the schedule — all sessions take place here at the community center. Morning sessions run from nine thirty to eleven, and we also offer an evening option from six to seven thirty for those who work during the day. You are welcome to mix and match between morning and evening sessions based on your availability.

The cost of the program is thirty-five pounds for the full twelve weeks, which covers all materials, recipes, and equipment. However, if you are over sixty-five, a student, or receiving benefits, the fee is reduced to just fifteen pounds. We believe financial constraints should never prevent someone from improving their health.

To register, you can visit our website at greenfield-wellness-dot-org, fill out a form at the front desk, or call us on oh-one-two-three, four-five-six, seven-eight-nine-oh. Registration closes on the twenty-fifth of February, so please do sign up soon as spaces are limited to forty participants.

One more thing — everyone who completes the full program will receive a certificate and an invitation to our celebration event in June. We will also be conducting health assessments at the beginning and end of the program so you can track your progress.

Are there any questions? Yes? No? Wonderful. Thank you, and I look forward to seeing many of you in March.`,
    questions: [
      // MCQ (4)
      { id: 'dl1', type: 'mcq', question: 'Who is the program designed for?', options: ['A) Professional athletes', 'B) Adults of all ages and fitness levels', 'C) Children and teenagers', 'D) People with previous exercise experience'], correct: 'B' },
      { id: 'dl2', type: 'mcq', question: 'What happens during Wednesday sessions?', options: ['A) Physical fitness activities', 'B) Mental wellbeing exercises', 'C) Nutrition topics and cooking', 'D) Group discussion circles'], correct: 'C' },
      { id: 'dl3', type: 'mcq', question: 'What is the reduced fee for eligible participants?', options: ['A) Ten pounds', 'B) Fifteen pounds', 'C) Twenty pounds', 'D) Twenty-five pounds'], correct: 'B' },
      { id: 'dl4', type: 'mcq', question: 'What do participants receive upon completing the program?', options: ['A) A cash prize', 'B) Free gym membership', 'C) A certificate and invitation to a celebration event', 'D) A discount on the next program'], correct: 'C' },
      // Note completion (6)
      { id: 'dl5', type: 'completion', question: 'Program duration: _______ weeks.', correct: 'twelve' },
      { id: 'dl6', type: 'completion', question: 'The program starts on the _______ of March.', correct: 'third' },
      { id: 'dl7', type: 'completion', question: 'Friday sessions focus on _______ wellbeing.', correct: 'mental' },
      { id: 'dl8', type: 'completion', question: 'Morning sessions run from _______ to eleven.', correct: 'nine thirty' },
      { id: 'dl9', type: 'completion', question: 'Maximum number of participants: _______.', correct: 'forty' },
      { id: 'dl10', type: 'completion', question: 'Registration deadline: the twenty-fifth of _______.', correct: 'February' }
    ],
    answer_key: {
      dl1: 'B', dl2: 'C', dl3: 'B', dl4: 'C',
      dl5: 'twelve', dl6: 'third', dl7: 'mental', dl8: 'nine thirty', dl9: 'forty', dl10: 'February'
    }
  };

  const { data: lData, error: lErr } = await supabase.from('ielts_listening_sections').insert(listeningSection).select('id');
  if (lErr) { console.log('Listening insert error:', lErr.message); return; }
  console.log('Diagnostic listening section inserted:', lData[0].id);

  // ═══════════════════════════════════════════
  // 3. WRITING SECTION — Diagnostic Task 2
  // ═══════════════════════════════════════════
  const writingTask = {
    task_type: 'task2',
    sub_type: 'opinion',
    title: 'Diagnostic — Opinion Essay: University Education',
    difficulty_band: '5-6',
    word_count_target: 250,
    time_limit_minutes: 20,
    is_published: true,
    prompt: 'Some people believe that university education should be free for everyone, while others think students should pay for their own education. Discuss both views and give your own opinion.',
    template_structure: {
      introduction: 'Paraphrase the topic and state your opinion clearly.',
      body_paragraph_1: 'Discuss the first view (free education) with reasons and examples.',
      body_paragraph_2: 'Discuss the second view (paying for education) with reasons and examples.',
      conclusion: 'Summarize both views and restate your opinion.'
    },
    key_phrases: [
      'It is often argued that', 'From my perspective', 'On the one hand... on the other hand',
      'Proponents of free education believe', 'However, critics argue that',
      'In conclusion, I firmly believe', 'Taking both views into consideration',
      'The main advantage of', 'A significant drawback is'
    ],
    model_answer_band6: 'Education is a topic that many people discuss. Some think university should be free and others think students should pay. I will discuss both sides. First, free education is good because it gives everyone a chance to study. Many students from poor families cannot afford university fees, so making it free would help them get a good education and find better jobs. Countries like Germany offer free university and this has been successful. On the other hand, some people think students should pay because the government cannot afford to pay for everyone. If education is free, the quality might go down because there is not enough money. Also, students who pay for their education might value it more and study harder. In my opinion, I think education should be free or at least very affordable. Education is a right and everyone deserves the chance to learn and improve their life. The government should find ways to fund universities so that money is not a barrier to education.',
    model_answer_band7: 'The question of whether university education should be free or paid for by students is a matter of ongoing debate. While both perspectives have valid arguments, I believe that governments should strive to make higher education as affordable as possible. Those who advocate for free university education argue that it promotes social equality by removing financial barriers. Students from disadvantaged backgrounds often lack the resources to pursue higher education, which perpetuates cycles of poverty. Countries such as Norway and Germany have demonstrated that publicly funded education can maintain high academic standards while ensuring accessibility. Furthermore, an educated workforce benefits the entire economy through increased productivity and innovation. Conversely, opponents contend that free education places an unsustainable burden on taxpayers. They argue that when students invest their own money in education, they tend to be more committed and selective about their courses. Additionally, tuition fees generate revenue that universities can reinvest in facilities, research, and faculty, thereby maintaining educational quality. In conclusion, while I acknowledge the financial challenges of providing free education, I am of the opinion that the long-term societal benefits far outweigh the costs. Governments should explore funding models that minimize the financial burden on students while maintaining the quality of higher education.',
    rubric: {
      ta: 25, cc: 25, lr: 25, gra: 25,
      diagnostic_scoring: {
        band_3_4: 'Minimal attempt at the task. Ideas are unclear, very limited vocabulary, frequent grammatical errors.',
        band_5: 'Addresses the topic but may not cover both views. Some organization. Limited vocabulary range. Noticeable grammatical errors.',
        band_6: 'Addresses both views with some development. Generally organized. Adequate vocabulary. Mix of simple and complex sentences with some errors.',
        band_7: 'Clearly presents and develops both views. Well-organized with cohesive devices. Good vocabulary range. Variety of sentence structures with few errors.',
        band_8_9: 'Sophisticated discussion of both views. Excellent organization and cohesion. Wide vocabulary used precisely. Wide range of structures used accurately.'
      }
    }
  };

  const { data: wData, error: wErr } = await supabase.from('ielts_writing_tasks').insert(writingTask).select('id');
  if (wErr) { console.log('Writing insert error:', wErr.message); return; }
  console.log('Diagnostic writing task inserted:', wData[0].id);

  // ═══════════════════════════════════════════
  // 4. SPEAKING SECTION — Diagnostic (Part 1 + Part 2 only)
  // ═══════════════════════════════════════════
  // Use existing Part 1 and Part 2 questions. We'll reference them in the mock test.
  const diagnosticSpeaking = {
    part1: {
      questions: [
        'What do you do? Are you working or studying?',
        'What do you enjoy most about your work or studies?',
        'How do you usually spend your weekends?',
        'Do you prefer staying at home or going out?'
      ],
      assessment_criteria: {
        fluency: 'Can the student speak without long pauses or hesitation?',
        vocabulary: 'Does the student use a range of vocabulary or repeat the same words?',
        grammar: 'Does the student use a mix of simple and complex sentences?',
        pronunciation: 'Is the student clearly understood despite any accent?'
      }
    },
    part2: {
      cue_card: {
        prompt: 'Describe something you are good at.',
        bullet_points: [
          'What this skill or ability is',
          'How you developed it',
          'How often you use it',
          'Why you enjoy being good at this'
        ]
      },
      preparation_time: '1 minute',
      speaking_time: '1-2 minutes'
    },
    scoring: {
      band_3_4: 'Very limited responses. Frequent long pauses. Basic vocabulary only. Mostly simple sentences with many errors.',
      band_5: 'Can maintain the flow with some hesitation. Limited vocabulary but manages to communicate. Noticeable grammatical errors but meaning is clear.',
      band_6: 'Generally fluent with occasional hesitation. Adequate vocabulary for familiar topics. Mix of simple and complex sentences.',
      band_7_plus: 'Speaks fluently and coherently. Good vocabulary range with some less common items. Flexible use of grammar with few errors.'
    }
  };

  // ═══════════════════════════════════════════
  // 5. CREATE MOCK TEST ENTRY (test_number: 0 = diagnostic)
  // ═══════════════════════════════════════════
  const mockTest = {
    test_number: 0,
    title_ar: 'اختبار تشخيصي — تحديد المستوى',
    title_en: 'IELTS Diagnostic — Placement Test',
    reading_passage_ids: [rData[0].id],
    listening_test_id: 0,
    writing_task2_id: wData[0].id,
    speaking_questions: diagnosticSpeaking,
    total_time_minutes: 65,
    is_published: true
  };

  const { data: mData, error: mErr } = await supabase.from('ielts_mock_tests').insert(mockTest).select('id');
  if (mErr) { console.log('Mock test insert error:', mErr.message); return; }
  console.log('Diagnostic mock test inserted:', mData[0].id);

  // ═══════════════════════════════════════════
  // 6. SCORING RUBRIC & FEEDBACK TEMPLATE
  // ═══════════════════════════════════════════
  // Store as a JSON config we can reference
  const scoringConfig = {
    score_mapping: {
      reading_listening_combined: {
        '0-4': { band: '3-3.5', label: 'Below Average' },
        '5-8': { band: '4-4.5', label: 'Limited' },
        '9-12': { band: '5-5.5', label: 'Modest' },
        '13-16': { band: '6-6.5', label: 'Competent' },
        '17-20': { band: '7+', label: 'Good to Expert' }
      },
      overall: 'Average of all 4 skills (reading, writing, listening, speaking)'
    },
    feedback_templates_ar: {
      'band_3-4': {
        message: 'مستواك الحالي يحتاج تأسيس قبل بدء التحضير لـ IELTS. ننصح بإكمال المستوى 3 أولاً.',
        study_plan: ['تركيز على بناء المفردات الأساسية', 'تعلم القواعد الأساسية', 'ممارسة الاستماع اليومي بمستوى مبتدئ', 'قراءة نصوص قصيرة وبسيطة']
      },
      'band_4.5-5': {
        message: 'عندك أساس جيد. تحتاج تركيز على المهارات الضعيفة. خطة 3 أشهر مناسبة لك.',
        study_plan: ['تحسين مهارة القراءة السريعة', 'ممارسة الكتابة الأسبوعية مع تصحيح', 'استماع يومي لمحتوى أكاديمي', 'تسجيل صوتي يومي للمحادثة']
      },
      'band_5.5-6': {
        message: 'مستواك متوسط جيد. ممكن توصل Band 6.5-7 خلال شهرين مكثفين.',
        study_plan: ['التركيز على استراتيجيات الامتحان', 'توسيع المفردات الأكاديمية', 'ممارسة كتابة المقالات مع ضبط الوقت', 'تحسين الطلاقة في المحادثة']
      },
      'band_6_plus': {
        message: 'مستواك متقدم. ركّز على الاستراتيجيات والتقنيات أكثر من اللغة.',
        study_plan: ['إتقان تقنيات الامتحان المتقدمة', 'التركيز على الدقة في الكتابة', 'تحسين المفردات الأقل شيوعاً', 'محاكاة اختبارات كاملة بالتوقيت']
      }
    },
    recommended_focus: {
      weak_reading: ['تمارين القراءة السريعة (skimming)', 'تمارين تحديد الكلمات المفتاحية (scanning)', 'قراءة مقالات أكاديمية يومياً', 'ممارسة أنواع الأسئلة المختلفة'],
      weak_listening: ['استماع يومي لبودكاست باللغة الإنجليزية', 'تمارين تدوين الملاحظات', 'مشاهدة محاضرات TED مع ترجمة', 'ممارسة الاستماع المركز'],
      weak_writing: ['كتابة مقال أسبوعياً مع تصحيح AI', 'دراسة نماذج المقالات', 'تعلم الربط بين الفقرات', 'بناء بنك مفردات أكاديمية'],
      weak_speaking: ['تسجيل صوتي يومي لمدة 2 دقيقة', 'ممارسة المحادثة مع شريك', 'حفظ تعبيرات وعبارات مفيدة', 'مشاهدة نماذج اختبارات المحادثة']
    }
  };

  console.log('\n=== DIAGNOSTIC TEST CONTENT SUMMARY ===');
  console.log('Reading: 1 passage (580 words) + 10 questions');
  console.log('Listening: 1 section (monologue) + 10 questions');
  console.log('Writing: 1 Task 2 opinion essay');
  console.log('Speaking: Part 1 (4 questions) + Part 2 (1 cue card)');
  console.log('Scoring rubric and Arabic feedback templates included');
  console.log('Mock test entry created (test_number: 0)');
  console.log('=======================================');
}

insertDiagnostic();
