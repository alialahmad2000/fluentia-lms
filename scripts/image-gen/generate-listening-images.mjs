// Generate a cinematic, topic-specific hero image for every listening activity.
// Claude art-directs a scene from the actual topic/transcript → FLUX pro v1.1 renders 16:9 →
// upload to public curriculum-images/listening/<id>.jpg → set image_url/image_prompt.
//
// Run: node scripts/image-gen/generate-listening-images.mjs [--resume] [--limit N] [--dry-run]
import * as fal from '@fal-ai/serverless-client'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

fal.config({ credentials: process.env.FAL_API_KEY })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const args = process.argv.slice(2)
const resume = args.includes('--resume')
const dryRun = args.includes('--dry-run')
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const STYLE = 'cinematic editorial photograph, dramatic atmospheric lighting, rich depth and detail, moody premium color grade, strong sense of story and atmosphere, wide 16:9 landscape composition, no text, no letters, no words, no watermark, no logos, ultra high detail, 4k'

const SCENE_SYSTEM = `You are an art director for a premium English-learning app for Saudi students. Given a listening lesson, write ONE vivid cinematic SCENE description (1–2 sentences, ~25–40 words) for a hero image that instantly conveys the topic and feels thrilling, beautiful and premium.
RULES:
- Favor dramatic environments, landscapes, objects, weather, and atmospheric moments that EXPLAIN the topic at a glance.
- AVOID close-up human faces and crowds (distant silhouettes are fine). Keep it culturally respectful and modest (audience is Saudi, mostly women): no alcohol, no immodest imagery, no religious figures.
- Do NOT include any text, letters, words, signs, or logos in the scene.
- Output ONLY the scene description — no preamble, no quotes.`

async function scene(row) {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 160, temperature: 0.8, system: SCENE_SYSTEM,
    messages: [{ role: 'user', content: `Topic (EN): ${row.title_en}\nType: ${row.audio_type}\nWhat the audio is about: ${(row.transcript || '').slice(0, 320)}\n\nWrite the cinematic scene.` }],
  })
  return (msg.content[0].text || '').trim().replace(/^["']|["']$/g, '')
}

async function main() {
  let q = supabase.from('curriculum_listening').select('id, unit_id, title_en, title_ar, audio_type, transcript, image_url').order('sort_order')
  if (resume) q = q.is('image_url', null)
  const { data: rows, error } = await q
  if (error) throw error
  let list = rows
  if (limit) list = list.slice(0, limit)
  console.log(`Listening images: ${list.length} to process${dryRun ? ' (DRY-RUN)' : ''}`)

  let ok = 0, fail = 0
  for (let i = 0; i < list.length; i++) {
    const row = list[i]
    try {
      const sc = await scene(row)
      const prompt = `${sc}, ${STYLE}`
      console.log(`[${i + 1}/${list.length}] ${row.title_en}\n   scene: ${sc}`)
      if (dryRun) { ok++; continue }
      const result = await fal.subscribe('fal-ai/flux-pro/v1.1', { input: { prompt, image_size: 'landscape_16_9', num_images: 1 } })
      const buf = Buffer.from(await (await fetch(result.images[0].url)).arrayBuffer())
      const path = `listening/${row.id}.jpg`
      const { error: upErr } = await supabase.storage.from('curriculum-images').upload(path, buf, { contentType: 'image/jpeg', upsert: true })
      if (upErr) throw upErr
      const publicUrl = supabase.storage.from('curriculum-images').getPublicUrl(path).data.publicUrl
      const { error: dbErr } = await supabase.from('curriculum_listening').update({ image_url: publicUrl, image_prompt: sc, image_generated_at: new Date().toISOString() }).eq('id', row.id)
      if (dbErr) throw dbErr
      ok++
      console.log(`   ✓ ${(buf.length / 1024).toFixed(0)}KB → ${publicUrl}`)
      await wait(1500)
    } catch (e) {
      fail++
      console.error(`   ✗ ${e.message}`)
      if (/429|rate/i.test(e.message)) await wait(20000)
    }
  }
  console.log(`\nDone. ok=${ok} fail=${fail}`)
  if (fail > 0) process.exit(1)
}
main().catch((e) => { console.error(e); process.exit(1) })
