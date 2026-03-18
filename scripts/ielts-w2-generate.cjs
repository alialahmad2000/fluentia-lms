require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const tasks = [
  {
    task_type: 'task2',
    sub_type: 'opinion',
    title: 'Technology in Education',
    prompt: 'Some people believe that technology has made it easier for students to learn, while others argue that it has created more distractions than benefits.\n\nTo what extent do you agree or disagree that technology has improved education?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Identify the key question: Has technology improved education? This is an opinion essay — you must clearly state your position.',
        step2_brainstorm: 'For: access to information, interactive learning, flexible study times, global connections. Against: distractions, reduced attention spans, digital divide, less face-to-face interaction.',
        step3_outline: 'Intro (paraphrase + thesis) → Body 1 (main argument for) → Body 2 (second argument + concession) → Conclusion',
        step4_write: 'Spend 5 min planning, 30 min writing, 5 min checking'
      },
      paragraph_outline: {
        introduction: 'Paraphrase the question + clear thesis statement (agree/disagree/partially)',
        body1: 'Main benefit — access to vast learning resources and interactive tools (give example)',
        body2: 'Second benefit — flexibility and personalized learning + acknowledge distraction concern but argue it can be managed',
        conclusion: 'Restate position + summarize key reasons'
      },
      key_arguments: {
        for: ['Unlimited access to educational resources and online courses', 'Interactive tools make complex subjects more engaging', 'Flexible learning allows students to study at their own pace', 'Enables global collaboration between students and experts'],
        against: ['Social media and games on devices cause distraction', 'Excessive screen time affects concentration and health', 'Digital divide means not all students benefit equally', 'Reduces face-to-face social skills development']
      }
    },
    key_phrases: [
      'In my opinion / From my perspective',
      'I firmly believe that...',
      'One of the primary advantages is...',
      'A compelling argument in favour of... is...',
      'While some may contend that..., I would argue that...',
      'It is undeniable that...',
      'This can be clearly illustrated by...',
      'In conclusion, I am convinced that...',
      'The evidence strongly suggests that...',
      'Although there are valid concerns about...'
    ],
    model_answer_band7: 'The role of technology in education has become a subject of considerable debate. While some argue that digital tools have introduced unnecessary distractions, I firmly believe that technology has, on balance, significantly improved the learning experience for students.\n\nOne of the most compelling advantages of technology in education is the unprecedented access it provides to learning resources. Students today can access thousands of online courses, academic journals, and instructional videos from virtually anywhere. For instance, platforms offering free university-level courses have enabled millions of learners in developing countries to access education that was previously unavailable to them. This democratisation of knowledge would have been unimaginable without technological advancement.\n\nFurthermore, technology has enabled more personalised and flexible learning experiences. Adaptive learning software can identify individual students\' strengths and weaknesses, tailoring content accordingly. This is particularly beneficial in large classrooms where teachers cannot always provide individual attention. While critics rightly point out that devices can be distracting, this concern can be addressed through proper digital literacy education and appropriate classroom management policies rather than abandoning technology altogether.\n\nIn conclusion, despite legitimate concerns about distraction, I am convinced that the educational benefits of technology — including broader access to resources and personalised learning — far outweigh the drawbacks. The key lies not in rejecting technology but in teaching students to use it responsibly.',
    difficulty_band: '6.0-7.0',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 13
  },
  {
    task_type: 'task2',
    sub_type: 'opinion',
    title: 'Working from Home',
    prompt: 'Since the global pandemic, many companies have continued to allow employees to work from home. Some people think this is beneficial for both workers and employers, while others believe it has negative consequences.\n\nTo what extent do you agree or disagree that working from home is a positive development?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Opinion essay — state your position clearly. Consider both practical and social impacts.',
        step2_brainstorm: 'Positives: flexibility, no commute, work-life balance, reduced costs. Negatives: isolation, blurred boundaries, reduced collaboration, career progression concerns.',
        step3_outline: 'Intro → Body 1 (benefits for employees) → Body 2 (benefits for employers + address concerns) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Context (post-pandemic shift) + thesis',
        body1: 'Employee benefits: flexibility, no commute time, better work-life balance',
        body2: 'Employer benefits: reduced office costs, wider talent pool + acknowledge isolation risk but suggest hybrid model as solution',
        conclusion: 'Restate — largely positive when managed with a hybrid approach'
      },
      key_arguments: {
        for: ['Eliminates commuting time and costs', 'Greater flexibility improves work-life balance', 'Companies save on office space and utilities', 'Access to talent from different regions'],
        against: ['Social isolation and loneliness', 'Difficulty separating work and personal life', 'Reduced spontaneous collaboration and creativity', 'Junior employees may miss mentorship opportunities']
      }
    },
    key_phrases: [
      'It is widely acknowledged that...',
      'A significant advantage of this arrangement is...',
      'This trend has brought about...',
      'From a practical standpoint...',
      'Critics of remote work often cite...',
      'However, this drawback can be mitigated by...',
      'There is growing evidence to suggest that...',
      'On the whole, I believe that...',
      'A hybrid model could address...',
      'The long-term implications of this shift...'
    ],
    model_answer_band7: 'The shift towards remote work, accelerated by recent global events, has fundamentally changed how many people view employment. While there are legitimate concerns about this trend, I largely agree that working from home is a positive development, provided it is implemented thoughtfully.\n\nFor employees, the most immediate benefit is the elimination of daily commuting, which saves both time and money. In major cities, workers often spend two or more hours travelling to and from the office. This recovered time can be devoted to family, exercise, or personal development, significantly improving quality of life. Additionally, the flexibility to structure one\'s own working day allows individuals to work during their most productive hours.\n\nFrom an employer\'s perspective, remote work offers substantial cost savings on office space and utilities. Companies can also recruit from a much wider geographical area, accessing talent that would otherwise be unavailable. While some managers express concern about reduced collaboration, modern communication tools have largely bridged this gap. Furthermore, the adoption of hybrid models — combining remote and office-based work — effectively addresses concerns about social isolation while preserving the benefits of flexibility.\n\nIn conclusion, while working from home is not without its challenges, I believe the advantages for both employees and employers make it a predominantly positive development. The most effective approach appears to be a balanced hybrid model that combines the best of both arrangements.',
    difficulty_band: '6.0-7.0',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 14
  },
  {
    task_type: 'task2',
    sub_type: 'discussion',
    title: 'Traditional vs Modern Medicine',
    prompt: 'Some people prefer to use traditional or natural remedies when they are ill, while others believe that modern medicine is far more effective.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Discussion essay — you MUST discuss BOTH sides before giving your opinion.',
        step2_brainstorm: 'Traditional: fewer side effects, cultural significance, preventive, holistic. Modern: scientifically proven, treats serious diseases, fast-acting, standardised.',
        step3_outline: 'Intro → Body 1 (view 1: traditional medicine) → Body 2 (view 2: modern medicine) → Conclusion (your balanced opinion)',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Present the debate + indicate you will discuss both + hint at your position',
        body1: 'Arguments for traditional medicine — natural ingredients, fewer side effects, holistic approach, cultural heritage',
        body2: 'Arguments for modern medicine — scientific evidence, treats life-threatening conditions, rapid results, standardised dosages',
        conclusion: 'Your opinion — both have roles; modern for serious illness, traditional for prevention and minor ailments'
      },
      key_arguments: {
        traditional: ['Uses natural ingredients with fewer chemical side effects', 'Takes a holistic approach treating the whole person', 'Preserves cultural and historical knowledge', 'Often focuses on prevention rather than cure'],
        modern: ['Backed by scientific research and clinical trials', 'Can treat life-threatening diseases like cancer and heart disease', 'Provides standardised, reliable dosages', 'Produces faster and more predictable results']
      }
    },
    key_phrases: [
      'On the one hand... on the other hand...',
      'Those who advocate for... argue that...',
      'Proponents of... maintain that...',
      'A key advantage of... is...',
      'However, opponents counter that...',
      'There is a compelling case to be made for...',
      'Having considered both perspectives, I believe...',
      'Rather than viewing them as mutually exclusive...',
      'A balanced approach would involve...',
      'In my view, both... and... have important roles to play'
    ],
    model_answer_band7: 'The choice between traditional remedies and modern medicine is a topic that generates considerable discussion. While both approaches have their merits, I believe that a combination of the two offers the most effective approach to healthcare.\n\nAdvocates of traditional medicine point to several compelling advantages. Natural remedies, such as herbal treatments and acupuncture, have been used for thousands of years and often come with fewer side effects than synthetic drugs. Many traditional practices take a holistic approach, addressing not just symptoms but the patient\'s overall wellbeing, including diet, lifestyle, and mental health. In the Gulf region, for example, remedies using honey, black seed, and dates have been valued for centuries and are now attracting scientific interest.\n\nOn the other hand, modern medicine offers undeniable advantages, particularly for serious and life-threatening conditions. Advances in surgery, antibiotics, and diagnostic technology have dramatically increased life expectancy worldwide. Modern drugs undergo rigorous clinical trials to ensure their safety and efficacy, and their standardised dosages provide predictable results. Without modern medicine, diseases such as tuberculosis and polio would still claim millions of lives annually.\n\nHaving considered both perspectives, I believe that traditional and modern medicine should not be viewed as mutually exclusive. Modern medicine is essential for treating acute and serious illnesses, while traditional approaches can play a valuable role in preventive care and managing minor ailments. An integrated healthcare system that embraces the strengths of both would best serve patients.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 15
  },
  {
    task_type: 'task2',
    sub_type: 'discussion',
    title: 'Space Exploration vs Solving Earth Problems',
    prompt: 'Some people think that governments should spend money on exploring outer space, while others believe this money should be used to solve problems on Earth such as poverty and climate change.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Discussion essay — present both sides fairly before stating your opinion.',
        step2_brainstorm: 'For space: scientific discoveries, satellite technology, inspiring innovation, long-term survival. Against: poverty, climate change, healthcare — urgent earthly needs.',
        step3_outline: 'Intro → Body 1 (case for Earth priorities) → Body 2 (case for space) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Present the debate about government spending priorities',
        body1: 'View 1: money should address earthly problems — poverty, healthcare, climate change are urgent',
        body2: 'View 2: space exploration brings technological benefits, satellites, long-term survival of species',
        conclusion: 'Your opinion — a balanced budget is needed; space research often helps solve Earth problems too'
      },
      key_arguments: {
        earth_first: ['Millions still live in extreme poverty without clean water or food', 'Climate change threatens immediate survival and needs urgent funding', 'Healthcare systems in developing countries need improvement', 'Education and infrastructure should be prioritised'],
        space_exploration: ['Satellite technology helps with weather forecasting and communications', 'Space research leads to innovations used on Earth (medical devices, materials)', 'Understanding the universe is a fundamental human pursuit', 'Long-term survival may depend on becoming a multi-planetary species']
      }
    },
    key_phrases: [
      'There are strong arguments on both sides of this debate',
      'Those who prioritise... contend that...',
      'It is often argued that...',
      'While this perspective has merit, it overlooks...',
      'A frequently cited example is...',
      'The practical benefits of... extend far beyond...',
      'Balancing these competing priorities is essential',
      'It would be short-sighted to...',
      'In my opinion, a pragmatic approach would be to...',
      'Both objectives can be pursued simultaneously'
    ],
    model_answer_band7: 'Government spending priorities are a perennial source of debate, and few topics highlight this more than the tension between funding space exploration and addressing pressing problems on Earth. While both positions have valid arguments, I believe a balanced approach is both possible and necessary.\n\nThose who oppose space spending argue convincingly that immediate human needs should take precedence. With approximately 700 million people still living in extreme poverty and climate change accelerating at an alarming rate, diverting billions to space programmes may seem irresponsible. Investment in clean water systems, renewable energy, and healthcare infrastructure could yield tangible improvements in quality of life for millions. From this perspective, it is difficult to justify launching rockets when children lack access to basic education.\n\nHowever, proponents of space exploration make an equally persuasive case. Much of the technology we rely on daily — including GPS, weather satellites, and advanced medical imaging — originated from space research. Furthermore, studying other planets helps scientists better understand Earth\'s own climate systems. Space exploration also drives innovation in materials science, robotics, and computing, creating industries and jobs that benefit the wider economy.\n\nIn my view, framing this as an either-or choice is misleading. Governments can and should allocate funds to both areas. Space budgets typically represent a tiny fraction of national spending, and the technological returns often directly contribute to solving Earth-based problems. A pragmatic approach would involve continued investment in space research while ensuring adequate funding for urgent humanitarian and environmental priorities.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 16
  },
  {
    task_type: 'task2',
    sub_type: 'problem_solution',
    title: 'Youth Unemployment',
    prompt: 'In many countries, young people are finding it increasingly difficult to secure employment after graduating from university.\n\nWhat are the main causes of this problem? What solutions can you suggest?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Problem-solution essay — must identify causes AND propose solutions. Each solution should address a cause.',
        step2_brainstorm: 'Causes: mismatch between education and market needs, lack of experience, oversupply of graduates, economic conditions. Solutions: vocational training, internships, entrepreneurship support, curriculum reform.',
        step3_outline: 'Intro → Body 1 (2-3 causes) → Body 2 (2-3 solutions, linked to causes) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Acknowledge the severity of youth unemployment + state you will discuss causes and solutions',
        body1: 'Causes: skills gap between university curricula and employer needs; lack of practical experience; economic factors',
        body2: 'Solutions: reform curricula to include practical skills; mandatory internship programmes; government support for entrepreneurship',
        conclusion: 'Summary — multi-faceted problem requiring cooperation between universities, businesses, and governments'
      },
      key_arguments: {
        causes: ['University curricula are often outdated and theoretical, not matching employer needs', 'Graduates lack practical work experience that employers demand', 'Oversaturation of graduates in certain fields (e.g., business, humanities)', 'Economic slowdowns reduce the number of available positions'],
        solutions: ['Universities should collaborate with industry to update curricula regularly', 'Mandatory internship or co-op programmes should be integrated into degrees', 'Governments should provide grants and training for young entrepreneurs', 'Career guidance should begin earlier, in secondary school']
      }
    },
    key_phrases: [
      'One of the primary causes of this issue is...',
      'This problem stems largely from...',
      'A further contributing factor is...',
      'To address this challenge, several measures could be taken',
      'A practical solution would be to...',
      'This could be achieved by/through...',
      'Governments and educational institutions should collaborate to...',
      'In addition to structural changes...',
      'These solutions, if implemented together, could significantly...',
      'Tackling this issue requires a multi-pronged approach'
    ],
    model_answer_band7: 'Youth unemployment has become a growing concern in many countries, with a significant number of university graduates struggling to find suitable employment. This essay will examine the principal causes of this problem and propose practical solutions.\n\nOne of the main reasons for graduate unemployment is the disconnect between university curricula and the requirements of the modern job market. Many degree programmes focus heavily on theoretical knowledge while neglecting the practical skills that employers seek, such as digital literacy, project management, and communication. Additionally, most graduates enter the workforce with little or no practical experience, as their programmes did not include work placements or internship components. A further factor is the oversaturation of graduates in certain popular fields, which creates intense competition for a limited number of positions.\n\nTo address these challenges, several measures could be implemented. Universities should work closely with industry partners to regularly review and update their curricula, ensuring that course content reflects current market demands. Mandatory internship programmes should be embedded within degree structures, giving students hands-on experience before graduation. Governments could also support youth entrepreneurship through grants, training workshops, and reduced bureaucratic barriers for starting new businesses. Finally, career guidance should begin much earlier, ideally in secondary school, to help students make informed decisions about their academic and professional paths.\n\nIn conclusion, youth unemployment is a complex issue requiring coordinated action from educational institutions, businesses, and governments. By aligning education more closely with market needs and providing practical pathways into employment, this problem can be significantly reduced.',
    difficulty_band: '6.0-7.0',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 17
  },
  {
    task_type: 'task2',
    sub_type: 'problem_solution',
    title: 'Urban Air Pollution',
    prompt: 'Air pollution has become a serious issue in many large cities around the world, affecting both the environment and public health.\n\nWhat problems does urban air pollution cause? What measures could governments and individuals take to reduce it?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Problem-solution — describe the problems air pollution causes, then suggest measures to reduce it.',
        step2_brainstorm: 'Problems: respiratory diseases, climate change, reduced quality of life, economic costs. Solutions: public transport, electric vehicles, industrial regulations, green spaces.',
        step3_outline: 'Intro → Body 1 (health and environmental problems) → Body 2 (government and individual solutions) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Context — urbanisation and industrialisation have worsened air quality + preview',
        body1: 'Problems: respiratory illness (asthma, lung disease), contribution to climate change, reduced visibility, economic impact on healthcare',
        body2: 'Solutions: invest in public transport and cycling infrastructure, incentivise electric vehicles, enforce stricter industrial emissions standards, plant urban forests',
        conclusion: 'Urgent action needed from both governments and citizens'
      },
      key_arguments: {
        problems: ['Respiratory diseases such as asthma and bronchitis increase significantly', 'Air pollution contributes to global warming and climate change', 'Smog reduces visibility and quality of urban life', 'Healthcare costs rise substantially due to pollution-related illnesses'],
        solutions: ['Governments should invest heavily in efficient public transport systems', 'Tax incentives for purchasing electric and hybrid vehicles', 'Stricter regulations and monitoring of industrial emissions', 'Individuals can reduce car usage and support clean energy initiatives']
      }
    },
    key_phrases: [
      'Urban air pollution poses a significant threat to...',
      'One of the most serious consequences is...',
      'This has a direct impact on...',
      'The resulting health complications include...',
      'To tackle this issue, governments could...',
      'At an individual level, people can contribute by...',
      'A combination of government policy and personal responsibility is needed',
      'Investing in... would help to alleviate...',
      'Stricter regulations on... would significantly reduce...',
      'Without urgent intervention, the situation is likely to deteriorate'
    ],
    model_answer_band7: 'Air pollution in urban areas has reached alarming levels in many parts of the world, posing severe threats to both human health and the environment. This essay will outline the key problems associated with this issue and suggest measures that could help address it.\n\nThe consequences of poor air quality in cities are wide-ranging and severe. Most critically, prolonged exposure to pollutants such as particulate matter and nitrogen dioxide significantly increases the risk of respiratory diseases, including asthma, bronchitis, and lung cancer. The World Health Organisation has linked air pollution to millions of premature deaths annually. Beyond health, vehicle and industrial emissions contribute substantially to greenhouse gas accumulation, accelerating climate change. Economically, pollution-related healthcare costs place an enormous burden on public health systems, and persistent smog reduces the attractiveness of cities for tourism and investment.\n\nTo combat these problems, a combination of government policy and individual action is essential. Governments should prioritise investment in efficient, affordable public transport networks to reduce reliance on private vehicles. Tax incentives for electric and hybrid cars would encourage cleaner alternatives, while stricter emissions standards for factories and power plants would curb industrial pollution at its source. On a personal level, individuals can contribute by using public transport, cycling, or walking for short journeys, and by supporting renewable energy initiatives in their communities.\n\nIn conclusion, urban air pollution is a pressing issue that demands immediate attention. Through decisive government policy and responsible individual choices, its impact can be significantly reduced, creating healthier and more sustainable cities.',
    difficulty_band: '6.0-7.0',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 18
  },
  {
    task_type: 'task2',
    sub_type: 'two_part',
    title: 'Declining Reading Habits',
    prompt: 'In recent years, fewer people are reading books for pleasure. Instead, they prefer to watch videos, browse social media, or play games on their devices.\n\nWhy is this happening? Is this a positive or negative development?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Two-part question — must answer BOTH parts: why is it happening AND is it positive/negative.',
        step2_brainstorm: 'Reasons: instant gratification from digital media, shorter attention spans, less free time, books seem outdated. Evaluation: mostly negative — reduced critical thinking, vocabulary, imagination.',
        step3_outline: 'Intro → Body 1 (reasons why reading is declining) → Body 2 (evaluation — positive or negative) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Acknowledge the trend + state you will address both why and whether it is positive/negative',
        body1: 'Reasons: digital entertainment offers instant gratification; social media is addictive by design; modern lifestyles leave less quiet time',
        body2: 'Evaluation: largely negative — reading develops vocabulary, critical thinking, empathy, and concentration; however, some digital content (audiobooks, educational videos) can partially compensate',
        conclusion: 'Mostly negative but reversible with deliberate effort'
      },
      key_arguments: {
        reasons: ['Digital entertainment provides instant, effortless stimulation', 'Social media platforms are designed to maximise engagement and are addictive', 'Busy modern lifestyles reduce the quiet time needed for reading', 'Reading requires sustained focus, which many people find increasingly difficult'],
        evaluation: ['Reading develops critical thinking and analytical skills that passive consumption does not', 'Books expand vocabulary and improve writing ability', 'Reading fiction builds empathy by exposing readers to diverse perspectives', 'However, audiobooks and quality online content can partially serve similar functions']
      }
    },
    key_phrases: [
      'There are several reasons why this trend has emerged',
      'The primary factor behind this shift is...',
      'This can be attributed to...',
      'Another contributing factor is...',
      'Regarding whether this is positive or negative, I believe...',
      'On balance, this development is largely...',
      'While there are some benefits to digital media...',
      'The decline of reading is concerning because...',
      'This trend could be reversed if...',
      'It is worth noting, however, that...'
    ],
    model_answer_band7: 'The decline in recreational reading is a widely observed phenomenon in the digital age. This essay will explore the reasons behind this trend and argue that it is predominantly a negative development.\n\nSeveral factors explain why fewer people choose to read for pleasure. The most significant is the rise of digital entertainment, which offers instant, effortless stimulation through short videos, social media feeds, and interactive games. These platforms are deliberately engineered to capture and hold attention, making books seem slow and demanding by comparison. Furthermore, the pace of modern life leaves many people with limited leisure time, and when they do relax, they tend to gravitate towards activities that require minimal cognitive effort. The widespread use of smartphones has also shortened attention spans, making it increasingly difficult for many individuals to sustain the concentration needed for extended reading.\n\nI believe this shift is largely negative. Reading, particularly of books, develops several crucial cognitive abilities that other media do not cultivate as effectively. It strengthens vocabulary, improves writing skills, and builds the capacity for sustained, deep thinking. Fiction, in particular, has been shown to enhance empathy by immersing readers in the experiences and perspectives of characters different from themselves. While educational videos and audiobooks can provide some of these benefits, passive consumption of social media content does not offer the same intellectual rewards.\n\nIn conclusion, the decline of reading habits is a concerning trend driven primarily by the dominance of digital entertainment. Encouraging a culture of reading from an early age, both at home and in schools, is essential to preserving the cognitive benefits that books uniquely provide.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 19
  },
  {
    task_type: 'task2',
    sub_type: 'two_part',
    title: 'Social Media Influence on Young People',
    prompt: 'Social media platforms have an increasing influence on the opinions, behaviour, and lifestyle choices of young people.\n\nWhat are the reasons for this? Do the advantages of social media outweigh the disadvantages for young people?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Two-part question — explain the reasons AND evaluate whether advantages outweigh disadvantages.',
        step2_brainstorm: 'Reasons: accessibility, peer pressure, influencer culture, algorithm-driven content. Advantages: connectivity, learning, creativity. Disadvantages: mental health, misinformation, cyberbullying.',
        step3_outline: 'Intro → Body 1 (reasons for influence) → Body 2 (advantages vs disadvantages evaluation) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Context + state you will address reasons and evaluate impact',
        body1: 'Reasons: constant access via smartphones, algorithm-driven content personalisation, influencer culture, peer validation through likes and comments',
        body2: 'Evaluation: advantages (global connectivity, creative expression, access to information) vs disadvantages (mental health issues, misinformation, cyberbullying) — disadvantages slightly outweigh for young people who lack digital maturity',
        conclusion: 'Disadvantages are concerning but can be managed through education'
      },
      key_arguments: {
        reasons: ['Smartphones provide 24/7 access to social media', 'Algorithms create personalised content bubbles that reinforce existing interests', 'Influencer culture shapes aspirations and spending habits', 'Likes and followers serve as social validation for young users'],
        advantages: ['Connects young people globally and reduces isolation', 'Provides platforms for creative expression and learning', 'Offers access to diverse perspectives and information'],
        disadvantages: ['Linked to increased anxiety, depression, and body image issues', 'Spreads misinformation that young users may not critically evaluate', 'Cyberbullying and online harassment are widespread']
      }
    },
    key_phrases: [
      'The growing influence of social media can be attributed to...',
      'A key reason for this is...',
      'This is further compounded by...',
      'When weighing the advantages against the disadvantages...',
      'While social media offers undeniable benefits such as...',
      'The negative consequences, however, are equally significant',
      'Research has consistently shown that...',
      'Young people are particularly vulnerable to...',
      'The key to harnessing the benefits while minimising risks is...',
      'Digital literacy education is essential to...'
    ],
    model_answer_band7: 'Social media has become an integral part of young people\'s lives, shaping how they think, behave, and make lifestyle decisions. This essay will examine the reasons behind this powerful influence and argue that, while social media offers valuable benefits, its disadvantages for young people are currently more significant.\n\nThe influence of social media on youth can be attributed to several factors. Most fundamentally, smartphones have given young people constant, unrestricted access to platforms like Instagram, TikTok, and Snapchat. Sophisticated algorithms analyse user behaviour and serve personalised content that maximises engagement, effectively creating echo chambers. Additionally, influencer culture has reshaped how young people view success, beauty, and consumption. The social validation provided by likes, comments, and follower counts further reinforces habitual use and emotional dependence on these platforms.\n\nWhile social media undoubtedly offers advantages — including global connectivity, platforms for creative expression, and access to educational content — the disadvantages for young users are concerning. Numerous studies have linked excessive social media use to increased rates of anxiety, depression, and poor body image among teenagers. The spread of misinformation is another serious issue, as young users may lack the critical thinking skills to distinguish reliable information from falsehoods. Furthermore, cyberbullying has become a pervasive problem that can have devastating psychological consequences.\n\nIn conclusion, although social media provides meaningful benefits for communication and learning, I believe its negative effects on young people\'s mental health and critical thinking currently outweigh these advantages. Comprehensive digital literacy education, combined with responsible platform design, is essential to tip the balance in a more positive direction.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 20
  },
  {
    task_type: 'task2',
    sub_type: 'opinion',
    title: 'Preserving Cultural Heritage',
    prompt: 'Some people believe that preserving historical buildings and traditional customs is essential for maintaining national identity, while others think that countries should focus on modernisation and development.\n\nTo what extent do you agree or disagree that preserving cultural heritage should be a priority?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Opinion essay — should cultural preservation be a priority? Take a clear stance.',
        step2_brainstorm: 'For preservation: identity, tourism, education, community pride. For modernisation: economic growth, infrastructure, competitiveness.',
        step3_outline: 'Intro (strongly agree) → Body 1 (identity and education value) → Body 2 (economic value + coexistence with modernisation) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Context + strong agreement that heritage preservation is essential',
        body1: 'Cultural heritage connects communities to their history and identity; educates younger generations',
        body2: 'Heritage sites drive tourism and economic benefits; preservation and modernisation can coexist',
        conclusion: 'Heritage preservation is not at odds with progress — both are achievable'
      },
      key_arguments: {
        for: ['Cultural heritage provides a sense of identity and belonging', 'Historical buildings and traditions educate future generations about their roots', 'Heritage sites attract tourists and generate significant revenue', 'Losing cultural heritage leads to homogenisation of global culture'],
        against: ['Maintenance of old buildings can be extremely expensive', 'Prioritising heritage may slow urban development', 'Some traditions may be incompatible with modern values', 'Countries need modern infrastructure to compete economically']
      }
    },
    key_phrases: [
      'Cultural heritage is an invaluable asset that...',
      'Preserving traditions provides a sense of...',
      'Historical landmarks serve as tangible connections to...',
      'The economic benefits of heritage tourism are substantial',
      'Modernisation and preservation are not mutually exclusive',
      'A nation that forgets its past risks losing...',
      'The challenge lies in finding a balance between...',
      'Countries such as... have successfully demonstrated that...',
      'I strongly believe that investing in cultural preservation...',
      'Ultimately, a society\'s progress should be measured not only by...'
    ],
    model_answer_band7: 'As globalisation accelerates, many countries face the challenge of balancing modernisation with the preservation of their cultural heritage. I strongly agree that maintaining historical buildings and traditional customs should be a priority, as cultural identity and progress are not mutually exclusive goals.\n\nPreserving cultural heritage is fundamental to maintaining a society\'s sense of identity and continuity. Historical buildings, traditional crafts, and local customs connect present generations to their ancestors and provide a shared narrative that binds communities together. In Saudi Arabia, for example, the restoration of historic sites in Diriyah has not only preserved an important chapter of the nation\'s history but has also instilled pride in young Saudis about their heritage. Without such preservation efforts, younger generations risk becoming disconnected from the values and experiences that shaped their society.\n\nMoreover, cultural heritage has significant economic value. Heritage tourism is one of the fastest-growing sectors globally, generating substantial revenue and creating employment opportunities. Countries that have invested in preserving their historical sites — while simultaneously developing modern infrastructure around them — have demonstrated that these objectives can coexist successfully. The key is thoughtful urban planning that integrates historical preservation into broader development strategies rather than treating it as an obstacle.\n\nIn conclusion, I firmly believe that preserving cultural heritage should be a priority for every nation. Far from hindering progress, it enriches society culturally, strengthens national identity, and contributes meaningfully to the economy. The most successful approach is one that embraces both the wisdom of the past and the possibilities of the future.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 21
  },
  {
    task_type: 'task2',
    sub_type: 'discussion',
    title: 'Single-Sex vs Co-educational Schools',
    prompt: 'Some people believe that boys and girls should be educated in separate schools, while others think they benefit more from attending co-educational schools.\n\nDiscuss both views and give your own opinion.\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Discussion essay — present both views fairly, then give your own opinion.',
        step2_brainstorm: 'Separate: fewer distractions, tailored teaching methods, cultural appropriateness. Co-ed: prepares for real world, promotes mutual respect, broader social skills.',
        step3_outline: 'Intro → Body 1 (arguments for single-sex) → Body 2 (arguments for co-ed) → Conclusion (balanced opinion)',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Present the debate + indicate both sides will be discussed',
        body1: 'Single-sex: reduced social pressure, teaching can be tailored to learning styles, culturally preferred in some societies, some research shows improved academic performance',
        body2: 'Co-educational: mirrors the real world, develops communication between genders, promotes equality and mutual respect, broader range of perspectives in class discussions',
        conclusion: 'Both models have strengths; the best approach may depend on cultural context and individual needs'
      },
      key_arguments: {
        single_sex: ['Reduces social distractions and peer pressure related to the opposite gender', 'Teaching methods can be tailored to gender-specific learning styles', 'Aligns with cultural and religious values in certain societies', 'Some studies suggest higher academic achievement in single-sex settings'],
        co_educational: ['Prepares students for the mixed-gender workplace and society', 'Promotes mutual respect and understanding between genders from an early age', 'Offers a wider range of perspectives in classroom discussions', 'Develops essential social and communication skills']
      }
    },
    key_phrases: [
      'Supporters of single-sex education contend that...',
      'Those in favour of co-education argue that...',
      'Research has produced mixed results, with some studies showing...',
      'From a cultural perspective...',
      'An important consideration is...',
      'Preparing young people for the realities of...',
      'There are merits to both approaches',
      'The most appropriate model may depend on...',
      'In societies where... is valued...',
      'Ultimately, the quality of teaching matters more than...'
    ],
    model_answer_band7: 'The question of whether children should be educated in single-sex or co-educational schools continues to generate debate among educators, parents, and policymakers. This essay will examine both perspectives before offering my own view.\n\nAdvocates of single-sex education present several persuasive arguments. They maintain that separating boys and girls reduces social distractions, allowing students to focus more fully on their academic work. Teachers in single-sex environments can also adapt their methods to suit gender-specific learning preferences, potentially improving outcomes. In many Gulf countries, single-sex schooling aligns with cultural and religious values that prioritise modest interactions between young men and women. Some research has also indicated that girls, in particular, may perform better in subjects like science and mathematics when not in mixed classrooms.\n\nConversely, proponents of co-education argue that mixed schools better prepare students for adult life, where men and women work and interact daily. Learning alongside the opposite gender from a young age promotes mutual respect, reduces stereotyping, and develops essential social skills. Co-educational settings also expose students to a broader range of perspectives during class discussions, enriching the overall learning experience.\n\nHaving considered both views, I believe there is no single correct answer, as the most suitable model depends on cultural context, individual student needs, and the quality of teaching provided. In societies where single-sex education is the norm, it can be highly effective. However, where cultural factors are less prescriptive, co-education offers valuable preparation for an integrated adult world. Ultimately, the calibre of teaching and curriculum design matters more than the gender composition of the classroom.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 22
  },
  {
    task_type: 'task2',
    sub_type: 'problem_solution',
    title: 'Childhood Obesity',
    prompt: 'In many countries, the number of children who are overweight or obese has increased significantly in recent decades.\n\nWhat are the main causes of this trend? What measures can be taken to address childhood obesity?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Problem-solution — identify causes of childhood obesity and propose solutions.',
        step2_brainstorm: 'Causes: fast food, sedentary lifestyles, screen time, marketing, parental habits. Solutions: school nutrition programmes, PE requirements, advertising restrictions, family education.',
        step3_outline: 'Intro → Body 1 (causes) → Body 2 (solutions) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Context — rising childhood obesity rates worldwide + preview structure',
        body1: 'Causes: widespread availability of cheap processed food; sedentary entertainment (gaming, streaming); decline in physical activity at school; aggressive marketing of junk food to children',
        body2: 'Solutions: schools should serve healthy meals and increase PE hours; governments should restrict junk food advertising aimed at children; families should be educated about nutrition; urban planning should include safe play areas',
        conclusion: 'Collaborative effort needed — schools, government, families, food industry'
      },
      key_arguments: {
        causes: ['Cheap, readily available processed and fast food high in sugar and fat', 'Children spend more time on screens and less time playing outdoors', 'Physical education has been reduced in many school curricula', 'Aggressive marketing targets children with unhealthy food advertisements'],
        solutions: ['Schools should provide nutritious meals and mandatory daily physical activity', 'Governments should impose restrictions on advertising unhealthy food to children', 'Tax incentives could make healthy food more affordable for families', 'Communities should develop safe parks and sports facilities for children']
      }
    },
    key_phrases: [
      'Childhood obesity has reached epidemic proportions in...',
      'A major contributing factor is...',
      'The sedentary nature of modern childhood...',
      'This problem is exacerbated by...',
      'To reverse this trend, several interventions are needed',
      'Schools have a crucial role to play in...',
      'Government regulation of... could significantly reduce...',
      'Parents should be supported through...',
      'A comprehensive approach involving all stakeholders is essential',
      'Prevention is more effective and cost-efficient than treatment'
    ],
    model_answer_band7: 'Childhood obesity has become one of the most serious public health challenges of the twenty-first century, with rates climbing dramatically across both developed and developing nations. This essay will examine the principal causes of this trend and propose measures to address it.\n\nThe rise in childhood obesity can be attributed to several interrelated factors. Perhaps the most significant is the widespread availability of cheap, processed food that is high in sugar, salt, and fat. Fast food chains and convenience stores make unhealthy options far more accessible and affordable than fresh, nutritious alternatives. Simultaneously, children\'s lifestyles have become increasingly sedentary. Hours spent on video games, social media, and streaming services have replaced outdoor physical play. In many countries, schools have also reduced the time allocated to physical education, further limiting children\'s activity levels. The aggressive marketing of unhealthy food and beverages directly to young audiences through television and online platforms compounds the problem.\n\nTo tackle childhood obesity effectively, a multi-stakeholder approach is required. Schools should serve nutritionally balanced meals and ensure a minimum of one hour of physical activity daily. Governments could impose stricter regulations on the advertising of unhealthy food to children, similar to restrictions on tobacco marketing. Making healthy food more affordable through subsidies or tax adjustments would help families on lower incomes make better dietary choices. At the community level, investing in safe parks, playgrounds, and sports facilities would encourage active lifestyles.\n\nIn conclusion, childhood obesity is a preventable condition that demands coordinated action from governments, schools, the food industry, and families. Early intervention through education, regulation, and environmental changes is both more humane and more cost-effective than treating obesity-related diseases in adulthood.',
    difficulty_band: '6.0-7.0',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 23
  },
  {
    task_type: 'task2',
    sub_type: 'two_part',
    title: 'Globalisation and Local Businesses',
    prompt: 'Due to globalisation, large multinational companies are increasingly dominating markets around the world, making it difficult for small local businesses to survive.\n\nWhy is this happening? Is this a positive or negative development?\n\nGive reasons for your answer and include any relevant examples from your own knowledge or experience.\n\nWrite at least 250 words.',
    chart_data: null,
    template_structure: {
      planning_guide: {
        step1_analyze: 'Two-part question — explain why multinationals dominate AND evaluate whether this is positive or negative.',
        step2_brainstorm: 'Why: economies of scale, brand recognition, digital platforms, supply chain advantages. Positive: lower prices, more choices, jobs. Negative: loss of cultural identity, wealth extraction, less diversity.',
        step3_outline: 'Intro → Body 1 (reasons why multinationals dominate) → Body 2 (evaluation — mostly negative) → Conclusion',
        step4_write: '5 min plan, 30 min write, 5 min review'
      },
      paragraph_outline: {
        introduction: 'Context — globalisation enabling multinational expansion + preview',
        body1: 'Reasons: economies of scale allow lower prices; massive marketing budgets build brand loyalty; digital platforms give global reach; established supply chains provide consistency',
        body2: 'Evaluation: while consumers benefit from lower prices and variety, the decline of local businesses erodes cultural identity, reduces economic diversity, and channels profits away from local communities',
        conclusion: 'Mostly negative — governments should support local businesses while benefiting from global trade'
      },
      key_arguments: {
        reasons: ['Multinationals benefit from economies of scale, enabling lower prices', 'Huge marketing budgets create brand recognition that local businesses cannot match', 'E-commerce platforms give global companies instant access to local markets', 'Established supply chains ensure consistency and reliability'],
        evaluation_positive: ['Consumers benefit from lower prices and wider product choices', 'Multinationals create jobs in manufacturing, logistics, and retail', 'Foreign investment can improve local infrastructure'],
        evaluation_negative: ['Local businesses that close take cultural uniqueness with them', 'Profits flow out of local communities to corporate headquarters abroad', 'Reduced economic diversity makes communities vulnerable', 'Standardisation leads to cultural homogenisation']
      }
    },
    key_phrases: [
      'The dominance of multinational corporations can be explained by...',
      'One key factor is the ability of large companies to...',
      'This puts local businesses at a significant disadvantage',
      'From a consumer perspective, this may appear beneficial...',
      'However, the long-term consequences for local economies are...',
      'The loss of small businesses leads to...',
      'Cultural homogenisation is an inevitable result of...',
      'Governments should consider implementing policies to...',
      'Supporting local enterprises through... could help maintain...',
      'A healthy economy requires a balance between...'
    ],
    model_answer_band7: 'Globalisation has enabled multinational corporations to expand their reach into virtually every market on the planet, often at the expense of small local businesses. This essay will explore the reasons behind this phenomenon and argue that it is predominantly a negative development.\n\nSeveral factors explain the growing dominance of multinationals. Their enormous economies of scale allow them to offer products at prices that small businesses simply cannot match. A global coffee chain, for example, can purchase beans in bulk at a fraction of the cost available to a local café. Additionally, multinational companies invest heavily in marketing and brand building, creating a level of consumer recognition that independent businesses struggle to compete against. The rise of e-commerce has further accelerated this trend, as digital platforms enable large companies to enter new markets instantly, without the need for a physical presence.\n\nWhile consumers may benefit from lower prices and a wider range of products, I believe this development is largely negative for communities in the long term. When local businesses close, neighbourhoods lose their distinctive character and cultural identity. A city centre dominated by the same international brands found everywhere in the world offers little that is unique or authentic. Moreover, the profits generated by multinationals typically flow back to their headquarters rather than circulating within the local economy. This wealth extraction weakens communities economically and reduces their resilience.\n\nIn conclusion, while the efficiency of multinational companies offers certain consumer advantages, the erosion of local businesses, cultural identity, and economic diversity represents a significant cost. Governments should actively support small enterprises through tax relief, local procurement policies, and fair competition regulations to ensure a balanced and vibrant economy.',
    difficulty_band: '6.5-7.5',
    word_count_target: 250,
    time_limit_minutes: 40,
    sort_order: 24
  }
];

async function main() {
  console.log('Inserting 12 Writing Task 2 items...');

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const { data, error } = await supabase.from('ielts_writing_tasks').insert(task).select('id, title');
    if (error) {
      console.log(`❌ Task ${i+1} error:`, error.message);
    } else {
      console.log(`✅ Task ${i+1}: ${data[0].title}`);
    }
  }

  // Verify totals
  const { data: all } = await supabase.from('ielts_writing_tasks').select('id, task_type, sub_type');
  const t1 = all?.filter(t => t.task_type === 'task1').length;
  const t2 = all?.filter(t => t.task_type === 'task2').length;
  console.log(`\n📊 Total writing tasks: ${all?.length}`);
  console.log(`  Task 1: ${t1}`);
  console.log(`  Task 2: ${t2}`);
}

main().catch(console.error);
