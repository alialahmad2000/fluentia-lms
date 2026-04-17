// Competition Foundation Verification Script
// Run: node scripts/verify-competition-foundation.cjs

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://nmjexpuycmqcxuxljier.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''

if (!SERVICE_KEY) {
  console.error('Set SUPABASE_SERVICE_KEY env var (service_role key from Supabase dashboard)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
})

const results = {}

async function check(name, fn) {
  try {
    const ok = await fn()
    results[name] = ok ? 'PASS' : 'FAIL (bad shape)'
  } catch (e) {
    results[name] = `FAIL (${e.message})`
  }
}

async function run() {
  console.log('Running competition foundation smoke tests...\n')

  // 1. get_active_competition
  await check('get_active_competition shape', async () => {
    const { data, error } = await supabase.rpc('get_active_competition')
    if (error) throw error
    if (!data) throw new Error('returned null — no active competition')
    const ok = data.id && data.team_a && data.team_b && 'leader' in data && 'gap_xp' in data
    if (!ok) throw new Error('missing fields: ' + JSON.stringify(Object.keys(data)))
    console.log('  ✓ competition id:', data.id)
    console.log('  ✓ leader:', data.leader, '| gap_xp:', data.gap_xp)
    console.log('  ✓ team_a:', data.team_a.name, 'XP:', data.team_a.total_xp, 'VP:', data.team_a.victory_points)
    console.log('  ✓ team_b:', data.team_b.name, 'XP:', data.team_b.total_xp, 'VP:', data.team_b.victory_points)
    return true
  })

  // Get competition id for subsequent tests
  const { data: comp } = await supabase.rpc('get_active_competition')
  const competitionId = comp?.id

  // 2. Leaderboard A
  await check('leaderboard team_A', async () => {
    const { data, error } = await supabase.rpc('get_competition_leaderboard', {
      p_competition_id: competitionId,
      p_team: 'A',
      p_limit: 10,
    })
    if (error) throw error
    console.log('  ✓ Team A leaderboard rows:', data?.length)
    if (data?.length) console.log('    top:', data[0].display_name, 'XP:', data[0].total_xp)
    return Array.isArray(data)
  })

  // 3. Leaderboard B
  await check('leaderboard team_B', async () => {
    const { data, error } = await supabase.rpc('get_competition_leaderboard', {
      p_competition_id: competitionId,
      p_team: 'B',
      p_limit: 10,
    })
    if (error) throw error
    console.log('  ✓ Team B leaderboard rows:', data?.length)
    if (data?.length) console.log('    top:', data[0].display_name, 'XP:', data[0].total_xp)
    return Array.isArray(data)
  })

  // 4. Feed
  await check('competition_feed', async () => {
    const { data, error } = await supabase.rpc('get_competition_feed', {
      p_competition_id: competitionId,
      p_limit: 20,
    })
    if (error) throw error
    console.log('  ✓ Feed rows:', data?.length)
    if (data?.length) {
      console.log('    latest:', data[0].display_name, 'team:', data[0].team, '+', data[0].amount, 'XP')
    }
    return Array.isArray(data)
  })

  // 5. Streak check (dry run via service role)
  await check('check_team_streak_daily (dry run)', async () => {
    const { data, error } = await supabase.rpc('check_team_streak_daily')
    if (error) throw error
    console.log('  ✓ streak result:', JSON.stringify(data))
    return data && !data.error
  })

  // 6. Seed verification
  await check('seed rows', async () => {
    const { data: goals } = await supabase.from('competition_weekly_goals').select('id').eq('competition_id', competitionId)
    const { data: streaks } = await supabase.from('competition_team_streaks').select('id').eq('competition_id', competitionId)
    console.log('  ✓ weekly_goal rows:', goals?.length, '| streak rows:', streaks?.length)
    return goals?.length === 4 && streaks?.length === 2
  })

  // Print results
  console.log('\n=== PASS/FAIL MATRIX ===')
  let allPass = true
  for (const [name, result] of Object.entries(results)) {
    const icon = result === 'PASS' ? '✅' : '❌'
    console.log(`${icon} ${name}: ${result}`)
    if (result !== 'PASS') allPass = false
  }
  console.log(`\nOverall: ${allPass ? '✅ ALL PASS' : '❌ FAILURES FOUND'}`)

  process.exit(allPass ? 0 : 1)
}

run().catch(e => {
  console.error('Fatal:', e.message)
  process.exit(1)
})
