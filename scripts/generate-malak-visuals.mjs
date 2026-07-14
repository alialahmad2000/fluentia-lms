/**
 * Malak Al-Kendi — cinematic visuals for her custom «الإنجليزية لقائدة التسويق» track.
 * 10 unit covers + 10 reading before-read images, via fal.ai Flux Schnell.
 * Matches the platform's watercolor-on-dark cover style, tilted warm to echo her
 * copper/amber "Studio" identity. Covers power her unit cards AND the immersive
 * home/curriculum backgrounds (which bleed the unit cover art).
 *
 * Idempotent + resumable: skips assets already set. Run: node scripts/generate-malak-visuals.mjs [--covers-only|--readings-only|--dry-run]
 */
import * as fal from '@fal-ai/serverless-client'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
dotenv.config()

fal.config({ credentials: process.env.FAL_API_KEY })
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const MALAK = '28a83f30-9474-4869-8f08-f63dc40c767d'
const BUCKET = 'curriculum-images'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const STYLE = 'elegant watercolor illustration with visible brushstrokes and soft wet paint edges, a sophisticated warm palette of copper, amber, bronze and gold with subtle deep-teal accents, on a deep dark charcoal-black background, refined modern marketing-studio mood, artistic premium editorial feel, absolutely no text no letters no words no numbers no people no faces no watermarks, wide cinematic landscape composition 16:9, high detail, 4k'

// concept scene per unit (the cover — powers cards + immersive world)
const COVER = {
  1: 'an illuminated marketing strategy roadmap laid across a dark boardroom table, glowing upward growth arrows and colourful strategy cards fanning out, a brass compass',
  2: 'a creative advertising campaign mood-board with fabric and colour swatches, a film storyboard strip, sticky notes and a softly glowing campaign timeline',
  3: 'an elegant glowing analytics dashboard floating in dark space, rising golden bar charts and a bright upward trend line, sparkling scattered data points',
  4: 'two glowing smartphones linked by a ribbon of light, floating heart and like icons and a small rolled contract scroll, a warm social constellation',
  5: 'a designer’s dark desk with a tablet showing a poster design, red-and-gold review marks and neat colour swatches, a magnifier lens under a warm studio lamp',
  6: 'a top-down view of a round glowing table with a kanban board of moving task cards, connected glowing nodes and a soft brass clock in warm ambient light',
  7: 'a balanced brass scale weighing glowing idea orbs, speech-bubble shapes shifting from cool blue to warm gold, a bridge of light spanning a gap',
  8: 'an elegant envelope opening into warm golden light revealing a neatly structured letter, a paper-plane send arrow arcing upward, subtle @ motifs',
  9: 'a glowing online storefront on launch night, a rocket trailing shopping bags and sparks, spotlit floating products and a bright countdown ring',
  10: 'a radiant golden lightbulb blooming into a theatre stage spotlight over rows of softly glowing seats, confetti of ideas and upward sparks, a triumphant pitch',
}

// tighter still-life "artifact" scene per unit (the reading before-read image — related but distinct)
const READING = {
  1: 'a close editorial still-life of a printed marketing strategy deck and a highlighted quarterly roadmap with tiny growth charts',
  2: 'a close still-life of an advertising creative brief with a storyboard strip, colour mood swatches and a glowing schedule bar',
  3: 'a close still-life of a campaign results report with rising charts, a golden KPI dial and a percentage growth ring',
  4: 'a close still-life of a phone screen showing an influencer collaboration and a small signed partnership agreement beside it',
  5: 'a close still-life of a creative proof print marked with red review lines and gold approval ticks, colour swatches fanned nearby',
  6: 'a close still-life of a project status board with progress task cards, a milestone timeline and a soft glowing clock',
  7: 'a close still-life of a negotiation table with a handshake of light, a balanced brass scale and turning speech bubbles',
  8: 'a close still-life of a laptop screen showing a well-structured professional email with a glowing send button',
  9: 'a close still-life of an e-commerce product page glowing with an add-to-cart button, launch sparks and a discount ribbon',
  10: 'a close still-life of a pitch-deck opening slide radiating one big glowing idea with a spotlight and rising sparks',
}

const prompt = (scene) => `${scene}, ${STYLE}`

async function genOne(scene, storagePath, outFile) {
  const result = await fal.subscribe('fal-ai/flux/schnell', { input: { prompt: prompt(scene), image_size: 'landscape_16_9', num_images: 1 } })
  const buf = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer())
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, buf)
  const { error: upErr } = await sb.storage.from(BUCKET).upload(storagePath, buf, { contentType: 'image/png', upsert: true })
  if (upErr) throw new Error('upload: ' + upErr.message)
  return { url: sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl, kb: (buf.length / 1024).toFixed(0) }
}

async function main() {
  const args = process.argv.slice(2)
  const dry = args.includes('--dry-run')
  const doCovers = !args.includes('--readings-only')
  const doReadings = !args.includes('--covers-only')
  const outDir = 'scripts/image-gen/output/malak'

  const { data: units } = await sb.from('curriculum_units').select('id, unit_number, theme_en, cover_image_url').eq('owner_student_id', MALAK).order('custom_sort')
  const { data: readings } = await sb.from('curriculum_readings').select('id, unit_id, title_en, before_read_image_url').in('unit_id', units.map((u) => u.id))
  const readingByUnit = {}
  for (const r of readings) (readingByUnit[r.unit_id] ||= []).push(r)

  console.log(`Malak visuals — ${units.length} units | covers:${doCovers} readings:${doReadings} | ${dry ? 'DRY' : 'LIVE'}\n`)
  let ok = 0, skip = 0, err = 0

  for (const u of units) {
    // COVER
    if (doCovers) {
      if (u.cover_image_url) { console.log(`U${u.unit_number} cover — skip (set)`); skip++ }
      else if (dry) { console.log(`U${u.unit_number} cover — would gen: ${COVER[u.unit_number]?.slice(0, 50)}...`) }
      else {
        try {
          const { url, kb } = await genOne(COVER[u.unit_number], `units/malak-U${u.unit_number}.png`, `${outDir}/cover-U${u.unit_number}.png`)
          const { error } = await sb.from('curriculum_units').update({ cover_image_url: url }).eq('id', u.id)
          if (error) throw new Error('db: ' + error.message)
          console.log(`U${u.unit_number} cover ✅ ${kb}KB`); ok++
        } catch (e) { console.error(`U${u.unit_number} cover ❌ ${e.message}`); err++; if (/429|rate/i.test(e.message)) await wait(30000) }
        await wait(2500)
      }
    }
    // READING before-read image
    if (doReadings) {
      for (const r of readingByUnit[u.id] || []) {
        if (r.before_read_image_url) { console.log(`U${u.unit_number} reading — skip (set)`); skip++ }
        else if (dry) { console.log(`U${u.unit_number} reading — would gen: ${READING[u.unit_number]?.slice(0, 50)}...`) }
        else {
          try {
            const { url, kb } = await genOne(READING[u.unit_number], `readings/malak-U${u.unit_number}-${r.id.slice(0, 8)}.png`, `${outDir}/reading-U${u.unit_number}.png`)
            const { error } = await sb.from('curriculum_readings').update({ before_read_image_url: url }).eq('id', r.id)
            if (error) throw new Error('db: ' + error.message)
            console.log(`U${u.unit_number} reading ✅ ${kb}KB`); ok++
          } catch (e) { console.error(`U${u.unit_number} reading ❌ ${e.message}`); err++; if (/429|rate/i.test(e.message)) await wait(30000) }
          await wait(2500)
        }
      }
    }
  }
  console.log(`\nDONE — ok:${ok} skip:${skip} err:${err}`)
}
main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
