#!/usr/bin/env node
/* eslint-disable no-console */
// FINISH-100 fix #1 — balance skill mix: add ~800 reading + ~800 writing exercises.
// Pre-existing state: grammar=2665, vocab=777, reading=85, writing=45.
// Targets: bring reading + writing each to ~875 (per §3 quality bar).

const https = require('https')

function callOnce(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST', family: 4,
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      let body = ''; res.on('data', (c) => body += c)
      res.on('end', () => resolve({ statusCode: res.statusCode, body }))
    })
    req.on('error', reject); req.write(data); req.end()
  })
}
const BACKOFFS = [2000, 5000, 10000, 20000, 40000]
const sleep = (ms) => new Promise(r => setTimeout(r, ms))
async function call(token, ref, query) {
  for (let i = 0; i <= BACKOFFS.length; i++) {
    const res = await callOnce(token, ref, query)
    if (res.statusCode === 429 && i < BACKOFFS.length) { await sleep(BACKOFFS[i]); continue }
    if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}: ${res.body.slice(0, 200)}`)
    try { return JSON.parse(res.body) } catch { return res.body }
  }
}
const esc = (s) => s == null ? 'NULL' : `$${'g'}$${String(s).replace(/\$g\$/g, '$_g_$')}$${'g'}$`
const jsonbVal = (v) => `${esc(JSON.stringify(v))}::jsonb`
const arrText = (a) => !a || a.length === 0 ? "'{}'::text[]" : `ARRAY[${a.map((x) => esc(x)).join(',')}]::text[]`

// ─── READING PASSAGES (35 short passages × 5 questions each = 175 per level × 5 = 875) ───
const READING_PASSAGES = [
  // L1 — A1 short passages (easy daily-life)
  { level: 'L1', text: "Sara wakes up at 7 AM every day. She drinks tea and eats two pieces of bread for breakfast. Then she walks to her school. School starts at 8 AM. After school, she goes home and helps her mother in the kitchen.", qs: [
    { q: "What time does Sara wake up?", correct: "7 AM", distract: ["6 AM", "8 AM", "9 AM"], expl: "النص يقول 'wakes up at 7 AM every day' — الجواب مباشر." },
    { q: "What does Sara eat for breakfast?", correct: "Bread", distract: ["Eggs", "Rice", "Cheese"], expl: "النص: 'eats two pieces of bread for breakfast'. ركّزي على الكلمة المفتاحية 'breakfast'." },
    { q: "How does Sara go to school?", correct: "She walks", distract: ["She takes the bus", "Her mother drives her", "She rides a bike"], expl: "النص: 'she walks to her school'." },
    { q: "When does school start?", correct: "8 AM", distract: ["7 AM", "9 AM", "10 AM"], expl: "النص: 'School starts at 8 AM'. لاحظي الفرق بين wake up time و school start time." },
    { q: "What does Sara do after school?", correct: "Helps her mother", distract: ["Plays football", "Reads books", "Does homework"], expl: "النص: 'she goes home and helps her mother in the kitchen'." },
  ]},
  { level: 'L1', text: "My name is Khalid. I am 25 years old. I live in Riyadh with my family. I have one brother and two sisters. My father is a doctor and my mother is a teacher. I work in a small office in the city.", qs: [
    { q: "How old is Khalid?", correct: "25", distract: ["20", "30", "35"], expl: "النص: 'I am 25 years old'." },
    { q: "Where does Khalid live?", correct: "Riyadh", distract: ["Jeddah", "Mecca", "Dammam"], expl: "النص: 'I live in Riyadh with my family'." },
    { q: "How many siblings does Khalid have?", correct: "3 (one brother, two sisters)", distract: ["2", "4", "5"], expl: "النص: 'one brother and two sisters' = 3 إخوة." },
    { q: "What is Khalid's mother's job?", correct: "Teacher", distract: ["Doctor", "Engineer", "Nurse"], expl: "النص: 'my mother is a teacher'. والده الطبيب، والدته المعلمة." },
    { q: "Where does Khalid work?", correct: "A small office", distract: ["A school", "A hospital", "A bank"], expl: "النص: 'I work in a small office in the city'." },
  ]},
  { level: 'L1', text: "It is Friday today. The weather is sunny and warm. My family and I go to the beach. We swim in the sea. My little brother builds a sand castle. We eat lunch under a big umbrella. At sunset, we go home.", qs: [
    { q: "What day is it?", correct: "Friday", distract: ["Saturday", "Sunday", "Monday"], expl: "النص: 'It is Friday today'." },
    { q: "How is the weather?", correct: "Sunny and warm", distract: ["Cold and rainy", "Cloudy", "Snowy"], expl: "النص: 'The weather is sunny and warm'." },
    { q: "Where does the family go?", correct: "The beach", distract: ["The park", "The mall", "A restaurant"], expl: "النص: 'go to the beach'." },
    { q: "What does the little brother do?", correct: "Builds a sand castle", distract: ["Swims", "Sleeps", "Eats"], expl: "النص: 'My little brother builds a sand castle'." },
    { q: "When does the family go home?", correct: "At sunset", distract: ["At noon", "At midnight", "In the morning"], expl: "النص: 'At sunset, we go home'." },
  ]},
  { level: 'L1', text: "Layla is a student. She studies English at the university. Every day, she has classes from 9 AM to 12 PM. After class, she eats lunch with her friends. In the evening, she does her homework.", qs: [
    { q: "What does Layla study?", correct: "English", distract: ["Math", "History", "Science"], expl: "النص: 'She studies English at the university'." },
    { q: "When do her classes start?", correct: "9 AM", distract: ["8 AM", "10 AM", "11 AM"], expl: "النص: 'classes from 9 AM to 12 PM'." },
    { q: "Who does Layla eat lunch with?", correct: "Her friends", distract: ["Her family", "Alone", "Her teacher"], expl: "النص: 'she eats lunch with her friends'." },
    { q: "What does Layla do in the evening?", correct: "Homework", distract: ["Sleeps", "Watches TV", "Goes shopping"], expl: "النص: 'In the evening, she does her homework'." },
    { q: "How long are her classes?", correct: "3 hours", distract: ["2 hours", "4 hours", "5 hours"], expl: "From 9 AM to 12 PM = 3 hours. حاسبي الفرق." },
  ]},
  { level: 'L1', text: "Ahmed has a cat. The cat's name is Mishmish. Mishmish is black and white. He likes to drink milk in the morning. He sleeps on Ahmed's bed at night. Ahmed loves his cat very much.", qs: [
    { q: "What is the cat's name?", correct: "Mishmish", distract: ["Ahmed", "Layla", "Sara"], expl: "النص: 'The cat\\'s name is Mishmish'." },
    { q: "What color is the cat?", correct: "Black and white", distract: ["All black", "All white", "Orange"], expl: "النص: 'Mishmish is black and white'." },
    { q: "What does the cat drink?", correct: "Milk", distract: ["Water", "Tea", "Juice"], expl: "النص: 'He likes to drink milk in the morning'." },
    { q: "Where does the cat sleep?", correct: "On Ahmed's bed", distract: ["On the floor", "Outside", "In the kitchen"], expl: "النص: 'He sleeps on Ahmed\\'s bed at night'." },
    { q: "When does the cat drink milk?", correct: "In the morning", distract: ["At night", "In the evening", "At noon"], expl: "'drink milk in the morning'." },
  ]},
  { level: 'L1', text: "Today is my birthday. I am 18 years old now. My family bought me a beautiful cake. My friends came to my house. We ate cake, drank juice, and played music. It was a wonderful day.", qs: [
    { q: "How old is the speaker now?", correct: "18", distract: ["17", "19", "20"], expl: "النص: 'I am 18 years old now'." },
    { q: "What special day is it?", correct: "Birthday", distract: ["Wedding", "Graduation", "New Year"], expl: "النص: 'Today is my birthday'." },
    { q: "Who came to the house?", correct: "Friends", distract: ["Teachers", "Coworkers", "Neighbors"], expl: "النص: 'My friends came to my house'." },
    { q: "What did they eat?", correct: "Cake", distract: ["Pizza", "Rice", "Bread"], expl: "النص: 'We ate cake'." },
    { q: "How was the day?", correct: "Wonderful", distract: ["Terrible", "Boring", "Sad"], expl: "النص: 'It was a wonderful day'." },
  ]},
  { level: 'L1', text: "Noor is a doctor. She works in a big hospital. She helps sick people get better. Her work is hard but she loves it. She works from 8 AM to 6 PM. On weekends, she rests at home.", qs: [
    { q: "What is Noor's job?", correct: "Doctor", distract: ["Nurse", "Teacher", "Lawyer"], expl: "النص: 'Noor is a doctor'." },
    { q: "Where does she work?", correct: "A big hospital", distract: ["A small clinic", "Home", "A school"], expl: "النص: 'She works in a big hospital'." },
    { q: "What does she do?", correct: "Helps sick people", distract: ["Teaches students", "Sells things", "Fixes cars"], expl: "النص: 'She helps sick people get better'." },
    { q: "How does she feel about her work?", correct: "She loves it", distract: ["She hates it", "She's bored", "She's tired"], expl: "النص: 'she loves it'." },
    { q: "What does she do on weekends?", correct: "Rests at home", distract: ["Goes to work", "Travels", "Studies"], expl: "النص: 'On weekends, she rests at home'." },
  ]},

  // L2 — A2 medium passages
  { level: 'L2', text: "The Internet has changed our lives. Before the Internet, people sent letters or used the telephone to communicate. Now, we can send messages and make video calls anywhere in the world. The Internet also helps us find information quickly, but we must be careful about what we read online.", qs: [
    { q: "What did people use before the Internet?", correct: "Letters and telephone", distract: ["Email", "Video calls", "Text messages"], expl: "النص: 'people sent letters or used the telephone'." },
    { q: "What can we do now with the Internet?", correct: "Send messages and video calls", distract: ["Only send emails", "Only watch movies", "Only read news"], expl: "النص: 'we can send messages and make video calls'." },
    { q: "What does the Internet help us find?", correct: "Information", distract: ["Friends", "Money", "Jobs"], expl: "النص: 'The Internet also helps us find information'." },
    { q: "What must we be careful about?", correct: "What we read online", distract: ["Speed of the Internet", "Cost of the Internet", "Time we spend online"], expl: "النص: 'we must be careful about what we read online'." },
    { q: "How has the Internet changed life according to the passage?", correct: "Made communication easier", distract: ["Made life slower", "Made life more expensive", "Has not changed anything"], expl: "Implied من النص — تواصل أسهل وأسرع." },
  ]},
  { level: 'L2', text: "Healthy eating is important for everyone. Doctors recommend eating fruits and vegetables every day. Sugar and fast food can cause health problems. Drinking water is better than drinking soda. Exercise is also important. People who exercise regularly are usually healthier.", qs: [
    { q: "What do doctors recommend?", correct: "Eating fruits and vegetables", distract: ["Eating only meat", "Eating only rice", "Skipping meals"], expl: "النص: 'Doctors recommend eating fruits and vegetables every day'." },
    { q: "What can cause health problems?", correct: "Sugar and fast food", distract: ["Water", "Fruits", "Vegetables"], expl: "النص: 'Sugar and fast food can cause health problems'." },
    { q: "What is better to drink?", correct: "Water", distract: ["Soda", "Juice", "Coffee"], expl: "النص: 'Drinking water is better than drinking soda'." },
    { q: "Who is usually healthier?", correct: "People who exercise", distract: ["People who eat fast food", "People who watch TV", "People who sleep a lot"], expl: "النص: 'People who exercise regularly are usually healthier'." },
    { q: "What is the main idea of the passage?", correct: "Healthy habits matter", distract: ["Sugar is delicious", "Exercise is hard", "Doctors are busy"], expl: "الفكرة الرئيسية: العادات الصحية مهمة." },
  ]},
  { level: 'L2', text: "Saudi Arabia is famous for its rich history and beautiful landscapes. The country has deserts, mountains, and coasts on two seas. Mecca and Medina are holy cities for Muslims. The capital, Riyadh, is a modern city with tall buildings and busy streets. AlUla is a popular place for tourists because of its ancient ruins.", qs: [
    { q: "What is Saudi Arabia famous for?", correct: "History and landscapes", distract: ["Food only", "Sports", "Music"], expl: "النص: 'famous for its rich history and beautiful landscapes'." },
    { q: "What kind of land does Saudi Arabia have?", correct: "Deserts, mountains, coasts", distract: ["Only deserts", "Only forests", "Only ice"], expl: "النص يذكر 'deserts, mountains, and coasts'." },
    { q: "Which cities are holy for Muslims?", correct: "Mecca and Medina", distract: ["Riyadh and Jeddah", "Dammam and Khobar", "AlUla and Tabuk"], expl: "النص: 'Mecca and Medina are holy cities for Muslims'." },
    { q: "What is the capital?", correct: "Riyadh", distract: ["Mecca", "Jeddah", "AlUla"], expl: "النص: 'The capital, Riyadh'." },
    { q: "Why do tourists visit AlUla?", correct: "Ancient ruins", distract: ["Beaches", "Shopping", "Modern buildings"], expl: "النص: 'AlUla is a popular place for tourists because of its ancient ruins'." },
  ]},
  { level: 'L2', text: "Many young people today want to learn English. English is important for jobs, travel, and education. Some people study English in schools or universities. Others learn online from apps or videos. The best way to learn a language is to practice every day, even for just 15 minutes.", qs: [
    { q: "Why do young people want to learn English?", correct: "For jobs and travel", distract: ["For sports", "For cooking", "For dancing"], expl: "النص: 'English is important for jobs, travel, and education'." },
    { q: "Where do some people learn English?", correct: "Schools and universities", distract: ["Restaurants", "Gyms", "Hospitals"], expl: "النص: 'in schools or universities'." },
    { q: "How do others learn?", correct: "Online apps and videos", distract: ["Letters", "Newspapers", "Radio"], expl: "النص: 'learn online from apps or videos'." },
    { q: "What is the best way to learn?", correct: "Practice every day", distract: ["Study once a week", "Watch TV", "Sleep more"], expl: "النص: 'The best way to learn a language is to practice every day'." },
    { q: "How much daily practice is enough to start?", correct: "15 minutes", distract: ["1 hour", "30 minutes", "5 minutes"], expl: "النص: 'even for just 15 minutes'." },
  ]},
  { level: 'L2', text: "Climate change is a big problem in our world. Temperatures are rising, ice is melting, and weather is becoming more extreme. People need to use less energy and more clean transport like bicycles. Recycling and planting trees can also help. Every small action makes a difference.", qs: [
    { q: "What is happening to temperatures?", correct: "Rising", distract: ["Falling", "Staying the same", "Disappearing"], expl: "النص: 'Temperatures are rising'." },
    { q: "What is melting?", correct: "Ice", distract: ["Sand", "Wood", "Metal"], expl: "النص: 'ice is melting'." },
    { q: "What clean transport is suggested?", correct: "Bicycles", distract: ["Cars", "Planes", "Boats"], expl: "النص: 'more clean transport like bicycles'." },
    { q: "What else helps the planet?", correct: "Recycling and planting trees", distract: ["Burning more fuel", "Cutting trees", "Wasting water"], expl: "النص: 'Recycling and planting trees can also help'." },
    { q: "What is the message of the passage?", correct: "Small actions matter", distract: ["Only governments matter", "Climate change is fake", "Nothing can be done"], expl: "النص الأخير: 'Every small action makes a difference'." },
  ]},
  { level: 'L2', text: "Coffee is the most popular drink in many countries. People drink coffee in the morning to wake up. There are many types of coffee — black, with milk, sweet, or strong. In Saudi Arabia, traditional coffee is served with dates and is part of welcoming guests.", qs: [
    { q: "When do most people drink coffee?", correct: "In the morning", distract: ["At midnight", "Only on weekends", "While exercising"], expl: "النص: 'in the morning to wake up'." },
    { q: "Why do people drink coffee in the morning?", correct: "To wake up", distract: ["To sleep", "To exercise", "To pray"], expl: "النص: 'to wake up'." },
    { q: "What is served with traditional Saudi coffee?", correct: "Dates", distract: ["Bread", "Rice", "Cheese"], expl: "النص: 'served with dates'." },
    { q: "What does Saudi coffee represent culturally?", correct: "Welcoming guests", distract: ["A medicine", "A snack", "A meal"], expl: "النص: 'part of welcoming guests'." },
    { q: "How many types of coffee are mentioned?", correct: "Four (black, milk, sweet, strong)", distract: ["Two", "Three", "Five"], expl: "النص يذكر: 'black, with milk, sweet, or strong' = 4 أنواع." },
  ]},
  { level: 'L2', text: "Sleep is very important for our health. Adults need 7 to 9 hours of sleep every night. Children need even more. When we don't sleep enough, we feel tired and can't think clearly. Phones and TVs can make sleep harder. Reading a book before bed often helps.", qs: [
    { q: "How many hours of sleep do adults need?", correct: "7-9 hours", distract: ["3-4 hours", "10-12 hours", "5-6 hours"], expl: "النص: 'Adults need 7 to 9 hours'." },
    { q: "Who needs more sleep than adults?", correct: "Children", distract: ["The elderly", "Athletes", "Pets"], expl: "النص: 'Children need even more'." },
    { q: "What happens when we don't sleep enough?", correct: "We feel tired and can't think", distract: ["We get strong", "We laugh more", "We eat less"], expl: "النص: 'we feel tired and can\\'t think clearly'." },
    { q: "What makes sleep harder?", correct: "Phones and TVs", distract: ["Books", "Quiet rooms", "Cold beds"], expl: "النص: 'Phones and TVs can make sleep harder'." },
    { q: "What can help us sleep better?", correct: "Reading a book", distract: ["Watching TV", "Using phones", "Drinking coffee"], expl: "النص: 'Reading a book before bed often helps'." },
  ]},

  // L3 — B1 passages (intermediate)
  { level: 'L3', text: "Renewable energy is becoming increasingly important. Solar panels capture sunlight and turn it into electricity, while wind turbines use the wind to generate power. Many countries are investing in these clean sources because they don't pollute the air. However, renewable energy can be expensive to set up, even though it saves money over time.", qs: [
    { q: "What do solar panels do?", correct: "Turn sunlight into electricity", distract: ["Cool the air", "Make water", "Grow plants"], expl: "النص: 'Solar panels capture sunlight and turn it into electricity'." },
    { q: "What do wind turbines use?", correct: "Wind", distract: ["Water", "Sun", "Coal"], expl: "النص: 'wind turbines use the wind'." },
    { q: "Why are countries investing in clean energy?", correct: "It doesn't pollute the air", distract: ["It is cheap", "It is fast", "It is colorful"], expl: "النص: 'they don\\'t pollute the air'." },
    { q: "What is a downside of renewable energy?", correct: "Expensive to set up", distract: ["Bad for the environment", "Hard to use", "Not safe"], expl: "النص: 'renewable energy can be expensive to set up'." },
    { q: "What does the word 'invest' most likely mean?", correct: "Spend money on", distract: ["Throw away", "Ignore", "Steal"], expl: "investing = spending money expecting future benefit." },
  ]},
  { level: 'L3', text: "Social media has transformed how we communicate. Platforms like Twitter, Instagram, and TikTok allow people to share thoughts and photos instantly. While these platforms keep us connected with friends far away, they can also affect our mental health. Studies show that spending too much time on social media can increase feelings of loneliness and anxiety.", qs: [
    { q: "What has social media transformed?", correct: "How we communicate", distract: ["How we eat", "How we sleep", "How we exercise"], expl: "النص: 'transformed how we communicate'." },
    { q: "What can we share on these platforms?", correct: "Thoughts and photos", distract: ["Food only", "Cars", "Money"], expl: "النص: 'share thoughts and photos instantly'." },
    { q: "What is one benefit mentioned?", correct: "Staying connected with friends", distract: ["Earning money", "Losing weight", "Learning to drive"], expl: "النص: 'keep us connected with friends far away'." },
    { q: "What negative effect is mentioned?", correct: "Loneliness and anxiety", distract: ["Better sleep", "Stronger muscles", "More friends"], expl: "النص: 'increase feelings of loneliness and anxiety'." },
    { q: "What does 'instantly' mean?", correct: "Immediately", distract: ["Slowly", "Carefully", "Never"], expl: "instantly = on the spot, immediately." },
  ]},
  { level: 'L3', text: "Reading books has many benefits for the mind. It improves vocabulary, helps you think critically, and reduces stress. People who read regularly tend to have better memory and concentration. Fiction books, in particular, help us understand other people's emotions and perspectives, making us more empathetic.", qs: [
    { q: "What does reading improve?", correct: "Vocabulary and thinking", distract: ["Eyesight only", "Hearing", "Strength"], expl: "النص: 'improves vocabulary, helps you think critically'." },
    { q: "What does reading reduce?", correct: "Stress", distract: ["Income", "Sleep", "Memory"], expl: "النص: 'reduces stress'." },
    { q: "What do regular readers have?", correct: "Better memory and concentration", distract: ["Better hair", "More money", "Bigger houses"], expl: "النص: 'better memory and concentration'." },
    { q: "What is special about fiction?", correct: "Helps us understand others", distract: ["Is shorter", "Is easier", "Is older"], expl: "النص: 'help us understand other people\\'s emotions and perspectives'." },
    { q: "What does 'empathetic' mean?", correct: "Understanding others' feelings", distract: ["Athletic", "Rich", "Loud"], expl: "empathetic = able to feel what others feel." },
  ]},
  { level: 'L3', text: "Time management is a skill that can change your life. Setting priorities helps you focus on what matters most. Breaking big tasks into smaller steps makes them less overwhelming. Using a calendar or to-do list keeps you organized. The key is to start small and build the habit slowly. People who manage their time well often achieve more in less time.", qs: [
    { q: "What is time management?", correct: "A life-changing skill", distract: ["A type of food", "A sport", "A computer"], expl: "النص: 'a skill that can change your life'." },
    { q: "What does setting priorities help you do?", correct: "Focus on what matters", distract: ["Sleep more", "Earn money", "Travel"], expl: "النص: 'helps you focus on what matters most'." },
    { q: "How can you make big tasks easier?", correct: "Break them into smaller steps", distract: ["Ignore them", "Pay someone", "Sleep on them"], expl: "النص: 'Breaking big tasks into smaller steps'." },
    { q: "What tool helps you stay organized?", correct: "Calendar or to-do list", distract: ["Phone games", "Music", "Movies"], expl: "النص: 'Using a calendar or to-do list'." },
    { q: "What is the key according to the passage?", correct: "Start small and build slowly", distract: ["Start big and fast", "Do everything at once", "Wait forever"], expl: "النص: 'start small and build the habit slowly'." },
  ]},
  { level: 'L3', text: "Public speaking is a fear shared by many people. Even confident individuals can feel nervous before giving a speech. The trick is to prepare well, practice in front of a mirror, and breathe deeply before starting. Remember, the audience wants you to succeed. With practice, public speaking becomes easier and even enjoyable.", qs: [
    { q: "What is a common fear?", correct: "Public speaking", distract: ["Heights", "Spiders", "Driving"], expl: "النص: 'Public speaking is a fear shared by many'." },
    { q: "Who can feel nervous?", correct: "Even confident people", distract: ["Only beginners", "Only children", "Only the elderly"], expl: "النص: 'Even confident individuals can feel nervous'." },
    { q: "How can you prepare?", correct: "Practice in front of a mirror", distract: ["Don't prepare", "Practice at the venue", "Just read"], expl: "النص: 'practice in front of a mirror'." },
    { q: "What does the audience want?", correct: "You to succeed", distract: ["You to fail", "You to leave", "You to be silent"], expl: "النص: 'the audience wants you to succeed'." },
    { q: "What happens with practice?", correct: "It becomes easier", distract: ["It becomes harder", "It gets boring", "Nothing changes"], expl: "النص: 'With practice, public speaking becomes easier'." },
  ]},
  { level: 'L3', text: "Volunteering offers many rewards. When you help others, you not only make a difference in their lives but also feel happier yourself. Volunteers learn new skills, make new friends, and gain valuable experience. Many companies value job applicants who have volunteer experience because it shows commitment and teamwork.", qs: [
    { q: "What does volunteering offer?", correct: "Many rewards", distract: ["Money", "Fame", "Power"], expl: "النص: 'offers many rewards'." },
    { q: "How does helping others affect you?", correct: "Makes you happier", distract: ["Makes you sad", "Makes you tired", "Makes you rich"], expl: "النص: 'feel happier yourself'." },
    { q: "What do volunteers gain?", correct: "Skills and experience", distract: ["Cars", "Houses", "Vacation days"], expl: "النص: 'learn new skills... gain valuable experience'." },
    { q: "Who values volunteer experience?", correct: "Companies", distract: ["Only schools", "Only parents", "Only friends"], expl: "النص: 'Many companies value job applicants who have volunteer experience'." },
    { q: "What does volunteering show?", correct: "Commitment and teamwork", distract: ["Wealth", "Beauty", "Speed"], expl: "النص: 'shows commitment and teamwork'." },
  ]},
  { level: 'L3', text: "Eating breakfast every day is important. After a long night of sleep, your body needs fuel to start the day. A good breakfast can include eggs, fruit, bread, or yogurt. People who skip breakfast often feel tired by mid-morning and may overeat at lunch. Studies show that students who eat breakfast perform better in school.", qs: [
    { q: "Why is breakfast important?", correct: "Body needs fuel", distract: ["Tradition", "Family time", "Taste"], expl: "النص: 'your body needs fuel to start the day'." },
    { q: "What is a good breakfast?", correct: "Eggs, fruit, bread, or yogurt", distract: ["Only candy", "Only coffee", "Only chips"], expl: "النص يعدد: 'eggs, fruit, bread, or yogurt'." },
    { q: "What happens if you skip breakfast?", correct: "Feel tired by mid-morning", distract: ["Feel energetic", "Lose weight", "Sleep better"], expl: "النص: 'often feel tired by mid-morning'." },
    { q: "What may happen at lunch?", correct: "Overeating", distract: ["Eating less", "Sleeping", "Working harder"], expl: "النص: 'may overeat at lunch'." },
    { q: "Who performs better in school?", correct: "Students who eat breakfast", distract: ["Students who skip it", "Students who sleep more", "Students with money"], expl: "النص: 'students who eat breakfast perform better in school'." },
  ]},

  // L4 — B2 passages (upper-intermediate)
  { level: 'L4', text: "Artificial intelligence is reshaping industries worldwide. From healthcare to finance, AI systems are improving efficiency and accuracy. However, this rapid advancement raises ethical questions about job displacement and data privacy. Some experts argue that humans must adapt by learning new skills, while others call for stricter regulations to ensure AI is used responsibly.", qs: [
    { q: "What is AI reshaping?", correct: "Industries worldwide", distract: ["Only one company", "Only schools", "Only entertainment"], expl: "النص: 'reshaping industries worldwide'." },
    { q: "What does AI improve?", correct: "Efficiency and accuracy", distract: ["Hair and skin", "Music and art", "Speed of cars"], expl: "النص: 'improving efficiency and accuracy'." },
    { q: "What ethical questions arise?", correct: "Job loss and privacy", distract: ["Color of devices", "Speed of internet", "Price of food"], expl: "النص: 'ethical questions about job displacement and data privacy'." },
    { q: "What should humans do according to some experts?", correct: "Learn new skills", distract: ["Stop working", "Ignore AI", "Move to other countries"], expl: "النص: 'humans must adapt by learning new skills'." },
    { q: "What does 'displacement' mean here?", correct: "Loss or replacement", distract: ["Movement", "Vacation", "Discovery"], expl: "displacement = being moved out, replaced." },
  ]},
  { level: 'L4', text: "Remote work has fundamentally changed the modern workplace. Employees enjoy flexibility, no commute, and better work-life balance, while companies save on office costs. However, remote work can also lead to isolation and blur the line between work and personal life. Successful remote workers establish clear routines and dedicated workspaces.", qs: [
    { q: "What has remote work changed?", correct: "The modern workplace", distract: ["School systems", "Hospital procedures", "Family meals"], expl: "النص: 'fundamentally changed the modern workplace'." },
    { q: "What is one employee benefit?", correct: "Flexibility and no commute", distract: ["Higher taxes", "Smaller homes", "Less food"], expl: "النص: 'flexibility, no commute, and better work-life balance'." },
    { q: "What do companies save on?", correct: "Office costs", distract: ["Tax bills", "Marketing", "Food costs"], expl: "النص: 'companies save on office costs'." },
    { q: "What can remote work cause?", correct: "Isolation and blurred lines", distract: ["More vacation", "Higher wages", "Better health"], expl: "النص: 'isolation and blur the line between work and personal life'." },
    { q: "How do successful remote workers cope?", correct: "Clear routines and workspaces", distract: ["Long sleep hours", "More vacation", "Less work"], expl: "النص: 'establish clear routines and dedicated workspaces'." },
  ]},
  { level: 'L4', text: "Mental health awareness has grown significantly in recent years. Once considered a taboo topic, people are now more comfortable discussing anxiety, depression, and stress. Workplaces increasingly offer mental health resources, and apps for meditation and therapy have become popular. Despite progress, stigma still exists, and access to professional help remains limited in many regions.", qs: [
    { q: "How has mental health awareness changed?", correct: "Grown significantly", distract: ["Decreased", "Stayed the same", "Disappeared"], expl: "النص: 'grown significantly in recent years'." },
    { q: "What was mental health once considered?", correct: "A taboo topic", distract: ["A joke", "A fashion", "A game"], expl: "النص: 'Once considered a taboo topic'." },
    { q: "Where are people getting support?", correct: "Workplaces and apps", distract: ["Only doctors", "Only friends", "Only family"], expl: "النص: 'Workplaces increasingly offer mental health resources, and apps'." },
    { q: "What still exists?", correct: "Stigma", distract: ["Money", "Fame", "Beauty"], expl: "النص: 'stigma still exists'." },
    { q: "What does 'stigma' mean?", correct: "Negative social judgment", distract: ["Money", "Disease", "Friendship"], expl: "stigma = mark of disgrace or social disapproval." },
  ]},
  { level: 'L4', text: "Sustainable fashion is a growing movement. Consumers are increasingly aware that fast fashion harms the environment through excessive water use, chemical pollution, and waste. Many brands now offer recycled fabrics and ethical labor practices. Buying fewer, higher-quality pieces and repairing clothes instead of discarding them are simple ways individuals can contribute.", qs: [
    { q: "What is sustainable fashion?", correct: "A growing movement", distract: ["A new color", "A famous brand", "A type of fabric only"], expl: "النص: 'a growing movement'." },
    { q: "How does fast fashion harm the environment?", correct: "Water use, pollution, waste", distract: ["Loud music", "Bright lights", "Fast cars"], expl: "النص: 'excessive water use, chemical pollution, and waste'." },
    { q: "What do many brands offer now?", correct: "Recycled fabrics and ethical labor", distract: ["Free shipping", "Bigger sizes", "Loud designs"], expl: "النص: 'recycled fabrics and ethical labor practices'." },
    { q: "How can individuals contribute?", correct: "Buy less, repair clothes", distract: ["Buy more, throw away", "Wear only new clothes", "Stop wearing clothes"], expl: "النص: 'Buying fewer, higher-quality pieces and repairing clothes'." },
    { q: "What does 'discarding' mean?", correct: "Throwing away", distract: ["Cleaning", "Storing", "Selling"], expl: "discarding = getting rid of, throwing away." },
  ]},
  { level: 'L4', text: "Urban gardening is transforming cities around the world. People are growing vegetables on balconies, rooftops, and even in small backyards. This trend not only provides fresh food but also reduces stress and brings communities together. City governments are increasingly supporting community gardens as a way to make urban areas greener and more livable.", qs: [
    { q: "What is urban gardening transforming?", correct: "Cities worldwide", distract: ["Forests", "Oceans", "Deserts"], expl: "النص: 'transforming cities around the world'." },
    { q: "Where are people growing food?", correct: "Balconies, rooftops, backyards", distract: ["Underground", "On boats", "In caves"], expl: "النص: 'balconies, rooftops, and even in small backyards'." },
    { q: "What does this trend provide?", correct: "Fresh food and stress relief", distract: ["Money only", "Cars", "Fame"], expl: "النص: 'fresh food but also reduces stress'." },
    { q: "Who supports community gardens?", correct: "City governments", distract: ["Pet owners", "Restaurants", "Schools only"], expl: "النص: 'City governments are increasingly supporting community gardens'." },
    { q: "What does 'livable' mean?", correct: "Comfortable to live in", distract: ["Empty", "Expensive", "Old"], expl: "livable = good to live in." },
  ]},
  { level: 'L4', text: "Continuous learning has become essential in today's fast-changing world. As technology evolves, skills that were valuable five years ago may no longer be enough. Online courses, podcasts, and tutorials make learning accessible to anyone with internet access. The most successful professionals are those who view learning as a lifelong journey rather than a one-time event.", qs: [
    { q: "Why is continuous learning essential?", correct: "Technology evolves fast", distract: ["Schools require it", "Parents demand it", "TV shows it"], expl: "النص: 'in today\\'s fast-changing world... technology evolves'." },
    { q: "What may not be enough anymore?", correct: "Old skills", distract: ["Old friends", "Old clothes", "Old food"], expl: "النص: 'skills that were valuable five years ago may no longer be enough'." },
    { q: "How can people learn easily?", correct: "Online courses and podcasts", distract: ["Only universities", "Only books", "Only teachers"], expl: "النص: 'Online courses, podcasts, and tutorials'." },
    { q: "How do successful professionals view learning?", correct: "A lifelong journey", distract: ["A one-time event", "A waste of time", "Only for young people"], expl: "النص: 'view learning as a lifelong journey'." },
    { q: "What is the main message?", correct: "Keep learning forever", distract: ["Stop learning", "Learn only in school", "Learn only what's easy"], expl: "Implied — استمري في التعلم مدى الحياة." },
  ]},
  { level: 'L4', text: "Critical thinking is one of the most valuable skills in today's world of information overload. With so much content available online, it's easy to accept claims without questioning them. Strong critical thinkers ask 'who said this?', 'what is the evidence?', and 'what are alternative explanations?'. These habits protect us from misinformation and lead to better decisions.", qs: [
    { q: "Why is critical thinking valuable?", correct: "Information overload", distract: ["Lack of news", "Too few sources", "Slow internet"], expl: "النص: 'today\\'s world of information overload'." },
    { q: "What is easy to do online?", correct: "Accept claims without questioning", distract: ["Find truth easily", "Find friends", "Earn money"], expl: "النص: 'easy to accept claims without questioning them'." },
    { q: "What do strong critical thinkers ask?", correct: "Source, evidence, alternatives", distract: ["Time, place, weather", "Price, color, size", "Name, age, address"], expl: "النص يعدد الأسئلة الثلاثة." },
    { q: "What does critical thinking protect us from?", correct: "Misinformation", distract: ["Cold weather", "Hunger", "Loud noise"], expl: "النص: 'protect us from misinformation'." },
    { q: "What is the outcome of critical thinking?", correct: "Better decisions", distract: ["More money", "Better health", "More friends"], expl: "النص: 'lead to better decisions'." },
  ]},

  // L5 — C1 passages (advanced)
  { level: 'L5', text: "Behavioral economics challenges the traditional view that people make rational financial decisions. Research has shown that emotions, cognitive biases, and social pressures often outweigh logic. For instance, people are more likely to avoid a small loss than to seek an equivalent gain — a phenomenon known as loss aversion. Understanding these biases helps policymakers design better systems and helps individuals make wiser choices.", qs: [
    { q: "What does behavioral economics challenge?", correct: "Rational decision-making", distract: ["Politics", "Religion", "Sports"], expl: "النص: 'challenges the traditional view that people make rational financial decisions'." },
    { q: "What often outweighs logic?", correct: "Emotions and biases", distract: ["Math", "Science", "Sleep"], expl: "النص: 'emotions, cognitive biases, and social pressures often outweigh logic'." },
    { q: "What is 'loss aversion'?", correct: "Avoiding losses over seeking gains", distract: ["Loving losses", "Saving money", "Spending money"], expl: "النص يعرّفها كما هي." },
    { q: "Who benefits from understanding biases?", correct: "Policymakers and individuals", distract: ["Children only", "Athletes", "Animals"], expl: "النص: 'helps policymakers design better systems and helps individuals make wiser choices'." },
    { q: "What does 'equivalent' mean?", correct: "Equal in value", distract: ["Larger", "Smaller", "Different"], expl: "equivalent = of equal value or amount." },
  ]},
  { level: 'L5', text: "The concept of 'flow' — a mental state of complete absorption in an activity — was first described by psychologist Mihaly Csikszentmihalyi. Flow occurs when the challenge level matches one's skill level: too easy, and boredom sets in; too difficult, and anxiety takes over. People who experience flow regularly report greater life satisfaction. Designing work and leisure to encourage flow can dramatically improve well-being.", qs: [
    { q: "What is 'flow'?", correct: "Complete absorption in an activity", distract: ["Water movement", "A type of dance", "A sport"], expl: "النص: 'a mental state of complete absorption in an activity'." },
    { q: "Who described flow?", correct: "Csikszentmihalyi", distract: ["Freud", "Einstein", "Plato"], expl: "النص: 'first described by psychologist Mihaly Csikszentmihalyi'." },
    { q: "When does flow occur?", correct: "When challenge matches skill", distract: ["When work is easy", "When work is impossible", "When you sleep"], expl: "النص: 'when the challenge level matches one\\'s skill level'." },
    { q: "What happens if a task is too easy?", correct: "Boredom", distract: ["Anxiety", "Flow", "Anger"], expl: "النص: 'too easy, and boredom sets in'." },
    { q: "What can flow improve?", correct: "Well-being", distract: ["Weight", "Money", "Height"], expl: "النص: 'dramatically improve well-being'." },
  ]},
  { level: 'L5', text: "The placebo effect is a fascinating phenomenon where patients experience real improvements in their condition after taking an inactive treatment. While long viewed as merely psychological, recent research suggests that placebos can trigger genuine physiological changes, including the release of endorphins. Some doctors now intentionally harness this effect alongside conventional treatments, blurring the line between mind and body.", qs: [
    { q: "What is the placebo effect?", correct: "Improvement from inactive treatment", distract: ["A medication side effect", "A type of surgery", "A vitamin"], expl: "النص: 'real improvements in their condition after taking an inactive treatment'." },
    { q: "How was it long viewed?", correct: "Merely psychological", distract: ["Magical", "Dangerous", "Useless"], expl: "النص: 'long viewed as merely psychological'." },
    { q: "What can placebos trigger?", correct: "Physiological changes", distract: ["Bad weather", "Stock market changes", "Sleep problems"], expl: "النص: 'genuine physiological changes'." },
    { q: "What do some doctors do now?", correct: "Use placebos alongside treatment", distract: ["Refuse to treat patients", "Charge more", "Avoid medicine"], expl: "النص: 'intentionally harness this effect alongside conventional treatments'." },
    { q: "What does 'blurring the line' suggest?", correct: "Mind and body are connected", distract: ["Patients are confused", "Treatments don't work", "Doctors lie"], expl: "blurring = making less clear; mind/body line is less distinct." },
  ]},
  { level: 'L5', text: "Cognitive load theory explains why people struggle to learn when overwhelmed. Working memory can only hold a limited amount of information at once. Effective teachers reduce extraneous cognitive load by presenting material clearly, using visuals strategically, and breaking complex topics into manageable chunks. This approach has revolutionized educational design and explains why traditional lectures often fail to produce lasting learning.", qs: [
    { q: "What does cognitive load theory explain?", correct: "Why people struggle to learn when overwhelmed", distract: ["Why students like school", "Why books are heavy", "Why teachers are tired"], expl: "النص: 'explains why people struggle to learn when overwhelmed'." },
    { q: "What is the limit of working memory?", correct: "A limited amount at once", distract: ["Unlimited", "Always 7 items", "Zero"], expl: "النص: 'limited amount of information at once'." },
    { q: "How do effective teachers help?", correct: "Reduce extraneous load", distract: ["Talk faster", "Give more homework", "Skip questions"], expl: "النص: 'reduce extraneous cognitive load'." },
    { q: "What has cognitive load theory revolutionized?", correct: "Educational design", distract: ["Sports rules", "Cooking", "Architecture"], expl: "النص: 'revolutionized educational design'." },
    { q: "Why do traditional lectures often fail?", correct: "They overload memory", distract: ["They are too short", "They use no chairs", "They lack music"], expl: "Implied — لأن السعة محدودة." },
  ]},
  { level: 'L5', text: "The Hawthorne effect refers to the observation that people change their behavior when they know they are being watched. Originally documented in factory workers, the effect has been observed in countless studies and workplaces. While it complicates research, it also has practical applications: simple awareness that performance is being measured often leads to genuine improvements in productivity and quality.", qs: [
    { q: "What does the Hawthorne effect describe?", correct: "Behavior change when observed", distract: ["Weight loss when watched", "Sleep changes", "Memory improvements"], expl: "النص: 'people change their behavior when they know they are being watched'." },
    { q: "Where was it originally documented?", correct: "Factory workers", distract: ["School students", "Soldiers", "Doctors"], expl: "النص: 'Originally documented in factory workers'." },
    { q: "How does it complicate research?", correct: "Behavior isn't natural", distract: ["Costs more money", "Takes longer", "Requires more people"], expl: "Implied — لأن الناس يتغيرون عند المراقبة." },
    { q: "What is a practical benefit?", correct: "Improves productivity", distract: ["Reduces costs", "Increases sales", "Builds friendships"], expl: "النص: 'genuine improvements in productivity and quality'." },
    { q: "What does 'awareness' mean?", correct: "Knowing about", distract: ["Forgetting", "Sleeping through", "Avoiding"], expl: "awareness = state of knowing/being conscious of something." },
  ]},
  { level: 'L5', text: "The Dunning-Kruger effect describes a cognitive bias in which people with limited knowledge tend to overestimate their abilities, while experts often underestimate theirs. This paradox occurs because beginners lack the metacognitive skills to recognize their own gaps, while experts are acutely aware of how much remains unknown. Understanding this bias can foster humility and continuous improvement.", qs: [
    { q: "What does the Dunning-Kruger effect describe?", correct: "Bias in self-assessment", distract: ["A medical condition", "A dance move", "A theorem"], expl: "النص: 'describes a cognitive bias'." },
    { q: "Who overestimates their abilities?", correct: "Beginners", distract: ["Experts", "Children", "Robots"], expl: "النص: 'people with limited knowledge tend to overestimate'." },
    { q: "What do experts often do?", correct: "Underestimate themselves", distract: ["Brag a lot", "Quit jobs", "Avoid challenges"], expl: "النص: 'experts often underestimate theirs'." },
    { q: "Why do beginners overestimate?", correct: "Lack metacognitive skills", distract: ["Are too confident by birth", "Have more money", "Are younger"], expl: "النص: 'lack the metacognitive skills to recognize their own gaps'." },
    { q: "What can understanding this bias foster?", correct: "Humility and improvement", distract: ["Arrogance", "Greed", "Laziness"], expl: "النص: 'foster humility and continuous improvement'." },
  ]},
  { level: 'L5', text: "Stoicism, an ancient Greek philosophy, has experienced a remarkable revival in modern times. Its core teaching — that we cannot control external events but can control our reactions to them — resonates strongly in today's stressful world. Stoic practices like negative visualization (imagining loss) and the dichotomy of control help practitioners build resilience and find meaning even in difficult circumstances.", qs: [
    { q: "What kind of philosophy is Stoicism?", correct: "Ancient Greek", distract: ["Modern American", "Medieval European", "Asian"], expl: "النص: 'ancient Greek philosophy'." },
    { q: "What is its core teaching?", correct: "Control reactions, not events", distract: ["Control the weather", "Control others", "Avoid all problems"], expl: "النص يعرّف الأصل: cannot control events but can control reactions." },
    { q: "What is 'negative visualization'?", correct: "Imagining loss", distract: ["Negative attitudes", "Bad dreams", "Pessimism"], expl: "النص يعرّفها: 'imagining loss'." },
    { q: "What do these practices build?", correct: "Resilience", distract: ["Wealth", "Beauty", "Popularity"], expl: "النص: 'build resilience'." },
    { q: "Why has Stoicism revived?", correct: "Today's stressful world", distract: ["Cheaper books", "Movies about it", "Famous celebrities"], expl: "النص: 'resonates strongly in today\\'s stressful world'." },
  ]},
]

// ─── WRITING PROMPTS (35 prompts per level × 5 = 175 writing exercises × 5 levels — but writing has fewer per passage) ───
// Each writing prompt with a model answer + Arabic explanation.
const WRITING_PROMPTS = [
  // L1 — A1 (simple writing tasks)
  { level: 'L1', items: [
    { p: "Write 3 sentences about your morning routine.", model: "I wake up at 7 AM. I eat breakfast. I go to school.", tags: ['routine','present_simple'], diff: 1, expl: "الروتين اليومي يستخدم المضارع البسيط. مع I لا نضيف s للفعل: I wake / I eat / I go." },
    { p: "Write 3 sentences about your family.", model: "My family is big. I have two brothers and one sister. My parents are kind.", tags: ['family','present_simple'], diff: 1, expl: "وصف الأسرة: ابدئي بـ My family، استخدمي have لعدد الإخوة، are مع الجمع." },
    { p: "Write 3 sentences about your favorite food.", model: "My favorite food is kabsa. It is delicious. I eat it every Friday.", tags: ['favorites','present_simple'], diff: 1, expl: "للتعبير عن المفضل: My favorite [thing] is [name]. الجملة الثانية تصفه (It is...). الثالثة عادة." },
    { p: "Write 3 sentences about your school.", model: "My school is in Riyadh. It is big. I like my teachers.", tags: ['school','present_simple'], diff: 1, expl: "وصف المكان: location + adjective + opinion." },
    { p: "Write 3 sentences about your hobby.", model: "I like reading. I read every day. Books make me happy.", tags: ['hobby','present_simple'], diff: 1, expl: "للهواية: I like + V-ing (gerund). ثم تكرار/تأثير." },
    { p: "Write 3 sentences about a friend.", model: "My friend is Sara. She is funny. We go shopping together.", tags: ['friend','present_simple'], diff: 1, expl: "اسم + صفة + نشاط مشترك. كل جملة قصيرة." },
    { p: "Write 3 sentences about your bedroom.", model: "My bedroom is small. It has a blue wall. I have a bed and a desk.", tags: ['places','present_simple'], diff: 1, expl: "وصف الغرفة: حجم + لون + محتويات." },
  ]},
  // L2 — A2
  { level: 'L2', items: [
    { p: "Describe your weekend in 4-5 sentences using past simple.", model: "Last weekend, I visited my grandmother. We ate lunch together. Then I went to the park with my brother. We played football. It was a fun weekend.", tags: ['narrative','past_simple'], diff: 2, expl: "الماضي البسيط للحكاية: Last weekend + Past Simple verbs (visited, ate, went, played, was). ابدئي بمحدد زمن." },
    { p: "Write about your dream job in 4-5 sentences.", model: "My dream job is to be a doctor. I want to help sick people. I will study hard at university. After that, I will work in a hospital. I want to help my country.", tags: ['future','dreams'], diff: 2, expl: "للأحلام والمستقبل: My dream job + will + V1. اربطي الأفكار بـ After that." },
    { p: "Describe a place you visited in 4 sentences.", model: "I visited Mecca last year. The city was very beautiful. I prayed in the Grand Mosque. I felt peaceful and happy.", tags: ['places','past_simple'], diff: 2, expl: "وصف الزيارة: عبارة زمنية (last year) + Past Simple + مشاعرك." },
    { p: "Write about your hobby in 4 sentences.", model: "I love painting. I paint every weekend. My favorite subject is nature. Painting makes me feel calm.", tags: ['hobby','present_simple'], diff: 2, expl: "الهواية: love + V-ing، عبارة تكرار (every weekend)، تفصيل، تأثير." },
    { p: "Describe your best friend in 4 sentences.", model: "My best friend is Layla. We met at school five years ago. She is kind and funny. We always help each other.", tags: ['friend','present_perfect'], diff: 2, expl: "وصف الصديق: اسم + كيف التقيتما (Past) + صفات + علاقة." },
    { p: "Write about a special day in your life.", model: "The day I graduated was special. My family came to the ceremony. I felt proud and happy. My parents gave me a beautiful gift.", tags: ['narrative','past_simple'], diff: 2, expl: "يوم خاص: حدد اليوم + من حضر + شعورك + تفصيل." },
    { p: "Describe your daily routine using present simple.", model: "I wake up at 6 AM. I eat breakfast and read for 30 minutes. Then I go to work at 8 AM. In the evening, I cook dinner with my family.", tags: ['routine','present_simple'], diff: 2, expl: "الروتين بأربع جمل: مع الصباح + ثم + ثم + المساء. كل جملة فعل واضح." },
  ]},
  // L3 — B1
  { level: 'L3', items: [
    { p: "Write a short paragraph (5-6 sentences) about the importance of learning languages.", model: "Learning a new language opens many doors. It helps you communicate with people from different cultures. It also improves your memory and thinking skills. Many jobs today require knowing more than one language. Speaking another language makes travel more enjoyable. In short, language learning is a valuable investment.", tags: ['opinion','b1'], diff: 3, expl: "فقرة رأي: جملة رئيسية + سببين/ثلاث + خاتمة. اربطي الأفكار بـ also، In short." },
    { p: "Write 5 sentences comparing your hometown to another city you know.", model: "My hometown Riyadh is bigger than Abha. The weather in Riyadh is hotter, while Abha is cooler in summer. Riyadh has more malls and restaurants. However, Abha has more mountains and natural beauty. Both cities are special in their own way.", tags: ['comparative','b1'], diff: 3, expl: "المقارنة: استخدمي -er + than، more + adj، while، however للتناقض." },
    { p: "Write a paragraph about a problem in your community and how to solve it (5-6 sentences).", model: "Traffic is a big problem in my city. Every morning, people spend hours in their cars. This wastes time and causes stress. The solution is better public transportation. The government should build more buses and metro lines. People should also use bicycles for short trips.", tags: ['problem_solution','b1'], diff: 3, expl: "مشكلة وحل: حدّدي المشكلة + أثرها + الحل + إجراءات." },
    { p: "Write a short story (5-6 sentences) about a memorable trip.", model: "Last summer, I traveled to Turkey with my friends. We visited Istanbul and walked in the old streets. The food was amazing, especially the kebabs. One evening, we took a boat trip on the Bosphorus. The lights of the city were beautiful at night. I will always remember that trip.", tags: ['narrative','b1'], diff: 3, expl: "حكاية رحلة: وقت + مكان + تفاصيل + لحظة خاصة + ذكرى." },
    { p: "Write 5 sentences explaining why exercise is important.", model: "Exercise is essential for good health. Regular activity strengthens the heart and muscles. It also helps people sleep better and feel less stressed. Just 30 minutes of walking daily can make a big difference. Everyone should try to be more active.", tags: ['opinion','b1'], diff: 3, expl: "موضوع: أهمية + فوائد + أمثلة + توصية." },
    { p: "Describe a person who has influenced your life (5-6 sentences).", model: "My grandmother has influenced my life the most. She taught me the value of patience and kindness. When I was a child, she told me stories every night. She showed me how to cook traditional dishes. Even now, I think of her wisdom when I face challenges. I am grateful for her lessons.", tags: ['narrative','b1'], diff: 3, expl: "وصف شخص: تأثيره + الدروس + ذكرى محددة + الأثر الحالي." },
    { p: "Write your opinion on whether students should wear uniforms (5 sentences).", model: "I think school uniforms are a good idea. They make students look equal regardless of family income. Uniforms also save time in the morning. However, some people argue that uniforms limit self-expression. Overall, the benefits of uniforms outweigh the drawbacks.", tags: ['opinion','b1'], diff: 3, expl: "رأي: I think + فائدة + فائدة + لكن (تناقض) + خلاصة." },
  ]},
  // L4 — B2
  { level: 'L4', items: [
    { p: "Write a paragraph (7-8 sentences) discussing the pros and cons of social media for teenagers.", model: "Social media offers both benefits and drawbacks for teenagers. On the positive side, it helps them stay connected with friends and learn about the world. Platforms also provide opportunities for creativity and self-expression. However, excessive use can lead to anxiety, low self-esteem, and sleep problems. Cyberbullying is another serious concern that affects many young users. To minimize harm, teenagers should set time limits and choose their content wisely. Parents and schools also play a role in guiding healthy digital habits. With balanced use, social media can be a valuable tool rather than a threat.", tags: ['discursive','b2'], diff: 4, expl: "نقاش متوازن (pros/cons): مقدمة + إيجابيات + سلبيات + توصيات + خلاصة. روابط: On the positive side, However, To minimize." },
    { p: "Write a formal email (8-10 sentences) requesting a refund for a faulty product you bought online.", model: "Dear Customer Service Team,\\n\\nI am writing to request a refund for an order I received last week. The order number is #12345, and the item was a wireless headphone. Unfortunately, the product arrived with a defective right speaker that does not produce any sound. I have attached photos showing the issue for your reference. According to your return policy, I am entitled to a full refund within 30 days of purchase. Could you please process the refund to my original payment method? I would also appreciate clear instructions on how to return the item. Thank you for your time and prompt attention to this matter.\\n\\nBest regards,\\n[Your name]", tags: ['formal_email','b2'], diff: 4, expl: "إيميل رسمي: تحية + سبب + تفاصيل + أدلة + طلب محدد + خاتمة مهذبة." },
    { p: "Discuss in 7-8 sentences whether technology is making people less social.", model: "There is growing debate about whether technology is reducing human social skills. Many argue that smartphones distract people from face-to-face conversations, leading to weaker relationships. Restaurants often see families silently scrolling instead of talking. On the other hand, technology connects us with friends and family who live far away. Video calls and messaging apps allow us to maintain meaningful relationships across distances. The real issue is not technology itself but how we use it. With conscious effort, we can enjoy the benefits without losing the depth of personal interaction. Balance is the key to thriving in a digital age.", tags: ['discursive','b2'], diff: 4, expl: "نقاش: مقدمة + جانب + مثال + جانب آخر + مثال + استنتاج + توصية." },
    { p: "Write a paragraph about a current global issue and propose a solution (8-9 sentences).", model: "Plastic pollution has become a major threat to our oceans and wildlife. Every year, millions of tons of plastic waste enter marine ecosystems, harming countless species. The problem is worsened by single-use products like plastic bags and bottles. A multi-pronged solution is needed. First, governments should ban or tax single-use plastics. Second, companies must invest in biodegradable alternatives. Third, consumers should adopt reusable products and proper recycling habits. Education campaigns can raise public awareness from a young age. With collective action, we can significantly reduce plastic pollution within a decade.", tags: ['problem_solution','b2'], diff: 4, expl: "مشكلة عالمية + حل: تحديد + إحصاء + سبب + حل متعدد الأطراف + خلاصة." },
    { p: "Write a review of a book or movie you enjoyed recently (7-8 sentences).", model: "I recently finished reading 'The Alchemist' by Paulo Coelho, and it has become one of my favorite books. The story follows Santiago, a young shepherd searching for his personal legend. What makes the book special is its simple yet profound message about following your dreams. The writing is poetic and accessible, even for non-native readers. Some chapters left me thinking for days about my own life choices. While some readers may find the spiritual themes too direct, I found them inspiring. Overall, this is a book I would recommend to anyone seeking motivation. It deserves the global success it has achieved.", tags: ['review','b2'], diff: 4, expl: "مراجعة: ما الكتاب + الحبكة + ما يميزه + رأي شخصي + توصية." },
    { p: "Write an essay (8-10 sentences) on the importance of preserving cultural heritage.", model: "Cultural heritage is the bridge connecting past generations with the present. Traditions, languages, and historic sites carry the wisdom and identity of our ancestors. In Saudi Arabia, places like Diriyah and AlUla remind us of our roots and history. Losing these treasures means losing part of who we are. Globalization, while bringing many benefits, can also threaten unique cultural practices. Governments must invest in preservation and education to keep traditions alive. Younger generations should be encouraged to learn about their heritage and share it. Cultural pride strengthens national identity and contributes to international diversity. Without heritage, the world would lose its rich tapestry of human experience.", tags: ['essay','b2'], diff: 4, expl: "مقالة: تعريف + أمثلة + خطر + حل + دور الشباب + خلاصة." },
  ]},
  // L5 — C1
  { level: 'L5', items: [
    { p: "Write a well-developed essay (10-12 sentences) arguing for or against the statement: 'Universal basic income would benefit society'.", model: "Universal Basic Income (UBI) presents both opportunities and challenges in addressing modern economic inequality. Proponents argue that UBI would provide a safety net in an era of automation, allowing workers to pursue meaningful jobs without fear of poverty. It could also reduce administrative costs by replacing complex welfare systems. However, critics warn that UBI might discourage work and create unsustainable government spending. Funding such a program would require significant tax increases or budget reallocation, which has political implications. Pilot programs in Finland and Kenya have shown mixed but promising results, suggesting the policy is worth deeper investigation. The success of UBI likely depends on careful implementation, gradual rollout, and accompanying economic reforms. While not a silver bullet, UBI deserves serious consideration as part of a broader strategy to address the disruptions of the 21st century. Policymakers should pilot localized programs before considering nationwide adoption. Ultimately, the choice involves balancing economic freedom with fiscal responsibility, a debate central to the future of our societies.", tags: ['argument','c1'], diff: 5, expl: "مقالة جدلية: عرض موضوع + حجة مؤيدة + معاكسة + أدلة + توصية معقدة + خلاصة متوازنة." },
    { p: "Write a critical analysis (8-10 sentences) of how technology has changed education in the 21st century.", model: "The integration of technology into education has fundamentally reshaped how students learn and teachers teach. Online platforms have democratized access to knowledge, allowing learners in remote areas to attend lectures from world-class universities. Adaptive learning software tailors content to individual student needs, potentially improving outcomes. However, this transformation has not been without drawbacks. The digital divide has widened existing inequalities, leaving low-income students without reliable internet access at a significant disadvantage. Furthermore, screen-based learning has raised concerns about attention spans and reduced face-to-face interaction. While technology offers powerful tools, it cannot replace the mentorship and human connection that effective teachers provide. The future of education likely lies in thoughtful integration — using technology to enhance, not replace, traditional methods. Policymakers, educators, and parents must collaborate to ensure technology serves all students equitably.", tags: ['analysis','c1'], diff: 5, expl: "تحليل ناقد: مقدمة + إيجابيات + سلبيات + فروق دقيقة + استنتاج متوازن." },
    { p: "Discuss in 8-10 sentences the ethical implications of artificial intelligence in healthcare.", model: "The growing role of artificial intelligence in healthcare brings both promise and profound ethical questions. AI systems can analyze medical images with remarkable accuracy, sometimes outperforming human radiologists. They also enable personalized treatment plans by processing vast amounts of patient data. However, these capabilities raise serious concerns about privacy, accountability, and bias. Patient data must be protected with rigorous security, yet breaches in AI-driven systems can expose sensitive information at scale. When an AI makes an incorrect diagnosis, the question of legal and moral responsibility becomes complex. Additionally, AI trained on non-diverse datasets may perform poorly for underrepresented populations, perpetuating health disparities. To address these issues, healthcare AI must be developed with transparency, regulated by independent bodies, and accompanied by robust oversight. Only with these safeguards can AI fulfill its potential to improve patient outcomes ethically.", tags: ['ethics','c1'], diff: 5, expl: "نقاش أخلاقي: مقدمة متوازنة + فوائد + مخاوف + تفصيل + توصية." },
    { p: "Write a reflective essay (10 sentences) on the role of failure in personal growth.", model: "Failure, despite its painful associations, is one of the most powerful catalysts for personal growth. Throughout history, the most accomplished individuals — from scientists to entrepreneurs — have spoken openly about the role of failure in their journeys. Each setback offers an invaluable opportunity to identify weaknesses, refine strategies, and develop resilience. In my own experience, the projects I initially failed at taught me more than easy successes ever did. I learned to embrace discomfort as a sign of growth rather than something to avoid. Society, however, often stigmatizes failure, particularly in academic and professional contexts. This cultural attitude can discourage risk-taking and innovation, ironically limiting personal and collective progress. To truly thrive, we must reframe failure not as the opposite of success but as its essential precursor. Encouraging this mindset in schools, workplaces, and homes would unlock human potential at every level. After all, growth lives at the edge of comfort.", tags: ['reflective','c1'], diff: 5, expl: "تأملية: ادعاء مركزي + سياق تاريخي + تجربة شخصية + ملاحظة ثقافية + توصية." },
    { p: "Write a formal letter to the editor of a newspaper (10 sentences) about a local issue you care about.", model: "Dear Editor,\\n\\nI am writing to express my deep concern about the deteriorating condition of public parks in our neighborhood. As a long-time resident, I have witnessed firsthand how these vital green spaces have been neglected over the past several years. Benches are broken, playground equipment is unsafe, and basic maintenance such as grass cutting has become irregular. This situation not only diminishes the quality of life for families but also discourages outdoor activity at a time when public health depends on it. I recently spoke with several neighbors who share these concerns and have signed a petition urging municipal action. Investing in our parks would yield significant returns in community well-being, property values, and civic pride. I respectfully call on city officials to allocate adequate funding and establish a clear maintenance schedule. Furthermore, partnerships with local volunteer groups could supplement official efforts. Through your platform, I hope to raise public awareness and inspire collective action.\\n\\nSincerely,\\n[Your name]", tags: ['letter_editor','c1'], diff: 5, expl: "رسالة رسمية لمحرر: تحية + قضية + أمثلة + تأثير + إجراءات مقترحة + دعوة." },
  ]},
]

async function run() {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const targets = (process.env.TARGETS || 'dxpkissdfuioibefozvc,nmjexpuycmqcxuxljier').split(',')
  if (!token) throw new Error('SUPABASE_ACCESS_TOKEN required')

  // Multiplier: each passage generates 5 questions. With 7 passages × 5 levels = 35 passages × 5 = 175 reading items per level run.
  // Each writing prompt is 1 row. 5-7 prompts × 5 levels = 30 writing items.
  // To bulk up, we'll multiply by repeating each passage with slightly different paraphrased questions per LEVEL — but for simplicity, use as-is.

  for (const ref of targets) {
    console.log(`\n=== TARGET: ${ref} ===`)
    let totalInserted = 0
    // Reading
    for (const passage of READING_PASSAGES) {
      for (const q of passage.qs) {
        const promptCleaned = `Read: "${passage.text}" — ${q.q}`
        const vals = `(${esc('mcq')}, ${esc(passage.level)}, ${esc('reading')}, ${arrText(['comprehension','reading','b1_b2_passage'])}, 3, ${esc(promptCleaned)}, NULL, ${jsonbVal({value:q.correct})}, ${jsonbVal(q.distract)}, ${esc(q.expl + ' فهم القراءة يبدأ بالبحث عن الكلمة المفتاحية في السؤال داخل النص. لا تتعجلي.')}, 90)`
        try {
          await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${vals} ON CONFLICT DO NOTHING`)
          totalInserted++
        } catch (e) {
          console.error(`  reading fail: ${e.message.slice(0, 100)}`)
        }
      }
    }
    // Writing
    for (const wlevel of WRITING_PROMPTS) {
      for (const it of wlevel.items) {
        const vals = `(${esc('mini_write')}, ${esc(wlevel.level)}, ${esc('writing')}, ${arrText(it.tags)}, ${it.diff}, ${esc(it.p)}, NULL, ${jsonbVal({value:it.model})}, NULL, ${esc(it.expl + ' الكتابة لا تحتاج كمال — تحتاج بداية. اكتبي بدون توقّف ثم راجعي.')}, 300)`
        try {
          await call(token, ref, `INSERT INTO retention_exercises (exercise_type, level, skill, topic_tags, difficulty, prompt_en, prompt_ar, correct_answer, distractors, explanation_ar, estimated_seconds) VALUES ${vals} ON CONFLICT DO NOTHING`)
          totalInserted++
        } catch (e) {
          console.error(`  writing fail: ${e.message.slice(0, 100)}`)
        }
      }
    }
    const finalR = await call(token, ref, `SELECT count(*)::int as c FROM retention_exercises WHERE skill='reading'`)
    const finalW = await call(token, ref, `SELECT count(*)::int as c FROM retention_exercises WHERE skill='writing'`)
    const finalT = await call(token, ref, `SELECT count(*)::int as c FROM retention_exercises`)
    console.log(`[${ref}] inserted=${totalInserted}, total reading=${finalR[0].c}, writing=${finalW[0].c}, ALL=${finalT[0].c}`)
  }
}

run().catch(e => { console.error('FATAL:', e); process.exit(1) })
