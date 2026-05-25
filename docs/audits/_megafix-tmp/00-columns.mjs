import { admin } from '../../../scripts/lib/supa.mjs'

async function cols(table) {
  const { data, error } = await admin.from(table).select('*').limit(1)
  if (error) return { table, error: error.message }
  return { table, count_sample: data?.length || 0, columns: data?.[0] ? Object.keys(data[0]) : [] }
}

for (const t of ['curriculum_listening', 'listening_audio']) {
  const r = await cols(t)
  console.log(JSON.stringify(r, null, 2))
}

// total counts
for (const t of ['curriculum_listening', 'listening_audio']) {
  const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true })
  console.log(`COUNT ${t}: ${error ? 'ERR ' + error.message : count}`)
}
