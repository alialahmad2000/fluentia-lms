// scripts/send-maintenance-notification.cjs
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TITLE = '\u{1F527} صيانة مجدولة';
const BODY = `مرحباً بكم،

ستُجرى عملية صيانة سريعة على المنصة من الآن وحتى الساعة 6:00 مساءً.

قد تلاحظون بطءاً بسيطاً أو تعذّر الوصول لبعض الأقسام خلال هذه الفترة.

جميع بياناتكم وتقدّمكم محفوظة بالكامل.

شكراً لتفهّمكم.`;

async function main() {
  // 1. Get all students (no status column on profiles)
  const { data: students, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'student');

  if (error) { console.error('Error fetching students:', error); process.exit(1); }

  console.log(`\nTarget recipients: ${students.length} students`);

  // 2. Get push subscription count
  const { count: pushCount, error: pushErr } = await supabase
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .in('user_id', students.map(s => s.id))
    .eq('is_active', true);

  if (!pushErr) {
    console.log(`Students with active push subscriptions: ${pushCount}`);
  }

  // Halt conditions
  if (students.length === 0) {
    console.error('HALT: student count is 0 — something is wrong');
    process.exit(1);
  }
  if (students.length > 50) {
    console.error(`HALT: unexpected student count (${students.length}) — verify role filter`);
    process.exit(1);
  }

  if (!process.argv.includes('--confirm')) {
    console.log('\nDry run complete. Re-run with --confirm to actually send.');
    process.exit(0);
  }

  // 3. Send via edge function (handles both in-app + push in one call)
  const studentIds = students.map(s => s.id);

  const { data, error: sendErr } = await supabase.functions.invoke('send-push-notification', {
    body: {
      user_ids: studentIds,
      title: TITLE,
      body: BODY,
      url: '/curriculum',
      type: 'system'
    }
  });

  if (sendErr) { console.error('Send failed:', sendErr); process.exit(1); }
  console.log('\n✅ Results:', JSON.stringify(data, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
