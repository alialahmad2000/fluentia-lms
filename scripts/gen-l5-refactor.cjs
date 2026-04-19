#!/usr/bin/env node
'use strict';
require('dotenv').config({ path: 'C:/Users/Dr. Ali/Desktop/fluentia-lms/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// L5 (C1) — احتراف — fixes mostly for c1_specificity; some c1+c4
const L5_REFACTOR = [
  {
    id: '170ce97d-b211-4b25-b19e-fe9fc22fb71b', // Unit 1: Civilization Collapse — fails c1 + c4
    why_matters: 'في ندوة تاريخ مقارن في جامعة لندن، تختارين الأندلس لتحليلها بينما اختارت زميلاتكِ روما والمايا. البروفيسور ينتظر تحليلكِ الأول. هذه الوحدة تُعطيكِ اللغة التي يُكتب بها التاريخ لا التي يُقرأ بها فقط.',
    outcomes: [
      'تُحلّلين انهيار حضارة واحدة بمنهج مقارن تستخدمين فيه نظريتين متنافستين',
      'تكتبين مقالاً تحليلياً من ثلاثمئة كلمة يُفسّر سقوط نظام سياسي بعوامل متشابكة',
      'تناقشين نظرية تاريخية جدلية أمام مجموعة وتُقدّمين أدلتكِ في دقيقتين',
      'تقرئين مصدراً تاريخياً أولياً وتُميّزين بين الحقيقة والتفسير والتحيز فيه',
      'تردّين على أطروحة مُبسِّطة لانهيار حضارة بتحليل يُظهر تعقيد الأسباب',
    ],
  },
  {
    id: 'f14cdead-a656-4d15-9fee-838abb26822b', // Unit 2: Extreme Achievement — fails c1
    why_matters: 'في ورشة إدارة الأداء المؤسسي مع فريق من المدراء في شركتكِ، يُطلب منكِ تحليل سيكولوجيا الإنجاز المتطرف وتطبيقها على بيئة العمل. المجموعة تنتظر مداخلتكِ. قبل هذه الوحدة: تُقدّمين أمثلة. بعدها: تُقدّمين نموذجاً قابلاً للتطبيق.',
    outcomes: null,
  },
  {
    id: 'e707f4f6-1c58-484f-8f94-b1cfe543920e', // Unit 3: Scientific Skepticism — fails c1
    why_matters: 'في اجتماع فريق البحث في مستشفى أكاديمي، يُعرض عليكِ دراسة تزعم ارتباطاً بين مكوّن غذائي وتراجع الذاكرة. الفريق مُنبهر والطبيب الأول يريد التوصية العلاجية فوراً. قبل هذه الوحدة: تُومئين. بعدها: أنتِ من تُوقف الاجتماع بثلاثة أسئلة منهجية.',
    outcomes: null,
  },
  {
    id: '30a2b8b2-b368-4e16-869d-b3a137071340', // Unit 6: Biodiversity Crisis — fails c1
    why_matters: 'في مؤتمر المناخ الأممي الذي تُمثّلين فيه مؤسستكِ، يُطرح قرار مُلزِم لحماية التنوع البيولوجي. الصياغة الغامضة تُهدد المصالح والحماية معاً. تُطلب منكِ كلمة ثلاث دقائق أمام الوفود. هذه الوحدة تُعطيكِ لغة القرار الأممي.',
    outcomes: null,
  },
  {
    id: '23f63e6e-487f-4588-86de-8a123c5226e9', // Unit 7: Neuroscience Frontiers — fails c1 + c4
    why_matters: 'في محاضرة علم الأعصاب التطبيقي في جامعتكِ، يُطرح سؤال فلسفي حاد: هل الإرادة الحرة وهم عصبي؟ البروفيسور يُشير إليكِ بالاسم ويطلب موقفكِ. قبل هذه الوحدة: مقدمة عامة. بعدها: حجة مُنظَّمة تُفاجئ المحاضر.',
    outcomes: [
      'تُحلّلين نظرية عصبية معاصرة عن الوعي وتُعرضين نقدين مضادّين لها',
      'تكتبين مقالاً فلسفياً علمياً من ثلاثمئة كلمة عن الإرادة الحرة من منظور عصبي',
      'تناقشين التداعيات الأخلاقية لاكتشاف عصبي حديث أمام جمهور متخصص',
      'تقرئين ورقة علمية عصبية معقدة وتُميّزين بين نتائجها وتأويلاتها',
      'تردّين على موقف اختزالي عصبي بتحليل يُوازن بين البيولوجيا والمعرفة والسياق الاجتماعي',
    ],
  },
  {
    id: '00ca3625-46ee-4e38-95da-2255f522aff8', // Unit 8: Swarm Intelligence — fails c1
    why_matters: 'في اجتماع استراتيجي مع شركة تقنية دولية، يُقترح نموذج إدارة لامركزي مستوحى من ذكاء الأسراب. مديركِ يسألكِ مباشرة: Does this work in large organizations? قبل هذه الوحدة: رأي غامض. بعدها: تقييم مُعلَّل بأمثلة من بيولوجيا الأسراب والتطبيق المؤسسي.',
    outcomes: null,
  },
  {
    id: 'b24ae7ba-d335-47ef-a4ac-6dbdf930fdb7', // Unit 9: Creative Genius — fails c1
    why_matters: 'في ورشة إبداع وابتكار مع فريق بحث وتطوير، يُطلب منكِ تصميم بيئة تحتضن العبقرية الإبداعية في المؤسسة. المجموعة تنتظر نموذجكِ. قبل هذه الوحدة: مبادئ عامة. بعدها: بيئة مبنية على نظريات نفسية واجتماعية صارمة ومُقنِعة.',
    outcomes: null,
  },
  {
    id: '2105dec8-575b-4a6a-8456-261b98a9d6c2', // Unit 10: Quantum Discovery — fails c1
    why_matters: 'في مؤتمر تقنيات الحوسبة الكمومية في دبي، يُعرض عليكِ التحدث عن تأثيرها على أمن المعلومات أمام متخصصين وصنّاع قرار. قبل هذه الوحدة: شرح نظري. بعدها: تُجيبين على أصعب سؤال من الجمهور بدقة وثقة.',
    outcomes: null,
  },
  {
    id: 'a393f989-100c-45d2-8f75-f3b10d6c2214', // Unit 12: Resource Economics — fails c1
    why_matters: 'في اجتماع لجنة الاستثمار في مؤسسة مالية دولية، يُطرح تقرير عن شُحّ الموارد وسيناريوهات 2050. يُطلب منكِ تقييم المخاطر وتقديم توصية استثمارية مُبرَّرة. قبل هذه الوحدة: تقولين أرقاماً. بعدها: تبنين حجة اقتصادية كاملة.',
    outcomes: null,
  },
];

async function main() {
  console.log('=== L5 Refactor ===');
  let ok = 0, fail = 0;

  for (const unit of L5_REFACTOR) {
    const patch = { brief_generated_at: new Date().toISOString() };
    if (unit.why_matters !== null) patch.why_matters = unit.why_matters;
    if (unit.outcomes !== null) patch.outcomes = unit.outcomes;

    const { data, error } = await sb
      .from('curriculum_units')
      .update(patch)
      .eq('id', unit.id)
      .select('id, unit_number, theme_ar');

    if (error) {
      console.error(`FAIL ${unit.id}: ${error.message}`);
      fail++;
      continue;
    }
    if (!data || data.length !== 1) {
      console.error(`ROWCOUNT FAIL ${unit.id}: expected 1, got ${data?.length}`);
      fail++;
      continue;
    }
    console.log(`OK Unit ${data[0].unit_number}: ${data[0].theme_ar}`);
    ok++;
  }

  console.log(`\nL5: ${ok}/${L5_REFACTOR.length} done, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error(e); process.exit(1); });
