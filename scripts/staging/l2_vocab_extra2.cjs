const {Client} = require('pg');

// Targeted supplement: need ~86 more words total
// Unit 12 needs +9 to reach 90, ideally more
// Spread remaining across all weak units
const EXTRA2 = [
// === Unit 12: Remarkable Journeys (+15) ===
{w:"hitchhike",c:"B1",s:"NGSL",p:"verb",ar:"يسافر مجاناً",een:"He hitchhiked across the country.",ear:"سافر مجاناً عبر البلاد.",def:"to travel by getting free rides from drivers",t:"mastery",u:12},
{w:"stowaway",c:"B1",s:"NGSL",p:"noun",ar:"راكب خفي",een:"The stowaway hid on the ship.",ear:"اختبأ الراكب الخفي على السفينة.",def:"a person who hides on a ship or plane",t:"mastery",u:12},
{w:"milestone",c:"B1",s:"NGSL",p:"noun",ar:"إنجاز بارز",een:"Reaching the border was a major milestone.",ear:"الوصول إلى الحدود كان إنجازاً بارزاً.",def:"an important event or achievement",t:"extended",u:12},
{w:"detour",c:"A2",s:"NGSL",p:"noun",ar:"التفاف",een:"We took a detour because of the flood.",ear:"أخذنا طريقاً التفافياً بسبب الفيضان.",def:"a longer route taken to avoid something",t:"extended",u:12},
{w:"stopover",c:"A2",s:"NGSL",p:"noun",ar:"توقف مؤقت",een:"We had a stopover in Dubai.",ear:"كان لدينا توقف مؤقت في دبي.",def:"a short stop during a long journey",t:"core",u:12},
{w:"customs",c:"A2",s:"CEFR-J",p:"noun",ar:"جمارك",een:"We waited at customs for an hour.",ear:"انتظرنا في الجمارك ساعة.",def:"the place at a border where bags are checked",t:"core",u:12},
{w:"pilgrim",c:"B1",s:"NGSL",p:"noun",ar:"حاج",een:"The pilgrim traveled to the holy city.",ear:"سافر الحاج إلى المدينة المقدسة.",def:"a person who travels for religious reasons",t:"mastery",u:12},
{w:"navigate",c:"A2",s:"CEFR-J",p:"verb",ar:"يبحر/يتنقل",een:"She navigated through the busy streets.",ear:"تنقلت عبر الشوارع المزدحمة.",def:"to find your way through a place",t:"extended",u:12},
{w:"stranded",c:"B1",s:"NGSL",p:"adjective",ar:"عالق",een:"They were stranded at the airport.",ear:"كانوا عالقين في المطار.",def:"stuck in a place with no way to leave",t:"mastery",u:12},
{w:"terrain",c:"B1",s:"NGSL",p:"noun",ar:"أرض/تضاريس",een:"The terrain changed from flat to rocky.",ear:"تغيرت التضاريس من مسطحة إلى صخرية.",def:"the physical features of an area of land",t:"extended",u:12},
{w:"nomadic",c:"B1",s:"NGSL",p:"adjective",ar:"بدوي/رحّال",een:"The nomadic tribe moves every season.",ear:"تتنقل القبيلة البدوية كل موسم.",def:"moving from place to place; not settled",t:"mastery",u:12},
{w:"campfire",c:"A1",s:"CEFR-J",p:"noun",ar:"نار مخيم",een:"They sat around the campfire at night.",ear:"جلسوا حول نار المخيم ليلاً.",def:"a fire made outdoors at a camp",t:"core",u:12},
{w:"shelter",c:"A2",s:"CEFR-J",p:"noun",ar:"مأوى",een:"They found shelter from the rain.",ear:"وجدوا مأوى من المطر.",def:"a place that protects you from weather",t:"core",u:12},
{w:"route",c:"A2",s:"CEFR-J",p:"noun",ar:"طريق/مسار",een:"We followed the shortest route.",ear:"اتبعنا أقصر طريق.",def:"a way from one place to another",t:"core",u:12},
{w:"embark",c:"B1",s:"NGSL",p:"verb",ar:"يشرع في",een:"They embarked on a new adventure.",ear:"شرعوا في مغامرة جديدة.",def:"to start a journey or new project",t:"mastery",u:12},

// === Unit 10: Water Crisis (+10) ===
{w:"drought",c:"A2",s:"CEFR-J",p:"noun",ar:"جفاف شديد",een:"The drought lasted for three months.",ear:"استمر الجفاف ثلاثة أشهر.",def:"a long period with no rain",t:"core",u:10},
{w:"sprinkler",c:"A2",s:"NGSL",p:"noun",ar:"رشاش",een:"The sprinkler waters the garden.",ear:"يروي الرشاش الحديقة.",def:"a device that sprays water",t:"extended",u:10},
{w:"rainwater",c:"A1",s:"CEFR-J",p:"noun",ar:"ماء مطر",een:"They collect rainwater in tanks.",ear:"يجمعون ماء المطر في خزانات.",def:"water that falls as rain",t:"core",u:10},
{w:"groundwater",c:"B1",s:"NGSL",p:"noun",ar:"مياه جوفية",een:"Groundwater is important for farming.",ear:"المياه الجوفية مهمة للزراعة.",def:"water found underground in rocks and soil",t:"mastery",u:10},
{w:"desalination",c:"B1",s:"NGSL",p:"noun",ar:"تحلية",een:"Desalination turns sea water into fresh water.",ear:"التحلية تحول ماء البحر إلى ماء عذب.",def:"removing salt from sea water",t:"mastery",u:10},
{w:"conserve",c:"A2",s:"CEFR-J",p:"verb",ar:"يوفر",een:"We must conserve water at home.",ear:"يجب أن نوفر الماء في المنزل.",def:"to use less of something to save it",t:"core",u:10},
{w:"irrigate",c:"B1",s:"NGSL",p:"verb",ar:"يسقي",een:"They irrigate crops with river water.",ear:"يسقون المحاصيل بمياه النهر.",def:"to supply water to land for growing food",t:"extended",u:10},
{w:"basin",c:"A2",s:"CEFR-J",p:"noun",ar:"حوض",een:"The river basin covers a large area.",ear:"يغطي حوض النهر مساحة كبيرة.",def:"a large area of land drained by a river",t:"extended",u:10},
{w:"filtration",c:"B1",s:"NGSL",p:"noun",ar:"ترشيح",een:"Water filtration removes dirt.",ear:"ترشيح الماء يزيل الأوساخ.",def:"cleaning water by passing it through a filter",t:"mastery",u:10},
{w:"hygiene",c:"A2",s:"CEFR-J",p:"noun",ar:"نظافة",een:"Good hygiene needs clean water.",ear:"النظافة الجيدة تحتاج ماء نظيف.",def:"keeping yourself and things clean for health",t:"core",u:10},

// === Unit 7: Digital Detox (+8) ===
{w:"bandwidth",c:"B1",s:"NGSL",p:"noun",ar:"عرض نطاق",een:"Low bandwidth makes video calls slow.",ear:"عرض النطاق المنخفض يبطئ مكالمات الفيديو.",def:"the amount of data an internet connection can handle",t:"mastery",u:7},
{w:"dopamine",c:"B1",s:"NGSL",p:"noun",ar:"دوبامين",een:"Social media triggers dopamine in your brain.",ear:"تحفز وسائل التواصل الدوبامين في دماغك.",def:"a brain chemical that makes you feel good",t:"mastery",u:7},
{w:"compulsive",c:"B1",s:"NGSL",p:"adjective",ar:"قهري",een:"Compulsive phone checking is a problem.",ear:"التحقق القهري من الهاتف مشكلة.",def:"unable to stop doing something",t:"mastery",u:7},
{w:"analog",c:"A2",s:"NGSL",p:"adjective",ar:"تماثلي/تقليدي",een:"She prefers an analog clock.",ear:"تفضل ساعة تقليدية.",def:"not digital; using older technology",t:"extended",u:7},
{w:"intentional",c:"B1",s:"NGSL",p:"adjective",ar:"مقصود",een:"Take an intentional break from screens.",ear:"خذ استراحة مقصودة من الشاشات.",def:"done on purpose; planned",t:"extended",u:7},
{w:"refresh",c:"A2",s:"CEFR-J",p:"verb",ar:"يُحدّث",een:"Stop refreshing your social media feed.",ear:"توقف عن تحديث موجز التواصل.",def:"to update or reload a page",t:"core",u:7},
{w:"isolate",c:"B1",s:"CEFR-J",p:"verb",ar:"يعزل",een:"Too much screen time can isolate people.",ear:"كثرة وقت الشاشة قد تعزل الناس.",def:"to separate from others; to be alone",t:"extended",u:7},
{w:"recharge",c:"A2",s:"CEFR-J",p:"verb",ar:"يُعيد شحن",een:"A walk in nature helps you recharge.",ear:"المشي في الطبيعة يساعدك على إعادة الشحن.",def:"to get energy back; to rest and recover",t:"core",u:7},

// === Unit 11: Street Art (+8) ===
{w:"graffiti",c:"A2",s:"CEFR-J",p:"noun",ar:"غرافيتي",een:"The graffiti on the bridge is colorful.",ear:"الغرافيتي على الجسر ملون.",def:"writing or drawings on walls in public",t:"core",u:11},
{w:"tag",c:"A2",s:"CEFR-J",p:"noun",ar:"توقيع فني",een:"The artist left his tag on the wall.",ear:"ترك الفنان توقيعه الفني على الجدار.",def:"an artist's signature or name in graffiti",t:"extended",u:11},
{w:"mural",c:"A2",s:"NGSL",p:"noun",ar:"لوحة جدارية",een:"The mural shows the history of the city.",ear:"تُظهر اللوحة الجدارية تاريخ المدينة.",def:"a large picture painted on a wall",t:"core",u:11},
{w:"passerby",c:"A2",s:"NGSL",p:"noun",ar:"عابر سبيل",een:"A passerby stopped to look at the art.",ear:"توقف عابر سبيل لينظر إلى الفن.",def:"a person who walks past something",t:"extended",u:11},
{w:"alley",c:"A2",s:"CEFR-J",p:"noun",ar:"زقاق",een:"The alley was full of colorful art.",ear:"كان الزقاق مليئاً بالفن الملون.",def:"a narrow street between buildings",t:"core",u:11},
{w:"pigment",c:"B1",s:"NGSL",p:"noun",ar:"صبغة",een:"The pigment gives the paint its color.",ear:"تعطي الصبغة الطلاء لونه.",def:"a substance that gives color to paint",t:"mastery",u:11},
{w:"installment",c:"B1",s:"NGSL",p:"noun",ar:"عمل فني تركيبي",een:"The art installment filled the whole room.",ear:"ملأ العمل الفني التركيبي الغرفة بأكملها.",def:"a piece of art set up in a specific place",t:"mastery",u:11},
{w:"provoke",c:"B1",s:"NGSL",p:"verb",ar:"يستفز",een:"Good art can provoke deep thinking.",ear:"الفن الجيد يمكن أن يستفز التفكير العميق.",def:"to cause a strong reaction or feeling",t:"mastery",u:11},

// === Unit 8: Mountain Adventures (+8) ===
{w:"campsite",c:"A2",s:"CEFR-J",p:"noun",ar:"موقع تخييم",een:"We set up the tent at the campsite.",ear:"نصبنا الخيمة في موقع التخييم.",def:"a place where people camp outdoors",t:"core",u:8},
{w:"boulder",c:"B1",s:"NGSL",p:"noun",ar:"صخرة كبيرة",een:"A large boulder blocked the path.",ear:"سدت صخرة كبيرة الطريق.",def:"a very large rock",t:"extended",u:8},
{w:"glacier",c:"B1",s:"NGSL",p:"noun",ar:"نهر جليدي",een:"The glacier moved slowly down the mountain.",ear:"تحرك النهر الجليدي ببطء أسفل الجبل.",def:"a large mass of ice on a mountain",t:"mastery",u:8},
{w:"canyon",c:"A2",s:"NGSL",p:"noun",ar:"وادٍ عميق",een:"The canyon was deep and narrow.",ear:"كان الوادي عميقاً وضيقاً.",def:"a deep valley with steep sides",t:"extended",u:8},
{w:"frostbite",c:"B1",s:"NGSL",p:"noun",ar:"عضة صقيع",een:"Frostbite can damage your fingers.",ear:"يمكن لعضة الصقيع أن تضر بأصابعك.",def:"injury caused by extreme cold",t:"mastery",u:8},
{w:"harness",c:"B1",s:"NGSL",p:"noun",ar:"حزام أمان",een:"Wear a harness when climbing.",ear:"ارتدِ حزام أمان عند التسلق.",def:"straps worn for safety during climbing",t:"extended",u:8},
{w:"expedition",c:"B1",s:"NGSL",p:"noun",ar:"رحلة استكشاف",een:"The mountain expedition started early.",ear:"بدأت رحلة استكشاف الجبل مبكراً.",def:"an organized journey to explore a place",t:"mastery",u:8},
{w:"gorge",c:"B1",s:"NGSL",p:"noun",ar:"مضيق",een:"The river flows through the gorge.",ear:"يتدفق النهر عبر المضيق.",def:"a narrow valley between hills or mountains",t:"mastery",u:8},

// === Unit 5: Hidden History (+6) ===
{w:"crypt",c:"B1",s:"NGSL",p:"noun",ar:"سرداب",een:"The crypt is below the old church.",ear:"السرداب أسفل الكنيسة القديمة.",def:"an underground room, often under a church",t:"mastery",u:5},
{w:"espionage",c:"B1",s:"NGSL",p:"noun",ar:"تجسس",een:"The story was about Cold War espionage.",ear:"كانت القصة عن تجسس الحرب الباردة.",def:"the activity of secretly getting information",t:"mastery",u:5},
{w:"cipher",c:"B1",s:"NGSL",p:"noun",ar:"شفرة",een:"They used a cipher to hide the message.",ear:"استخدموا شفرة لإخفاء الرسالة.",def:"a secret code used to write messages",t:"mastery",u:5},
{w:"forge",c:"B1",s:"NGSL",p:"verb",ar:"يزوّر",een:"Someone forged the king's signature.",ear:"قام شخص بتزوير توقيع الملك.",def:"to make a fake copy of something",t:"mastery",u:5},
{w:"smuggle",c:"B1",s:"NGSL",p:"verb",ar:"يهرّب",een:"They smuggled gold across the border.",ear:"هربوا الذهب عبر الحدود.",def:"to move things illegally and secretly",t:"extended",u:5},
{w:"testimony",c:"B1",s:"NGSL",p:"noun",ar:"شهادة",een:"Her testimony helped solve the mystery.",ear:"ساعدت شهادتها في حل اللغز.",def:"a statement about what you saw or know",t:"extended",u:5},

// === Unit 6: Future Cities (+6) ===
{w:"hologram",c:"B1",s:"NGSL",p:"noun",ar:"صورة مجسمة",een:"The hologram showed a 3D map of the city.",ear:"أظهرت الصورة المجسمة خريطة ثلاثية الأبعاد.",def:"a 3D image made with light",t:"mastery",u:6},
{w:"congestion",c:"B1",s:"NGSL",p:"noun",ar:"ازدحام",een:"Traffic congestion is a big problem.",ear:"الازدحام المروري مشكلة كبيرة.",def:"too many vehicles causing slow traffic",t:"extended",u:6},
{w:"rooftop",c:"A2",s:"CEFR-J",p:"noun",ar:"سطح",een:"They built a garden on the rooftop.",ear:"بنوا حديقة على السطح.",def:"the top surface of a building",t:"core",u:6},
{w:"inhabit",c:"B1",s:"NGSL",p:"verb",ar:"يسكن",een:"Millions of people inhabit this city.",ear:"يسكن ملايين الأشخاص هذه المدينة.",def:"to live in a place",t:"extended",u:6},
{w:"suburb",c:"A2",s:"CEFR-J",p:"noun",ar:"ضاحية",een:"They moved to a quiet suburb.",ear:"انتقلوا إلى ضاحية هادئة.",def:"an area outside the center of a city",t:"core",u:6},
{w:"module",c:"B1",s:"NGSL",p:"noun",ar:"وحدة",een:"The house is made from building modules.",ear:"المنزل مصنوع من وحدات بناء.",def:"a separate part that fits into a larger system",t:"mastery",u:6},

// === Unit 9: Film & Cinema (+6) ===
{w:"screenplay",c:"B1",s:"NGSL",p:"noun",ar:"سيناريو",een:"He wrote the screenplay for the movie.",ear:"كتب سيناريو الفيلم.",def:"the written text of a movie",t:"extended",u:9},
{w:"dub",c:"A2",s:"NGSL",p:"verb",ar:"يدبلج",een:"The movie was dubbed into Arabic.",ear:"تم دبلجة الفيلم إلى العربية.",def:"to replace the voices in a movie with another language",t:"extended",u:9},
{w:"climax",c:"B1",s:"NGSL",p:"noun",ar:"ذروة",een:"The climax of the movie was exciting.",ear:"ذروة الفيلم كانت مثيرة.",def:"the most exciting part of a story",t:"mastery",u:9},
{w:"villain",c:"A2",s:"CEFR-J",p:"noun",ar:"شرير",een:"The villain tried to steal the gold.",ear:"حاول الشرير سرقة الذهب.",def:"the bad character in a story or movie",t:"core",u:9},
{w:"nominee",c:"B1",s:"NGSL",p:"noun",ar:"مرشح",een:"The nominee won the best actor award.",ear:"فاز المرشح بجائزة أفضل ممثل.",def:"a person chosen for an award",t:"mastery",u:9},
{w:"stunt",c:"A2",s:"NGSL",p:"noun",ar:"مشهد خطير",een:"The stunt in the movie looked dangerous.",ear:"بدا المشهد الخطير في الفيلم خطيراً.",def:"a dangerous action done in a movie",t:"extended",u:9},

// === Unit 1: Brain & Memory (+3) ===
{w:"cognitive",c:"B1",s:"NGSL",p:"adjective",ar:"إدراكي",een:"Reading improves cognitive skills.",ear:"القراءة تحسن المهارات الإدراكية.",def:"related to thinking and understanding",t:"mastery",u:1},
{w:"subconscious",c:"B1",s:"NGSL",p:"adjective",ar:"لاواعٍ",een:"Some memories are stored in the subconscious.",ear:"بعض الذكريات مخزنة في اللاوعي.",def:"the part of mind you are not aware of",t:"mastery",u:1},
{w:"reflex",c:"B1",s:"NGSL",p:"noun",ar:"رد فعل",een:"Pulling your hand from fire is a reflex.",ear:"سحب يدك من النار رد فعل.",def:"an automatic body reaction",t:"extended",u:1},

// === Unit 2: Endangered Species (+3) ===
{w:"poach",c:"B1",s:"NGSL",p:"verb",ar:"يصطاد بشكل غير قانوني",een:"It is illegal to poach elephants.",ear:"صيد الفيلة بشكل غير قانوني محظور.",def:"to hunt animals illegally",t:"mastery",u:2},
{w:"sanctuary",c:"B1",s:"NGSL",p:"noun",ar:"محمية",een:"The birds live in a sanctuary.",ear:"تعيش الطيور في محمية.",def:"a safe place for animals",t:"extended",u:2},
{w:"captivity",c:"B1",s:"NGSL",p:"noun",ar:"أسر",een:"The tiger was born in captivity.",ear:"وُلد النمر في الأسر.",def:"being kept in a cage or enclosed space",t:"mastery",u:2},

// === Unit 3: Extreme Weather (+3) ===
{w:"humidity",c:"A2",s:"CEFR-J",p:"noun",ar:"رطوبة",een:"The humidity was very high today.",ear:"كانت الرطوبة عالية جداً اليوم.",def:"the amount of water in the air",t:"core",u:3},
{w:"forecast",c:"A2",s:"CEFR-J",p:"noun",ar:"توقعات الطقس",een:"The weather forecast says it will rain.",ear:"تقول توقعات الطقس أنها ستمطر.",def:"a prediction about future weather",t:"core",u:3},
{w:"hailstorm",c:"B1",s:"NGSL",p:"noun",ar:"عاصفة بَرَد",een:"The hailstorm damaged the cars.",ear:"أتلفت عاصفة البَرَد السيارات.",def:"a storm with small balls of ice",t:"mastery",u:3},

// === Unit 4: Fashion & Identity (+3) ===
{w:"accessory",c:"A2",s:"CEFR-J",p:"noun",ar:"إكسسوار",een:"A watch is a popular accessory.",ear:"الساعة إكسسوار شائع.",def:"something extra worn with clothes like a belt or hat",t:"core",u:4},
{w:"tailor",c:"A2",s:"CEFR-J",p:"noun",ar:"خياط",een:"The tailor made a new suit.",ear:"صنع الخياط بدلة جديدة.",def:"a person who makes or fixes clothes",t:"extended",u:4},
{w:"hem",c:"B1",s:"NGSL",p:"noun",ar:"حاشية",een:"The hem of the dress is too long.",ear:"حاشية الفستان طويلة جداً.",def:"the bottom edge of a piece of clothing",t:"mastery",u:4},
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
  for (const w of EXTRA2) {
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
  console.log('Projected L2 final:', 255 + total);

  const pu = await c.query('SELECT recommended_unit AS u, COUNT(*) AS c FROM vocab_staging_l2 GROUP BY recommended_unit ORDER BY recommended_unit');
  const existing = [23,24,25,24,23,23,22,23,24,23,25,24];
  let minUnit = 999;
  pu.rows.forEach(r => {
    const t = parseInt(r.c) + existing[r.u-1];
    if (t < minUnit) minUnit = t;
    console.log('Unit '+r.u+': '+r.c+' staged + '+existing[r.u-1]+' = '+t);
  });
  console.log('Min per-unit:', minUnit);
  console.log('All >=90:', minUnit >= 90 ? 'YES' : 'NO');

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
