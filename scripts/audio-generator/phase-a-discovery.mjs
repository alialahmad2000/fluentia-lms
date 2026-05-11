/**
 * Phase A Discovery — Audio Generation V2
 * Queries DB for schema, content counts, audio coverage, listening structure.
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const { Client } = pg;

const DB = {
  host: 'aws-1-eu-central-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.nmjexpuycmqcxuxljier',
  password: 'Ali-al-ahmad2000',
  ssl: { rejectUnauthorized: false },
};

async function query(client, sql, params = []) {
  const r = await client.query(sql, params);
  return r.rows;
}

async function tableColumns(client, tableName) {
  return query(client, `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
}

async function tableExists(client, tableName) {
  const rows = await query(client, `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);
  return rows.length > 0;
}

async function main() {
  const client = new Client(DB);
  await client.connect();
  console.log('Connected to DB.');

  const report = [];
  const push = (line) => { report.push(line); console.log(line); };

  push('# AUDIO-PHASE-A-DISCOVERY\n');
  push(`Generated: ${new Date().toISOString()}\n`);

  // ─── A.1 Env ────────────────────────────────────────────────────────────────
  push('## A.1 — Environment\n');
  push(`- Node version: ${process.version}`);
  push(`- NODE_OPTIONS: ${process.env.NODE_OPTIONS || '(not set)'}`);
  push(`- ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? 'present' : 'MISSING'}`);
  push(`- SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'MISSING'}`);
  push(`- VITE_SUPABASE_URL: ${process.env.VITE_SUPABASE_URL ? 'present' : 'MISSING'}`);
  push('');

  // ─── A.2 ElevenLabs quota ───────────────────────────────────────────────────
  push('## A.2 — ElevenLabs Quota\n');
  const elevenKey = process.env.ELEVENLABS_API_KEY;
  let elevenData = null;
  if (elevenKey) {
    const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': elevenKey }
    });
    elevenData = await res.json();
    const remaining = elevenData.character_limit - elevenData.character_count;
    push(`- Tier: ${elevenData.tier}`);
    push(`- Limit: ${elevenData.character_limit.toLocaleString()}`);
    push(`- Used: ${elevenData.character_count.toLocaleString()}`);
    push(`- Remaining: ${remaining.toLocaleString()}`);
    push(`- Budget gate (1,500,000): ${remaining >= 1500000 ? 'PASS ✓' : 'FAIL ✗ — ABORT'}`);
    if (remaining < 1500000) {
      push('\n❌ BUDGET GATE FAILED — Cannot proceed to Phase D.');
      await client.end();
      process.exit(1);
    }
  } else {
    push('ELEVENLABS_API_KEY missing — cannot check quota');
  }
  push('');

  // ─── A.3 Schema discovery ───────────────────────────────────────────────────
  push('## A.3 — DB Schema Discovery\n');

  const tablesToCheck = [
    'reading_passages',
    'reading_passage_audio',
    'listening_transcripts',
    'listening_content',
    'unit_listening',
    'listening_audio',
    'curriculum_readings',
    'curriculum_listening',
    'curriculum_vocabulary',
    'vocabulary',
    'vocabulary_audio',
    'irregular_verbs',
    'curriculum_irregular_verbs',
    'ai_usage',
    'levels',
    'units',
  ];

  const existingTables = {};
  for (const t of tablesToCheck) {
    const exists = await tableExists(client, t);
    existingTables[t] = exists;
    if (exists) {
      const cols = await tableColumns(client, t);
      push(`### Table: \`${t}\` (EXISTS)`);
      for (const c of cols) {
        push(`  - ${c.column_name} (${c.data_type}${c.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
      }
    } else {
      push(`### Table: \`${t}\` — DOES NOT EXIST`);
    }
    push('');
  }

  // ─── Find actual listening/reading/vocab/verbs tables ──────────────────────
  push('### Searching for any table containing audio_url...');
  const audioUrlTables = await query(client, `
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'audio_url'
    ORDER BY table_name
  `);
  push(`Tables with audio_url column: ${audioUrlTables.map(r => r.table_name).join(', ') || 'none'}`);
  push('');

  push('### All public tables:');
  const allTables = await query(client, `
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name
  `);
  push(allTables.map(r => `  - ${r.table_name}`).join('\n'));
  push('');

  // ─── Determine actual table names ───────────────────────────────────────────
  // Derive reading table
  const readingTable = existingTables['reading_passages'] ? 'reading_passages'
    : existingTables['curriculum_readings'] ? 'curriculum_readings' : null;
  const listeningTable = existingTables['listening_transcripts'] ? 'listening_transcripts'
    : existingTables['listening_content'] ? 'listening_content'
    : existingTables['unit_listening'] ? 'unit_listening'
    : existingTables['curriculum_listening'] ? 'curriculum_listening' : null;
  const vocabTable = existingTables['vocabulary'] ? 'vocabulary'
    : existingTables['curriculum_vocabulary'] ? 'curriculum_vocabulary' : null;
  const verbsTable = existingTables['irregular_verbs'] ? 'irregular_verbs'
    : existingTables['curriculum_irregular_verbs'] ? 'curriculum_irregular_verbs' : null;
  const levelsTable = existingTables['levels'] ? 'levels' : null;
  const unitsTable = existingTables['units'] ? 'units' : null;

  push('## Resolved Table Names\n');
  push(`- Reading: ${readingTable || 'NOT FOUND'}`);
  push(`- Listening: ${listeningTable || 'NOT FOUND'}`);
  push(`- Vocabulary: ${vocabTable || 'NOT FOUND'}`);
  push(`- Irregular Verbs: ${verbsTable || 'NOT FOUND'}`);
  push(`- Levels: ${levelsTable || 'NOT FOUND'}`);
  push(`- Units: ${unitsTable || 'NOT FOUND'}`);
  push('');

  // ─── A.4 Content counts per level ──────────────────────────────────────────
  push('## A.4 — Content Counts Per Level\n');

  if (levelsTable && unitsTable) {
    const levels = await query(client, `SELECT id, code, name FROM ${levelsTable} ORDER BY code`);
    push('| Level | Reading passages | Listening transcripts |');
    push('|-------|-----------------|----------------------|');
    for (const lv of levels) {
      let rCount = 0, lCount = 0;
      if (readingTable) {
        const r = await query(client, `
          SELECT count(*) AS c FROM ${readingTable} rp
          JOIN ${unitsTable} u ON rp.unit_id = u.id
          WHERE u.level_id = $1
        `, [lv.id]);
        rCount = r[0]?.c || 0;
      }
      if (listeningTable) {
        const joinCol = existingTables['curriculum_listening'] ? 'unit_id' : 'unit_id';
        const r = await query(client, `
          SELECT count(*) AS c FROM ${listeningTable} lt
          JOIN ${unitsTable} u ON lt.unit_id = u.id
          WHERE u.level_id = $1
        `, [lv.id]).catch(() => [{ c: 'ERR' }]);
        lCount = r[0]?.c || 0;
      }
      push(`| ${lv.code} | ${rCount} | ${lCount} |`);
    }
  } else {
    push('Cannot query counts — levels or units table not found.');
  }
  push('');

  // Vocab and verbs totals
  if (vocabTable) {
    const r = await query(client, `SELECT count(*) AS c FROM ${vocabTable}`);
    push(`Total vocab items: ${r[0].c}`);
  }
  if (verbsTable) {
    const r = await query(client, `SELECT count(*) AS c FROM ${verbsTable}`);
    push(`Total irregular verbs: ${r[0].c}`);
  }
  push('');

  // ─── A.5 Audio coverage ─────────────────────────────────────────────────────
  push('## A.5 — Audio Coverage\n');

  // Reading audio
  if (readingTable) {
    const rpaExists = existingTables['reading_passage_audio'];
    const total = (await query(client, `SELECT count(*) AS c FROM ${readingTable}`))[0].c;
    if (rpaExists) {
      const covered = (await query(client, `SELECT count(DISTINCT passage_id) AS c FROM reading_passage_audio`))[0].c;
      push(`Reading: total=${total}, passages with audio rows=${covered}, gap=${total - covered}`);
    } else {
      // Check for audio_url column on the reading table itself
      const cols = await tableColumns(client, readingTable);
      const hasAudioUrl = cols.some(c => c.column_name.includes('audio'));
      if (hasAudioUrl) {
        const audioCol = cols.find(c => c.column_name.includes('audio'));
        const covered = (await query(client, `SELECT count(*) AS c FROM ${readingTable} WHERE ${audioCol.column_name} IS NOT NULL`))[0].c;
        push(`Reading: total=${total}, with ${audioCol.column_name}=${covered}, gap=${total - covered}`);
      } else {
        push(`Reading: total=${total}, reading_passage_audio table MISSING, no audio_url column either`);
      }
    }
  }

  // Listening audio
  if (listeningTable) {
    const laExists = existingTables['listening_audio'];
    const total = (await query(client, `SELECT count(*) AS c FROM ${listeningTable}`))[0].c;
    if (laExists) {
      const covered = (await query(client, `SELECT count(DISTINCT transcript_id) AS c FROM listening_audio`))[0].c;
      push(`Listening: total=${total}, transcripts with audio=${covered}, gap=${total - covered}`);
    } else {
      const cols = await tableColumns(client, listeningTable);
      const audioCol = cols.find(c => c.column_name.includes('audio'));
      if (audioCol) {
        const covered = (await query(client, `SELECT count(*) AS c FROM ${listeningTable} WHERE ${audioCol.column_name} IS NOT NULL`))[0].c;
        push(`Listening: total=${total}, with ${audioCol.column_name}=${covered}, gap=${total - covered}`);
      } else {
        push(`Listening: total=${total}, listening_audio table MISSING, no audio column found`);
      }
    }
  }

  // Vocab audio
  if (vocabTable) {
    const cols = await tableColumns(client, vocabTable);
    const audioCol = cols.find(c => c.column_name === 'audio_url' || c.column_name === 'audio_generated_at');
    if (audioCol) {
      const total = (await query(client, `SELECT count(*) AS c FROM ${vocabTable}`))[0].c;
      const covered = (await query(client, `SELECT count(*) AS c FROM ${vocabTable} WHERE audio_url IS NOT NULL`))[0].c;
      push(`Vocab: total=${total}, with audio_url=${covered}, gap=${total - covered}`);
    } else {
      push(`Vocab: audio_url column MISSING from ${vocabTable}`);
    }
  }

  // Verbs audio
  if (verbsTable) {
    const cols = await tableColumns(client, verbsTable);
    const baseCol = cols.find(c => c.column_name.includes('base') && c.column_name.includes('audio'));
    const total = (await query(client, `SELECT count(*) AS c FROM ${verbsTable}`))[0].c;
    if (baseCol) {
      const covered = (await query(client, `SELECT count(*) AS c FROM ${verbsTable} WHERE ${baseCol.column_name} IS NOT NULL`))[0].c;
      push(`Verbs: total=${total}, with ${baseCol.column_name}=${covered}, gap=${total - covered}`);
    } else {
      push(`Verbs: total=${total}, no base audio column found`);
    }
  }
  push('');

  // ─── A.6 Listening speaker structure ────────────────────────────────────────
  push('## A.6 — Listening Speaker Structure\n');
  if (listeningTable) {
    const cols = await tableColumns(client, listeningTable);
    push(`Columns: ${cols.map(c => c.column_name).join(', ')}`);
    push('');

    // Sample 3 rows
    const samples = await query(client, `SELECT * FROM ${listeningTable} LIMIT 3`);
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      push(`### Sample ${i + 1} (id=${s.id})`);
      // Show all text-like columns
      for (const [k, v] of Object.entries(s)) {
        if (v === null) continue;
        if (typeof v === 'string' && v.length > 400) {
          push(`- ${k}: [text, ${v.length} chars] ${v.substring(0, 300)}...`);
        } else if (typeof v === 'object') {
          push(`- ${k}: [JSON] ${JSON.stringify(v).substring(0, 300)}`);
        } else {
          push(`- ${k}: ${v}`);
        }
      }
      push('');
    }
  }

  // ─── A.7 Existing scripts inventory ────────────────────────────────────────
  push('## A.7 — Existing Scripts in scripts/audio-generator/\n');
  const scriptDir = path.join(process.cwd(), 'scripts/audio-generator');
  const scriptFiles = await fs.readdir(scriptDir);
  for (const f of scriptFiles.sort()) {
    const isObsolete = f.includes('OBSOLETE') || f.endsWith('.cjs') || f.endsWith('.json');
    push(`- ${f}${isObsolete ? ' [OBSOLETE CANDIDATE]' : ''}`);
  }
  push('');

  // ─── ai_usage table check ───────────────────────────────────────────────────
  push('## A.8 — ai_usage table\n');
  if (existingTables['ai_usage']) {
    const cols = await tableColumns(client, 'ai_usage');
    push(`Columns: ${cols.map(c => `${c.column_name}(${c.data_type})`).join(', ')}`);
    const count = (await query(client, 'SELECT count(*) AS c FROM ai_usage'))[0].c;
    push(`Row count: ${count}`);
  } else {
    push('ai_usage table DOES NOT EXIST — must create in Phase B');
  }
  push('');

  // ─── Write report ───────────────────────────────────────────────────────────
  const outDir = path.join(process.cwd(), 'docs/audits');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, 'AUDIO-PHASE-A-DISCOVERY.md');
  await fs.writeFile(outPath, report.join('\n'), 'utf8');
  console.log(`\n✓ Report written to ${outPath}`);

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
