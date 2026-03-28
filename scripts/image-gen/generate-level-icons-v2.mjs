import * as fal from "@fal-ai/serverless-client";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import https from "https";

dotenv.config();

fal.config({ credentials: process.env.FAL_API_KEY });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// V2 — refined prompts: consistent clay style, no text, color-matched to level theme
const LEVEL_ICONS = [
  {
    level: 0,
    name: "Foundation — تأسيس",
    prompt: "3D clay render icon of a cute small green seedling sprout with two round soft leaves growing from a smooth brown soil mound, soft matte pastel green and warm brown clay materials, rounded puffy organic shapes, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  },
  {
    level: 1,
    name: "Basics — أساسيات",
    prompt: "3D clay render icon of a small sturdy tower made of four stacked rounded building blocks in soft sky blue and light coral and pale yellow colors, soft matte pastel clay materials, smooth puffy rounded edges, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  },
  {
    level: 2,
    name: "Development — تطوير",
    prompt: "3D clay render icon of a cute small rocket ship in soft lavender purple and white colors launching upward with a small stylized orange flame and two tiny yellow stars nearby, soft matte pastel clay materials, smooth puffy rounded aerodynamic shape, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  },
  {
    level: 3,
    name: "Fluency — طلاقة",
    prompt: "3D clay render icon of a cute open book with soft amber gold pages and a flowing magical swirling ribbon of teal and blue light rising from the pages like a gentle wave with tiny sparkle dots, soft matte pastel clay materials, smooth puffy rounded shapes, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters no alphabet, ultra high detail, 4k"
  },
  {
    level: 4,
    name: "Mastery — تمكّن",
    prompt: "3D clay render icon of a cute golden trophy cup with two handles and a small simple star shape on top with three tiny sparkle particles floating around it, soft matte warm gold and cream clay materials, smooth puffy rounded shapes, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  },
  {
    level: 5,
    name: "Proficiency — احتراف",
    prompt: "3D clay render icon of a cute glowing diamond gemstone crystal in soft royal purple and deep indigo colors with small light rays and three tiny floating sparkle dots around it, soft matte and slightly glossy mixed clay materials, smooth puffy rounded facets, minimal clean centered composition on pure white background, isometric view, soft even studio lighting with gentle shadows, adorable premium Pixar-style educational app icon, absolutely no text no letters no words no characters, ultra high detail, 4k"
  }
];

async function generateAndUpload() {
  console.log("🎨 Level Icon Generation V2 (6 icons)\n");

  const outDir = "scripts/image-gen/output/level-icons-v2";
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];

  for (const item of LEVEL_ICONS) {
    console.log(`⏳ [${item.level + 1}/6] Level ${item.level}: ${item.name}...`);

    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: item.prompt,
          image_size: "square",
          num_images: 1
        }
      });

      const imageUrl = result.images[0].url;
      const imageBuffer = await downloadImage(imageUrl);

      const filename = `level-${item.level}-icon-v2.png`;
      const localPath = path.join(outDir, filename);
      fs.writeFileSync(localPath, imageBuffer);
      console.log(`  💾 Saved: ${localPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);

      // Upload to Supabase Storage
      const storagePath = `levels/${filename}`;
      const { error: uploadError } = await supabase.storage
        .from("curriculum-images")
        .upload(storagePath, imageBuffer, {
          contentType: "image/png",
          upsert: true
        });

      if (uploadError) {
        console.error(`  ❌ Upload failed:`, uploadError.message);
        continue;
      }

      const { data: urlData } = supabase.storage
        .from("curriculum-images")
        .getPublicUrl(storagePath);

      const publicUrl = urlData.publicUrl;
      console.log(`  🌐 ${publicUrl}`);

      // Update DB — set the icon column on curriculum_levels
      const { error: updateError } = await supabase
        .from("curriculum_levels")
        .update({ icon: publicUrl })
        .eq("level_number", item.level);

      if (updateError) {
        console.error(`  ❌ DB update failed:`, updateError.message);
      } else {
        console.log(`  ✅ DB updated!\n`);
      }

      results.push({ level: item.level, name: item.name, url: publicUrl, size: imageBuffer.length });

      await wait(2000);

    } catch (err) {
      console.error(`  ❌ Failed:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 V2 RESULTS:");
  console.log("=".repeat(60));
  results.forEach(r => {
    console.log(`  Level ${r.level} (${r.name}): ✅ ${(r.size / 1024).toFixed(0)} KB`);
  });
  console.log(`\n🎉 Done! ${results.length}/6 v2 icons generated and uploaded.`);
}

generateAndUpload();
