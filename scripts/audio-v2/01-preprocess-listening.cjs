'use strict';
/**
 * 01-preprocess-listening.cjs
 * Re-parses speaker_segments for flagged listening rows using the hardened parser.
 *
 * Usage:
 *   node scripts/audio-v2/01-preprocess-listening.cjs \
 *     --force \
 *     --ids-from docs/audits/audio-issues/listening-audit.json \
 *     --filter-flags TRUNCATED,SINGLE_VOICE_WRONG,LABEL_IN_TEXT
 */

const fs = require('fs');
const path = require('path');
const { parseTranscript, assertNoLabelResidue, assignVoices } = require('./lib/speaker-map.cjs');

const AUDIT_PATH = (() => {
  const a = process.argv.find(x => x.startsWith('--ids-from='));
  return a ? a.split('=').slice(1).join('=') : 'docs/audits/audio-issues/listening-audit.json';
})();

const FILTER_FLAGS = (() => {
  const a = process.argv.find(x => x.startsWith('--filter-flags='));
  return a ? a.split('=')[1].split(',') : ['TRUNCATED', 'SINGLE_VOICE_WRONG', 'LABEL_IN_TEXT'];
})();

const FORCE = process.argv.includes('--force');

const ROOT = path.resolve(__dirname, '..', '..');

async function main() {
  const { query, closeDb } = await import(
    path.join(ROOT, 'scripts/audio-generator/lib/db.mjs').replace(/\\/g, '/')
      .replace(/^([A-Z]):/, (_, d) => `file:///${d}:`)
  );

  const auditRaw = fs.readFileSync(path.join(ROOT, AUDIT_PATH), 'utf8');
  const audit = JSON.parse(auditRaw);

  const flagged = audit.items.filter(i =>
    FILTER_FLAGS.some(f => i.flags.includes(f))
  );
  console.log(`[preprocess] ${flagged.length} items match flags [${FILTER_FLAGS.join(', ')}]`);

  const failures = [];
  let updated = 0;

  for (const item of flagged) {
    const [row] = await query(
      'SELECT id, transcript, audio_type, speaker_segments FROM curriculum_listening WHERE id=$1',
      [item.id]
    );
    if (!row) {
      console.warn(`[preprocess] ${item.id} not found in DB — skipping`);
      failures.push({ id: item.id, reason: 'not found in DB' });
      continue;
    }
    if (!row.transcript) {
      console.warn(`[preprocess] ${item.id} has no transcript — skipping`);
      failures.push({ id: item.id, reason: 'no transcript' });
      continue;
    }

    let segments;
    try {
      segments = parseTranscript(row.transcript);
      assertNoLabelResidue(segments);
    } catch (e) {
      console.error(`[preprocess] ${item.id} parse/assert failed: ${e.message}`);
      failures.push({ id: item.id, reason: e.message });
      continue;
    }

    // Assign voices and build final segment objects
    assignVoices(segments);
    const finalSegments = segments.map((s, i) => ({
      order: i + 1,
      speaker: s.speaker_name === '_narrator' ? 'Narrator' : s.speaker_name,
      text: s.text,
      voice_id: s.voice_id,
      char_count: s.text.length,
      gender: s.gender || 'male',
      voice_name: s.voice_name || 'Unknown',
    }));

    await query(
      'UPDATE curriculum_listening SET speaker_segments=$1, segments_processed_at=now() WHERE id=$2',
      [JSON.stringify(finalSegments), item.id]
    );

    const speakers = [...new Set(finalSegments.map(s => s.speaker))].join(' / ');
    console.log(`[preprocess] ✓ L${item.level}/U${item.unit_number} ${item.id.slice(0, 8)} → ${finalSegments.length} segs (${speakers})`);
    updated++;
  }

  // Print 3 random spot-check samples from what was updated
  const samples = flagged.filter(i => !failures.find(f => f.id === i.id)).slice(0, 3);
  if (samples.length) {
    console.log('\n[preprocess] Spot-check samples:');
    for (const s of samples) {
      const [r] = await query(
        "SELECT speaker_segments FROM curriculum_listening WHERE id=$1",
        [s.id]
      );
      const segs = Array.isArray(r.speaker_segments) ? r.speaker_segments : JSON.parse(r.speaker_segments);
      console.log(`  ${s.id.slice(0, 8)}: ${segs.length} segs, speakers: ${[...new Set(segs.map(x => x.speaker))].join(', ')}`);
    }
  }

  if (failures.length) {
    const failPath = path.join(ROOT, 'docs/audits/audio-issues/preprocess-failures.json');
    fs.writeFileSync(failPath, JSON.stringify(failures, null, 2));
    console.log(`\n[preprocess] ${failures.length} failures written to preprocess-failures.json`);
  }

  console.log(`\n[preprocess] Done: ${updated} updated, ${failures.length} failed`);
  await closeDb();
}

main().catch(e => { console.error(e); process.exit(1); });
