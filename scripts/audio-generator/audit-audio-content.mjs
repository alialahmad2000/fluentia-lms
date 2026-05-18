/**
 * 01-AUDIT-AUDIO-CONTENT — Read-only comprehensive audio audit
 * Phases B (listening), C (reading), D (UI components), E (word timestamps)
 *
 * Run: node scripts/audio-generator/audit-audio-content.mjs
 */

import { query, closeDb } from './lib/db.mjs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'docs/audits/audio-issues');

// ─── helpers ─────────────────────────────────────────────────────────────────

async function ffprobeDuration(url) {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      url,
    ], { timeout: 30_000 });
    const d = parseFloat(stdout.trim());
    return isNaN(d) ? null : d;
  } catch {
    return null;
  }
}

function stripSpeakerLabels(text) {
  if (!text) return '';
  return text.replace(/^[A-Z][A-Za-z\s]{0,30}?:\s*/gm, '').trim();
}

function wordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function expectedDuration(transcript) {
  const stripped = stripSpeakerLabels(transcript);
  return wordCount(stripped) / 2.5; // 150 wpm = 2.5 wps
}

function hasLabelInText(segments) {
  if (!Array.isArray(segments)) return false;
  for (const seg of segments) {
    const t = seg.text || '';
    if (/\b[A-Z][a-z]+:\s/.test(t)) return true;
  }
  return false;
}

function labelInTranscript(transcript) {
  if (!transcript) return false;
  return /\b[A-Z][A-Za-z\s]{0,20}?:\s/.test(transcript);
}

async function runBatch(items, fn, concurrency = 6) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ─── Phase B — Listening audit ────────────────────────────────────────────────

async function auditListening() {
  console.log('\n── Phase B: Listening audit ──');

  const rows = await query(`
    SELECT
      cl.id, cl.title_en, cl.audio_url, cl.audio_duration_seconds,
      cl.audio_type, cl.transcript, cl.speaker_segments, cl.word_timestamps,
      cu.unit_number, lv.level_number
    FROM curriculum_listening cl
    JOIN curriculum_units cu ON cl.unit_id = cu.id
    JOIN curriculum_levels lv ON cu.level_id = lv.id
    WHERE cl.audio_url IS NOT NULL
    ORDER BY lv.level_number, cu.unit_number, cl.listening_number
  `);

  console.log(`  ${rows.length} listening items to audit…`);

  const items = await runBatch(rows, async (row, i) => {
    process.stdout.write(`\r  ffprobe ${i + 1}/${rows.length}  `);

    const actual = await ffprobeDuration(row.audio_url);
    const expected = expectedDuration(row.transcript);
    const ratio = actual != null && expected > 0 ? actual / expected : null;

    const flags = [];
    if (ratio != null && ratio < 0.75) flags.push('TRUNCATED');

    const segs = Array.isArray(row.speaker_segments) ? row.speaker_segments : [];
    const audioType = (row.audio_type || '').toLowerCase();
    const isMultiVoiceType = ['dialogue', 'interview'].includes(audioType);

    if (isMultiVoiceType) {
      const uniqueVoices = new Set(segs.map(s => s.voice_id).filter(Boolean)).size;
      if (segs.length === 0 || uniqueVoices < 2) flags.push('SINGLE_VOICE_WRONG');
      // Only check speaker_segments[].text — raw transcript always has labels
      if (hasLabelInText(segs)) flags.push('LABEL_IN_TEXT');
    } else if (['monologue', 'lecture'].includes(audioType)) {
      if (segs.length > 1) flags.push('METADATA_MISMATCH');
    }

    return {
      id: row.id,
      level: row.level_number,
      unit: row.unit_number,
      title_en: row.title_en,
      audio_type: row.audio_type,
      audio_url: row.audio_url,
      expected_duration_s: Math.round(expected * 10) / 10,
      actual_duration_s: actual != null ? Math.round(actual * 10) / 10 : null,
      duration_ratio: ratio != null ? Math.round(ratio * 1000) / 1000 : null,
      speaker_segments_count: segs.length,
      unique_voices: new Set(segs.map(s => s.voice_id).filter(Boolean)).size,
      has_word_timestamps: row.word_timestamps != null,
      word_timestamp_count: row.word_timestamps != null ? Object.keys(row.word_timestamps).length : 0,
      has_label_in_text: hasLabelInText(segs),
      flags,
    };
  });

  process.stdout.write('\n');
  return items;
}

// ─── Phase C — Reading audit ──────────────────────────────────────────────────

async function auditReading() {
  console.log('\n── Phase C: Reading audit ──');

  const rows = await query(`
    SELECT
      rpa.passage_id, rpa.full_audio_url, rpa.full_duration_ms,
      rpa.paragraph_audio, rpa.word_timestamps,
      cr.title_en, cr.passage_content, cr.passage_word_count,
      cr.reading_label,
      cu.unit_number, lv.level_number
    FROM reading_passage_audio rpa
    JOIN curriculum_readings cr ON rpa.passage_id = cr.id
    JOIN curriculum_units cu ON cr.unit_id = cu.id
    JOIN curriculum_levels lv ON cu.level_id = lv.id
    WHERE rpa.full_audio_url IS NOT NULL
    ORDER BY lv.level_number, cu.unit_number, cr.reading_label
  `);

  console.log(`  ${rows.length} reading passages to audit…`);

  const items = await runBatch(rows, async (row, i) => {
    process.stdout.write(`\r  ffprobe ${i + 1}/${rows.length}  `);

    const actual = await ffprobeDuration(row.full_audio_url);

    // Compute expected from passage_content JSONB
    let passageText = '';
    let pc = null;
    try {
      pc = typeof row.passage_content === 'string'
        ? JSON.parse(row.passage_content)
        : row.passage_content;
      if (Array.isArray(pc?.paragraphs)) {
        passageText = pc.paragraphs.join(' ');
      } else if (typeof pc === 'string') {
        passageText = pc;
      }
    } catch {}

    const dbWordCount = row.passage_word_count || wordCount(passageText);
    const expected = dbWordCount / 2.5;
    const ratio = actual != null && expected > 0 ? actual / expected : null;

    const flags = [];
    if (ratio != null && ratio < 0.75) flags.push('TRUNCATED');

    // Word timestamps completeness
    let wt = null;
    try {
      wt = typeof row.word_timestamps === 'string'
        ? JSON.parse(row.word_timestamps)
        : row.word_timestamps;
    } catch {}

    // word_timestamps is a numeric-keyed object: {"0": {word,start_ms,end_ms}, "1":...}
    let tsWordCount = 0;
    if (wt != null) {
      if (typeof wt === 'object' && !Array.isArray(wt)) {
        if (wt.paragraphs) {
          for (const p of wt.paragraphs) tsWordCount += (p.words || []).length;
        } else {
          // numeric-keyed: {"0": {word,...}, "1": {word,...}, ...}
          tsWordCount = Object.keys(wt).length;
        }
      } else if (Array.isArray(wt)) {
        tsWordCount = wt.length;
      }
    }

    const tsDiff = dbWordCount > 0
      ? Math.abs(tsWordCount - dbWordCount) / dbWordCount
      : 0;
    if (wt == null) flags.push('NO_TIMESTAMPS');
    else if (tsDiff > 0.15) flags.push('TIMESTAMPS_INCOMPLETE');

    // Paragraph audio mismatch
    let paraAudio = null;
    try {
      paraAudio = typeof row.paragraph_audio === 'string'
        ? JSON.parse(row.paragraph_audio)
        : row.paragraph_audio;
    } catch {}

    const paraCount = Array.isArray(pc?.paragraphs)
      ? pc.paragraphs.length
      : (passageText.split(/\n\n+/).filter(Boolean).length);
    const paraAudioCount = Array.isArray(paraAudio) ? paraAudio.length : 0;
    if (paraAudioCount > 0 && paraAudioCount !== paraCount) flags.push('PARAGRAPH_AUDIO_MISMATCH');

    return {
      id: row.passage_id,
      level: row.level_number,
      unit: row.unit_number,
      reading_label: row.reading_label,
      title_en: row.title_en,
      audio_url: row.full_audio_url,
      passage_word_count: dbWordCount,
      expected_duration_s: Math.round(expected * 10) / 10,
      actual_duration_s: actual != null ? Math.round(actual * 10) / 10 : null,
      duration_ratio: ratio != null ? Math.round(ratio * 1000) / 1000 : null,
      has_word_timestamps: wt != null,
      ts_word_count: tsWordCount,
      ts_coverage_pct: dbWordCount > 0 ? Math.round((tsWordCount / dbWordCount) * 100) : null,
      para_count: paraCount,
      para_audio_count: paraAudioCount,
      flags,
    };
  });

  process.stdout.write('\n');
  return items;
}

// ─── Phase D — UI component audit ────────────────────────────────────────────

async function auditUI() {
  console.log('\n── Phase D: UI component audit ──');

  const { stdout: audioFiles } = await execFileAsync('grep', [
    '-rln',
    '--include=*.jsx',
    '--include=*.tsx',
    'ReadingTab\\|ListeningTab\\|reading_passage_audio\\|curriculum_listening\\|ListeningAudioPlayer\\|ReadingPassagePlayer',
    path.join(ROOT, 'src'),
  ]).catch(e => ({ stdout: e.stdout || '' }));

  const files = audioFiles.trim().split('\n').filter(Boolean);

  const results = [];
  for (const f of files) {
    let content = '';
    try { content = await fs.readFile(f, 'utf8'); } catch { continue; }

    const rel = f.replace(ROOT + '/', '');
    const hasHideToggle = /transcript.*hidden|hide.*text|إخفاء.*النص|إظهار.*النص|transcriptHidden/i.test(content);
    const hasPerWordClick = /word_timestamps|onWordClick|wordClick|currentTime.*word/i.test(content);
    const readsListening = /curriculum_listening/.test(content);
    const readsReading = /curriculum_readings|reading_passage_audio/.test(content);
    const usesListeningPlayer = /ListeningAudioPlayer/.test(content);
    const usesReadingPlayer = /ReadingPassagePlayer/.test(content);

    results.push({ file: rel, hasHideToggle, hasPerWordClick, readsListening, readsReading, usesListeningPlayer, usesReadingPlayer });
  }
  return results;
}

// ─── Phase E — Word timestamps availability ───────────────────────────────────

async function auditTimestamps() {
  console.log('\n── Phase E: Word timestamps availability ──');

  const [listRes, readRes] = await Promise.all([
    query(`
      SELECT
        COUNT(*) FILTER (WHERE word_timestamps IS NOT NULL) AS with_ts,
        COUNT(*) AS total
      FROM curriculum_listening
      WHERE audio_url IS NOT NULL
    `),
    query(`
      SELECT
        COUNT(*) FILTER (WHERE word_timestamps IS NOT NULL) AS with_ts,
        COUNT(*) AS total
      FROM reading_passage_audio
    `),
  ]);

  return {
    listening: { withTs: Number(listRes[0].with_ts), total: Number(listRes[0].total) },
    reading: { withTs: Number(readRes[0].with_ts), total: Number(readRes[0].total) },
  };
}

// ─── report helpers ───────────────────────────────────────────────────────────

function summarize(items) {
  const flagged = k => items.filter(i => i.flags.includes(k));
  return {
    total: items.length,
    truncated: flagged('TRUNCATED').length,
    singleVoice: flagged('SINGLE_VOICE_WRONG').length,
    labelInText: flagged('LABEL_IN_TEXT').length,
    noTimestamps: flagged('NO_TIMESTAMPS').length,
    tsIncomplete: flagged('TIMESTAMPS_INCOMPLETE').length,
    paraAudioMismatch: flagged('PARAGRAPH_AUDIO_MISMATCH').length,
    healthy: items.filter(i => i.flags.length === 0).length,
  };
}

function writeMasterReport(listening, reading, ui, ts) {
  const lSum = summarize(listening);
  const rSum = summarize(reading);

  const flaggedL = listening.filter(i => i.flags.length > 0);
  const flaggedR = reading.filter(i => i.flags.length > 0);

  const lCharEst = flaggedL.reduce((acc, i) => {
    // expected_duration_s * 2.5 wps ≈ word count
    const wc = Math.round((i.expected_duration_s || 0) * 2.5);
    return acc + wc * 6;
  }, 0);
  const rCharEst = flaggedR.reduce((acc, i) => {
    return acc + (i.passage_word_count || 0) * 6;
  }, 0);

  const md = `# Audio Issues — Master Audit Report
Generated: ${new Date().toISOString()}
Auditor: 01-AUDIT-AUDIO-CONTENT (re-run post-regen, Mac, read-only)

---

## Summary

### Listening (${lSum.total} items audited — \`curriculum_listening\`)

| Issue | Count | % |
|---|---|---|
| Truncated (actual < 75% expected duration) | ${lSum.truncated} | ${Math.round(lSum.truncated / lSum.total * 100)}% |
| Single voice when should be multi | ${lSum.singleVoice} | ${Math.round(lSum.singleVoice / lSum.total * 100)}% |
| Speaker labels in TTS text | ${lSum.labelInText} | ${Math.round(lSum.labelInText / lSum.total * 100)}% |
| **Healthy (zero flags)** | **${lSum.healthy}** | **${Math.round(lSum.healthy / lSum.total * 100)}%** |
| Has \`word_timestamps\` | **${ts.listening.withTs}** | **${Math.round(ts.listening.withTs / ts.listening.total * 100)}%** |

${ts.listening.withTs === 0 ? '> ⚠️ `curriculum_listening.word_timestamps` is NULL for every item. Per-word audio seek is completely non-functional for the listening tab.' : ts.listening.withTs < ts.listening.total ? `> ⚠️ Only ${ts.listening.withTs}/${ts.listening.total} listening items have word_timestamps.` : '> ✅ All listening items have word_timestamps.'}

**Levels affected:**
${[1, 2, 3, 4, 5].map(lvl => {
  const lvlItems = listening.filter(i => i.level === lvl);
  if (lvlItems.length === 0) return null;
  const flagged = lvlItems.filter(i => i.flags.length > 0);
  return `- L${lvl}: ${flagged.length === 0 ? 'All healthy ✅' : `${flagged.length}/${lvlItems.length} flagged — ${[...new Set(flagged.flatMap(i => i.flags))].join(', ')}`}`;
}).filter(Boolean).join('\n')}

---

### Reading (${rSum.total} items audited — \`reading_passage_audio\`)

| Issue | Count | % |
|---|---|---|
| Truncated (actual < 75% expected duration) | ${rSum.truncated} | ${Math.round(rSum.truncated / rSum.total * 100)}% |
| No timestamps | ${rSum.noTimestamps} | ${Math.round(rSum.noTimestamps / rSum.total * 100)}% |
| Timestamps incomplete (word coverage mismatch >15%) | ${rSum.tsIncomplete} | ${Math.round(rSum.tsIncomplete / rSum.total * 100)}% |
| Paragraph audio mismatch | ${rSum.paraAudioMismatch} | ${Math.round(rSum.paraAudioMismatch / rSum.total * 100)}% |
| **Healthy (zero flags)** | **${rSum.healthy}** | **${Math.round(rSum.healthy / rSum.total * 100)}%** |
| Has \`word_timestamps\` | **${ts.reading.withTs}** | **${Math.round(ts.reading.withTs / ts.reading.total * 100)}%** |

---

### UI Components

| File | DB source | Hide-text toggle | Per-word click | Notes |
|---|---|---|---|---|
${ui.map(u => `| \`${u.file}\` | ${u.readsListening ? 'listening' : u.readsReading ? 'reading' : '?'} | ${u.hasHideToggle ? '✓' : '✗'} | ${u.hasPerWordClick ? '✓' : '✗'} | ${[u.usesListeningPlayer ? 'ListeningAudioPlayer' : '', u.usesReadingPlayer ? 'ReadingPassagePlayer' : ''].filter(Boolean).join(', ')} |`).join('\n')}

---

### Word-level Pronunciation Feasibility

| Content type | Items | Has word_timestamps | Per-word audio feasible |
|---|---|---|---|
| Reading passages | ${ts.reading.total} | ${ts.reading.withTs} (${Math.round(ts.reading.withTs / ts.reading.total * 100)}%) | ${ts.reading.withTs === ts.reading.total ? '✅ Yes' : `⚠️ Partial (${ts.reading.withTs}/${ts.reading.total})`} |
| Listening items | ${ts.listening.total} | ${ts.listening.withTs} (${Math.round(ts.listening.withTs / ts.listening.total * 100)}%) | ${ts.listening.withTs === 0 ? '❌ No — requires regen or Web Speech API' : ts.listening.withTs < ts.listening.total ? `⚠️ Partial (${ts.listening.withTs}/${ts.listening.total})` : '✅ Yes'} |

---

## Per-item Details

### Listening — ${flaggedL.length} items flagged

| Level | Unit | Title | Audio Type | Flags | Duration ratio |
|---|---|---|---|---|---|
${flaggedL.map(i => `| ${i.level} | ${i.unit} | ${i.title_en || ''} | ${i.audio_type || ''} | ${i.flags.join(', ')} | ${i.duration_ratio ?? 'n/a'} |`).join('\n')}

### Reading — ${flaggedR.length} items flagged

| Level | Unit | Label | Title | Flags | Duration ratio | TS coverage |
|---|---|---|---|---|---|---|
${flaggedR.map(i => `| ${i.level} | ${i.unit} | ${i.reading_label || ''} | ${i.title_en || ''} | ${i.flags.join(', ')} | ${i.duration_ratio ?? 'n/a'} | ${i.ts_coverage_pct != null ? i.ts_coverage_pct + '%' : 'n/a'} |`).join('\n')}

---

### Total ElevenLabs Budget Estimate for Regeneration

| Category | Items | Estimated Characters |
|---|---|---|
| Listening (flagged) | ${flaggedL.length} | ~${lCharEst.toLocaleString()} |
| Reading (flagged) | ${flaggedR.length} | ~${rCharEst.toLocaleString()} |
| **Total** | **${flaggedL.length + flaggedR.length}** | **~${(lCharEst + rCharEst).toLocaleString()}** |

---

## Artifact Index

| File | Description |
|---|---|
| \`docs/audits/audio-issues/listening-audit.json\` | Per-item listening audit |
| \`docs/audits/audio-issues/reading-audit.json\` | Per-item reading audit |
| \`docs/audits/audio-issues/ui-component-audit.md\` | UI component analysis |
| \`docs/audits/audio-issues/MASTER-REPORT.md\` | This file |

---

*No DB rows were modified. No audio was generated. No storage objects were touched.*
`;

  return md;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== 01-AUDIT-AUDIO-CONTENT (Mac re-run) ===');
  await fs.mkdir(OUT_DIR, { recursive: true });

  const [listening, reading, ui, ts] = await Promise.all([
    auditListening(),
    auditReading(),
    auditUI(),
    auditTimestamps(),
  ]);

  // Write JSON inventories
  await fs.writeFile(
    path.join(OUT_DIR, 'listening-audit.json'),
    JSON.stringify({
      audited_at: new Date().toISOString(),
      total_items: listening.length,
      items: listening,
    }, null, 2),
  );
  await fs.writeFile(
    path.join(OUT_DIR, 'reading-audit.json'),
    JSON.stringify({
      audited_at: new Date().toISOString(),
      total_items: reading.length,
      items: reading,
    }, null, 2),
  );

  // UI component audit markdown
  const uiMd = `# UI Component Audit (audio-content)
Generated: ${new Date().toISOString()}

${ui.map(u => `## ${u.file}
- DB source: ${u.readsListening ? 'curriculum_listening' : u.readsReading ? 'curriculum_readings/reading_passage_audio' : 'unknown'}
- Renders hide-text toggle: ${u.hasHideToggle ? 'YES ✓ (expected for listening)' : 'NO'}
- Renders per-word click: ${u.hasPerWordClick ? 'YES ✓' : 'NO ⚠️'}
- Player component: ${[u.usesListeningPlayer ? 'ListeningAudioPlayer' : '', u.usesReadingPlayer ? 'ReadingPassagePlayer' : ''].filter(Boolean).join(', ') || 'custom'}
`).join('\n')}
`;
  await fs.writeFile(path.join(OUT_DIR, 'ui-component-audit.md'), uiMd);

  // Master report
  const report = writeMasterReport(listening, reading, ui, ts);
  await fs.writeFile(path.join(OUT_DIR, 'MASTER-REPORT.md'), report);

  const lSum = summarize(listening);
  const rSum = summarize(reading);
  console.log(`
=== AUDIT COMPLETE ===

Listening (${lSum.total} items):
  Truncated:        ${lSum.truncated}
  Single-voice:     ${lSum.singleVoice}
  Label-in-text:    ${lSum.labelInText}
  Healthy:          ${lSum.healthy}
  Has timestamps:   ${ts.listening.withTs}/${ts.listening.total}

Reading (${rSum.total} items):
  Truncated:        ${rSum.truncated}
  No timestamps:    ${rSum.noTimestamps}
  TS incomplete:    ${rSum.tsIncomplete}
  Para mismatch:    ${rSum.paraAudioMismatch}
  Healthy:          ${rSum.healthy}
  Has timestamps:   ${ts.reading.withTs}/${ts.reading.total}

UI files audited: ${ui.length}
Reports written to: docs/audits/audio-issues/
`);

  await closeDb();
}

main().catch(e => { console.error(e); closeDb(); process.exit(1); });
