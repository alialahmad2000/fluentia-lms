// scripts/generate-unit-briefs.cjs
//
// Generates why_matters + outcomes + brief_questions for curriculum_units
// via Claude Sonnet API, then persists to DB.
//
// Schema notes (from discovery):
//   - Units use theme_ar/theme_en (not title_ar/title_en)
//   - grammar_topic_ids is an array of IDs (no text grammar_topic column)
//   - Vocab links to curriculum_vocabulary.reading_id (not unit_id)
//   - cover_image_url and estimated_minutes already exist on the table
//
// Usage:
//   node scripts/generate-unit-briefs.cjs              # only un-generated units
//   node scripts/generate-unit-briefs.cjs --level 1    # only L1 units
//   node scripts/generate-unit-briefs.cjs --force      # regenerate all
//   node scripts/generate-unit-briefs.cjs --dry-run    # print, don't persist

const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const args = process.argv.slice(2);
const levelFilter = args.includes('--level') ? parseInt(args[args.indexOf('--level') + 1]) : null;
const force   = args.includes('--force');
const dryRun  = args.includes('--dry-run');

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set in .env');
  console.error('Add it to .env as: ANTHROPIC_API_KEY=sk-ant-...');
  process.exit(1);
}

const supabase  = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `أنت د. علي الأحمد، مؤسس أكاديمية طلاقة — أكاديمية سعودية راقية لتعليم الإنجليزية للبنات.
أسلوبك: دافئ، راقي، عربي فصحى قريب من الحديث اليومي، بدون تكلّف. تحترم ذكاء الطالبة وتخاطبها كراشدة طموحة.
مهمتك: توليد محتوى "إيجاز الوحدة" لطالبة قبل ما تبدأ وحدة جديدة في منهجها.

قواعد صارمة:
1. المحتوى محايد بين الجنسين — لا أفعال مضارعة بضمير مخاطب (لا تفهمين/تفهم، لا تكتبين/تكتب).
2. اربط كل مخرج بتطبيق حقيقي في حياة الطالب (سفر، دراسة، عمل، اجتماعيات، سوشيال ميديا).
3. لا تذكر "تمارين" أو "اختبارات" أو "تسجيل" — اذكر "قدرات" و"مهارات" و"ثقة".
4. why_matters = فقرة عاطفية مقنعة في 2-3 جمل. لا شعارات جوفاء. استخدم موقف محدد بضمير الغائب أو وصف حيادي (مثل: "أول سفر إلى لندن. موظف الجوازات، سؤالان. قبل الوحدة: إشارات صامتة. بعدها: جملتان كاملتان.").
5. outcomes = 3-5 مخرجات بصيغة المصدر (verbal noun) — "كتابة ٥ جمل"، "شرح ٣ نقاط"، "تقديم رأي خلال دقيقتين" — لا أفعال مضارعة أبداً.
6. brief_questions = 2-3 أسئلة بصيغة حيادية ("ما أهم ٣ مواقف تحتاج فيها هذه اللغة؟") لا بضمير مخاطب.

## القاعدة الذهبية #1 — why_matters (محدّثة)

يجب أن تصف مشهداً محدداً واحداً بضمير الغائب أو صيغة الوصف المحايد — لا بضمير المخاطب (أنتَ/أنتِ).

مكونات المشهد الإلزامية:
- مكان محدد (ليس "في العمل" بل "في اجتماع الربع السنوي بلندن")
- لحظة دقيقة (ليس "التواصل مع الناس" بل "يفتح والد الصديقة حديثاً طويلاً")
- مقارنة قبل/بعد داخل نفس المشهد

اختبار الرفض:
- لو الجملة تصلح لأي وحدة في أي مستوى → مرفوضة.
- لو ما فيها اسم مكان أو حدث محدد → مرفوضة.
- لو فيها فعل يخاطب الطالب بضمير المؤنث أو المذكر مباشرة (تحجزين، تحجز، تسافرين، تسافر، إلخ) → مرفوضة.

أمثلة حسب المستوى:

L2 (تطوير):
"أول سفر إلى لندن. موظف الجوازات، سؤالان قصيران. قبل الوحدة: إشارات صامتة. بعدها: جملتان كاملتان وابتسامة تفهم المعنى."

L3 (تعزيز):
"حفل تخرّج في جامعة بريطانية. والد الصديقة يفتح حديثاً طويلاً عن السفر. قبل هذي الوحدة: ابتسامة مجاملة. بعدها: محادثة عشر دقائق يتذكّرها الطرف الآخر."

L4 (تمكين):
"اجتماع استراتيجي مع عميل دولي. قبل الوحدة: إيميل طويل يعدّه زميل. بعدها: تقديم الاستراتيجية كاملة والإجابة على الأسئلة مباشرة."

L5 (إتقان):
"تفاوض عقد توريد مع شركة يابانية في زيوريخ. كلمة مبهمة واحدة = صفقة بالملايين تنهار. الدقة اللغوية هنا = نقود."

## القاعدة الذهبية #2 — outcomes (محدّثة)

كل outcome يجب أن يكون:
1. صيغة مصدر (verbal noun) — لا فعل مضارع بضمير مخاطب
2. يجتاز اختبار: "هل يمكن مشاهدة شخص وهو يفعل هذا من بعيد؟"
3. يحتوي تفصيلاً كمّياً أو زمنياً + سياقاً محدداً

صيغ مصدر مسموحة وممتازة:
- "حجز" / "كتابة" / "شرح" / "تقديم" / "طرح سؤال"
- "الرد" / "طلب" / "اعتراض" / "تفاوض" / "إقناع"
- "تصحيح" / "تلخيص" / "مقارنة" / "اقتراح" / "تحليل"
- "مناقشة" / "تقييم" / "إلقاء محاضرة" / "تبرير"

مصادر ممنوعة (حالات داخلية غير مشهودة):
- "فهم" / "معرفة" / "إدراك" / "اكتساب" / "شعور" / "استيعاب"

أفعال مضارعة ممنوعة كلياً (سواء بضمير المؤنث أو المذكر):
- تفهمين/تفهم، تعرفين/تعرف، تدركين/تدرك
- تحجزين/تحجز، تكتبين/تكتب (استخدم المصدر بدلها)
- كل فعل ينتهي بـ ـين أو يبدأ بـ ت/ي للمخاطبة

اختبار الرفض:
- لو بدأ بفعل مضارع بضمير مخاطب → مرفوض
- لو يصف شيئاً داخلياً (فهم، معرفة، إدراك) → مرفوض
- لو ما فيه رقم أو وقت أو سياق محدد → مرفوض

أمثلة:
× سيئ (فعل مخاطبة): "تحجزين تذكرة طيران" → مرفوض
× سيئ (حالة داخلية): "فهم الثقافة البريطانية" → مرفوض
✓ جيد: "حجز تذكرة طيران عبر تطبيق في ٣ دقائق بدون أخطاء"

× سيئ: "تعرفين متى تستخدمين Present Perfect" → مرفوض
✓ جيد: "كتابة ٥ جمل عن الخبرة المهنية باستخدام Present Perfect بدون أخطاء"

× سيئ: "تكتسبين ثقة في التحدث" → مرفوض
✓ جيد: "تقديم النفس في اجتماع خلال ٣٠ ثانية تتضمن الدور والخبرة والهدف"

## القاعدة الذهبية #3 — الحياد بين الجنسين (جديدة وحرجة)

المنصة تحتوي طلاباً وطالبات. كل المحتوى يجب أن يكون محايداً بين الجنسين.

قواعد صارمة:
- في why_matters: استخدم ضمير الغائب (هو/هي/الطالب/الصديقة/الزميل) أو الوصف الحيادي. لا تستخدم أنتَ/أنتِ أبداً.
- في outcomes: استخدم صيغة المصدر (verbal noun) فقط. لا فعل مضارع بضمير مخاطب.
- في brief_questions: اسأل بصيغة محايدة ("ما أهم ٣ تعبيرات في المطار؟") لا ("ما أهم ٣ تعبيرات حفظتِ/حفظت؟")

اختبار صارم: بعد كتابة أي جملة، ابحث عن:
- الحرف "ين" في نهاية كلمة مسبوقة بـ ت → غالباً فعل مؤنث مخاطب → مرفوض
- الحرف "ك" في نهاية فعل بعد ضمير مخاطب → غالباً ضمير مخاطب → مرفوض

لو وجدت أياً منها → أعد الصياغة بصيغة المصدر أو ضمير الغائب.

## القاعدة الذهبية #4 — كلمة "تسجيل" محجوزة

"التسجيل" في منصة فلوينشيا = قسم خاص يحتوي تسجيلات الكلاسات المرفوعة من الإدارة.

ممنوع كلياً استخدام كلمة "تسجيل" أو مشتقاتها كفعل تعلّم في المحتوى المولّد:
- ممنوع: "تسجيل جمل" / "تسجيل محادثة" / "تسجّلين ملاحظات" / "يسجّل إجابته"
- ممنوع: أي من: تسجيل، تسجّل، تسجيلات، سجّلي، سجّل، سجّلت، يسجّل

البدائل حسب السياق:
- كتابة جمل / نطق جمل / إلقاء جمل
- إجراء محادثة / خوض محادثة / أداء حوار
- تدوين ملاحظات / كتابة ملاحظات
- أداء نشاط / إكمال تمرين
- إدخال إجابة / تقديم إجابة

اختبار رفض ذاتي: قبل حفظ أي محتوى، ابحث عن السلسلة "تسج" — لو ظهرت → أعد الصياغة.

7. أخرج JSON فقط، بدون أي نص قبله أو بعده.`;

function buildUserPrompt(unit, level, sampleVocab, readingTitles) {
  return `الوحدة ${unit.unit_number}: "${unit.theme_ar || unit.theme_en}"
المستوى: ${level.cefr} (L${level.level_number} — ${level.name_ar || ''})
الموضوع العام: ${unit.theme_en || 'غير محدد'}
عيّنة مفردات: ${sampleVocab.slice(0, 15).join('، ') || 'غير متاحة'}
القراءات: ${readingTitles.join(' | ') || 'غير متاحة'}
الوصف: ${unit.description_ar || unit.description_en || 'غير محدد'}

أخرج JSON بهذه الصيغة بالضبط:
{
  "why_matters": "فقرة من 2-3 جمل عربية فصحى دافئة",
  "outcomes": ["قدرة 1", "قدرة 2", "قدرة 3", "قدرة 4"],
  "brief_questions": ["سؤال 1", "سؤال 2"]
}`;
}

function extractJSON(text) {
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return JSON.parse(text.slice(start, end + 1));
}

async function main() {
  let query = supabase
    .from('curriculum_units')
    .select(`
      id, unit_number, theme_en, theme_ar, description_ar, description_en,
      grammar_topic_ids, brief_generated_at,
      curriculum_levels!inner(level_number, cefr, name_ar)
    `)
    .order('unit_number');

  if (!force) query = query.is('brief_generated_at', null);
  if (levelFilter !== null) {
    query = query.eq('curriculum_levels.level_number', levelFilter);
  }

  const { data: units, error } = await query;
  if (error) throw error;

  console.log(`Found ${units.length} units to process${force ? ' (FORCED)' : ''}${levelFilter !== null ? ` (L${levelFilter} only)` : ''}`);
  if (dryRun) console.log('*** DRY RUN — no DB writes ***');

  let success = 0, failed = 0;

  for (const unit of units) {
    try {
      const lvl = Array.isArray(unit.curriculum_levels) ? unit.curriculum_levels[0] : unit.curriculum_levels;
      console.log(`\n→ Unit ${unit.unit_number}: "${unit.theme_ar || unit.theme_en}" (L${lvl.level_number} ${lvl.cefr})`);

      // Fetch readings + sample vocab
      const { data: readings } = await supabase
        .from('curriculum_readings')
        .select('id, title_en, title_ar')
        .eq('unit_id', unit.id);

      const readingTitles = (readings || []).map(r => r.title_ar || r.title_en).filter(Boolean);
      let sampleVocab = [];

      for (const r of readings || []) {
        const { data: vocab } = await supabase
          .from('curriculum_vocabulary')
          .select('word')
          .eq('reading_id', r.id)
          .limit(8);
        sampleVocab.push(...(vocab || []).map(v => v.word).filter(Boolean));
        if (sampleVocab.length >= 15) break;
      }

      const userPrompt = buildUserPrompt(unit, lvl, sampleVocab, readingTitles);

      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const responseText = msg.content[0].text;
      const brief = extractJSON(responseText);

      if (!brief.why_matters || !Array.isArray(brief.outcomes) || brief.outcomes.length < 3) {
        throw new Error(`Invalid brief shape: ${JSON.stringify(brief)}`);
      }
      if (!Array.isArray(brief.brief_questions) || brief.brief_questions.length < 2) {
        throw new Error(`Invalid brief_questions: ${JSON.stringify(brief.brief_questions)}`);
      }

      console.log(`  ✓ Generated. why_matters: ${brief.why_matters.slice(0, 60)}...`);
      console.log(`    outcomes: ${brief.outcomes.length}, questions: ${brief.brief_questions.length}`);

      if (!dryRun) {
        const { data: updated, error: updErr } = await supabase
          .from('curriculum_units')
          .update({
            why_matters:        brief.why_matters,
            outcomes:           brief.outcomes,
            brief_questions:    brief.brief_questions,
            brief_generated_at: new Date().toISOString(),
            brief_locale:       'ar',
          })
          .eq('id', unit.id)
          .select('id');

        if (updErr) throw updErr;
        if (!updated || updated.length !== 1) {
          throw new Error(`Rowcount assertion failed: expected 1 update, got ${updated?.length || 0}`);
        }
      }

      success++;
      await new Promise(r => setTimeout(r, 1000)); // 1 req/sec
    } catch (e) {
      console.error(`  ✗ FAILED unit ${unit.unit_number}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Success: ${success} | Failed: ${failed}`);
  if (failed > 0) {
    console.error(`\n⚠️  ${failed} units failed. Re-run to retry (idempotent).`);
    process.exit(1);
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
