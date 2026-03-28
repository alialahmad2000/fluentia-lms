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

// Watercolor tree icons — each level is a growing tree with distinct seasonal/color theme
// STRICT: no text, no letters, no words, single tree, dark background, watercolor paint style
const STYLE_BASE = "elegant loose watercolor painting style with visible paint strokes and soft wet edges, single centered tree on deep dark charcoal black background, artistic premium feel, absolutely no text no letters no words no numbers no characters no writing no labels no watermarks, square composition, high detail, 4k";

const TREES = [
  {
    level: 0,
    name: "Foundation — تأسيس",
    prompt: `A tiny young sapling tree with just a few small bright green leaves and thin delicate trunk growing from a small patch of warm brown earth, fresh spring growth feeling, soft pastel green watercolor splashes for leaves with subtle golden highlights, ${STYLE_BASE}`
  },
  {
    level: 1,
    name: "Basics — أساسيات",
    prompt: `A small growing tree with a modest round canopy of fresh sky blue and teal watercolor leaves and a sturdy light brown trunk, early growth stage with balanced proportions, cool blue-green watercolor splashes with white highlights, ${STYLE_BASE}`
  },
  {
    level: 2,
    name: "Development — تطوير",
    prompt: `A medium-sized flourishing tree with a full round canopy of rich purple and lavender watercolor leaves and spreading branches, vibrant growth stage, purple and violet watercolor splashes with subtle pink highlights on leaf edges, ${STYLE_BASE}`
  },
  {
    level: 3,
    name: "Fluency — طلاقة",
    prompt: `A tall majestic tree with a large flowing canopy of warm amber and golden yellow watercolor leaves with some orange tones, autumn harvest feeling, rich golden watercolor splashes with deep amber drips and warm copper highlights, ${STYLE_BASE}`
  },
  {
    level: 4,
    name: "Mastery — تمكّن",
    prompt: `A grand powerful tree with a massive wide canopy of deep crimson red and scarlet watercolor leaves with strong thick trunk and visible roots, peak mastery feeling, rich red watercolor splashes with subtle gold accent highlights on branch tips, ${STYLE_BASE}`
  },
  {
    level: 5,
    name: "Proficiency — احتراف",
    prompt: `A magnificent ethereal tree with a luminous canopy of brilliant gold and warm amber watercolor leaves with subtle platinum white glow effects and tiny floating golden sparkle particles, ultimate achievement feeling, luxurious golden watercolor splashes with pearl and champagne highlights, ${STYLE_BASE}`
  }
];

async function run() {
  console.log("🌳 Watercolor Tree Icons — 6 levels\n");

  const outDir = "scripts/image-gen/output/watercolor-trees";
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];

  for (const item of TREES) {
    console.log(`⏳ [${item.level + 1}/6] Level ${item.level}: ${item.name}...`);

    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: { prompt: item.prompt, image_size: "square", num_images: 1 }
      });

      const imageUrl = result.images[0].url;
      const resp = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await resp.arrayBuffer());

      const filename = `tree-level-${item.level}.png`;
      const localPath = path.join(outDir, filename);
      fs.writeFileSync(localPath, imageBuffer);
      console.log(`  💾 ${(imageBuffer.length / 1024).toFixed(0)} KB → ${localPath}`);

      // Upload to Supabase Storage
      const storagePath = `levels/tree-${item.level}.png`;
      const { error: uploadError } = await supabase.storage
        .from("curriculum-images")
        .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.error(`  ❌ Upload:`, uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage.from("curriculum-images").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Update DB
      const { error: updateError } = await supabase
        .from("curriculum_levels")
        .update({ icon: publicUrl })
        .eq("level_number", item.level);

      if (updateError) console.error(`  ❌ DB:`, updateError.message);
      else console.log(`  ✅ DB updated → ${publicUrl}\n`);

      results.push({ level: item.level, name: item.name, url: publicUrl, size: imageBuffer.length });

      await wait(2000);
    } catch (err) {
      console.error(`  ❌ Failed:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 WATERCOLOR TREE RESULTS:");
  console.log("=".repeat(60));
  results.forEach(r => {
    console.log(`  Level ${r.level}: ✅ ${(r.size / 1024).toFixed(0)} KB — ${r.name}`);
  });
  console.log(`\n🎉 Done! ${results.length}/6 watercolor tree icons live.`);
}

run();
