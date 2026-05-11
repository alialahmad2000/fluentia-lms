/**
 * run-all.mjs — Audio Generation V2 Orchestrator
 *
 * Runs: vocab → reading → listening (cheapest first)
 * Verbs: skipped — all 85 already have audio (verified 2026-05-11)
 *
 * Flags: --dry-run, --level=..., --force
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getQuota } from './lib/eleven.mjs';
import { assertBudget, HARD_LIMIT } from './lib/budget.mjs';
import { runVocab } from './generate-vocab.mjs';
import { runReading } from './generate-reading.mjs';
import { runListening } from './generate-listening.mjs';
import { closeDb } from './lib/db.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  FLUENTIA AUDIO GENERATION V2');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE GENERATION'}`);
  console.log('═══════════════════════════════════════════════════════\n');

  const quota = await getQuota();
  console.log(`ElevenLabs: ${quota.remaining.toLocaleString()} chars remaining (limit ${quota.limit.toLocaleString()})\n`);

  // ─── Phase C: Dry-run estimates ─────────────────────────────────────────────
  console.log('Running dry-run estimates...');
  const vocabEst   = await runVocab({ dryRun: true });
  const readingEst = await runReading({ dryRun: true });
  const listenEst  = await runListening({ dryRun: true });

  const totalChars = vocabEst.chars + readingEst.chars + listenEst.chars;
  const estCostUsd = (totalChars * 0.0004).toFixed(2);
  const headroom   = ((1 - totalChars / quota.remaining) * 100).toFixed(1);

  console.log('\n=== DRY RUN ===');
  console.log(`Vocab:     ${vocabEst.count.toString().padStart(5)} items, ~${vocabEst.chars.toLocaleString().padStart(10)} chars`);
  console.log(`Reading:   ${readingEst.count.toString().padStart(5)} items, ~${readingEst.chars.toLocaleString().padStart(10)} chars`);
  console.log(`Listening: ${listenEst.count.toString().padStart(5)} items, ~${listenEst.chars.toLocaleString().padStart(10)} chars`);
  console.log(`Verbs:     skipped — all 85 already generated`);
  console.log('─'.repeat(55));
  console.log(`TOTAL:     ${(vocabEst.count + readingEst.count + listenEst.count).toString().padStart(5)} items, ~${totalChars.toLocaleString().padStart(10)} chars,  ~$${estCostUsd}`);
  console.log(`Quota remaining: ${quota.remaining.toLocaleString()}`);
  console.log(`Hard limit gate: ${HARD_LIMIT.toLocaleString()}`);
  console.log(`Headroom:        ${headroom}%`);

  // Budget gate
  try {
    assertBudget(totalChars, quota.remaining);
    console.log('Safety margin:   OK ✓\n');
  } catch (e) {
    console.error('\n❌ BUDGET GATE FAILED:', e.message);
    const abortReport = [
      '# AUDIO-PHASE-C-DRYRUN-ABORT',
      `\nGenerated: ${new Date().toISOString()}`,
      '\n## Budget Breakdown',
      `- Vocab: ${vocabEst.chars.toLocaleString()} chars (${vocabEst.count} items)`,
      `- Reading: ${readingEst.chars.toLocaleString()} chars (${readingEst.count} items)`,
      `- Listening: ${listenEst.chars.toLocaleString()} chars (${listenEst.count} items)`,
      `- **Total: ${totalChars.toLocaleString()} chars**`,
      `\n## Quota`,
      `- Remaining: ${quota.remaining.toLocaleString()}`,
      `- Hard limit: ${HARD_LIMIT.toLocaleString()}`,
      `\n## Reason`,
      e.message,
    ].join('\n');
    await fs.mkdir(path.join(ROOT, 'docs/audits'), { recursive: true });
    await fs.writeFile(path.join(ROOT, 'docs/audits/AUDIO-PHASE-C-DRYRUN-ABORT.md'), abortReport);
    console.error('Abort report written to docs/audits/AUDIO-PHASE-C-DRYRUN-ABORT.md');
    await closeDb();
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log('Dry-run complete. Pass no --dry-run flag to generate.');
    await closeDb();
    return;
  }

  // ─── Phase D: Generate ──────────────────────────────────────────────────────
  const logDir = path.join(ROOT, 'logs');
  await fs.mkdir(logDir, { recursive: true });
  const logFile = path.join(logDir, `audio-generation-${Date.now()}.log`);
  const origLog = console.log.bind(console);
  const origErr = console.error.bind(console);
  const logStream = await fs.open(logFile, 'a');
  console.log = (...args) => { origLog(...args); logStream.write(args.join(' ') + '\n'); };
  console.error = (...args) => { origErr(...args); logStream.write('[ERROR] ' + args.join(' ') + '\n'); };

  const results = [];

  console.log('\n═══ GENERATING VOCAB ═══');
  results.push(await runVocab());

  console.log('\n═══ GENERATING READING ═══');
  results.push(await runReading());

  console.log('\n═══ GENERATING LISTENING ═══');
  results.push(await runListening());

  // ─── Final report ────────────────────────────────────────────────────────────
  const afterQuota = await getQuota();
  const charsUsed = quota.remaining - afterQuota.remaining;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  FINAL REPORT');
  console.log('═══════════════════════════════════════════════════════');
  for (const r of results) {
    console.log(`${r.type.padEnd(12)}: ${r.success ?? r.count} OK, ${r.fail ?? 0} failed`);
  }
  console.log(`\nTotal chars used: ~${charsUsed.toLocaleString()}`);
  console.log(`ElevenLabs balance before: ${quota.remaining.toLocaleString()}`);
  console.log(`ElevenLabs balance after:  ${afterQuota.remaining.toLocaleString()}`);
  console.log(`Log written to: ${logFile}`);

  await logStream.close();
  await closeDb();
}

main().catch(async err => {
  console.error('Fatal error:', err);
  await closeDb();
  process.exit(1);
});
