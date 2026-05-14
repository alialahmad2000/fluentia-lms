'use strict';
// Concatenate MP3 buffers with 300ms silence between segments.
// CRITICAL: re-encode (libmp3lame), never -c copy. -c copy on MP3 segments with
// per-call encoder-delay drift produces a file whose header duration is correct
// but whose audio decodes only up to the first segment boundary.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TARGET_SR = 44100;
const TARGET_BR = '128k';
const TARGET_CH = 1; // mono — ElevenLabs TTS is mono; keeps files small

const SILENCE_MP3 = path.join(__dirname, '..', 'silence-300ms.mp3');

function ensureSilence() {
  if (!fs.existsSync(SILENCE_MP3)) {
    execSync(
      `ffmpeg -y -f lavfi -i anullsrc=r=${TARGET_SR}:cl=mono -t 0.3 ` +
      `-c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${SILENCE_MP3}"`,
      { stdio: 'pipe' }
    );
  }
}

/**
 * Returns { buffer, durationMs, segmentOffsets, segmentDurations } where
 * segmentOffsets[i] is the start time (ms) of segment i in the final file.
 * Silence gaps are included in the math so offsets stay accurate.
 */
async function concatMp3Buffers(buffers) {
  if (!buffers.length) throw new Error('No buffers to concat');
  if (buffers.length === 1) {
    // single segment: still normalize and decode-verify
    ensureSilence();
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluentia-concat-'));
    try {
      const raw = path.join(tmpDir, 'raw-0.mp3');
      const norm = path.join(tmpDir, 'norm-0.mp3');
      fs.writeFileSync(raw, buffers[0]);
      execSync(
        `ffmpeg -y -i "${raw}" -c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${norm}"`,
        { stdio: 'pipe' }
      );
      execSync(`ffmpeg -v error -i "${norm}" -f null -`, { stdio: 'pipe' });
      const result = fs.readFileSync(norm);
      const dur = parseFloat(
        execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${norm}"`).toString().trim()
      );
      const durMs = Math.round(dur * 1000);
      return { buffer: result, durationMs: durMs, segmentOffsets: [0], segmentDurations: [durMs] };
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  ensureSilence();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluentia-concat-'));

  try {
    // 1. Normalize EVERY segment to identical codec params first.
    const normPaths = [];
    const segmentDurations = [];
    buffers.forEach((buf, i) => {
      const raw = path.join(tmpDir, `raw-${i}.mp3`);
      const norm = path.join(tmpDir, `norm-${i}.mp3`);
      fs.writeFileSync(raw, buf);
      execSync(
        `ffmpeg -y -i "${raw}" -c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${norm}"`,
        { stdio: 'pipe' }
      );
      normPaths.push(norm);
      const dur = parseFloat(
        execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${norm}"`).toString().trim()
      );
      segmentDurations.push(Math.round(dur * 1000));
    });

    // 2. Build concat list with silence between segments.
    const listPath = path.join(tmpDir, 'list.txt');
    const lines = [];
    normPaths.forEach((p, i) => {
      lines.push(`file '${p.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`);
      if (i < normPaths.length - 1) {
        lines.push(`file '${SILENCE_MP3.replace(/\\/g, '/').replace(/'/g, "'\\''")}'`);
      }
    });
    fs.writeFileSync(listPath, lines.join('\n'));

    // 3. Concat WITH RE-ENCODING. This is the fix. Never -c copy here.
    const outPath = path.join(tmpDir, 'out.mp3');
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" ` +
      `-c:a libmp3lame -ar ${TARGET_SR} -b:a ${TARGET_BR} -ac ${TARGET_CH} "${outPath}"`,
      { stdio: 'pipe' }
    );

    // 4. DECODE-VERIFY the output. Header duration is not enough.
    try {
      execSync(`ffmpeg -v error -i "${outPath}" -f null -`, { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`Concat output failed decode verification: ${e.message}`);
    }

    const result = fs.readFileSync(outPath);
    const totalDur = parseFloat(
      execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outPath}"`).toString().trim()
    );

    // 5. Compute per-segment offsets (segment i starts after all prior segments + 300ms gaps).
    const SILENCE_MS = 300;
    const segmentOffsets = [];
    let cursor = 0;
    segmentDurations.forEach((durMs, i) => {
      segmentOffsets.push(cursor);
      cursor += durMs + (i < segmentDurations.length - 1 ? SILENCE_MS : 0);
    });

    return {
      buffer: result,
      durationMs: Math.round(totalDur * 1000),
      segmentOffsets,
      segmentDurations,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Standalone decode verification for any mp3 file or buffer. */
function verifyMp3Decodes(input) {
  let tmp = null;
  const isBuffer = Buffer.isBuffer(input);
  if (isBuffer) {
    tmp = path.join(os.tmpdir(), `verify-${Date.now()}.mp3`);
    fs.writeFileSync(tmp, input);
  }
  const target = isBuffer ? tmp : input;
  try {
    execSync(`ffmpeg -v error -i "${target}" -f null -`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    if (isBuffer && tmp) { try { fs.rmSync(tmp, { force: true }); } catch {} }
  }
}

module.exports = { concatMp3Buffers, verifyMp3Decodes };
