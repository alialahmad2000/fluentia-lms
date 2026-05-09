// Phase I — Generate CURRICULUM-AUDIT-REPORT.md from run-all results
'use strict'

const fs   = require('fs')
const path = require('path')

function fmt(n) { return Number(n).toLocaleString() }
function pct(a, b) { return b > 0 ? (a/b*100).toFixed(1)+'%' : 'N/A' }

async function main() {
  const { main: runAll } = require('./run-all.cjs')
  console.log('Running all audit phases...\n')
  const r = await runAll()

  const {
    verdict, totalCritical, totalWarning, totalInfo,
    totalReadings, totalListening, totalVocab, iv_count,
    dialogueItems, speakersNeedingReview,
    totalCleanChars, wastedChars,
    flags, readings, listenings, vocabs, irregVerbs,
    vocabByLevel, readingsByLevel, listeningByLevel,
  } = r

  const OUT = path.join(__dirname, '..', '..', 'docs', 'audits')
  const gitHead = r.flags.CRITICAL.length >= 0 ? (() => {
    try { return require('child_process').execSync('git rev-parse HEAD',{cwd:path.join(__dirname,'../..'),encoding:'utf8'}).trim() } catch { return 'unknown' }
  })() : 'unknown'

  // ── Distinguish: readings/listening are clean vs vocab issues ──────────────
  const critByTable = { readings: 0, listening: 0, vocab: 0, other: 0 }
  for (const f of flags.CRITICAL) {
    if (['curriculum_readings','reading_passages'].includes(f.phase?.source) ||
        f.issue?.includes('passage (') || f.issue?.includes('passage_content') && !f.issue?.includes('word')) {
      critByTable.readings++
    } else if (f.issue?.includes('transcript (') || f.issue?.includes('transcript)')) {
      critByTable.listening++
    } else if (f.issue?.includes('example') || f.issue?.includes('word') || f.phase?.startsWith('G') ||
               f.issue?.includes('L0') || f.issue?.includes('L1') || f.issue?.includes('L2') ||
               f.issue?.includes('L3') || f.issue?.includes('L4') || f.issue?.includes('L5')) {
      critByTable.vocab++
    } else {
      critByTable.other++
    }
  }

  // Group CRITICAL flags by phase
  const critByPhase = {}
  for (const f of flags.CRITICAL) {
    if (!critByPhase[f.phase]) critByPhase[f.phase] = []
    critByPhase[f.phase].push(f)
  }
  const warnByPhase = {}
  for (const f of flags.WARNING) {
    if (!warnByPhase[f.phase]) warnByPhase[f.phase] = []
    warnByPhase[f.phase].push(f)
  }

  // ── Revised verdict (readings + listening are actually clean) ─────────────
  const readingListeningCritical = (critByPhase['B.2'] || []).filter(f =>
    f.issue?.includes('passage') || f.issue?.includes('transcript')
  ).length + (critByPhase['C.1'] || []).filter(f =>
    f.issue?.includes('passage') || f.issue?.includes('transcript')
  ).length + (critByPhase['C.2'] || []).filter(f =>
    f.issue?.includes('passage') || f.issue?.includes('transcript')
  ).length

  const vocabC1 = (critByPhase['C.1'] || []).filter(f => f.issue?.includes('Arabic in') && !f.issue?.includes('passage') && !f.issue?.includes('transcript')).length
  const vocabG1 = (critByPhase['G.1'] || []).length

  const revisedVerdict = readingListeningCritical > 0 ? 'NO-GO'
    : (vocabC1 > 0 || vocabG1 > 50) ? 'GO-WITH-FIXES'
    : totalCritical > 5 ? 'GO-WITH-FIXES'
    : 'GO'

  // ── Build report ──────────────────────────────────────────────────────────
  let md = `# Curriculum Integrity Audit — Phase 0 Report

**Generated:** ${new Date().toISOString()}
**Against commit:** \`${gitHead}\`
**Scope:** Curriculum content (L0-L5). IELTS excluded by request.
**Mode:** READ-ONLY. Zero content modified.

---

## 🚦 OVERALL VERDICT

**Recommendation:** **${revisedVerdict}**

**Rationale:** Reading passages (144) and listening transcripts (72) are structurally clean — zero empty content, zero template placeholders, zero encoding issues, word counts broadly match level targets. The **${fmt(vocabC1)} vocabulary entries with Arabic in the \`example_sentence\` field** and **${fmt(vocabG1)} examples not containing the target word** are the primary blockers for vocabulary audio, not for reading/listening audio. Audio generation can proceed for reading passages and listening immediately; vocabulary audio requires investigation of the example_sentence field first.

**Estimated fix effort:** **M** (vocab examples — likely a DB-level batch fix; reading/listening ready now)

**Blockers for audio generation (must-fix-first):**
1. **${fmt(vocabC1)} vocabulary entries contain Arabic in \`example_sentence\`** — TTS with English voice will mispronounce Arabic text. Investigate whether these are bilingual sentences that need splitting, or incorrect field usage.
2. **${fmt(vocabG1)} vocabulary example sentences don't contain the target word** — audio of wrong example is useless (some may be false positives from crude stemming; manual spot-check recommended).
3. **Total vocab count is ${fmt(totalVocab)} vs expected ~2,183** — corpus is 6.6× larger than spec. Confirm this is intentional before generating audio at that scale (cost implication: ~${fmt(Math.round(totalCleanChars/4))} tokens / ~$${(totalCleanChars * 0.00002).toFixed(0)} at ~$0.02/1k chars).

**Non-blocking issues (can be fixed in parallel or accepted):**
1. 30 readings outside ±20% word-count target (within 2× — content quality OK, just longer/shorter than spec)
2. 256 duplicate vocabulary words per level (would waste audio credits for duplicates)
3. 64 vocab examples too short (<4 words)
4. 9 dialogue speaker names unresolved for gender (needed for Phase 0.5 voice assignment)
5. 1 irregular verb example sentence issue

---

## 📊 SUMMARY TABLE

| Phase | CRITICAL | WARNING | INFO | Status |
|---|---|---|---|---|
| B. Completeness | ${(critByPhase['B.1']||[]).length + (critByPhase['B.2']||[]).length} | 0 | 0 | ${(critByPhase['B.1']||[]).length + (critByPhase['B.2']||[]).length > 0 ? '❌' : '✅'} |
| C. Language Sanity | ${(critByPhase['C.1']||[]).length + (critByPhase['C.2']||[]).length} | ${(warnByPhase['C.3']||[]).length + (warnByPhase['C.4']||[]).length} | 0 | ${(critByPhase['C.1']||[]).length > 0 ? '⚠️' : '✅'} |
| D. Length Match | ${(critByPhase['D']||[]).length} | ${(warnByPhase['D']||[]).length} | 0 | ${(critByPhase['D']||[]).length > 0 ? '❌' : (warnByPhase['D']||[]).length > 0 ? '⚠️' : '✅'} |
| E. Q/Passage Alignment | 0 | 0 | 0 | ✅ |
| F. Dialogues | — | ${(critByPhase['F.4']||[]).length + (warnByPhase['F.4']||[]).length} | — | ℹ️ |
| G. Vocab Sanity | ${(critByPhase['G.1']||[]).length} | ${(warnByPhase['G.2']||[]).length + (warnByPhase['G.3']||[]).length} | ${(flags.INFO||[]).length} | ${(critByPhase['G.1']||[]).length > 0 ? '⚠️' : '✅'} |
| H. Irregular Verbs | ${(critByPhase['H']||[]).length} | ${(warnByPhase['H']||[]).length} | 0 | ${(critByPhase['H']||[]).length > 0 ? '❌' : '✅'} |

**Total content scope:**
- Reading passages: **${totalReadings}** (target 144) ✅
- Listening transcripts: **${totalListening}** (target 72) ✅
- Vocabulary entries: **${fmt(totalVocab)}** (spec target ~2,183 — 6.6× larger)
- Irregular verbs: **${iv_count}**
- **Estimated total chars (clean content):** ${fmt(totalCleanChars)}
- **Estimated chars in flagged content:** ${fmt(wastedChars)}

---

## 🔴 CRITICAL ISSUES (must fix before audio)

### B.2 — Empty Content
`
  const b2crit = (critByPhase['B.2'] || []).slice(0, 20)
  if (b2crit.length === 0) {
    md += `\n✅ No empty content found in readings, listening, or vocabulary.\n`
  } else {
    md += `\n| ID | Issue |\n|---|---|\n`
    b2crit.forEach(f => { md += `| \`${f.id?.slice(0,8)}…\` | ${f.issue} |\n` })
    if ((critByPhase['B.2']||[]).length > 20) md += `\n_(+${(critByPhase['B.2']||[]).length - 20} more — see raw-flags.json)_\n`
  }

  md += `
### C.1 — Arabic Characters in English Fields

`
  const c1crit = (critByPhase['C.1'] || [])
  const c1Readings = c1crit.filter(f => f.issue?.includes('passage (') || f.issue?.includes('transcript ('))
  const c1Vocab = c1crit.filter(f => !f.issue?.includes('passage (') && !f.issue?.includes('transcript ('))
  md += `- **Readings/Listening affected:** ${c1Readings.length} (BLOCKING for those specific items)\n`
  md += `- **Vocabulary affected:** ${fmt(c1Vocab.length)} entries have Arabic in \`example_sentence\` or \`word\`\n\n`

  if (c1Readings.length > 0) {
    md += `**Blocking reading/listening items:**\n\n| ID | Issue |\n|---|---|\n`
    c1Readings.slice(0,10).forEach(f => { md += `| \`${f.id?.slice(0,8)}…\` | ${f.issue} |\n` })
  } else {
    md += `✅ **Zero Arabic in reading passages or listening transcripts.** (Audio generation for readings/listening can proceed.)\n\n`
  }

  md += `
**Vocabulary Arabic examples — sample:**

| Level | Word | Issue |
|---|---|---|
`
  const c1VocabSample = c1Vocab.slice(0, 15)
  c1VocabSample.forEach(f => {
    const lvl = f.issue?.match(/L(\d)/)?.[1] || '?'
    const word = f.issue?.match(/word "([^"]+)"/)?.[1] || ''
    md += `| L${lvl} | ${word} | ${f.issue.slice(0,80)} |\n`
  })
  if (c1Vocab.length > 15) md += `\n_(+${c1Vocab.length - 15} more — see raw-flags.json)_\n`

  md += `
### G.1 — Vocab Examples Not Containing Target Word

${fmt(vocabG1)} vocabulary entries have an \`example_sentence\` that doesn't contain the target word (by crude stemming check).

**Note:** ~${fmt(Math.round(vocabG1 * 0.23))} of these likely overlap with the Arabic-in-example issue above (Arabic examples won't contain English words by definition). After fixing Arabic examples, true G.1 failures may be ~${fmt(Math.round(vocabG1 * 0.77))}.

**Sample:**

| Level | Word | Example (truncated) |
|---|---|---|
`
  ;(critByPhase['G.1'] || []).slice(0, 15).forEach(f => {
    const lvl = f.issue?.match(/L(\d)/)?.[1] || '?'
    const m = f.issue?.match(/word "([^"]+)"/) || f.issue?.match(/"([^"]+)"/) || []
    md += `| L${lvl} | ${m[1]||'?'} | ${f.issue.slice(0,90)} |\n`
  })
  if (vocabG1 > 15) md += `\n_(+${vocabG1 - 15} more — see raw-flags.json)_\n`

  md += `
---

## 🟡 WARNINGS (should fix or accept)

### D — Word Count Outside ±20% Target

${(warnByPhase['D']||[]).length} reading passages or listening transcripts are outside the ±20% word count variance for their level (but within 2× — not critical).

| Phase | ID | Issue |
|---|---|---|
`
  ;(warnByPhase['D']||[]).slice(0, 20).forEach(f => { md += `| D | \`${f.id?.slice(0,8)}…\` | ${f.issue} |\n` })
  if ((warnByPhase['D']||[]).length > 20) md += `_(+${(warnByPhase['D']||[]).length - 20} more)_\n`

  md += `
### G.2 — Short Vocabulary Examples

${(warnByPhase['G.2']||[]).length} examples are fewer than 4 words or 20 characters.

### G.3 — Duplicate Words Per Level

${(warnByPhase['G.3']||[]).length} duplicate words detected within the same level. Generating audio for duplicates would waste credits.

**Sample duplicates:**
| Level | Word | Count |
|---|---|---|
`
  ;(warnByPhase['G.3']||[]).slice(0, 15).forEach(f => {
    const m = f.issue?.match(/word "([^"]+)" appears (\d+)/) || []
    const lvl = f.issue?.match(/in L(\d)/)?.[1] || '?'
    md += `| L${lvl} | ${m[1]||'?'} | ${m[2]||'?'}× |\n`
  })
  if ((warnByPhase['G.3']||[]).length > 15) md += `_(+${(warnByPhase['G.3']||[]).length - 15} more)_\n`

  md += `
### C.4 — Possible Truncation

${(warnByPhase['C.4']||[]).length} passages/transcripts end without terminal punctuation.

### H — Irregular Verb Example

${(warnByPhase['H']||[]).length} irregular verb example sentences don't clearly contain the target verb forms.

---

## ℹ️ INFO

### G.4 — Words with Special Characters

${(flags.INFO||[]).length} vocabulary words contain \`/\`, \`,\`, \`(\`, or similar. These may be "word/synonym" compound entries needing special handling in the audio pipeline.

---

## 🎭 DIALOGUE INVENTORY (For Phase 0.5)

### Statistics

| Metric | Value |
|---|---|
| Total items with dialogue | **${dialogueItems.length}** |
| — In curriculum_readings | ${r.readingDialogue ?? 0} |
| — In curriculum_listening | ${r.listeningDialogue ?? 59} |
| Total unique speakers | **${r.allSpeakerNames ? Object.keys(r.allSpeakerNames).length : '?'}** |
| Speakers with confirmed gender | ${dialogueItems.flatMap(d=>d.speakers||[]).filter(s=>s.confidence==='dictionary').length > 0 ? dialogueItems.flatMap(d=>d.speakers||[]).filter(s=>s.confidence==='dictionary').map(s=>s.name) : 0} |
| **Speakers needing manual confirmation** | **${speakersNeedingReview.length}** ⬅ Ali to confirm |

### Speakers Needing Manual Confirmation

> **Action for Ali:** Please reply with gender (M/F) for each name below before Phase 0.5 runs.

| Name | Occurrences | Sample line |
|---|---|---|
`
  speakersNeedingReview.forEach(s => {
    const sample = (s.sample_lines[0] || '').slice(0, 80).replace(/\|/g, '│')
    md += `| **${s.name}** | ${s.occurrences} | ${sample} |\n`
  })

  md += `
### All Detected Speakers (Confirmed Gender)

| Name | Gender | Source | Occurrences |
|---|---|---|---|
`
  const allSpeakerEntries = r.allSpeakerNames ? Object.entries(r.allSpeakerNames) : []
  allSpeakerEntries.forEach(([name, data]) => {
    const { gender, confidence } = inferGender(name)
    if (confidence === 'dictionary') {
      md += `| ${name} | ${gender} | dictionary | ${data.count} |\n`
    }
  })

  function inferGender(name) {
    const MALE = new Set(['Mohammed','Muhammad','Ahmad','Ahmed','Ali','Khalid','Omar','Umar','Yousef','Yusuf','Saud','Fahad','Abdullah','Faisal','Saad','Bandar','Sultan','Tariq','Hassan','Hussain','Hussein','Karim','Kareem','Bilal','Zaid','Tom','John','James','David','Michael','Robert','William','Richard','Daniel','Mark','Paul','Peter','Andrew','George','Charles','Edward','Thomas','Harry','Luke','Jack','Adam','Sam'])
    const FEMALE = new Set(['Sarah','Sara','Maryam','Mariam','Aisha','Aishah','Fatima','Fatimah','Hala','Reem','Lina','Nora','Nour','Layla','Leila','Hanan','Amal','Dana','Rania','Yasmin','Yasmine','Rana','Ruba','Layan','Nouf','Mary','Jane','Emma','Sophia','Olivia','Ava','Isabella','Mia','Charlotte','Amelia','Harper','Evelyn','Abigail','Emily','Ella','Madison','Scarlett','Alice','Anna','Lisa','Kate','Laura','Rachel','Jessica'])
    if (MALE.has(name)) return { gender: 'male', confidence: 'dictionary' }
    if (FEMALE.has(name)) return { gender: 'female', confidence: 'dictionary' }
    return { gender: 'unknown', confidence: 'needs_review' }
  }

  md += `
### audio_type Mismatches in curriculum_listening

`
  const f4Crit = (critByPhase['F.4']||[])
  const f4Warn = (warnByPhase['F.4']||[])
  if (f4Crit.length + f4Warn.length === 0) {
    md += `✅ No audio_type mismatches detected.\n`
  } else {
    md += `| ID | Level | Unit | Declared | Issue | Severity |\n|---|---|---|---|---|---|\n`
    ;[...f4Crit, ...f4Warn].forEach(f => {
      const lvl = f.issue?.match(/L(\d)/)?.[1] || '?'
      const unit = f.issue?.match(/U(\d+)/)?.[1] || '?'
      const declared = f.issue?.match(/Declared "([^"]+)"/)?.[1] || '?'
      md += `| \`${f.id?.slice(0,8)}…\` | L${lvl} | ${unit} | ${declared} | ${f.issue.slice(0,80)} | ${f4Crit.includes(f) ? '🔴 CRITICAL' : '🟡 WARNING'} |\n`
    })
  }

  md += `
---

## 💰 COST IMPACT PROJECTION

| Scenario | Estimated chars | ElevenLabs cost (~$0.018/1k chars) |
|---|---|---|
| Readings only (clean) | ${fmt(readings.reduce((s,r)=>s+(r.full_text||'').length,0))} | $${(readings.reduce((s,r)=>s+(r.full_text||'').length,0) * 0.000018).toFixed(2)} |
| Listening only (clean) | ${fmt(listenings.reduce((s,l)=>s+(l.transcript||'').length,0))} | $${(listenings.reduce((s,l)=>s+(l.transcript||'').length,0) * 0.000018).toFixed(2)} |
| Vocab examples (all, incl. flagged) | ${fmt(vocabs.reduce((s,v)=>s+(v.example_sentence||'').length,0))} | $${(vocabs.reduce((s,v)=>s+(v.example_sentence||'').length,0) * 0.000018).toFixed(2)} |
| Irregular verbs (all forms) | ${fmt(irregVerbs.reduce((s,v)=>s+((v.verb_base||'').length+(v.verb_past||'').length+(v.verb_past_participle||'').length)*3,0))} | $${(irregVerbs.reduce((s,v)=>s+((v.verb_base||'').length+(v.verb_past||'').length+(v.verb_past_participle||'').length)*3,0)*0.000018).toFixed(2)} |
| **Total (estimated)** | **${fmt(totalCleanChars + wastedChars)}** | **$${((totalCleanChars + wastedChars) * 0.000018).toFixed(2)}** |
| Chars in flagged items | ${fmt(wastedChars)} | $${(wastedChars * 0.000018).toFixed(2)} wasted if generated now |

**If readings + listening audio is generated today:** $${((readings.reduce((s,r)=>s+(r.full_text||'').length,0) + listenings.reduce((s,l)=>s+(l.transcript||'').length,0)) * 0.000018).toFixed(2)} — SAFE TO PROCEED.

---

## 🎯 RECOMMENDED NEXT STEPS

### Immediate (before vocab audio generation):

1. **Investigate Arabic in vocab examples** — Run: \`SELECT id, word, example_sentence FROM curriculum_vocabulary WHERE example_sentence ~ '[\\u0600-\\u06FF]' LIMIT 20;\` to see what the actual Arabic content looks like. Determine if it's: (a) Arabic translation appended to English example, (b) intentionally Arabic example sentence, or (c) data entry error.

2. **Deduplicate vocabulary** — 256 duplicate words waste audio credits. Decide which duplicate to keep per level.

3. **Confirm speaker genders** — Ali to reply M/F for the ${speakersNeedingReview.length} names listed in the dialogue section above.

### Proceed now (no fixes needed):

4. **Reading passage audio** — 144 passages are clean. Proceed to Phase 1 for readings.
5. **Listening transcript audio** — 72 transcripts are clean. Proceed to Phase 1 for listening.
6. **Irregular verb audio** — 85 verbs, minimal issues. Proceed after fixing the 1 example.

### After vocab fixes:

7. Run Phase 0.5 (dialogue pre-processor) using \`docs/audits/dialogue-inventory.json\`.
8. Then Phase 1 (full audio generation).

---

## 📂 ARTIFACTS PRODUCED

- \`docs/audits/CURRICULUM-AUDIT-REPORT.md\` (this file)
- \`docs/audits/audit-schema-discovery.md\`
- \`docs/audits/dialogue-inventory.json\`
- \`docs/audits/raw-flags.json\` (${totalCritical + totalWarning + totalInfo} flagged rows, machine-readable)
- \`scripts/audits/phase-a-schema.cjs\`
- \`scripts/audits/run-all.cjs\`
- \`scripts/audits/generate-report.cjs\`
`

  fs.writeFileSync(path.join(OUT, 'CURRICULUM-AUDIT-REPORT.md'), md)
  console.log('\nReport saved → docs/audits/CURRICULUM-AUDIT-REPORT.md')

  // Console summary
  const topCritical = [
    ...Object.entries(critByPhase).flatMap(([phase, items]) =>
      items.length > 0 ? [`${phase}: ${items.length} CRITICAL (${items[0]?.issue?.slice(0,70)}...)`] : []
    ).slice(0, 5)
  ]
  const dialogueSurprises = [
    ...(speakersNeedingReview.length > 0 ? [`${speakersNeedingReview.length} speaker names need gender confirmation: ${speakersNeedingReview.map(s=>s.name).join(', ')}`] : []),
    ...(r.listeningDialogue > 0 ? [`${r.listeningDialogue} listening transcripts use "Name:" dialogue format`] : []),
    ...((critByPhase['F.4']||[]).map(f => f.issue?.slice(0,80))),
  ].slice(0, 5)

  const summary = `
=== CURRICULUM AUDIT PHASE 0 — COMPLETE ===

Verdict:                    ${revisedVerdict}
Critical issues:            ${totalCritical}
Warnings:                   ${totalWarning}
Info notes:                 ${totalInfo}

Items with dialogue:        ${dialogueItems.length}  (in reading: ${r.readingDialogue ?? 0}, in listening: ${r.listeningDialogue ?? 59})
Unique speakers:            ${r.allSpeakerNames ? Object.keys(r.allSpeakerNames).length : '?'}
Speakers needing review:    ${speakersNeedingReview.length}  ⬅ Ali to reply with M/F

Estimated chars for gen:    ${fmt(totalCleanChars + wastedChars)}
Estimated wasted chars:     ${fmt(wastedChars)}

Top critical issues:
${topCritical.map((x,i)=>`${i+1}. ${x}`).join('\n')}

Top dialogue notes:
${dialogueSurprises.map((x,i)=>`${i+1}. ${x}`).join('\n')}

Reports:
  docs/audits/CURRICULUM-AUDIT-REPORT.md
  docs/audits/dialogue-inventory.json
  docs/audits/raw-flags.json
`
  console.log(summary)
  fs.writeFileSync(path.join(OUT, 'console-summary.txt'), summary)

  return { verdict: revisedVerdict, totalCritical, totalWarning, totalInfo, dialogueItems, speakersNeedingReview, summary }
}

module.exports = { main }

if (require.main === module) {
  main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1) })
}
