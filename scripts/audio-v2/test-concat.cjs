'use strict';
/**
 * test-concat.cjs — proof test for the concat fix.
 * Generates 3 synthetic MP3 tone clips via ffmpeg (no API cost),
 * concatenates them with concatMp3Buffers, and verifies:
 *   1. verifyMp3Decodes(result.buffer) === true
 *   2. result.durationMs ≈ sum of segment durations + 600ms (2 gaps), within 5%
 *   3. segmentOffsets are printed
 */
const { concatMp3Buffers, verifyMp3Decodes } = require('./lib/concat.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

function generateToneMp3(durationSec, freq = 440) {
  const tmp = path.join(os.tmpdir(), `tone-${Date.now()}-${freq}.mp3`);
  execSync(
    `ffmpeg -y -f lavfi -i "sine=frequency=${freq}:duration=${durationSec}" ` +
    `-c:a libmp3lame -ar 44100 -b:a 128k -ac 1 "${tmp}"`,
    { stdio: 'pipe' }
  );
  const buf = fs.readFileSync(tmp);
  fs.unlinkSync(tmp);
  return buf;
}

async function main() {
  console.log('\n[test-concat] Generating 3 synthetic MP3 clips...');
  const DURATIONS_SEC = [2.0, 1.5, 2.5]; // expected ~6s + 2×300ms gaps = ~6.6s
  const buffers = [
    generateToneMp3(DURATIONS_SEC[0], 440),
    generateToneMp3(DURATIONS_SEC[1], 550),
    generateToneMp3(DURATIONS_SEC[2], 660),
  ];
  console.log(`  Clip sizes: ${buffers.map(b => `${b.length} bytes`).join(', ')}`);

  console.log('[test-concat] Running concatMp3Buffers...');
  const result = await concatMp3Buffers(buffers);

  // Check 1: decode verification
  const decodes = verifyMp3Decodes(result.buffer);
  const decodeStatus = decodes ? '✓ PASS' : '✗ FAIL';
  console.log(`[test-concat] Decode verify: ${decodeStatus}`);
  if (!decodes) { console.error('DECODE VERIFICATION FAILED — concat is still broken'); process.exit(1); }

  // Check 2: duration check (sum of segments + 2×300ms gaps, allow ±5%)
  const expectedMs = DURATIONS_SEC.reduce((s, d) => s + d * 1000, 0) + 2 * 300;
  const loBound = expectedMs * 0.95;
  const hiBound = expectedMs * 1.05;
  const durationOk = result.durationMs >= loBound && result.durationMs <= hiBound;
  console.log(`[test-concat] Duration: ${result.durationMs}ms (expected ~${Math.round(expectedMs)}ms, range [${Math.round(loBound)}, ${Math.round(hiBound)}]): ${durationOk ? '✓ PASS' : '✗ FAIL'}`);
  if (!durationOk) { console.error('DURATION CHECK FAILED'); process.exit(1); }

  // Print offsets
  console.log(`[test-concat] Segment offsets (ms): ${JSON.stringify(result.segmentOffsets)}`);
  console.log(`[test-concat] Segment durations (ms): ${JSON.stringify(result.segmentDurations)}`);

  console.log('\n[test-concat] ✓ All checks passed — concat fix is working correctly!\n');
}

main().catch(e => { console.error('[test-concat] FATAL:', e.message); process.exit(1); });
