// Competition Kickoff Trigger Script
// Full run:    node scripts/trigger-competition-kickoff.cjs
// Email retry: node scripts/trigger-competition-kickoff.cjs --email-only
//   (use after verifying fluentia.app domain in Resend → resend.com/domains)
//   email-only mode skips notifications/push (already sent) and just retries emails

require('dotenv').config({ path: '.env' })
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const EMAIL_ONLY = process.argv.includes('--email-only')

async function run() {
  if (EMAIL_ONLY) {
    console.log('EMAIL-ONLY mode: will retry emails without re-sending push/notifications')
    console.log('Make sure fluentia.app is verified in Resend first: https://resend.com/domains\n')
  }
  console.log('Fetching active competition...')
  const { data: comp, error: compErr } = await supabase.rpc('get_active_competition')
  if (compErr || !comp) {
    console.error('No active competition found:', compErr?.message)
    process.exit(1)
  }

  const competition_id = comp.id
  console.log(`Competition: ${comp.title_ar} (${competition_id})`)
  console.log(`Team A: ${comp.team_a.name} — ${comp.team_a.victory_points} VP`)
  console.log(`Team B: ${comp.team_b.name} — ${comp.team_b.victory_points} VP`)
  console.log()

  console.log('Invoking competition-kickoff edge function...')
  const { data: result, error: fnErr } = await supabase.functions.invoke('competition-kickoff', {
    body: { competition_id, email_only: EMAIL_ONLY },
  })

  if (fnErr) {
    console.error('Edge function error:', fnErr)
    process.exit(1)
  }

  console.log('Result:', JSON.stringify(result, null, 2))
  console.log()

  if (result?.already_sent) {
    console.log('⚠  Kickoff already sent for this competition. No duplicate sent.')
    return
  }

  if (result?.success) {
    console.log('=== KICKOFF COMPLETE ===')
    console.log(`✅ Emails sent:         ${result.emails_sent}`)
    console.log(`⏭  Emails skipped:      ${result.emails_skipped}`)
    console.log(`📲 Push sent:           ${result.push_sent}`)
    console.log(`🔔 Notifications:       ${result.notifications_created}`)
    console.log(`👥 Students total:      ${result.students_total}`)
    console.log()
    console.log('✅ Admin summary email sent to ali@fluentia.academy + goldmohmmed@gmail.com')
    console.log()
    console.log('Next steps:')
    console.log('  1. Check email inbox — verify one student received the kickoff email')
    console.log('  2. Login as a student → confirm kickoff modal appears')
    console.log('  3. Dismiss modal → confirm it does not appear again')
  } else {
    console.error('❌ Kickoff returned unexpected result:', result)
    process.exit(1)
  }
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
