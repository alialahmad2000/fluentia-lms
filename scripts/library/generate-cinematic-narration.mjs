#!/usr/bin/env node
/**
 * CINEMATIC narration: emotive multi-voice acting (ElevenLabs v3, child voices for
 * kids) + a scene-matched AMBIENCE bed + spot SFX, every layer placed a precise number
 * of dB UNDER the narration (voice always dominant, bed always audible). Per-sentence
 * timing kept for the seekable player. Overwrites existing audio.
 *   node generate-cinematic-narration.mjs "<Book Title>" [--chapter N]
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const env = readFileSync('.env', 'utf8');
const KEY = (env.match(/^ELEVENLABS_API_KEY=(.*)$/m) || [])[1]?.trim().replace(/^["']|["']$/g, '');
const MGMT = (readFileSync('.mcp.json', 'utf8').match(/sbp_[A-Za-z0-9]+/) || [])[0];
const REF = 'nmjexpuycmqcxuxljier'; const SUPA = `https://${REF}.supabase.co`;
const D = '/tmp/cine-narr'; mkdirSync(D, { recursive: true });
const sh = (c) => execSync(c, { stdio: ['ignore', 'ignore', 'inherit'] });
const dur = (f) => parseFloat(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString().trim());
const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// gap-immune loudness: EBU R128 integrated (input_i); fall back to mean_volume for very short clips.
function loudOf(f) {
  try { execSync(`ffmpeg -i "${f}" -af loudnorm=print_format=json -f null - 2>/tmp/cine-ln.txt`); } catch (e) {}
  const m = readFileSync('/tmp/cine-ln.txt', 'utf8').match(/"input_i"\s*:\s*"?(-?[\d.]+)"?/);
  if (m && isFinite(+m[1]) && +m[1] > -70) return +m[1];
  try { execSync(`ffmpeg -i "${f}" -af volumedetect -f null - 2>/tmp/cine-vd.txt`); } catch (e) {}
  const v = readFileSync('/tmp/cine-vd.txt', 'utf8').match(/mean_volume:\s*(-?[\d.]+) dB/);
  return v ? +v[1] : -23;
}

const V = {
  narrator: 'JBFqnCBsd6RMkjVDRZzb', f: 'pFZP5JQG7iQjIQuC4Bku', fOld: 'Xb7hH8MSUJpSbSDYk0k2',
  m: 'onwK4e9ZLuTAKqWW03F9', mOld: 'nPczCjzI2devNBz1zQrb', boy: 'bIHbv24MWmeRgasZH58o', girl: 'cgSgspJ2msm6clMCkdW9',
};
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
// Scene sound design. amb = ambience prompt; ambBelow = dB the bed sits under the voice
// (bigger = quieter); sfx[].below = dB that spot effect sits under the voice. Matched by text.
const PLAN = {
  'The Wolf Winter': {
    1: { amb: 'soft cold howling winter wind, gentle falling snow, very bleak and quiet, faint and distant', ambBelow: 16, sfx: [{ match: 'howling of wolves', prompt: 'a single lone wolf howling far away across a cold wind', d: 4, below: 8 }, { match: 'iron jaws of her father', prompt: 'a faint cold iron trap and metal creak', d: 1.5, below: 13 }] },
    2: { amb: 'quiet wooden barn interior at night, faint cold wind outside, soft straw, hushed', ambBelow: 17, sfx: [{ match: 'carried it to the empty barn', prompt: 'a heavy old wooden barn door slowly opening', d: 2.5, below: 10 }, { match: 'the pack was howling again', prompt: 'a distant pack of wolves howling together in the night', d: 4, below: 9 }] },
    3: { amb: 'rising cold mountain wind, bleak and high, growing stronger', ambBelow: 13, sfx: [{ match: 'a great storm was sweeping', prompt: 'a powerful cold winter wind storm gust rising hard', d: 3.5, below: 7 }] },
    4: { amb: 'fierce howling snowstorm, strong roaring wind, cold and violent', ambBelow: 11, sfx: [{ match: 'ran out into the white', prompt: 'fast running footsteps crunching through deep snow', d: 2.5, below: 9 }, { match: 'grey shapes moving through the snow', prompt: 'wolves panting and padding through snow, soft low growls', d: 2.5, below: 11 }] },
    5: { amb: 'gentle spring thaw, soft dripping and trickling water, light wind, distant birds, warm', ambBelow: 16, sfx: [{ match: 'ran up into the trees', prompt: 'a wolf bounding away fast through soft snow then quiet', d: 2.5, below: 12 }] },
  },
  'The Lost Cat': { _: { amb: 'a cosy quiet home, gentle room tone, soft birds chirping outside a window, warm and calm', ambBelow: 18, sfx: [{ match: 'window is open', prompt: 'a soft gentle cat meow and a light outdoor breeze', d: 2.5, below: 11 }, { match: 'hears a small sound', prompt: 'tiny soft newborn kittens mewing', d: 2.5, below: 10 }] } },
  'The Bottle from the Sea': { _: { amb: 'gentle grey sea waves rolling on a sandy beach, soft sea wind, calm', ambBelow: 15, sfx: [{ match: 'old glass bottle', prompt: 'gentle waves on wet sand', d: 3, below: 12 }, { match: 'great white lighthouse', prompt: 'sea waves, wind, and a distant low foghorn', d: 3.5, below: 11 }] } },
  'The Silent Tide': { _: { amb: 'a quiet small coastal harbour town, distant gentle sea, a few seagulls, soft and calm', ambBelow: 16, sfx: [{ match: 'the door opened', prompt: 'an old wooden shop door opening with a small bell', d: 2.5, below: 11 }] } },
  'The Light Between Us': { _: { amb: 'very soft quiet dusk by the sea, faint distant gentle waves, light wind, melancholy and still', ambBelow: 18, sfx: [] } },
  'What the River Kept': { _: { amb: 'still flat water, low drifting fog, faint echoing water drips, eerie calm and silence', ambBelow: 16, sfx: [{ match: 'rusted key', prompt: 'an old rusty iron key turning and grinding in an ancient lock', d: 2.5, below: 9 }, { match: 'cellar door came up', prompt: 'a heavy old wooden trapdoor dragging open from mud', d: 2.5, below: 10 }] } },
  'Higher Ground': { _: { amb: 'high cold thin mountain wind, vast bleak and lonely altitude', ambBelow: 15, sfx: [{ match: 'the storm came', prompt: 'a fierce high-altitude mountain wind storm', d: 3.5, below: 8 }] } },
  'The Cartographer': { _: { amb: 'an old wooden sailing ship at sea, slow creaking timber, soft lapping water, drifting fog', ambBelow: 15, sfx: [{ match: 'the fog came', prompt: 'a ship creaking in still water, eerie muffled fog', d: 3, below: 11 }] } },
  'The Translator': { _: { amb: 'a quiet study at night, soft steady rain on a window, a faint slow ticking clock', ambBelow: 16, sfx: [{ match: 'in the rain', prompt: 'soft steady rain on cobblestones with slow footsteps', d: 3, below: 11 }] } },
};

async function legacyKey() { return (await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${MGMT}` } })).json()).find((x) => x.type === 'legacy' && x.name === 'service_role').api_key; }
async function mgmtSql(query) {
  let last; for (let a = 0; a < 5; a++) { const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) }); if (r.ok) return r.json(); last = `SQL ${r.status}`; if (r.status >= 500 || r.status === 429) { await new Promise((s) => setTimeout(s, 1500 * (a + 1))); continue; } throw new Error(`${last}: ${(await r.text()).slice(0, 160)}`); } throw new Error(last);
}
async function tts(voice, text, isDialogue, file) {
  for (let a = 0; a < 3; a++) { try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_128`, { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, model_id: 'eleven_v3', voice_settings: { stability: isDialogue ? 0.4 : 0.5, similarity_boost: 0.75, style: isDialogue ? 0.55 : 0.35, use_speaker_boost: true } }) });
    if (!r.ok) throw new Error(`${r.status}`); writeFileSync(file, Buffer.from(await r.arrayBuffer())); return;
  } catch (e) { if (a === 2) throw e; await new Promise((s) => setTimeout(s, 900)); } }
}
async function sfxGen(text, seconds, file) {
  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', { method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, duration_seconds: Math.min(22, Math.max(1, seconds)), prompt_influence: 0.35 }) });
  if (!r.ok) throw new Error(`SFX ${r.status}`); writeFileSync(file, Buffer.from(await r.arrayBuffer()));
}
async function pool(items, n, fn) { let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } })); }

async function main() {
  const title = process.argv[2];
  const onlyCh = (process.argv.includes('--chapter')) ? Number(process.argv[process.argv.indexOf('--chapter') + 1]) : null;
  if (!title || !(title in CAST)) { console.error('usage: node generate-cinematic-narration.mjs "<exact Book Title>" [--chapter N]'); process.exit(1); }
  const cast = CAST[title]; const bslug = slug(title); const plan = PLAN[title] || {};
  const supa = createClient(SUPA, await legacyKey(), { auth: { persistSession: false } });
  if (!existsSync(`${D}/sil35.mp3`)) sh(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.35 -c:a libmp3lame -b:a 128k ${D}/sil35.mp3`);
  if (!existsSync(`${D}/sil70.mp3`)) sh(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.7 -c:a libmp3lame -b:a 128k ${D}/sil70.mp3`);

  let chapters = await mgmtSql(`SELECT c.id, c.chapter_number FROM library_chapters c JOIN library_books b ON c.book_id=b.id WHERE b.title_en=$t$${title}$t$ ORDER BY c.chapter_number;`);
  if (onlyCh) chapters = chapters.filter((c) => c.chapter_number === onlyCh);
  for (const ch of chapters) {
    const N = ch.chapter_number;
    const cp = plan[N] || plan._ || { amb: null, ambBelow: 16, sfx: [] };
    console.log(`\n🎬 ${title} — chapter ${N}`);
    const rows = await mgmtSql(`SELECT p.paragraph_index AS p, sp.sentence_index AS s, sp.text_en, sp.speaker, sp.is_dialogue FROM library_paragraphs p JOIN library_sentence_pairs sp ON sp.paragraph_id=p.id WHERE p.chapter_id='${ch.id}' ORDER BY p.paragraph_index, sp.sentence_index;`);
    const lastOf = new Map(); rows.forEach((r) => lastOf.set(r.p, r.s));
    const cued = new Set(rows.filter((r) => r.speaker && cast[r.speaker]).map((r) => r.speaker));
    console.log(`   🎙️  ${rows.length} sentences · voices: narrator + ${[...cued].join(', ') || '(none cast)'}`);
    await pool(rows, 4, (r, i) => tts(cast[r.speaker] || V.narrator, r.text_en, r.is_dialogue, `${D}/${bslug}-${N}-${i}.mp3`));

    // narration track + per-sentence timing
    const listLines = []; const timing = []; let cur = 0;
    rows.forEach((r, i) => {
      const f = `${D}/${bslug}-${N}-${i}.mp3`; const d = Math.round(dur(f) * 1000);
      timing.push({ p: r.p, s: r.s, t0: cur, t1: cur + d });
      listLines.push(`file '${f}'`); cur += d;
      const end = lastOf.get(r.p) === r.s; listLines.push(`file '${D}/${end ? 'sil70' : 'sil35'}.mp3'`); cur += end ? 700 : 350;
    });
    writeFileSync(`${D}/list-${N}.txt`, listLines.join('\n'));
    sh(`ffmpeg -y -f concat -safe 0 -i ${D}/list-${N}.txt -c:a libmp3lame -b:a 128k ${D}/${bslug}-narr-${N}.mp3`);
    const narr = `${D}/${bslug}-narr-${N}.mp3`; const total = dur(narr);
    const narrRef = loudOf(narr); // speaking loudness of the voice (gap-immune)

    // build the sound design, every layer placed a precise dB under the voice
    const inputs = [`-i ${narr}`]; const f = [`[0:a]volume=1.0[narr]`]; const mix = ['[narr]']; let idx = 1;
    if (cp.amb) {
      await sfxGen(cp.amb, 22, `${D}/${bslug}-amb-${N}.mp3`);
      const g = (narrRef - cp.ambBelow) - loudOf(`${D}/${bslug}-amb-${N}.mp3`);
      inputs.push(`-i ${D}/${bslug}-amb-${N}.mp3`);
      f.push(`[${idx}:a]volume=${g.toFixed(1)}dB,aloop=loop=-1:size=200000000,atrim=duration=${total.toFixed(2)},highpass=f=150,lowpass=f=7000,afade=t=in:st=0:d=2.5,afade=t=out:st=${(total - 2.5).toFixed(2)}:d=2.5[amb]`);
      mix.push('[amb]'); idx++;
      console.log(`   🔊 ambience ${cp.ambBelow}dB under voice (gain ${g.toFixed(1)}dB)`);
    }
    for (let k = 0; k < (cp.sfx || []).length; k++) {
      const fx = cp.sfx[k]; const hit = rows.find((r) => r.text_en.toLowerCase().includes(fx.match.toLowerCase()));
      if (!hit) { console.log(`   (sfx "${fx.match}" — no matching line, skipped)`); continue; }
      await sfxGen(fx.prompt, fx.d, `${D}/${bslug}-sfx-${N}-${k}.mp3`);
      const g = (narrRef - fx.below) - loudOf(`${D}/${bslug}-sfx-${N}-${k}.mp3`);
      const tEnd = timing.find((t) => t.p === hit.p && t.s === hit.s).t1;
      inputs.push(`-i ${D}/${bslug}-sfx-${N}-${k}.mp3`);
      f.push(`[${idx}:a]volume=${g.toFixed(1)}dB,afade=t=out:st=${(fx.d - 0.4).toFixed(2)}:d=0.4,adelay=${tEnd}|${tEnd}[s${k}]`);
      mix.push(`[s${k}]`); idx++;
      console.log(`   🎯 sfx "${fx.match}" @${(tEnd / 1000).toFixed(1)}s, ${fx.below}dB under voice`);
    }
    f.push(`${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=longest,alimiter=limit=0.95,loudnorm=I=-15:TP=-1.5[out]`);
    const out = `${D}/${bslug}-ch${N}.mp3`;
    sh(`ffmpeg -y ${inputs.join(' ')} -filter_complex "${f.join(';')}" -map "[out]" -ar 44100 -b:a 160k ${out}`);

    const path = `narration/${bslug}/ch${N}.mp3`;
    const { error } = await supa.storage.from('library-audio').upload(path, readFileSync(out), { contentType: 'audio/mpeg', upsert: true });
    if (error) throw error;
    const url = `${SUPA}/storage/v1/object/public/library-audio/${path}`;
    await mgmtSql(`UPDATE public.library_chapters SET audio_url='${url}', audio_timing=$j$${JSON.stringify(timing)}$j$::jsonb WHERE id='${ch.id}';`);
    console.log(`   ✅ ${dur(out).toFixed(0)}s mixed · ${url}`);
  }
  console.log(`\nDone: ${title}${onlyCh ? ` (ch${onlyCh})` : ''}`);
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
