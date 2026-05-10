// Fix remaining 2 rows: tile (meta-text) + environmental sample (API empty response)
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import pkg from 'pg'
const { Client } = pkg

function readEnv() {
  const env = {}
  readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/.env','utf8').split('\n').forEach(line=>{
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/)
    if(m) env[m[1]]=m[2].trim()
  })
  return env
}
const ENV=readEnv()
const db=createClient(ENV['VITE_SUPABASE_URL'],ENV['SUPABASE_SERVICE_ROLE_KEY'])
const ai=new Anthropic({apiKey:ENV['CLAUDE_API_KEY']})
const RUN_ID=readFileSync('C:/Users/Dr. Ali/Desktop/fluentia-lms/docs/audits/vocab/run-id.txt','utf8').trim()
const ARABIC_RE=/[؀-ۿݐ-ݿ]/

const pg=new Client({host:'aws-1-eu-central-1.pooler.supabase.com',port:5432,database:'postgres',user:'postgres.nmjexpuycmqcxuxljier',password:'Ali-al-ahmad2000',ssl:{rejectUnauthorized:false}})
await pg.connect()

// Fix tile — update to clean sentence directly (no meta-text)
const {rows:[tileRow]} = await pg.query("SELECT id,example_sentence FROM curriculum_vocabulary WHERE word='tile' AND regenerated_at IS NOT NULL AND example_sentence LIKE '%Here is an example%' LIMIT 1")
if(tileRow) {
  const {error} = await db.from('curriculum_vocabulary').update({
    example_sentence: 'The bathroom floor was covered with small white ceramic tiles.',
    cleanup_run_id: RUN_ID,
  }).eq('id', tileRow.id)
  console.log(error ? '❌ tile: '+error.message : '✅ tile → "The bathroom floor was covered with small white ceramic tiles."')
}

// Fix environmental sample — use a pre-crafted sentence (API keeps returning empty)
const {rows:[envRow]} = await pg.query("SELECT id FROM curriculum_vocabulary WHERE word='environmental sample' AND regenerated_at IS NULL LIMIT 1")
if(envRow) {
  const {error} = await db.from('curriculum_vocabulary').update({
    example_sentence: 'Scientists collected an environmental sample from the river to test for pollution.',
    regenerated_at: new Date().toISOString(),
    cleanup_run_id: RUN_ID,
  }).eq('id', envRow.id)
  console.log(error ? '❌ env sample: '+error.message : '✅ environmental sample → crafted sentence')
}

// Check remaining Arabic
const {rows:[{cnt}]} = await pg.query("SELECT count(*) AS cnt FROM curriculum_vocabulary WHERE example_sentence ~ '[\\u0600-\\u06FF]' AND regenerated_at IS NULL")
console.log('Remaining unfixed Arabic rows:', cnt)

await pg.end()
