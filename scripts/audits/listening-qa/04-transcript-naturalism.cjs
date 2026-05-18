// Score every transcript for AI-flavored markers. Produce a flagged list ONLY.
// Never auto-rewrite — content decisions belong to the user.

const fs = require('fs')

const INVENTORY = JSON.parse(fs.readFileSync('docs/audits/listening-qa/inventory.json', 'utf8'))

// === SCORING HEURISTICS ===

function splitTurns(transcript, speakerSegments) {
  // If we have speaker_segments with text, use those
  if (Array.isArray(speakerSegments) && speakerSegments.length && speakerSegments[0]?.text) {
    return speakerSegments.map(s => ({ speaker: s.speaker || s.speaker_name || 'Speaker', text: s.text }))
  }
  // Otherwise split on "Speaker:" patterns in transcript
  if (!transcript) return []
  const lines = transcript.split(/\n+/).filter(Boolean)
  const turns = []
  for (const line of lines) {
    const m = line.match(/^([A-Z][A-Za-z. ]{1,40}?):\s*(.+)$/)
    if (m) turns.push({ speaker: m[1].trim(), text: m[2].trim() })
    else if (turns.length) turns[turns.length - 1].text += ' ' + line.trim()
    else turns.push({ speaker: 'Speaker', text: line.trim() })
  }
  return turns
}

function scoreTranscript(transcript, speakerSegments) {
  const turns = splitTurns(transcript, speakerSegments)
  const markers = []
  let score = 0

  if (turns.length === 0) return { score: 0, markers: [], turns: 0 }

  // 1. Excessive vocatives — line opens with addressee name
  // Look for "Dr. X," "X," at start of each turn
  let vocativeOpens = 0
  for (const t of turns) {
    if (/^(Dr\.|Mr\.|Ms\.|Mrs\.|Professor)\s*[A-Z][a-zA-Z]+,/.test(t.text) || /^[A-Z][a-z]+,\s/.test(t.text)) {
      vocativeOpens++
    }
  }
  if (vocativeOpens >= Math.max(3, turns.length * 0.4)) {
    markers.push('excessive_vocatives')
    score += 3
  }

  // 2. Acknowledgment chains — "Thank you for..." / "I agree with you" / "That's a great point"
  const ackPatterns = [
    /\bthank you for\b/i,
    /\bI agree with (you|that)\b/i,
    /\bthat'?s? a (great|wonderful|excellent|fantastic) (point|question|insight)/i,
    /\bgreat (point|question)\b/i,
    /\bexcellent (point|question)\b/i,
  ]
  let ackHits = 0
  for (const t of turns) {
    for (const p of ackPatterns) if (p.test(t.text)) { ackHits++; break }
  }
  if (ackHits >= Math.max(2, turns.length * 0.25)) {
    markers.push('acknowledgment_chains')
    score += 2
  }

  // 3. Robotic turn-taking — absence of disfluencies
  const disfluencies = /\b(uh|um|hmm|well|you know|like|sort of|kind of|I mean|right\?)\b/i
  let dfHits = 0
  for (const t of turns) if (disfluencies.test(t.text)) dfHits++
  if (turns.length >= 6 && dfHits === 0) {
    markers.push('no_disfluencies')
    score += 2
  }

  // 4. AI disclaimer leaks
  const text = turns.map(t => t.text).join(' ')
  if (/\bas an AI\b/i.test(text) || /\baccording to my training\b/i.test(text) || /\bI'm here to help\b/i.test(text) || /\bI'm just a language model\b/i.test(text)) {
    markers.push('ai_disclaimer_leak')
    score += 5
  }

  // 5. Over-explanation — long sentences explaining the obvious
  // Heuristic: avg sentence length > 30 words
  const sents = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const avgSentLen = sents.length ? sents.reduce((a, s) => a + s.trim().split(/\s+/).length, 0) / sents.length : 0
  if (avgSentLen > 30 && turns.length >= 4) {
    markers.push('over_explanation')
    score += 1
  }

  // 6. Hedge stacking — "I think that, perhaps, maybe, possibly" close together
  if (/\b(perhaps|maybe|possibly)\b.*\b(perhaps|maybe|possibly)\b/i.test(text)) {
    markers.push('hedge_stacking')
    score += 1
  }

  // 7. Title-name overuse — "Doctor X" / "Dr. X" used 3+ times
  const drMatches = text.match(/\b(Dr\.|Doctor|Professor)\s+[A-Z][a-z]+/g) || []
  if (drMatches.length >= 4) {
    markers.push('title_name_overuse')
    score += 2
  }

  // 8. Symmetric exchanges — turns alternating with very similar lengths
  if (turns.length >= 4) {
    const lens = turns.map(t => t.text.split(/\s+/).length)
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length
    const stddev = Math.sqrt(variance)
    if (mean > 0 && stddev / mean < 0.25 && turns.length >= 6) {
      markers.push('symmetric_exchanges')
      score += 1
    }
  }

  // 9. Absent contractions
  // Look for "I am" / "do not" / "will not" / "cannot" / "it is" while almost no "I'm" / "don't" / "won't" / "it's"
  const formalForms = (text.match(/\b(I am|do not|does not|did not|will not|cannot|it is|that is|they are|we are|you are|he is|she is)\b/gi) || []).length
  const contractions = (text.match(/\b(I'm|don't|doesn't|didn't|won't|can't|it's|that's|they're|we're|you're|he's|she's)\b/gi) || []).length
  if (formalForms >= 4 && contractions < formalForms * 0.5) {
    markers.push('absent_contractions')
    score += 1
  }

  // 10. Reciprocal gratitude — "thank you" → "you're welcome" / "thank you for your..."
  if (/\bthank you\b/i.test(text) && /\b(you'?re welcome|my pleasure)\b/i.test(text)) {
    markers.push('reciprocal_gratitude')
    score += 2
  }

  return { score, markers, turns: turns.length, avg_sent_len: Math.round(avgSentLen) }
}

function verdictFor(score) {
  if (score >= 8) return 'REGENERATE'
  if (score >= 4) return 'REVIEW'
  return 'OK'
}

const out = { total_rows: 0, ok: 0, review: 0, regenerate: 0, flagged: [], by_severity: { REGENERATE: [], REVIEW: [], OK: [] } }
for (const row of INVENTORY) {
  out.total_rows++
  const { score, markers, turns, avg_sent_len } = scoreTranscript(row.transcript, row.speaker_segments)
  const verdict = verdictFor(score)
  if (verdict === 'OK') out.ok++
  else if (verdict === 'REVIEW') out.review++
  else out.regenerate++

  const entry = {
    id: row.id,
    title_ar: row.title_ar,
    audio_type: row.audio_type,
    score,
    markers,
    turns,
    avg_sent_len,
    transcript_excerpt: (row.transcript || '').slice(0, 240),
    verdict,
  }
  if (verdict !== 'OK') out.flagged.push(entry)
  out.by_severity[verdict].push(entry)
}

fs.writeFileSync('docs/audits/listening-qa/transcript-naturalism.json', JSON.stringify(out, null, 2))

// Markdown summary
let md = '# Transcript Naturalism — Flagged List (2026-05-19)\n\n'
md += 'No transcripts were auto-rewritten. Decision belongs to the user.\n\n'
md += `## Summary\n- **Total rows scored:** ${out.total_rows}\n- **OK (score 0-3):** ${out.ok}\n- **REVIEW (score 4-7):** ${out.review}\n- **REGENERATE (score 8+):** ${out.regenerate}\n\n`

if (out.by_severity.REGENERATE.length) {
  md += `## REGENERATE — score 8+ (${out.by_severity.REGENERATE.length})\n\n`
  for (const r of out.by_severity.REGENERATE.sort((a, b) => b.score - a.score)) {
    md += `### \`${r.id}\` — ${r.title_ar || '(no title)'}\n`
    md += `- Type: ${r.audio_type} · Turns: ${r.turns} · Avg sent len: ${r.avg_sent_len}\n`
    md += `- Score: **${r.score}** · Markers: ${r.markers.join(', ') || '(none)'}\n`
    md += `- Excerpt: > ${r.transcript_excerpt.replace(/\n/g, ' ')}\n\n`
  }
}

if (out.by_severity.REVIEW.length) {
  md += `## REVIEW — score 4-7 (${out.by_severity.REVIEW.length})\n\n`
  for (const r of out.by_severity.REVIEW.sort((a, b) => b.score - a.score)) {
    md += `- \`${r.id.slice(0, 8)}\` — ${r.title_ar?.slice(0, 60) || '(no title)'} · score=${r.score} · markers=[${r.markers.join(', ')}]\n`
  }
  md += '\n'
}

if (out.by_severity.OK.length) {
  md += `## OK — score 0-3 (${out.by_severity.OK.length})\n\n`
  md += `${out.by_severity.OK.length} rows passed without issue.\n`
}

fs.writeFileSync('docs/audits/listening-qa/transcript-naturalism.md', md)

console.log(`Total: ${out.total_rows}, OK: ${out.ok}, Review: ${out.review}, Regenerate: ${out.regenerate}`)
console.log('Wrote transcript-naturalism.json and transcript-naturalism.md')
