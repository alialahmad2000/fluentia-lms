/**
 * Generate before-read images for all 144 curriculum readings
 * Uses fal.ai Flux Schnell — watercolor style on dark background
 *
 * Run: node scripts/image-gen/generate-reading-images.mjs [--level N] [--resume] [--dry-run]
 */

import * as fal from "@fal-ai/serverless-client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

fal.config({ credentials: process.env.FAL_API_KEY });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const STYLE = "elegant watercolor illustration with visible brushstrokes and soft wet paint edges, vibrant rich saturated colors, on deep dark charcoal black background, artistic premium educational feel, absolutely no text no letters no words no numbers no characters no writing no labels no watermarks, landscape composition, high detail, 4k";

function buildPrompt(title) {
  // Generate a vivid scene description from the reading title
  return `A vivid artistic scene representing "${title}", ${STYLE}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const levelArg = args.find((a, i) => args[i - 1] === '--level');
  const targetLevel = levelArg !== undefined ? parseInt(levelArg) : null;

  console.log("📖 Reading Image Generator (before_read_image_url)");
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Resume: ${resume ? 'Yes' : 'No'}`);
  if (targetLevel !== null) console.log(`   Level: ${targetLevel} only`);
  console.log();

  // Fetch levels
  const { data: levels } = await supabase
    .from('curriculum_levels')
    .select('id, level_number')
    .order('level_number');
  const levelMap = {};
  for (const l of levels) levelMap[l.id] = l.level_number;

  // Fetch units
  const { data: units } = await supabase
    .from('curriculum_units')
    .select('id, level_id, unit_number, theme_en');
  const unitMap = {};
  for (const u of units) {
    unitMap[u.id] = { ...u, level_number: levelMap[u.level_id] ?? 99 };
  }

  // Fetch readings
  let query = supabase
    .from('curriculum_readings')
    .select('id, unit_id, reading_label, title_en, before_read_image_url');

  if (resume) {
    query = query.is('before_read_image_url', null);
  }

  const { data: readings, error } = await query;
  if (error) {
    console.error('❌ DB query failed:', error.message);
    process.exit(1);
  }

  // Enrich with level/unit info and sort
  let enriched = readings.map(r => {
    const u = unitMap[r.unit_id] || {};
    return { ...r, level_number: u.level_number ?? 99, unit_number: u.unit_number ?? 99, theme: u.theme_en ?? '?' };
  });

  if (targetLevel !== null) {
    enriched = enriched.filter(r => r.level_number === targetLevel);
  }

  enriched.sort((a, b) => a.level_number - b.level_number || a.unit_number - b.unit_number || a.reading_label.localeCompare(b.reading_label));

  console.log(`📝 Readings to process: ${enriched.length}`);

  if (dryRun) {
    for (const r of enriched) {
      console.log(`  L${r.level_number} U${String(r.unit_number).padStart(2)} ${r.reading_label}: ${r.title_en}`);
    }
    console.log(`\n✅ Dry run: ${enriched.length} images would be generated.`);
    return;
  }

  // LIVE generation
  const outDir = "scripts/image-gen/output/reading-images";
  fs.mkdirSync(outDir, { recursive: true });

  let success = 0;
  let errors = 0;
  const errorList = [];

  for (let i = 0; i < enriched.length; i++) {
    const r = enriched[i];
    const label = `L${r.level_number}-U${r.unit_number}-${r.reading_label}`;

    console.log(`⏳ [${i + 1}/${enriched.length}] ${label}: ${r.title_en}...`);

    try {
      const prompt = buildPrompt(r.title_en);

      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: { prompt, image_size: "landscape_16_9", num_images: 1 }
      });

      const imageUrl = result.images[0].url;
      const resp = await fetch(imageUrl);
      const buf = Buffer.from(await resp.arrayBuffer());

      const filename = `reading-${label}.png`;
      fs.writeFileSync(path.join(outDir, filename), buf);

      // Upload
      const storagePath = `readings/${filename}`;
      const { error: uploadErr } = await supabase.storage
        .from("curriculum-images")
        .upload(storagePath, buf, { contentType: "image/png", upsert: true });

      if (uploadErr) {
        console.error(`  ❌ Upload: ${uploadErr.message}`);
        errors++;
        errorList.push({ label, title: r.title_en, error: uploadErr.message });
        continue;
      }

      const { data: urlData } = supabase.storage.from("curriculum-images").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Update DB
      const { error: dbErr } = await supabase
        .from("curriculum_readings")
        .update({ before_read_image_url: publicUrl })
        .eq("id", r.id);

      if (dbErr) {
        console.error(`  ❌ DB: ${dbErr.message}`);
        errors++;
        errorList.push({ label, title: r.title_en, error: dbErr.message });
      } else {
        success++;
        console.log(`  ✅ ${(buf.length / 1024).toFixed(0)} KB`);
      }
    } catch (err) {
      errors++;
      errorList.push({ label, title: r.title_en, error: err.message });
      console.error(`  ❌ ${err.message}`);

      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  ⏳ Rate limited — waiting 30s...');
        await wait(30000);
      }
    }

    if (i < enriched.length - 1) await wait(2000);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 READING IMAGE RESULTS:");
  console.log("=".repeat(60));
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Errors:  ${errors}`);
  console.log(`  📁 Output:  ${outDir}/`);

  if (errorList.length > 0) {
    fs.writeFileSync(path.join(outDir, 'errors.json'), JSON.stringify(errorList, null, 2));
    console.log(`  ⚠️  Error log saved`);
  }

  console.log(`\n🎉 Done!`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
