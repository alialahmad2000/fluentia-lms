#!/usr/bin/env node
/**
 * Multi-voice NARRATION for a Library novel (audiobook + sentence-timing for sync).
 * Per sentence: cast voice (by speaker) -> ElevenLabs TTS -> clip; concat with gaps;
 * record each sentence's [t0,t1]ms; upload chapter mp3 + set library_chapters.audio_url
 * + audio_timing. Resumable (skips chapters that already have audio_url).
 * No music (voice only) -> universally fine. Usage: node generate-narration.mjs "<Book Title>"
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const KEY = process.env.ELEVENLABS_API_KEY;
const MGMT = process.env.SUPABASE_ACCESS_TOKEN || (readFileSync('.mcp.json', 'utf8').match(/sbp_[A-Za-z0-9]+/) || [])[0];
const REF = 'nmjexpuycmqcxuxljier'; const SUPA = `https://${REF}.supabase.co`;
const D = '/tmp/narr-gen'; mkdirSync(D, { recursive: true });
const sh = (c) => execSync(c, { stdio: ['ignore', 'ignore', 'inherit'] });
const dur = (f) => parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ElevenLabs voice pool
const V = {
  narrator: 'JBFqnCBsd6RMkjVDRZzb', // George — British warm storyteller
  f: 'pFZP5JQG7iQjIQuC4Bku',        // Lily — British female (adult lead)
  fOld: 'Xb7hH8MSUJpSbSDYk0k2',     // Alice — British female (measured/elder)
  m: 'onwK4e9ZLuTAKqWW03F9',        // Daniel — British male
  mOld: 'nPczCjzI2devNBz1zQrb',     // Brian — deep male (elder)
  boy: 'bIHbv24MWmeRgasZH58o',      // Will — young male
  girl: 'cgSgspJ2msm6clMCkdW9',     // Jessica — bright young female (child)
};
// per-book character -> voice
const CAST = {
  'The Lost Cat': { Lina: V.girl, Baker: V.m, 'Old Woman': V.fOld, Misho: V.narrator },
  'The Bottle from the Sea': { Milo: V.boy, Ada: V.girl, Harbourman: V.mOld, Father: V.m, Grandfather: V.mOld },
  'The Wolf Winter': { Reni: V.f, Joren: V.m, Maren: V.mOld, Pell: V.boy },
  'Higher Ground': { Iris: V.f, Sam: V.fOld, Marek: V.mOld },
  'What the River Kept': { Cora: V.f, Ledbury: V.mOld, Thorne: V.m, Official: V.m },
  'The Silent Tide': { Eleanor: V.f, 'Mrs Tregeer': V.fOld, 'Mr Carrow': V.m, 'Mr Hollis': V.mOld, Tom: V.boy, Inspector: V.m },
  'The Light Between Us': {},
  'The Cartographer': { Vera: V.f, Captain: V.mOld, Pell: V.boy },
  'The Translator': { Anton: V.mOld, Marta: V.fOld },
};

async function legacyKey() {
  const k = (await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${MGMT}` } })).json()).find((x) => x.type === 'legacy' && x.name === 'service_role');
  return k.api_key;
}
async function mgmtSql(query) {
  let last;
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    if (r.ok) return r.json();
    last = `SQL ${r.status}`;
    if (r.status >= 500 || r.status === 429) { await new Promise((s) => setTimeout(s, 1500 * (attempt + 1))); continue; }
    throw new Error(`${last}: ${(await r.text()).slice(0, 120)}`);
  }
  throw new Error(last);
}
async function tts(voice, text, file) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.22, use_speaker_boost: true } }) });
      if (!r.ok) throw new Error(`${r.status}`);
      writeFileSync(file, Buffer.from(await r.arrayBuffer())); return;
    } catch (e) { if (attempt === 2) throw e; await new Promise((s) => setTimeout(s, 800)); }
  }
}
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } })); return out; }

async function main() {
  const title = process.argv[2];
  if (!title || !(title in CAST)) { console.error('usage: node generate-narration.mjs "<exact Book Title>"'); process.exit(1); }
  const cast = CAST[title]; const bslug = slug(title);
  const supa = createClient(SUPA, await legacyKey(), { auth: { persistSession: false } });

  // silence beds (match ElevenLabs mp3 params: 44.1k mono 128k)
  if (!existsSync(`${D}/sil35.mp3`)) sh(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.35 -c:a libmp3lame -b:a 128k ${D}/sil35.mp3`);
  if (!existsSync(`${D}/sil70.mp3`)) sh(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.7 -c:a libmp3lame -b:a 128k ${D}/sil70.mp3`);

  const chapters = await mgmtSql(`SELECT c.id, c.chapter_number, c.audio_url FROM library_chapters c JOIN library_books b ON c.book_id=b.id WHERE b.title_en=$t$${title}$t$ ORDER BY c.chapter_number;`);
  for (const ch of chapters) {
    if (ch.audio_url) { console.log(`ch${ch.chapter_number} already has audio — skip`); continue; }
    console.log(`\n🎙️  ${title} — chapter ${ch.chapter_number}`);
    const rows = await mgmtSql(`SELECT p.paragraph_index AS p, sp.sentence_index AS s, sp.text_en, sp.speaker, sp.is_dialogue FROM library_paragraphs p JOIN library_sentence_pairs sp ON sp.paragraph_id=p.id WHERE p.chapter_id='${ch.id}' ORDER BY p.paragraph_index, sp.sentence_index;`);
    // last-sentence-of-paragraph flags
    const lastOf = new Map(); rows.forEach((r) => lastOf.set(r.p, r.s));
    console.log(`   ${rows.length} sentences…`);
    await pool(rows, 4, (r, i) => { const v = cast[r.speaker] || V.narrator; return tts(v, r.text_en, `${D}/${bslug}-${ch.chapter_number}-${i}.mp3`); });

    // concat with gaps + compute timing
    const listLines = []; const timing = []; let cursorMs = 0;
    rows.forEach((r, i) => {
      const f = `${D}/${bslug}-${ch.chapter_number}-${i}.mp3`; const d = Math.round(dur(f) * 1000);
      timing.push({ p: r.p, s: r.s, t0: cursorMs, t1: cursorMs + d });
      listLines.push(`file '${f}'`); cursorMs += d;
      const isParaEnd = lastOf.get(r.p) === r.s;
      const gap = isParaEnd ? `${D}/sil70.mp3` : `${D}/sil35.mp3`;
      listLines.push(`file '${gap}'`); cursorMs += isParaEnd ? 700 : 350;
    });
    writeFileSync(`${D}/list-${ch.chapter_number}.txt`, listLines.join('\n'));
    const out = `${D}/${bslug}-ch${ch.chapter_number}.mp3`;
    sh(`ffmpeg -y -f concat -safe 0 -i ${D}/list-${ch.chapter_number}.txt -c copy ${out}`);

    // upload + set DB
    const path = `narration/${bslug}/ch${ch.chapter_number}.mp3`;
    const { error } = await supa.storage.from('library-audio').upload(path, readFileSync(out), { contentType: 'audio/mpeg', upsert: true });
    if (error) throw error;
    const url = `${SUPA}/storage/v1/object/public/library-audio/${path}`;
    await mgmtSql(`UPDATE public.library_chapters SET audio_url='${url}', audio_timing=$j$${JSON.stringify(timing)}$j$::jsonb WHERE id='${ch.id}';`);
    console.log(`   ✅ ${(cursorMs / 1000).toFixed(0)}s · ${url}`);
  }
  console.log(`\nDone: ${title}`);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
