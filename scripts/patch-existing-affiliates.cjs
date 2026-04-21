/**
 * Patch existing approved affiliates:
 * - Create auth users (admin API, email_confirm: true, random password)
 * - Upsert profile rows with role='affiliate'
 * - Link user_id back to affiliates table
 * - Generate magic links for first-time login
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tamV4cHV5Y21xY3h1eGxqaWVyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEyNTYxOCwiZXhwIjoyMDg4NzAxNjE4fQ.Abbt3bzmud1B55ym_UW_3kEUMyVkhOiQ_iiLpHo1tfs';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // Load all approved affiliates
  const { data: affiliates, error } = await admin
    .from('affiliates')
    .select('id, full_name, email, ref_code, status, user_id, phone')
    .eq('status', 'approved');

  if (error) { console.error('Failed to load affiliates:', error); process.exit(1); }
  console.log(`Found ${affiliates.length} approved affiliates\n`);

  for (const aff of affiliates) {
    console.log(`\n── Processing: ${aff.full_name} <${aff.email}> (ref: ${aff.ref_code})`);

    let userId = aff.user_id;

    if (!userId) {
      // Try to find existing auth user by email
      const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = listData?.users?.find(u => u.email?.toLowerCase() === aff.email.toLowerCase());

      if (existing) {
        userId = existing.id;
        console.log(`  Found existing auth user: ${userId}`);
      } else {
        // Create new auth user
        const randomPassword = require('crypto').randomUUID() + require('crypto').randomUUID();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: aff.email,
          password: randomPassword,
          email_confirm: true,
          user_metadata: { full_name: aff.full_name, source: 'affiliate' },
        });
        if (createErr || !created?.user) {
          console.error(`  ERROR creating auth user:`, createErr?.message);
          continue;
        }
        userId = created.user.id;
        console.log(`  Created auth user: ${userId}`);
      }

      // Link user_id to affiliates table
      const { error: linkErr } = await admin
        .from('affiliates')
        .update({ user_id: userId })
        .eq('id', aff.id);
      if (linkErr) console.error(`  ERROR linking user_id:`, linkErr.message);
      else console.log(`  Linked user_id to affiliate row`);
    } else {
      console.log(`  Already has user_id: ${userId}`);
    }

    // Upsert profile row with role='affiliate'
    const { error: profileErr } = await admin.from('profiles').upsert(
      {
        id: userId,
        full_name: aff.full_name,
        email: aff.email,
        role: 'affiliate',
        phone: aff.phone ?? null,
      },
      { onConflict: 'id' }
    );
    if (profileErr) console.error(`  ERROR upserting profile:`, profileErr.message);
    else console.log(`  Upserted profile with role='affiliate'`);

    // Generate magic link
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: aff.email,
      options: { redirectTo: 'https://app.fluentia.academy/partner/set-password' },
    });
    if (linkErr) {
      console.error(`  ERROR generating magic link:`, linkErr.message);
    } else {
      console.log(`  MAGIC LINK for ${aff.full_name}:`);
      console.log(`  ${linkData?.properties?.action_link}`);
    }
  }

  console.log('\n✓ Patch complete');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
