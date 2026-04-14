const {Client} = require('pg');

// Last 40 words — spread 3-4 per unit across all 12 units
const LAST = [
// Unit 1: Brain & Memory
{w:"memorization",c:"A2",s:"CEFR-J",p:"noun",ar:"حفظ عن ظهر قلب",een:"Memorization is one way to learn.",ear:"الحفظ عن ظهر قلب طريقة للتعلم.",def:"learning something so you can repeat it exactly",t:"extended",u:1},
{w:"daydream",c:"A2",s:"NGSL",p:"verb",ar:"يحلم أحلام يقظة",een:"He daydreams during boring classes.",ear:"يحلم أحلام يقظة أثناء الحصص المملة.",def:"to think about nice things instead of paying attention",t:"core",u:1},
{w:"brainstorm",c:"A2",s:"NGSL",p:"verb",ar:"يفكر بأفكار",een:"Let us brainstorm ideas together.",ear:"لنفكر بأفكار معاً.",def:"to think of many ideas quickly",t:"core",u:1},

// Unit 2: Endangered Species
{w:"hatchling",c:"B1",s:"NGSL",p:"noun",ar:"صغير فاقس",een:"The sea turtle hatchling reached the water.",ear:"وصل صغير السلحفاة البحرية إلى الماء.",def:"a very young animal that just came out of an egg",t:"mastery",u:2},
{w:"cub",c:"A2",s:"CEFR-J",p:"noun",ar:"شبل",een:"The lion cub played with its mother.",ear:"لعب الشبل مع أمه.",def:"a young bear, lion, or other large animal",t:"core",u:2},
{w:"wingspan",c:"B1",s:"NGSL",p:"noun",ar:"امتداد الجناحين",een:"The eagle has a two-meter wingspan.",ear:"امتداد جناحي النسر متران.",def:"the distance from one wing tip to the other",t:"mastery",u:2},

// Unit 3: Extreme Weather
{w:"whirlwind",c:"B1",s:"NGSL",p:"noun",ar:"زوبعة",een:"The whirlwind destroyed the barn.",ear:"دمرت الزوبعة الحظيرة.",def:"a strong wind that spins in a circle",t:"mastery",u:3},
{w:"downpour",c:"A2",s:"NGSL",p:"noun",ar:"هطول غزير",een:"The sudden downpour soaked everyone.",ear:"غمر الهطول الغزير المفاجئ الجميع.",def:"very heavy rain",t:"extended",u:3},
{w:"gust",c:"A2",s:"NGSL",p:"noun",ar:"هبّة ريح",een:"A strong gust blew the hat away.",ear:"هبّة ريح قوية أطارت القبعة.",def:"a sudden strong burst of wind",t:"core",u:3},

// Unit 4: Fashion & Identity
{w:"wardrobe",c:"A2",s:"CEFR-J",p:"noun",ar:"خزانة ملابس",een:"She organized her wardrobe yesterday.",ear:"رتبت خزانة ملابسها أمس.",def:"a closet for storing clothes",t:"core",u:4},
{w:"embroider",c:"B1",s:"NGSL",p:"verb",ar:"يطرّز",een:"She embroidered flowers on the dress.",ear:"طرّزت زهوراً على الفستان.",def:"to sew patterns on cloth as decoration",t:"mastery",u:4},
{w:"boutique",c:"A2",s:"NGSL",p:"noun",ar:"متجر صغير",een:"She bought the bag from a boutique.",ear:"اشترت الحقيبة من متجر صغير.",def:"a small shop selling fashionable items",t:"extended",u:4},

// Unit 5: Hidden History
{w:"catacomb",c:"B1",s:"NGSL",p:"noun",ar:"سرداب أنفاق",een:"The catacomb runs under the city.",ear:"يمتد السرداب تحت المدينة.",def:"an underground tunnel used for burial",t:"mastery",u:5},
{w:"dynasty",c:"B1",s:"NGSL",p:"noun",ar:"سلالة حاكمة",een:"The dynasty ruled for three centuries.",ear:"حكمت السلالة ثلاثة قرون.",def:"a family that rules a country for a long time",t:"extended",u:5},
{w:"enigma",c:"B1",s:"NGSL",p:"noun",ar:"لغز",een:"The disappearance remains an enigma.",ear:"يبقى الاختفاء لغزاً.",def:"something mysterious and hard to explain",t:"mastery",u:5},

// Unit 6: Future Cities
{w:"surveillance",c:"B1",s:"NGSL",p:"noun",ar:"مراقبة",een:"Cameras provide surveillance in the city.",ear:"توفر الكاميرات المراقبة في المدينة.",def:"watching people or places to keep them safe",t:"mastery",u:6},
{w:"reclaim",c:"B1",s:"NGSL",p:"verb",ar:"يستصلح",een:"The city reclaimed land from the sea.",ear:"استصلحت المدينة أرضاً من البحر.",def:"to take back something or make it useful again",t:"mastery",u:6},
{w:"greenery",c:"A2",s:"NGSL",p:"noun",ar:"مساحات خضراء",een:"The city needs more greenery.",ear:"المدينة تحتاج المزيد من المساحات الخضراء.",def:"green plants and trees in an area",t:"core",u:6},

// Unit 7: Digital Detox
{w:"logout",c:"A2",s:"NGSL",p:"verb",ar:"يسجّل الخروج",een:"Remember to logout from your account.",ear:"تذكر أن تسجّل الخروج من حسابك.",def:"to end your session on a website or app",t:"core",u:7},
{w:"nomophobia",c:"B1",s:"NGSL",p:"noun",ar:"رهاب فقد الهاتف",een:"Nomophobia is the fear of losing your phone.",ear:"رهاب فقد الهاتف هو الخوف من ضياع هاتفك.",def:"fear or anxiety about being without your phone",t:"mastery",u:7},
{w:"unplugged",c:"A2",s:"NGSL",p:"adjective",ar:"غير متصل",een:"They spent an unplugged weekend.",ear:"قضوا عطلة نهاية أسبوع غير متصلة.",def:"not using electronic devices",t:"extended",u:7},

// Unit 8: Mountain Adventures
{w:"crampon",c:"B1",s:"NGSL",p:"noun",ar:"مسمار تسلق",een:"Crampons help you walk on ice.",ear:"تساعدك مسامير التسلق على المشي على الجليد.",def:"metal spikes attached to boots for walking on ice",t:"mastery",u:8},
{w:"overhang",c:"B1",s:"NGSL",p:"noun",ar:"نتوء صخري",een:"The overhang protected them from rain.",ear:"حماهم النتوء الصخري من المطر.",def:"a rock or roof that sticks out over something",t:"extended",u:8},
{w:"lookout",c:"A2",s:"NGSL",p:"noun",ar:"نقطة مراقبة",een:"The lookout had an amazing view.",ear:"كانت نقطة المراقبة ذات إطلالة مذهلة.",def:"a high place where you can see far",t:"core",u:8},

// Unit 9: Film & Cinema
{w:"audition",c:"A2",s:"CEFR-J",p:"noun",ar:"اختبار أداء",een:"She went to the audition for the movie.",ear:"ذهبت إلى اختبار الأداء للفيلم.",def:"a test to see if an actor is good for a part",t:"extended",u:9},
{w:"voiceover",c:"A2",s:"NGSL",p:"noun",ar:"تعليق صوتي",een:"He did the voiceover for the cartoon.",ear:"قام بالتعليق الصوتي لفيلم الكرتون.",def:"a voice speaking in a movie without showing the speaker",t:"extended",u:9},
{w:"cliffhanger",c:"B1",s:"NGSL",p:"noun",ar:"نهاية مشوقة",een:"The episode ended with a cliffhanger.",ear:"انتهت الحلقة بنهاية مشوقة.",def:"an exciting ending that makes you want to see more",t:"mastery",u:9},

// Unit 10: Water Crisis
{w:"waterway",c:"A2",s:"NGSL",p:"noun",ar:"مجرى مائي",een:"The waterway connects two lakes.",ear:"يربط المجرى المائي بحيرتين.",def:"a river or canal used for travel or transport",t:"extended",u:10},
{w:"moisture",c:"A2",s:"CEFR-J",p:"noun",ar:"رطوبة",een:"Moisture in the soil helps plants grow.",ear:"الرطوبة في التربة تساعد النباتات على النمو.",def:"small amounts of water in the air or on a surface",t:"extended",u:10},
{w:"dehydrate",c:"B1",s:"NGSL",p:"verb",ar:"يفقد الماء",een:"You can dehydrate quickly in the desert.",ear:"يمكنك فقد الماء بسرعة في الصحراء.",def:"to lose too much water from your body",t:"mastery",u:10},

// Unit 11: Street Art
{w:"silkscreen",c:"B1",s:"NGSL",p:"noun",ar:"طباعة حريرية",een:"The artist used silkscreen printing.",ear:"استخدم الفنان الطباعة الحريرية.",def:"a method of printing using a screen",t:"mastery",u:11},
{w:"palette",c:"A2",s:"CEFR-J",p:"noun",ar:"لوحة ألوان",een:"The artist chose a warm color palette.",ear:"اختار الفنان لوحة ألوان دافئة.",def:"the range of colors an artist uses",t:"extended",u:11},
{w:"whitewash",c:"B1",s:"NGSL",p:"verb",ar:"يطلي بالأبيض",een:"They whitewashed the wall to remove graffiti.",ear:"طلوا الجدار بالأبيض لإزالة الغرافيتي.",def:"to paint a wall white to cover marks",t:"mastery",u:11},

// Unit 12: Remarkable Journeys
{w:"vagabond",c:"B1",s:"NGSL",p:"noun",ar:"متشرد",een:"The vagabond traveled without a plan.",ear:"سافر المتشرد بدون خطة.",def:"a person who wanders from place to place",t:"mastery",u:12},
{w:"journal",c:"A2",s:"CEFR-J",p:"noun",ar:"مفكرة رحلة",een:"She kept a travel journal.",ear:"احتفظت بمفكرة سفر.",def:"a book where you write about your daily experiences",t:"core",u:12},
{w:"wanderlust",c:"B1",s:"NGSL",p:"noun",ar:"حب السفر",een:"Wanderlust made her visit many countries.",ear:"جعلها حب السفر تزور بلداناً كثيرة.",def:"a strong desire to travel",t:"mastery",u:12},
];

async function main() {
  const c = new Client({
    host:'aws-1-eu-central-1.pooler.supabase.com',
    port:5432, database:'postgres',
    user:'postgres.nmjexpuycmqcxuxljier',
    password:'Ali-al-ahmad2000',
    ssl:{rejectUnauthorized:false}
  });
  await c.connect();

  const ex = await c.query("SELECT DISTINCT LOWER(v.word) AS w FROM curriculum_vocabulary v JOIN curriculum_readings r ON r.id=v.reading_id JOIN curriculum_units u ON u.id=r.unit_id WHERE u.level_id IN ('cd96175e-76d4-48dc-b34f-83f3228a28b8','2755b494-c7ff-4bdc-96ac-7ab735dc038c','d3349438-8c8e-46b6-9ee6-e2e01c23229d')");
  const staged = await c.query('SELECT LOWER(word) AS w FROM vocab_staging_l2');
  const all = new Set([...ex.rows.map(r=>r.w), ...staged.rows.map(r=>r.w)]);

  let added = 0, skipped = 0;
  for (const w of LAST) {
    if (all.has(w.w.toLowerCase())) { console.log('SKIP:', w.w); skipped++; continue; }
    try {
      await c.query('INSERT INTO vocab_staging_l2 (word,cefr_level,source_list,pos,meaning_ar,example_en,example_ar,definition_en,recommended_tier,recommended_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
        [w.w,w.c,w.s,w.p,w.ar,w.een,w.ear,w.def,w.t,w.u]);
      added++;
    } catch(e) { console.error('ERR:', w.w, e.message); }
  }
  console.log('Added:', added, 'Skipped:', skipped);

  const cnt = await c.query('SELECT COUNT(*) AS c FROM vocab_staging_l2');
  const total = parseInt(cnt.rows[0].c);
  console.log('Total staged:', total);
  console.log('Projected L2 final:', 255 + total, '(target 1300)');
  console.log('Met target:', (255+total) >= 1300 ? 'YES' : 'NO, need '+(1300-255-total)+' more');

  const pu = await c.query('SELECT recommended_unit AS u, COUNT(*) AS c FROM vocab_staging_l2 GROUP BY recommended_unit ORDER BY recommended_unit');
  const existing = [23,24,25,24,23,23,22,23,24,23,25,24];
  let minUnit = 999;
  pu.rows.forEach(r => {
    const t = parseInt(r.c) + existing[r.u-1];
    if (t < minUnit) minUnit = t;
    console.log('Unit '+r.u+': '+r.c+' + '+existing[r.u-1]+' = '+t);
  });
  console.log('Min per-unit:', minUnit);

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
