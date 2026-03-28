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

const ICONS = [
  {
    level: 0,
    name: "Foundation — تأسيس",
    prompt: "3D clay render icon of a cute small green seedling sprout with two round soft leaves growing from a smooth brown soil mound, soft matte pastel green and warm brown clay materials, rounded puffy organic shapes, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  },
  {
    level: 1,
    name: "Basics — أساسيات",
    prompt: "3D clay render icon of a small sturdy tower made of four stacked rounded building blocks in soft sky blue and light coral and pale yellow colors, soft matte pastel clay materials, smooth puffy rounded edges, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  }
];

async function run() {
  console.log("🔧 Regenerating Level 0 & 1 icons (using fetch instead of https)\n");

  const outDir = "scripts/image-gen/output/level-icons-v2";

  for (const item of ICONS) {
    console.log(`⏳ Level ${item.level}: ${item.name}...`);

    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: { prompt: item.prompt, image_size: "square", num_images: 1 }
      });

      const imageUrl = result.images[0].url;
      console.log(`  🔗 URL: ${imageUrl}`);

      // Use fetch (handles redirects) instead of https module
      const resp = await fetch(imageUrl);
      const imageBuffer = Buffer.from(await resp.arrayBuffer());
      console.log(`  📦 Downloaded: ${(imageBuffer.length / 1024).toFixed(0)} KB`);

      const filename = `level-${item.level}-icon-v2.png`;
      fs.writeFileSync(path.join(outDir, filename), imageBuffer);

      const storagePath = `levels/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from("curriculum-images")
        .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });

      if (uploadError) {
        console.error(`  ❌ Upload failed:`, uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage.from("curriculum-images").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("curriculum_levels")
        .update({ icon: publicUrl })
        .eq("level_number", item.level);

      if (updateError) console.error(`  ❌ DB:`, updateError.message);
      else console.log(`  ✅ Done → ${publicUrl}\n`);

      await wait(2000);
    } catch (err) {
      console.error(`  ❌ Failed:`, err.message);
    }
  }

  console.log("🎉 Fix complete!");
}

run();
