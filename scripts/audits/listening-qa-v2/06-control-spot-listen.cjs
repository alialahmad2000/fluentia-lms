// Pick 5 control-group CLEAN multi-speaker rows (3 interview + 2 dialogue)
// and write the first 5 seconds of each to /tmp/audit-spot-<id>.mp3
// for Ali to spot-listen. Confirms no spoken speaker labels.

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const inv = JSON.parse(fs.readFileSync('docs/audits/listening-qa/inventory.json', 'utf8'))
const multi = inv.filter(
  (r) =>
    ['dialogue', 'interview', 'conversation'].includes(r.audio_type) &&
    Array.isArray(r.speaker_segments) &&
    new Set(r.speaker_segments.map((s) => s.speaker)).size >= 2 &&
    r.audio_url,
)

// Deterministic by sort, not random — re-runnable
multi.sort((a, b) => a.id.localeCompare(b.id))
const byType = { interview: [], dialogue: [] }
for (const r of multi) (byType[r.audio_type] || (byType[r.audio_type] = [])).push(r)

const picks = [
  ...byType.interview.slice(0, 3),
  ...byType.dialogue.slice(0, 2),
]

const outDir = '/tmp/listening-qa-v2-spot-listen'
fs.mkdirSync(outDir, { recursive: true })

const report = []
for (const r of picks) {
  const out = path.join(outDir, `${r.id}.mp3`)
  console.log(`[${r.audio_type}] ${r.title_ar?.slice(0, 60)}`)
  // Use ffmpeg to grab first 5 seconds; rely on HTTP input
  try {
    execFileSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-ss', '0', '-t', '5', '-i', r.audio_url, '-c', 'copy', out],
      { stdio: 'inherit' },
    )
    const size = fs.statSync(out).size
    const firstSegText = r.speaker_segments?.[0]?.text || ''
    const firstSegSpeaker = r.speaker_segments?.[0]?.speaker || ''
    report.push({
      id: r.id,
      audio_type: r.audio_type,
      title_ar: r.title_ar,
      first_segment_speaker: firstSegSpeaker,
      first_segment_text_preview: firstSegText.slice(0, 120),
      sample_file: out,
      sample_bytes: size,
    })
  } catch (e) {
    report.push({ id: r.id, error: String(e.message || e).slice(0, 200) })
  }
}

fs.writeFileSync(
  'docs/audits/listening-qa-v2/control-spot-listen.json',
  JSON.stringify(report, null, 2),
)

// Markdown index
const md = [
  '# Listening QA v2 — Control-Group Spot Listen (5 CLEAN multi-speaker rows)',
  '',
  'Purpose: confirm acoustically that no spoken speaker labels exist in CLEAN-flagged audio.',
  'These are NOT suspect rows — text-level scan found 0 suspect. This is control verification.',
  '',
  'Listen to the first 5 seconds of each file. Expected: voice 1 starts directly with the segment\'s line. NO spoken "Dr. Ali", "Mohammed", "Speaker A" etc.',
  '',
  '| audio_type | title (ar) | first speaker | first line preview | sample file |',
  '|---|---|---|---|---|',
  ...report
    .filter((r) => !r.error)
    .map(
      (r) =>
        `| ${r.audio_type} | ${(r.title_ar || '').replace(/\|/g, '\\|')} | ${r.first_segment_speaker} | ${(r.first_segment_text_preview || '').replace(/\|/g, '\\|').replace(/\n/g, ' ')} | \`${r.sample_file}\` |`,
    ),
  '',
  '## How to spot-listen on Mac',
  '',
  '```bash',
  'open /tmp/listening-qa-v2-spot-listen',
  '# Or play one at a time:',
  ...report.filter((r) => !r.error).map((r) => `afplay ${r.sample_file}`),
  '```',
  '',
  '## Errors',
  '',
  ...(report.filter((r) => r.error).length
    ? report.filter((r) => r.error).map((r) => `- ${r.id}: ${r.error}`)
    : ['(none)']),
].join('\n')
fs.writeFileSync('docs/audits/listening-qa-v2/control-spot-listen.md', md)

console.log(`\nWrote ${report.length} samples to ${outDir}`)
console.log('Index: docs/audits/listening-qa-v2/control-spot-listen.md')
