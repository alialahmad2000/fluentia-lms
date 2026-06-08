#!/usr/bin/env node
/**
 * Reusable book-art generator: a tone-matched full-bleed COVER + one vintage
 * storybook PLATE per chapter. Edit CONFIG, run. Uploads to library-art/<slug>/,
 * sets library_books.cover_data.art_url + library_chapters.illustrations.
 */
import * as fal from '@fal-ai/serverless-client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });
fal.config({ credentials: process.env.FAL_API_KEY });
const MGMT = process.env.SUPABASE_ACCESS_TOKEN || (readFileSync('.mcp.json', 'utf8').match(/sbp_[A-Za-z0-9]+/) || [])[0];
const REF = 'nmjexpuycmqcxuxljier'; const SUPA = `https://${REF}.supabase.co`;

// ---- CONFIG (edit per book) ----------------------------------------------
const CONFIG = {
  title: 'The Translator', slug: 'the-translator',
  coverScene: 'an old translator with grey hair sits at a candlelit wooden desk covered in old books and an open ancient handwritten manuscript, his pen poised over the page, deep thoughtful shadows around him, a tall window with grey rain behind',
  coverHue: 'deep ocean-blue and warm candle-amber duotone, intimate and scholarly, shadowed and literary, one warm pool of candlelight',
  plateStyle: 'soft muted vintage storybook illustration plate, gentle watercolour and ink wash, deep blue and warm candle-amber palette, intimate scholarly literary atmosphere, fine delicate detail, aged paper feel, no text, no letters, no watermark, no signature',
  chapters: [
    { n: 1, alt: 'مترجمٌ عجوز يقرأ رسالةً على مكتبٍ مضاء بالشمع تحيط به الكتب القديمة', scene: 'an old grey-haired translator reading a letter at a candlelit desk crowded with old books, deep in thought, a tall window with cold grey light behind him, intimate and quiet' },
    { n: 2, alt: 'مخطوطةٌ قديمة مفتوحة على مكتبٍ تحت ضوء الشمع ويدٌ عجوز تمسك قلماً متوقّفة', scene: 'an old sealed handwritten manuscript open on a wooden desk under warm candlelight, an old hand holding a pen and pausing above the page, deep shadows, a sense of weight and secrecy' },
    { n: 3, alt: 'رجلٌ عجوز يمشي وحده في شارعٍ بارد ممطر عند الغسق تحت ضوء مصباح', scene: 'an old man walking alone in the rain along a cold empty city street at dusk, soft lamplight reflecting on the wet stones, melancholy and thoughtful' },
    { n: 4, alt: 'غرفةٌ فقيرة باردة ورجلٌ عجوز وامرأةٌ عجوز يجلسان إلى طاولةٍ مع شايٍ خفيف', scene: 'a small cold poor room with one window, an old man and a frail old woman sitting together at a humble table with cups of weak tea, tender and quiet, soft grey light' },
    { n: 5, alt: 'كتابٌ جميل يحمل اسماً على كعبه في ضوءٍ دافئ في قاعةٍ مهيبة', scene: 'a beautiful old book standing in a warm pool of light in a grand quiet hall, its spine catching the light, a sense of justice and peace, soft golden glow' },
  ],
};
// --------------------------------------------------------------------------

const SERIES = 'cinematic painterly literary book-cover illustration, fine-art oil and gouache, atmospheric, moody, soft volumetric light, the main subject in the UPPER half, the LOWER third is empty calm darker negative space, vertical portrait composition, absolutely no text, no letters, no words, no title, no watermark, no signature, no frame';

async function legacyKey() {
  const k = (await (await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${MGMT}` } })).json()).find((x) => x.type === 'legacy' && x.name === 'service_role');
  return k.api_key;
}
async function mgmtSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer ${MGMT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`); return r.json();
}
async function flux(prompt, size) { const o = await fal.subscribe('fal-ai/flux/dev', { input: { prompt, image_size: size, num_inference_steps: 32, guidance_scale: 3.5, num_images: 1 } }); return Buffer.from(await (await fetch(o.images[0].url)).arrayBuffer()); }

async function main() {
  const supa = createClient(SUPA, await legacyKey(), { auth: { persistSession: false } });
  const c = CONFIG;
  // cover
  console.log(`🎨 ${c.title} cover…`);
  const cover = await flux(`${c.coverScene}. ${c.coverHue}. ${SERIES}`, { width: 896, height: 1344 });
  await supa.storage.from('library-art').upload(`covers/${c.slug}.png`, cover, { contentType: 'image/png', upsert: true });
  const coverUrl = `${SUPA}/storage/v1/object/public/library-art/covers/${c.slug}.png`;
  await mgmtSql(`UPDATE public.library_books SET cover_data = COALESCE(cover_data,'{}'::jsonb) || jsonb_build_object('art_url','${coverUrl}','style','illustrated') WHERE title_en=$t$${c.title}$t$;`);
  console.log(`   ✅ ${coverUrl}`);
  // plates
  for (const ch of c.chapters) {
    console.log(`🖼️  ch${ch.n}…`);
    const img = await flux(`${ch.scene}. ${c.plateStyle}`, 'landscape_4_3');
    const path = `${c.slug}/ch${ch.n}-opener.jpg`;
    await supa.storage.from('library-art').upload(path, img, { contentType: 'image/jpeg', upsert: true });
    const url = `${SUPA}/storage/v1/object/public/library-art/${path}`;
    const illus = JSON.stringify([{ alt: ch.alt, url, after: -1 }]);
    await mgmtSql(`UPDATE public.library_chapters c SET illustrations=$j$${illus}$j$::jsonb FROM public.library_books b WHERE c.book_id=b.id AND b.title_en=$t$${c.title}$t$ AND c.chapter_number=${ch.n};`);
    console.log(`   ✅ ${url}`);
  }
  console.log('Done.');
}
main().catch((e) => { console.error('FAILED', e.message); process.exit(1); });
