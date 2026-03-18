require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function insertPart3() {
  const { data: existing } = await supabase.from('ielts_speaking_questions').select('id').eq('part', 3);
  if (existing && existing.length > 0) {
    console.log('Part 3 already exists:', existing.length, 'records. Skipping.');
    return;
  }

  const discussionSets = [
    {
      part: 3, sort_order: 41, is_published: true,
      topic: 'Education & Teachers / التعليم والمعلمون',
      follow_up_questions: { linked_part2: 'Describe a teacher who influenced you' },
      questions: [
        { q: 'What role do you think teachers play compared to technology in education today?', model_points: ['Teachers provide mentorship and emotional support that technology cannot replicate', 'Technology offers access to vast resources and personalized learning', 'The ideal approach combines both — teachers guide while technology supplements', 'Critical thinking and soft skills are best taught through human interaction'] },
        { q: 'How have teaching methods changed in your country over the past few decades?', model_points: ['Shift from rote memorization to critical thinking and project-based learning', 'Integration of digital tools and online platforms', 'More emphasis on student-centered learning vs. teacher-led lectures', 'Growing acceptance of collaborative and interactive approaches'] },
        { q: 'Do you think education should be standardized across all countries?', model_points: ['Standardization ensures equal quality and opportunities globally', 'However, cultural context matters — education should reflect local values', 'Core subjects can be standardized while allowing cultural flexibility', 'Different economic realities make full standardization impractical'] },
        { q: 'Some people believe that life experience is more valuable than formal education. Do you agree?', model_points: ['Both have unique advantages — formal education provides structured knowledge', 'Life experience teaches practical skills and resilience', 'The most successful people often combine both', 'It depends on the field — some careers require formal qualifications'] },
        { q: 'How might artificial intelligence change the role of teachers in the future?', model_points: ['AI could handle administrative tasks, freeing teachers for mentoring', 'Personalized AI tutors may supplement classroom teaching', 'Teachers will need to adapt by developing uniquely human skills', 'The emotional and social role of teachers will become even more important'] }
      ],
      useful_phrases: ['It could be argued that', 'From my perspective', 'There are merits to both sides', 'Having said that', 'On the whole, I believe', 'It is worth considering', 'The evidence suggests', 'In the grand scheme of things'],
      model_answer_text: 'Advanced vocabulary: pedagogy, curriculum, rote learning, critical thinking, holistic education, academic rigor, lifelong learning, standardization, mentorship, cognitive development',
      band_descriptors: {
        grammar_structures: ['Mixed conditionals', 'Passive voice for formal discussion', 'Complex sentence structures', 'Hedging language (tend to, it seems that)'],
        arabic_tips: 'في الجزء الثالث، قدم رأيك بوضوح ثم ادعمه بأمثلة. لا تكتفِ بجملة واحدة. استخدم عبارات مثل: From my perspective, Having said that.'
      }
    },
    {
      part: 3, sort_order: 42, is_published: true,
      topic: 'Travel & Tourism / السفر والسياحة',
      follow_up_questions: { linked_part2: 'Describe a place you visited recently' },
      questions: [
        { q: 'What impact does tourism have on local communities?', model_points: ['Positive: creates jobs, boosts local economy, cultural exchange', 'Negative: environmental damage, overcrowding, loss of cultural authenticity', 'Can increase living costs for locals', 'Responsible tourism policies can mitigate negative effects'] },
        { q: 'How can tourists be more responsible when traveling?', model_points: ['Respect local customs, dress codes, and traditions', 'Support local businesses rather than international chains', 'Minimize environmental footprint — reduce waste, use public transport', 'Learn basic phrases in the local language'] },
        { q: 'Do you think virtual tourism could ever replace real travel?', model_points: ['Virtual reality can offer accessibility to those who cannot travel physically', 'However, it cannot replicate sensory experiences — taste, smell, touch', 'Real travel provides personal growth through unexpected encounters', 'Virtual tourism may complement but never fully replace authentic experiences'] },
        { q: 'Should governments invest more in promoting tourism or controlling it?', model_points: ['Balance is essential — promotion brings revenue but overuse damages sites', 'Sustainable tourism models should be the priority', 'Some fragile ecosystems need strict visitor limits', 'Revenue from tourism should be reinvested in preservation'] }
      ],
      useful_phrases: ['There is no denying that', 'While I see the merits of', 'It is a double-edged sword', 'On balance', 'One cannot overlook', 'The flip side is', 'It boils down to', 'Taking everything into account'],
      model_answer_text: 'Advanced vocabulary: sustainable tourism, ecotourism, cultural heritage, infrastructure, overtourism, carbon footprint, authenticity, commodification, preservation, indigenous',
      band_descriptors: {
        grammar_structures: ['Conditional sentences for hypothetical', 'Passive for impersonal statements', 'Comparative structures', 'Concession clauses (although, despite)'],
        arabic_tips: 'استخدم أمثلة من واقع السعودية مثل مشاريع السياحة الجديدة في نيوم والعلا لدعم إجاباتك.'
      }
    },
    {
      part: 3, sort_order: 43, is_published: true,
      topic: 'Reading & Media / القراءة والإعلام',
      follow_up_questions: { linked_part2: 'Describe a book you enjoyed reading' },
      questions: [
        { q: 'Do you think physical books will eventually disappear?', model_points: ['E-books are convenient but physical books offer a unique sensory experience', 'Many readers prefer the tangibility of real books', 'Libraries and bookstores continue to adapt and survive', 'Both formats will likely coexist for the foreseeable future'] },
        { q: 'How have reading habits changed with the rise of social media?', model_points: ['Attention spans have shortened — people prefer quick content', 'Long-form reading has declined among younger generations', 'However, social media also promotes books through communities', 'Audiobooks and podcasts have created new forms of consuming literature'] },
        { q: 'Is social media a reliable source of news compared to traditional media?', model_points: ['Social media offers speed and accessibility', 'However, misinformation and fake news are major concerns', 'Traditional media follows editorial standards and fact-checking', 'Critical media literacy is essential for navigating both'] },
        { q: 'Should governments do more to encourage people to read?', model_points: ['Public libraries and reading programs make books accessible', 'Schools should integrate reading for pleasure into curricula', 'Tax incentives for publishers could lower book prices', 'Reading campaigns targeting adults could revive the habit'] }
      ],
      useful_phrases: ['It stands to reason that', 'One might argue that', 'The evidence points to', 'In light of recent trends', 'I am inclined to think', 'For the foreseeable future', 'There is a growing consensus', 'It remains to be seen'],
      model_answer_text: 'Advanced vocabulary: literacy rate, print media, digital era, misinformation, editorial integrity, attention span, bibliography, intellectual stimulation, censorship, propaganda',
      band_descriptors: {
        grammar_structures: ['Future continuous and perfect', 'Relative clauses for elaboration', 'Whether... or... for presenting options', 'Not only... but also for emphasis'],
        arabic_tips: 'قارن بين الماضي والحاضر لإظهار قدرتك على التحليل. استخدم whereas وwhile للمقارنة.'
      }
    },
    {
      part: 3, sort_order: 44, is_published: true,
      topic: 'Culture & Traditions / الثقافة والتقاليد',
      follow_up_questions: { linked_part2: 'Describe a celebration or festival you attended' },
      questions: [
        { q: 'How can societies preserve their traditions in the modern world?', model_points: ['Document and record traditions through media and archives', 'Integrate cultural education into school curricula', 'Support cultural events and festivals financially', 'Balance preservation with natural evolution of traditions'] },
        { q: 'Does globalization threaten cultural identity?', model_points: ['Globalization can lead to cultural homogenization', 'However, it also creates opportunities for cultural exchange', 'Strong cultural roots help communities resist losing identity', 'Technology enables sharing of diverse cultures worldwide'] },
        { q: 'Should traditions evolve with time or be kept unchanged?', model_points: ['Traditions naturally evolve as societies change', 'Core values can be preserved while updating practices', 'Rigid preservation may make traditions irrelevant to youth', 'The key is maintaining the essence while adapting the form'] },
        { q: 'What role do cultural festivals play in building community?', model_points: ['They strengthen social bonds and collective identity', 'Provide a sense of belonging and shared heritage', 'Economic benefits through tourism and local business', 'Bridge generational gaps through shared experiences'] }
      ],
      useful_phrases: ['It is imperative that', 'Traditions serve as a foundation for', 'In an increasingly globalized world', 'Cultural heritage is at stake', 'One must strike a balance between', 'At the heart of the matter', 'It goes without saying', 'From a cultural standpoint'],
      model_answer_text: 'Advanced vocabulary: cultural heritage, globalization, homogenization, assimilation, indigenous, intangible, rituals, customs, multicultural, collective identity',
      band_descriptors: {
        grammar_structures: ['Should for recommendations', 'Modal perfects for missed opportunities', 'Cleft sentences for emphasis', 'Participle clauses'],
        arabic_tips: 'تحدث عن التجربة السعودية في الحفاظ على التراث مع التحديث كمثال قوي على التوازن.'
      }
    },
    {
      part: 3, sort_order: 45, is_published: true,
      topic: 'Learning & Skills / التعلم والمهارات',
      follow_up_questions: { linked_part2: 'Describe a skill you learned recently' },
      questions: [
        { q: 'Is formal education or self-learning more effective?', model_points: ['Formal education provides structure, credentials, and social learning', 'Self-learning offers flexibility and personalized pace', 'Online courses bridge the gap between both', 'Effectiveness depends on the learner and the subject'] },
        { q: 'What skills do you think will be most important in the future?', model_points: ['Digital literacy and technological skills', 'Critical thinking and problem-solving', 'Adaptability and emotional intelligence', 'Communication and collaboration across cultures'] },
        { q: 'Should schools focus more on practical skills than academic subjects?', model_points: ['Practical skills prepare students for real-world challenges', 'Academic knowledge provides the foundation for critical thinking', 'A balanced curriculum incorporating both is ideal', 'Vocational training should be valued equally'] },
        { q: 'How has the internet changed the way people learn new skills?', model_points: ['Unlimited access to tutorials, courses, and expert knowledge', 'Learning is more democratic — anyone can access information', 'Shorter attention spans may affect depth of learning', 'Online communities provide peer support and motivation'] }
      ],
      useful_phrases: ['In the long run', 'When it comes to', 'There is a strong case for', 'It is essential that', 'The landscape has shifted', 'One cannot underestimate', 'This raises the question of', 'By and large'],
      model_answer_text: 'Advanced vocabulary: vocational, autodidact, curriculum, competency, cognitive, aptitude, lifelong learning, entrepreneurial, digital literacy, transferable skills',
      band_descriptors: {
        grammar_structures: ['Comparative and superlative structures', 'It is + adjective + that clause', 'Whether... depends on...', 'The more... the more...'],
        arabic_tips: 'اربط إجابتك بأمثلة واقعية من تجربتك. لا تتحدث نظريا فقط.'
      }
    },
    {
      part: 3, sort_order: 46, is_published: true,
      topic: 'Role Models & Influence / القدوة والتأثير',
      follow_up_questions: { linked_part2: 'Describe a person you admire' },
      questions: [
        { q: 'Who do you think influences young people the most today?', model_points: ['Social media influencers have enormous reach among youth', 'Parents and family still play a foundational role', 'Peer pressure remains a powerful influence', 'Teachers and mentors shape long-term values'] },
        { q: 'Is celebrity culture a positive or negative influence on society?', model_points: ['Positive: celebrities can raise awareness for important causes', 'Negative: unrealistic beauty standards and materialism', 'Young people may prioritize fame over genuine accomplishment', 'Depends on the individual celebrity and their message'] },
        { q: 'What qualities make a good leader?', model_points: ['Integrity and honesty build trust', 'Vision and the ability to inspire others', 'Emotional intelligence and empathy', 'Decisiveness balanced with openness to feedback'] },
        { q: 'Do you think people need role models to succeed?', model_points: ['Role models provide inspiration and a roadmap', 'Self-motivation can drive success without external models', 'Negative role models can also motivate through contrast', 'Having diverse role models helps broaden perspectives'] }
      ],
      useful_phrases: ['It is widely believed that', 'There is a fine line between', 'One school of thought suggests', 'The reality is somewhat more nuanced', 'This is a contentious issue', 'It has been increasingly recognized', 'From a sociological perspective', 'The crux of the matter is'],
      model_answer_text: 'Advanced vocabulary: charisma, integrity, influential, aspirational, materialistic, superficial, accountability, philanthropy, authentic, peer pressure',
      band_descriptors: {
        grammar_structures: ['Reported speech for citing opinions', 'Tend to / are likely to for generalizations', 'It is often the case that', 'While... it is also true that...'],
        arabic_tips: 'قدم منظورك الخاص لكن اعترف بالآراء المختلفة. هذا يظهر نضجك الفكري.'
      }
    },
    {
      part: 3, sort_order: 47, is_published: true,
      topic: 'Planning & Expectations / التخطيط والتوقعات',
      follow_up_questions: { linked_part2: 'Describe a trip that did not go as planned' },
      questions: [
        { q: 'How important is planning compared to being spontaneous?', model_points: ['Planning reduces stress and increases efficiency', 'Spontaneity allows creativity and seizing unexpected opportunities', 'Over-planning can lead to rigidity and disappointment', 'The best approach combines structure with flexibility'] },
        { q: 'How do people typically deal with unexpected situations?', model_points: ['Reactions vary based on personality and experience', 'Resilient people adapt quickly and find solutions', 'Support networks help people cope with adversity', 'Cultural background influences coping strategies'] },
        { q: 'Can failure be beneficial for personal growth?', model_points: ['Failure teaches valuable lessons that success cannot', 'It builds resilience and character', 'Many successful people attribute their growth to past failures', 'However, repeated failure without support can be damaging'] },
        { q: 'Do you think people in your generation plan too much or too little for the future?', model_points: ['Social media creates pressure to have a perfect life plan', 'Economic uncertainty makes long-term planning difficult', 'Some prioritize present experiences over future planning', 'Cultural expectations influence planning behavior'] }
      ],
      useful_phrases: ['That largely depends on', 'Speaking from experience', 'It would be fair to say', 'The notion that', 'Conversely', 'As a general rule', 'In the face of adversity', 'All things considered'],
      model_answer_text: 'Advanced vocabulary: contingency, spontaneous, meticulous, resilience, adaptability, setback, flexibility, pragmatic, foresight, improvisation',
      band_descriptors: {
        grammar_structures: ['Third conditional for past hypotheticals', 'Had I known... I would have...', 'Regardless of whether...', 'It is often said that...'],
        arabic_tips: 'استخدم أمثلة شخصية لدعم رأيك ثم عمم على المجتمع. هذا يُظهر عمق تفكيرك.'
      }
    },
    {
      part: 3, sort_order: 48, is_published: true,
      topic: 'Technology & Society / التكنولوجيا والمجتمع',
      follow_up_questions: { linked_part2: 'Describe a piece of technology you use daily' },
      questions: [
        { q: 'Do you think people are becoming too dependent on technology?', model_points: ['Many daily tasks now require technology', 'Over-reliance can reduce basic skills like navigation or mental math', 'Technology dependency varies across generations and contexts', 'Mindful use of technology is the key to balance'] },
        { q: 'How might artificial intelligence change the future of work?', model_points: ['AI will automate routine and repetitive tasks', 'New job categories will emerge around AI management', 'Workers will need to upskill and adapt continuously', 'Creative and interpersonal roles will remain human-centric'] },
        { q: 'Is there a digital divide between generations?', model_points: ['Younger generations are digital natives with intuitive tech skills', 'Older generations may struggle with rapid technological change', 'Governments and organizations should provide digital literacy programs', 'Intergenerational knowledge sharing benefits both sides'] },
        { q: 'Should there be stricter regulations on technology companies?', model_points: ['Data privacy concerns warrant stronger protection', 'Monopolistic practices can stifle competition', 'Over-regulation may slow innovation', 'Balanced regulation protects users without hampering progress'] }
      ],
      useful_phrases: ['In this day and age', 'It is becoming increasingly apparent', 'The ramifications of', 'We are witnessing a shift towards', 'There needs to be a balance', 'The jury is still out on', 'Looking at the bigger picture', 'It is a matter of finding equilibrium'],
      model_answer_text: 'Advanced vocabulary: automation, digital divide, surveillance, algorithm, data privacy, innovation, disruption, cybersecurity, monopoly, regulation',
      band_descriptors: {
        grammar_structures: ['Future predictions with will/might/could', 'It remains to be seen whether', 'Passive voice for objectivity', 'Cause and effect structures'],
        arabic_tips: 'ناقش الموضوع من عدة زوايا: اقتصادية، اجتماعية، أخلاقية. هذا يرفع درجتك.'
      }
    },
    {
      part: 3, sort_order: 49, is_published: true,
      topic: 'Helping Others / مساعدة الآخرين',
      follow_up_questions: { linked_part2: 'Describe a time you helped someone' },
      questions: [
        { q: 'What role does volunteering play in society?', model_points: ['Volunteering builds community cohesion and social bonds', 'Provides essential services that governments may not cover', 'Develops soft skills and empathy in volunteers', 'Creates a culture of giving and social responsibility'] },
        { q: 'Should helping others be made mandatory, for example in schools?', model_points: ['Mandatory service ensures everyone contributes', 'However, forced volunteering may reduce genuine motivation', 'Exposure through school programs can spark lasting interest', 'Incentive-based approaches may be more effective than mandates'] },
        { q: 'Is it the responsibility of individuals or governments to help the less fortunate?', model_points: ['Both share responsibility but at different scales', 'Governments have the resources for systemic change', 'Individual acts of kindness address immediate needs', 'Charitable organizations bridge the gap between both'] },
        { q: 'How has technology changed the way people help each other?', model_points: ['Crowdfunding platforms enable global support', 'Social media raises awareness for causes quickly', 'Apps connect volunteers with opportunities efficiently', 'Digital payments make donating easier than ever'] }
      ],
      useful_phrases: ['It is a shared responsibility', 'One could make the case that', 'From a humanitarian perspective', 'The underlying issue is', 'While well-intentioned', 'There is a compelling argument for', 'At the end of the day', 'It comes down to'],
      model_answer_text: 'Advanced vocabulary: philanthropy, altruism, humanitarian, advocacy, empowerment, marginalized, welfare, charitable, communal, social cohesion',
      band_descriptors: {
        grammar_structures: ['Should / ought to for recommendations', 'It is the responsibility of... to...', 'Whether... or... depends on', 'Rather than + gerund'],
        arabic_tips: 'اربط إجابتك بقيم المجتمع السعودي مثل التكافل والعمل التطوعي في رؤية 2030.'
      }
    },
    {
      part: 3, sort_order: 50, is_published: true,
      topic: 'Childhood & Memory / الطفولة والذاكرة',
      follow_up_questions: { linked_part2: 'Describe your favorite childhood memory' },
      questions: [
        { q: 'How does childhood shape a person personality?', model_points: ['Early experiences form foundational values and beliefs', 'Parenting styles significantly impact emotional development', 'Both positive and negative experiences contribute to character', 'Childhood friendships teach social skills and cooperation'] },
        { q: 'Are children today different from previous generations?', model_points: ['Technology has changed play patterns and social interaction', 'Children today have access to more information', 'Attention spans may be shorter due to digital stimulation', 'They are more globally aware but may lack outdoor experiences'] },
        { q: 'What is the role of play in child development?', model_points: ['Play develops creativity, imagination, and problem-solving', 'Physical play builds motor skills and promotes health', 'Social play teaches cooperation, sharing, and conflict resolution', 'Unstructured play is essential for emotional development'] },
        { q: 'Should children be given more freedom or more structure?', model_points: ['Both are needed in appropriate balance', 'Too much freedom without guidance can be overwhelming', 'Over-structured environments may stifle creativity', 'Age-appropriate independence fosters confidence'] }
      ],
      useful_phrases: ['It is generally accepted that', 'Research has shown that', 'There is a direct correlation between', 'From a developmental perspective', 'It goes without saying that', 'This is particularly true in the case of', 'The formative years are crucial', 'One must bear in mind that'],
      model_answer_text: 'Advanced vocabulary: formative, developmental, nurture, cognitive, socialization, resilience, upbringing, milestone, stimulation, impressionable',
      band_descriptors: {
        grammar_structures: ['Used to vs. would for past habits', 'Comparative structures', 'It is widely acknowledged that', 'The extent to which...'],
        arabic_tips: 'استخدم مقارنات بين الأجيال (جيلك وجيل أهلك) لإثراء إجابتك بأمثلة واقعية.'
      }
    },
    {
      part: 3, sort_order: 51, is_published: true,
      topic: 'Architecture & Design / العمارة والتصميم',
      follow_up_questions: { linked_part2: 'Describe a building you find interesting' },
      questions: [
        { q: 'Should cities prioritize modern architecture or preserve historical buildings?', model_points: ['Historical buildings represent cultural heritage and identity', 'Modern architecture meets contemporary functional needs', 'Adaptive reuse combines preservation with modernization', 'Urban planning should integrate both thoughtfully'] },
        { q: 'How do buildings and spaces affect people mood and productivity?', model_points: ['Natural light and open spaces boost wellbeing', 'Color schemes and design elements influence emotions', 'Crowded or poorly designed spaces increase stress', 'Biophilic design incorporating nature improves mental health'] },
        { q: 'What is the importance of sustainable building design?', model_points: ['Reduces environmental impact and carbon emissions', 'Lower energy costs benefit occupants long-term', 'Green buildings improve air quality and occupant health', 'Sets a standard for future construction practices'] },
        { q: 'Do you think architecture reflects the values of a society?', model_points: ['Religious buildings reflect spiritual priorities', 'Government buildings signal power and governance style', 'Residential design reflects family structures and social norms', 'Modern sustainable designs reflect environmental consciousness'] }
      ],
      useful_phrases: ['It is a reflection of', 'The way a city is designed', 'From an aesthetic standpoint', 'There is a growing trend towards', 'It speaks volumes about', 'The built environment plays a crucial role', 'Architectural integrity', 'Form follows function'],
      model_answer_text: 'Advanced vocabulary: sustainable, biophilic, facade, aesthetics, heritage, restoration, urbanization, infrastructure, minimalist, eco-friendly',
      band_descriptors: {
        grammar_structures: ['Passive for describing construction', 'Comparative for contrasting styles', 'It is designed to + infinitive', 'Not only... but also'],
        arabic_tips: 'اذكر أمثلة من العمارة السعودية: المسجد الحرام، مشروع البوليفارد، العمارة الطينية في الدرعية.'
      }
    },
    {
      part: 3, sort_order: 52, is_published: true,
      topic: 'Entertainment & Media / الترفيه والإعلام',
      follow_up_questions: { linked_part2: 'Describe a movie or show you recommend' },
      questions: [
        { q: 'How does media influence society values and behavior?', model_points: ['Media shapes perceptions, attitudes, and aspirations', 'Advertising creates consumer culture and unrealistic expectations', 'Positive representation can promote inclusivity', 'Media literacy helps people critically evaluate content'] },
        { q: 'Should media content be censored?', model_points: ['Age-appropriate restrictions protect children', 'Freedom of expression is a fundamental right', 'Cultural sensitivities should be respected', 'Self-regulation by industry may be preferable to government censorship'] },
        { q: 'Has the rise of streaming changed how we consume entertainment?', model_points: ['On-demand viewing has replaced scheduled programming', 'Binge-watching culture has changed storytelling formats', 'International content is more accessible than ever', 'Traditional cinema faces challenges but offers unique experiences'] },
        { q: 'Is locally produced content as valuable as international entertainment?', model_points: ['Local content preserves cultural identity and language', 'It creates employment in the domestic creative industry', 'International content provides exposure to diverse perspectives', 'Audiences benefit from consuming both local and global content'] }
      ],
      useful_phrases: ['It is undeniable that', 'Media plays a pivotal role in', 'The proliferation of', 'It raises ethical questions about', 'The trend towards', 'Content creators have a responsibility to', 'In the age of information', 'One should be discerning about'],
      model_answer_text: 'Advanced vocabulary: censorship, propaganda, representation, algorithm, binge-watching, streaming, narrative, demographic, mainstream, niche',
      band_descriptors: {
        grammar_structures: ['Present perfect continuous for trends', 'It has been argued that', 'Whether or not + clause', 'Given the fact that'],
        arabic_tips: 'ناقش التغييرات الأخيرة في قطاع الترفيه السعودي كمثال حي على تطور الإعلام.'
      }
    },
    {
      part: 3, sort_order: 53, is_published: true,
      topic: 'Decision Making / اتخاذ القرارات',
      follow_up_questions: { linked_part2: 'Describe a time you made a difficult decision' },
      questions: [
        { q: 'Who should make major life decisions — the individual or their family?', model_points: ['Individual autonomy is important for personal growth', 'Family wisdom and experience can prevent mistakes', 'Cultural context influences decision-making norms', 'Collaborative decision-making often yields the best results'] },
        { q: 'Does age necessarily bring wisdom in decision making?', model_points: ['Experience does provide valuable perspective', 'However, wisdom is not exclusively tied to age', 'Young people may bring fresh, innovative perspectives', 'Emotional maturity matters more than chronological age'] },
        { q: 'Are rational decisions always better than emotional ones?', model_points: ['Rational decisions minimize risk and bias', 'Emotional intelligence provides important intuitive signals', 'Major life decisions often require both head and heart', 'Purely rational approaches may ignore human values and relationships'] },
        { q: 'How do cultural differences affect decision-making styles?', model_points: ['Collectivist cultures prioritize group harmony', 'Individualist cultures emphasize personal autonomy', 'Religious and spiritual values guide decisions in many cultures', 'Globalization is gradually blending decision-making approaches'] }
      ],
      useful_phrases: ['It is a matter of personal judgment', 'The stakes are particularly high when', 'One must weigh the consequences', 'From a rational standpoint', 'Intuition should not be disregarded', 'It varies considerably across', 'The deciding factor is often', 'In retrospect'],
      model_answer_text: 'Advanced vocabulary: autonomy, consensus, deliberation, impulsive, rational, intuitive, pragmatic, collectivist, individualist, consequences',
      band_descriptors: {
        grammar_structures: ['Mixed conditionals', 'Whether... or... for presenting dilemmas', 'It is not uncommon for... to...', 'Having considered all options'],
        arabic_tips: 'استخدم مصطلحات الاستشارة والشورى كمثال على القرارات الجماعية في ثقافتنا.'
      }
    },
    {
      part: 3, sort_order: 54, is_published: true,
      topic: 'Gift Giving / تبادل الهدايا',
      follow_up_questions: { linked_part2: 'Describe a gift you gave or received' },
      questions: [
        { q: 'Has modern society become too materialistic?', model_points: ['Consumer culture encourages excessive buying', 'Social media intensifies comparison and desire for material goods', 'However, many people are embracing minimalism', 'Materialism varies across cultures and individual values'] },
        { q: 'How do cultural differences affect gift-giving customs?', model_points: ['Some cultures value expensive gifts as signs of respect', 'Others prioritize the thought and effort behind a gift', 'Certain items may be taboo in different cultures', 'Understanding customs prevents social misunderstandings'] },
        { q: 'Is it better to give experiences rather than material objects?', model_points: ['Experiences create lasting memories and personal growth', 'Material gifts can have sentimental value over time', 'Experiences are often shared, strengthening relationships', 'The best gift depends on the recipient preferences'] },
        { q: 'Do you think gift-giving will change in the digital age?', model_points: ['Digital gift cards and online shopping are increasingly common', 'Virtual gifts and subscriptions are growing in popularity', 'Personalization through technology makes gifts more meaningful', 'The core sentiment behind gift-giving remains unchanged'] }
      ],
      useful_phrases: ['In consumer-driven societies', 'The sentiment behind', 'It transcends material value', 'Cultural norms dictate', 'There has been a shift towards', 'The symbolic meaning of', 'Regardless of monetary value', 'What truly matters is'],
      model_answer_text: 'Advanced vocabulary: materialism, consumerism, sentimental, reciprocity, gesture, symbolic, etiquette, customary, generous, token',
      band_descriptors: {
        grammar_structures: ['Comparative for contrasting cultures', 'It is customary to + infinitive', 'What matters most is...', 'Regardless of + noun'],
        arabic_tips: 'تحدث عن ثقافة الكرم والإهداء في المجتمع السعودي كمثال فريد.'
      }
    },
    {
      part: 3, sort_order: 55, is_published: true,
      topic: 'Relaxation & Wellbeing / الاسترخاء والرفاهية',
      follow_up_questions: { linked_part2: 'Describe a place where you feel relaxed' },
      questions: [
        { q: 'Is work-life balance achievable in modern society?', model_points: ['Remote work has blurred boundaries between work and personal life', 'Cultural expectations around working hours vary globally', 'Employers are increasingly recognizing the importance of balance', 'Individual boundaries and time management are essential'] },
        { q: 'Why do you think stress is so common in modern life?', model_points: ['Fast-paced lifestyle and constant connectivity', 'Financial pressures and cost of living', 'Social comparison amplified by social media', 'Reduced time for hobbies and personal relationships'] },
        { q: 'Should mental health be given the same priority as physical health?', model_points: ['Mental and physical health are interconnected', 'Stigma around mental health prevents people from seeking help', 'Workplace mental health programs are becoming essential', 'Early intervention can prevent more serious conditions'] },
        { q: 'How can governments promote wellbeing among their citizens?', model_points: ['Invest in public parks, green spaces, and recreational facilities', 'Implement reasonable working hour regulations', 'Make mental health services accessible and affordable', 'Promote preventive health through education campaigns'] }
      ],
      useful_phrases: ['In an increasingly fast-paced world', 'It is crucial to prioritize', 'The toll it takes on', 'There is a growing awareness of', 'Burnout has become endemic', 'Holistic wellbeing encompasses', 'Governments have a duty to', 'Prevention is better than cure'],
      model_answer_text: 'Advanced vocabulary: burnout, mindfulness, holistic, therapeutic, rejuvenation, sedentary, cortisol, meditation, resilience, occupational wellbeing',
      band_descriptors: {
        grammar_structures: ['Should / ought to for recommendations', 'The more... the more...', 'It is high time that + past simple', 'Unless + clause for warnings'],
        arabic_tips: 'ناقش التغييرات الإيجابية في السعودية مثل مبادرات جودة الحياة وموسم الرياض.'
      }
    },
    {
      part: 3, sort_order: 56, is_published: true,
      topic: 'Learning from Mistakes / التعلم من الأخطاء',
      follow_up_questions: { linked_part2: 'Describe a time you learned from a mistake' },
      questions: [
        { q: 'How can societies learn from historical mistakes?', model_points: ['Documenting history accurately prevents repeating errors', 'Education systems should teach critical analysis of past events', 'Memorials and museums serve as collective reminders', 'Open dialogue about past failures promotes accountability'] },
        { q: 'Is taking risks important in business and education?', model_points: ['Calculated risks drive innovation and progress', 'Fear of failure can paralyze decision-making', 'Educational environments should be safe spaces for trial and error', 'Successful entrepreneurs often embrace failure as learning'] },
        { q: 'Do you think punishment or rehabilitation is more effective for correcting mistakes?', model_points: ['Punishment deters but may not address root causes', 'Rehabilitation focuses on reform and reintegration', 'The effectiveness depends on the nature of the mistake', 'A balanced approach combining both may be most effective'] },
        { q: 'Why are some people afraid of making mistakes?', model_points: ['Cultural expectations and fear of judgment', 'Perfectionism amplified by social media', 'Past negative experiences with failure', 'Lack of a supportive environment that normalizes mistakes'] }
      ],
      useful_phrases: ['History has taught us that', 'The key takeaway is', 'It is through adversity that', 'A calculated risk', 'Rather than punishing', 'The root cause of', 'It is essential to foster an environment', 'The fear of failure often stems from'],
      model_answer_text: 'Advanced vocabulary: accountability, rehabilitation, deterrent, resilience, calculated risk, precedent, reform, consequence, trial and error, retrospective',
      band_descriptors: {
        grammar_structures: ['Third conditional for reflecting on past', 'It would have been better if', 'Had they not + past participle', 'The fact that... suggests...'],
        arabic_tips: 'استخدم أمثلة تاريخية أو شخصية لدعم نقاطك. الأمثلة المحددة أقوى من العموميات.'
      }
    },
    {
      part: 3, sort_order: 57, is_published: true,
      topic: 'Health & Lifestyle / الصحة ونمط الحياة',
      follow_up_questions: { linked_part2: 'Describe an activity you do to stay healthy' },
      questions: [
        { q: 'What role should governments play in public health?', model_points: ['Regulate food industry standards and labeling', 'Fund public health campaigns and awareness programs', 'Ensure affordable access to healthcare services', 'Implement policies that promote healthy environments'] },
        { q: 'Is prevention more important than treatment in healthcare?', model_points: ['Prevention reduces long-term healthcare costs', 'Early detection improves treatment outcomes', 'However, treatment is essential for existing conditions', 'A healthcare system needs strong investment in both'] },
        { q: 'Should health education be a mandatory subject in schools?', model_points: ['Students need to understand nutrition, exercise, and mental health', 'Health literacy prevents costly mistakes in adulthood', 'Practical health skills empower lifelong self-care', 'It should be age-appropriate and culturally sensitive'] },
        { q: 'How has the understanding of health changed over the past century?', model_points: ['From treating illness to promoting holistic wellness', 'Mental health is now recognized alongside physical health', 'Technology enables personalized medicine and early detection', 'Global health challenges require international cooperation'] }
      ],
      useful_phrases: ['Public health is a cornerstone of', 'It is widely recognized that', 'Prevention is better than cure', 'The burden falls disproportionately on', 'Health literacy empowers', 'In terms of long-term outcomes', 'A proactive approach to', 'The healthcare landscape has evolved'],
      model_answer_text: 'Advanced vocabulary: preventive, holistic, epidemiology, chronic, sedentary, nutritional, pharmaceutical, subsidize, accessible, wellbeing',
      band_descriptors: {
        grammar_structures: ['Should for policy recommendations', 'Comparative for costs and outcomes', 'It has been proven that', 'The more accessible... the healthier...'],
        arabic_tips: 'اذكر المبادرات الصحية في السعودية مثل برامج التحول الصحي ضمن رؤية 2030.'
      }
    },
    {
      part: 3, sort_order: 58, is_published: true,
      topic: 'Friendship & Relationships / الصداقة والعلاقات',
      follow_up_questions: { linked_part2: 'Describe a friend who is important to you' },
      questions: [
        { q: 'Are online friendships as meaningful as face-to-face ones?', model_points: ['Online friendships offer connection regardless of distance', 'Face-to-face interactions build deeper emotional bonds', 'Body language and physical presence enhance communication', 'Online friendships can evolve into strong real-world relationships'] },
        { q: 'How do relationships change as people grow older?', model_points: ['People become more selective about friendships', 'Quality becomes more valued than quantity', 'Life stages create natural shifts in social circles', 'Long-standing friendships deepen with shared history'] },
        { q: 'What role does community play in modern life?', model_points: ['Community provides a sense of belonging and support', 'Urban lifestyles can lead to isolation', 'Online communities offer alternative forms of connection', 'Strong communities improve mental health and quality of life'] },
        { q: 'Do you think people are becoming more isolated despite being more connected?', model_points: ['Social media creates an illusion of connection without depth', 'Remote work reduces workplace social interactions', 'However, technology enables maintaining long-distance relationships', 'The quality of connections matters more than quantity'] }
      ],
      useful_phrases: ['In the digital age', 'Meaningful connections require', 'A sense of belonging', 'Despite being hyperconnected', 'The paradox of modern communication', 'It is the quality rather than quantity', 'Social bonds are strengthened through', 'There is growing evidence that'],
      model_answer_text: 'Advanced vocabulary: isolation, hyperconnected, intimacy, superficial, reciprocal, nurture, solidarity, empathy, rapport, interpersonal',
      band_descriptors: {
        grammar_structures: ['Despite + gerund for contrast', 'The more... the less...', 'It is ironic that', 'Whereas / while for comparison'],
        arabic_tips: 'قارن بين الصداقات الحقيقية والافتراضية بأمثلة من تجربتك الشخصية.'
      }
    },
    {
      part: 3, sort_order: 59, is_published: true,
      topic: 'Goals & Ambition / الأهداف والطموح',
      follow_up_questions: { linked_part2: 'Describe a goal you want to achieve' },
      questions: [
        { q: 'Is there too much pressure to succeed in modern society?', model_points: ['Social media creates constant comparison and pressure', 'Academic and career expectations can be overwhelming', 'Defining success personally rather than socially reduces pressure', 'Some pressure is motivating but excessive pressure is harmful'] },
        { q: 'Is job satisfaction more important than a high salary?', model_points: ['Satisfaction leads to better mental health and productivity', 'Financial security is necessary for basic needs and comfort', 'The ideal scenario combines both — meaningful work with fair pay', 'Priorities shift at different life stages'] },
        { q: 'How do goals and ambitions differ across cultures?', model_points: ['Collectivist cultures may prioritize family and community goals', 'Individualist cultures often focus on personal achievement', 'Economic conditions shape what is considered ambitious', 'Globalization is blending aspirations across cultures'] },
        { q: 'Should young people focus on short-term or long-term goals?', model_points: ['Short-term goals provide motivation and measurable progress', 'Long-term goals give direction and purpose', 'A combination of both creates a balanced approach', 'Breaking long-term goals into short-term milestones is effective'] }
      ],
      useful_phrases: ['The pressure to succeed', 'It is a balancing act between', 'Societal expectations often dictate', 'What constitutes success varies', 'Ambition should be tempered with', 'The pursuit of happiness', 'One size does not fit all', 'It is paramount to define success on one own terms'],
      model_answer_text: 'Advanced vocabulary: aspiration, ambition, contentment, fulfillment, materialism, prestige, vocation, meritocracy, burnout, self-actualization',
      band_descriptors: {
        grammar_structures: ['It depends on whether', 'The extent to which', 'While some may argue... others believe', 'One of the most pressing issues is'],
        arabic_tips: 'اذكر كيف تغيرت طموحات الشباب السعودي مع رؤية 2030 كمثال معاصر.'
      }
    },
    {
      part: 3, sort_order: 60, is_published: true,
      topic: 'Pride & Achievement / الفخر والإنجاز',
      follow_up_questions: { linked_part2: 'Describe a time you felt proud of yourself' },
      questions: [
        { q: 'What achievements make a society proud?', model_points: ['Scientific and technological breakthroughs', 'Cultural contributions recognized internationally', 'Social progress in education, healthcare, and equality', 'Sporting achievements and hosting global events'] },
        { q: 'Is individual achievement more valued than collective success in modern society?', model_points: ['Western cultures tend to celebrate individual heroes', 'Many Asian and Arab cultures value collective accomplishment', 'Team achievements in sports and business are widely celebrated', 'Both have their place in a balanced society'] },
        { q: 'How does recognition affect people motivation to achieve?', model_points: ['Positive recognition reinforces good behavior and effort', 'Public acknowledgment boosts confidence and self-worth', 'Over-reliance on external validation can be unhealthy', 'Intrinsic motivation is more sustainable long-term'] },
        { q: 'Should children be rewarded for every achievement?', model_points: ['Rewards can motivate and build confidence', 'However, over-rewarding may create entitlement', 'Effort should be praised as much as results', 'Teaching intrinsic satisfaction is more valuable long-term'] }
      ],
      useful_phrases: ['A source of national pride', 'The driving force behind', 'Recognition serves as a catalyst', 'There is a fine line between', 'Intrinsic vs. extrinsic motivation', 'It fosters a sense of', 'Achievement is often the product of', 'One of the hallmarks of a successful society'],
      model_answer_text: 'Advanced vocabulary: accomplishment, recognition, validation, meritocracy, collective, perseverance, intrinsic, extrinsic, entitlement, accolade',
      band_descriptors: {
        grammar_structures: ['It is often the case that', 'Not only... but also for emphasis', 'The greater the effort... the more...', 'What sets... apart is...'],
        arabic_tips: 'تحدث عن إنجازات المملكة الأخيرة مثل استضافة الأحداث الدولية وبرامج الفضاء كأمثلة على الفخر الوطني.'
      }
    }
  ];

  const { data, error } = await supabase.from('ielts_speaking_questions').insert(discussionSets).select('id');
  if (error) {
    console.log('ERROR inserting Part 3:', error.message);
  } else {
    console.log('Part 3 inserted successfully:', data.length, 'discussion sets');
  }
}

insertPart3();
