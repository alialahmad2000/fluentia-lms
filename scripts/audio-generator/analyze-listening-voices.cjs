/**
 * Analyze all 72 curriculum listening transcripts.
 * Parse speakers, detect gender, assign ElevenLabs voices.
 * Output: scripts/audio-generator/listening-voice-map.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sb = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Voice definitions ──────────────────────────────────
const VOICES = {
  Alice:   { id: 'Xb7hH8MSUJpSbSDYk0k2', gender: 'female' },
  George:  { id: 'JBFqnCBsd6RMkjVDRZzb', gender: 'male'   },
  Daniel:  { id: 'onwK4e9ZLuTAKqWW03F9', gender: 'male'   },
  Matilda: { id: 'XrExE9yKIg1WjnnlVkGX', gender: 'female' },
};

// ── Gender detection ───────────────────────────────────
const FEMALE_NAMES = new Set([
  'nadia','fatima','sara','layla','mona','huda','noura','reem','lina','amira',
  'hana','mariam','aisha','dalal','ghada','manal','wafa','yara','dina','samira',
  'emma','sarah','lisa','anna','kate','mary','jane','helen','claire','rachel',
  'leila','maya','sana','noor','asma','lubna','maha','rana','suha','zara',
  'sophia','olivia','emily','lily','mia','ella','rosa','nancy','julia','diana',
  'carmen','nina','elena','maria','dr. amira','dr. sara','dr. layla','dr. nadia',
  'dr. fatima','dr. huda','dr. noura','dr. mona','dr. lina','dr. reem',
  'prof. amira','prof. sara','prof. layla','khadija','salma','roqaya',
  'nora','amanda','chen','amara','amina','mitchell',
  'presenter','host',
]);

const MALE_NAMES = new Set([
  'ahmed','omar','khalid','mohammed','ali','hassan','tariq','nasser','faisal',
  'saeed','majid','sultan','rami','waleed','fahad','saleh','ibrahim','yousef',
  'hamza','jamal','john','david','mark','james','tom','mike','robert','chris',
  'alex','daniel','dr. ahmed','dr. omar','dr. khalid','dr. mohammed','dr. ali',
  'dr. hassan','dr. faisal','prof. ahmed','prof. omar','prof. khalid',
  'abdullah','badr','mansour','turki','saud','nawaf','bandar','mishal',
  'rashid','kassim','khalil','rahman','ahmad','martinez',
  'narrator',
]);

function detectGender(name) {
  const lower = name.toLowerCase().trim();
  // Strip parenthetical roles: "Ahmed (host)" → "ahmed"
  const clean = lower.replace(/\s*\(.*?\)\s*/g, '').trim();
  if (FEMALE_NAMES.has(clean)) return 'female';
  if (MALE_NAMES.has(clean)) return 'male';

  const parts = clean.split(/\s+/);
  // Check every word individually against both lists
  // For "Dr. Sarah Chen" → check "dr.", "sarah", "chen"
  // For "Professor Ahmad Al-Rashid" → check "professor", "ahmad", "al-rashid"
  for (const part of parts) {
    const p = part.replace(/[.\-']/g, '');
    if (FEMALE_NAMES.has(p)) return 'female';
    if (MALE_NAMES.has(p)) return 'male';
  }
  // Also try "dr. firstname" or "prof. firstname" combos
  if (parts.length >= 2) {
    const combo = parts[0] + ' ' + parts[1];
    if (FEMALE_NAMES.has(combo)) return 'female';
    if (MALE_NAMES.has(combo)) return 'male';
  }
  // "Interviewer" / "Host" → female by convention (Alice)
  if (clean === 'interviewer' || clean === 'host') return 'female';
  return 'unknown'; // will default to male
}

// ── Parse transcript into speaker segments ─────────────
// Words that disqualify a match from being a speaker label
const NOT_SPEAKER_WORDS = /\b(this|that|these|those|what|when|where|which|who|how|the|with|from|about|into|over|under|between|through|during|before|after|because|since|while|until|unless|although|however|therefore|furthermore|moreover|indeed|certainly|ultimately|actually|basically|essentially|fundamentally|question|scenario|aspect|point|example|conclusion|research|study|analysis|evidence|approach|perspective)\b/i;

function isValidSpeakerName(name) {
  if (!name) return false;
  // Max 45 chars for a speaker name (covers "Professor Ahmad Al-Rashid")
  if (name.length > 45) return false;
  // Max 5 words
  if (name.trim().split(/\s+/).length > 5) return false;
  // Must not contain sentence-like words
  if (NOT_SPEAKER_WORDS.test(name)) return false;
  // Must not start with common sentence starters
  if (/^(Let|But|And|So|Or|If|As|In|On|At|By|To|For|It|We|He|She|They|You|I|My|Our|His|Her|Its|The|This|That|Now|Well|Yes|No|Consider|Remember|Think|Notice|Imagine)\b/i.test(name)) return false;
  return true;
}

function parseTranscript(transcript, audioType) {
  if (!transcript || !transcript.trim()) return [];

  // Pattern: "Name:" or "Name (role):" at start of line or after newline
  // Covers: "Ahmed:", "Sara (host):", "Dr. Khalid:", "Professor Ahmad Al-Rashid:"
  const speakerPattern = /^([A-Z][A-Za-z.\- ']+(?:\s*\([^)]+\))?)\s*:\s*/gm;

  const segments = [];
  let lastIndex = 0;
  let lastSpeaker = null;
  let match;

  // Collect all speaker markers, filtering out false positives
  const markers = [];
  const regex = new RegExp(speakerPattern.source, 'gm');
  while ((match = regex.exec(transcript)) !== null) {
    const candidate = match[1].trim();
    if (isValidSpeakerName(candidate)) {
      markers.push({
        speaker: candidate,
        textStart: match.index + match[0].length,
        matchStart: match.index,
      });
    }
  }

  if (markers.length === 0) {
    // No speaker labels found — treat as single narrator
    return [{
      speaker_name: 'Narrator',
      text: transcript.trim(),
      char_count: transcript.trim().length,
      order: 1,
    }];
  }

  // Build segments from markers
  for (let i = 0; i < markers.length; i++) {
    const current = markers[i];
    const nextStart = i + 1 < markers.length ? markers[i + 1].matchStart : transcript.length;
    const text = transcript.slice(current.textStart, nextStart).trim();

    if (text.length > 0) {
      segments.push({
        speaker_name: current.speaker,
        text,
        char_count: text.length,
        order: segments.length + 1,
      });
    }
  }

  // If there's text BEFORE the first speaker label, prepend as Narrator
  if (markers.length > 0 && markers[0].matchStart > 0) {
    const preText = transcript.slice(0, markers[0].matchStart).trim();
    if (preText.length > 10) {
      segments.unshift({
        speaker_name: 'Narrator',
        text: preText,
        char_count: preText.length,
        order: 0,
      });
      // Reorder
      segments.forEach((s, i) => s.order = i + 1);
    }
  }

  return segments;
}

// ── Assign voices to segments ──────────────────────────
function assignVoices(segments, audioType) {
  // Collect unique speakers in order of appearance
  const seenSpeakers = [];
  for (const seg of segments) {
    if (!seenSpeakers.includes(seg.speaker_name)) {
      seenSpeakers.push(seg.speaker_name);
    }
  }

  // Single speaker → Alice
  if (seenSpeakers.length <= 1 || audioType === 'monologue' || audioType === 'lecture') {
    for (const seg of segments) {
      seg.voice = 'Alice';
      seg.voice_id = VOICES.Alice.id;
    }
    return;
  }

  // Detect genders
  const speakerGenders = {};
  for (const name of seenSpeakers) {
    speakerGenders[name] = detectGender(name);
  }

  // Assign voices based on gender composition
  const females = seenSpeakers.filter(n => speakerGenders[n] === 'female');
  const males = seenSpeakers.filter(n => speakerGenders[n] === 'male');
  const unknowns = seenSpeakers.filter(n => speakerGenders[n] === 'unknown');

  const voiceAssignment = {};

  if (seenSpeakers.length === 2) {
    const [s1, s2] = seenSpeakers;
    const g1 = speakerGenders[s1];
    const g2 = speakerGenders[s2];

    if ((g1 === 'female' || g1 === 'unknown') && (g2 === 'male' || g2 === 'unknown') && g1 !== g2) {
      // female + male
      voiceAssignment[s1] = 'Alice';
      voiceAssignment[s2] = 'George';
    } else if ((g1 === 'male' || g1 === 'unknown') && (g2 === 'female')) {
      // male + female
      voiceAssignment[s1] = 'George';
      voiceAssignment[s2] = 'Alice';
    } else if (g1 === 'female' && g2 === 'female') {
      voiceAssignment[s1] = 'Alice';
      voiceAssignment[s2] = 'Matilda';
    } else if (g1 === 'male' && g2 === 'male') {
      voiceAssignment[s1] = 'George';
      voiceAssignment[s2] = 'Daniel';
    } else {
      // Both unknown or same — default male+female
      voiceAssignment[s1] = 'Alice';
      voiceAssignment[s2] = 'George';
    }
  } else {
    // 3+ speakers — rotate through voices by gender
    const femaleVoices = ['Alice', 'Matilda'];
    const maleVoices = ['George', 'Daniel'];
    let fi = 0, mi = 0;

    for (const name of seenSpeakers) {
      const g = speakerGenders[name];
      if (g === 'female') {
        voiceAssignment[name] = femaleVoices[fi % femaleVoices.length];
        fi++;
      } else {
        // male or unknown → male voice
        voiceAssignment[name] = maleVoices[mi % maleVoices.length];
        mi++;
      }
    }
  }

  // Apply to segments
  for (const seg of segments) {
    const voice = voiceAssignment[seg.speaker_name] || 'Alice';
    seg.voice = voice;
    seg.voice_id = VOICES[voice].id;
  }
}

// ── Main ───────────────────────────────────────────────
async function main() {
  console.log('=== Listening Voice Map Analyzer ===\n');

  // Fetch all listening items with joins
  const { data: items, error } = await sb
    .from('curriculum_listening')
    .select('id, unit_id, audio_type, title_en, transcript, curriculum_units!inner(unit_number, level_id, curriculum_levels!inner(level_number, name_ar))')
    .order('created_at');

  if (error) {
    console.error('Query error:', error.message);
    process.exit(1);
  }

  console.log(`Fetched ${items.length} listening items\n`);

  // Sort by level then unit
  items.sort((a, b) => {
    const la = a.curriculum_units.curriculum_levels.level_number;
    const lb = b.curriculum_units.curriculum_levels.level_number;
    if (la !== lb) return la - lb;
    return a.curriculum_units.unit_number - b.curriculum_units.unit_number;
  });

  const allSpeakers = new Set();
  const femaleNames = new Set();
  const maleNames = new Set();
  const ambiguousNames = new Set();
  const issues = [];
  const voiceChars = { Alice: 0, George: 0, Daniel: 0, Matilda: 0 };
  let totalSegments = 0;
  let maxSegments = 0;
  let maxSegItem = '';
  const perLevel = {};

  const outputItems = [];

  for (const item of items) {
    const levelNum = item.curriculum_units.curriculum_levels.level_number;
    const unitNum = item.curriculum_units.unit_number;

    // Parse
    const segments = parseTranscript(item.transcript, item.audio_type);

    if (segments.length === 0) {
      issues.push(`L${levelNum} U${unitNum} "${item.title_en}" — empty transcript`);
      continue;
    }

    // Assign voices
    assignVoices(segments, item.audio_type);

    // Track speakers
    const uniqueSpeakers = [...new Set(segments.map(s => s.speaker_name))];
    for (const name of uniqueSpeakers) {
      allSpeakers.add(name);
      const g = detectGender(name);
      if (g === 'female') femaleNames.add(name);
      else if (g === 'male') maleNames.add(name);
      else ambiguousNames.add(name);
    }

    // Track voice chars
    for (const seg of segments) {
      voiceChars[seg.voice] = (voiceChars[seg.voice] || 0) + seg.char_count;
    }

    // Track segments
    totalSegments += segments.length;
    if (segments.length > maxSegments) {
      maxSegments = segments.length;
      maxSegItem = `L${levelNum} U${unitNum} "${item.title_en}"`;
    }

    // Per level
    if (!perLevel[levelNum]) perLevel[levelNum] = { items: 0, segments: 0, chars: 0 };
    perLevel[levelNum].items++;
    perLevel[levelNum].segments += segments.length;
    perLevel[levelNum].chars += segments.reduce((s, seg) => s + seg.char_count, 0);

    // Issues: dialogue/interview with only 1 speaker parsed
    if ((item.audio_type === 'dialogue' || item.audio_type === 'interview') && uniqueSpeakers.length < 2) {
      issues.push(`L${levelNum} U${unitNum} "${item.title_en}" (${item.audio_type}) — only ${uniqueSpeakers.length} speaker parsed: [${uniqueSpeakers.join(', ')}]`);
    }
    if (uniqueSpeakers.length >= 4) {
      issues.push(`L${levelNum} U${unitNum} "${item.title_en}" — ${uniqueSpeakers.length} speakers: [${uniqueSpeakers.join(', ')}]`);
    }

    outputItems.push({
      id: item.id,
      level: levelNum,
      unit: unitNum,
      title: item.title_en,
      audio_type: item.audio_type,
      total_chars: segments.reduce((s, seg) => s + seg.char_count, 0),
      speaker_count: uniqueSpeakers.length,
      segments: segments.map(s => ({
        speaker_name: s.speaker_name,
        voice: s.voice,
        voice_id: s.voice_id,
        text: s.text,
        char_count: s.char_count,
        order: s.order,
      })),
    });
  }

  const totalChars = Object.values(voiceChars).reduce((a, b) => a + b, 0);

  // Month split: levels 0-2 = month1, levels 3-5 = month2
  let month1 = 0, month2 = 0;
  for (const item of outputItems) {
    if (item.level <= 2) month1 += item.total_chars;
    else month2 += item.total_chars;
  }

  const multiVoiceItems = outputItems.filter(i => i.speaker_count > 1).length;
  const singleVoiceItems = outputItems.filter(i => i.speaker_count <= 1).length;
  const avgSegPerMulti = multiVoiceItems > 0
    ? (outputItems.filter(i => i.speaker_count > 1).reduce((s, i) => s + i.segments.length, 0) / multiVoiceItems).toFixed(1)
    : 0;

  // Build output JSON
  const output = {
    generated_at: new Date().toISOString(),
    total_items: outputItems.length,
    total_characters: totalChars,
    month1_characters: month1,
    month2_characters: month2,
    voices_used: {
      Alice:   { id: VOICES.Alice.id,   total_chars: voiceChars.Alice   },
      George:  { id: VOICES.George.id,  total_chars: voiceChars.George  },
      Daniel:  { id: VOICES.Daniel.id,  total_chars: voiceChars.Daniel  },
      Matilda: { id: VOICES.Matilda.id, total_chars: voiceChars.Matilda },
    },
    items: outputItems,
  };

  const outPath = path.join(__dirname, 'listening-voice-map.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  // ── Print summary ──────────────────────────────────
  console.log('=== LISTENING VOICE MAP — SUMMARY ===\n');
  console.log('TOTALS:');
  console.log(`- ${outputItems.length} items analyzed`);
  console.log(`- ${outputItems.filter(i => i.audio_type === 'monologue').length} monologues (Alice only)`);
  console.log(`- ${outputItems.filter(i => i.audio_type === 'dialogue').length} dialogues (multi-voice)`);
  console.log(`- ${outputItems.filter(i => i.audio_type === 'interview').length} interviews (multi-voice)`);
  console.log(`- ${outputItems.filter(i => i.audio_type === 'lecture').length} lectures (Alice only)`);

  console.log(`\nUNIQUE SPEAKERS FOUND: ${allSpeakers.size}`);
  console.log(`- Female names: ${[...femaleNames].sort().join(', ')}`);
  console.log(`- Male names: ${[...maleNames].sort().join(', ')}`);
  if (ambiguousNames.size > 0) console.log(`- Ambiguous (defaulted to male): ${[...ambiguousNames].sort().join(', ')}`);

  console.log(`\nVOICE USAGE:`);
  for (const [name, chars] of Object.entries(voiceChars)) {
    const pct = totalChars > 0 ? ((chars / totalChars) * 100).toFixed(1) : 0;
    console.log(`- ${name}: ${chars.toLocaleString()} chars (${pct}%)`);
  }

  console.log(`\nSEGMENTS BREAKDOWN:`);
  console.log(`- Single-segment items (monologue/lecture): ${singleVoiceItems}`);
  console.log(`- Multi-segment items (dialogue/interview): ${multiVoiceItems}`);
  console.log(`- Total segments across all items: ${totalSegments}`);
  console.log(`- Max segments in one item: ${maxSegments} (${maxSegItem})`);
  console.log(`- Average segments per dialogue/interview: ${avgSegPerMulti}`);

  console.log(`\nPER-LEVEL SUMMARY:`);
  for (let i = 0; i <= 5; i++) {
    const p = perLevel[i] || { items: 0, segments: 0, chars: 0 };
    console.log(`- Level ${i}: ${p.items} items, ${p.segments} segments, ${p.chars.toLocaleString()} chars`);
  }

  console.log(`\nMONTH SPLIT:`);
  console.log(`- Month 1 (L0-L2): ${month1.toLocaleString()} chars`);
  console.log(`- Month 2 (L3-L5): ${month2.toLocaleString()} chars`);

  if (issues.length > 0) {
    console.log(`\nPOTENTIAL ISSUES (${issues.length}):`);
    for (const issue of issues) console.log(`  ⚠️  ${issue}`);
  } else {
    console.log('\nPOTENTIAL ISSUES: None');
  }

  console.log(`\nFILE SAVED: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });
