const {Client} = require('pg');

const WORDS = [
{w:'postpone',c:'A2',s:'CEFR-J',p:'verb',ar:'يؤجل',een:'We postponed the trip because of rain.',ear:'أجلنا الرحلة بسبب المطر.',def:'to move an event to a later time',t:'core',u:12},
{w:'foggy',c:'A2',s:'CEFR-J',p:'adjective',ar:'ضبابي',een:'It was too foggy to drive.',ear:'كان الجو ضبابياً جداً للقيادة.',def:'when thick cloud covers the ground',t:'core',u:3},
{w:'silk',c:'A2',s:'CEFR-J',p:'noun',ar:'حرير',een:'The dress is made of silk.',ear:'الفستان مصنوع من الحرير.',def:'a smooth soft cloth',t:'core',u:4},
{w:'fiber',c:'A2',s:'CEFR-J',p:'noun',ar:'ألياف',een:'Cotton is a natural fiber.',ear:'القطن ألياف طبيعية.',def:'thin threads used to make cloth',t:'extended',u:4},
{w:'sprout',c:'A2',s:'NGSL',p:'verb',ar:'ينبت',een:'Seeds sprout in warm soil.',ear:'تنبت البذور في التربة الدافئة.',def:'to begin to grow',t:'core',u:10},
{w:'creek',c:'A2',s:'NGSL',p:'noun',ar:'جدول ماء',een:'The creek flows through the forest.',ear:'يتدفق الجدول عبر الغابة.',def:'a small narrow stream',t:'core',u:10},
{w:'puddle',c:'A2',s:'NGSL',p:'noun',ar:'بركة ماء',een:'Children love jumping in puddles.',ear:'يحب الأطفال القفز في البرك.',def:'a small pool of water on the ground',t:'core',u:10},
{w:'pixelate',c:'B1',s:'NGSL',p:'verb',ar:'يجعل منقطاً',een:'The image was pixelated and unclear.',ear:'كانت الصورة منقطة وغير واضحة.',def:'to make an image look blocky',t:'mastery',u:11},
{w:'wheatpaste',c:'B1',s:'NGSL',p:'noun',ar:'لصق ورقي',een:'Artists use wheatpaste to stick posters.',ear:'يستخدم الفنانون اللصق الورقي لتثبيت الملصقات.',def:'a glue made from flour for street art',t:'mastery',u:11},
{w:'foothill',c:'A2',s:'NGSL',p:'noun',ar:'سفح',een:'The village is in the foothills.',ear:'القرية في السفوح.',def:'low hills at the base of a mountain',t:'core',u:8},
{w:'rappelling',c:'B1',s:'NGSL',p:'noun',ar:'هبوط بالحبل',een:'Rappelling down the cliff was scary.',ear:'كان الهبوط بالحبل مخيفاً.',def:'going down a rock face using ropes',t:'mastery',u:8},
{w:'ransack',c:'B1',s:'NGSL',p:'verb',ar:'ينهب',een:'Thieves ransacked the ancient temple.',ear:'نهب اللصوص المعبد القديم.',def:'to search a place roughly and cause damage',t:'mastery',u:5},
{w:'passcode',c:'A2',s:'NGSL',p:'noun',ar:'رمز مرور',een:'Change your phone passcode regularly.',ear:'غيّر رمز مرور هاتفك بانتظام.',def:'a secret number to unlock a device',t:'core',u:7},
{w:'synapse',c:'B1',s:'NGSL',p:'noun',ar:'تشابك عصبي',een:'Synapses connect brain cells.',ear:'التشابكات العصبية تربط خلايا الدماغ.',def:'the connection between two brain cells',t:'mastery',u:1},
{w:'poacher',c:'B1',s:'NGSL',p:'noun',ar:'صياد غير شرعي',een:'Rangers arrested the poacher.',ear:'اعتقل الحراس الصياد غير الشرعي.',def:'a person who hunts animals illegally',t:'mastery',u:2},
{w:'turbulence',c:'B1',s:'NGSL',p:'noun',ar:'اضطراب جوي',een:'The plane hit turbulence over the sea.',ear:'واجهت الطائرة اضطراباً جوياً فوق البحر.',def:'rough movement of air that shakes a plane',t:'mastery',u:3},
{w:'drizzle',c:'A2',s:'NGSL',p:'noun',ar:'رذاذ مطر',een:'A light drizzle fell all morning.',ear:'تساقط رذاذ خفيف طوال الصباح.',def:'very light rain',t:'core',u:3},
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
  const st = await c.query('SELECT LOWER(word) AS w FROM vocab_staging_l2');
  const all = new Set([...ex.rows.map(r=>r.w), ...st.rows.map(r=>r.w)]);

  let added = 0;
  for (const w of WORDS) {
    if (all.has(w.w.toLowerCase())) { console.log('SKIP:', w.w); continue; }
    await c.query('INSERT INTO vocab_staging_l2 (word,cefr_level,source_list,pos,meaning_ar,example_en,example_ar,definition_en,recommended_tier,recommended_unit) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
      [w.w,w.c,w.s,w.p,w.ar,w.een,w.ear,w.def,w.t,w.u]);
    added++;
  }
  console.log('Added:', added);

  const cnt = await c.query('SELECT COUNT(*) AS c FROM vocab_staging_l2');
  const total = parseInt(cnt.rows[0].c);
  console.log('Total staged:', total, '| Projected:', 255 + total, '| Target 1300:', (255+total)>=1300?'MET':'need '+(1300-255-total));

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
