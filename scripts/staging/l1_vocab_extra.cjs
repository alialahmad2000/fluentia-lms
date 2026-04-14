const {Client} = require('pg');

const EXTRA = [
// Unit 5 (6 more)
{w:'fountain',c:'A2',s:'CEFR-J',p:'noun',ar:'نافورة',een:'The fountain is in the square.',ear:'النافورة في الساحة.',t:'extended',u:5},
{w:'balcony',c:'A2',s:'CEFR-J',p:'noun',ar:'شرفة',een:'The balcony has a nice view.',ear:'الشرفة لها إطلالة جميلة.',t:'extended',u:5},
{w:'courtyard',c:'A2',s:'NGSL',p:'noun',ar:'فناء',een:'The courtyard is very large.',ear:'الفناء كبير جداً.',t:'extended',u:5},
{w:'staircase',c:'A2',s:'NGSL',p:'noun',ar:'درج',een:'The staircase is very long.',ear:'الدرج طويل جداً.',t:'extended',u:5},
{w:'pillar',c:'A2',s:'NGSL',p:'noun',ar:'عمود',een:'The pillar is made of stone.',ear:'العمود مصنوع من الحجر.',t:'mastery',u:5},
{w:'mosaic',c:'A2',s:'NGSL',p:'noun',ar:'فسيفساء',een:'The mosaic is very colorful.',ear:'الفسيفساء ملونة جداً.',t:'mastery',u:5},
// Unit 8 (7 more)
{w:'shield',c:'A2',s:'CEFR-J',p:'noun',ar:'درع واقي',een:'The warrior held a shield.',ear:'حمل المحارب درعاً واقياً.',t:'extended',u:8},
{w:'throne',c:'A2',s:'NGSL',p:'noun',ar:'عرش',een:'The king sat on the throne.',ear:'جلس الملك على العرش.',t:'extended',u:8},
{w:'siege',c:'A2',s:'NGSL',p:'noun',ar:'حصار',een:'The siege lasted many months.',ear:'استمر الحصار أشهراً كثيرة.',t:'mastery',u:8},
{w:'scribe',c:'A2',s:'NGSL',p:'noun',ar:'كاتب',een:'The scribe wrote on papyrus.',ear:'كتب الكاتب على ورق البردي.',t:'mastery',u:8},
{w:'irrigation',c:'A2',s:'NGSL',p:'noun',ar:'ري',een:'Irrigation helped the farms.',ear:'ساعد الري المزارع.',t:'extended',u:8},
{w:'decree',c:'A2',s:'NGSL',p:'noun',ar:'مرسوم',een:'The king issued a decree.',ear:'أصدر الملك مرسوماً.',t:'mastery',u:8},
{w:'papyrus',c:'A2',s:'NGSL',p:'noun',ar:'ورق بردي',een:'They wrote on papyrus.',ear:'كتبوا على ورق البردي.',t:'mastery',u:8},
// Unit 11 (4 more)
{w:'meme',c:'A2',s:'NGSL',p:'noun',ar:'ميم',een:'The meme was very funny.',ear:'كان الميم مضحكاً جداً.',t:'extended',u:11},
{w:'screenshot',c:'A2',s:'NGSL',p:'noun',ar:'لقطة شاشة',een:'Take a screenshot of the page.',ear:'التقط لقطة شاشة للصفحة.',t:'extended',u:11},
{w:'repost',c:'A2',s:'NGSL',p:'verb',ar:'يعيد النشر',een:'She reposted the article.',ear:'أعادت نشر المقال.',t:'extended',u:11},
{w:'troll',c:'A2',s:'NGSL',p:'noun',ar:'متصيد',een:'Do not reply to the troll.',ear:'لا ترد على المتصيد.',t:'mastery',u:11},
// Unit 12 (6 more)
{w:'landfill',c:'A2',s:'NGSL',p:'noun',ar:'مكب نفايات',een:'The landfill is almost full.',ear:'مكب النفايات ممتلئ تقريباً.',t:'extended',u:12},
{w:'drought',c:'A2',s:'NGSL',p:'noun',ar:'جفاف',een:'The drought killed many crops.',ear:'قتل الجفاف محاصيل كثيرة.',t:'extended',u:12},
{w:'fossil fuel',c:'A2',s:'NGSL',p:'noun',ar:'وقود أحفوري',een:'Fossil fuel pollutes the air.',ear:'الوقود الأحفوري يلوث الهواء.',t:'extended',u:12},
{w:'wildlife',c:'A2',s:'CEFR-J',p:'noun',ar:'حياة برية',een:'We must protect wildlife.',ear:'يجب أن نحمي الحياة البرية.',t:'extended',u:12},
{w:'glacier',c:'A2',s:'NGSL',p:'noun',ar:'نهر جليدي',een:'The glacier is melting fast.',ear:'النهر الجليدي يذوب بسرعة.',t:'mastery',u:12},
{w:'ozone',c:'A2',s:'NGSL',p:'noun',ar:'أوزون',een:'The ozone layer protects us.',ear:'طبقة الأوزون تحمينا.',t:'mastery',u:12},
// Unit 3 (3 more)
{w:'lunar',c:'A2',s:'NGSL',p:'adjective',ar:'قمري',een:'It was a lunar eclipse.',ear:'كان كسوفاً قمرياً.',t:'extended',u:3},
{w:'probe',c:'A2',s:'NGSL',p:'noun',ar:'مسبار',een:'The probe reached Jupiter.',ear:'وصل المسبار إلى المشتري.',t:'mastery',u:3},
{w:'asteroid',c:'A2',s:'NGSL',p:'noun',ar:'كويكب',een:'The asteroid passed near Earth.',ear:'مر الكويكب بالقرب من الأرض.',t:'mastery',u:3},
// Unit 2 (1 more)
{w:'anchor',c:'A2',s:'CEFR-J',p:'noun',ar:'مرساة',een:'The ship dropped its anchor.',ear:'أنزلت السفينة مرساتها.',t:'extended',u:2},
// Unit 6 (3 more)
{w:'circuit',c:'A2',s:'NGSL',p:'noun',ar:'دائرة كهربائية',een:'The circuit is broken.',ear:'الدائرة الكهربائية مكسورة.',t:'extended',u:6},
{w:'sensor',c:'A2',s:'NGSL',p:'noun',ar:'مستشعر',een:'The sensor detects movement.',ear:'يكشف المستشعر الحركة.',t:'extended',u:6},
{w:'turbine',c:'A2',s:'NGSL',p:'noun',ar:'توربين',een:'The wind turbine produces energy.',ear:'ينتج توربين الرياح الطاقة.',t:'mastery',u:6},
// Unit 7 (3 more)
{w:'penalty',c:'A2',s:'CEFR-J',p:'noun',ar:'ركلة جزاء',een:'He scored from a penalty.',ear:'سجل من ركلة جزاء.',t:'extended',u:7},
{w:'marathon',c:'A2',s:'NGSL',p:'noun',ar:'ماراثون',een:'She ran the full marathon.',ear:'ركضت الماراثون الكامل.',t:'extended',u:7},
{w:'semifinal',c:'A2',s:'NGSL',p:'noun',ar:'نصف النهائي',een:'They won the semifinal.',ear:'فازوا بنصف النهائي.',t:'extended',u:7},
// Unit 9 (3 more)
{w:'aperture',c:'A2',s:'NGSL',p:'noun',ar:'فتحة العدسة',een:'Adjust the aperture for more light.',ear:'اضبط فتحة العدسة لمزيد من الضوء.',t:'mastery',u:9},
{w:'macro',c:'A2',s:'NGSL',p:'adjective',ar:'مقرب',een:'She took a macro photo of a flower.',ear:'التقطت صورة مقربة لزهرة.',t:'mastery',u:9},
{w:'timelapse',c:'A2',s:'NGSL',p:'noun',ar:'تصوير متتابع',een:'He made a timelapse video.',ear:'صنع فيديو تصوير متتابع.',t:'mastery',u:9},
// Unit 10 (1 more)
{w:'blanch',c:'A2',s:'NGSL',p:'verb',ar:'يسلق خفيفاً',een:'Blanch the vegetables quickly.',ear:'اسلق الخضروات بسرعة.',t:'mastery',u:10},
// Unit 1 (no extras needed, already at 40)
// Unit 4 (no extras needed, already at 40)
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

  const ex = await c.query("SELECT DISTINCT LOWER(v.word) AS w FROM curriculum_vocabulary v JOIN curriculum_readings r ON r.id = v.reading_id JOIN curriculum_units u ON u.id = r.unit_id WHERE u.level_id IN ('cd96175e-76d4-48dc-b34f-83f3228a28b8', '2755b494-c7ff-4bdc-96ac-7ab735dc038c')");
  const staged = await c.query('SELECT LOWER(word) AS w FROM vocab_staging_l1');
  const all = new Set([...ex.rows.map(r=>r.w), ...staged.rows.map(r=>r.w)]);

  let added = 0;
  for (const w of EXTRA) {
    if (all.has(w.w.toLowerCase())) { console.log('SKIP (exists):', w.w); continue; }
    try {
      await c.query('INSERT INTO vocab_staging_l1 (word,cefr_level,source_list,pos,meaning_ar,example_en,example_ar,recommended_tier,recommended_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING',
        [w.w,w.c,w.s,w.p,w.ar,w.een,w.ear,w.t,w.u]);
      added++;
    } catch(e) { console.error('ERR:', w.w, e.message); }
  }
  console.log('Added extra:', added);

  const cnt = await c.query('SELECT COUNT(*) AS c FROM vocab_staging_l1');
  console.log('Total staged now:', cnt.rows[0].c);
  console.log('Projected L1 final:', 177 + parseInt(cnt.rows[0].c));

  const pu = await c.query('SELECT recommended_unit AS u, COUNT(*) AS c FROM vocab_staging_l1 GROUP BY recommended_unit ORDER BY recommended_unit');
  const existing_per_unit = [18,20,20,19,18,19,16,19,20,20,19,18];
  pu.rows.forEach(r => {
    const total = parseInt(r.c) + existing_per_unit[r.u-1];
    console.log('Unit ' + r.u + ': ' + r.c + ' staged + ' + existing_per_unit[r.u-1] + ' existing = ' + total + ' total');
  });

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
