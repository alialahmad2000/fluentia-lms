// Voice Malak's ENTIRE account with FREE local Kokoro TTS (no ElevenLabs, no cost).
// Re-voices all 10 unit reading passages + all 90 vocab words with a consistent voice,
// wires reading_passage_audio + curriculum_readings.passage_audio_url + curriculum_vocabulary.audio_url.
// Overwrites existing files at the same storage paths (upsert) so URLs stay stable.
//   Setup: npm i kokoro-js   ·   Run: node scripts/voice-malak-kokoro.mjs [--voice bf_emma] [--force]
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { synthMono } from './lib/kokoro-tts.mjs'
dotenv.config()

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const MALAK = '28a83f30-9474-4869-8f08-f63dc40c767d'
const BUCKET = 'curriculum-audio'
const args = process.argv.slice(2)
const VOICE = (args.find((a, i) => args[i - 1] === '--voice')) || 'bf_emma'
const FORCE = args.includes('--force')
const passageText = (pc) => (pc?.paragraphs || []).map((p) => (typeof p === 'string' ? p : p.text || p.content || '')).join(' ').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
const reachable = async (u) => { try { return (await fetch(u, { method: 'HEAD' })).ok } catch { return false } }
async function upload(spath, buffer) {
  const { error } = await sb.storage.from(BUCKET).upload(spath, buffer, { contentType: 'audio/mpeg', upsert: true })
  if (error) throw new Error('upload: ' + error.message)
  return sb.storage.from(BUCKET).getPublicUrl(spath).data.publicUrl
}

async function main() {
  console.log(`Malak · FREE Kokoro TTS · voice=${VOICE} · ${FORCE ? 'FORCE re-voice all' : 'idempotent'}\n`)
  const { data: units } = await sb.from('curriculum_units').select('id, custom_sort, theme_ar').eq('owner_student_id', MALAK).order('custom_sort')
  const rep = { pass: 0, passSkip: 0, vocab: 0, vocabSkip: 0, fail: [] }

  for (const u of units) {
    const { data: reading } = await sb.from('curriculum_readings').select('id, passage_content, passage_audio_url').eq('unit_id', u.id).order('reading_label').limit(1).maybeSingle()
    if (!reading) { console.log(`U${u.custom_sort}: no reading`); continue }
    const txt = passageText(reading.passage_content)
    console.log(`U${u.custom_sort} «${u.theme_ar}»`)

    // passage
    if (reading.passage_audio_url && !FORCE && (await reachable(reading.passage_audio_url))) { rep.passSkip++; console.log('   passage — skip') }
    else {
      try {
        const { buffer, durationMs } = await synthMono(txt, VOICE, `u${u.custom_sort}-p`)
        const spath = `reading/malak/${reading.id}/full.mp3`
        const url = await upload(spath, buffer)
        const payload = { passage_id: reading.id, full_audio_url: url, full_audio_path: spath, full_duration_ms: durationMs, paragraph_audio: [], word_timestamps: [], voice_id: `kokoro:${VOICE}`, generated_at: new Date().toISOString() }
        const { data: ex } = await sb.from('reading_passage_audio').select('passage_id').eq('passage_id', reading.id).maybeSingle()
        if (ex) await sb.from('reading_passage_audio').update(payload).eq('passage_id', reading.id)
        else await sb.from('reading_passage_audio').insert(payload)
        await sb.from('curriculum_readings').update({ passage_audio_url: url, audio_duration_seconds: Math.round(durationMs / 1000), audio_generated_at: new Date().toISOString() }).eq('id', reading.id)
        rep.pass++; console.log(`   ✅ passage (${(durationMs / 1000).toFixed(1)}s)`)
      } catch (e) { rep.fail.push(`u${u.custom_sort} passage: ${e.message}`); console.log(`   ❌ passage: ${e.message}`) }
    }

    // vocab
    const { data: vocab } = await sb.from('curriculum_vocabulary').select('id, word, audio_url').eq('reading_id', reading.id).order('sort_order')
    for (const v of vocab || []) {
      if (v.audio_url && !FORCE && (await reachable(v.audio_url))) { rep.vocabSkip++; continue }
      try {
        const { buffer } = await synthMono(v.word, VOICE, `u${u.custom_sort}-v-${v.id.slice(0, 8)}`)
        const url = await upload(`vocab/malak/${v.id}.mp3`, buffer)
        await sb.from('curriculum_vocabulary').update({ audio_url: url, audio_voice_name: `Kokoro:${VOICE}`, audio_generated_at: new Date().toISOString() }).eq('id', v.id)
        rep.vocab++
      } catch (e) { rep.fail.push(`u${u.custom_sort} vocab "${v.word}": ${e.message}`); console.log(`   ❌ vocab "${v.word}": ${e.message}`) }
    }
    console.log(`   🔤 vocab: +${(vocab || []).length}`)
  }

  console.log(`\n=== REPORT ===\npassages +${rep.pass} (skip ${rep.passSkip}) · vocab +${rep.vocab} (skip ${rep.vocabSkip})`)
  if (rep.fail.length) { console.log('FAILURES:'); rep.fail.forEach((f) => console.log('  - ' + f)) }
  console.log('Done.')
}
main().catch((e) => { console.error('FATAL:', e); process.exit(1) })
