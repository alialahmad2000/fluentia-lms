'use strict';
/**
 * audit-listening-decode.cjs
 * For every curriculum_listening row with audio_url:
 *   - Download the file
 *   - Run verifyMp3Decodes (ffmpeg -f null decode test)
 *   - Estimate expected duration from speaker_segments text word count / 2.5 wps
 *   - Flag for regeneration if: decode fails OR real duration < 75% of expected
 * Writes docs/audits/listening-overhaul/regen-list.json
 */
const { Client } = require('pg');
const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifyMp3Decodes } = require('./lib/concat.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'docs', 'audits', 'listening-overhaul');
const OUT_FILE = path.join(OUT_DIR, 'regen-list.json');

fs.mkdirSync(OUT_DIR, { recursive: true });

const db = new Client({
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
});

function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const tmp = path.join(os.tmpdir(), `audit-${Date.now()}.mp3`);
    const file = fs.createWriteStream(tmp);
    https.get(url, res => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(tmp); });
    }).on('error', reject);
  });
}

function getRealDurationMs(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { stdio: 'pipe' }
    ).toString().trim();
    return Math.round(parseFloat(out) * 1000);
  } catch { return 0; }
}

function estimateExpectedMs(speakerSegments) {
  if (!speakerSegments || !speakerSegments.length) return 0;
  const totalWords = speakerSegments.reduce((sum, seg) => {
    const words = (seg.text || '').split(/\s+/).filter(Boolean).length;
    return sum + words;
  }, 0);
  // 2.5 words per second + 300ms gaps between segments
  const speechMs = (totalWords / 2.5) * 1000;
  const gapMs = Math.max(0, speakerSegments.length - 1) * 300;
  return Math.round(speechMs + gapMs);
}

async function main() {
  await db.connect();
  console.log('[audit] Connected to DB');

  const { rows } = await db.query(`
    SELECT cl.id, cl.audio_url, cl.audio_type, cl.speaker_segments,
           clv.level_number, cu.unit_number
    FROM curriculum_listening cl
    JOIN curriculum_units cu ON cu.id = cl.unit_id
    JOIN curriculum_levels clv ON clv.id = cu.level_id
    WHERE cl.audio_url IS NOT NULL
    ORDER BY clv.level_number, cu.unit_number
  `);

  console.log(`[audit] ${rows.length} rows to check`);

  const results = [];
  let ok = 0, flagged = 0;

  for (const row of rows) {
    const label = `L${row.level_number}/U${row.unit_number} ${row.id.slice(0, 8)}`;
    let tmpFile = null;
    try {
      tmpFile = await downloadFile(row.audio_url);
      const decodes = verifyMp3Decodes(tmpFile);
      const realMs = decodes ? getRealDurationMs(tmpFile) : 0;
      const segs = Array.isArray(row.speaker_segments)
        ? row.speaker_segments
        : JSON.parse(row.speaker_segments || '[]');
      const expectedMs = estimateExpectedMs(segs);
      const durationRatio = expectedMs > 0 ? realMs / expectedMs : 1;
      const shouldRegen = !decodes || durationRatio < 0.75;

      const entry = {
        id: row.id,
        level: row.level_number,
        unit_number: row.unit_number,
        audio_type: row.audio_type,
        flags: [],
        decodes,
        real_ms: realMs,
        expected_ms: expectedMs,
        duration_ratio: Math.round(durationRatio * 100) / 100,
      };
      if (!decodes) entry.flags.push('DECODE_FAIL');
      if (decodes && durationRatio < 0.75) entry.flags.push('TRUNCATED');

      if (shouldRegen) {
        console.log(`  ✗ ${label} → FLAGGED (decodes=${decodes}, ratio=${durationRatio.toFixed(2)})`);
        flagged++;
      } else {
        console.log(`  ✓ ${label} → OK (${realMs}ms / ${expectedMs}ms expected)`);
        ok++;
      }
      results.push(entry);
    } catch (e) {
      console.error(`  ✗ ${label} → ERROR: ${e.message}`);
      results.push({ id: row.id, level: row.level_number, unit_number: row.unit_number, audio_type: row.audio_type, flags: ['DOWNLOAD_ERROR'], error: e.message });
      flagged++;
    } finally {
      if (tmpFile) { try { fs.unlinkSync(tmpFile); } catch {} }
    }
  }

  const regenItems = results.filter(r => r.flags.length > 0);
  const output = {
    audited_at: new Date().toISOString(),
    total: rows.length,
    ok,
    flagged,
    items: regenItems,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  console.log(`\n[audit] Done: ${ok} OK, ${flagged} flagged → ${OUT_FILE}`);
  await db.end();
}

main().catch(e => { console.error('[audit] FATAL:', e); process.exit(1); });
