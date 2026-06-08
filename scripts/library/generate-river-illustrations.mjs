#!/usr/bin/env node
/**
 * Chapter-opener illustrations for "What the River Kept" — soft muted vintage
 * storybook plates matching the rest of the series, in a drowned-town / reservoir /
 * mud palette (distinct from The Silent Tide's coast). Uploads to library-art and
 * writes library_chapters.illustrations jsonb (after:-1 = chapter opener).
 *
 * Usage: node scripts/library/generate-river-illustrations.mjs [chapterNumber ...]
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
const SLUG = 'what-the-river-kept';
const TITLE = 'What the River Kept';

const STYLE =
  'soft muted vintage storybook illustration plate, gentle lithograph and watercolour wash, ' +
  'desaturated cool grey-green palette, pale hazy misty sky, calm quiet melancholy atmosphere, ' +
  'fine delicate detail, aged paper feel, landscape composition, no people in the foreground, ' +
  'absolutely no text, no letters, no words, no watermark, no signature';

const CH = {
  1: {
    alt: 'برج كنيسة وسطوح بلدة غارقة تصعد من خزّانٍ منحسر في الضباب',
    scene:
      'the stone church spire and grey rooftops of a drowned village slowly rising out of a low, ' +
      'draining reservoir under a pale hazy sky, wide mud flats, a few tiny distant onlookers at the far water\'s edge, still reflections',
  },
  2: {
    alt: 'صفّ بيوتٍ رمادية على تلٍّ أخضر يطلّ على الوادي والماء البعيد عند المساء',
    scene:
      'a tidy row of grey stone houses on a green hillside above the valley, a small empty square, soft evening light, ' +
      'looking down toward the distant grey drowned town and the pale water far below',
  },
  3: {
    alt: 'طريقٌ موحل ينزل إلى شوارع البلدة الغارقة وطاحونةٌ مكسورة عند حافّة الماء',
    scene:
      'a single small lone figure walking down a muddy road into the grey resurfaced streets of a drowned town, ' +
      'empty roofless stone houses, an old broken water-mill with a still wheel at the water\'s edge, low fog',
  },
  4: {
    alt: 'داخل الطاحونة الحجرية المعتم وبابُ قبوٍ مفتوح في الأرض الموحلة وصندوقٌ معدنيّ صغير',
    scene:
      'the dim stone interior of an old abandoned mill, a low wooden trapdoor standing open in the muddy floor, ' +
      'a thin shaft of pale grey light falling through, a small rusted tin box beside it, quiet and eerie, empty',
  },
  5: {
    alt: 'قبرٌ بسيط على تلٍّ أخضر مشمس يطلّ على الوادي والبحيرة في ضوءٍ دافئ هادئ',
    scene:
      'a green hill above the valley in soft warm breaking sunlight, a single simple plain headstone, ' +
      'the wide calm valley and the lake below, gentle hopeful light, mist clearing',
  },
};

async function legacyServiceKey() {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${MGMT_TOKEN}` },
  });
  const k = (await r.json()).find((x) => x.type === 'legacy' && x.name === 'service_role');
  if (!k?.api_key) throw new Error('no legacy service_role key');
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
  const want = process.argv.slice(2).map(Number);
  const nums = want.length ? want : [1, 2, 3, 4, 5];
  const svc = await legacyServiceKey();
  const supa = createClient(SUPA_URL, svc, { auth: { persistSession: false } });

  for (const n of nums) {
    const c = CH[n];
    const prompt = `${c.scene}. ${STYLE}`;
    console.log(`\n🖼️  Ch${n}\n   ${c.scene.slice(0, 90)}…`);
    const out = await fal.subscribe('fal-ai/flux/dev', {
      input: { prompt, image_size: 'landscape_4_3', num_inference_steps: 32, guidance_scale: 3.5, num_images: 1, enable_safety_checker: true },
    });
    const url = out?.images?.[0]?.url;
    if (!url) { console.error('   ❌ no image'); continue; }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const path = `${SLUG}/ch${n}-opener.jpg`;
    const { error } = await supa.storage.from('library-art').upload(path, buf, { contentType: 'image/jpeg', upsert: true });
    if (error) { console.error(`   ❌ upload: ${error.message}`); continue; }
    const publicUrl = `${SUPA_URL}/storage/v1/object/public/library-art/${path}`;
    const illus = JSON.stringify([{ alt: c.alt, url: publicUrl, after: -1 }]);
    await mgmtSql(
      `UPDATE public.library_chapters c SET illustrations = $j$${illus}$j$::jsonb
         FROM public.library_books b
        WHERE c.book_id=b.id AND b.title_en=$t$${TITLE}$t$ AND c.chapter_number=${n};`
    );
    console.log(`   ✅ ${publicUrl}`);
  }
  console.log('\nDone.');
}
main().catch((e) => { console.error(e); process.exit(1); });
