/**
 * Malak Al-Kendi — CINEMATIC visuals via fal.ai Flux Pro v1.1.
 * 10 unit covers + 10 reading before-read images. Warm "Studio" cinematic look
 * (copper/amber/bronze, golden rim light, dark moody, no people/text) — matches her
 * theme_key='studio'. Covers power her cards AND the immersive home/curriculum
 * backgrounds (which bleed the cover art), so richer covers = a richer world.
 *
 * Idempotent; --force regenerates. Flags: --covers-only --readings-only --preview --dry-run --force
 * Run: node scripts/generate-malak-visuals.mjs
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
const MODEL = 'fal-ai/flux-pro/v1.1'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const OUTDIR = 'scripts/image-gen/output/malak'

const STYLE = 'cinematic editorial photograph, sophisticated modern marketing-studio atmosphere, a warm palette of copper amber bronze and gold with soft golden rim light and gentle volumetric haze, shallow depth of field, elegant premium product photography, dark moody obsidian background, absolutely no people no faces no hands no text no letters no numbers no logos no watermarks, ultra-detailed, wide 16:9 cinematic composition'

// cover scene per unit (wider concept — the card + the immersive backdrop)
const COVER = {
  1: 'an executive marketing strategy roadmap printed across a dark desk, glowing upward growth arrows and colourful strategy cards, a brass compass and a slim laptop showing charts',
  2: 'a creative advertising campaign mood-board on a dark studio wall with fabric and colour swatches, a printed storyboard strip, pinned notes and a softly glowing schedule',
  3: 'an elegant analytics dashboard glowing on a screen with rising golden bar charts and a bright upward trend line, crisp data reflections on a dark glossy table',
  4: 'two smartphones on a dark surface glowing with a social media feed, floating heart and like icons, a small signed partnership card, warm ring-light bokeh',
  5: 'a designer’s dark desk with a tablet showing a poster design, red review-pen marks, a fan of colour swatches and a magnifier lens under a warm studio lamp',
  6: 'a project status board with progress task cards and a milestone timeline, a coffee cup and a laptop, warm morning studio light through a window',
  7: 'a polished brass balance scale on a dark desk weighing two glowing spheres, a leather notepad and a fountain pen, dramatic warm negotiation light',
  8: 'a slim laptop on a dark desk showing a neat professional email being composed, a glowing send icon, a warm cup of coffee, elegant golden rim light',
  9: 'a glowing e-commerce storefront on a screen with product cards and an add-to-cart, small shopping bags and a burst of launch confetti under a spotlight',
  10: 'a spotlit stage podium facing a large glowing presentation screen radiating one big idea, rows of empty warm-lit seats, dramatic triumphant light',
}

// reading before-read scene (tighter artifact still-life — related but distinct)
const READING = {
  1: 'a close cinematic still-life of a printed marketing strategy summary with highlighted quarterly goals and tiny growth charts on a dark desk',
  2: 'a close still-life of an advertising creative brief with a storyboard strip, colour mood swatches and a glowing schedule bar',
  3: 'a close still-life of a campaign results report on a screen with rising charts, a golden KPI dial and a percentage growth ring',
  4: 'a close still-life of a phone showing an influencer collaboration post beside a small signed partnership agreement',
  5: 'a close still-life of a creative proof print marked with red review lines and gold approval ticks, colour swatches fanned nearby',
  6: 'a close still-life of a project status board with progress task cards, a milestone timeline and a soft glowing clock',
  7: 'a close still-life of a negotiation desk with a brass balance scale, a notepad and turning speech-bubble cards',
  8: 'a close still-life of a laptop screen showing a well-structured professional email with a glowing send button and a coffee cup',
  9: 'a close still-life of an e-commerce product page glowing with an add-to-cart button, launch sparks and a discount ribbon',
  10: 'a close still-life of a pitch-deck opening slide radiating one big glowing idea with a spotlight and rising sparks',
}

const prompt = (scene) => `${scene}, ${STYLE}`
const args = process.argv.slice(2)
const DRY = args.includes('--dry-run'), PREVIEW = args.includes('--preview'), FORCE = args.includes('--force')
const doCovers = !args.includes('--readings-only'), doReadings = !args.includes('--covers-only')

async function render(scene, tag) {
  const result = await fal.subscribe(MODEL, { input: { prompt: prompt(scene), image_size: 'landscape_16_9', num_images: 1, safety_tolerance: '5' } })
  const buf = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer())
  fs.mkdirSync(OUTDIR, { recursive: true })
  fs.writeFileSync(`${OUTDIR}/${tag}.png`, buf)
  return buf
}
async function persist(buf, storagePath) {
  const { error } = await sb.storage.from(BUCKET).upload(storagePath, buf, { contentType: 'image/png', upsert: true })
  if (error) throw new Error('upload: ' + error.message)
  return sb.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl
}

async function main() {
  const { data: units } = await sb.from('curriculum_units').select('id, unit_number, theme_en, cover_image_url').eq('owner_student_id', MALAK).order('custom_sort')
  const { data: readings } = await sb.from('curriculum_readings').select('id, unit_id, before_read_image_url').in('unit_id', units.map((u) => u.id))
  const readingByUnit = {}
  for (const r of readings) (readingByUnit[r.unit_id] ||= []).push(r)
  const cine = (u) => (u.cover_image_url || '').includes('-cine')
  console.log(`Malak CINEMATIC visuals (${MODEL}) — covers:${doCovers} readings:${doReadings} | ${DRY ? 'DRY' : PREVIEW ? 'PREVIEW' : 'LIVE'} ${FORCE ? '+FORCE' : ''}\n`)
  let ok = 0, skip = 0, err = 0

  for (const u of units) {
    if (doCovers) {
      if (cine(u) && !FORCE && !PREVIEW) { console.log(`U${u.unit_number} cover — skip (cine set)`); skip++ }
      else if (DRY) console.log(`U${u.unit_number} cover — ${COVER[u.unit_number].slice(0, 46)}...`)
      else {
        try {
          const buf = await render(COVER[u.unit_number], `cover-U${u.unit_number}`)
          if (!PREVIEW) { const url = await persist(buf, `units/malak-U${u.unit_number}-cine.png`); const { error } = await sb.from('curriculum_units').update({ cover_image_url: url }).eq('id', u.id); if (error) throw new Error('db: ' + error.message) }
          console.log(`U${u.unit_number} cover ✅ ${(buf.length / 1024).toFixed(0)}KB${PREVIEW ? ' (preview)' : ''}`); ok++
        } catch (e) { console.error(`U${u.unit_number} cover ❌ ${e.status || ''} ${e.message}`); err++; if (/429|rate|locked/i.test(e.message + e.status)) await wait(15000) }
        await wait(1500)
      }
    }
    if (doReadings) {
      for (const r of readingByUnit[u.id] || []) {
        if (r.before_read_image_url && !FORCE && !PREVIEW) { console.log(`U${u.unit_number} reading — skip (set)`); skip++ }
        else if (DRY) console.log(`U${u.unit_number} reading — ${READING[u.unit_number].slice(0, 46)}...`)
        else {
          try {
            const buf = await render(READING[u.unit_number], `reading-U${u.unit_number}`)
            if (!PREVIEW) { const url = await persist(buf, `readings/malak-U${u.unit_number}-${r.id.slice(0, 8)}-cine.png`); const { error } = await sb.from('curriculum_readings').update({ before_read_image_url: url }).eq('id', r.id); if (error) throw new Error('db: ' + error.message) }
            console.log(`U${u.unit_number} reading ✅ ${(buf.length / 1024).toFixed(0)}KB${PREVIEW ? ' (preview)' : ''}`); ok++
          } catch (e) { console.error(`U${u.unit_number} reading ❌ ${e.status || ''} ${e.message}`); err++; if (/429|rate|locked/i.test(e.message + e.status)) await wait(15000) }
          await wait(1500)
        }
      }
    }
  }
  console.log(`\nDONE — ok:${ok} skip:${skip} err:${err}`)
}
main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
