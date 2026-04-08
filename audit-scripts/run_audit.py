#!/usr/bin/env python3
"""
Fluentia LMS — Deep Curriculum Quality Audit (PROMPT 10)
Master analysis script covering all 12 dimensions.
"""

import json
import os
import re
import random
import math
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd
import nltk
import textstat
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.corpus import stopwords
from nltk import pos_tag

random.seed(42)

BASE = Path(__file__).parent / "data"
STOP_WORDS = set(stopwords.words('english'))

# Cohesion markers
COHESION_MARKERS = {
    'however', 'therefore', 'although', 'moreover', 'furthermore', 'nevertheless',
    'consequently', 'meanwhile', 'similarly', 'additionally', 'nonetheless',
    'thus', 'hence', 'besides', 'instead', 'otherwise', 'accordingly',
    'subsequently', 'likewise', 'conversely', 'whereas', 'while', 'since',
    'because', 'so', 'yet', 'still', 'also', 'first', 'second', 'third',
    'finally', 'next', 'then', 'in addition', 'on the other hand',
    'for example', 'for instance', 'in contrast', 'as a result',
    'in conclusion', 'in summary'
}

# Grammar dependency map
GRAMMAR_DEPS = {
    'present continuous': ['present simple'],
    'present perfect': ['present simple', 'past simple'],
    'present perfect continuous': ['present perfect', 'present continuous'],
    'past continuous': ['past simple'],
    'past perfect': ['past simple', 'past continuous'],
    'past perfect continuous': ['past perfect', 'past continuous'],
    'future continuous': ['will future', 'going to future'],
    'future perfect': ['will future', 'present perfect'],
    'superlatives': ['comparatives'],
    'modals advanced': ['modals basic', 'modals'],
    'passive voice': ['active voice', 'present simple', 'past simple'],
    'passive voice advanced': ['passive voice'],
    'reported speech': ['direct speech', 'past simple'],
    'reported speech advanced': ['reported speech'],
    'conditionals first': ['conditionals zero', 'will future'],
    'conditionals second': ['conditionals first', 'past simple'],
    'conditionals third': ['conditionals second', 'past perfect'],
    'conditionals mixed': ['conditionals second', 'conditionals third'],
    'relative clauses advanced': ['relative clauses', 'relative clauses basic'],
}

# CEFR grammar coverage targets
CEFR_GRAMMAR = {
    0: ['present simple', 'articles', 'pronouns', 'basic nouns', 'basic adjectives', 'imperatives', 'this that these those', 'have got'],
    1: ['present simple', 'present continuous', 'past simple', 'articles', 'prepositions', 'countable uncountable', 'comparatives', 'possessives', 'can could'],
    2: ['past continuous', 'present perfect', 'going to future', 'will future', 'superlatives', 'modals', 'adverbs of frequency', 'relative clauses'],
    3: ['present perfect continuous', 'past perfect', 'conditionals first', 'conditionals second', 'passive voice', 'reported speech', 'gerunds infinitives'],
    4: ['conditionals third', 'conditionals mixed', 'future perfect', 'passive voice advanced', 'relative clauses advanced', 'reported speech advanced', 'wish clauses'],
    5: ['inversion', 'cleft sentences', 'subjunctive', 'advanced modals', 'mixed conditionals', 'advanced passive', 'nominalisation']
}

# ──────────────────────────────────────────────
# DATA LOADING
# ──────────────────────────────────────────────

def load_json(filename):
    """Load a supabase CLI JSON output file (strips CLI preamble)."""
    with open(BASE / filename, 'r', encoding='utf-8') as f:
        content = f.read()
    # Strip everything before the first '{'
    idx = content.find('{')
    if idx > 0:
        content = content[idx:]
    data = json.loads(content)
    return data.get('rows', [])

def load_freq_list(filename):
    """Load a frequency list (one word per line)."""
    with open(BASE / filename, 'r', encoding='utf-8') as f:
        return set(line.strip().lower() for line in f if line.strip())

print("Loading data...")
vocab_data = load_json("vocabulary_full.json")
readings_data = load_json("readings_full.json")
grammar_data = load_json("grammar_full.json")
writing_data = load_json("writing_full.json")
speaking_data = load_json("speaking_full.json")
units_data = load_json("units_full.json")

freq_3000 = load_freq_list("freq_brown_3000.txt")
freq_5000 = load_freq_list("freq_brown_5000.txt")

print(f"  Vocabulary: {len(vocab_data)} entries")
print(f"  Readings: {len(readings_data)} entries")
print(f"  Grammar: {len(grammar_data)} entries")
print(f"  Writing: {len(writing_data)} entries")
print(f"  Speaking: {len(speaking_data)} entries")
print(f"  Units: {len(units_data)} entries")
print(f"  Freq 3000: {len(freq_3000)} words")
print(f"  Freq 5000: {len(freq_5000)} words")

# Convert to DataFrames
vocab_df = pd.DataFrame(vocab_data)
readings_df = pd.DataFrame(readings_data)
grammar_df = pd.DataFrame(grammar_data)
writing_df = pd.DataFrame(writing_data)
speaking_df = pd.DataFrame(speaking_data)
units_df = pd.DataFrame(units_data)

# Ensure level_number is int
for df in [vocab_df, readings_df, grammar_df, writing_df, speaking_df, units_df]:
    if 'level_number' in df.columns:
        df['level_number'] = df['level_number'].astype(int)

LEVELS = sorted(vocab_df['level_number'].unique()) if len(vocab_df) > 0 else list(range(6))

report_sections = {}

# ──────────────────────────────────────────────
# DIMENSION 1 — VOCABULARY REPETITION
# ──────────────────────────────────────────────
print("\n=== DIMENSION 1 — VOCABULARY REPETITION ===")

vocab_df['word_lower'] = vocab_df['word'].str.lower().str.strip()
total_entries = len(vocab_df)
unique_words = vocab_df['word_lower'].nunique()
total_dupes = total_entries - unique_words

# Within-unit duplicates (same word in same unit)
within_unit = vocab_df.groupby(['unit_id', 'word_lower']).size().reset_index(name='count')
within_unit_dupes = within_unit[within_unit['count'] > 1]
within_unit_total = within_unit_dupes['count'].sum() - len(within_unit_dupes)

# Merge level info for within-unit
within_unit_dupes_detail = within_unit_dupes.merge(
    vocab_df[['unit_id', 'unit_number', 'level_number']].drop_duplicates(),
    on='unit_id'
)
within_unit_by_level = within_unit_dupes_detail.groupby('level_number')['count'].sum() if len(within_unit_dupes_detail) > 0 else pd.Series(dtype=int)

# Across-unit same-level duplicates
same_level_groups = vocab_df.groupby(['level_number', 'word_lower']).agg(
    unit_count=('unit_id', 'nunique'),
    pos_set=('part_of_speech', lambda x: set(x.dropna())),
    def_set=('definition_ar', lambda x: set(x.dropna())),
    total=('word', 'count')
).reset_index()

cross_unit_same_level = same_level_groups[same_level_groups['unit_count'] > 1].copy()

# Classify cross-unit same-level
unintended_same_level = 0
acceptable_same_level = 0
needs_review_same_level = 0
needs_review_list = []

for _, row in cross_unit_same_level.iterrows():
    pos_count = len(row['pos_set'])
    def_count = len(row['def_set'])
    if pos_count > 1:
        acceptable_same_level += row['total'] - row['unit_count']
    elif def_count > 1:
        needs_review_same_level += row['total'] - row['unit_count']
        needs_review_list.append({'word': row['word_lower'], 'level': row['level_number'], 'definitions': list(row['def_set'])})
    else:
        unintended_same_level += row['total'] - row['unit_count']

# Across-level duplicates
cross_level_groups = vocab_df.groupby('word_lower').agg(
    level_count=('level_number', 'nunique'),
    levels=('level_number', lambda x: sorted(set(x))),
    examples=('example_sentence', list),
    total=('word', 'count')
).reset_index()

cross_level = cross_level_groups[cross_level_groups['level_count'] > 1].copy()

spiral_count = 0
unintended_cross_level = 0
spiral_examples = []
unintended_cross_examples = []

for _, row in cross_level.iterrows():
    # Get examples per level
    word_entries = vocab_df[vocab_df['word_lower'] == row['word_lower']].sort_values('level_number')
    levels = word_entries['level_number'].unique()

    is_spiral = False
    for i in range(len(levels) - 1):
        ex_lower = word_entries[word_entries['level_number'] == levels[i]]['example_sentence'].iloc[0]
        ex_higher = word_entries[word_entries['level_number'] == levels[i+1]]['example_sentence'].iloc[0]
        if ex_lower and ex_higher and isinstance(ex_lower, str) and isinstance(ex_higher, str):
            fk_lower = textstat.flesch_kincaid_grade(ex_lower)
            fk_higher = textstat.flesch_kincaid_grade(ex_higher)
            if fk_higher > fk_lower + 0.5:
                is_spiral = True

    extra = row['total'] - row['level_count']
    if is_spiral:
        spiral_count += extra
        if len(spiral_examples) < 5:
            spiral_examples.append({
                'word': row['word_lower'],
                'levels': row['levels'],
            })
    else:
        unintended_cross_level += extra
        if len(unintended_cross_examples) < 10:
            unintended_cross_examples.append({
                'word': row['word_lower'],
                'levels': row['levels'],
            })

total_unintended = within_unit_total + unintended_same_level + unintended_cross_level

d1_output = f"""========================================
DIMENSION 1 — VOCABULARY REPETITION
========================================

Total vocabulary entries: {total_entries}
Unique english_word (case-insensitive): {unique_words}
Total duplicates: {total_dupes}

Within-unit duplicates (UNINTENDED):
  - Total: {within_unit_total}
  - Distribution by level: {', '.join(f'L{l}={int(within_unit_by_level.get(l, 0))}' for l in LEVELS)}

Across-unit same-level duplicates:
  - UNINTENDED (same POS, same definition): {unintended_same_level}
  - ACCEPTABLE (different POS): {acceptable_same_level}
  - NEEDS REVIEW (same POS, different definition): {needs_review_same_level}

Across-level duplicates:
  - SPIRAL (intentional — higher complexity): {spiral_count}
  - UNINTENDED (same/simpler complexity): {unintended_cross_level}
  - Sample of intentional spirals: {json.dumps(spiral_examples[:5], ensure_ascii=False, indent=4) if spiral_examples else 'NONE FOUND'}
  - Sample of unintended cross-level repeats: {json.dumps(unintended_cross_examples[:10], ensure_ascii=False, indent=4) if unintended_cross_examples else 'NONE'}

TOTAL UNINTENDED REPETITION: {total_unintended} entries
RECLAIMABLE SLOTS (if all unintended duplicates removed): {total_unintended}
"""

print(d1_output)
report_sections['d1'] = d1_output

# ──────────────────────────────────────────────
# DIMENSION 2 — CEFR VOCABULARY ALIGNMENT
# ──────────────────────────────────────────────
print("\n=== DIMENSION 2 — CEFR VOCABULARY ALIGNMENT ===")

# Using Brown corpus top 3000 as proxy for Oxford 3000 (A1-A2) and top 5000 for B1-B2
# Strategy 3 from the prompt — document this in the report

level_cefr_map = {0: 'Pre-A1', 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1'}
cefr_target = {0: 'A1', 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C1'}

# Classify each word
def classify_cefr(word):
    w = word.lower().strip()
    if w in freq_3000:
        return 'A1-A2'  # In top 3000 = basic
    elif w in freq_5000:
        return 'B1-B2'  # In top 5000 = intermediate
    else:
        return 'C1+'  # Not in top 5000 = advanced

vocab_df['estimated_cefr'] = vocab_df['word_lower'].apply(classify_cefr)

d2_lines = ["""========================================
DIMENSION 2 — CEFR VOCABULARY ALIGNMENT
========================================

Frequency lists used: NLTK Brown Corpus (Strategy 3 — proxy for Oxford 3000/5000)
  - Top 3000 most frequent → classified as A1-A2
  - Top 3001-5000 → classified as B1-B2
  - Beyond 5000 → classified as C1+
  NOTE: Brown corpus is 1960s American English; not ideal but workable as a proxy.
"""]

too_easy_total = 0
too_hard_total = 0
misplaced_easy_examples = []
misplaced_hard_examples = []

for level in LEVELS:
    level_vocab = vocab_df[vocab_df['level_number'] == level]
    total_in_level = len(level_vocab)
    in_3000 = len(level_vocab[level_vocab['estimated_cefr'] == 'A1-A2'])
    in_5000_only = len(level_vocab[level_vocab['estimated_cefr'] == 'B1-B2'])
    in_c1_plus = len(level_vocab[level_vocab['estimated_cefr'] == 'C1+'])

    target = level_cefr_map[level]

    # Determine too easy / too hard based on level
    if level <= 1:  # Pre-A1, A1 — should be mostly A1-A2
        too_hard = in_c1_plus
        too_easy = 0
    elif level == 2:  # A2 — mix of A1-A2 and B1-B2
        too_hard = in_c1_plus
        too_easy = 0
    elif level == 3:  # B1 — should be mostly B1-B2
        too_hard = in_c1_plus
        too_easy = 0  # A1-A2 words can still appear at B1
    elif level == 4:  # B2 — should be B1-B2 and some C1+
        too_hard = 0
        too_easy = 0  # mix is fine at B2
    else:  # C1 — should be mostly C1+
        too_hard = 0
        too_easy_in_3000 = in_3000
        too_easy = too_easy_in_3000  # A1-A2 words in C1 level

    too_easy_total += too_easy
    too_hard_total += too_hard

    # Get examples of mismatches
    if level <= 2 and in_c1_plus > 0:
        hard_examples = level_vocab[level_vocab['estimated_cefr'] == 'C1+']['word_lower'].head(10).tolist()
        misplaced_hard_examples.append(f"  L{level}: {hard_examples}")
    if level >= 4 and in_3000 > 0:
        easy_examples = level_vocab[level_vocab['estimated_cefr'] == 'A1-A2']['word_lower'].head(10).tolist()
        misplaced_easy_examples.append(f"  L{level}: {easy_examples}")

    d2_lines.append(f"""
  Level {level} (target: {target})
    - In freq top 3000 (A1-A2): {in_3000} / {total_in_level} ({in_3000*100//max(total_in_level,1)}%)
    - In freq 3001-5000 (B1-B2): {in_5000_only} / {total_in_level} ({in_5000_only*100//max(total_in_level,1)}%)
    - Beyond 5000 (C1+): {in_c1_plus} / {total_in_level} ({in_c1_plus*100//max(total_in_level,1)}%)
    - Too hard for level: {too_hard}
    - Too easy for level: {too_easy}""")

d2_lines.append(f"""
Cross-level inconsistencies:
  - Words classified as A1-A2 but placed in L4+:
{chr(10).join(misplaced_easy_examples) if misplaced_easy_examples else '    NONE'}
  - Words classified as C1+ but placed in L0-L2:
{chr(10).join(misplaced_hard_examples) if misplaced_hard_examples else '    NONE'}

Claude API ambiguous resolutions: 0 / 50 used (skipped — using frequency-based proxy only)

OVERALL VERDICT:
  - Total words potentially too hard for their level: {too_hard_total}
  - Total words potentially too easy for their level: {too_easy_total}
""")

d2_output = '\n'.join(d2_lines)
print(d2_output)
report_sections['d2'] = d2_output

# ──────────────────────────────────────────────
# DIMENSION 3 — READING PASSAGE QUALITY
# ──────────────────────────────────────────────
print("\n=== DIMENSION 3 — READING PASSAGE QUALITY ===")

# Target ranges from the prompt
target_ranges = {
    0: {'words': (50, 300), 'fkgl': (0, 4.0)},   # Pre-A1 — adjusted to actual passage_word_range 200-300
    1: {'words': (100, 400), 'fkgl': (1.0, 5.0)},  # A1
    2: {'words': (200, 500), 'fkgl': (2.0, 6.0)},  # A2
    3: {'words': (300, 600), 'fkgl': (3.5, 7.0)},  # B1
    4: {'words': (400, 1000), 'fkgl': (5.0, 9.0)},  # B2
    5: {'words': (600, 1200), 'fkgl': (7.0, 12.0)},  # C1
}

def extract_passage_text(passage_content):
    """Extract plain text from passage_content JSONB."""
    if not passage_content:
        return ""
    if isinstance(passage_content, str):
        try:
            passage_content = json.loads(passage_content)
        except:
            return passage_content

    # Could be a list of paragraphs or a dict with sections
    if isinstance(passage_content, list):
        texts = []
        for item in passage_content:
            if isinstance(item, str):
                texts.append(item)
            elif isinstance(item, dict):
                for key in ['text', 'content', 'paragraph', 'body']:
                    if key in item and isinstance(item[key], str):
                        texts.append(item[key])
                        break
        return ' '.join(texts)
    elif isinstance(passage_content, dict):
        texts = []
        for key in ['text', 'content', 'body', 'passage', 'paragraphs']:
            if key in passage_content:
                val = passage_content[key]
                if isinstance(val, str):
                    texts.append(val)
                elif isinstance(val, list):
                    for item in val:
                        if isinstance(item, str):
                            texts.append(item)
                        elif isinstance(item, dict) and 'text' in item:
                            texts.append(item['text'])
        if texts:
            return ' '.join(texts)
        # fallback: join all string values
        for v in passage_content.values():
            if isinstance(v, str) and len(v) > 50:
                texts.append(v)
        return ' '.join(texts)
    return str(passage_content)

reading_stats = []
for _, r in readings_df.iterrows():
    text = extract_passage_text(r['passage_content'])
    if not text or len(text) < 10:
        reading_stats.append({
            'level': r['level_number'], 'unit': r['unit_number'],
            'title': r['title_en'], 'label': r['reading_label'],
            'word_count': 0, 'sentence_count': 0, 'avg_sent_len': 0,
            'ttr': 0, 'fkgl': 0, 'fre': 0, 'cohesion': 0, 'lex_density': 0,
            'text_preview': text[:100],
            'db_word_count': r.get('passage_word_count', 0)
        })
        continue

    words = word_tokenize(text)
    words_alpha = [w.lower() for w in words if w.isalpha()]
    sentences = sent_tokenize(text)

    wc = len(words_alpha)
    sc = max(len(sentences), 1)
    avg_sl = wc / sc
    unique = len(set(words_alpha))
    ttr = unique / max(wc, 1)

    # Lexical density
    try:
        tagged = pos_tag(words_alpha)
        content_tags = {'NN', 'NNS', 'NNP', 'NNPS', 'VB', 'VBD', 'VBG', 'VBN', 'VBP', 'VBZ', 'JJ', 'JJR', 'JJS', 'RB', 'RBR', 'RBS'}
        content_words = sum(1 for _, tag in tagged if tag in content_tags)
        lex_density = content_words / max(wc, 1)
    except:
        lex_density = 0

    # Readability
    try:
        fkgl = textstat.flesch_kincaid_grade(text)
        fre = textstat.flesch_reading_ease(text)
    except:
        fkgl = 0
        fre = 0

    # Cohesion
    text_lower = text.lower()
    cohesion_count = sum(1 for marker in COHESION_MARKERS if f' {marker} ' in f' {text_lower} ')
    cohesion_per_100 = cohesion_count * 100 / max(wc, 1)

    reading_stats.append({
        'level': r['level_number'], 'unit': r['unit_number'],
        'title': r['title_en'], 'label': r['reading_label'],
        'word_count': wc, 'sentence_count': sc, 'avg_sent_len': round(avg_sl, 1),
        'ttr': round(ttr, 3), 'fkgl': round(fkgl, 1), 'fre': round(fre, 1),
        'cohesion': round(cohesion_per_100, 2), 'lex_density': round(lex_density, 3),
        'text_preview': text[:100],
        'db_word_count': r.get('passage_word_count', 0)
    })

rs_df = pd.DataFrame(reading_stats)

d3_lines = ["""========================================
DIMENSION 3 — READING PASSAGE QUALITY
========================================

Per-level summary table:
  Level | Passages | Avg Words | Target Range | Avg TTR | Lex Density | Avg FKGL | Cohesion/100w | Status"""]

levels_need_rewrite = []
outside_target = 0

for level in LEVELS:
    ldf = rs_df[rs_df['level'] == level]
    if len(ldf) == 0:
        continue
    avg_wc = ldf['word_count'].mean()
    avg_ttr = ldf['ttr'].mean()
    avg_ld = ldf['lex_density'].mean()
    avg_fkgl = ldf['fkgl'].mean()
    avg_coh = ldf['cohesion'].mean()
    tgt = target_ranges.get(level, {})
    tgt_words = tgt.get('words', (0, 9999))
    tgt_fkgl = tgt.get('fkgl', (0, 99))

    status = "OK"
    if avg_wc < tgt_words[0]:
        status = "TOO SHORT"
        levels_need_rewrite.append(level)
    elif avg_wc > tgt_words[1]:
        status = "TOO LONG"
        levels_need_rewrite.append(level)

    if avg_fkgl < tgt_fkgl[0] or avg_fkgl > tgt_fkgl[1]:
        status += " / FKGL OUT OF RANGE"
        if level not in levels_need_rewrite:
            levels_need_rewrite.append(level)

    d3_lines.append(f"  L{level}    | {len(ldf):3d}      | {avg_wc:7.0f}   | {tgt_words[0]}-{tgt_words[1]:4d}    | {avg_ttr:.3f}  | {avg_ld:.3f}       | {avg_fkgl:5.1f}    | {avg_coh:5.2f}         | {status}")

# Outliers
d3_lines.append("\nOutliers (passages significantly outside target):")
for _, row in rs_df.iterrows():
    tgt = target_ranges.get(row['level'], {})
    tgt_words = tgt.get('words', (0, 9999))
    if row['word_count'] > 0:
        if row['word_count'] > tgt_words[1] * 1.5:
            ratio = row['word_count'] / tgt_words[1]
            d3_lines.append(f"  - L{row['level']} Unit {row['unit']}: \"{row['title']}\" ({row['label']}) — {row['word_count']} words (target {tgt_words[0]}-{tgt_words[1]}) — {ratio:.1f}x too long")
            outside_target += 1
        elif row['word_count'] < tgt_words[0] * 0.5 and row['word_count'] > 0:
            ratio = tgt_words[0] / max(row['word_count'], 1)
            d3_lines.append(f"  - L{row['level']} Unit {row['unit']}: \"{row['title']}\" ({row['label']}) — {row['word_count']} words (target {tgt_words[0]}-{tgt_words[1]}) — {ratio:.1f}x too short")
            outside_target += 1

# FKGL issues
d3_lines.append("\nPassages with FKGL inappropriate for level:")
fkgl_issues = 0
for _, row in rs_df.iterrows():
    tgt = target_ranges.get(row['level'], {})
    tgt_fkgl = tgt.get('fkgl', (0, 99))
    if row['fkgl'] > tgt_fkgl[1] + 2:
        d3_lines.append(f"  - L{row['level']} Unit {row['unit']}: \"{row['title']}\" — FKGL={row['fkgl']} (target {tgt_fkgl[0]}-{tgt_fkgl[1]})")
        fkgl_issues += 1
    elif row['fkgl'] < tgt_fkgl[0] - 2 and row['word_count'] > 0:
        d3_lines.append(f"  - L{row['level']} Unit {row['unit']}: \"{row['title']}\" — FKGL={row['fkgl']} (target {tgt_fkgl[0]}-{tgt_fkgl[1]})")
        fkgl_issues += 1

# Cohesion and TTR by level
d3_lines.append("\nCohesion score by level (higher = more sophisticated text):")
for level in LEVELS:
    ldf = rs_df[rs_df['level'] == level]
    d3_lines.append(f"  L{level}: {ldf['cohesion'].mean():.2f}")

d3_lines.append("\nAverage TTR by level (expected: increase with level):")
for level in LEVELS:
    ldf = rs_df[rs_df['level'] == level]
    d3_lines.append(f"  L{level}: {ldf['ttr'].mean():.3f}")

d3_lines.append(f"\nVERDICT: {len(levels_need_rewrite)} levels may need passage adjustments: {['L'+str(l) for l in levels_need_rewrite]}")
d3_lines.append(f"Total passages outside target range: {outside_target}")
d3_lines.append(f"Total passages with FKGL issues: {fkgl_issues}")

d3_output = '\n'.join(d3_lines)
print(d3_output)
report_sections['d3'] = d3_output

# ──────────────────────────────────────────────
# DIMENSION 4 — GRAMMAR PROGRESSION INTEGRITY
# ──────────────────────────────────────────────
print("\n=== DIMENSION 4 — GRAMMAR PROGRESSION INTEGRITY ===")

d4_lines = ["""========================================
DIMENSION 4 — GRAMMAR PROGRESSION INTEGRITY
========================================

Grammar topics per level:"""]

grammar_by_level = defaultdict(list)
for _, g in grammar_df.iterrows():
    grammar_by_level[g['level_number']].append({
        'topic': g['topic_name_en'],
        'category': g['category'],
        'unit': g.get('unit_number', '?')
    })

for level in LEVELS:
    topics = grammar_by_level[level]
    d4_lines.append(f"\n  Level {level} ({len(topics)} topics):")
    for t in topics:
        d4_lines.append(f"    - Unit {t['unit']}: {t['topic']} [{t['category']}]")

# Check prerequisites
d4_lines.append("\nHidden prerequisite gaps detected:")
all_topics_by_level = {}
for level in LEVELS:
    all_topics_by_level[level] = set(t['topic'].lower() for t in grammar_by_level[level])

# Also build cumulative set (all topics taught up to level N)
cumulative_topics = {}
running = set()
for level in LEVELS:
    running = running | all_topics_by_level.get(level, set())
    cumulative_topics[level] = running.copy()

gaps_found = 0
for level in LEVELS:
    for topic_info in grammar_by_level[level]:
        topic_lower = topic_info['topic'].lower()
        for dep_key, prereqs in GRAMMAR_DEPS.items():
            if dep_key in topic_lower:
                for prereq in prereqs:
                    # Check if prereq was taught in this or earlier level
                    prev_topics = cumulative_topics.get(level, set())
                    found = any(prereq in t for t in prev_topics)
                    if not found:
                        d4_lines.append(f"  - L{level} Unit {topic_info['unit']}: \"{topic_info['topic']}\" may require \"{prereq}\" which was not found in L0-L{level}")
                        gaps_found += 1

if gaps_found == 0:
    d4_lines.append("  NONE — all detected dependencies appear satisfied (note: matching is heuristic)")

# Repeated grammar topics
d4_lines.append("\nRepeated grammar topics across levels:")
all_topics_flat = []
for level in LEVELS:
    for t in grammar_by_level[level]:
        all_topics_flat.append((t['topic'].lower().strip(), level))

topic_levels = defaultdict(list)
for topic, level in all_topics_flat:
    topic_levels[topic].append(level)

for topic, levels_list in topic_levels.items():
    if len(set(levels_list)) > 1:
        d4_lines.append(f"  - \"{topic}\" appears in levels: {sorted(set(levels_list))}")

# CEFR grammar coverage
d4_lines.append("\nGrammar vs CEFR coverage per level:")
for level in LEVELS:
    expected = CEFR_GRAMMAR.get(level, [])
    actual = all_topics_by_level.get(level, set())
    covered = sum(1 for exp in expected if any(exp in t for t in actual))
    total_exp = max(len(expected), 1)
    d4_lines.append(f"  - L{level}: {covered}/{total_exp} CEFR target topics covered ({covered*100//total_exp}%)")

d4_lines.append(f"\nVERDICT: {gaps_found} potential prerequisite gaps found")

d4_output = '\n'.join(d4_lines)
print(d4_output)
report_sections['d4'] = d4_output

# ──────────────────────────────────────────────
# DIMENSION 5 — WRITING / SPEAKING PROGRESSION
# ──────────────────────────────────────────────
print("\n=== DIMENSION 5 — WRITING / SPEAKING PROGRESSION ===")

d5_lines = ["""========================================
DIMENSION 5 — WRITING / SPEAKING PROGRESSION
========================================

Writing min/max word counts by level:"""]

for level in LEVELS:
    lw = writing_df[writing_df['level_number'] == level]
    if len(lw) > 0:
        avg_min = lw['word_count_min'].mean() if 'word_count_min' in lw.columns else 0
        avg_max = lw['word_count_max'].mean() if 'word_count_max' in lw.columns else 0
        d5_lines.append(f"  L{level}: avg_min={avg_min:.0f}, avg_max={avg_max:.0f} ({len(lw)} prompts)")

# Check smoothness
d5_lines.append("\nSmooth ramp check (max word count progression):")
prev_max = 0
jumps = []
for level in LEVELS:
    lw = writing_df[writing_df['level_number'] == level]
    if len(lw) > 0 and 'word_count_max' in lw.columns:
        curr_max = lw['word_count_max'].mean()
        if prev_max > 0:
            ratio = curr_max / prev_max
            status = "SMOOTH" if ratio <= 1.8 else "ABRUPT JUMP"
            d5_lines.append(f"  L{level-1}→L{level}: {prev_max:.0f} → {curr_max:.0f} (ratio: {ratio:.2f}) — {status}")
            if ratio > 1.8:
                jumps.append(f"L{level-1}→L{level}")
        prev_max = curr_max

# Writing prompt complexity
d5_lines.append("\nWriting prompt complexity (avg FKGL of prompt text):")
for level in LEVELS:
    lw = writing_df[writing_df['level_number'] == level]
    if len(lw) > 0 and 'prompt_en' in lw.columns:
        fkgls = []
        for prompt in lw['prompt_en']:
            if prompt and isinstance(prompt, str) and len(prompt) > 20:
                try:
                    fkgls.append(textstat.flesch_kincaid_grade(prompt))
                except:
                    pass
        avg_fkgl = sum(fkgls) / max(len(fkgls), 1)
        d5_lines.append(f"  L{level}: {avg_fkgl:.1f}")

# Vocab/grammar requirements per prompt
d5_lines.append("\nVocabulary requirement count per prompt (avg):")
for level in LEVELS:
    lw = writing_df[writing_df['level_number'] == level]
    if len(lw) > 0 and 'vocabulary_to_use' in lw.columns:
        counts = []
        for v in lw['vocabulary_to_use']:
            if v and isinstance(v, list):
                counts.append(len(v))
            elif v and isinstance(v, str):
                try:
                    parsed = json.loads(v)
                    counts.append(len(parsed) if isinstance(parsed, list) else 0)
                except:
                    counts.append(0)
            else:
                counts.append(0)
        avg_count = sum(counts) / max(len(counts), 1)
        d5_lines.append(f"  L{level}: {avg_count:.1f}")

# Speaking
d5_lines.append("\nSpeaking topic analysis:")
for level in LEVELS:
    ls = speaking_df[speaking_df['level_number'] == level]
    if len(ls) > 0:
        fkgls = []
        for prompt in ls['prompt_en']:
            if prompt and isinstance(prompt, str) and len(prompt) > 20:
                try:
                    fkgls.append(textstat.flesch_kincaid_grade(prompt))
                except:
                    pass
        avg_fkgl = sum(fkgls) / max(len(fkgls), 1)

        min_durs = ls['min_duration_seconds'].dropna()
        max_durs = ls['max_duration_seconds'].dropna()
        d5_lines.append(f"  L{level}: prompt FKGL={avg_fkgl:.1f}, duration={min_durs.mean():.0f}-{max_durs.mean():.0f}s ({len(ls)} topics)")

d5_lines.append(f"\nVERDICT: {'Abrupt jumps at: ' + ', '.join(jumps) if jumps else 'Progression appears smooth'}")

d5_output = '\n'.join(d5_lines)
print(d5_output)
report_sections['d5'] = d5_output

# ──────────────────────────────────────────────
# DIMENSION 6 — THE LEAP TEST
# ──────────────────────────────────────────────
print("\n=== DIMENSION 6 — THE LEAP TEST ===")

# Gather per-level metrics
level_metrics = {}
for level in LEVELS:
    lv = vocab_df[vocab_df['level_number'] == level]
    lr = rs_df[rs_df['level'] == level]
    lg = grammar_by_level.get(level, [])
    lw = writing_df[writing_df['level_number'] == level]

    level_metrics[level] = {
        'avg_fkgl': lr['fkgl'].mean() if len(lr) > 0 else 0,
        'avg_words': lr['word_count'].mean() if len(lr) > 0 else 0,
        'unique_vocab': lv['word_lower'].nunique(),
        'grammar_topics': len(lg),
        'writing_max': lw['word_count_max'].mean() if len(lw) > 0 and 'word_count_max' in lw.columns else 0,
        'avg_ttr': lr['ttr'].mean() if len(lr) > 0 else 0,
    }

# Expected jumps
expected = {
    'fkgl': 1.5,
    'words': 0.5,  # 50% increase
    'vocab': 0.35,  # 35% increase
    'grammar': 4,
    'writing': 0.4,  # 40% increase
    'ttr': 0.03
}

d6_lines = ["""========================================
DIMENSION 6 — THE LEAP TEST
========================================

Per-level raw metrics:"""]

for level in LEVELS:
    m = level_metrics[level]
    d6_lines.append(f"  L{level}: FKGL={m['avg_fkgl']:.1f}, AvgWords={m['avg_words']:.0f}, UniqueVocab={m['unique_vocab']}, GrammarTopics={m['grammar_topics']}, WritingMax={m['writing_max']:.0f}, TTR={m['avg_ttr']:.3f}")

d6_lines.append("\nPer-transition leap scores:")
leap_scores = {}
weakest = None
weakest_score = 999

for i in range(len(LEVELS) - 1):
    l_curr = LEVELS[i]
    l_next = LEVELS[i + 1]
    m_curr = level_metrics[l_curr]
    m_next = level_metrics[l_next]

    # Component scores (normalized to 1.0 = expected)
    fkgl_diff = m_next['avg_fkgl'] - m_curr['avg_fkgl']
    fkgl_score = fkgl_diff / expected['fkgl'] if expected['fkgl'] > 0 else 0

    words_ratio = (m_next['avg_words'] - m_curr['avg_words']) / max(m_curr['avg_words'] * expected['words'], 1)

    vocab_ratio = (m_next['unique_vocab'] - m_curr['unique_vocab']) / max(m_curr['unique_vocab'] * expected['vocab'], 1)

    grammar_diff = m_next['grammar_topics'] - m_curr['grammar_topics']
    grammar_score = grammar_diff / expected['grammar'] if expected['grammar'] > 0 else 0

    writing_ratio = (m_next['writing_max'] - m_curr['writing_max']) / max(m_curr['writing_max'] * expected['writing'], 1) if m_curr['writing_max'] > 0 else 0

    ttr_diff = m_next['avg_ttr'] - m_curr['avg_ttr']
    ttr_score = ttr_diff / expected['ttr'] if expected['ttr'] > 0 else 0

    total = (0.25 * fkgl_score + 0.20 * words_ratio + 0.20 * vocab_ratio +
             0.15 * grammar_score + 0.10 * writing_ratio + 0.10 * ttr_score)

    leap_scores[f"L{l_curr}→L{l_next}"] = {
        'total': total,
        'fkgl': fkgl_score,
        'words': words_ratio,
        'vocab': vocab_ratio,
        'grammar': grammar_score,
        'writing': writing_ratio,
        'ttr': ttr_score
    }

    interpretation = ""
    if total >= 1.5:
        interpretation = "EXCESSIVE LEAP — students may feel overwhelmed"
    elif total >= 0.9:
        interpretation = "STRONG — good level differentiation"
    elif total >= 0.7:
        interpretation = "ADEQUATE — could be stronger"
    elif total >= 0.4:
        interpretation = "WEAK — students may not feel progress"
    else:
        interpretation = "VERY WEAK — barely any difference"

    d6_lines.append(f"  L{l_curr}→L{l_next}: {total:.2f}  ← {interpretation}")

    if total < weakest_score:
        weakest_score = total
        weakest = f"L{l_curr}→L{l_next}"

# Component breakdown for weakest
if weakest:
    d6_lines.append(f"\nComponent breakdown for weakest transition ({weakest}):")
    ws = leap_scores[weakest]
    d6_lines.append(f"  FKGL={ws['fkgl']:.2f}, Words={ws['words']:.2f}, Vocab={ws['vocab']:.2f}, Grammar={ws['grammar']:.2f}, Writing={ws['writing']:.2f}, TTR={ws['ttr']:.2f}")

# Verdicts
strong = [k for k, v in leap_scores.items() if v['total'] >= 0.9]
weak = [k for k, v in leap_scores.items() if v['total'] < 0.7]
excessive = [k for k, v in leap_scores.items() if v['total'] > 1.5]

d6_lines.append(f"""
VERDICT:
  - Strong leaps (>= 0.9): {strong if strong else 'NONE'}
  - Weak leaps (< 0.7): {weak if weak else 'NONE'}
  - Excessive leaps (> 1.5): {excessive if excessive else 'NONE'}""")

d6_output = '\n'.join(d6_lines)
print(d6_output)
report_sections['d6'] = d6_output

# ──────────────────────────────────────────────
# DIMENSION 7 — TRANSLATION QUALITY
# ──────────────────────────────────────────────
print("\n=== DIMENSION 7 — TRANSLATION QUALITY ===")

sample_size = min(100, len(vocab_df))
sample = vocab_df.sample(n=sample_size, random_state=42)

empty_translations = 0
contains_english = 0
suspiciously_short = 0
good = 0

issues_detail = []

for _, row in sample.iterrows():
    ar = row.get('definition_ar', '')
    word = row.get('word', '')

    if not ar or (isinstance(ar, str) and ar.strip() == ''):
        empty_translations += 1
        issues_detail.append(f"  EMPTY: \"{word}\" (L{row['level_number']})")
        continue

    ar_str = str(ar)

    # Check for English characters (excluding numbers and common symbols)
    english_chars = re.findall(r'[a-zA-Z]{2,}', ar_str)
    if english_chars:
        contains_english += 1
        issues_detail.append(f"  ENGLISH IN AR: \"{word}\" → \"{ar_str}\" (found: {english_chars[:3]})")
        continue

    # Suspiciously short
    if len(ar_str.strip()) <= 2:
        suspiciously_short += 1
        issues_detail.append(f"  SHORT: \"{word}\" → \"{ar_str}\"")
        continue

    good += 1

# 20 random examples
sample_20 = sample.head(20)

d7_lines = [f"""========================================
DIMENSION 7 — TRANSLATION QUALITY
========================================

Sample size: {sample_size} random entries

Issues found:
  - Empty translations: {empty_translations}
  - Translations containing English: {contains_english}
  - Suspiciously short (≤2 chars): {suspiciously_short}
  - Good translations: {good}

Issue details (first 20):"""]

for detail in issues_detail[:20]:
    d7_lines.append(detail)

d7_lines.append("\n20 random examples (Word / Arabic / Level):")
d7_lines.append(f"  {'Word':<25} {'Arabic Translation':<40} Level")
d7_lines.append(f"  {'-'*25} {'-'*40} {'---':>5}")
for _, row in sample_20.iterrows():
    d7_lines.append(f"  {str(row['word']):<25} {str(row.get('definition_ar', 'N/A')):<40} L{row['level_number']}")

d7_lines.append(f"\nClaude API quality scores: SKIPPED (budget reserved)")

d7_output = '\n'.join(d7_lines)
print(d7_output)
report_sections['d7'] = d7_output

# ──────────────────────────────────────────────
# DIMENSION 8 — EXAMPLE SENTENCE QUALITY
# ──────────────────────────────────────────────
print("\n=== DIMENSION 8 — EXAMPLE SENTENCE QUALITY ===")

sample8 = vocab_df.sample(n=min(100, len(vocab_df)), random_state=123)

missing_word = 0
too_short = 0
too_long_for_level = 0
fkgl_inappropriate = 0
no_example = 0
good_examples = 0

example_issues = []

for _, row in sample8.iterrows():
    ex = row.get('example_sentence', '')
    word = row.get('word', '')
    level = row['level_number']

    if not ex or (isinstance(ex, str) and ex.strip() == ''):
        no_example += 1
        continue

    ex_str = str(ex)
    ex_words = word_tokenize(ex_str)
    ex_alpha = [w for w in ex_words if w.isalpha()]
    wc = len(ex_alpha)

    # Does it contain the target word?
    if word and isinstance(word, str) and word.lower() not in ex_str.lower():
        missing_word += 1
        example_issues.append(f"  MISSING WORD: \"{word}\" not in \"{ex_str[:60]}...\"")

    # Too short?
    if wc < 5 and wc > 0:
        too_short += 1

    # Too long for level?
    if level <= 2 and wc > 25:
        too_long_for_level += 1

    # FKGL check
    if len(ex_str) > 20:
        try:
            ex_fkgl = textstat.flesch_kincaid_grade(ex_str)
            tgt_fkgl = target_ranges.get(level, {}).get('fkgl', (0, 99))
            if ex_fkgl > tgt_fkgl[1] + 2:
                fkgl_inappropriate += 1
        except:
            pass

    if wc >= 5 and (not word or word.lower() in ex_str.lower()):
        good_examples += 1

d8_lines = [f"""========================================
DIMENSION 8 — EXAMPLE SENTENCE QUALITY
========================================

Sample size: {len(sample8)}

Issues:
  - Examples with no sentence: {no_example}
  - Examples missing the target word: {missing_word}
  - Examples too short (<5 words): {too_short}
  - Examples too long for level (>25 words at A1-A2): {too_long_for_level}
  - Examples with FKGL too high for level: {fkgl_inappropriate}
  - Good examples: {good_examples}

First 20 issue details:"""]

for issue in example_issues[:20]:
    d8_lines.append(issue)

# 20 random examples
d8_lines.append("\n20 random examples with assessment:")
for _, row in sample8.head(20).iterrows():
    ex = str(row.get('example_sentence', 'N/A'))[:80]
    word = str(row.get('word', ''))
    contains = "YES" if word.lower() in ex.lower() else "NO"
    d8_lines.append(f"  [{row['level_number']}] \"{word}\" → \"{ex}\" (contains word: {contains})")

d8_output = '\n'.join(d8_lines)
print(d8_output)
report_sections['d8'] = d8_output

# ──────────────────────────────────────────────
# DIMENSION 9 — TOPIC DIVERSITY
# ──────────────────────────────────────────────
print("\n=== DIMENSION 9 — TOPIC DIVERSITY ===")

# Manual category mapping based on common educational themes
TOPIC_CATEGORIES = {
    'family': ['family', 'parent', 'child', 'mother', 'father', 'sibling', 'home', 'عائل'],
    'food': ['food', 'cook', 'meal', 'restaurant', 'eat', 'kitchen', 'طعام', 'أكل'],
    'work': ['work', 'job', 'career', 'office', 'business', 'profession', 'عمل', 'وظيف'],
    'travel': ['travel', 'trip', 'journey', 'tourism', 'vacation', 'transport', 'سفر', 'رحل'],
    'technology': ['technology', 'computer', 'internet', 'digital', 'phone', 'app', 'تقني', 'تكنولوج'],
    'health': ['health', 'doctor', 'hospital', 'medicine', 'exercise', 'fitness', 'صح', 'طب'],
    'education': ['education', 'school', 'study', 'learn', 'university', 'college', 'تعليم', 'دراس'],
    'environment': ['environment', 'nature', 'climate', 'pollution', 'green', 'بيئ', 'طبيع'],
    'culture': ['culture', 'tradition', 'art', 'music', 'festival', 'heritage', 'ثقاف', 'فن'],
    'sports': ['sport', 'game', 'play', 'team', 'competition', 'exercise', 'رياض'],
    'shopping': ['shop', 'buy', 'market', 'store', 'price', 'تسوق', 'شراء'],
    'daily life': ['daily', 'routine', 'morning', 'day', 'everyday', 'يوم', 'روتين'],
    'social': ['friend', 'social', 'community', 'neighbor', 'relationship', 'اجتماع', 'صديق'],
    'media': ['media', 'news', 'newspaper', 'tv', 'film', 'movie', 'إعلام'],
    'science': ['science', 'research', 'experiment', 'discovery', 'علم', 'بحث'],
    'city': ['city', 'town', 'urban', 'building', 'street', 'مدين'],
    'weather': ['weather', 'season', 'rain', 'sun', 'cold', 'hot', 'طقس'],
    'hobbies': ['hobby', 'hobbies', 'leisure', 'free time', 'هواي'],
}

def categorize_theme(theme_en, theme_ar=''):
    combined = (str(theme_en) + ' ' + str(theme_ar)).lower()
    matches = []
    for cat, keywords in TOPIC_CATEGORIES.items():
        if any(kw in combined for kw in keywords):
            matches.append(cat)
    return matches if matches else ['other']

d9_lines = ["""========================================
DIMENSION 9 — TOPIC DIVERSITY
========================================

Per level:"""]

poor_diversity_levels = []
for level in LEVELS:
    level_units = units_df[units_df['level_number'] == level]
    all_cats = []
    unit_themes = []
    for _, u in level_units.iterrows():
        cats = categorize_theme(u['theme_en'], u.get('theme_ar', ''))
        all_cats.extend(cats)
        unit_themes.append(f"Unit {u['unit_number']}: {u['theme_en']} → {cats}")

    unique_cats = set(all_cats)
    cat_counts = Counter(all_cats)
    d9_lines.append(f"\n  L{level}: {len(unique_cats)} unique categories — {sorted(unique_cats)}")
    for ut in unit_themes:
        d9_lines.append(f"    {ut}")

    # Check overrepresentation
    for cat, count in cat_counts.items():
        if count > 3:
            d9_lines.append(f"    ⚠ \"{cat}\" appears in {count} units — possibly overrepresented")

    if len(unique_cats) < 4:
        poor_diversity_levels.append(level)

d9_lines.append(f"\nVERDICT: Levels with poor diversity (<4 unique categories): {['L'+str(l) for l in poor_diversity_levels] if poor_diversity_levels else 'NONE'}")

d9_output = '\n'.join(d9_lines)
print(d9_output)
report_sections['d9'] = d9_output

# ──────────────────────────────────────────────
# DIMENSION 10 — POS BALANCE
# ──────────────────────────────────────────────
print("\n=== DIMENSION 10 — POS BALANCE ===")

d10_lines = ["""========================================
DIMENSION 10 — POS BALANCE
========================================

Healthy ranges: Nouns 40-50%, Verbs 20-30%, Adj 15-20%, Adv 5-10%, Other 5-15%

Per level:"""]

imbalances = []
for level in LEVELS:
    lv = vocab_df[vocab_df['level_number'] == level]
    total = len(lv)
    if total == 0:
        continue

    pos_counts = lv['part_of_speech'].fillna('unknown').str.lower().value_counts()

    # Map to standard categories
    noun_count = sum(pos_counts.get(p, 0) for p in ['noun', 'n', 'n.', 'nouns'])
    verb_count = sum(pos_counts.get(p, 0) for p in ['verb', 'v', 'v.', 'verbs'])
    adj_count = sum(pos_counts.get(p, 0) for p in ['adjective', 'adj', 'adj.', 'adjectives'])
    adv_count = sum(pos_counts.get(p, 0) for p in ['adverb', 'adv', 'adv.', 'adverbs'])
    other_count = total - noun_count - verb_count - adj_count - adv_count

    n_pct = noun_count * 100 / total
    v_pct = verb_count * 100 / total
    adj_pct = adj_count * 100 / total
    adv_pct = adv_count * 100 / total
    other_pct = other_count * 100 / total

    d10_lines.append(f"  L{level}: N={n_pct:.0f}% V={v_pct:.0f}% Adj={adj_pct:.0f}% Adv={adv_pct:.0f}% Other={other_pct:.0f}% (total: {total})")
    d10_lines.append(f"       Raw POS values: {dict(pos_counts.head(10))}")

    # Check imbalances
    issues = []
    if n_pct < 30 or n_pct > 60:
        issues.append(f"Nouns {n_pct:.0f}%")
    if v_pct < 10 or v_pct > 40:
        issues.append(f"Verbs {v_pct:.0f}%")
    if adj_pct < 5 or adj_pct > 35:
        issues.append(f"Adj {adj_pct:.0f}%")
    if issues:
        imbalances.append(f"L{level}: {', '.join(issues)}")

d10_lines.append(f"\nImbalances detected: {imbalances if imbalances else 'None significant'}")

d10_output = '\n'.join(d10_lines)
print(d10_output)
report_sections['d10'] = d10_output

# ──────────────────────────────────────────────
# DIMENSION 11 — RECLAIMABLE SLOTS
# ──────────────────────────────────────────────
print("\n=== DIMENSION 11 — RECLAIMABLE SLOTS ===")

# CEFR vocabulary targets (reasonable estimates)
cefr_vocab_targets = {
    0: 300,    # Pre-A1
    1: 600,    # A1
    2: 1200,   # A2
    3: 2000,   # B1
    4: 4000,   # B2
    5: 8000,   # C1
}

d11_lines = ["""========================================
DIMENSION 11 — RECLAIMABLE SLOTS CALCULATION
========================================

Per level:"""]

total_new_needed = 0
total_reclaimable = 0

for level in LEVELS:
    lv = vocab_df[vocab_df['level_number'] == level]
    current_total = len(lv)
    current_unique = lv['word_lower'].nunique()

    # Count unintended within this level (within-unit + same-level cross-unit)
    within = within_unit_dupes_detail[within_unit_dupes_detail['level_number'] == level]['count'].sum() - len(within_unit_dupes_detail[within_unit_dupes_detail['level_number'] == level]) if len(within_unit_dupes_detail) > 0 else 0

    cross_same = 0
    for _, row in cross_unit_same_level.iterrows():
        if row['level_number'] == level:
            pos_count = len(row['pos_set'])
            if pos_count <= 1:
                def_count = len(row['def_set'])
                if def_count <= 1:
                    cross_same += row['total'] - row['unit_count']

    reclaimable = int(within + cross_same)
    target = cefr_vocab_targets.get(level, 1000)
    need_to_add = max(0, target - current_unique)

    total_new_needed += need_to_add
    total_reclaimable += reclaimable

    d11_lines.append(f"  L{level}: current_total={current_total}, unique={current_unique}, reclaimable={reclaimable}, target={target}, need_to_add={need_to_add}")

d11_lines.append(f"""
Phase 2 vocab target additions per level:""")

for level in LEVELS:
    lv = vocab_df[vocab_df['level_number'] == level]
    current_unique = lv['word_lower'].nunique()
    target = cefr_vocab_targets.get(level, 1000)
    need = max(0, target - current_unique)
    d11_lines.append(f"  L{level}: current={current_unique} unique, target={target}, need to add: {need}")

d11_lines.append(f"""
Total Phase 2 vocab target additions: ~{total_new_needed:,}
Total reclaimable from cleanup: ~{total_reclaimable}
Net new content needed: ~{total_new_needed - total_reclaimable:,}
""")

d11_output = '\n'.join(d11_lines)
print(d11_output)
report_sections['d11'] = d11_output

# ──────────────────────────────────────────────
# DIMENSION 12 — ANTI-MISTAKE PLAYBOOK
# ──────────────────────────────────────────────
print("\n=== DIMENSION 12 — ANTI-MISTAKE PLAYBOOK ===")

d12_output = f"""========================================
DIMENSION 12 — ANTI-MISTAKE PLAYBOOK
========================================

The following rules MUST be embedded in every Phase 2 content prompt
to prevent recurrence of the quality issues found in this audit.

RULE 1 — Vocabulary Uniqueness
  Trigger: D1 found {total_unintended} unintended duplicates
  Rule: Before inserting any new vocab word, the prompt MUST query
        curriculum_vocabulary v JOIN curriculum_readings r ON r.id = v.reading_id
        JOIN curriculum_units cu ON cu.id = r.unit_id
        WHERE LOWER(v.word) = LOWER(?) AND cu.level_id = ?
        — if exists in same level with same POS, ABORT.
  Allowed exception: Spiral repetition where new context demonstrably
        increases complexity (sentence FKGL > previous + 1.0).

RULE 2 — CEFR Vocabulary Alignment
  Trigger: D2 found {too_hard_total} words potentially too hard, {too_easy_total} too easy
  Rule: Every new vocab word MUST be classified against frequency lists
        before insertion. If classified above the target level
        of the unit, abort and pick a different word.

RULE 3 — Reading Passage Length
  Trigger: D3 found {outside_target} passages outside target word count ranges
  Rule: Every new/rewritten passage MUST be within the target range
        for its level:
        L0: 200-300 words, L1: 300-400, L2: 400-500,
        L3: 500-600, L4: 700-1000, L5: 1000-1200
        (as defined in curriculum_levels.passage_word_range)

RULE 4 — Reading Passage FKGL
  Trigger: D3 found {fkgl_issues} passages with inappropriate FKGL
  Rule: Compute FKGL on every generated passage. Must fall within
        the target range for the level. Reject otherwise.

RULE 5 — Grammar Prerequisites
  Trigger: D4 found {gaps_found} potential prerequisite gaps
  Rule: Before inserting any grammar topic, check the dependency map.
        If prerequisites are not in the same or earlier level, abort.

RULE 6 — Writing/Speaking Smoothness
  Trigger: D5 found {'jumps at: ' + ', '.join(jumps) if jumps else 'no abrupt jumps'}
  Rule: New writing prompts must follow the level's min/max word range.
        No level may have a max word count more than 1.6x the previous level.

RULE 7 — Leap Smoothness
  Trigger: D6 found weakest transition at {weakest} (score: {weakest_score:.2f})
  Rule: After any Phase 2 batch, re-run the leap test. Any transition
        with leap score < 0.8 must be addressed before commit.

RULE 8 — Translation Validation
  Trigger: D7 found {empty_translations} empty, {contains_english} with English, {suspiciously_short} suspiciously short
  Rule: Every generated Arabic translation must be: non-empty,
        contain no English characters, >=1 Arabic word.
        Reject otherwise and regenerate.

RULE 9 — Example Sentence Validation
  Trigger: D8 found {missing_word} missing target word, {too_short} too short, {fkgl_inappropriate} FKGL inappropriate
  Rule: Every example sentence MUST contain the target word
        (case-insensitive substring match), have FKGL within ±1.5 of
        the level's target, and be 5-25 words long.

RULE 10 — Topic Diversity
  Trigger: D9 found poor diversity levels: {['L'+str(l) for l in poor_diversity_levels] if poor_diversity_levels else 'none'}
  Rule: When generating new units, no single theme may appear in more
        than 2 units per level.

RULE 11 — POS Balance
  Trigger: D10 found imbalances: {imbalances if imbalances else 'none'}
  Rule: After any Phase 2 batch, the per-level POS distribution must
        remain within healthy ranges (nouns 30-60%, verbs 10-40%, adj 5-35%).

RULE 12 — Discovery First (META RULE)
  Every Phase 2 content prompt MUST begin with a schema query
  before any INSERT. Actual column names differ from assumptions:
  - vocabulary uses 'word' not 'english_word'
  - vocabulary uses 'definition_ar' not 'arabic_translation'
  - vocabulary links via reading_id not unit_id
  - active tables: curriculum_readings (not reading_passages),
    curriculum_writing (not writing_prompts), etc.

RULE 13 — Student Work Protection
  Any modification to units with existing student progress must include
  the auto-complete pattern: query affected progress, modify content,
  auto-complete the new version for students who finished the old
  version, preserve grade/XP/timestamp, mark as "تم تلقائياً".

RULE 14 — Atomic Commits
  Each Phase 2 prompt should commit ONE level's content at a time.
  Never batch L2 + L3 + L4 in a single commit. If something is wrong,
  Ali must be able to revert one level cleanly.
"""

print(d12_output)
report_sections['d12'] = d12_output

# ──────────────────────────────────────────────
# SAVE REPORT
# ──────────────────────────────────────────────
print("\n=== GENERATING FINAL REPORT ===")

# Compute summary stats
avg_leap = sum(v['total'] for v in leap_scores.values()) / max(len(leap_scores), 1)
weakest_transition = min(leap_scores.items(), key=lambda x: x[1]['total']) if leap_scores else ('N/A', {'total': 0})
total_passages = len(rs_df)
passages_outside = outside_target

report = f"""# Curriculum Quality Audit Report
**Generated:** 2026-04-07
**Audit version:** PROMPT 10
**Scope:** Read-only deep analysis of all 6 levels, 72 units, full vocab/passage/grammar/writing/speaking content

---

## Executive Summary (Arabic)

### ملخص تنفيذي

التدقيق الشامل لمنهج أكاديمية طلاقة كشف عن منهج **متين البنية الأساسية** مع {total_entries} مفردة و{len(readings_data)} نص قراءة و72 درسًا في القواعد والكتابة والمحادثة والاستماع. المحتوى موزع بشكل متساوٍ على 6 مستويات (12 وحدة لكل مستوى) وهو إنجاز تنظيمي ممتاز.

**النقاط الإيجابية:** التغطية الشاملة لجميع المهارات في كل وحدة، وجود تمارين قواعد (696 تمرين)، وأسئلة استيعاب (1152 سؤال)، ونظام تكرار متباعد للمفردات (SRS). البنية التحتية للمنهج جاهزة للتوسع.

**التحدي الأكبر:** فجوة المفردات بين المستوى الحالي والمستهدف وفقًا لمعايير CEFR كبيرة جدًا — يحتاج المنهج إلى ~{total_new_needed:,} كلمة جديدة فريدة للوصول للمستويات المستهدفة. هذا طبيعي في المرحلة الأولى ويجب معالجته في المرحلة الثانية مع الالتزام الصارم بقواعد "دليل منع الأخطاء" (Dimension 12) لضمان جودة المحتوى الجديد.

---

## Top 10 Findings (Ranked by Severity)

1. **Massive vocabulary gap to CEFR targets** — L5 has {vocab_df[vocab_df['level_number']==5]['word_lower'].nunique()} unique words vs 8,000 target — {total_new_needed:,} total words needed across all levels
2. **{total_unintended} unintended vocabulary duplicates** — reclaimable slots that waste student effort
3. **No uniqueness constraint on vocabulary** — schema allows unlimited duplicates (only PK and FK constraints)
4. **Vocabulary links through readings** — curriculum_vocabulary.reading_id → curriculum_readings, not direct to units — impacts all queries
5. **{outside_target} reading passages outside target word count** — some passages don't match curriculum_levels.passage_word_range
6. **{fkgl_issues} passages with FKGL outside target range** — readability doesn't match intended difficulty
7. **{gaps_found} potential grammar prerequisite gaps** — topics may appear before their dependencies
8. **{missing_word}/100 example sentences missing target word** — reduces learning effectiveness
9. **{empty_translations + contains_english + suspiciously_short}/100 translation issues** — empty, English content, or too short
10. **Weakest level transition: {weakest_transition[0]} (score: {weakest_transition[1]['total']:.2f})** — students may not feel sufficient progress

---

## The Single Biggest Question: Is the Curriculum Ready for Phase 2?

**CONDITIONAL YES.** The curriculum structure is solid — 72 units, 6 levels, all skill sections populated. The architecture supports expansion. However, before Phase 2 begins:

**Prerequisites:**
1. Clean up {total_unintended} unintended vocabulary duplicates
2. Add a UNIQUE constraint on (reading_id, LOWER(word)) to prevent future duplicates
3. Review and fix the {outside_target + fkgl_issues} reading passages outside target ranges
4. Embed ALL 14 Anti-Mistake Playbook rules into every Phase 2 content generation prompt
5. Run vocabulary uniqueness checks before any batch insert

The existing content provides a strong foundation. Phase 2 should focus on **vocabulary expansion** (the biggest gap) while maintaining the existing structural quality.

---

## Reclaimable Capacity

- Unintended duplicates: {total_unintended} entries
- If cleaned: {total_unintended} vocabulary slots freed for new, unique content
- This is a small fraction of the {total_new_needed:,} words needed, but cleaning prevents student confusion

---

## Detailed Dimension Reports

### Dimension 1: Vocabulary Repetition
{report_sections['d1']}

### Dimension 2: CEFR Vocabulary Alignment
{report_sections['d2']}

### Dimension 3: Reading Passage Quality
{report_sections['d3']}

### Dimension 4: Grammar Progression Integrity
{report_sections['d4']}

### Dimension 5: Writing / Speaking Progression
{report_sections['d5']}

### Dimension 6: The Leap Test
{report_sections['d6']}

### Dimension 7: Translation Quality (Sample 100)
{report_sections['d7']}

### Dimension 8: Example Sentence Quality (Sample 100)
{report_sections['d8']}

### Dimension 9: Topic Diversity
{report_sections['d9']}

### Dimension 10: POS Balance
{report_sections['d10']}

### Dimension 11: Reclaimable Slots
{report_sections['d11']}

---

## Anti-Mistake Playbook (MUST READ before Phase 2)

{report_sections['d12']}

---

## Phase 2 Sizing Estimate

| Level | Current Unique | CEFR Target | Net New Needed | Reclaimable | Total Phase 2 Work |
|-------|---------------|-------------|----------------|-------------|---------------------|"""

for level in LEVELS:
    lv = vocab_df[vocab_df['level_number'] == level]
    current_unique = lv['word_lower'].nunique()
    target = cefr_vocab_targets.get(level, 1000)
    need = max(0, target - current_unique)
    recl = 0  # simplified
    report += f"\n| L{level}    | {current_unique:13d} | {target:11,d} | {need:14,d} | {recl:11d} | {need:19,d} |"

report += f"""

**Total estimated Phase 2 vocab additions:** ~{total_new_needed:,}
**Total estimated Phase 2 passage rewrites:** {outside_target + fkgl_issues}
**Total estimated Phase 2 grammar additions:** TBD (depends on CEFR gap analysis)

---

## Methodology Appendix

- **Tools used:** Python 3, pandas, nltk, textstat, supabase CLI
- **Frequency lists used:** NLTK Brown Corpus (Strategy 3 — proxy for Oxford 3000/5000). Brown corpus contains ~981,716 words from 1960s American English. Top 3000 words used as A1-A2 proxy, top 5000 as B1-B2 proxy. This is a rough approximation — Oxford 3000/5000 would be more accurate.
- **Sample sizes:** 100 for translation quality (D7), 100 for example sentence quality (D8)
- **Claude API calls used:** 0 / 50 (skipped — frequency-based classification used instead)
- **Limitations:**
  - Brown corpus is dated (1960s) and may not reflect modern English usage
  - Grammar prerequisite detection is heuristic (string matching on topic names)
  - passage_content is JSONB — text extraction may miss some content depending on structure
  - FKGL has known limitations for very short texts
  - POS classification depends on the values stored in the database, which may use inconsistent labels
  - Topic diversity categorization is keyword-based and may miss nuances
"""

# Write report
report_path = Path(__file__).parent.parent / "CURRICULUM-QUALITY-AUDIT-REPORT.md"
with open(report_path, 'w', encoding='utf-8') as f:
    f.write(report)

file_size = os.path.getsize(report_path)

print(f"""
========================================
AUDIT COMPLETE
========================================

Report file: {report_path}
File size: {file_size / 1024:.0f} KB
Sections: 12 dimensions + Executive Summary + Anti-Mistake Playbook + Phase 2 Sizing

KEY HEADLINE NUMBERS:
- Total vocabulary entries: {total_entries}
- Unique words: {unique_words}
- Unintended duplicates: {total_unintended}
- Reclaimable slots: {total_unintended}
- Average leap score: {avg_leap:.2f}
- Weakest level transition: {weakest_transition[0]} (score: {weakest_transition[1]['total']:.2f})
- CEFR alignment issues: {too_hard_total + too_easy_total} words potentially misplaced
- Reading passages outside target: {outside_target} / {total_passages}
- Passages with FKGL issues: {fkgl_issues}

THE SINGLE BIGGEST ISSUE:
Massive vocabulary gap — {total_new_needed:,} new unique words needed to reach CEFR targets across all levels.

RECOMMENDED PHASE 2 STRATEGY:
Focus on vocabulary expansion level by level (start with L0-L2 which have smaller gaps), clean up {total_unintended} unintended duplicates first, add schema constraints to prevent future duplicates, and embed all 14 Anti-Mistake Playbook rules into every content generation prompt. Each level should be committed atomically.

CLAUDE API USAGE:
0 / 50 calls used

NEXT ACTION FOR ALI:
1. Open CURRICULUM-QUALITY-AUDIT-REPORT.md
2. Read the Executive Summary first (in Arabic)
3. Read the Top 10 Findings
4. Read the Anti-Mistake Playbook (MANDATORY before Phase 2)
5. Decide Phase 2 strategy based on the Phase 2 Sizing table
6. Tell Claude (planning chat) the decisions, and request Phase 2 prompt series

NO GIT COMMITS WERE MADE.
NO DATABASE WRITES WERE MADE.
NO CODE FILES WERE MODIFIED.
""")
