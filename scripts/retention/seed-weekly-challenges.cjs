#!/usr/bin/env node
/* eslint-disable no-console */
// Seed the retention_weekly_challenges bank (~30 rows).
// Idempotent: upserts by title_ar.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=... BRANCH_REF=... node scripts/retention/seed-weekly-challenges.cjs
//   (or against prod: BRANCH_REF=nmjexpuycmqcxuxljier ...)

const https = require('https')

const CHALLENGES = [
  // ─── XP-based (5 rows) — easiest to action, scales with student effort
  { title_ar: 'حمّسي نفسك — 100 XP هذا الأسبوع', description_ar: 'اجمعي 100 نقطة خبرة من أي نشاط داخل الأكاديمية', target_metric: 'xp_earned', target_value: 100, reward_xp: 30, difficulty: 'easy', icon_key: 'spark' },
  { title_ar: 'نقطة فوق نقطة — 200 XP', description_ar: 'اجمعي 200 نقطة خبرة هذا الأسبوع — أنتِ قادرة', target_metric: 'xp_earned', target_value: 200, reward_xp: 50, difficulty: 'medium', icon_key: 'spark' },
  { title_ar: 'بطلة الأسبوع — 350 XP', description_ar: 'اجمعي 350 نقطة خبرة — تحدٍّ يستحق', target_metric: 'xp_earned', target_value: 350, reward_xp: 75, difficulty: 'medium', icon_key: 'trophy' },
  { title_ar: 'صعب وممتع — 500 XP', description_ar: 'اجمعي 500 نقطة خبرة — للجادّات فقط', target_metric: 'xp_earned', target_value: 500, reward_xp: 120, difficulty: 'hard', icon_key: 'flame' },
  { title_ar: 'ملكة الأسبوع — 750 XP', description_ar: 'اجمعي 750 نقطة خبرة — رقم أسطوري', target_metric: 'xp_earned', target_value: 750, reward_xp: 200, difficulty: 'hard', icon_key: 'crown' },

  // ─── Dialogues (5 rows) — Module 1 driver
  { title_ar: 'محادثة كل يومين', description_ar: 'أكملي ٣ محادثات يومية هذا الأسبوع', target_metric: 'dialogues_completed', target_value: 3, reward_xp: 50, difficulty: 'easy', icon_key: 'chat' },
  { title_ar: 'تحدّي ٥ محادثات', description_ar: 'أكملي ٥ محادثات يومية — لسانك راح يطلق', target_metric: 'dialogues_completed', target_value: 5, reward_xp: 75, difficulty: 'medium', icon_key: 'chat' },
  { title_ar: 'كل يوم محادثة', description_ar: 'أكملي ٧ محادثات يومية — يوم بيوم', target_metric: 'dialogues_completed', target_value: 7, reward_xp: 120, difficulty: 'medium', icon_key: 'chat-bubble' },
  { title_ar: 'بطلة المحادثة', description_ar: 'أكملي ١٠ محادثات هذا الأسبوع — رقم ذهبي', target_metric: 'dialogues_completed', target_value: 10, reward_xp: 180, difficulty: 'hard', icon_key: 'mic' },
  { title_ar: 'متحدّثة كل ساعة', description_ar: 'أكملي ١٤ محادثة (محادثتين كل يوم) — مستوى آخر', target_metric: 'dialogues_completed', target_value: 14, reward_xp: 280, difficulty: 'hard', icon_key: 'mic' },

  // ─── Homework (5 rows) — Module 2 driver
  { title_ar: 'تمارين ذكية × ٣', description_ar: 'أكملي ٣ مجموعات تمارين هذا الأسبوع', target_metric: 'homework_completed', target_value: 3, reward_xp: 50, difficulty: 'easy', icon_key: 'pencil' },
  { title_ar: 'تمارين ذكية × ٥', description_ar: 'أكملي ٥ مجموعات تمارين — تركيز عالي', target_metric: 'homework_completed', target_value: 5, reward_xp: 80, difficulty: 'medium', icon_key: 'pencil' },
  { title_ar: 'تمارين ذكية × ٧', description_ar: 'أكملي ٧ مجموعات تمارين — يوم بيوم', target_metric: 'homework_completed', target_value: 7, reward_xp: 130, difficulty: 'medium', icon_key: 'notebook' },
  { title_ar: 'تمارين ذكية × ١٠', description_ar: 'أكملي ١٠ مجموعات — مستوى الجادّات', target_metric: 'homework_completed', target_value: 10, reward_xp: 200, difficulty: 'hard', icon_key: 'notebook' },
  { title_ar: 'تمارين ذكية × ١٤', description_ar: 'مجموعتين تمارين كل يوم — تحدٍّ كامل', target_metric: 'homework_completed', target_value: 14, reward_xp: 320, difficulty: 'hard', icon_key: 'check-double' },

  // ─── Streak (4 rows) — habit reinforcement
  { title_ar: 'لا تنقطعي — ٣ أيام', description_ar: 'حافظي على سلسلة ٣ أيام متواصلة', target_metric: 'no_streak_break', target_value: 1, reward_xp: 40, difficulty: 'easy', icon_key: 'flame' },
  { title_ar: 'لا تنقطعي — ٥ أيام', description_ar: 'حافظي على سلسلة ٥ أيام متواصلة', target_metric: 'no_streak_break', target_value: 1, reward_xp: 70, difficulty: 'medium', icon_key: 'flame' },
  { title_ar: 'الأسبوع كله!', description_ar: 'سلسلة ٧ أيام متواصلة — لا انقطاع', target_metric: 'no_streak_break', target_value: 1, reward_xp: 150, difficulty: 'hard', icon_key: 'flame-double' },
  { title_ar: 'كل يوم نشاط', description_ar: 'كوني نشطة في ٧ أيام مختلفة هذا الأسبوع', target_metric: 'days_active', target_value: 7, reward_xp: 150, difficulty: 'hard', icon_key: 'calendar-check' },

  // ─── Words saved (4 rows) — vocab growth signal
  { title_ar: 'مفردات جديدة × ١٠', description_ar: 'احفظي ١٠ كلمات جديدة في قاموسك هذا الأسبوع', target_metric: 'words_saved', target_value: 10, reward_xp: 40, difficulty: 'easy', icon_key: 'book' },
  { title_ar: 'مفردات جديدة × ١٥', description_ar: 'احفظي ١٥ كلمة جديدة — قاموسك يكبر', target_metric: 'words_saved', target_value: 15, reward_xp: 60, difficulty: 'medium', icon_key: 'book' },
  { title_ar: 'مفردات جديدة × ٢٥', description_ar: 'احفظي ٢٥ كلمة جديدة — كنز لغوي', target_metric: 'words_saved', target_value: 25, reward_xp: 120, difficulty: 'medium', icon_key: 'book-open' },
  { title_ar: 'مفردات جديدة × ٤٠', description_ar: 'احفظي ٤٠ كلمة جديدة — أسبوع استثنائي', target_metric: 'words_saved', target_value: 40, reward_xp: 220, difficulty: 'hard', icon_key: 'book-open' },

  // ─── Briefs (4 rows) — Module 5 driver
  { title_ar: 'تحضير كلاس × ٢', description_ar: 'افتحي تحضير كلاسَين هذا الأسبوع', target_metric: 'briefs_opened', target_value: 2, reward_xp: 30, difficulty: 'easy', icon_key: 'clipboard' },
  { title_ar: 'تحضير + مراجعة × ٣', description_ar: 'افتحي ٣ ملخصات (قبل أو بعد الكلاس)', target_metric: 'briefs_opened', target_value: 3, reward_xp: 50, difficulty: 'easy', icon_key: 'clipboard-check' },
  { title_ar: 'تحضير + مراجعة × ٥', description_ar: 'افتحي ٥ ملخصات — استعداد محترف', target_metric: 'briefs_opened', target_value: 5, reward_xp: 90, difficulty: 'medium', icon_key: 'clipboard-check' },
  { title_ar: 'كل كلاس له ملخص', description_ar: 'افتحي ٨ ملخصات هذا الأسبوع — مستوى احترافي', target_metric: 'briefs_opened', target_value: 8, reward_xp: 160, difficulty: 'hard', icon_key: 'badge-check' },

  // ─── Days-active variants (3 rows)
  { title_ar: 'كوني هنا — ٣ أيام', description_ar: 'كوني نشطة في ٣ أيام مختلفة هذا الأسبوع', target_metric: 'days_active', target_value: 3, reward_xp: 35, difficulty: 'easy', icon_key: 'calendar-check' },
  { title_ar: 'كوني هنا — ٥ أيام', description_ar: 'كوني نشطة في ٥ أيام مختلفة — التزام يومي', target_metric: 'days_active', target_value: 5, reward_xp: 70, difficulty: 'medium', icon_key: 'calendar-check' },
  { title_ar: 'كوني هنا — ٦ أيام', description_ar: 'كوني نشطة في ٦ أيام — أسبوع شبه كامل', target_metric: 'days_active', target_value: 6, reward_xp: 110, difficulty: 'medium', icon_key: 'calendar' },
]

function call(token, ref, query) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query })
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${ref}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 500)}`))
        try { resolve(JSON.parse(body)) } catch { resolve(body) }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

;(async () => {
  const token = process.env.SUPABASE_ACCESS_TOKEN
  const ref = process.env.BRANCH_REF
  if (!token || !ref) throw new Error('SUPABASE_ACCESS_TOKEN and BRANCH_REF env vars required')

  console.log(`Seeding ${CHALLENGES.length} challenges to project ${ref}...`)

  for (const c of CHALLENGES) {
    const q = `
      INSERT INTO public.retention_weekly_challenges
        (title_ar, description_ar, target_metric, target_value, reward_xp, difficulty, icon_key, active)
      VALUES
        ($t1$${c.title_ar}$t1$, $t2$${c.description_ar}$t2$, '${c.target_metric}', ${c.target_value}, ${c.reward_xp}, '${c.difficulty}', '${c.icon_key}', true)
      ON CONFLICT DO NOTHING;`
    await call(token, ref, q)
  }

  const verify = await call(token, ref,
    'SELECT count(*) AS total, count(*) FILTER (WHERE difficulty=$e$easy$e$) AS easy, count(*) FILTER (WHERE difficulty=$e$medium$e$) AS medium, count(*) FILTER (WHERE difficulty=$e$hard$e$) AS hard FROM public.retention_weekly_challenges'.replace(/\$e\$/g, "'")
  )
  console.log('Bank state:', verify)
})()
