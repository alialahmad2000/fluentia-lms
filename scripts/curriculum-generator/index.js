#!/usr/bin/env node
// ─── Fluentia Content Generator — Main Orchestrator ───────────────────
import 'dotenv/config';
import config from './config.js';
import ClaudeClient from './claude-client.js';
import DbClient from './db-client.js';
import { loadProgress, isCompleted, markCompleted, markFailed, getProgressSummary } from './progress-tracker.js';
import { generateReading } from './generators/reading.js';
import { generateComprehension } from './generators/comprehension.js';
import { generateVocabulary, generateVocabExercises } from './generators/vocabulary.js';
import { generateGrammar } from './generators/grammar.js';
import { generateWriting } from './generators/writing.js';
import { generateListening } from './generators/listening.js';
import { generateSpeaking } from './generators/speaking.js';
import { generateIrregularVerbs } from './generators/irregular-verbs.js';
import { generateAssessment } from './generators/assessment.js';

// ─── Parse CLI Arguments ──────────────────────────────────────────────
function parseArgs(argv) {
  const args = { level: null, unit: null, content: null, dryRun: false, all: false };
  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--level': args.level = parseInt(argv[++i]); break;
      case '--unit': args.unit = parseInt(argv[++i]); break;
      case '--content': args.content = argv[++i]; break;
      case '--dry-run': args.dryRun = true; break;
      case '--all': args.all = true; break;
    }
  }
  return args;
}

// ─── Progress Bar ─────────────────────────────────────────────────────
function progressBar(current, total, width = 30) {
  const pct = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `[${bar}] ${pct}% (${current}/${total})`;
}

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs(process.argv);

  console.log('🚀 Fluentia Content Generator');
  console.log('============================');
  if (args.dryRun) console.log('🧪 DRY RUN MODE — no database writes\n');
  else console.log('');

  // Validate env vars
  if (!process.env.CLAUDE_API_KEY) {
    console.error('❌ Missing CLAUDE_API_KEY environment variable');
    process.exit(1);
  }
  if (!args.dryRun && (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const claude = new ClaudeClient(config);
  const db = args.dryRun ? null : new DbClient();

  // Load progress
  const progress = loadProgress();

  // Get units to process
  let units;
  if (args.dryRun && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // In dry-run without DB, create a mock unit
    console.log('📋 Using mock unit for dry-run (no DB connection)\n');
    units = [{
      id: 'mock-unit-id',
      level_id: 'mock-level-id',
      level_number: args.level ?? 0,
      unit_number: args.unit ?? 1,
      theme_en: 'Family and Home',
      theme_ar: 'العائلة والمنزل',
    }];
  } else {
    const dbForFetch = new DbClient();
    const allUnits = await dbForFetch.getUnits();

    if (args.level != null && args.unit != null) {
      units = allUnits.filter(u => u.level_number === args.level && u.unit_number === args.unit);
    } else if (args.level != null) {
      units = allUnits.filter(u => u.level_number === args.level);
    } else if (args.all) {
      units = allUnits;
    } else {
      console.log('Usage: node index.js [--level N] [--unit N] [--all] [--dry-run] [--content type]');
      console.log('  --level N       Process level N (0-5)');
      console.log('  --unit N        Process unit N (1-12) within specified level');
      console.log('  --all           Process all levels and units');
      console.log('  --dry-run       Generate content but do not insert into database');
      console.log('  --content type  Only generate specific content type');
      console.log('                  Types: reading, grammar, writing, listening, speaking, irregular_verbs, assessment');
      process.exit(0);
    }
  }

  if (!units || units.length === 0) {
    console.log('❌ No units found matching the criteria');
    process.exit(1);
  }

  console.log(`📚 Processing ${units.length} unit(s)\n`);

  let processedCount = 0;
  const totalUnits = units.length;

  // Track irregular verbs already generated per level (only need once per level)
  const irregularVerbsDone = new Set();

  for (const unit of units) {
    processedCount++;
    const unitKey = `level_${unit.level_number}_unit_${unit.unit_number}`;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📖 Level ${unit.level_number} — Unit ${unit.unit_number}: ${unit.theme_en}`);
    console.log(`   ${progressBar(processedCount, totalUnits)}`);
    console.log('');

    // Store reading IDs for dependent generators
    unit._readingIds = {};

    // ── Reading A ──
    if (!args.content || args.content === 'reading') {
      if (!isCompleted(progress, unitKey, 'reading_a')) {
        try {
          console.log('  📄 Generating Reading A...');
          const readingA = await generateReading(unit, 'a', config, claude, db, args.dryRun);
          unit._readingIds.a = readingA.readingId;

          console.log('  ❓ Generating Comprehension (Reading A)...');
          await generateComprehension(unit, 'a', readingA, config, claude, db, args.dryRun);

          console.log('  📝 Generating Vocabulary (Reading A)...');
          const vocabA = await generateVocabulary(unit, 'a', readingA, config, claude, db, args.dryRun);

          console.log('  🎯 Generating Vocabulary Exercises (Reading A)...');
          await generateVocabExercises(unit, 'a', vocabA, config, claude, db, args.dryRun);

          markCompleted(progress, unitKey, 'reading_a');
          console.log('  ✅ Reading A complete');
        } catch (err) {
          console.error(`  ❌ Reading A failed: ${err.message}`);
          markFailed(progress, unitKey, 'reading_a', err.message);
        }
      } else {
        console.log('  ⏭️  Reading A already done');
      }
    }

    // ── Reading B ──
    if (!args.content || args.content === 'reading') {
      if (!isCompleted(progress, unitKey, 'reading_b')) {
        try {
          console.log('  📄 Generating Reading B...');
          const readingB = await generateReading(unit, 'b', config, claude, db, args.dryRun);
          unit._readingIds.b = readingB.readingId;

          console.log('  ❓ Generating Comprehension (Reading B)...');
          await generateComprehension(unit, 'b', readingB, config, claude, db, args.dryRun);

          console.log('  📝 Generating Vocabulary (Reading B)...');
          const vocabB = await generateVocabulary(unit, 'b', readingB, config, claude, db, args.dryRun);

          console.log('  🎯 Generating Vocabulary Exercises (Reading B)...');
          await generateVocabExercises(unit, 'b', vocabB, config, claude, db, args.dryRun);

          markCompleted(progress, unitKey, 'reading_b');
          console.log('  ✅ Reading B complete');
        } catch (err) {
          console.error(`  ❌ Reading B failed: ${err.message}`);
          markFailed(progress, unitKey, 'reading_b', err.message);
        }
      } else {
        console.log('  ⏭️  Reading B already done');
      }
    }

    // ── Grammar ──
    if (!args.content || args.content === 'grammar') {
      if (!isCompleted(progress, unitKey, 'grammar')) {
        try {
          console.log('  📐 Generating Grammar...');
          await generateGrammar(unit, config, claude, db, args.dryRun);
          markCompleted(progress, unitKey, 'grammar');
          console.log('  ✅ Grammar complete');
        } catch (err) {
          console.error(`  ❌ Grammar failed: ${err.message}`);
          markFailed(progress, unitKey, 'grammar', err.message);
        }
      } else {
        console.log('  ⏭️  Grammar already done');
      }
    }

    // ── Writing ──
    if (!args.content || args.content === 'writing') {
      if (!isCompleted(progress, unitKey, 'writing')) {
        try {
          console.log('  ✍️  Generating Writing...');
          await generateWriting(unit, config, claude, db, args.dryRun);
          markCompleted(progress, unitKey, 'writing');
          console.log('  ✅ Writing complete');
        } catch (err) {
          console.error(`  ❌ Writing failed: ${err.message}`);
          markFailed(progress, unitKey, 'writing', err.message);
        }
      } else {
        console.log('  ⏭️  Writing already done');
      }
    }

    // ── Listening ──
    if (!args.content || args.content === 'listening') {
      if (!isCompleted(progress, unitKey, 'listening')) {
        try {
          console.log('  🎧 Generating Listening...');
          await generateListening(unit, config, claude, db, args.dryRun);
          markCompleted(progress, unitKey, 'listening');
          console.log('  ✅ Listening complete');
        } catch (err) {
          console.error(`  ❌ Listening failed: ${err.message}`);
          markFailed(progress, unitKey, 'listening', err.message);
        }
      } else {
        console.log('  ⏭️  Listening already done');
      }
    }

    // ── Speaking ──
    if (!args.content || args.content === 'speaking') {
      if (!isCompleted(progress, unitKey, 'speaking')) {
        try {
          console.log('  🎤 Generating Speaking...');
          await generateSpeaking(unit, config, claude, db, args.dryRun);
          markCompleted(progress, unitKey, 'speaking');
          console.log('  ✅ Speaking complete');
        } catch (err) {
          console.error(`  ❌ Speaking failed: ${err.message}`);
          markFailed(progress, unitKey, 'speaking', err.message);
        }
      } else {
        console.log('  ⏭️  Speaking already done');
      }
    }

    // ── Irregular Verbs (once per level) ──
    if (!args.content || args.content === 'irregular_verbs') {
      if (!isCompleted(progress, unitKey, 'irregular_verbs')) {
        if (!irregularVerbsDone.has(unit.level_number)) {
          try {
            console.log('  🔄 Generating Irregular Verbs...');
            await generateIrregularVerbs(unit, config, claude, db, args.dryRun);
            irregularVerbsDone.add(unit.level_number);
            console.log('  ✅ Irregular Verbs complete');
          } catch (err) {
            console.error(`  ❌ Irregular Verbs failed: ${err.message}`);
            markFailed(progress, unitKey, 'irregular_verbs', err.message);
          }
        }
        markCompleted(progress, unitKey, 'irregular_verbs');
      } else {
        console.log('  ⏭️  Irregular Verbs already done');
      }
    }

    // ── Assessment (LAST) ──
    if (!args.content || args.content === 'assessment') {
      if (!isCompleted(progress, unitKey, 'assessment')) {
        try {
          console.log('  📋 Generating Assessment...');
          await generateAssessment(unit, config, claude, db, args.dryRun);
          markCompleted(progress, unitKey, 'assessment');
          console.log('  ✅ Assessment complete');
        } catch (err) {
          console.error(`  ❌ Assessment failed: ${err.message}`);
          markFailed(progress, unitKey, 'assessment', err.message);
        }
      } else {
        console.log('  ⏭️  Assessment already done');
      }
    }

    console.log(`\n  🎉 Unit ${unit.unit_number} processing complete!`);
  }

  // ── Print Summary ──
  console.log('\n' + '═'.repeat(60));
  console.log('📊 GENERATION SUMMARY');
  console.log('═'.repeat(60));

  const summary = getProgressSummary(progress);
  console.log(`Units processed: ${totalUnits}`);
  console.log(`Content items: ${summary.done} done, ${summary.failed} failed, ${summary.pending} pending`);

  const costs = claude.getCostSummary();
  console.log(`\n💰 API Costs:`);
  console.log(`   Total calls: ${costs.totalCalls}`);
  console.log(`   Input tokens: ${costs.totalInputTokens.toLocaleString()}`);
  console.log(`   Output tokens: ${costs.totalOutputTokens.toLocaleString()}`);
  console.log(`   Total cost: $${costs.totalCostUSD}`);

  // Cost estimate for all 72 units
  if (totalUnits < 72 && totalUnits > 0) {
    const costPerUnit = costs.totalCostUSD / totalUnits;
    const estimated72 = Math.round(costPerUnit * 72 * 100) / 100;
    console.log(`\n📈 Estimated cost for all 72 units: ~$${estimated72}`);
  }

  console.log('\n✅ Done!\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
