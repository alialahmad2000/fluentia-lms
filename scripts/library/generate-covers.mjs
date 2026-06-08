#!/usr/bin/env node
/**
 * Generate tone-matched cover ART for the Fluentia Library novels.
 * - FLUX (fal.ai) duotone illustration per novel, art-directed to each cover's palette
 * - uploads to the `library-art` bucket (legacy service_role JWT — sb_secret is rejected by Storage)
 * - writes the public URL into library_books.cover_data.art_url (jsonb merge)
 *
 * Usage: node scripts/library/generate-covers.mjs [slug ...]   (default: all four)
 */
import * as fal from '@fal-ai/serverless-client';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
dotenv.config();

fal.config({ credentials: process.env.FAL_API_KEY });

const MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || (readFileSync('.mcp.json', 'utf8').match(/sbp_[A-Za-z0-9]+/) || [])[0];
const REF = 'nmjexpuycmqcxuxljier';
const SUPA_URL = process.env.VITE_SUPABASE_URL || `https://${REF}.supabase.co`;

const SERIES =
  'cinematic painterly literary book-cover illustration, fine-art oil and gouache, atmospheric, moody, ' +
  'soft volumetric light, misty haze, the main subject in the UPPER half, the LOWER third is empty calm ' +
  'darker negative space, vertical portrait composition, no people faces, no figures in foreground, ' +
  'absolutely no text, no letters, no words, no title, no captions, no watermark, no signature, no frame, no border';

// Each novel: a duotone hue lock + a scene. cover_data.art_url gets the resulting URL.
const BOOKS = [
  {
    slug: 'higher-ground',
    title: 'Higher Ground',
    scene:
      'a single tiny lone mountaineer silhouette far below an immense towering grey granite summit at dawn, ' +
      'vast sense of scale, swirling cloud sea around the peak, the high rock catching the first warm light',
    hue: 'monochromatic warm gold, amber and deep bronze duotone, dark bronze-black shadows',
  },
  {
    slug: 'what-the-river-kept',
    title: 'What the River Kept',
    scene:
      'an old stone church spire and the wet rooftops of a drowned village slowly rising out of the still ' +
      'flat mirror surface of a draining reservoir, low fog on the water, eerie calm, a few bare dead trees, ' +
      'soft reflections',
    hue: 'monochromatic deep teal and blackish pine-green duotone, near-black depths',
  },
  {
    slug: 'the-light-between-us',
    title: 'The Light Between Us',
    scene:
      'a single small lonely cottage standing on a low grassy dune in the CENTRE of the frame, its one ' +
      'window glowing with warm golden lamplight, the warm glow reflecting softly on the wet sand and still ' +
      'shallow water before it, a vast melancholy violet-blue dusk sky filling the upper half, gentle sea mist',
    hue: 'cool muted slate-blue and dusty desaturated violet duotone, with only the cottage window a warm golden glow',
  },
  {
    slug: 'the-silent-tide',
    title: 'The Silent Tide',
    scene:
      'a lone old lighthouse on a dark rocky headland at very low tide, the sea drawn far back leaving ' +
      'glistening wet sand and dark seaweed strands, brooding heavy clouds, a single distant fishing boat on the horizon',
    hue: 'monochromatic deep sea-teal and cold green duotone, slate-black rocks',
  },
];

async function legacyServiceKey() {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${MGMT_TOKEN}` },
  });
  const keys = await r.json();
  const k = keys.find((x) => x.type === 'legacy' && x.name === 'service_role');
  if (!k?.api_key) throw new Error('no legacy service_role key found');
  return k.api_key;
}

async function mgmtSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${MGMT_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}

async function main() {
  const want = process.argv.slice(2);
  const list = want.length ? BOOKS.filter((b) => want.includes(b.slug)) : BOOKS;

  const svcKey = await legacyServiceKey();
  const supa = createClient(SUPA_URL, svcKey, { auth: { persistSession: false } });

  for (const b of list) {
    const prompt = `${b.scene}. ${b.hue}. ${SERIES}`;
    console.log(`\n🎨 ${b.title}\n   ${prompt.slice(0, 110)}…`);

    const out = await fal.subscribe('fal-ai/flux/dev', {
      input: {
        prompt,
        image_size: { width: 896, height: 1344 },
        num_inference_steps: 34,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
      },
    });
    const url = out?.images?.[0]?.url;
    if (!url) { console.error('   ❌ no image returned'); continue; }

    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const path = `covers/${b.slug}.png`;
    const { error: upErr } = await supa.storage
      .from('library-art')
      .upload(path, buf, { contentType: 'image/png', upsert: true });
    if (upErr) { console.error(`   ❌ upload: ${upErr.message}`); continue; }

    const publicUrl = `${SUPA_URL}/storage/v1/object/public/library-art/${path}`;
    await mgmtSql(
      `UPDATE public.library_books
         SET cover_data = COALESCE(cover_data,'{}'::jsonb) || jsonb_build_object('art_url', '${publicUrl}', 'style', 'illustrated')
       WHERE title_en = $t$${b.title}$t$;`
    );
    console.log(`   ✅ ${publicUrl}`);
  }
  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
