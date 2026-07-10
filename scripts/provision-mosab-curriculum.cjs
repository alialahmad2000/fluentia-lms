// scripts/provision-mosab-curriculum.cjs
// Builds مصعب's OWN business-major English curriculum (uses_custom_curriculum): 5 owner-scoped units,
// one per university course. Each unit = A2 English content SET in a business/major context (business is the
// VEHICLE, not the subject — we teach English, not business). Masculine Arabic throughout (he is male).
// Per unit: 1 reading (target words *marked*) + 7 comprehension MCQs + target vocabulary + 1 grammar point
// (+3 auto-graded exercises) + 1 writing task + 1 speaking task. Idempotent (skips units already present).
// Mirrors the live curriculum schema exactly (discovered live). Run: node scripts/provision-mosab-curriculum.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const MOSAB_ID  = '4fb98807-526d-4675-adb5-eb938b31b948';
const L2_LEVEL  = 'd3349438-8c8e-46b6-9ee6-e2e01c23229d';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

const wc = (paras) => paras.join(' ').replace(/\*/g, '').split(/\s+/).filter(Boolean).length;
function assertOne(rows, ctx) { if (!rows || rows.length !== 1) throw new Error(`${ctx}: expected 1 row, got ${rows ? rows.length : 'null'}`); }

// ── helpers to build repetitive structures ──
const grammarSections = (explAr, explEn, formula, examples, mistakes) => ({
  sections: [
    { type: 'explanation', content_ar: explAr, content_en: explEn },
    { type: 'formula', content: formula },
    { type: 'examples', items: examples },
    { type: 'common_mistakes', items: mistakes },
  ],
});

// ═══════════════════════════════════════════════════════════════════════════
// THE 5 UNITS
// ═══════════════════════════════════════════════════════════════════════════
const UNITS = [
  // ───────────────────────── UNIT 1 · ENT 325 ─────────────────────────
  {
    sort: 1,
    theme_en: 'A Small Business Dream',
    theme_ar: 'ريادة الأعمال · حلم مشروع صغير',
    desc_ar: 'إنجليزي بسيط عن بدء مشروع صغير: الفكرة، الزبائن، السعر، والربح.',
    why_ar: 'لأن أول خطوة في ريادة الأعمال هي أن تتحدث عن فكرتك بوضوح — وهنا تتعلّم كلمات الإنجليزي التي تحتاجها لذلك.',
    outcomes: ['تقرأ نصاً بسيطاً عن مشروع صغير', 'تتعلّم كلمات: business, customer, profit, price', 'تكتب عن مشروع تحلم به'],
    warmup: ['هل فكرت يوماً في مشروع صغير؟', 'ما المشروع الذي تحب أن تبدأه؟'],
    reading: {
      title_en: 'Omar Opens a Coffee Shop',
      title_ar: 'عمر يفتح محلاً للقهوة',
      paras: [
        "Omar is a young man with a big *idea*. He wants to open a small *business* — a coffee shop near his university. \"Every student needs good coffee,\" he says. \"This is my *idea*, and I believe in it.\"",
        "First, Omar makes a *plan*. He thinks about the *price* of one cup of coffee. If the *cost* of the coffee is low and the *price* is fair, he can make a small *profit*. A *profit* is the money you keep after you pay for everything.",
        "Omar knows that every new *business* is a *risk*. Maybe not many people will come. But he is not afraid. He talks to his first *customer*, a tired student, and he smiles. \"When you *sell* something good, people come back,\" Omar says. Slowly, his small shop begins to *grow*.",
      ],
      skill_en: 'Finding the main idea', skill_ar: 'إيجاد الفكرة الرئيسية',
    },
    questions: [
      ['main_idea', 'What is the main idea of this passage?', 'ما الفكرة الرئيسية للنص؟',
        ['A young man starts a small coffee shop', 'Coffee is bad for students', 'The university is very big', 'Omar is a doctor'],
        'A young man starts a small coffee shop', 'النص كله عن عمر وفكرته في فتح محل قهوة صغير.'],
      ['detail', 'Where does Omar want to open his shop?', 'أين يريد عمر أن يفتح محله؟',
        ['Near his university', 'In another city', 'At the airport', 'In a hospital'],
        'Near his university', 'قال النص إن المحل قرب جامعته.'],
      ['vocabulary', 'What is a "profit"?', 'ما معنى كلمة profit؟',
        ['The money you keep after you pay for everything', 'A cup of coffee', 'A tired student', 'A big city'],
        'The money you keep after you pay for everything', 'الربح هو المال المتبقي بعد دفع كل التكاليف.'],
      ['detail', 'What does Omar make first?', 'ماذا يعمل عمر أولاً؟',
        ['A plan', 'A cake', 'A car', 'A phone'],
        'A plan', 'قال النص: أولاً يضع عمر خطة.'],
      ['inference', 'Why is Omar not afraid of the risk?', 'لماذا لا يخاف عمر من المخاطرة؟',
        ['He believes in his idea', 'He has no money', 'He does not like coffee', 'He wants to sleep'],
        'He believes in his idea', 'عمر واثق ويؤمن بفكرته، لذلك لا يخاف.'],
      ['detail', 'Who is Omar\'s first customer?', 'من أول زبون لعمر؟',
        ['A tired student', 'A teacher', 'A doctor', 'His father'],
        'A tired student', 'قال النص إن أول زبون طالب متعب.'],
      ['inference', 'What helps a business grow, according to Omar?', 'ما الذي يساعد المشروع على النمو حسب عمر؟',
        ['Selling something good so people come back', 'Closing early', 'High prices only', 'A big building'],
        'Selling something good so people come back', 'قال عمر: عندما تبيع شيئاً جيداً يعود الناس إليك.'],
    ],
    // vocab: [word, def_en, def_ar, example, pos, appears]
    vocab: [
      ['business', 'work you do to make and sell things', 'عمل تجاري', 'Omar wants to open a small business.', 'noun', true],
      ['idea', 'a thought or plan in your mind', 'فكرة', 'He believes in his idea.', 'noun', true],
      ['plan', 'what you will do to reach a goal', 'خطة', 'First, Omar makes a plan.', 'noun', true],
      ['price', 'how much money something costs', 'سعر', 'He thinks about the price of one cup.', 'noun', true],
      ['cost', 'the money you pay for something', 'تكلفة', 'The cost of the coffee is low.', 'noun', true],
      ['profit', 'money you keep after you pay costs', 'ربح', 'He can make a small profit.', 'noun', true],
      ['risk', 'a chance that something bad can happen', 'مخاطرة', 'Every new business is a risk.', 'noun', true],
      ['customer', 'a person who buys something', 'زبون / عميل', 'He talks to his first customer.', 'noun', true],
      ['sell', 'to give something for money', 'يبيع', 'When you sell something good, people come back.', 'verb', true],
      ['grow', 'to become bigger', 'ينمو / يكبر', 'His small shop begins to grow.', 'verb', true],
      ['owner', 'a person who has a business', 'مالك / صاحب', 'Omar is the owner of the shop.', 'noun', false],
      ['market', 'a place or group of people who buy', 'سوق', 'There is a big market for coffee near the university.', 'noun', false],
    ],
    grammar: {
      en: 'Present Simple (facts & routines)', ar: 'المضارع البسيط (الحقائق والأمور المعتادة)',
      content: grammarSections(
        'نستخدم المضارع البسيط للحقائق والأمور التي تحدث بشكل معتاد كل يوم. مع he/she/it نضيف s للفعل.',
        "<b>Present Simple</b><br><br>We use the present simple for facts and daily routines.<br>• <i>Omar opens his shop at seven.</i><br>• <i>Customers buy coffee every morning.</i><br><br>With <b>he / she / it</b>, we add <b>-s</b> to the verb: open → open<b>s</b>, sell → sell<b>s</b>.",
        'I / You / We / They + verb<br>He / She / It + verb + <b>s</b>',
        [
          { sentence: 'Omar opens his shop every day.', highlight: 'opens', translation_ar: 'عمر يفتح محله كل يوم.' },
          { sentence: 'Students buy coffee in the morning.', highlight: 'buy', translation_ar: 'الطلاب يشترون القهوة في الصباح.' },
          { sentence: 'The shop sells good coffee.', highlight: 'sells', translation_ar: 'المحل يبيع قهوة جيدة.' },
        ],
        [
          { wrong: 'He open the shop.', correct: 'He opens the shop.', explanation_ar: 'مع he نضيف s للفعل.' },
          { wrong: 'She sell coffee.', correct: 'She sells coffee.', explanation_ar: 'مع she نضيف s للفعل.' },
        ],
      ),
      exercises: [
        { instruction: 'اختر الفعل الصحيح', items: [
          { question: 'Omar ___ his shop at seven every day.', options: ['open', 'opens'], correct_answer: 'opens', explanation_ar: 'مع he/Omar نضيف s.' },
          { question: 'Students ___ coffee every morning.', options: ['buy', 'buys'], correct_answer: 'buy', explanation_ar: 'مع they/students الفعل بدون s.' },
          { question: 'The shop ___ good coffee.', options: ['sell', 'sells'], correct_answer: 'sells', explanation_ar: 'مع it/the shop نضيف s.' },
        ] },
      ],
    },
    writing: {
      title_en: 'A business I would like to start',
      prompt_en: 'Write about a small business you would like to start. What is your idea? Who are your customers? What do you sell, and what is the price?',
      prompt_ar: 'اكتب عن مشروع صغير تحب أن تبدأه. ما فكرتك؟ من هم زبائنك؟ ماذا تبيع، وما السعر؟',
      hints: ['My idea is...', 'My customers are...', 'I sell...', 'The price is...', 'I can make a profit because...'],
      min: 40, max: 90,
    },
    speaking: {
      title_en: 'Talk about a shop you like',
      prompt_en: 'Talk about a shop you like. What does it sell? Why do you like it? What do you usually buy there?',
      prompt_ar: 'تحدث عن محل تحبه. ماذا يبيع؟ لماذا تحبه؟ ماذا تشتري منه عادة؟',
      prep: ['فكّر في محل تزوره كثيراً', 'حضّر كلمات بسيطة: sell, price, buy, customer', 'رتّب أفكارك: ماذا يبيع، ولماذا تحبه'],
      phrases: ['shop', 'sell', 'buy', 'price', 'customer', 'I like it because', 'I usually buy'],
    },
  },

  // ───────────────────────── UNIT 2 · SCM 341 ─────────────────────────
  {
    sort: 2,
    theme_en: 'From the Factory to the Shop',
    theme_ar: 'سلاسل الإمداد · من المصنع إلى المحل',
    desc_ar: 'إنجليزي بسيط عن رحلة المنتج: المورّد، الشاحنة، المستودع، والتوصيل.',
    why_ar: 'كل منتج تشتريه قطع رحلة طويلة. هنا تتعلّم كلمات الإنجليزي التي تصف هذه الرحلة.',
    outcomes: ['تقرأ عن رحلة منتج من المصنع للمحل', 'تتعلّم: supplier, deliver, warehouse, stock', 'تصف كيف يصل منتج إلى محلك'],
    warmup: ['من أين تأتي المنتجات التي تشتريها؟', 'كيف تصل البضائع إلى المحلات؟'],
    reading: {
      title_en: 'How a Bottle of Water Travels',
      title_ar: 'كيف تسافر زجاجة الماء',
      paras: [
        "Every day, thousands of water bottles travel a long way before you buy them. The journey starts at a *factory*. There, a *supplier* fills the bottles and puts them in big boxes.",
        "Next, a *truck* comes to *transport* the boxes. The driver takes them to a large *warehouse*. A *warehouse* is a big building where companies keep their *stock* — all the products they are ready to *deliver*.",
        "When a shop needs water, it sends an *order*. Workers find the boxes in the *warehouse* and *ship* them to the shop. Finally, the water arrives, and the shop puts it on the shelf. Now you can buy it! A small delay at any step can make the *cost* higher, so companies plan every part of the journey with care.",
      ],
      skill_en: 'Understanding sequence', skill_ar: 'فهم التسلسل',
    },
    questions: [
      ['main_idea', 'What is this passage about?', 'عمّ يتحدث هذا النص؟',
        ['How a product travels from the factory to the shop', 'How to drink water', 'How to build a factory', 'A story about a driver'],
        'How a product travels from the factory to the shop', 'النص يصف رحلة المنتج خطوة بخطوة.'],
      ['detail', 'Where does the journey start?', 'أين تبدأ الرحلة؟',
        ['At a factory', 'At a shop', 'At a school', 'At a hospital'],
        'At a factory', 'قال النص إن الرحلة تبدأ في المصنع.'],
      ['vocabulary', 'What is a "warehouse"?', 'ما معنى warehouse؟',
        ['A big building where companies keep their stock', 'A small shop', 'A type of truck', 'A kind of water'],
        'A big building where companies keep their stock', 'المستودع مبنى كبير لحفظ البضائع.'],
      ['detail', 'What comes to transport the boxes?', 'ما الذي يأتي لنقل الصناديق؟',
        ['A truck', 'A plane', 'A boat', 'A bicycle'],
        'A truck', 'قال النص إن شاحنة تأتي لنقل الصناديق.'],
      ['detail', 'What does a shop send when it needs water?', 'ماذا يرسل المحل عندما يحتاج ماء؟',
        ['An order', 'A letter to a friend', 'A truck', 'A worker'],
        'An order', 'قال النص إن المحل يرسل طلباً (order).'],
      ['inference', 'Why do companies plan every step with care?', 'لماذا تخطط الشركات لكل خطوة بعناية؟',
        ['A delay can make the cost higher', 'They like trucks', 'Water is heavy', 'Shops are far'],
        'A delay can make the cost higher', 'قال النص إن أي تأخير يرفع التكلفة.'],
      ['vocabulary', 'What does "deliver" mean?', 'ما معنى deliver؟',
        ['to bring something to a place', 'to drink something', 'to build a shop', 'to close a factory'],
        'to bring something to a place', 'يوصّل = to bring something to a place.'],
    ],
    vocab: [
      ['factory', 'a place where things are made', 'مصنع', 'The journey starts at a factory.', 'noun', true],
      ['supplier', 'a company that gives you products', 'مورّد', 'A supplier fills the bottles.', 'noun', true],
      ['truck', 'a big car that carries products', 'شاحنة', 'A truck comes to transport the boxes.', 'noun', true],
      ['transport', 'to move things from one place to another', 'ينقل', 'A truck comes to transport the boxes.', 'verb', true],
      ['warehouse', 'a big building to keep products', 'مستودع', 'The driver takes them to a warehouse.', 'noun', true],
      ['stock', 'the products a company has ready', 'مخزون', 'Companies keep their stock in the warehouse.', 'noun', true],
      ['deliver', 'to bring something to a place', 'يوصّل / يسلّم', 'They are ready to deliver the products.', 'verb', true],
      ['order', 'a request to buy or bring products', 'طلب / طلبية', 'The shop sends an order.', 'noun', true],
      ['ship', 'to send products to a place', 'يشحن', 'Workers ship the boxes to the shop.', 'verb', true],
      ['cost', 'the money you pay for something', 'تكلفة', 'A delay can make the cost higher.', 'noun', true],
      ['goods', 'things that are made to be sold', 'بضائع / سلع', 'The goods arrive at the shop.', 'noun', false],
      ['delay', 'a time when something is late', 'تأخير', 'A small delay makes the cost higher.', 'noun', false],
    ],
    grammar: {
      en: 'Prepositions of place & movement (from, to, in, at)', ar: 'حروف المكان والحركة (from, to, in, at)',
      content: grammarSections(
        'نستخدم from للبداية، و to للنهاية، و at لمكان محدد، و in لداخل مكان. تساعدنا في وصف حركة البضائع.',
        "<b>Prepositions of movement</b><br><br>• <b>from</b> = the start point<br>• <b>to</b> = the end point<br>• <b>at</b> = a specific point/place<br>• <b>in</b> = inside a place<br><br><i>The truck goes <b>from</b> the factory <b>to</b> the warehouse.</i><br><i>The water is <b>in</b> the box <b>at</b> the shop.</i>",
        'go <b>from</b> (start) <b>to</b> (end)<br>be <b>in</b> / <b>at</b> (place)',
        [
          { sentence: 'The truck goes from the factory to the shop.', highlight: 'from ... to', translation_ar: 'الشاحنة تذهب من المصنع إلى المحل.' },
          { sentence: 'The boxes are in the warehouse.', highlight: 'in', translation_ar: 'الصناديق في المستودع.' },
          { sentence: 'The water arrives at the shop.', highlight: 'at', translation_ar: 'الماء يصل إلى المحل.' },
        ],
        [
          { wrong: 'The truck goes to the factory to the shop.', correct: 'The truck goes from the factory to the shop.', explanation_ar: 'نبدأ بـ from للبداية.' },
          { wrong: 'The boxes are at the warehouse (inside).', correct: 'The boxes are in the warehouse.', explanation_ar: 'داخل المكان نستخدم in.' },
        ],
      ),
      exercises: [
        { instruction: 'اختر حرف الجر الصحيح', items: [
          { question: 'The truck travels ___ the factory to the warehouse.', options: ['from', 'to'], correct_answer: 'from', explanation_ar: 'from للبداية.' },
          { question: 'The boxes are ___ the warehouse.', options: ['in', 'to'], correct_answer: 'in', explanation_ar: 'داخل المكان نستخدم in.' },
          { question: 'The water arrives ___ the shop.', options: ['at', 'from'], correct_answer: 'at', explanation_ar: 'at لمكان محدد الوصول.' },
        ] },
      ],
    },
    writing: {
      title_en: 'How a product comes to my shop',
      prompt_en: 'Choose a product you buy often (like water, bread, or milk). Write about how it comes from the factory to your local shop.',
      prompt_ar: 'اختر منتجاً تشتريه كثيراً (مثل الماء أو الخبز أو الحليب). اكتب كيف يصل من المصنع إلى محلك القريب.',
      hints: ['The product starts at the factory.', 'A truck delivers it to...', 'The warehouse keeps...', 'The shop sends an order...', 'Finally, I can buy it.'],
      min: 40, max: 90,
    },
    speaking: {
      title_en: 'Talk about something you bought',
      prompt_en: 'Talk about something you bought recently. Where did you buy it? How do you think it came to the shop?',
      prompt_ar: 'تحدث عن شيء اشتريته مؤخراً. من أين اشتريته؟ كيف تظن أنه وصل إلى المحل؟',
      prep: ['فكّر في منتج اشتريته', 'حضّر كلمات: factory, truck, deliver, shop', 'رتّب: أين اشتريته، وكيف وصل'],
      phrases: ['I bought', 'from the shop', 'factory', 'truck', 'deliver', 'I think it came from'],
    },
  },

  // ───────────────────────── UNIT 3 · HCM 345 ─────────────────────────
  {
    sort: 3,
    theme_en: 'A Day at the Clinic',
    theme_ar: 'الرعاية الصحية · يوم في العيادة',
    desc_ar: 'إنجليزي بسيط عن العيادة: المريض، الطبيب، الممرّض، والموعد.',
    why_ar: 'الرعاية الصحية عن مساعدة الناس. هنا تتعلّم كلمات الإنجليزي التي تصف العناية بالمرضى.',
    outcomes: ['تقرأ عن يوم في عيادة', 'تتعلّم: patient, nurse, care, appointment', 'تصف زيارة لطبيب'],
    warmup: ['متى كانت آخر زيارة لك لعيادة؟', 'من يساعد المرضى في العيادة؟'],
    reading: {
      title_en: 'Sara Works at a Clinic',
      title_ar: 'سارة تعمل في عيادة',
      paras: [
        "Sara is a *nurse* at a small *clinic* in her city. Every morning, she *always* comes early to help the *staff* get ready. The *clinic* is clean and quiet, and the first *patient* arrives at nine.",
        "A *patient* is a person who is *sick* and needs *care*. Sara helps the *doctor* with every *patient*. She often takes notes about their *treatment* and answers simple questions. \"Good *care* is not only medicine,\" Sara says. \"It is also kind words.\"",
        "Later, a mother comes with her son. She has an *appointment* at eleven. The *doctor* checks the boy and gives him *medicine*. Sara *sometimes* stays late, but she is happy. \"When people leave the *clinic* feeling better, that is the best part of my day,\" she says.",
      ],
      skill_en: 'Reading for detail', skill_ar: 'القراءة لالتقاط التفاصيل',
    },
    questions: [
      ['main_idea', 'What is the passage mainly about?', 'عمّ يتحدث النص بشكل رئيسي؟',
        ['A nurse and her day at a clinic', 'How to build a hospital', 'A story about medicine only', 'A big city'],
        'A nurse and her day at a clinic', 'النص عن سارة الممرّضة ويومها في العيادة.'],
      ['detail', 'What is Sara\'s job?', 'ما وظيفة سارة؟',
        ['A nurse', 'A doctor', 'A teacher', 'A driver'],
        'A nurse', 'قال النص إن سارة ممرّضة.'],
      ['vocabulary', 'What is a "patient"?', 'ما معنى patient؟',
        ['A person who is sick and needs care', 'A doctor', 'A clinic', 'A kind of medicine'],
        'A person who is sick and needs care', 'المريض شخص مريض يحتاج رعاية.'],
      ['detail', 'When does the first patient arrive?', 'متى يصل أول مريض؟',
        ['At nine', 'At eleven', 'At seven', 'At noon'],
        'At nine', 'قال النص إن أول مريض يصل الساعة التاسعة.'],
      ['inference', 'What does Sara believe good care is?', 'ماذا تعتقد سارة أن الرعاية الجيدة؟',
        ['Not only medicine, but also kind words', 'Only medicine', 'Only money', 'Only rest'],
        'Not only medicine, but also kind words', 'قالت سارة إن الرعاية ليست دواء فقط بل كلمات لطيفة.'],
      ['detail', 'Why does the mother come to the clinic?', 'لماذا تأتي الأم إلى العيادة؟',
        ['She has an appointment for her son', 'She works there', 'She sells medicine', 'She is a nurse'],
        'She has an appointment for her son', 'الأم لديها موعد لابنها.'],
      ['inference', 'What is the best part of Sara\'s day?', 'ما أفضل جزء في يوم سارة؟',
        ['When people leave feeling better', 'When she goes home early', 'When the clinic is empty', 'When she takes notes'],
        'When people leave feeling better', 'قالت إن أفضل جزء عندما يغادر الناس وهم أفضل.'],
    ],
    vocab: [
      ['nurse', 'a person who takes care of sick people', 'ممرّض / ممرّضة', 'Sara is a nurse at a clinic.', 'noun', true],
      ['clinic', 'a small place to see a doctor', 'عيادة', 'She works at a small clinic.', 'noun', true],
      ['patient', 'a sick person who gets care', 'مريض', 'The first patient arrives at nine.', 'noun', true],
      ['doctor', 'a person who helps sick people', 'طبيب', 'Sara helps the doctor.', 'noun', true],
      ['care', 'help you give to keep people well', 'رعاية', 'Good care is also kind words.', 'noun', true],
      ['staff', 'the people who work in a place', 'طاقم / موظفون', 'She helps the staff get ready.', 'noun', true],
      ['treatment', 'the way a doctor helps a sick person', 'علاج', 'She takes notes about their treatment.', 'noun', true],
      ['appointment', 'a time you plan to meet the doctor', 'موعد', 'She has an appointment at eleven.', 'noun', true],
      ['medicine', 'a thing you take to feel better', 'دواء', 'The doctor gives him medicine.', 'noun', true],
      ['sick', 'not feeling well; ill', 'مريض / متوعّك', 'A patient is a person who is sick.', 'adjective', true],
      ['health', 'how well your body is', 'صحة', 'Good food is important for your health.', 'noun', false],
      ['help', 'to make things easier for someone', 'يساعد', 'Sara helps the doctor with every patient.', 'verb', false],
    ],
    grammar: {
      en: 'Adverbs of frequency (always, often, sometimes)', ar: 'ظروف التكرار (always, often, sometimes)',
      content: grammarSections(
        'تخبرنا ظروف التكرار كم مرة يحدث الشيء. نضعها عادةً قبل الفعل الرئيسي. always (دائماً) > often (غالباً) > sometimes (أحياناً).',
        "<b>Adverbs of frequency</b><br><br>They tell us <i>how often</i> something happens:<br>• <b>always</b> = 100%<br>• <b>often</b> = a lot<br>• <b>sometimes</b> = not a lot<br><br>We put them <b>before</b> the main verb:<br><i>Sara <b>always</b> comes early.</i><br><i>She <b>sometimes</b> stays late.</i>",
        'Subject + <b>adverb</b> + verb<br>(Sara + always + comes)',
        [
          { sentence: 'Sara always comes early.', highlight: 'always', translation_ar: 'سارة تأتي مبكراً دائماً.' },
          { sentence: 'She often takes notes.', highlight: 'often', translation_ar: 'هي تدوّن الملاحظات غالباً.' },
          { sentence: 'She sometimes stays late.', highlight: 'sometimes', translation_ar: 'هي تبقى متأخرة أحياناً.' },
        ],
        [
          { wrong: 'Sara comes always early.', correct: 'Sara always comes early.', explanation_ar: 'نضع الظرف قبل الفعل.' },
          { wrong: 'She takes often notes.', correct: 'She often takes notes.', explanation_ar: 'الظرف يأتي قبل الفعل الرئيسي.' },
        ],
      ),
      exercises: [
        { instruction: 'اختر الترتيب الصحيح', items: [
          { question: 'Sara ___ comes early to help the staff.', options: ['always', 'come always'], correct_answer: 'always', explanation_ar: 'always قبل الفعل.' },
          { question: 'The nurse ___ takes notes about the treatment.', options: ['often', 'takes often'], correct_answer: 'often', explanation_ar: 'often قبل الفعل.' },
          { question: 'She ___ stays late at the clinic.', options: ['sometimes', 'stays sometimes'], correct_answer: 'sometimes', explanation_ar: 'sometimes قبل الفعل.' },
        ] },
      ],
    },
    writing: {
      title_en: 'A visit to a doctor or clinic',
      prompt_en: 'Write about a visit to a doctor or a clinic. Why did you go? Who helped you? How did you feel after?',
      prompt_ar: 'اكتب عن زيارة لطبيب أو عيادة. لماذا ذهبت؟ من ساعدك؟ كيف شعرت بعد ذلك؟',
      hints: ['I went to the clinic because...', 'The doctor / nurse...', 'They gave me...', 'After the visit, I felt...'],
      min: 40, max: 90,
    },
    speaking: {
      title_en: 'Talk about staying healthy',
      prompt_en: 'Talk about how you stay healthy. What do you do? When do you go to a doctor?',
      prompt_ar: 'تحدث عن كيف تحافظ على صحتك. ماذا تفعل؟ متى تذهب إلى الطبيب؟',
      prep: ['فكّر في عاداتك الصحية', 'حضّر كلمات: health, doctor, care, sick', 'رتّب: ماذا تفعل، ومتى تحتاج طبيباً'],
      phrases: ['health', 'healthy', 'doctor', 'care', 'sick', 'I go to the doctor when', 'to feel better'],
    },
  },

  // ───────────────────────── UNIT 4 · NPF 323 ─────────────────────────
  {
    sort: 4,
    theme_en: 'The Charity Event',
    theme_ar: 'المنظمات غير الربحية · فعالية خيرية',
    desc_ar: 'إنجليزي بسيط عن العمل الخيري: التطوّع، التبرّع، والمجتمع (بصيغة الماضي).',
    why_ar: 'العمل غير الربحي عن مساعدة الناس معاً. هنا تتعلّم كلمات الإنجليزي وتتحدث عمّا حدث في الماضي.',
    outcomes: ['تقرأ قصة عن فعالية خيرية', 'تتعلّم: charity, volunteer, donate, community', 'تكتب عن مساعدتك لأحد'],
    warmup: ['هل تطوّعت يوماً لمساعدة الناس؟', 'كيف يساعد الناس بعضهم في مجتمعك؟'],
    reading: {
      title_en: 'A Day of Giving',
      title_ar: 'يوم العطاء',
      paras: [
        "Last week, a small *charity* in the neighborhood held a special *event*. Many people came to help poor families. It was a busy and happy day.",
        "In the morning, ten young *volunteers* *arrived* early. They *worked* together and *organized* boxes of food. People from the *community* *donated* clothes, rice, and books. The *charity* also *collected* money for a small *fund* to help children go to school.",
        "By the evening, the *volunteers* *helped* more than fifty families. \"We *supported* our neighbors, and they smiled,\" one *member* said. \"When a *community* works together, small gifts become something big.\" Everyone *agreed* that it was a wonderful day, and they *planned* to do it again next month.",
      ],
      skill_en: 'Understanding a story in the past', skill_ar: 'فهم قصة في الماضي',
    },
    questions: [
      ['main_idea', 'What is this passage about?', 'عمّ يتحدث النص؟',
        ['A charity event to help families', 'A birthday party', 'A football match', 'A school exam'],
        'A charity event to help families', 'النص عن فعالية خيرية لمساعدة العائلات.'],
      ['detail', 'When did the event happen?', 'متى حدثت الفعالية؟',
        ['Last week', 'Next year', 'Tomorrow', 'In the morning only'],
        'Last week', 'قال النص: الأسبوع الماضي أقامت جمعية خيرية فعالية.'],
      ['vocabulary', 'What is a "volunteer"?', 'ما معنى volunteer؟',
        ['A person who helps for free', 'A rich person', 'A teacher', 'A shop owner'],
        'A person who helps for free', 'المتطوّع شخص يساعد مجاناً.'],
      ['detail', 'What did people from the community donate?', 'ماذا تبرّع الناس من المجتمع؟',
        ['Clothes, rice, and books', 'Cars and houses', 'Nothing', 'Only money'],
        'Clothes, rice, and books', 'قال النص إنهم تبرّعوا بملابس وأرز وكتب.'],
      ['detail', 'How many families did the volunteers help?', 'كم عائلة ساعد المتطوّعون؟',
        ['More than fifty', 'Only five', 'One hundred', 'None'],
        'More than fifty', 'قال النص: أكثر من خمسين عائلة.'],
      ['inference', 'What is the main message of the passage?', 'ما الرسالة الرئيسية للنص؟',
        ['When a community works together, small gifts become big', 'Charity is only for rich people', 'Helping others is difficult and sad', 'Money is the most important thing'],
        'When a community works together, small gifts become big', 'قال العضو إن العمل الجماعي يجعل الهدايا الصغيرة كبيرة.'],
      ['detail', 'What did they plan to do next month?', 'ماذا خططوا أن يفعلوا الشهر القادم؟',
        ['Do the event again', 'Close the charity', 'Move to another city', 'Stop helping'],
        'Do the event again', 'خططوا أن يعيدوا الفعالية الشهر القادم.'],
    ],
    vocab: [
      ['charity', 'a group that helps people for free', 'جمعية خيرية', 'A small charity held an event.', 'noun', true],
      ['event', 'something planned that happens', 'فعالية / حدث', 'The charity held a special event.', 'noun', true],
      ['volunteer', 'a person who helps for free', 'متطوّع', 'Ten young volunteers arrived early.', 'noun', true],
      ['donate', 'to give money or things to help', 'يتبرّع', 'People donated clothes and books.', 'verb', true],
      ['fund', 'money kept to be used for something', 'تمويل / صندوق مالي', 'They collected money for a small fund.', 'noun', true],
      ['community', 'the people who live in one area', 'مجتمع محلي', 'The whole community helped.', 'noun', true],
      ['support', 'to give help to someone', 'يدعم', 'We supported our neighbors.', 'verb', true],
      ['member', 'a person who is part of a group', 'عضو', 'One member said it was a good day.', 'noun', true],
      ['help', 'to make things easier for someone', 'يساعد', 'The volunteers helped fifty families.', 'verb', true],
      ['organize', 'to put things in order', 'ينظّم / يرتّب', 'They organized boxes of food.', 'verb', true],
      ['donation', 'money or things given to help', 'تبرّع', 'The donation helped many families.', 'noun', false],
      ['give', 'to let someone have something', 'يعطي', 'They give food to people in need.', 'verb', false],
    ],
    grammar: {
      en: 'Past Simple (regular verbs)', ar: 'الماضي البسيط (الأفعال المنتظمة)',
      content: grammarSections(
        'نستخدم الماضي البسيط للحديث عن أشياء انتهت في الماضي. مع الأفعال المنتظمة نضيف ed للفعل: help → helped.',
        "<b>Past Simple (regular verbs)</b><br><br>We use it for finished actions in the past. For regular verbs, add <b>-ed</b>:<br>• help → help<b>ed</b><br>• work → work<b>ed</b><br>• donate → donat<b>ed</b><br><br><i>The volunteers <b>helped</b> fifty families.</i><br><i>People <b>donated</b> clothes.</i>",
        'Subject + verb + <b>-ed</b><br>(They + help + ed = helped)',
        [
          { sentence: 'The volunteers helped many families.', highlight: 'helped', translation_ar: 'المتطوّعون ساعدوا عائلات كثيرة.' },
          { sentence: 'People donated clothes and books.', highlight: 'donated', translation_ar: 'الناس تبرّعوا بملابس وكتب.' },
          { sentence: 'They worked together all day.', highlight: 'worked', translation_ar: 'عملوا معاً طوال اليوم.' },
        ],
        [
          { wrong: 'They helps the families.', correct: 'They helped the families.', explanation_ar: 'الماضي المنتظم نضيف ed.' },
          { wrong: 'People donate clothes yesterday.', correct: 'People donated clothes yesterday.', explanation_ar: 'مع الماضي (yesterday) نستخدم donated.' },
        ],
      ),
      exercises: [
        { instruction: 'اختر صيغة الماضي الصحيحة', items: [
          { question: 'Last week, the volunteers ___ fifty families.', options: ['helped', 'help'], correct_answer: 'helped', explanation_ar: 'الماضي: help + ed.' },
          { question: 'People ___ clothes and rice.', options: ['donated', 'donate'], correct_answer: 'donated', explanation_ar: 'الماضي: donate + d.' },
          { question: 'They ___ together all day.', options: ['worked', 'work'], correct_answer: 'worked', explanation_ar: 'الماضي: work + ed.' },
        ] },
      ],
    },
    writing: {
      title_en: 'A time I helped someone',
      prompt_en: 'Write about a time you helped someone or your community. What did you do? How did you feel?',
      prompt_ar: 'اكتب عن مرة ساعدت فيها شخصاً أو مجتمعك. ماذا فعلت؟ كيف شعرت؟',
      hints: ['Last week / Last year, I...', 'I helped...', 'We donated / organized...', 'After that, I felt...'],
      min: 40, max: 90,
    },
    speaking: {
      title_en: 'Talk about helping others',
      prompt_en: 'Talk about a way people help each other in your community. Why is it important?',
      prompt_ar: 'تحدث عن طريقة يساعد بها الناس بعضهم في مجتمعك. لماذا هي مهمة؟',
      prep: ['فكّر في عمل خيري رأيته أو شاركت فيه', 'حضّر كلمات: help, donate, volunteer, community', 'رتّب: ماذا حدث، ولماذا مهم'],
      phrases: ['help', 'donate', 'volunteer', 'community', 'support', 'it is important because', 'people help each other'],
    },
  },

  // ───────────────────────── UNIT 5 · MGT 303 ─────────────────────────
  {
    sort: 5,
    theme_en: 'The Job Interview',
    theme_ar: 'المهارات المهنية · مقابلة العمل',
    desc_ar: 'إنجليزي بسيط عن العمل: الوظيفة، المقابلة، المهارات، والمدير.',
    why_ar: 'هذا أقرب مسار لك: الإنجليزي الذي تحتاجه للوظيفة والمقابلة والعمل. ابدأ من هنا.',
    outcomes: ['تقرأ عن الاستعداد لمقابلة عمل', 'تتعلّم: job, interview, skill, manager', 'تتحدث عن وظيفة أحلامك'],
    warmup: ['ما الوظيفة التي تحلم بها؟', 'ما المهارات التي تملكها؟'],
    reading: {
      title_en: 'Khalid Gets Ready for an Interview',
      title_ar: 'خالد يستعد لمقابلة',
      paras: [
        "Khalid is a student, and next week he has his first *job* *interview*. He wants to start a good *career*, so he prepares with care. He is a little nervous, but also excited.",
        "First, Khalid writes a simple *resume*. A *resume* is a paper that shows your *skills* and your work. He writes: \"I *can* use a computer. I *can* speak Arabic and English. I *can* work in a *team*.\" These are useful *skills* for any *office*.",
        "On the day of the *interview*, Khalid arrives early and shakes hands with the *manager*. The *manager* asks about his *skills* and his goals. Khalid answers with a calm voice. \"I *can* learn quickly, and I *can* finish my *tasks* on time,\" he says. At the end, the *manager* smiles. \"Good luck, Khalid,\" she says. Khalid feels proud — he did his best.",
      ],
      skill_en: 'Reading about goals & ability', skill_ar: 'القراءة عن الأهداف والقدرات',
    },
    questions: [
      ['main_idea', 'What is the passage mainly about?', 'عمّ يتحدث النص بشكل رئيسي؟',
        ['A student getting ready for a job interview', 'How to build an office', 'A story about a computer', 'A charity event'],
        'A student getting ready for a job interview', 'النص عن خالد واستعداده لمقابلة عمل.'],
      ['detail', 'What does Khalid have next week?', 'ماذا لدى خالد الأسبوع القادم؟',
        ['His first job interview', 'A birthday', 'A holiday', 'An exam only'],
        'His first job interview', 'قال النص إن لديه أول مقابلة عمل الأسبوع القادم.'],
      ['vocabulary', 'What is a "resume"?', 'ما معنى resume؟',
        ['A paper that shows your skills and work', 'A type of office', 'A manager', 'A computer'],
        'A paper that shows your skills and work', 'السيرة الذاتية ورقة تُظهر مهاراتك وعملك.'],
      ['detail', 'What skills does Khalid write on his resume?', 'ما المهارات التي يكتبها خالد؟',
        ['Using a computer, speaking two languages, working in a team', 'Cooking and driving only', 'Nothing', 'Playing football'],
        'Using a computer, speaking two languages, working in a team', 'كتب: استخدام الحاسب، لغتان، والعمل ضمن فريق.'],
      ['detail', 'Who does Khalid meet at the interview?', 'من يقابل خالد في المقابلة؟',
        ['The manager', 'A doctor', 'A nurse', 'A customer'],
        'The manager', 'قال النص إنه يصافح المدير.'],
      ['inference', 'Why does Khalid feel proud at the end?', 'لماذا يشعر خالد بالفخر في النهاية؟',
        ['He did his best', 'He got a lot of money', 'He went home early', 'He did not answer'],
        'He did his best', 'شعر بالفخر لأنه بذل أفضل ما لديه.'],
      ['vocabulary', 'What does "can" show in "I can learn quickly"?', 'ماذا تُظهر can في I can learn quickly؟',
        ['ability', 'the past', 'a place', 'a price'],
        'ability', 'can تُستخدم للتعبير عن القدرة.'],
    ],
    vocab: [
      ['job', 'the work a person does for money', 'وظيفة / عمل', 'He has his first job interview.', 'noun', true],
      ['interview', 'a meeting to get a job', 'مقابلة عمل', 'Next week he has an interview.', 'noun', true],
      ['career', 'the work you do for many years', 'مسار مهني', 'He wants a good career.', 'noun', true],
      ['resume', 'a paper about your work and skills', 'سيرة ذاتية', 'Khalid writes a simple resume.', 'noun', true],
      ['skill', 'a thing you can do well', 'مهارة', 'These are useful skills for any office.', 'noun', true],
      ['team', 'a group of people who work together', 'فريق', 'I can work in a team.', 'noun', true],
      ['office', 'a place where people work', 'مكتب', 'These skills are useful for any office.', 'noun', true],
      ['manager', 'a person who leads workers', 'مدير', 'He shakes hands with the manager.', 'noun', true],
      ['task', 'a piece of work you must do', 'مهمة', 'I can finish my tasks on time.', 'noun', true],
      ['work', 'to do a job or task', 'يعمل', 'I can work in a team.', 'verb', true],
      ['deadline', 'the last day to finish work', 'موعد نهائي', 'The report has a deadline on Friday.', 'noun', false],
      ['email', 'a message you send on the internet', 'بريد إلكتروني', 'Please send me an email about the job.', 'noun', false],
    ],
    grammar: {
      en: 'can / can\'t for ability', ar: 'can / can\'t للتعبير عن القدرة',
      content: grammarSections(
        'نستخدم can للقدرة (أستطيع) و can\'t للنفي (لا أستطيع). بعدها يأتي الفعل في صيغته الأساسية بدون to.',
        "<b>can / can't (ability)</b><br><br>Use <b>can</b> to say what you are able to do, and <b>can't</b> for what you are not able to do. After can, use the <b>base verb</b> (no <i>to</i>).<br><br><i>I <b>can</b> use a computer.</i><br><i>I <b>can't</b> drive a truck.</i>",
        'Subject + <b>can / can\'t</b> + base verb<br>(I + can + speak English)',
        [
          { sentence: 'I can speak Arabic and English.', highlight: 'can speak', translation_ar: 'أستطيع التحدث بالعربية والإنجليزية.' },
          { sentence: 'She can work in a team.', highlight: 'can work', translation_ar: 'هي تستطيع العمل ضمن فريق.' },
          { sentence: "He can't finish it today.", highlight: "can't finish", translation_ar: 'لا يستطيع إنهاءه اليوم.' },
        ],
        [
          { wrong: 'I can to use a computer.', correct: 'I can use a computer.', explanation_ar: 'لا نضع to بعد can.' },
          { wrong: 'She can works in a team.', correct: 'She can work in a team.', explanation_ar: 'بعد can الفعل بدون s.' },
        ],
      ),
      exercises: [
        { instruction: 'اختر الصيغة الصحيحة', items: [
          { question: 'I ___ use a computer very well.', options: ['can', 'can to'], correct_answer: 'can', explanation_ar: 'بدون to بعد can.' },
          { question: 'She can ___ in a team.', options: ['work', 'works'], correct_answer: 'work', explanation_ar: 'بعد can الفعل أساسي بدون s.' },
          { question: 'He ___ finish the task today (he is too busy).', options: ["can't", 'can'], correct_answer: "can't", explanation_ar: "النفي: can't لعدم القدرة." },
        ] },
      ],
    },
    writing: {
      title_en: 'The job I want and my skills',
      prompt_en: 'Write about the job you want in the future. Why do you want it? What skills do you have? What can you do well?',
      prompt_ar: 'اكتب عن الوظيفة التي تريدها في المستقبل. لماذا تريدها؟ ما المهارات التي تملكها؟ ماذا تستطيع أن تفعل جيداً؟',
      hints: ['I want to be / work as...', 'I want this job because...', 'I can...', 'My best skill is...', 'In the future, I will...'],
      min: 40, max: 90,
    },
    speaking: {
      title_en: 'Talk about your dream job',
      prompt_en: 'Talk about your dream job. What is it? What skills do you need? Why do you want it?',
      prompt_ar: 'تحدث عن وظيفة أحلامك. ما هي؟ ما المهارات التي تحتاجها؟ لماذا تريدها؟',
      prep: ['فكّر في الوظيفة التي تحلم بها', 'حضّر كلمات: job, career, skill, manager', 'رتّب: ما الوظيفة، ولماذا، وما المهارات'],
      phrases: ['job', 'career', 'skill', 'I can', 'manager', 'my dream job is', 'I want to be'],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// INSERTION ENGINE
// ═══════════════════════════════════════════════════════════════════════════
async function buildUnit(u) {
  // Idempotency: skip if this custom_sort unit already exists for Mosab
  const { data: existing } = await supabase.from('curriculum_units')
    .select('id').eq('owner_student_id', MOSAB_ID).eq('custom_sort', u.sort).maybeSingle();
  if (existing) { console.log(`  ⏭️  Unit ${u.sort} (${u.theme_en}) already exists — skipping.`); return existing.id; }

  // 1. unit
  const { data: unit, error: uErr } = await supabase.from('curriculum_units').insert({
    level_id: L2_LEVEL, owner_student_id: MOSAB_ID, custom_sort: u.sort, unit_number: u.sort, sort_order: u.sort,
    theme_en: u.theme_en, theme_ar: u.theme_ar, description_ar: u.desc_ar, why_matters: u.why_ar,
    outcomes: u.outcomes, warmup_questions: u.warmup, estimated_minutes: 45, is_published: true,
  }).select('id');
  if (uErr) throw new Error(`unit ${u.sort} insert: ${uErr.message}`);
  assertOne(unit, `unit ${u.sort}`);
  const unitId = unit[0].id;

  // 2. reading
  const { data: reading, error: rErr } = await supabase.from('curriculum_readings').insert({
    unit_id: unitId, reading_label: 'A', title_en: u.reading.title_en, title_ar: u.reading.title_ar,
    passage_content: { paragraphs: u.reading.paras }, passage_word_count: wc(u.reading.paras),
    reading_skill_name_en: u.reading.skill_en, reading_skill_name_ar: u.reading.skill_ar,
    sort_order: 0, is_published: true,
  }).select('id');
  if (rErr) throw new Error(`reading ${u.sort}: ${rErr.message}`);
  assertOne(reading, `reading ${u.sort}`);
  const readingId = reading[0].id;

  // 3. comprehension questions
  const qRows = u.questions.map(([qtype, qen, qar, choices, correct, expl], i) => ({
    reading_id: readingId, section: 'mcq', question_type: qtype, question_en: qen, question_ar: qar,
    choices, correct_answer: correct, explanation_ar: expl, sort_order: i,
  }));
  const { data: qIns, error: qErr } = await supabase.from('curriculum_comprehension_questions').insert(qRows).select('id');
  if (qErr) throw new Error(`questions ${u.sort}: ${qErr.message}`);

  // 4. vocabulary (tied to the reading)
  const vRows = u.vocab.map(([word, den, dar, ex, pos, appears], i) => ({
    reading_id: readingId, word, definition_en: den, definition_ar: dar, example_sentence: ex,
    part_of_speech: pos, appears_in_passage: appears, cefr_level: 'A2', tier: 'tier1', sort_order: i,
  }));
  const { data: vIns, error: vErr } = await supabase.from('curriculum_vocabulary').insert(vRows).select('id');
  if (vErr) throw new Error(`vocab ${u.sort}: ${vErr.message}`);

  // 5. grammar + exercises
  const { data: gram, error: gErr } = await supabase.from('curriculum_grammar').insert({
    unit_id: unitId, level_id: L2_LEVEL, category: 'grammar',
    topic_name_en: u.grammar.en, topic_name_ar: u.grammar.ar, explanation_content: u.grammar.content, sort_order: 0,
  }).select('id');
  if (gErr) throw new Error(`grammar ${u.sort}: ${gErr.message}`);
  assertOne(gram, `grammar ${u.sort}`);
  const gramId = gram[0].id;
  const exRows = u.grammar.exercises.map((ex, i) => ({
    grammar_id: gramId, exercise_type: 'choose', instructions_ar: ex.instruction, items: ex.items,
    is_auto_gradeable: true, sort_order: i,
  }));
  const { error: exErr } = await supabase.from('curriculum_grammar_exercises').insert(exRows);
  if (exErr) throw new Error(`grammar exercises ${u.sort}: ${exErr.message}`);

  // 6. writing
  const { error: wErr } = await supabase.from('curriculum_writing').insert({
    unit_id: unitId, task_number: 1, task_type: 'essay', title_en: u.writing.title_en,
    prompt_en: u.writing.prompt_en, prompt_ar: u.writing.prompt_ar, hints: u.writing.hints,
    word_count_min: u.writing.min, word_count_max: u.writing.max,
    rubric: { 'Content and Ideas': 30, 'Grammar and Accuracy': 25, 'Organization': 20, 'Vocabulary': 25 },
    difficulty: 'standard', sort_order: 0, is_published: true,
  });
  if (wErr) throw new Error(`writing ${u.sort}: ${wErr.message}`);

  // 7. speaking
  const { error: sErr } = await supabase.from('curriculum_speaking').insert({
    unit_id: unitId, topic_number: 1, topic_type: 'descriptive', title_en: u.speaking.title_en, title_ar: u.speaking.prompt_ar,
    prompt_en: u.speaking.prompt_en, prompt_ar: u.speaking.prompt_ar, preparation_notes: u.speaking.prep,
    useful_phrases: u.speaking.phrases, min_duration_seconds: 30, max_duration_seconds: 180,
    evaluation_criteria: { fluency: 25, grammar: 25, coherence: 25, vocabulary: 25 }, difficulty: 'standard', sort_order: 0, is_published: true,
  });
  if (sErr) throw new Error(`speaking ${u.sort}: ${sErr.message}`);

  console.log(`  ✅ Unit ${u.sort} «${u.theme_ar}» — reading(${wc(u.reading.paras)}w) + ${qIns.length}Q + ${vIns.length} vocab + grammar(${exRows.length} ex) + writing + speaking`);
  return unitId;
}

(async () => {
  try {
    console.log(`🚀 Building مصعب's custom business-major curriculum (owner=${MOSAB_ID})`);
    for (const u of UNITS) await buildUnit(u);

    // Flip the flag so he sees ONLY his units on /student/curriculum
    const { data: stu, error: fErr } = await supabase.from('students')
      .update({ uses_custom_curriculum: true }).eq('id', MOSAB_ID).select('uses_custom_curriculum');
    if (fErr) throw new Error(`flag update: ${fErr.message}`);
    assertOne(stu, 'uses_custom_curriculum');
    console.log(`\n  ✅ students.uses_custom_curriculum = ${stu[0].uses_custom_curriculum}`);

    // Verify
    const { count: unitN } = await supabase.from('curriculum_units').select('id', { count: 'exact', head: true }).eq('owner_student_id', MOSAB_ID);
    console.log(`\n=== SUMMARY ===`);
    console.log(`  Owner units for Mosab: ${unitN} (expected 5)`);
    console.log('  He now sees ONLY his 5 business-major units on /student/curriculum.');
    if (unitN !== 5) { console.error('🔴 unit count mismatch'); process.exit(1); }
    console.log('\n✅ Done.');
  } catch (e) {
    console.error('\n💥 FATAL:', e.message);
    process.exit(1);
  }
})();
