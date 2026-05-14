/**
 * 05-verify-regen.mjs — Phase E post-regeneration verification
 * Checks: duration ≥ 80% expected, ≥2 unique voices for dialogues/interviews,
 *         no label residue in segments, word_timestamps present and plausible.
 */

import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { query, closeDb } from '../audio-generator/lib/db.mjs';

const require = createRequire(import.meta.url);
const { assertNoLabelResidue } = require('./lib/speaker-map.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const auditRaw = fs.readFileSync(path.join(ROOT, 'docs/audits/audio-issues/listening-audit.json'), 'utf8');
const audit = JSON.parse(auditRaw);
const flagged = audit.items.filter(i => i.flags.length > 0);

console.log(`[verify] Checking ${flagged.length} regenerated items\n`);

const failures = [];
const passing  = [];

for (const item of flagged) {
  const [row] = await query(
    `SELECT cl.id, cl.audio_url, cl.audio_type, cl.audio_duration_seconds,
            cl.word_timestamps, cl.speaker_segments,
            lv.level_number
     FROM curriculum_listening cl
     JOIN curriculum_units cu ON cl.unit_id = cu.id
     JOIN curriculum_levels lv ON cu.level_id = lv.id
     WHERE cl.id=$1`,
    [item.id]
  );

  if (!row) {
    failures.push({ id: item.id, checks: ['row not found in DB'] });
    continue;
  }

  const itemFailures = [];
  const label = `L${row.level_number}/U${item.unit_number} ${item.id.slice(0, 8)}`;

  // E.1 — Duration check
  const expectedS  = item.expected_duration_s;
  const actualS    = row.audio_duration_seconds;
  const ratio      = actualS && expectedS ? actualS / expectedS : 0;
  if (ratio < 0.80) {
    itemFailures.push(`STILL_TRUNCATED (actual=${actualS}s, expected=${expectedS}s, ratio=${ratio.toFixed(2)})`);
  }

  // E.2 — Voice variety (dialogues/interviews must have ≥ 2 unique voice_ids)
  const segs = Array.isArray(row.speaker_segments) ? row.speaker_segments : JSON.parse(row.speaker_segments || '[]');
  const uniqueVoices = new Set(segs.map(s => s.voice_id)).size;
  if (['dialogue', 'interview'].includes(row.audio_type) && uniqueVoices < 2) {
    itemFailures.push(`SINGLE_VOICE_STILL (${uniqueVoices} unique voice_ids, type=${row.audio_type})`);
  }

  // E.3 — Label residue check on segments
  try {
    assertNoLabelResidue(segs.map(s => ({ ...s, text: s.text || '' })));
  } catch (e) {
    itemFailures.push(`LABEL_RESIDUE: ${e.message}`);
  }

  // E.4 — Word timestamps sanity
  const wts = Array.isArray(row.word_timestamps) ? row.word_timestamps : JSON.parse(row.word_timestamps || 'null');
  if (!wts || !wts.length) {
    itemFailures.push('NO_WORD_TIMESTAMPS');
  } else {
    // Word count check: ±15%
    const segWordCount = segs.reduce((n, s) => n + (s.text || '').split(/\s+/).filter(Boolean).length, 0);
    const tsWordCount  = wts.length;
    const deviation    = Math.abs(segWordCount - tsWordCount) / Math.max(segWordCount, 1);
    if (deviation > 0.15) {
      itemFailures.push(`TS_WORD_COUNT_MISMATCH (segs=${segWordCount}, ts=${tsWordCount}, dev=${(deviation * 100).toFixed(1)}%)`);
    }
  }

  if (itemFailures.length) {
    console.log(`✗ ${label} → ${itemFailures.join(' | ')}`);
    failures.push({ id: item.id, level: row.level_number, unit: item.unit_number, checks: itemFailures });
  } else {
    console.log(`✓ ${label} → dur=${actualS}s (${(ratio * 100).toFixed(0)}%), voices=${uniqueVoices}, wts=${wts?.length}`);
    passing.push({ id: item.id, level: row.level_number, unit: item.unit_number, duration_s: actualS, unique_voices: uniqueVoices, wt_count: wts?.length });
  }
}

console.log(`\n[verify] ${passing.length} passed, ${failures.length} failed`);

const outPath = path.join(ROOT, 'docs/audits/audio-issues/verify-results.json');
fs.writeFileSync(outPath, JSON.stringify({ verified_at: new Date().toISOString(), passing: passing.length, failing: failures.length, pass_details: passing, fail_details: failures }, null, 2));

if (failures.length) {
  fs.writeFileSync(
    path.join(ROOT, 'docs/audits/audio-issues/post-regen-failures.json'),
    JSON.stringify(failures, null, 2)
  );
  console.log('[verify] Failures written to post-regen-failures.json');
}

await closeDb();
