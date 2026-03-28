/**
 * Generate cover images for all 72 curriculum units
 * Uses fal.ai Flux Schnell — watercolor style on dark background (matching level icons)
 *
 * Run: node scripts/image-gen/generate-unit-covers.mjs [--level N] [--resume] [--dry-run]
 *
 * Options:
 *   --level N    Only process units in level N (0-5)
 *   --resume     Skip units that already have cover_image_url
 *   --dry-run    List units without generating
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

const STYLE_SUFFIX = "elegant watercolor illustration style with visible paint strokes and soft wet edges, vibrant rich colors, on deep dark charcoal black background, artistic premium feel, absolutely no text no letters no words no numbers no characters no writing no labels no watermarks, wide landscape composition 16:9, high detail, 4k";

function buildPrompt(theme) {
  // Map themes to vivid visual scenes
  const themePrompts = {
    "Daily Life": "A cozy morning kitchen scene with a steaming coffee cup, toast on a plate, and warm sunlight through a window",
    "Food & Cooking": "A vibrant cooking scene with colorful fresh vegetables, spices, and a sizzling pan with aromatic steam rising",
    "My City": "A panoramic city skyline at golden hour with warm glowing buildings, a bridge, and evening lights reflecting on water",
    "Animals Around Us": "A gentle scene with a cat sitting on a windowsill watching birds and butterflies in a garden",
    "Weather & Seasons": "Four seasonal trees side by side — spring blossoms, summer green, autumn orange, winter snow — showing the cycle of seasons",
    "Family & Friends": "A warm gathering scene with a family picnic in a park under a large shady tree with lanterns",
    "Shopping & Money": "A charming market street with colorful shop awnings, fruit stalls, and hanging lanterns",
    "Health & Body": "A peaceful wellness scene with a person doing yoga at sunrise near blooming lotus flowers and calm water",
    "Hobbies & Free Time": "A creative workspace with art supplies, a guitar, books, and a camera arranged artistically",
    "Travel Basics": "A vintage suitcase with travel stickers, a passport, a compass, and a small globe on a wooden surface",
    "Technology Today": "A modern desk with a glowing laptop, smartphone, smartwatch, and holographic interface elements floating above",
    "Jobs & Careers": "A professional scene with diverse work tools — stethoscope, wrench, paintbrush, laptop, chef hat — arranged in a circle",

    "Cultural Festivals": "A vibrant festival celebration with colorful paper lanterns, confetti, traditional masks, and fireworks in the night sky",
    "Ocean Life": "An underwater coral reef scene with colorful tropical fish, sea turtles, and swaying coral formations",
    "Space Exploration": "A dramatic view of a rocket launching into a starry night sky with planets and nebulae visible",
    "Music & Art": "A grand piano surrounded by flowing musical notes, paint splashes, and colorful sound waves",
    "Famous Places": "The Eiffel Tower, Taj Mahal, and Great Wall of China silhouettes merged in a dreamy montage",
    "Inventions": "A creative inventor's workshop with gears, light bulbs, blueprints, and a glowing prototype on a workbench",
    "Sports Stars": "A dynamic sports scene with a soccer ball, basketball, and tennis racket in mid-action with motion trails",
    "Ancient Civilizations": "Ancient Egyptian pyramids and Roman columns under a dramatic sunset sky with golden clouds",
    "Photography": "A vintage camera on a tripod capturing a stunning mountain landscape at golden hour",
    "World Cuisines": "A round table from above showing diverse dishes from around the world — sushi, pasta, tacos, curry — beautifully arranged",
    "Social Media": "A network of glowing connected nodes and floating app icons forming a constellation pattern",
    "Green Living": "A lush green garden with solar panels, wind turbines, recycling bins, and a small eco-friendly house",

    "Brain & Memory": "A glowing human brain with colorful neural connections and sparkling synapses firing",
    "Endangered Species": "A majestic snow leopard standing on a mountain cliff with endangered animals fading in the background",
    "Extreme Weather": "A dramatic split scene — half tornado with lightning, half calm sunny sky with rainbow",
    "Fashion & Identity": "A fashion design studio with colorful fabric swatches, a dress form, scissors, and sketches",
    "Hidden History": "An ancient treasure map unrolling with a compass, old key, and mysterious ruins in the background",
    "Future Cities": "A futuristic cityscape with flying vehicles, vertical gardens, and holographic displays at twilight",
    "Digital Detox": "A peaceful nature scene with a smartphone locked in a glass jar while butterflies fly around",
    "Mountain Adventures": "A mountain climber reaching a snowy summit at sunrise with dramatic peaks and clouds below",
    "Film & Cinema": "A vintage film projector casting a colorful beam of light onto a grand cinema screen",
    "Water Crisis": "A single water droplet falling into a dry cracked earth with a small green sprout growing where it lands",
    "Street Art": "A vibrant graffiti-covered urban wall with colorful murals, spray cans, and artistic expression",
    "Remarkable Journeys": "A winding road through diverse landscapes — desert, forest, mountains, ocean — leading to a distant horizon",

    "Artificial Intelligence": "A humanoid robot face with glowing blue neural network patterns and digital data streams flowing around",
    "Coral Reefs": "A vibrant underwater coral reef ecosystem with diverse marine life, anemones, and bioluminescent creatures",
    "Earthquake Science": "Cross-section view of tectonic plates shifting underground with seismic waves radiating outward",
    "Global Coffee Culture": "Coffee beans, a traditional Turkish cezve, Italian moka pot, and Japanese pour-over arranged on a world map",
    "Renewable Energy": "A landscape with solar panels, wind turbines, and a flowing river with a hydroelectric dam at sunset",
    "Virtual Reality": "A person wearing VR goggles with a digital world materializing around them in colorful polygons",
    "Psychology of Fear": "A dramatic scene of a dark corridor with one end bright and warm, symbolizing overcoming fear",
    "Ancient Engineering": "The Colosseum and aqueducts of Rome with detailed stone arches and engineering precision",
    "Genetic Science": "A glowing DNA double helix structure spiraling upward with gene sequences and molecular structures",
    "Urban Farming": "A rooftop garden on a city building with raised beds of vegetables, herbs, and greenhouse structures",
    "Digital Privacy": "A locked padlock made of digital code and binary numbers with a shield glowing around it",
    "Mars Exploration": "A Mars rover on the red planet surface with dramatic Martian landscape and Earth visible in the sky",

    "Bioethics": "A balanced scale with a DNA helix on one side and a heart symbol on the other, surrounded by scientific instruments",
    "Deep Ocean Discovery": "A deep-sea submarine with spotlights illuminating mysterious glowing creatures in the abyss",
    "Food Security": "A golden wheat field stretching to the horizon with farming equipment and a protective shield over crops",
    "Biomimicry Design": "A split image — left side shows a kingfisher bird, right side shows a bullet train, connected by flowing design lines",
    "Human Migration": "A world map with flowing colorful migration paths like rivers connecting continents",
    "Cryptocurrency": "A glowing Bitcoin coin surrounded by blockchain nodes, digital circuits, and flowing data streams",
    "Crowd Psychology": "A bird's eye view of a large crowd forming a pattern, with individual figures transitioning into collective movement",
    "Forensic Science": "A magnifying glass over fingerprints, test tubes, and evidence markers at a detective's workspace",
    "Archaeological Mysteries": "An ancient temple entrance being excavated with golden artifacts, hieroglyphs, and archaeological tools",
    "Longevity Science": "An hourglass with DNA strands instead of sand, surrounded by cellular structures and molecular formulas",
    "Sustainable Architecture": "A futuristic green building covered in plants and trees with solar panels and wind catchers integrated",
    "Exoplanet Hunting": "A powerful telescope pointed at a distant star system with newly discovered planets in various colors",

    "Civilization Collapse": "Ancient ruins of a grand city being reclaimed by nature with trees growing through broken marble columns",
    "Extreme Achievement": "A mountain peak with a flag at the summit, climber's silhouette against a dramatic sunset sky",
    "Scientific Skepticism": "A magnifying glass examining scientific claims with question marks and checkmarks floating around",
    "Climate Adaptation": "A coastal city with modern flood defenses, floating houses, and green infrastructure protecting against rising waters",
    "Nuclear Energy Debate": "An atom symbol split in half — one side glowing with clean energy, the other showing radiation warning symbols",
    "Biodiversity Crisis": "A tree of life with some branches flourishing in green and others fading to gray, with species silhouettes",
    "Neuroscience Frontiers": "A human brain merged with a circuit board, with neurons firing and digital signals crossing between them",
    "Swarm Intelligence": "A murmuration of starlings forming a complex shape in the sky with individual birds visible",
    "Creative Genius": "A light bulb shattering into colorful paint splashes, musical notes, and mathematical equations",
    "Quantum Discovery": "Subatomic particles in a quantum field with wave-particle duality visualized in vibrant colors and light trails",
    "Cross-Cultural Exchange": "Hands from different cultures exchanging gifts — a tea set, spices, fabric, instruments — forming a circle",
    "Resource Economics": "A globe made of interconnected resources — oil drops, gold bars, wheat, water — with supply chain connections",
  };

  const scene = themePrompts[theme] || `A vivid artistic scene representing the concept of "${theme}"`;
  return `${scene}, ${STYLE_SUFFIX}`;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const resume = args.includes('--resume');
  const levelArg = args.find((a, i) => args[i - 1] === '--level');
  const targetLevel = levelArg !== undefined ? parseInt(levelArg) : null;

  console.log("🖼️  Unit Cover Image Generator");
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Resume: ${resume ? 'Yes' : 'No'}`);
  if (targetLevel !== null) console.log(`   Level: ${targetLevel} only`);
  console.log();

  // Fetch levels for mapping
  const { data: levels } = await supabase
    .from('curriculum_levels')
    .select('id, level_number, name_en')
    .order('level_number');

  const levelMap = {};
  for (const l of levels) levelMap[l.id] = l;

  // Fetch units
  let query = supabase
    .from('curriculum_units')
    .select('id, level_id, unit_number, theme_en, cover_image_url')
    .order('unit_number');

  if (resume) {
    query = query.is('cover_image_url', null);
  }

  const { data: units, error } = await query;
  if (error) {
    console.error('❌ DB query failed:', error.message);
    process.exit(1);
  }

  // Filter by level if specified
  let filtered = units;
  if (targetLevel !== null) {
    filtered = units.filter(u => levelMap[u.level_id]?.level_number === targetLevel);
  }

  // Sort by level then unit number
  filtered.sort((a, b) => {
    const la = levelMap[a.level_id]?.level_number ?? 99;
    const lb = levelMap[b.level_id]?.level_number ?? 99;
    return la - lb || a.unit_number - b.unit_number;
  });

  console.log(`📝 Units to process: ${filtered.length}`);

  if (dryRun) {
    for (const u of filtered) {
      const ln = levelMap[u.level_id]?.level_number ?? '?';
      console.log(`  L${ln} U${String(u.unit_number).padStart(2)} — ${u.theme_en}`);
    }
    console.log(`\n✅ Dry run: ${filtered.length} units would be generated.`);
    return;
  }

  // LIVE generation
  const outDir = "scripts/image-gen/output/unit-covers";
  fs.mkdirSync(outDir, { recursive: true });

  let success = 0;
  let errors = 0;
  const errorList = [];

  for (let i = 0; i < filtered.length; i++) {
    const unit = filtered[i];
    const ln = levelMap[unit.level_id]?.level_number ?? 0;
    const label = `L${ln}-U${unit.unit_number}`;

    console.log(`⏳ [${i + 1}/${filtered.length}] ${label}: ${unit.theme_en}...`);

    try {
      const prompt = buildPrompt(unit.theme_en);

      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt,
          image_size: "landscape_16_9",
          num_images: 1
        }
      });

      const imageUrl = result.images[0].url;
      const resp = await fetch(imageUrl);
      const buf = Buffer.from(await resp.arrayBuffer());

      // Save locally
      const filename = `cover-L${ln}-U${unit.unit_number}.png`;
      fs.writeFileSync(path.join(outDir, filename), buf);

      // Upload to Supabase
      const storagePath = `units/${filename}`;
      const { error: uploadErr } = await supabase.storage
        .from("curriculum-images")
        .upload(storagePath, buf, { contentType: "image/png", upsert: true });

      if (uploadErr) {
        console.error(`  ❌ Upload: ${uploadErr.message}`);
        errors++;
        errorList.push({ label, theme: unit.theme_en, error: uploadErr.message });
        continue;
      }

      const { data: urlData } = supabase.storage.from("curriculum-images").getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Update DB
      const { error: dbErr } = await supabase
        .from("curriculum_units")
        .update({ cover_image_url: publicUrl })
        .eq("id", unit.id);

      if (dbErr) {
        console.error(`  ❌ DB: ${dbErr.message}`);
        errors++;
        errorList.push({ label, theme: unit.theme_en, error: dbErr.message });
      } else {
        success++;
        console.log(`  ✅ ${(buf.length / 1024).toFixed(0)} KB`);
      }

    } catch (err) {
      errors++;
      errorList.push({ label, theme: unit.theme_en, error: err.message });
      console.error(`  ❌ ${err.message}`);

      if (err.message.includes('429') || err.message.includes('rate')) {
        console.log('  ⏳ Rate limited — waiting 30s...');
        await wait(30000);
      }
    }

    // Delay between requests
    if (i < filtered.length - 1) await wait(2500);
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 UNIT COVER GENERATION RESULTS:");
  console.log("=".repeat(60));
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Errors:  ${errors}`);
  console.log(`  📁 Output:  ${outDir}/`);

  if (errorList.length > 0) {
    fs.writeFileSync(
      path.join(outDir, 'errors.json'),
      JSON.stringify(errorList, null, 2)
    );
    console.log(`  ⚠️  Error log: ${outDir}/errors.json`);
  }

  console.log(`\n🎉 Done!`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
