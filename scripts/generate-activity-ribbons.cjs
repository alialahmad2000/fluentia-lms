const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY is not set in .env');
  process.exit(1);
}

const args = process.argv.slice(2);
const levelFilter = args.includes('--level') ? parseInt(args[args.indexOf('--level') + 1]) : null;
const force = args.includes('--force');
const dryRun = args.includes('--dry-run');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Must match keys used in ACTIVITY_MAP (useUnitData.js)
const ACTIVITY_LABELS_AR = {
  reading:      'القراءة',
  vocabulary:   'المفردات',
  grammar:      'القواعد',
  writing:      'الكتابة',
  speaking:     'التحدث',
  listening:    'الاستماع',
  pronunciation:'النطق',
  assessment:   'التقييم',
};

const SYSTEM_PROMPT = `أنت د. علي الأحمد، مؤسس أكاديمية طلاقة.
مهمتك الآن: توليد "شريط سياق" (Context Ribbon) لكل نشاط في وحدة تعليمية.

الشريط عبارة عن جملة واحدة فقط (5-10 كلمات) تظهر أعلى صفحة النشاط، وتربطه بقصة الوحدة الأكبر.

قواعد صارمة:
1. جملة واحدة فقط، 5-10 كلمات.
2. وصف حيادي — لا ضمير مخاطب (لا أنتَ/أنتِ)، لا أفعال مضارعة بصيغة مخاطبة (تحجزين، تكتب). استخدم المصدر أو الوصف الحيادي.
3. لا تذكر "تمرين" أو "درس" أو "تسجيل" — اذكر القدرة أو الموقف.
4. لا تبدأ بـ "هنا..." أو "هذا..." — ابدأ بفعل مصدر أو بموقف مباشر.
5. كل شريط يجب أن يربط النشاط بـ موضوع الوحدة (مطار، عائلة، مطعم، الخ).

## قواعد لغوية إلزامية:
1. حياد جنسي تام — لا ضمير مخاطب (أنتَ/أنتِ)، لا أفعال مضارعة بصيغة مخاطبة (تحجزين، تكتب)
2. استخدم المصدر أو الوصف الحيادي: "قواعد المطار — التعبيرات الأساسية" بدل "اللي ستحتاجها في المطار"
3. ممنوع كلمة "تسجيل" ومشتقاتها كفعل تعلّم

6. أخرج JSON فقط بدون أي نص حوله.`;

function buildPrompt(unit, level, presentActivities) {
  return `الوحدة ${unit.unit_number}: "${unit.theme_ar || unit.theme_en}"
المستوى: ${level.cefr} (L${level.level_number})
الموضوع العام: ${unit.theme_ar || unit.theme_en}
${unit.description_ar ? `الوصف: ${unit.description_ar}` : ''}

الأنشطة الموجودة في هذه الوحدة (ولّد شريط لكل واحد منها فقط):
${presentActivities.map(a => `- ${a} (${ACTIVITY_LABELS_AR[a] || a})`).join('\n')}

أخرج JSON بهذا الشكل بالضبط (فقط المفاتيح الموجودة فعلاً):
{
${presentActivities.map(a => `  "${a}": "..."`).join(',\n')}
}`;
}

function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return JSON.parse(text.slice(start, end + 1));
}

async function presenceMap(unitId) {
  // All units have these core activities
  const present = ['reading', 'vocabulary', 'grammar', 'writing', 'speaking', 'pronunciation', 'assessment'];
  const { count: listenCount } = await supabase
    .from('curriculum_listening')
    .select('*', { count: 'exact', head: true })
    .eq('unit_id', unitId);
  if (listenCount) present.splice(1, 0, 'listening'); // after reading
  return present;
}

async function main() {
  let query = supabase
    .from('curriculum_units')
    .select('id, unit_number, theme_en, theme_ar, description_ar, ribbons_generated_at, curriculum_levels!inner(level_number, cefr)')
    .order('unit_number');
  if (!force) query = query.is('ribbons_generated_at', null);
  if (levelFilter) query = query.eq('curriculum_levels.level_number', levelFilter);

  const { data: units, error } = await query;
  if (error) throw error;
  console.log(`Processing ${units.length} units${dryRun ? ' (DRY-RUN)' : ''}${levelFilter ? ` for level ${levelFilter}` : ''}`);

  let ok = 0, fail = 0;
  for (const unit of units) {
    try {
      const level = unit.curriculum_levels;
      console.log(`\n→ Unit ${unit.unit_number}: ${unit.theme_ar || unit.theme_en} [L${level.level_number}/${level.cefr}]`);
      const present = await presenceMap(unit.id);
      const msg = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        temperature: 0.7,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(unit, level, present) }],
      });
      const ribbons = extractJSON(msg.content[0].text);
      for (const a of present) {
        if (!ribbons[a] || typeof ribbons[a] !== 'string' || ribbons[a].length < 8) {
          throw new Error(`Missing/invalid ribbon for "${a}": ${ribbons[a]}`);
        }
      }
      console.log(`  ✓ ${Object.keys(ribbons).length} ribbons. Sample: "${ribbons[present[0]]}"`);

      if (!dryRun) {
        const { data: updated, error: updErr } = await supabase
          .from('curriculum_units')
          .update({ activity_ribbons: ribbons, ribbons_generated_at: new Date().toISOString() })
          .eq('id', unit.id)
          .select('id');
        if (updErr) throw updErr;
        if (!updated || updated.length !== 1) throw new Error(`Expected 1 update, got ${updated?.length}`);
      }
      ok++;
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.error(`  ✗ ${e.message}`);
      fail++;
    }
  }
  console.log(`\nDone. Success: ${ok}, Failed: ${fail}`);
  if (fail > 0) process.exit(1);
}
main().catch(e => { console.error(e); process.exit(1); });
