import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const perRow = JSON.parse(readFileSync('docs/audits/_megafix-tmp/perrow-raw.json', 'utf8'))
const ok = perRow.filter(r => r.category === '200_OK')

// ~20% sample, deterministic (every 5th)
const sample = ok.filter((_, idx) => idx % 5 === 0)
console.log(`Decode-testing ${sample.length} of ${ok.length} 200_OK rows`)

function decode(url) {
  try {
    execSync(`ffmpeg -v error -i ${JSON.stringify(url)} -f null - 2>&1`, { encoding: 'utf8', timeout: 120000 })
    return { decodable: true }
  } catch (e) {
    const msg = String(e.stderr || e.stdout || e.message || e).slice(0, 200)
    return { decodable: false, error: msg }
  }
}

const results = {}
let n = 0
for (const r of sample) {
  n++
  const res = decode(r.audio_url)
  results[r.id] = res
  console.log(`[${n}/${sample.length}] #${r.listening_number} ${r.unit_id?.slice(0,8)} -> ${res.decodable ? 'DECODABLE' : 'CORRUPT: ' + res.error}`)
}

// merge decode back into perRow
for (const r of perRow) {
  if (results[r.id]) r.decode = results[r.id]
}

// summary
const summary = {
  total: perRow.length,
  never_generated: perRow.filter(r => r.category === 'NEVER_GENERATED').length,
  has_url_404: perRow.filter(r => r.category === '404').length,
  has_url_403: perRow.filter(r => r.category === '403').length,
  has_url_5xx: perRow.filter(r => r.category === '5xx').length,
  has_url_wrong_content_type: perRow.filter(r => r.category === 'wrong_content_type').length,
  has_url_probe_error: perRow.filter(r => r.category === 'probe_error').length,
  has_url_ok: perRow.filter(r => r.category === '200_OK').length,
  decode_sample_size: sample.length,
  decode_corrupt: Object.values(results).filter(r => !r.decodable).length,
  decode_ok: Object.values(results).filter(r => r.decodable).length,
  public_urls: perRow.filter(r => r.is_public_url).length,
  signed_or_other_urls: perRow.filter(r => r.has_url && !r.is_public_url).length,
  published_rows: perRow.filter(r => r.is_published).length,
  unpublished_rows: perRow.filter(r => !r.is_published).length,
}

writeFileSync('docs/audits/listening-fix/row-audit.json', JSON.stringify({ summary, rows: perRow }, null, 2))
console.log('\n=== SUMMARY ===')
console.log(JSON.stringify(summary, null, 2))
console.log('\nWrote docs/audits/listening-fix/row-audit.json')
