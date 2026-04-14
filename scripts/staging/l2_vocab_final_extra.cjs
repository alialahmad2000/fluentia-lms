const {Client} = require('pg');

// Final targeted batch — ~60 truly unique words
const FINAL = [
// Unit 12: Remarkable Journeys (+8 to reach 94)
{w:"layover",c:"A2",s:"NGSL",p:"noun",ar:"توقف بين رحلتين",een:"We had a four-hour layover in Istanbul.",ear:"كان لدينا توقف أربع ساعات في إسطنبول.",def:"a stop between connecting flights",t:"extended",u:12},
{w:"roam",c:"A2",s:"CEFR-J",p:"verb",ar:"يتجوّل",een:"Sheep roam freely on the hills.",ear:"تتجول الأغنام بحرية على التلال.",def:"to move around without a fixed plan",t:"core",u:12},
{w:"memoir",c:"B1",s:"NGSL",p:"noun",ar:"مذكرات",een:"She wrote a memoir about her travels.",ear:"كتبت مذكرات عن رحلاتها.",def:"a book about your own life experiences",t:"mastery",u:12},
{w:"disembark",c:"B1",s:"NGSL",p:"verb",ar:"ينزل من سفينة",een:"Passengers disembarked at the port.",ear:"نزل الركاب في الميناء.",def:"to get off a ship or aircraft",t:"mastery",u:12},
{w:"homecoming",c:"A2",s:"NGSL",p:"noun",ar:"عودة إلى الوطن",een:"The homecoming was very emotional.",ear:"كانت العودة إلى الوطن مؤثرة جداً.",def:"returning to your home after being away",t:"extended",u:12},
{w:"farewell",c:"A2",s:"CEFR-J",p:"noun",ar:"وداع",een:"They said farewell at the airport.",ear:"ودعوا بعضهم في المطار.",def:"a goodbye when someone is leaving",t:"core",u:12},
{w:"traverse",c:"B1",s:"NGSL",p:"verb",ar:"يعبر",een:"They traversed the mountain pass.",ear:"عبروا ممر الجبل.",def:"to travel across an area",t:"mastery",u:12},
{w:"getaway",c:"A2",s:"NGSL",p:"noun",ar:"رحلة قصيرة",een:"We planned a weekend getaway.",ear:"خططنا لرحلة قصيرة في نهاية الأسبوع.",def:"a short holiday or escape",t:"core",u:12},

// Unit 10: Water Crisis (+5 to reach 104)
{w:"watershed",c:"B1",s:"NGSL",p:"noun",ar:"مستجمع مائي",een:"The watershed feeds several rivers.",ear:"يغذي المستجمع المائي عدة أنهار.",def:"an area of land that collects rainwater into rivers",t:"mastery",u:10},
{w:"cistern",c:"B1",s:"NGSL",p:"noun",ar:"صهريج",een:"The old cistern stored rainwater.",ear:"خزّن الصهريج القديم مياه الأمطار.",def:"a tank for storing water",t:"mastery",u:10},
{w:"arid",c:"B1",s:"NGSL",p:"adjective",ar:"جاف",een:"The arid land needs more water.",ear:"الأرض الجافة تحتاج المزيد من الماء.",def:"very dry with little rain",t:"extended",u:10},
{w:"runoff",c:"B1",s:"NGSL",p:"noun",ar:"مياه جريان سطحي",een:"Rainwater runoff flows into the river.",ear:"تتدفق مياه الجريان السطحي إلى النهر.",def:"water that flows over land into rivers",t:"mastery",u:10},
{w:"brackish",c:"B1",s:"NGSL",p:"adjective",ar:"مالح قليلاً",een:"The brackish water is not safe to drink.",ear:"الماء المالح قليلاً ليس آمناً للشرب.",def:"slightly salty water",t:"mastery",u:10},

// Unit 7: Digital Detox (+5 to reach 103)
{w:"scrolling",c:"A2",s:"NGSL",p:"noun",ar:"التمرير",een:"Endless scrolling wastes your time.",ear:"التمرير اللانهائي يضيع وقتك.",def:"moving up and down on a screen",t:"core",u:7},
{w:"wellness",c:"A2",s:"NGSL",p:"noun",ar:"صحة ورفاهية",een:"Technology affects our wellness.",ear:"التكنولوجيا تؤثر على صحتنا ورفاهيتنا.",def:"the state of being healthy in body and mind",t:"extended",u:7},
{w:"mindfulness",c:"B1",s:"NGSL",p:"noun",ar:"يقظة ذهنية",een:"Mindfulness helps reduce phone use.",ear:"اليقظة الذهنية تساعد في تقليل استخدام الهاتف.",def:"paying attention to the present moment",t:"mastery",u:7},
{w:"eyestrain",c:"A2",s:"NGSL",p:"noun",ar:"إجهاد العين",een:"Screens can cause eyestrain.",ear:"يمكن للشاشات أن تسبب إجهاد العين.",def:"tiredness and pain in the eyes from too much screen use",t:"extended",u:7},
{w:"analog",c:"A2",s:"NGSL",p:"noun",ar:"شيء تقليدي",een:"Books are a great analog alternative.",ear:"الكتب بديل تقليدي رائع.",def:"something non-digital or traditional",t:"core",u:7},

// Unit 11: Street Art (+5 to reach 108)
{w:"aerosol",c:"B1",s:"NGSL",p:"noun",ar:"رذاذ",een:"He used aerosol cans for the painting.",ear:"استخدم علب الرذاذ للرسم.",def:"a spray can used for paint",t:"extended",u:11},
{w:"commission",c:"B1",s:"NGSL",p:"verb",ar:"يكلّف بعمل",een:"The city commissioned a new mural.",ear:"كلّفت المدينة بجدارية جديدة.",def:"to officially ask someone to create something",t:"mastery",u:11},
{w:"facade",c:"B1",s:"NGSL",p:"noun",ar:"واجهة مبنى",een:"The art covers the building facade.",ear:"يغطي الفن واجهة المبنى.",def:"the front wall of a building",t:"extended",u:11},
{w:"renovation",c:"A2",s:"CEFR-J",p:"noun",ar:"تجديد حضري",een:"Street art is part of the renovation.",ear:"فن الشارع جزء من التجديد.",def:"the process of improving a building or area",t:"extended",u:11},
{w:"showcase",c:"A2",s:"CEFR-J",p:"verb",ar:"يعرض",een:"The festival showcases local artists.",ear:"يعرض المهرجان فنانين محليين.",def:"to show or display something proudly",t:"core",u:11},

// Unit 8: Mountain Adventures (+5 to reach 110)
{w:"bivouac",c:"B1",s:"NGSL",p:"noun",ar:"مبيت في العراء",een:"The climbers set up a bivouac.",ear:"نصب المتسلقون مبيتاً في العراء.",def:"a temporary camp without tents",t:"mastery",u:8},
{w:"cairn",c:"B1",s:"NGSL",p:"noun",ar:"كومة حجارة",een:"Follow the cairns to find the trail.",ear:"اتبع أكوام الحجارة لإيجاد المسار.",def:"a pile of stones marking a path",t:"mastery",u:8},
{w:"ravine",c:"B1",s:"NGSL",p:"noun",ar:"وادٍ ضيق",een:"The ravine was dark and deep.",ear:"كان الوادي الضيق مظلماً وعميقاً.",def:"a deep narrow valley",t:"extended",u:8},
{w:"treeline",c:"B1",s:"NGSL",p:"noun",ar:"خط الأشجار",een:"No trees grow above the treeline.",ear:"لا تنمو أشجار فوق خط الأشجار.",def:"the highest point where trees can grow",t:"extended",u:8},
{w:"switchback",c:"B1",s:"NGSL",p:"noun",ar:"منعطف حاد",een:"The trail had many switchbacks.",ear:"كان في المسار منعطفات حادة كثيرة.",def:"a sharp zigzag turn on a mountain path",t:"mastery",u:8},

// Unit 5: Hidden History (+5 to reach 115)
{w:"relic",c:"B1",s:"NGSL",p:"noun",ar:"أثر قديم",een:"The relic was found in the desert.",ear:"عُثر على الأثر القديم في الصحراء.",def:"an object from the distant past",t:"extended",u:5},
{w:"chronicle",c:"B1",s:"NGSL",p:"noun",ar:"سجل تاريخي",een:"The chronicle describes ancient events.",ear:"يصف السجل التاريخي أحداثاً قديمة.",def:"a written record of events in order",t:"mastery",u:5},
{w:"excavation",c:"B1",s:"NGSL",p:"noun",ar:"تنقيب",een:"The excavation revealed old walls.",ear:"كشف التنقيب عن جدران قديمة.",def:"digging to find buried objects from the past",t:"mastery",u:5},
{w:"anonymous",c:"A2",s:"CEFR-J",p:"adjective",ar:"مجهول",een:"The letter was from an anonymous writer.",ear:"كانت الرسالة من كاتب مجهول.",def:"with an unknown name or identity",t:"extended",u:5},
{w:"treason",c:"B1",s:"NGSL",p:"noun",ar:"خيانة",een:"The spy was accused of treason.",ear:"اتُّهم الجاسوس بالخيانة.",def:"the crime of acting against your own country",t:"mastery",u:5},

// Unit 6: Future Cities (+3)
{w:"retrofit",c:"B1",s:"NGSL",p:"verb",ar:"يُحدّث مبنى",een:"They retrofitted old buildings with solar panels.",ear:"حدّثوا المباني القديمة بألواح شمسية.",def:"to add new parts to an old building or machine",t:"mastery",u:6},
{w:"megacity",c:"B1",s:"NGSL",p:"noun",ar:"مدينة ضخمة",een:"Tokyo is a megacity with millions of people.",ear:"طوكيو مدينة ضخمة بملايين السكان.",def:"a very large city with over ten million people",t:"extended",u:6},
{w:"zoning",c:"B1",s:"NGSL",p:"noun",ar:"تقسيم مناطق",een:"Zoning laws control building types.",ear:"قوانين تقسيم المناطق تتحكم في أنواع المباني.",def:"rules about what can be built where",t:"mastery",u:6},

// Unit 9: Film & Cinema (+3)
{w:"montage",c:"B1",s:"NGSL",p:"noun",ar:"مونتاج",een:"The montage showed years passing quickly.",ear:"أظهر المونتاج مرور السنوات بسرعة.",def:"a series of images or clips edited together",t:"mastery",u:9},
{w:"cameo",c:"B1",s:"NGSL",p:"noun",ar:"ظهور خاطف",een:"The famous singer made a cameo in the film.",ear:"ظهر المغني الشهير ظهوراً خاطفاً في الفيلم.",def:"a brief appearance by a famous person in a movie",t:"mastery",u:9},
{w:"flashback",c:"A2",s:"NGSL",p:"noun",ar:"استرجاع",een:"The movie had a flashback to the past.",ear:"كان في الفيلم استرجاع للماضي.",def:"a scene showing something that happened before",t:"extended",u:9},
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
  for (const w of FINAL) {
    if (all.has(w.w.toLowerCase())) { console.log('SKIP:', w.w); skipped++; continue; }
    try {
      await c.query('INSERT INTO vocab_staging_l2 (word,cefr_level,source_list,pos,meaning_ar,example_en,example_ar,definition_en,recommended_tier,recommended_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
        [w.w,w.c,w.s,w.p,w.ar,w.een,w.ear,w.def,w.t,w.u]);
      added++;
    } catch(e) { console.error('ERR:', w.w, e.message); }
  }
  console.log('Added:', added, 'Skipped:', skipped);

  // Final summary
  const cnt = await c.query('SELECT COUNT(*) AS c FROM vocab_staging_l2');
  const total = parseInt(cnt.rows[0].c);
  console.log('\nTotal staged:', total);
  console.log('Projected L2 final:', 255 + total);

  const pu = await c.query('SELECT recommended_unit AS u, COUNT(*) AS c FROM vocab_staging_l2 GROUP BY recommended_unit ORDER BY recommended_unit');
  const existing = [23,24,25,24,23,23,22,23,24,23,25,24];
  let minUnit = 999;
  pu.rows.forEach(r => {
    const t = parseInt(r.c) + existing[r.u-1];
    if (t < minUnit) minUnit = t;
    console.log('Unit '+r.u+': '+r.c+' staged + '+existing[r.u-1]+' = '+t);
  });
  console.log('\nMin per-unit:', minUnit, '(target >=90)');
  console.log('>=1300:', (255 + total) >= 1300 ? 'YES' : 'NO - need ' + (1300 - 255 - total) + ' more');

  // CEFR breakdown
  const cefr = await c.query("SELECT cefr_level, COUNT(*) AS c FROM vocab_staging_l2 GROUP BY cefr_level ORDER BY cefr_level");
  console.log('\nCEFR:', cefr.rows.map(r => r.cefr_level + '=' + r.c).join(', '));

  // Tier breakdown
  const tier = await c.query("SELECT recommended_tier, COUNT(*) AS c FROM vocab_staging_l2 GROUP BY recommended_tier ORDER BY recommended_tier");
  console.log('Tiers:', tier.rows.map(r => r.recommended_tier + '=' + r.c).join(', '));

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
