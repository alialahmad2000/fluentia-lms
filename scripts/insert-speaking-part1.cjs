require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insertPart1() {
  // Check if Part 1 already exists
  const { data: existing } = await supabase.from('ielts_speaking_questions').select('id').eq('part', 1);
  if (existing && existing.length > 0) {
    console.log('Part 1 already exists:', existing.length, 'records. Skipping.');
    return;
  }

  const topics = [
    {
      part: 1, sort_order: 1, is_published: true,
      topic: 'Home & Accommodation / المنزل والسكن',
      questions: [
        { q: 'Do you live in a house or an apartment?', sample: 'I currently live in a spacious apartment in the city center with my family. It has three bedrooms and a lovely balcony overlooking the street.' },
        { q: 'What is your favorite room in your home?', sample: 'My favorite room is the living room because it is where we gather as a family every evening. It has comfortable seating and warm lighting that makes it very cozy.' },
        { q: 'Would you like to move to a different home in the future?', sample: 'Yes, I would love to move to a house with a garden someday. I think having outdoor space would improve my quality of life significantly.' },
        { q: 'How is your home decorated?', sample: 'Our home is decorated in a modern minimalist style with neutral colors. We have some traditional Arabic calligraphy on the walls which adds a cultural touch.' }
      ],
      useful_phrases: ['cozy atmosphere', 'spacious layout', 'neighborhood amenities', 'home improvement', 'residential area'],
      model_answer_text: 'Grammar focus: present simple for habits, would like to for future wishes.',
      band_descriptors: { grammar: 'Present simple, would like to, comparatives', arabic_tip: 'أجب بجملتين أو ثلاث. لا تقل فقط نعم أو لا. أضف سبب أو تفصيل.' }
    },
    {
      part: 1, sort_order: 2, is_published: true,
      topic: 'Work & Studies / العمل والدراسة',
      questions: [
        { q: 'Are you currently working or studying?', sample: 'I am currently a university student studying business administration. I am in my third year and I find the subjects quite interesting and relevant.' },
        { q: 'What do you enjoy most about your work or studies?', sample: 'What I enjoy most is the group projects because they allow me to collaborate with my classmates and learn from different perspectives.' },
        { q: 'Would you like to change your career or field of study?', sample: 'Not really, I am quite satisfied with my current field. However, I might consider specializing in digital marketing later on.' },
        { q: 'Do you prefer working alone or in a team?', sample: 'I generally prefer working in a team because I find it more motivating. Different people bring different perspectives which leads to better results.' }
      ],
      useful_phrases: ['career prospects', 'field of study', 'collaborate with', 'specialize in', 'professional development'],
      model_answer_text: 'Grammar focus: present continuous for current situations, prefer + gerund.',
      band_descriptors: { grammar: 'Present continuous, prefer + gerund, might + infinitive', arabic_tip: 'تحدث عن وضعك الحالي ثم أضف رأيك أو خطتك المستقبلية.' }
    },
    {
      part: 1, sort_order: 3, is_published: true,
      topic: 'Hometown / مسقط الرأس',
      questions: [
        { q: 'Where is your hometown?', sample: 'My hometown is Jeddah, located on the western coast of Saudi Arabia. It is the second largest city and is known for its beautiful corniche.' },
        { q: 'What do you like most about your hometown?', sample: 'What I appreciate most is the blend of traditional culture and modern development. The old historical district has a unique charm.' },
        { q: 'Has your hometown changed much in recent years?', sample: 'Yes, it has changed tremendously. Many new shopping centers, parks, and entertainment venues have been built.' },
        { q: 'Would you recommend visitors to go to your hometown?', sample: 'Absolutely. Visitors can enjoy the stunning Red Sea coastline, explore historic areas, and experience genuine Saudi hospitality.' }
      ],
      useful_phrases: ['located on', 'known for', 'blend of', 'has changed tremendously', 'highly recommend'],
      model_answer_text: 'Grammar focus: present perfect for changes, would recommend.',
      band_descriptors: { grammar: 'Present perfect, relative clauses, passive voice', arabic_tip: 'صف مدينتك بإيجابية. استخدم صفات متنوعة ولا تكرر نفس الكلمات.' }
    },
    {
      part: 1, sort_order: 4, is_published: true,
      topic: 'Family / العائلة',
      questions: [
        { q: 'How many people are there in your family?', sample: 'I come from a large family of seven members including my parents and four siblings. We are very close-knit.' },
        { q: 'Do you spend a lot of time with your family?', sample: 'Yes, we make it a point to have dinner together every evening. On weekends, we usually visit extended family.' },
        { q: 'Who in your family are you closest to?', sample: 'I am closest to my older sister because we share similar interests and she has always been supportive of my goals.' },
        { q: 'Are family gatherings important in your culture?', sample: 'Extremely important. In Saudi culture, family gatherings especially on Fridays are a cherished tradition.' }
      ],
      useful_phrases: ['close-knit family', 'quality time', 'extended family', 'cherished tradition', 'supportive of'],
      model_answer_text: 'Grammar focus: present simple for routines, adverbs of frequency.',
      band_descriptors: { grammar: 'Present simple, adverbs of frequency, make it a point to', arabic_tip: 'تحدث عن عائلتك بإيجابية. يمكنك ذكر العادات العائلية المميزة في ثقافتنا.' }
    },
    {
      part: 1, sort_order: 5, is_published: true,
      topic: 'Friends / الأصدقاء',
      questions: [
        { q: 'Do you have a large group of friends?', sample: 'I have a small but close circle of friends whom I have known since secondary school.' },
        { q: 'How often do you meet your friends?', sample: 'I try to meet them at least twice a week, usually at a cafe or at one of our homes.' },
        { q: 'What activities do you enjoy doing with your friends?', sample: 'We enjoy going to restaurants, watching movies, and sometimes studying together at the library.' },
        { q: 'Is it easy to make new friends where you live?', sample: 'I think it is relatively easy because people in my city are quite friendly and welcoming.' }
      ],
      useful_phrases: ['close circle of friends', 'deep friendship', 'catch up with', 'common interests', 'socialize regularly'],
      model_answer_text: 'Grammar focus: present simple and continuous, prefer + gerund, frequency expressions.',
      band_descriptors: { grammar: 'Prefer + gerund, frequency expressions, relative clauses', arabic_tip: 'استخدم تعبيرات مثل close circle وcatch up لإظهار مستوى لغتك.' }
    },
    {
      part: 1, sort_order: 6, is_published: true,
      topic: 'Daily Routine / الروتين اليومي',
      questions: [
        { q: 'What does a typical day look like for you?', sample: 'I usually wake up at six thirty, have breakfast with my family, then head to university. After classes, I study for a couple of hours.' },
        { q: 'Do you prefer having a fixed routine or being spontaneous?', sample: 'I prefer having a structured routine during weekdays as it helps me stay productive. On weekends I like to be more spontaneous.' },
        { q: 'Has your daily routine changed much over the years?', sample: 'Yes, it has changed considerably since I started university. I now manage my own schedule.' },
        { q: 'What is the most important part of your day?', sample: 'The morning is the most important for me because I am most energetic and focused then.' }
      ],
      useful_phrases: ['head to', 'a couple of hours', 'stay productive', 'manage my schedule', 'most energetic'],
      model_answer_text: 'Grammar focus: present simple for routines, time expressions, sequencing adverbs.',
      band_descriptors: { grammar: 'Present simple, time expressions, since + present perfect', arabic_tip: 'رتب يومك بالترتيب الزمني واستخدم كلمات ربط مثل then, after that, finally.' }
    },
    {
      part: 1, sort_order: 7, is_published: true,
      topic: 'Food & Cooking / الطعام والطبخ',
      questions: [
        { q: 'What kind of food do you usually eat?', sample: 'I mostly eat traditional Saudi dishes like kabsa and mandi at home. When eating out, I enjoy trying different cuisines.' },
        { q: 'Do you enjoy cooking?', sample: 'Yes, I have recently started learning to cook. I find it quite therapeutic and satisfying.' },
        { q: 'Is there any food you dislike?', sample: 'I am not particularly fond of very spicy food. Other than that, I am quite adventurous with new flavors.' },
        { q: 'Do you prefer eating at home or in restaurants?', sample: 'I prefer eating at home most of the time because it is healthier and more economical.' }
      ],
      useful_phrases: ['traditional dishes', 'different cuisines', 'quite therapeutic', 'adventurous eater', 'dining out'],
      model_answer_text: 'Grammar focus: present simple for preferences, enjoy/find + gerund/adjective.',
      band_descriptors: { grammar: 'Enjoy + gerund, not particularly fond of, comparatives', arabic_tip: 'اذكر أمثلة محددة من الأكلات بدل الإجابة العامة.' }
    },
    {
      part: 1, sort_order: 8, is_published: true,
      topic: 'Weather & Seasons / الطقس والفصول',
      questions: [
        { q: 'What is the weather like in your country?', sample: 'Saudi Arabia is generally hot and dry for most of the year. The winter months are pleasant and mild.' },
        { q: 'Which season do you enjoy the most?', sample: 'I enjoy winter the most because the weather becomes comfortable enough to spend time outdoors.' },
        { q: 'Does the weather affect your mood?', sample: 'Definitely. On sunny days with mild temperatures, I feel more energetic. During extremely hot days, I stay indoors.' },
        { q: 'Has the weather in your area changed over the years?', sample: 'I believe it has become slightly hotter over the years, likely due to climate change.' }
      ],
      useful_phrases: ['temperatures exceed', 'pleasant and mild', 'spend time outdoors', 'climate change', 'unusual weather events'],
      model_answer_text: 'Grammar focus: describing weather, comparative forms, present perfect for changes.',
      band_descriptors: { grammar: 'Impersonal it, comparatives, tend to + infinitive', arabic_tip: 'استخدم تعبيرات وصفية عن الطقس بدلا من كلمات بسيطة مثل hot وcold فقط.' }
    },
    {
      part: 1, sort_order: 9, is_published: true,
      topic: 'Shopping / التسوق',
      questions: [
        { q: 'Do you enjoy shopping?', sample: 'I enjoy shopping occasionally, especially for clothes and books. I am not the type who spends hours browsing without purpose.' },
        { q: 'Do you prefer shopping online or in stores?', sample: 'I prefer online shopping for convenience. But for clothes and shoes, I like to visit the store to try things on.' },
        { q: 'What was the last thing you bought?', sample: 'The last thing I purchased was a new laptop bag. I found a great deal online that was half the original price.' },
        { q: 'Do you think people in your country shop too much?', sample: 'Consumer culture has definitely grown with online shopping availability. Some people buy things they do not really need.' }
      ],
      useful_phrases: ['browsing through', 'convenience and variety', 'try things on', 'great deal', 'consumer culture'],
      model_answer_text: 'Grammar focus: prefer + gerund, past simple for recent purchases.',
      band_descriptors: { grammar: 'Prefer + gerund, past simple, tend to', arabic_tip: 'تحدث عن عاداتك في التسوق وأعط أمثلة حقيقية ومحددة.' }
    },
    {
      part: 1, sort_order: 10, is_published: true,
      topic: 'Transportation / المواصلات',
      questions: [
        { q: 'How do you usually get around?', sample: 'I usually drive my own car. Public transportation is still developing in my city, so most people rely on private vehicles.' },
        { q: 'Is public transportation good in your city?', sample: 'It is improving rapidly. New bus routes and a metro system are being built.' },
        { q: 'Do you think people should use public transport more?', sample: 'Absolutely. Using public transport reduces traffic congestion and air pollution.' },
        { q: 'What is your favorite way to travel long distances?', sample: 'I prefer flying for long distances because it saves time. However, I occasionally enjoy road trips with family.' }
      ],
      useful_phrases: ['get around', 'rely on', 'traffic congestion', 'commuting', 'road trip'],
      model_answer_text: 'Grammar focus: present simple and continuous, passive for development, should for opinions.',
      band_descriptors: { grammar: 'Passive voice, should + infinitive, present continuous for changes', arabic_tip: 'عبر عن رأيك بوضوح واستخدم أسباب منطقية لدعم إجابتك.' }
    },
    {
      part: 1, sort_order: 11, is_published: true,
      topic: 'Music / الموسيقى',
      questions: [
        { q: 'Do you listen to music often?', sample: 'Yes, I listen to music every day, usually while commuting or studying. It helps me concentrate and puts me in a positive mood.' },
        { q: 'What type of music do you prefer?', sample: 'I enjoy a mix of Arabic pop and English acoustic songs. Acoustic music is particularly soothing and relaxing.' },
        { q: 'Do you play any musical instruments?', sample: 'Not at the moment, but I have always wanted to learn the piano. I am planning to take lessons soon.' },
        { q: 'Has your taste in music changed over the years?', sample: 'Definitely. When I was younger, I listened to mainstream pop. Now I appreciate jazz and classical music too.' }
      ],
      useful_phrases: ['puts me in a positive mood', 'soothing and relaxing', 'take lessons', 'mainstream pop', 'wider range of genres'],
      model_answer_text: 'Grammar focus: present simple for habits, find + object + adjective, present perfect for changes.',
      band_descriptors: { grammar: 'Find + object + adjective, have always wanted to, used to', arabic_tip: 'لا تقل فقط أحب الموسيقى. اذكر نوعها ولماذا تحبها وكيف تؤثر عليك.' }
    },
    {
      part: 1, sort_order: 12, is_published: true,
      topic: 'Reading / القراءة',
      questions: [
        { q: 'Do you enjoy reading?', sample: 'Yes, I am quite an avid reader. I try to read at least one book a month.' },
        { q: 'What kind of books do you prefer?', sample: 'I mostly enjoy non-fiction, particularly self-development and psychology books. I also occasionally read novels.' },
        { q: 'Do you prefer physical books or e-books?', sample: 'I prefer physical books for the tactile experience. However, e-books are more practical when traveling.' },
        { q: 'Did you read a lot as a child?', sample: 'Not as much as I do now. I developed a love for reading in my late teens when a teacher recommended a captivating book.' }
      ],
      useful_phrases: ['avid reader', 'expand my knowledge', 'self-development', 'tactile experience', 'captivated me'],
      model_answer_text: 'Grammar focus: enjoy/prefer + gerund, past simple for childhood.',
      band_descriptors: { grammar: 'Enjoy + gerund, try to + infinitive, past simple narratives', arabic_tip: 'تحدث عن كتاب محدد قرأته مؤخرا لإعطاء إجابة أكثر تفصيلا.' }
    },
    {
      part: 1, sort_order: 13, is_published: true,
      topic: 'Sports & Exercise / الرياضة والتمارين',
      questions: [
        { q: 'Do you do any regular exercise?', sample: 'Yes, I go to the gym three times a week and also enjoy walking in the evenings.' },
        { q: 'What sports do you enjoy watching?', sample: 'I am a big football fan and follow the Saudi Pro League closely. I also enjoy watching tennis.' },
        { q: 'Did you play any sports when you were younger?', sample: 'Yes, I used to play volleyball at school and participated in regional competitions.' },
        { q: 'Do you think exercise is important for everyone?', sample: 'Absolutely. Regular exercise helps maintain good health, reduces stress, and improves concentration.' }
      ],
      useful_phrases: ['staying active', 'follow closely', 'participated in', 'play competitively', 'incorporate into routine'],
      model_answer_text: 'Grammar focus: frequency adverbs, used to for past habits, should for recommendations.',
      band_descriptors: { grammar: 'Used to + infinitive, although, should + infinitive', arabic_tip: 'اذكر رياضات محددة واستخدم تعبيرات متنوعة بدل تكرار I like sports.' }
    },
    {
      part: 1, sort_order: 14, is_published: true,
      topic: 'Technology & Phones / التكنولوجيا والهواتف',
      questions: [
        { q: 'How often do you use your phone?', sample: 'I use my phone constantly throughout the day. I would estimate I spend around four to five hours on it daily.' },
        { q: 'What apps do you use the most?', sample: 'I use WhatsApp and social media apps the most. I also rely heavily on calendar and note-taking apps.' },
        { q: 'Do you think people spend too much time on their phones?', sample: 'Yes, screen time has become excessive for many people. It can negatively affect sleep quality.' },
        { q: 'How has technology changed your daily life?', sample: 'Technology has made everything more convenient, from online banking to distance learning.' }
      ],
      useful_phrases: ['stay in touch', 'rely heavily on', 'screen time', 'face-to-face interactions', 'somewhat dependent on'],
      model_answer_text: 'Grammar focus: present simple for habits, has + past participle for changes.',
      band_descriptors: { grammar: 'Present perfect for life changes, too much/many, conditional', arabic_tip: 'قدم رأيك المتوازن: اذكر الإيجابيات والسلبيات معا.' }
    },
    {
      part: 1, sort_order: 15, is_published: true,
      topic: 'Holidays & Vacations / الإجازات والعطلات',
      questions: [
        { q: 'What do you usually do during holidays?', sample: 'During shorter holidays, I spend time with family. For longer vacations, we sometimes travel abroad.' },
        { q: 'Do you prefer relaxing holidays or active ones?', sample: 'I prefer a combination of both. A few days of sightseeing followed by relaxation time.' },
        { q: 'Where was your last vacation?', sample: 'My last vacation was a trip to Istanbul with my family last summer. We spent five days exploring historical sites.' },
        { q: 'Do you think holidays are important?', sample: 'Definitely. Holidays provide a much-needed break from routine and strengthen family bonds.' }
      ],
      useful_phrases: ['explore new places', 'sightseeing', 'much-needed break', 'recharge', 'strengthen family bonds'],
      model_answer_text: 'Grammar focus: present simple for habits, past simple for specific trips.',
      band_descriptors: { grammar: 'Present simple, past simple, a combination of', arabic_tip: 'عند وصف إجازة سابقة، استخدم الماضي البسيط وأعط تفاصيل عن المكان والأنشطة.' }
    },
    {
      part: 1, sort_order: 16, is_published: true,
      topic: 'Languages / اللغات',
      questions: [
        { q: 'How many languages do you speak?', sample: 'I speak Arabic as my mother tongue and English as my second language. I am also trying to learn basic French.' },
        { q: 'Why are you learning English?', sample: 'English is essential for my academic career and future employment. Most international business is conducted in English.' },
        { q: 'What is the most difficult thing about learning a new language?', sample: 'The most challenging aspect is pronunciation and natural fluency. Grammar can be memorized, but sounding natural requires practice.' },
        { q: 'Do you think everyone should learn a foreign language?', sample: 'Yes, I strongly believe so. Learning another language opens doors to new cultures and enhances career opportunities.' }
      ],
      useful_phrases: ['mother tongue', 'essential for', 'conducted in', 'challenging aspect', 'opens doors to'],
      model_answer_text: 'Grammar focus: present simple and continuous, superlatives, should for opinions.',
      band_descriptors: { grammar: 'Present continuous for ongoing learning, superlatives, because/since', arabic_tip: 'اربط تعلم اللغة بأهدافك الشخصية وأعط أسباب واضحة ومحددة.' }
    },
    {
      part: 1, sort_order: 17, is_published: true,
      topic: 'Hobbies / الهوايات',
      questions: [
        { q: 'What hobbies do you have?', sample: 'My main hobbies are photography and calligraphy. I find Arabic calligraphy to be a beautiful art form.' },
        { q: 'When did you start this hobby?', sample: 'I picked up photography about three years ago when I got my first proper camera as a birthday gift.' },
        { q: 'Do you spend a lot of time on your hobbies?', sample: 'I try to dedicate at least a few hours every weekend to my hobbies.' },
        { q: 'Would you like to take up any new hobbies?', sample: 'I would love to try pottery or ceramics. There is a new workshop in my area I am considering joining.' }
      ],
      useful_phrases: ['picked up', 'art form', 'dedicate time to', 'study commitments', 'take up a hobby'],
      model_answer_text: 'Grammar focus: past simple for when you started, present perfect continuous for ongoing progress.',
      band_descriptors: { grammar: 'Picked up, have been + gerund, would love to', arabic_tip: 'لا تقل My hobby is reading فقط. أعط تفاصيل: متى بدأت، لماذا تحبها.' }
    },
    {
      part: 1, sort_order: 18, is_published: true,
      topic: 'Clothes & Fashion / الملابس والأزياء',
      questions: [
        { q: 'Do you care about fashion?', sample: 'I appreciate looking well-dressed, but I would not consider myself a fashion follower. I prefer classic, comfortable clothing.' },
        { q: 'What kind of clothes do you usually wear?', sample: 'On a daily basis, I tend to wear smart casual outfits. For formal occasions, I enjoy wearing traditional Saudi attire.' },
        { q: 'Has your fashion sense changed over the years?', sample: 'Yes, quite a bit. I now focus on quality over quantity and choose timeless pieces.' },
        { q: 'Do you think clothes reflect a person personality?', sample: 'To some extent, yes. The way someone dresses can indicate their personality and cultural background.' }
      ],
      useful_phrases: ['well-dressed', 'personal style', 'smart casual', 'quality over quantity', 'timeless rather than trendy'],
      model_answer_text: 'Grammar focus: present simple for preferences, comparatives.',
      band_descriptors: { grammar: 'Would not consider myself, tend to, quality over quantity', arabic_tip: 'تحدثي عن أسلوبك الشخصي بثقة واذكري مناسبات مختلفة.' }
    },
    {
      part: 1, sort_order: 19, is_published: true,
      topic: 'Health / الصحة',
      questions: [
        { q: 'How do you stay healthy?', sample: 'I try to maintain a balanced diet, exercise regularly, and get seven to eight hours of sleep each night.' },
        { q: 'Do you think people today are more health-conscious than before?', sample: 'I think so. There is much more awareness about nutrition, fitness, and mental health nowadays.' },
        { q: 'Is there anything you would like to change about your health habits?', sample: 'I would like to reduce my sugar intake and be more consistent with my exercise routine.' },
        { q: 'What do you do when you feel unwell?', sample: 'I usually rest at home and drink warm fluids. If symptoms persist, I visit a doctor.' }
      ],
      useful_phrases: ['balanced diet', 'health-conscious', 'mental health awareness', 'prioritize health', 'self-diagnose'],
      model_answer_text: 'Grammar focus: try to + infinitive, comparatives, would like to.',
      band_descriptors: { grammar: 'Try to + infinitive, would like to, when/if clauses', arabic_tip: 'اذكر عادات صحية محددة تمارسها فعلا، لا تتحدث بشكل عام فقط.' }
    },
    {
      part: 1, sort_order: 20, is_published: true,
      topic: 'Social Media / وسائل التواصل الاجتماعي',
      questions: [
        { q: 'Which social media platforms do you use?', sample: 'I mainly use Snapchat and Instagram for connecting with friends, and Twitter for news.' },
        { q: 'How much time do you spend on social media daily?', sample: 'Probably about two hours a day, mostly in the evening. I try to limit usage so it does not interfere with studies.' },
        { q: 'Do you think social media has more advantages or disadvantages?', sample: 'I believe advantages slightly outweigh the disadvantages. It connects people globally, though it can be time-consuming.' },
        { q: 'Do you post content on social media often?', sample: 'Not very often. I am more of a passive user who browses content rather than creating it.' }
      ],
      useful_phrases: ['connecting with', 'current events', 'interfere with', 'outweigh the disadvantages', 'passive user'],
      model_answer_text: 'Grammar focus: present simple for habits, comparatives, I believe/think for opinions.',
      band_descriptors: { grammar: 'Try to + infinitive, outweigh, more of a... than', arabic_tip: 'أعط رأي متوازن واذكر أمثلة من تجربتك الشخصية مع وسائل التواصل.' }
    }
  ];

  const { data, error } = await supabase.from('ielts_speaking_questions').insert(topics).select('id');
  if (error) {
    console.log('ERROR inserting Part 1:', error.message);
  } else {
    console.log('Part 1 inserted successfully:', data.length, 'topic sets (80 questions total)');
  }
}

insertPart1();
