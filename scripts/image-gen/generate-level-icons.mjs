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

const LEVEL_ICONS = [
  {
    level: 0,
    name: "Foundation — تأسيس",
    prompt: "3D clay render icon of a tiny green sprouting seedling with two small leaves growing from rich brown soil mound, soft matte pastel green and cream materials, rounded smooth organic shapes, minimal clean composition, centered on pure white background, isometric perspective, soft diffused studio lighting, cute glossy educational app icon style, no text no letters, ultra detailed, 4k"
  },
  {
    level: 1,
    name: "Basics — أساسيات",
    prompt: "3D clay render icon of a small neat stack of colorful building blocks in sky blue coral red and sunny yellow forming a simple sturdy tower, soft matte pastel materials, rounded smooth shapes with slight bevels, minimal clean composition, centered on pure white background, isometric perspective, soft diffused studio lighting, cute glossy educational app icon style, no text no letters, ultra detailed, 4k"
  },
  {
    level: 2,
    name: "Development — تطوير",
    prompt: "3D clay render icon of a bright orange rocket ship launching upward with small stylized flame trail and three tiny stars scattered around it, soft matte pastel orange and white materials, rounded smooth aerodynamic shapes, minimal clean composition, centered on pure white background, isometric perspective, soft diffused studio lighting, cute glossy educational app icon style, no text no letters, ultra detailed, 4k"
  },
  {
    level: 3,
    name: "Fluency — طلاقة",
    prompt: "3D clay render icon of an open book with flowing magical teal and blue glowing stream of tiny letters and symbols rising from its pages like a gentle river, soft matte pastel teal and cream materials, rounded smooth shapes, minimal clean composition, centered on pure white background, isometric perspective, soft diffused studio lighting, cute glossy educational app icon style, no text no letters, ultra detailed, 4k"
  },
  {
    level: 4,
    name: "Mastery — تمكّن",
    prompt: "3D clay render icon of a golden trophy cup with a small elegant crown resting on top and three tiny sparkle stars floating around it, soft matte metallic gold and pearl white materials, rounded smooth shapes, minimal clean composition, centered on pure white background, isometric perspective, soft diffused studio lighting, premium glossy educational app icon style, no text no letters, ultra detailed, 4k"
  },
  {
    level: 5,
    name: "Proficiency — احتراف",
    prompt: "3D clay render icon of a magnificent glowing diamond crystal gemstone in deep royal purple and indigo colors with small elegant light rays emanating outward and tiny floating particles, soft matte and glossy mixed materials, rounded smooth faceted shapes, minimal clean composition, centered on pure white background, isometric perspective, soft diffused studio lighting, premium luxury educational app icon style, no text no letters, ultra detailed, 4k"
  }
];

async function generateAndUpload() {
  console.log("🎨 Starting Level Icon Generation (6 icons)...\n");

  const outDir = "scripts/image-gen/output/level-icons";
  fs.mkdirSync(outDir, { recursive: true });

  const results = [];

  for (const item of LEVEL_ICONS) {
    console.log(`⏳ [${item.level + 1}/6] Generating Level ${item.level}: ${item.name}...`);

    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: item.prompt,
          image_size: "square",
          num_images: 1
        }
      });

      const imageUrl = result.images[0].url;
      console.log(`  ✅ Generated! Downloading...`);

      const imageBuffer = await downloadImage(imageUrl);

      const filename = `level-${item.level}-icon.png`;
      const localPath = path.join(outDir, filename);
      fs.writeFileSync(localPath, imageBuffer);
      console.log(`  💾 Saved locally: ${localPath} (${(imageBuffer.length / 1024).toFixed(0)} KB)`);

      const storagePath = `levels/${filename}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
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
      console.log(`  🌐 URL: ${publicUrl}`);

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
      console.error(`  ❌ Failed for Level ${item.level}:`, err.message);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 RESULTS SUMMARY:");
  console.log("=".repeat(60));
  results.forEach(r => {
    console.log(`  Level ${r.level} (${r.name}): ✅ ${(r.size / 1024).toFixed(0)} KB → ${r.url}`);
  });
  console.log(`\n🎉 Done! ${results.length}/6 icons generated and uploaded.`);
}

generateAndUpload();
