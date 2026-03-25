import * as fal from "@fal-ai/serverless-client";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

fal.config({ credentials: process.env.FAL_API_KEY });

const wait = (ms) => new Promise(r => setTimeout(r, ms));

const STYLES = [
  {
    filename: "test-style-A-gradient.png",
    label: "Style A — Gradient",
    prompt: "A single beautiful tree with full green canopy and visible roots, rendered in smooth flowing color gradients from deep emerald green to golden amber, elegant sophisticated style with subtle color transitions, dark navy background with soft bokeh light particles, premium luxury app aesthetic, centered composition, no text, high detail, 4k"
  },
  {
    filename: "test-style-B-glass.png",
    label: "Style B — Glass",
    prompt: "A single beautiful tree with full canopy made of frosted translucent glass material, semi-transparent leaves with light refracting through them, soft glowing edges, blurred glass effect background in deep teal and purple tones, modern glassmorphism UI design aesthetic, premium sophisticated look, centered composition, no text, high detail, 4k"
  },
  {
    filename: "test-style-C-geometric.png",
    label: "Style C — Geometric",
    prompt: "A single tree composed of clean geometric shapes, circles for canopy and rectangles for trunk, flat solid colors in teal green and warm brown, pure white background, ultra minimal Scandinavian design style, sharp clean edges, balanced proportions, sophisticated simplicity, centered composition, no text, high detail, 4k"
  },
  {
    filename: "test-style-D-watercolor-dark.png",
    label: "Style D — Watercolor Dark",
    prompt: "A single majestic tree painted in elegant loose watercolor style with rich emerald green splashes for leaves and warm brown trunk, artistic paint drips and soft edges, set against a deep dark charcoal background, refined artistic premium feel, subtle gold accent highlights on leaf tips, centered composition, no text, high detail, 4k"
  }
];

async function run() {
  console.log("🌳 Tree Style Test — 4 images\n");

  const outDir = "scripts/image-gen/output/style-tests";
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < STYLES.length; i++) {
    const s = STYLES[i];
    console.log(`⏳ [${i + 1}/4] ${s.label}...`);

    try {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: s.prompt,
          image_size: "square",
          num_images: 1
        }
      });

      const url = result.images[0].url;
      const resp = await fetch(url);
      const buf = Buffer.from(await resp.arrayBuffer());

      const outPath = path.join(outDir, s.filename);
      fs.writeFileSync(outPath, buf);
      console.log(`  ✅ Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)\n`);

      if (i < STYLES.length - 1) await wait(2000);
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}\n`);
    }
  }

  console.log("=".repeat(50));
  console.log("📊 Results:");
  console.log("=".repeat(50));
  for (const s of STYLES) {
    const fp = path.join(outDir, s.filename);
    if (fs.existsSync(fp)) {
      const size = fs.statSync(fp).size;
      console.log(`  ${s.label}: ${(size / 1024).toFixed(0)} KB`);
    } else {
      console.log(`  ${s.label}: ❌ missing`);
    }
  }
  console.log("\n🎉 Done!");
}

run();
