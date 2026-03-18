require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sections = [
  // ===== SECTION 3 — ACADEMIC DISCUSSIONS (6 scripts) =====
  {
    test_id: 7,
    section_number: 3,
    title: 'Research Project on Renewable Energy',
    audio_duration_seconds: 330,
    transcript: `SARAH: Hey, Tom. Have you started looking at the data for our renewable energy project yet?
TOM: Yeah, I spent most of yesterday going through the government reports on solar panel adoption. The figures are actually quite surprising.
SARAH: In what way?
TOM: Well, I expected the growth to be steady, but it's been exponential since 2018. The number of households with solar panels went from about 800,000 to over 3.5 million in just five years.
SARAH: That's a massive jump. Do the reports say what's driving that?
TOM: Mainly the reduction in installation costs. The average price dropped by about 60 percent between 2015 and 2023. And then there are the government subsidies — households can claim back up to 4,000 pounds.
SARAH: Right, I remember Professor Chen mentioning that in the lecture. She also talked about the feed-in tariff scheme, where people sell excess electricity back to the grid.
TOM: Exactly. That's been a huge incentive. But here's what I found interesting — wind energy is actually growing faster in terms of total output. The UK generated 26 percent of its electricity from wind in 2023.
SARAH: So should we focus our project more on wind or solar?
TOM: I think we should compare both. The brief says we need to evaluate at least two renewable sources. What if we look at solar for domestic use and wind for industrial-scale generation?
SARAH: That's a good approach. We could also include a section on the challenges — like energy storage and grid capacity.
TOM: Definitely. Battery technology is still the biggest limitation. Even the best lithium-ion batteries only retain about 80 percent efficiency after five years of heavy use.
SARAH: I read a paper by Dr. Yamamoto — I think it was published in the Journal of Energy Systems last year — and she argues that hydrogen fuel cells might be more viable for large-scale storage than batteries.
TOM: That's interesting. Can you send me the reference? We should probably cite that.
SARAH: Sure, I'll email it tonight. What about the structure of the report? We need to submit the outline by Friday.
TOM: Right. I was thinking we could have five main sections: an introduction with background on UK energy policy, then solar energy, then wind energy, then a comparison chapter, and finally recommendations.
SARAH: That works. Should we split the writing?
TOM: How about I take the wind energy section and the comparison, and you handle solar and the introduction? We can do the recommendations together.
SARAH: Sounds fair. Let's aim to have our individual sections done by next Wednesday, so we have a few days to edit before the deadline on the 28th.
TOM: Perfect. Oh, one more thing — Professor Chen said we should include at least three graphs or charts. I can create those using the data from the government reports.
SARAH: Great. Just make sure they're properly labelled — she took marks off last time for missing axis labels.
TOM: Good point. I'll use the university's data visualisation software — it automatically formats everything correctly.
SARAH: Brilliant. Let's meet again on Wednesday to review progress.
TOM: Sounds good. See you then.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'Two university students discussing their research project on renewable energy sources in the UK.',
    questions: [
      { number: 1, type: 'mcq', text: 'What surprised Tom about the solar panel data?', options: ['A) The cost was higher than expected', 'B) The growth rate was exponential', 'C) Fewer households had panels than expected', 'D) The government had stopped subsidies'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 2, type: 'sentence_completion', text: 'The average installation cost of solar panels dropped by __________ percent between 2015 and 2023.', instruction: 'Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 3, type: 'sentence_completion', text: 'Households can claim a government subsidy of up to £__________ for solar installation.' },
      { number: 4, type: 'mcq', text: 'What percentage of UK electricity came from wind power in 2023?', options: ['A) 16 percent', 'B) 20 percent', 'C) 26 percent', 'D) 30 percent'] },
      { number: 5, type: 'matching', text: 'Match each energy source with its proposed focus in the project.', sub_items: [{ item: 'Solar energy', options: 'A) Industrial scale  B) Domestic use  C) Transport' }, { item: 'Wind energy', options: 'A) Industrial scale  B) Domestic use  C) Transport' }] },
      { number: 6, type: 'sentence_completion', text: 'The biggest limitation of renewable energy is __________ technology.' },
      { number: 7, type: 'mcq', text: "Who wrote the paper on hydrogen fuel cells?", options: ['A) Professor Chen', 'B) Dr. Yamamoto', 'C) Tom', 'D) Sarah'] },
      { number: 8, type: 'sentence_completion', text: 'The project outline must be submitted by __________.' },
      { number: 9, type: 'sentence_completion', text: 'Tom will be responsible for writing the __________ energy section and the comparison chapter.' },
      { number: 10, type: 'sentence_completion', text: 'The report must include at least __________ graphs or charts.' }
    ],
    answer_key: {
      '1': 'B',
      '2': '60',
      '3': '4,000/4000',
      '4': 'C',
      '5': 'Solar — B (Domestic use); Wind — A (Industrial scale)',
      '6': 'battery',
      '7': 'B',
      '8': 'Friday',
      '9': 'wind',
      '10': '3/three'
    },
    sort_order: 13
  },
  {
    test_id: 8,
    section_number: 3,
    title: 'Essay Review on Urbanization',
    audio_duration_seconds: 340,
    transcript: `TUTOR: Come in, Amara. Take a seat. So, I've had a chance to read through your essay on urbanization trends. Overall, it's a solid piece of work.
AMARA: Thank you. I wasn't sure if I'd covered enough ground, to be honest.
TUTOR: Well, let me go through my feedback point by point. First of all, your introduction is strong. You've clearly stated your thesis — that rapid urbanization creates more problems than benefits in developing countries — and you've outlined the structure of the essay well.
AMARA: I spent quite a lot of time on the introduction, actually. I rewrote it three times.
TUTOR: It shows. Now, moving on to the body paragraphs. Your first argument about infrastructure strain is well-supported. You've used the case study of Lagos effectively — the data on traffic congestion and water supply shortages is compelling.
AMARA: I found most of that in the World Bank report from 2022.
TUTOR: Good source. However, I think you could strengthen your argument by also including data from a contrasting city — perhaps one where urbanization has been managed more successfully. Singapore is often cited as an example of effective urban planning.
AMARA: That's a good idea. I could add a paragraph comparing Lagos and Singapore to show that the outcome depends on governance and planning rather than urbanization itself.
TUTOR: Exactly. That would add nuance to your argument. Now, your second body paragraph on social inequality is where I have more concerns. You make some strong claims — for instance, that urbanization always increases the wealth gap — but you haven't provided sufficient evidence.
AMARA: I know. I struggled to find reliable data for that section.
TUTOR: I'd recommend looking at the UN Habitat reports. They publish annual data on urban inequality indices. You might also look at Sassen's work on global cities — she's written extensively about how economic restructuring in cities affects different social groups.
AMARA: Saskia Sassen? I've heard of her but haven't read her work yet.
TUTOR: Yes. Her book "The Global City" would be particularly relevant. It was published in 1991 but updated in 2001, and the theoretical framework is still widely used.
AMARA: I'll look it up. What about my conclusion? I felt it was a bit rushed.
TUTOR: It is, honestly. You've essentially just restated your thesis without synthesizing the arguments. A strong conclusion should do more than summarize — it should show how the evidence you've presented leads logically to your position, and ideally suggest implications or areas for further research.
AMARA: So I should expand it?
TUTOR: Yes, I'd aim for at least 250 words in the conclusion. Currently it's about 120. Also, you need to address counterarguments somewhere in the essay. You've presented a one-sided view, which weakens the academic rigour.
AMARA: Should I add a separate counterargument paragraph?
TUTOR: You could, or you could integrate counterpoints within each body paragraph. The second approach is more sophisticated and shows stronger critical thinking.
AMARA: Alright. So to summarize — I need to add a comparative city example, strengthen the evidence in paragraph two, expand the conclusion, and address counterarguments.
TUTOR: That's right. And one more thing — check your referencing. You've used APA format mostly, but some of your in-text citations are inconsistent. Page numbers are missing in a few direct quotes.
AMARA: Oh, I'll fix that. When is the revised version due?
TUTOR: You have until the 15th of November. That gives you about two weeks.
AMARA: Perfect, I'll have it ready. Thank you so much for the detailed feedback.
TUTOR: You're welcome. You've got a strong foundation — it just needs some refinement.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A university tutor giving feedback to a student on her essay about urbanization in developing countries.',
    questions: [
      { number: 1, type: 'mcq', text: "What is the thesis of Amara's essay?", options: ['A) Urbanization benefits developing countries', 'B) Rapid urbanization creates more problems than benefits', 'C) Urban planning is the key to economic growth', 'D) Developing countries should prevent urbanization'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 2, type: 'sentence_completion', text: 'Amara used a case study of __________ to support her first argument.', instruction: 'Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 3, type: 'sentence_completion', text: 'The tutor suggests comparing Lagos with __________ as an example of effective urban planning.' },
      { number: 4, type: 'mcq', text: 'What is the main problem with the paragraph on social inequality?', options: ['A) It is too long', 'B) It lacks sufficient evidence', 'C) It contradicts the thesis', 'D) It uses outdated sources'] },
      { number: 5, type: 'sentence_completion', text: 'The tutor recommends reading reports by __________ for urban inequality data.' },
      { number: 6, type: 'sentence_completion', text: "Saskia Sassen's book \"The Global City\" was originally published in __________." },
      { number: 7, type: 'mcq', text: 'What does the tutor say about the conclusion?', options: ['A) It is well-written', 'B) It needs to be shorter', 'C) It only restates the thesis without synthesizing', 'D) It includes too many counterarguments'] },
      { number: 8, type: 'sentence_completion', text: 'The tutor recommends expanding the conclusion to at least __________ words.' },
      { number: 9, type: 'mcq', text: 'How does the tutor suggest handling counterarguments?', options: ['A) Remove them entirely', 'B) Add a separate counterargument paragraph', 'C) Integrate them within each body paragraph', 'D) Include them only in the conclusion'] },
      { number: 10, type: 'sentence_completion', text: 'The revised essay is due on the __________ of November.' }
    ],
    answer_key: {
      '1': 'B',
      '2': 'Lagos',
      '3': 'Singapore',
      '4': 'B',
      '5': 'UN Habitat',
      '6': '1991',
      '7': 'C',
      '8': '250',
      '9': 'C',
      '10': '15th/15'
    },
    sort_order: 14
  },
  {
    test_id: 9,
    section_number: 3,
    title: 'Group Presentation on Marine Biology',
    audio_duration_seconds: 350,
    transcript: `LISA: Okay, so we need to plan our group presentation on marine biology. The topic we chose was coral reef ecosystems, right?
JAMES: Yes, and we've got 20 minutes, so we need to divide it up. There are three of us, so roughly six or seven minutes each.
PRIYA: Before we divide it, shouldn't we decide on the main themes? I was thinking we could cover three aspects: the biology of coral reefs, the threats they face, and conservation efforts.
LISA: That makes sense. It follows a logical structure. James, what do you think?
JAMES: I agree. And I'd like to take the threats section if that's okay. I've already done some reading on ocean acidification and its effects on coral bleaching.
PRIYA: Sure. I'll take the biology section — I find the symbiotic relationship between coral and algae really fascinating. Did you know that corals get up to 90 percent of their energy from the zooxanthellae algae living in their tissue?
LISA: I didn't know it was that high. So I'll handle the conservation section then. I can talk about marine protected areas and some of the restoration projects happening in Australia and the Maldives.
JAMES: Good. Now, for my section on threats, I want to cover three main points. First, climate change — specifically rising sea temperatures. The Great Barrier Reef has experienced five mass bleaching events since 2016.
PRIYA: Five? I thought it was three.
JAMES: No, the most recent data from the Australian Institute of Marine Science shows five events. The 2024 one was actually the most severe on record.
LISA: That's alarming. What else are you covering?
JAMES: Ocean acidification — the pH of ocean surface water has dropped by 0.1 units since the pre-industrial era. That might sound small, but it represents a 26 percent increase in acidity. And third, I'll discuss physical damage from destructive fishing practices — dynamite fishing and cyanide fishing are still common in Southeast Asia.
PRIYA: For my biology section, I'll explain the structure of a coral reef — the different zones from the reef crest to the back reef. Then I'll go into the symbiosis with zooxanthellae, and finally, I want to talk about biodiversity. Coral reefs cover less than one percent of the ocean floor but support approximately 25 percent of all marine species.
LISA: Those are great statistics to include. For conservation, I'm planning to discuss three case studies. The first is the Great Barrier Reef Marine Park Authority — they've implemented a zoning system that restricts different activities in different areas. The second is the coral nursery programme in the Maldives, where they grow coral fragments on underwater frames before transplanting them.
JAMES: What's the third?
LISA: The Coral Triangle Initiative — it's a partnership between six countries in Southeast Asia and the Pacific. They've pledged to protect 30 percent of their coastal waters by 2030.
PRIYA: We should also think about visual aids. We need at least five slides according to the rubric.
JAMES: I was thinking of including a diagram showing the process of coral bleaching — how the coral expels the algae when water temperature rises above 1 to 2 degrees above the summer maximum.
PRIYA: And I can include a cross-section diagram of a coral reef showing the different zones. I found an excellent one in Thompson's textbook, but I'll redraw it so we don't have copyright issues.
LISA: Smart. I'll add a map showing the Coral Triangle region and some before-and-after photos of restored reefs. Shall we schedule a rehearsal?
JAMES: How about Saturday afternoon? We can meet in the library study room.
PRIYA: Works for me. Let's each have a draft of our slides ready by then.
LISA: Agreed. Oh, and remember — Professor Walsh said we'll be marked on audience engagement, so we should prepare at least two discussion questions for the class.
JAMES: Good point. I'll think of some related to the threats section.`,
    speaker_count: 3,
    accent: 'british',
    context_description: 'Three university students planning a group presentation on coral reef ecosystems for their marine biology course.',
    questions: [
      { number: 1, type: 'matching', text: 'Match each student to the section they will present.', instruction: 'Match each student to their presentation topic.', sub_items: [{ item: 'Lisa', options: 'A) Biology  B) Threats  C) Conservation' }, { item: 'James', options: 'A) Biology  B) Threats  C) Conservation' }, { item: 'Priya', options: 'A) Biology  B) Threats  C) Conservation' }] },
      { number: 2, type: 'sentence_completion', text: 'Corals get up to __________ percent of their energy from zooxanthellae algae.', instruction: 'Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 3, type: 'sentence_completion', text: 'The Great Barrier Reef has experienced __________ mass bleaching events since 2016.' },
      { number: 4, type: 'sentence_completion', text: 'The drop in ocean pH represents a __________ percent increase in acidity.' },
      { number: 5, type: 'mcq', text: 'What destructive fishing practices does James mention?', options: ['A) Trawling and netting', 'B) Dynamite and cyanide fishing', 'C) Overfishing and bycatch', 'D) Bottom dredging and purse seining'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 6, type: 'sentence_completion', text: 'Coral reefs support approximately __________ percent of all marine species.' },
      { number: 7, type: 'sentence_completion', text: 'The Coral Triangle Initiative aims to protect __________ percent of coastal waters by 2030.' },
      { number: 8, type: 'mcq', text: 'Why will Priya redraw the reef diagram from the textbook?', options: ['A) The original is too small', 'B) To avoid copyright issues', 'C) The professor requires original work', 'D) The textbook diagram is outdated'] },
      { number: 9, type: 'sentence_completion', text: 'The students plan to rehearse on __________ afternoon.' },
      { number: 10, type: 'sentence_completion', text: 'They need to prepare at least __________ discussion questions for the class.' }
    ],
    answer_key: {
      '1': 'Lisa — C; James — B; Priya — A',
      '2': '90',
      '3': '5/five',
      '4': '26',
      '5': 'B',
      '6': '25',
      '7': '30',
      '8': 'B',
      '9': 'Saturday',
      '10': '2/two'
    },
    sort_order: 15
  },
  {
    test_id: 10,
    section_number: 3,
    title: 'Thesis Methodology Discussion',
    audio_duration_seconds: 340,
    transcript: `PROFESSOR: So, Daniel, let's talk about your thesis methodology. You've chosen to study the impact of social media on political engagement among young adults. Can you walk me through your approach?
DANIEL: Sure. I'm planning to use a mixed-methods approach — combining quantitative surveys with qualitative interviews.
PROFESSOR: Good. Mixed methods can give you both breadth and depth. Tell me about the survey component first.
DANIEL: I've designed a questionnaire with 35 items. It covers three main areas: frequency of social media use, types of political content consumed, and self-reported levels of political participation — things like voting, attending protests, signing petitions, and sharing political content online.
PROFESSOR: And your target sample size?
DANIEL: I'm aiming for 500 respondents, all aged between 18 and 25. I'll distribute the survey through the university's student portal and also through social media channels to reach non-students as well.
PROFESSOR: That's important — you don't want to limit yourself to university students only. That would introduce significant selection bias. What about your sampling method?
DANIEL: I was planning to use convenience sampling, but I know that has limitations.
PROFESSOR: It does. The main issue is that your results won't be generalizable to the broader population. Have you considered stratified sampling instead? You could divide your target population into subgroups — by age, gender, education level — and then sample proportionally from each.
DANIEL: That would be more robust, but it's also much harder to implement. I'd need access to demographic data to create the strata.
PROFESSOR: True. As a compromise, you could use quota sampling — it's similar to stratified sampling but doesn't require a complete sampling frame. You set quotas for each subgroup and then use convenience sampling within each quota.
DANIEL: That sounds more feasible. I'll restructure my sampling plan to include quotas for age bands, gender, and whether or not they're in higher education.
PROFESSOR: Good. Now, tell me about the qualitative component.
DANIEL: I'm planning to conduct semi-structured interviews with 15 to 20 participants. I want to explore their experiences in more depth — how they encounter political content, how it shapes their views, and whether online engagement translates into offline action.
PROFESSOR: How will you select your interview participants?
DANIEL: From the survey respondents. I'll use purposive sampling to select people with different levels of political engagement — some who are very active, some moderate, and some who are disengaged.
PROFESSOR: That's a sound approach. It'll give you a range of perspectives. What about your analytical framework?
DANIEL: For the quantitative data, I'll use SPSS to run correlation analyses and regression models. For the qualitative interviews, I'm planning to use thematic analysis — following Braun and Clarke's six-phase model.
PROFESSOR: Excellent choice. Braun and Clarke's framework is well-established and very systematic. Just make sure you document your coding process thoroughly — that's essential for transparency and replicability.
DANIEL: Absolutely. I'll keep a detailed coding journal and use NVivo software to manage the data.
PROFESSOR: One more thing — ethics. Have you submitted your ethics application?
DANIEL: Yes, I submitted it last week. I've included consent forms, information sheets, and a data protection plan. I'm guaranteeing full anonymity — all names will be replaced with pseudonyms, and the data will be stored on an encrypted university server.
PROFESSOR: Good. When do you expect ethics approval?
DANIEL: The committee meets on the first of December, so hopefully by mid-December.
PROFESSOR: Right. That means you could start data collection in January. I think your methodology is well thought out, Daniel. Let's meet again once you have ethics approval to finalize the timeline.
DANIEL: Thank you, Professor. I'll prepare a revised sampling plan before our next meeting.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A student discussing his thesis methodology with his professor, covering survey design, sampling methods, and qualitative interviews.',
    questions: [
      { number: 1, type: 'mcq', text: "What is Daniel's thesis about?", options: ['A) The influence of television on voting behaviour', 'B) Social media and political engagement in young adults', 'C) How universities teach political science', 'D) The effect of news media on public opinion'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 2, type: 'sentence_completion', text: "Daniel's questionnaire contains __________ items.", instruction: 'Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 3, type: 'sentence_completion', text: 'The target sample size for the survey is __________ respondents.' },
      { number: 4, type: 'mcq', text: 'What sampling method does the professor suggest as a compromise?', options: ['A) Random sampling', 'B) Convenience sampling', 'C) Quota sampling', 'D) Snowball sampling'] },
      { number: 5, type: 'sentence_completion', text: 'Daniel plans to interview between __________ participants.' },
      { number: 6, type: 'sentence_completion', text: 'Interview participants will be selected using __________ sampling.' },
      { number: 7, type: 'sentence_completion', text: "For qualitative analysis, Daniel will follow __________ six-phase model." },
      { number: 8, type: 'sentence_completion', text: 'Daniel will use __________ software to manage the qualitative data.' },
      { number: 9, type: 'mcq', text: 'How will participants be kept anonymous?', options: ['A) Their data will be deleted after analysis', 'B) Names will be replaced with pseudonyms', 'C) Only group data will be reported', 'D) Participants will use code numbers'] },
      { number: 10, type: 'sentence_completion', text: 'The ethics committee meets on the __________ of December.' }
    ],
    answer_key: {
      '1': 'B',
      '2': '35',
      '3': '500',
      '4': 'C',
      '5': '15 to 20/15-20',
      '6': 'purposive',
      '7': "Braun and Clarke's",
      '8': 'NVivo',
      '9': 'B',
      '10': '1st/first'
    },
    sort_order: 16
  },
  {
    test_id: 11,
    section_number: 3,
    title: 'Comparing Psychology Lecture Notes',
    audio_duration_seconds: 330,
    transcript: `MAYA: Hey, Chen. Did you manage to get all of Professor Burton's lecture on memory today? I missed the last fifteen minutes because I had a doctor's appointment.
CHEN: Yeah, I got most of it. It was really interesting, actually. She went into a lot of detail about the multi-store model.
MAYA: Right, I got that part. Atkinson and Shiffrin, 1968 — the sensory register, short-term memory, and long-term memory. She drew that diagram on the board.
CHEN: Exactly. But the part you missed was about the criticisms of that model and the alternative models.
MAYA: Oh no, that's probably going to be on the exam. Can you go through it?
CHEN: Sure. So the main criticism is that the multi-store model is too simplistic. It treats short-term memory and long-term memory as single, unified stores, but research has shown that they're actually made up of multiple components.
MAYA: Like what?
CHEN: Well, Baddeley and Hitch proposed the working memory model in 1974 as an alternative to the idea of a single short-term memory. Instead of one store, they suggested there are several components: the central executive, which controls attention and coordinates the other systems; the phonological loop, which handles verbal and acoustic information; and the visuospatial sketchpad, which processes visual and spatial data.
MAYA: Okay, so the central executive is like the boss?
CHEN: Basically, yes. It doesn't store information itself — it just directs attention and manages the other components. Professor Burton said it's the most important but also the least understood component.
MAYA: And there was a fourth component added later, wasn't there?
CHEN: Yes, the episodic buffer. Baddeley added that in 2000. It integrates information from the other components and from long-term memory into coherent episodes — like creating a unified scene from separate visual, verbal, and temporal information.
MAYA: Got it. Did she talk about any evidence supporting this model?
CHEN: She mentioned two key studies. The first was by Baddeley and Hitch themselves — they showed that people can do a verbal reasoning task and a verbal memory task at the same time without much interference, which wouldn't be possible if there was only one short-term store.
MAYA: Because they're using different components — the central executive for reasoning and the phonological loop for the memory task?
CHEN: Exactly. The second study was about a patient known as KF, who had brain damage that impaired his verbal short-term memory but left his visual memory intact. That supports the idea of separate stores for different types of information.
MAYA: That makes sense. What about long-term memory? Did she talk about different types?
CHEN: Yes, she briefly covered Tulving's distinction between episodic memory — personal experiences and events — and semantic memory — general knowledge and facts. He proposed this in 1972. And then there's procedural memory, which is memory for skills and how to do things, like riding a bicycle.
MAYA: So episodic is "what happened to me," semantic is "what I know," and procedural is "what I can do."
CHEN: Perfect summary. She also mentioned that these different types of long-term memory are associated with different brain regions. Episodic memory is linked to the hippocampus, while procedural memory involves the cerebellum and basal ganglia.
MAYA: This is really helpful, Chen. Do you mind if I photograph your notes?
CHEN: Go ahead. I've also got the handout she gave out at the end — it has a summary table comparing all three models.
MAYA: Brilliant. I owe you a coffee.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'Two psychology students comparing notes on a lecture about memory models, covering the multi-store model, working memory model, and types of long-term memory.',
    questions: [
      { number: 1, type: 'sentence_completion', text: 'The multi-store model was proposed by Atkinson and Shiffrin in __________.', instruction: 'Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'mcq', text: 'What is the main criticism of the multi-store model?', options: ['A) It is too detailed', 'B) It was proposed too long ago', 'C) It treats memory stores as single unified systems', 'D) It ignores sensory memory'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 3, type: 'sentence_completion', text: 'The working memory model was proposed by __________ in 1974.' },
      { number: 4, type: 'matching', text: 'Match each working memory component to its function.', sub_items: [{ item: 'Central executive', options: 'A) Processes visual data  B) Handles verbal information  C) Controls attention  D) Integrates information' }, { item: 'Phonological loop', options: 'A) Processes visual data  B) Handles verbal information  C) Controls attention  D) Integrates information' }, { item: 'Visuospatial sketchpad', options: 'A) Processes visual data  B) Handles verbal information  C) Controls attention  D) Integrates information' }] },
      { number: 5, type: 'sentence_completion', text: 'The episodic buffer was added to the model in the year __________.' },
      { number: 6, type: 'mcq', text: 'What did the study of patient KF demonstrate?', options: ['A) Short-term memory is unlimited', 'B) Verbal and visual memory use separate stores', 'C) Brain damage always affects all memory types', 'D) Long-term memory is more important than short-term'] },
      { number: 7, type: 'sentence_completion', text: "Tulving's distinction between episodic and semantic memory was proposed in __________." },
      { number: 8, type: 'sentence_completion', text: 'Procedural memory is memory for __________ and how to do things.' },
      { number: 9, type: 'sentence_completion', text: 'Episodic memory is linked to the __________ in the brain.' },
      { number: 10, type: 'sentence_completion', text: 'Procedural memory involves the cerebellum and __________.' }
    ],
    answer_key: {
      '1': '1968',
      '2': 'C',
      '3': 'Baddeley and Hitch',
      '4': 'Central executive — C; Phonological loop — B; Visuospatial sketchpad — A',
      '5': '2000',
      '6': 'B',
      '7': '1972',
      '8': 'skills',
      '9': 'hippocampus',
      '10': 'basal ganglia'
    },
    sort_order: 17
  },
  {
    test_id: 12,
    section_number: 3,
    title: 'Research Sources for History Paper',
    audio_duration_seconds: 340,
    transcript: `STUDENT: Hi, I was hoping you could help me find some sources for my history paper. I'm writing about the Silk Road and its impact on cultural exchange.
LIBRARIAN: Of course. That's a fascinating topic. What period are you focusing on?
STUDENT: Mainly the classical period — from about the 2nd century BCE to the 15th century CE. My professor wants me to look at how trade routes facilitated the spread of religions, technologies, and artistic styles.
LIBRARIAN: Alright. Have you started with any sources yet?
STUDENT: I've read the main textbook chapter and a few general articles, but my professor said I need at least eight academic sources, including at least two primary sources.
LIBRARIAN: Good. Let me show you what we have. First, I'd recommend searching our database — JSTOR is excellent for historical journals. You can access it through the library portal with your student ID.
STUDENT: I've used JSTOR before, but I'm not sure what search terms to use. "Silk Road" brings up thousands of results.
LIBRARIAN: Try narrowing it down. Use Boolean operators — for example, "Silk Road" AND "cultural exchange" AND "religion." You can also filter by date range and by peer-reviewed articles only.
STUDENT: That's helpful. What about primary sources? That's where I'm really struggling.
LIBRARIAN: For the Silk Road, there are some excellent primary source collections. The most important one is the Dunhuang manuscripts — these are documents discovered in the Mogao Caves in China in 1900. They include religious texts, trade contracts, and personal letters from merchants and monks travelling along the route.
STUDENT: Where can I access those?
LIBRARIAN: The International Dunhuang Project has digitized thousands of them. You can access the collection online — it's a collaboration between the British Library, the National Library of China, and several other institutions. I'll write down the web address for you.
STUDENT: That's amazing. What other primary sources would you suggest?
LIBRARIAN: The accounts of travellers are invaluable. Ibn Battuta's "Rihla" — that's his travel narrative from the 14th century — describes trade networks across Central Asia. And there's also the work of Xuanzang, a Chinese Buddhist monk who travelled to India in the 7th century. His records describe the monasteries, markets, and cultural practices he encountered.
STUDENT: I've heard of Xuanzang but not Ibn Battuta. Is the Rihla available in English translation?
LIBRARIAN: Yes, there's a translation by Tim Mackintosh-Smith. We have a copy in the reference section — I can put it on reserve for you.
STUDENT: Please do. What about secondary sources? Any key historians I should look at?
LIBRARIAN: Peter Frankopan's "The Silk Roads: A New History of the World" is an excellent starting point. It was published in 2015 and has been widely praised for making the topic accessible. For a more academic treatment, look at Valerie Hansen's "The Silk Road: A New History" — she focuses on archaeological evidence from sites along the route.
STUDENT: Hansen — is that H-A-N-S-E-N?
LIBRARIAN: That's right. Her book was published in 2012. She's a professor at Yale, and her approach is quite different from Frankopan's — she argues that the Silk Road was not actually a single, continuous trade route but rather a series of shorter, overlapping routes.
STUDENT: That's an interesting argument. It might give me a different angle for my paper.
LIBRARIAN: Definitely. One more recommendation — Susan Whitfield has edited a collection called "Life Along the Silk Road." It presents the stories of individual travellers, merchants, and monks based on archaeological findings. It's very readable and gives a human dimension to the historical evidence.
STUDENT: This is incredibly helpful. Can I also access any of these through e-books?
LIBRARIAN: Frankopan's book is available as an e-book through our library system. The others you'll need to access in print. I'd also suggest booking a research consultation with Dr. Karim in the History department — he specializes in Central Asian trade history and can guide your analysis.
STUDENT: I'll do that. Thank you so much for your time.
LIBRARIAN: You're welcome. Good luck with your paper.`,
    speaker_count: 2,
    accent: 'british',
    context_description: 'A student consulting a university librarian about finding academic and primary sources for a history paper on the Silk Road.',
    questions: [
      { number: 1, type: 'sentence_completion', text: "The student's paper focuses on the Silk Road from the 2nd century BCE to the __________ century CE.", instruction: 'Complete the sentences below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'sentence_completion', text: 'The professor requires at least __________ academic sources.' },
      { number: 3, type: 'mcq', text: 'What database does the librarian recommend first?', options: ['A) Google Scholar', 'B) JSTOR', 'C) PubMed', 'D) Web of Science'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 4, type: 'sentence_completion', text: 'The Dunhuang manuscripts were discovered in the __________ in China in 1900.' },
      { number: 5, type: 'sentence_completion', text: "Ibn Battuta's travel narrative is called the __________." },
      { number: 6, type: 'sentence_completion', text: 'Xuanzang was a Chinese __________ monk who travelled to India.' },
      { number: 7, type: 'mcq', text: "What is Valerie Hansen's key argument about the Silk Road?", options: ['A) It was primarily a maritime route', 'B) It was not a single continuous route but overlapping shorter routes', 'C) It only operated during the medieval period', 'D) It was mainly used for religious purposes'] },
      { number: 8, type: 'sentence_completion', text: "Hansen's book was published in __________." },
      { number: 9, type: 'sentence_completion', text: "Susan Whitfield's collection is called \"__________\"." },
      { number: 10, type: 'sentence_completion', text: 'The librarian suggests booking a consultation with __________ in the History department.' }
    ],
    answer_key: {
      '1': '15th',
      '2': '8/eight',
      '3': 'B',
      '4': 'Mogao Caves',
      '5': 'Rihla',
      '6': 'Buddhist',
      '7': 'B',
      '8': '2012',
      '9': 'Life Along the Silk Road',
      '10': 'Dr. Karim'
    },
    sort_order: 18
  },

  // ===== SECTION 4 — ACADEMIC LECTURES (6 scripts) =====
  {
    test_id: 7,
    section_number: 4,
    title: 'History of Writing Systems',
    audio_duration_seconds: 350,
    transcript: `Good morning, everyone. Today we're going to trace the fascinating history of writing systems — how human beings moved from purely oral communication to the complex alphabetic and logographic systems we use today.

Let's begin at the very start. The earliest known writing system is Sumerian cuneiform, which emerged in Mesopotamia — modern-day Iraq — around 3400 BCE. Now, it's important to understand that cuneiform didn't begin as a writing system in the way we think of one today. It started as a record-keeping tool. Temple administrators needed to track goods — quantities of grain, numbers of livestock, amounts of textiles being traded. So they pressed wedge-shaped marks into soft clay tablets using a reed stylus.

These early marks were pictographic — they looked like the things they represented. A drawing of a cow meant "cow." But over time, the system became more abstract. By about 2600 BCE, the symbols had evolved into the wedge-shaped impressions we recognize as cuneiform, and they could now represent not just objects but sounds — syllables of the Sumerian language.

Around the same time, a parallel development was occurring in Egypt. Egyptian hieroglyphics appeared around 3200 BCE. Unlike cuneiform, hieroglyphics maintained their pictorial quality throughout their history. The word "hieroglyphic" itself comes from the Greek for "sacred carving," because the Egyptians used this system primarily for religious and ceremonial texts carved into temple walls and monuments.

But hieroglyphics were time-consuming to produce. For everyday use, the Egyptians developed two cursive scripts: hieratic, which appeared around 2600 BCE and was used mainly by priests and scribes, and demotic, which emerged around 650 BCE and was used for commercial and legal documents. These were essentially simplified, faster versions of hieroglyphics.

Now, let's turn to one of the most significant developments in the history of writing — the invention of the alphabet. The first true alphabet is generally attributed to the Phoenicians, a trading civilization based in what is now Lebanon. Around 1050 BCE, the Phoenicians developed a system of 22 consonant letters. Notice I said consonants only — there were no vowels in the original Phoenician alphabet.

Why is this so significant? Because virtually every alphabet used in the world today descends from this single Phoenician system. The Greeks adopted the Phoenician alphabet around 800 BCE and made a crucial modification — they added vowels. They took Phoenician consonant letters that didn't correspond to Greek sounds and repurposed them as vowel symbols. The letter alpha, for instance, came from the Phoenician aleph, which originally represented a glottal stop.

From the Greek alphabet came the Latin alphabet — the one I'm speaking to you in now — through the intermediary of the Etruscans in Italy. The Latin alphabet was then spread throughout Europe by the Roman Empire and later globally through European colonization.

But we shouldn't assume that all writing systems followed the alphabetic path. In East Asia, Chinese characters developed independently from around 1200 BCE during the Shang Dynasty. Unlike alphabets, Chinese uses a logographic system — each character represents a word or morpheme rather than a sound. This system was later adopted and adapted by Japanese, which uses Chinese characters — called kanji — alongside two syllabic scripts: hiragana and katakana.

The key takeaway from today's lecture is that writing was invented independently in at least three locations — Mesopotamia, Egypt, and China — and possibly in Mesoamerica as well, where the Maya developed their own hieroglyphic system around 300 BCE. Each system evolved in response to practical needs — trade, religion, governance — and the particular solution each culture developed tells us a great deal about their values and social organization.

Next week, we'll look at the development of printing technology and its impact on literacy. Please read chapter seven of your textbook before then. Any questions?`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'An academic lecture tracing the development of writing systems from Sumerian cuneiform to modern alphabets and logographic systems.',
    questions: [
      { number: 1, type: 'note_completion', text: 'The earliest writing system — Sumerian cuneiform — emerged around __________ BCE.', instruction: 'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'note_completion', text: 'Early cuneiform was used as a __________ tool by temple administrators.' },
      { number: 3, type: 'note_completion', text: "The word 'hieroglyphic' comes from Greek meaning __________." },
      { number: 4, type: 'mcq', text: 'Which Egyptian script was used for commercial and legal documents?', options: ['A) Hieroglyphics', 'B) Hieratic', 'C) Demotic', 'D) Cuneiform'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 5, type: 'note_completion', text: 'The Phoenician alphabet consisted of __________ consonant letters.' },
      { number: 6, type: 'note_completion', text: 'The Greeks added __________ to the Phoenician alphabet.' },
      { number: 7, type: 'note_completion', text: 'The Latin alphabet reached Europe through the spread of the __________ Empire.' },
      { number: 8, type: 'note_completion', text: 'Chinese characters developed during the __________ Dynasty around 1200 BCE.' },
      { number: 9, type: 'mcq', text: 'How many locations independently invented writing?', options: ['A) Two', 'B) At least three', 'C) Four', 'D) Five'] },
      { number: 10, type: 'note_completion', text: 'Students must read chapter __________ before the next lecture.' }
    ],
    answer_key: {
      '1': '3400',
      '2': 'record-keeping',
      '3': 'sacred carving',
      '4': 'C',
      '5': '22',
      '6': 'vowels',
      '7': 'Roman',
      '8': 'Shang',
      '9': 'B',
      '10': '7/seven'
    },
    sort_order: 19
  },
  {
    test_id: 8,
    section_number: 4,
    title: 'Sustainable Architecture',
    audio_duration_seconds: 350,
    transcript: `Welcome back, everyone. In today's lecture, I want to explore the principles and practices of sustainable architecture — an approach to building design that aims to minimize environmental impact while maximizing the well-being of the people who use these buildings.

Let's start with a definition. Sustainable architecture, sometimes called green architecture, is the practice of designing buildings that reduce resource consumption, minimize waste, and create healthy indoor environments. It considers the entire lifecycle of a building — from the extraction of raw materials through construction, operation, maintenance, and eventually demolition or repurposing.

The concept isn't as new as you might think. Vernacular architecture — traditional building methods developed over centuries — was inherently sustainable. In the Middle East, for example, buildings were designed with thick mud-brick walls that absorbed heat during the day and released it slowly at night, naturally regulating indoor temperatures. Wind towers, or badgirs, were used in Iran and the Gulf region to funnel cool air into buildings — a passive cooling technology that's being rediscovered and adapted by modern architects.

Now, let's look at the key principles of modern sustainable architecture. The first is energy efficiency. Buildings account for approximately 40 percent of global energy consumption and roughly 33 percent of greenhouse gas emissions. So reducing the energy a building uses is critical. This can be achieved through passive design strategies — orientation, insulation, natural ventilation, and daylighting — as well as active systems like solar panels, heat pumps, and energy-efficient lighting.

The second principle is water conservation. Green buildings incorporate systems to reduce water usage — low-flow fixtures, rainwater harvesting, and greywater recycling. A greywater system, for instance, collects water from sinks, showers, and washing machines and treats it for reuse in toilet flushing and garden irrigation. Some buildings achieve a 60 percent reduction in water consumption through these methods.

The third principle is material selection. Sustainable architects prioritize materials that are locally sourced — reducing transport emissions — renewable, recycled, or recyclable. Cross-laminated timber, or CLT, is an excellent example. It's made from sustainably harvested wood, it sequesters carbon — meaning the carbon absorbed by the tree during its growth remains locked in the timber — and it's strong enough to be used in buildings up to 18 storeys high.

Let me give you a case study to illustrate these principles in action. The Edge building in Amsterdam, completed in 2015, is frequently cited as one of the greenest office buildings in the world. It achieved a BREEAM sustainability rating of 98.4 percent — the highest score ever recorded at the time.

The Edge generates more electricity than it consumes, making it energy-positive. The south-facing facade is covered with solar panels that produce enough energy to power the building and charge electric vehicles in the car park. The building uses an aquifer thermal energy storage system — it stores warm water underground in summer and retrieves it in winter for heating, and vice versa for cooling.

Inside, 28,000 sensors monitor temperature, humidity, light levels, and occupancy in real time. Employees use a smartphone app to find available desks, adjust lighting and temperature in their workspace, and even set their preferred coffee strength. This smart technology reduces energy waste by ensuring that unoccupied areas are not heated, cooled, or lit.

Another notable example is the Bullitt Center in Seattle, completed in 2013. It was designed to meet the Living Building Challenge — the most rigorous green building standard in the world. The building collects all its own water from rainwater, treats its own sewage on-site, and generates all its electricity from a rooftop solar array. It was designed to last 250 years — compared to the typical 40-year lifespan of a conventional building.

The challenges of sustainable architecture shouldn't be underestimated, however. Green buildings typically cost 5 to 15 percent more upfront than conventional buildings, though studies consistently show that the operational savings — lower energy and water bills, reduced maintenance costs — pay back the additional investment within seven to ten years.

Looking forward, the future of sustainable architecture lies in what's called regenerative design — buildings that don't just minimize harm but actively improve the environment. Imagine buildings that clean the air, generate renewable energy for the surrounding neighbourhood, and support local biodiversity. That's the direction the field is heading.

For next week, please read the case study on the Masdar City project in Abu Dhabi — it's in your course reader, pages 145 to 162.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'An academic lecture on sustainable architecture covering principles, historical context, and modern case studies.',
    questions: [
      { number: 1, type: 'note_completion', text: 'Sustainable architecture considers the entire __________ of a building.', instruction: 'Complete the notes below. Write NO MORE THAN THREE WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'note_completion', text: 'Wind towers (badgirs) were used in Iran for __________ cooling.' },
      { number: 3, type: 'note_completion', text: 'Buildings account for approximately __________ percent of global energy consumption.' },
      { number: 4, type: 'note_completion', text: 'A greywater system collects water from sinks, showers, and __________.' },
      { number: 5, type: 'note_completion', text: 'Cross-laminated timber can be used in buildings up to __________ storeys high.' },
      { number: 6, type: 'mcq', text: 'What sustainability rating did The Edge building achieve?', options: ['A) 88.4%', 'B) 92.4%', 'C) 95.4%', 'D) 98.4%'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 7, type: 'note_completion', text: 'The Edge building uses __________ sensors to monitor conditions.' },
      { number: 8, type: 'note_completion', text: 'The Bullitt Center was designed to last __________ years.' },
      { number: 9, type: 'note_completion', text: 'Green buildings typically cost __________ percent more upfront than conventional buildings.' },
      { number: 10, type: 'mcq', text: 'What does the lecturer call the future direction of sustainable architecture?', options: ['A) Net-zero design', 'B) Passive design', 'C) Regenerative design', 'D) Biophilic design'] }
    ],
    answer_key: {
      '1': 'lifecycle',
      '2': 'passive',
      '3': '40',
      '4': 'washing machines',
      '5': '18',
      '6': 'D',
      '7': '28,000/28000',
      '8': '250',
      '9': '5 to 15/5-15',
      '10': 'C'
    },
    sort_order: 20
  },
  {
    test_id: 9,
    section_number: 4,
    title: 'Sleep Science and Memory Consolidation',
    audio_duration_seconds: 350,
    transcript: `Good afternoon. Today's lecture focuses on one of the most active areas of neuroscience research — the relationship between sleep and memory consolidation. By the end of this session, you should understand the key sleep stages, how each contributes to different types of memory processing, and what the latest research tells us about optimizing sleep for learning.

Let's begin with the basics of sleep architecture. A typical night's sleep consists of four to six cycles, each lasting approximately 90 minutes. Within each cycle, we pass through several stages. First, there's NREM sleep — that stands for Non-Rapid Eye Movement — which has three stages. Stage 1 is the lightest sleep, lasting only five to ten minutes. Stage 2 is a slightly deeper sleep characterized by what we call sleep spindles — bursts of rapid neural activity that last one to two seconds. And Stage 3 is deep sleep, or slow-wave sleep, characterized by delta waves — slow, high-amplitude brain waves.

After NREM comes REM sleep — Rapid Eye Movement sleep. This is the stage most associated with vivid dreaming. During REM, the brain is highly active — almost as active as when we're awake — but the body is essentially paralyzed, a state called atonia. This prevents us from acting out our dreams.

Now, here's where it gets interesting for our purposes. Research has shown that different sleep stages play distinct roles in memory consolidation. Slow-wave sleep — that's NREM Stage 3 — appears to be critical for consolidating declarative memories. These are memories of facts and events — the kind of information you'd learn from a textbook or a lecture like this one.

The leading theory, proposed by Born and Diekelmann in 2010, is called the active system consolidation hypothesis. It suggests that during slow-wave sleep, newly acquired memories in the hippocampus are reactivated and gradually transferred to the neocortex for long-term storage. Think of the hippocampus as a temporary holding area and the neocortex as the permanent archive. Slow-wave sleep is when the filing happens.

The evidence for this is compelling. In one landmark study by Marshall and colleagues in 2006, researchers applied mild electrical stimulation to participants' brains during slow-wave sleep to enhance the natural slow oscillations. The result? Participants showed a 25 percent improvement in their ability to recall word pairs they had learned the previous evening compared to a control group.

REM sleep, on the other hand, appears to be more important for procedural and emotional memories. Procedural memories are skills — playing a musical instrument, typing, riding a bicycle. Several studies have shown that depriving people of REM sleep significantly impairs their ability to consolidate motor skills learned during the day.

Perhaps more intriguingly, REM sleep seems to play a role in emotional memory processing. Walker and van der Helm proposed in 2009 that REM sleep acts as a form of "overnight therapy." During REM, the brain reprocesses emotional experiences, stripping away the emotional intensity while retaining the informational content. This is why a painful experience feels less acute after a good night's sleep — the memory remains, but the emotional sting is reduced.

What about Stage 2 sleep and those sleep spindles I mentioned earlier? Recent research by Mednick and colleagues at the University of California has shown that sleep spindles are strongly correlated with learning ability. Individuals who produce more sleep spindles tend to perform better on memory tasks. Furthermore, the number of spindles increases after intensive learning, suggesting that the brain generates more spindles when there is more information to consolidate.

So what does all this mean for students — for you, in practical terms? The research clearly indicates that sleep is not passive downtime but an active, essential phase of the learning process. Studies consistently show that students who sleep seven to eight hours perform significantly better on exams than those who sleep five hours or fewer, even if the shorter sleepers spent the extra time studying.

The timing of sleep also matters. A study by Gais and colleagues found that sleeping within three hours of learning new material leads to better retention than sleeping twelve hours later. This suggests that the sooner you sleep after studying, the more effectively the consolidation process works.

For next week, I'd like you to read the paper by Walker, 2017, titled "Why We Sleep" — specifically chapters four and six, which expand on the concepts we've discussed today.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A neuroscience lecture on how different sleep stages contribute to memory consolidation, including key research studies.',
    questions: [
      { number: 1, type: 'note_completion', text: 'Each sleep cycle lasts approximately __________ minutes.', instruction: 'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'note_completion', text: 'Sleep spindles are bursts of neural activity lasting __________ seconds.' },
      { number: 3, type: 'note_completion', text: 'During REM sleep, the body is paralyzed — a state called __________.' },
      { number: 4, type: 'note_completion', text: 'Slow-wave sleep is critical for consolidating __________ memories.' },
      { number: 5, type: 'note_completion', text: 'The active system consolidation hypothesis was proposed by __________ in 2010.' },
      { number: 6, type: 'mcq', text: "In Marshall's study, how much did recall improve with electrical stimulation during slow-wave sleep?", options: ['A) 10 percent', 'B) 15 percent', 'C) 25 percent', 'D) 35 percent'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 7, type: 'note_completion', text: 'Walker and van der Helm described REM sleep as a form of "__________."' },
      { number: 8, type: 'mcq', text: 'What do sleep spindles correlate with?', options: ['A) Dream intensity', 'B) Learning ability', 'C) Sleep duration', 'D) Emotional stability'] },
      { number: 9, type: 'note_completion', text: 'Students who sleep __________ hours perform significantly better on exams.' },
      { number: 10, type: 'note_completion', text: 'Sleeping within __________ hours of learning leads to better retention.' }
    ],
    answer_key: {
      '1': '90',
      '2': '1 to 2/1-2',
      '3': 'atonia',
      '4': 'declarative',
      '5': 'Born and Diekelmann',
      '6': 'C',
      '7': 'overnight therapy',
      '8': 'B',
      '9': '7 to 8/7-8',
      '10': '3/three'
    },
    sort_order: 21
  },
  {
    test_id: 10,
    section_number: 4,
    title: 'Economics of Water Scarcity',
    audio_duration_seconds: 340,
    transcript: `Thank you. So today I want to discuss a topic that is becoming increasingly urgent — the economics of water scarcity. Water is essential for life, for agriculture, for industry, and yet it's a resource that many of us take entirely for granted. By the end of this lecture, you should have a clearer understanding of the scale of the problem, the economic mechanisms at play, and some of the potential solutions being explored.

Let's start with some numbers. The Earth contains approximately 1.4 billion cubic kilometres of water. That sounds like a lot, but 97.5 percent of it is saltwater in the oceans. Of the remaining 2.5 percent that is freshwater, about 69 percent is locked in glaciers and ice caps, and another 30 percent is underground. That leaves less than 1 percent of the world's total water readily available in rivers, lakes, and the atmosphere.

Now, demand for freshwater has been growing steadily. Global water use has increased by roughly six times over the past century, driven by population growth, agricultural expansion, and industrialization. Currently, agriculture accounts for about 70 percent of global freshwater withdrawals, industry about 19 percent, and domestic use about 11 percent.

The United Nations estimates that by 2025, nearly 1.8 billion people will be living in regions with absolute water scarcity — meaning less than 500 cubic metres of renewable water per person per year. And by 2050, at least one in four people will live in a country affected by chronic or recurring freshwater shortages.

So what are the economic dimensions of this crisis? The first issue is pricing. In most countries, water is heavily subsidized or provided at below-cost rates. This creates what economists call a "moral hazard" — when a resource is cheap or free, people have little incentive to conserve it. In many Middle Eastern countries, for example, water is provided at a fraction of its true cost, leading to overconsumption and waste.

The economic solution seems straightforward — raise the price of water to reflect its true cost. But this creates a serious equity problem. Water is a basic human right, and raising prices disproportionately affects the poor. So governments face a fundamental tension between economic efficiency and social justice.

One approach that has shown promise is block pricing, sometimes called tiered pricing. Under this system, a basic allocation of water — typically enough for drinking, cooking, and basic hygiene — is provided at a low, subsidized rate. Beyond that threshold, the price per unit increases significantly. This ensures that everyone can afford essential water while discouraging excessive use.

The second economic dimension is what's known as "virtual water" — a concept developed by Professor Tony Allan at King's College London in 1993. Virtual water refers to the water embedded in the production of goods. For example, producing one kilogram of beef requires approximately 15,400 litres of water, while one kilogram of wheat requires about 1,800 litres. When a country imports beef, it is effectively importing 15,400 litres of water per kilogram.

This concept has profound implications for trade policy. Water-scarce countries can reduce pressure on their domestic water resources by importing water-intensive products rather than producing them locally. Saudi Arabia, for instance, has dramatically reduced its domestic wheat production since 2008, choosing instead to import grain and thereby conserve its rapidly depleting groundwater reserves.

The third dimension is investment in infrastructure and technology. Desalination — converting seawater to freshwater — has become increasingly viable as costs have fallen. The cost of desalinated water has dropped from about 5 dollars per cubic metre in the 1990s to roughly 0.5 dollars per cubic metre today. Israel now produces about 80 percent of its domestic water through desalination and has effectively eliminated water scarcity as a national concern.

However, desalination is energy-intensive. The environmental cost of that energy must be factored into the equation. The most sustainable approach combines desalination with renewable energy — and several projects in the Gulf region and North Africa are now doing exactly that, using solar power to drive desalination plants.

In conclusion, water scarcity is fundamentally an economic challenge as much as a hydrological one. The solutions require careful balancing of market mechanisms, social equity considerations, technological innovation, and international cooperation. For your reading this week, please review chapter 11 of the course textbook, focusing on the case studies of Australia's Murray-Darling Basin and Singapore's NEWater programme.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'An economics lecture on global water scarcity, covering pricing mechanisms, virtual water trade, and technological solutions.',
    questions: [
      { number: 1, type: 'summary_completion', text: 'Of the Earth\'s total water, __________ percent is saltwater.', instruction: 'Complete the summary below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'summary_completion', text: 'Less than __________ percent of total water is readily available in rivers and lakes.' },
      { number: 3, type: 'summary_completion', text: 'Agriculture accounts for about __________ percent of global freshwater withdrawals.' },
      { number: 4, type: 'mcq', text: 'What does the UN estimate about water scarcity by 2025?', options: ['A) 500 million people will lack water', 'B) 1.8 billion people will live in water-scarce regions', 'C) All developing countries will face shortages', 'D) Water prices will double globally'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 5, type: 'summary_completion', text: 'Block pricing provides a basic water allocation at a __________ rate.' },
      { number: 6, type: 'summary_completion', text: 'The concept of "virtual water" was developed by Professor Tony Allan in __________.' },
      { number: 7, type: 'summary_completion', text: 'Producing one kilogram of beef requires approximately __________ litres of water.' },
      { number: 8, type: 'mcq', text: 'Why did Saudi Arabia reduce its wheat production after 2008?', options: ['A) Wheat prices fell globally', 'B) To conserve depleting groundwater', 'C) Due to lack of farming labour', 'D) Because of trade agreements'] },
      { number: 9, type: 'summary_completion', text: 'The cost of desalinated water has dropped to roughly __________ dollars per cubic metre.' },
      { number: 10, type: 'summary_completion', text: 'Israel produces about __________ percent of its domestic water through desalination.' }
    ],
    answer_key: {
      '1': '97.5',
      '2': '1/one',
      '3': '70',
      '4': 'B',
      '5': 'low/subsidized',
      '6': '1993',
      '7': '15,400/15400',
      '8': 'B',
      '9': '0.5',
      '10': '80'
    },
    sort_order: 22
  },
  {
    test_id: 11,
    section_number: 4,
    title: 'Artificial Intelligence in Healthcare',
    audio_duration_seconds: 350,
    transcript: `Good morning. Today we're going to examine one of the most transformative developments in modern medicine — the application of artificial intelligence in healthcare. I'll cover the main areas where AI is currently being used, the evidence for its effectiveness, and the ethical questions it raises.

Let's begin with diagnostics — this is where AI has made perhaps the greatest impact so far. Machine learning algorithms, particularly deep learning models called convolutional neural networks, have demonstrated remarkable ability in analyzing medical images. In 2017, a team at Stanford University developed a deep learning algorithm that could identify skin cancer from photographs with accuracy comparable to board-certified dermatologists. The system was trained on a dataset of approximately 130,000 clinical images covering over 2,000 different skin conditions.

Since then, similar systems have been developed for detecting diabetic retinopathy from retinal scans, identifying breast cancer in mammograms, and spotting lung nodules in CT scans. In many of these applications, the AI achieves sensitivity and specificity rates above 90 percent — meaning it correctly identifies more than 90 percent of true positives while producing relatively few false positives.

The second major application area is drug discovery. Traditional drug development takes an average of 12 to 15 years and costs approximately 2.6 billion dollars. AI has the potential to dramatically reduce both. By analyzing molecular structures, predicting protein interactions, and simulating clinical trial outcomes, AI systems can identify promising drug candidates much faster than traditional methods.

A milestone in this area came in 2020 when a company called Insilico Medicine used AI to identify a novel drug target and design a molecule to hit that target in just 46 days. Under traditional methods, this process would typically take four to five years. The molecule is now in clinical trials for treating idiopathic pulmonary fibrosis — a progressive lung disease.

The third application is predictive analytics — using AI to forecast patient outcomes and identify individuals at risk of developing specific conditions. Hospital systems are increasingly using AI to predict which patients in intensive care are likely to deteriorate in the next few hours, allowing medical staff to intervene earlier.

One notable system, developed at Johns Hopkins University, is called TREWS — Targeted Real-time Early Warning Score. It analyzes electronic health records in real time to identify patients showing early signs of sepsis — a life-threatening response to infection that kills approximately 270,000 people annually in the United States alone. In clinical trials, TREWS reduced sepsis-related mortality by 18.2 percent.

The fourth area I want to highlight is personalized medicine. AI can analyze a patient's genetic profile, medical history, lifestyle factors, and even social determinants of health to recommend tailored treatment plans. In oncology, for example, AI systems can analyze the genetic mutations in a patient's tumour and match them with targeted therapies that are most likely to be effective.

Now, I need to address the ethical challenges. The first and most frequently discussed is the "black box" problem. Many AI systems, particularly deep learning models, are extremely difficult to interpret. They can tell you that a patient has an 85 percent probability of developing a particular condition, but they can't always explain why. This is problematic in medicine, where clinicians need to understand the reasoning behind a diagnosis to make informed treatment decisions.

The second ethical issue is bias. AI systems are only as good as the data they're trained on. If the training data underrepresents certain populations — and medical datasets frequently do — the AI may perform poorly for those groups. A well-known example is a dermatology AI that was trained primarily on images of light-skinned patients and consequently had significantly lower accuracy when diagnosing conditions in people with darker skin tones.

The third concern is accountability. If an AI system makes an incorrect diagnosis and a patient is harmed, who is responsible? The developer of the algorithm? The hospital that deployed it? The clinician who relied on it? Current legal frameworks are not well-equipped to answer this question.

Despite these challenges, the trajectory is clear — AI will become an increasingly integral part of healthcare delivery. The key is to develop and deploy these systems responsibly, with robust validation, transparent reporting of limitations, and always keeping the patient at the centre.

For next week, please read the WHO guidelines on the ethics of AI in health — they were published in 2021 and provide a comprehensive framework for responsible AI deployment.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A lecture on the applications of artificial intelligence in healthcare, covering diagnostics, drug discovery, predictive analytics, and ethical challenges.',
    questions: [
      { number: 1, type: 'note_completion', text: "Stanford's skin cancer AI was trained on approximately __________ clinical images.", instruction: 'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'note_completion', text: 'AI diagnostic systems achieve sensitivity and specificity rates above __________ percent.' },
      { number: 3, type: 'note_completion', text: 'Traditional drug development takes an average of __________ years.' },
      { number: 4, type: 'note_completion', text: 'Traditional drug development costs approximately __________ billion dollars.' },
      { number: 5, type: 'note_completion', text: 'Insilico Medicine identified a drug target and designed a molecule in just __________ days.' },
      { number: 6, type: 'mcq', text: 'What does the TREWS system detect?', options: ['A) Heart attacks', 'B) Sepsis', 'C) Stroke', 'D) Respiratory failure'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 7, type: 'note_completion', text: 'TREWS reduced sepsis-related mortality by __________ percent.' },
      { number: 8, type: 'mcq', text: 'What is the "black box" problem in AI?', options: ['A) AI systems are too expensive', 'B) AI cannot process enough data', 'C) AI reasoning is difficult to interpret', 'D) AI requires too much computing power'] },
      { number: 9, type: 'note_completion', text: 'A dermatology AI had lower accuracy for patients with __________ skin tones.' },
      { number: 10, type: 'note_completion', text: 'The WHO guidelines on AI ethics in health were published in __________.' }
    ],
    answer_key: {
      '1': '130,000/130000',
      '2': '90',
      '3': '12 to 15/12-15',
      '4': '2.6',
      '5': '46',
      '6': 'B',
      '7': '18.2',
      '8': 'C',
      '9': 'darker',
      '10': '2021'
    },
    sort_order: 23
  },
  {
    test_id: 12,
    section_number: 4,
    title: 'Migration Patterns of Marine Animals',
    audio_duration_seconds: 350,
    transcript: `Good afternoon, everyone. In today's lecture, we're going to explore one of the most remarkable phenomena in the natural world — the migration patterns of marine animals. We'll look at why marine species migrate, examine some of the most extraordinary journeys undertaken by ocean creatures, and consider how climate change is disrupting these ancient patterns.

Migration in marine animals is driven by three primary factors: reproduction, feeding, and temperature regulation. Many species travel vast distances to reach breeding grounds where conditions are optimal for their offspring, or to access seasonal feeding areas where food is abundant.

Let's start with perhaps the most famous marine migrant — the humpback whale. Humpback whales undertake one of the longest migrations of any mammal, travelling up to 8,000 kilometres each way between their winter breeding grounds in tropical waters and their summer feeding grounds in polar regions. In the Southern Hemisphere, populations feed in the waters around Antarctica during the austral summer, consuming up to 1,400 kilograms of krill per day. As winter approaches, they migrate north to breed in warmer waters off the coasts of Australia, Tonga, and East Africa.

What's particularly fascinating is how they navigate. Research published in 2011 by Horton and colleagues demonstrated that humpback whales follow remarkably straight paths across open ocean — deviating less than 5 degrees from a straight line over thousands of kilometres. They appear to use a combination of the Earth's magnetic field, the position of the sun, and possibly even the sounds of distant coastlines to navigate.

Now let's turn to sea turtles — another group of extraordinary navigators. The leatherback sea turtle holds the record for the longest migration of any reptile. Individuals have been tracked travelling over 16,000 kilometres across the Pacific Ocean from nesting beaches in Indonesia to feeding grounds off the coast of the United States. They accomplish this in roughly 647 days.

But perhaps the most remarkable feat of navigation belongs to the loggerhead sea turtle. Loggerheads born on beaches in Japan enter the Pacific as hatchlings and spend the next 10 to 15 years drifting with the North Pacific Current before eventually returning to the exact same beach where they were born to lay their own eggs. How do they find their way back? Research by Lohmann and colleagues has shown that loggerheads imprint on the unique magnetic signature of their natal beach and can detect minute variations in the Earth's magnetic field to navigate back to it.

Moving on to fish — the Atlantic bluefin tuna is one of the ocean's great migrants. These powerful fish can weigh up to 680 kilograms and reach speeds of 70 kilometres per hour. They migrate across the entire Atlantic Ocean, from the Gulf of Mexico and Mediterranean Sea — their two main spawning areas — to feeding grounds off the coasts of Iceland, Norway, and Newfoundland. Tagging studies have shown that individual tuna can cross the Atlantic in as few as 60 days.

The Arctic tern deserves special mention, even though it's a seabird rather than a marine animal. The Arctic tern holds the absolute distance record for migration — it flies from its Arctic breeding grounds to the Antarctic and back every year, covering approximately 71,000 kilometres annually. Over its lifespan of about 30 years, that's equivalent to three return trips to the moon.

Now, let's consider how climate change is affecting these migration patterns. Rising ocean temperatures are causing shifts in the distribution of prey species, which in turn forces predators to alter their traditional routes. In the North Atlantic, warming waters have pushed stocks of mackerel and herring northward by an average of 300 kilometres over the past three decades. As a result, predators that depend on these fish — including tuna, whales, and seabirds — are being forced to travel further to find food.

Perhaps most concerning is the impact on coral reef ecosystems, which serve as critical waypoints for many migratory species. As bleaching events become more frequent and severe, the reefs that provide food and shelter for migrating fish and turtles are degrading. A study by Hughes and colleagues in 2018 found that 50 percent of the Great Barrier Reef's coral cover has been lost since 1995.

The implications extend beyond individual species. Marine migrations transport enormous quantities of nutrients across ocean basins. Whale faeces, for instance, are rich in iron, which stimulates the growth of phytoplankton — the microscopic organisms that produce roughly 50 percent of the world's oxygen. If whale populations decline or their migration routes shift, this nutrient transport system could be disrupted, with cascading effects throughout the marine food web.

Next week, we'll look at conservation strategies — including marine protected areas and international agreements designed to protect migratory corridors. Please read chapter 14 in your marine ecology textbook.`,
    speaker_count: 1,
    accent: 'british',
    context_description: 'A marine biology lecture on the migration patterns of whales, sea turtles, tuna, and seabirds, and the impact of climate change on these patterns.',
    questions: [
      { number: 1, type: 'note_completion', text: 'Humpback whales travel up to __________ kilometres each way during migration.', instruction: 'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.' },
      { number: 2, type: 'note_completion', text: 'Humpback whales consume up to __________ kilograms of krill per day.' },
      { number: 3, type: 'note_completion', text: 'Humpbacks deviate less than __________ degrees from a straight line when navigating.' },
      { number: 4, type: 'mcq', text: 'What record does the leatherback sea turtle hold?', options: ['A) Deepest dive by a reptile', 'B) Longest migration of any reptile', 'C) Fastest swimming reptile', 'D) Largest marine reptile'], instruction: 'Choose the correct letter, A, B, C or D.' },
      { number: 5, type: 'note_completion', text: 'Loggerhead turtles imprint on the __________ of their natal beach.' },
      { number: 6, type: 'note_completion', text: 'Atlantic bluefin tuna can reach speeds of __________ kilometres per hour.' },
      { number: 7, type: 'note_completion', text: 'The Arctic tern covers approximately __________ kilometres annually.' },
      { number: 8, type: 'note_completion', text: 'Prey species in the North Atlantic have moved northward by __________ kilometres over three decades.' },
      { number: 9, type: 'mcq', text: 'What percentage of Great Barrier Reef coral cover has been lost since 1995?', options: ['A) 30 percent', 'B) 40 percent', 'C) 50 percent', 'D) 60 percent'] },
      { number: 10, type: 'note_completion', text: 'Phytoplankton produce roughly __________ percent of the world\'s oxygen.' }
    ],
    answer_key: {
      '1': '8,000/8000',
      '2': '1,400/1400',
      '3': '5',
      '4': 'B',
      '5': 'magnetic signature',
      '6': '70',
      '7': '71,000/71000',
      '8': '300',
      '9': 'C',
      '10': '50'
    },
    sort_order: 24
  }
];

async function main() {
  console.log('Inserting 12 Listening Sections 3-4...');

  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const { data, error } = await supabase.from('ielts_listening_sections').insert(s).select('id');
    if (error) {
      console.log(`❌ Section ${i + 1} error: ${error.message}`);
    } else {
      console.log(`✅ S${s.section_number}: ${s.title}`);
    }
  }

  // Verify
  const { data: all } = await supabase.from('ielts_listening_sections').select('id, section_number');
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  all?.forEach(r => counts[r.section_number]++);
  console.log(`\n🎧 Total listening sections: ${all?.length}`);
  console.log(`  Section 1 (dialogues): ${counts[1]}`);
  console.log(`  Section 2 (monologues): ${counts[2]}`);
  console.log(`  Section 3 (academic discussions): ${counts[3]}`);
  console.log(`  Section 4 (academic lectures): ${counts[4]}`);
}

main();
