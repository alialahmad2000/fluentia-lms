#!/usr/bin/env python3
"""
PROMPT 13 — L0 Reading Passage Rewrites
Rewrites all 24 L0 passages to meet Pre-A1 targets.
Outputs SQL UPDATE statements for each unit.
"""
import json, re, sys, os, subprocess
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).parent.parent
CLEANUP = ROOT / "PHASE-2-CLEANUP"

# ── Load allowlist ─────────────────────────────────────────────────────────
with open(CLEANUP / "L0-vocab-allowlist.json", "r", encoding="utf-8") as f:
    allowlist_data = json.load(f)

allowed_words = set(allowlist_data["combined"])

# ── Load schema cache ──────────────────────────────────────────────────────
with open(CLEANUP / "13-L0-schema-cache.json", "r", encoding="utf-8") as f:
    schema = json.load(f)

UNITS = schema["units"]

# ── Load readings data ─────────────────────────────────────────────────────
def load_supabase_json(path):
    raw = Path(path).read_text(encoding="utf-8")
    idx = raw.find("{")
    if idx > 0:
        raw = raw[idx:]
    data = json.loads(raw)
    return data.get("rows", data) if isinstance(data, dict) else data

all_readings = load_supabase_json(ROOT / "audit-scripts" / "data" / "readings_full.json")
l0_readings = [r for r in all_readings if r.get("level_number") == 0]
print(f"L0 readings: {len(l0_readings)}")

# Group by unit
readings_by_unit = defaultdict(list)
for r in l0_readings:
    readings_by_unit[r["unit_id"]].append(r)

# ── Analysis functions ─────────────────────────────────────────────────────
def count_syllables(word):
    word = word.lower().strip()
    if len(word) <= 2:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in word:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    # Silent e
    if word.endswith("e") and count > 1:
        count -= 1
    return max(count, 1)

def analyze_passage(text, word_str=None):
    """Analyze passage text and return metrics."""
    # Clean markdown
    clean = re.sub(r'\*+', '', text)
    words = re.findall(r"[A-Za-z']+", clean)
    word_count = len(words)
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', clean.strip()) if s.strip()]
    sentence_count = max(len(sentences), 1)
    avg_sent_len = word_count / sentence_count

    syllables = sum(count_syllables(w) for w in words)
    fkgl = 0.39 * (word_count / sentence_count) + 11.8 * (syllables / word_count) - 15.59

    oov = [w.lower() for w in words if w.lower() not in allowed_words]
    oov_unique = sorted(set(oov))
    oov_pct = len(oov) / max(word_count, 1) * 100

    # Check targets
    wc_ok = 70 <= word_count <= 160  # hard limits
    fkgl_ok = 0.0 <= fkgl <= 3.0     # hard limits (target vocab has multi-syllable words)
    sent_ok = avg_sent_len <= 12      # hard limit
    oov_ok = len(oov) == 0

    passes = wc_ok and fkgl_ok and sent_ok and oov_ok

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sent_len": round(avg_sent_len, 1),
        "fkgl": round(fkgl, 2),
        "oov_words": oov_unique,
        "oov_pct": round(oov_pct, 1),
        "passes": passes,
        "wc_ok": wc_ok,
        "fkgl_ok": fkgl_ok,
        "sent_ok": sent_ok,
        "oov_ok": oov_ok,
    }

# ── Load pre-written L0 passages ──────────────────────────────────────────
with open(ROOT / "audit-scripts" / "13_L0_passages.json", "r", encoding="utf-8") as f:
    _raw_passages = json.load(f)
L0_PASSAGES = {int(k): v for k, v in _raw_passages.items()}

# Old inline passages removed — now loaded from 13_L0_passages.json
_OLD_REMOVED = {
    0: {
        "A": {
            "title_en": "A Day in Riyadh",
            "paragraphs": [
                "Riyadh is a big *capital* city. Many people live here. Every *morning*, they wake up and start the day. Some people drive to work. Other people take the bus.",
                "The *streets* are busy in the morning. You can see many cars and *buildings*. People go to *shops* and *restaurants* for *lunch*. The food is very good.",
                "In the *evening*, the city is beautiful. Families go to *parks* and walk together. Children play and have fun. Life in Riyadh is *interesting* every day."
            ]
        },
        "B": {
            "title_en": "Morning Routines Around the World",
            "paragraphs": [
                "People around the world have different *morning* *routines*. In *Saudi Arabia*, many people wake up early. They eat *breakfast* and drink tea or *coffee*.",
                "Some people *exercise* in the morning. They run or walk in the *park*. Other people read or *study* before work. A good morning *routine* helps you feel happy.",
                "Every person has a different day. Some people work in an *office*. Others work at *home*. But a good *morning* start is important for everyone."
            ]
        }
    },
    2: {
        "A": {
            "title_en": "Food in Saudi Arabia",
            "paragraphs": [
                "Saudi food is very *delicious*. People eat *rice* and *meat* for many meals. *Kabsa* is a famous *dish*. It has rice, meat, and many *spices*.",
                "For *breakfast*, people eat *bread* and cheese. They drink *coffee* or tea. Some families eat *eggs* and *vegetables* too.",
                "Many people like to *cook* at home. Others go to *restaurants*. Eating together with family is very important in *Saudi* *culture*."
            ]
        },
        "B": {
            "title_en": "Cooking at Home",
            "paragraphs": [
                "Cooking at *home* is fun. First, you need to buy *ingredients* from the *shop*. You need *vegetables*, *meat*, and *spices*.",
                "Then you *prepare* the food. You wash the vegetables and cut them. You cook the *meat* with *spices*. The *kitchen* smells very good.",
                "Finally, the food is ready. You put it on a *plate* and eat. Cooking for your *family* makes everyone happy."
            ]
        }
    },
    3: {
        "A": {
            "title_en": "My City",
            "paragraphs": [
                "I live in a *city*. My city has many *buildings* and *streets*. There are *shops*, *restaurants*, and *parks*. The *market* is very busy every day.",
                "In the morning, people go to work and school. The *streets* have many cars and buses. Some people walk to the *shops* near their *home*.",
                "I like my city very much. It is a *beautiful* place to live. There are many things to see and do here."
            ]
        },
        "B": {
            "title_en": "Getting Around the City",
            "paragraphs": [
                "There are many ways to move around the *city*. Some people drive their *cars*. Others take the bus or *taxi*.",
                "The *streets* can be busy. In the morning, many people go to work. The *traffic* is slow. It is good to leave home early.",
                "Some people like to walk. Walking is good for your body. You can see the *buildings* and *shops* when you walk. It is a nice way to see the city."
            ]
        }
    },
    4: {
        "A": {
            "title_en": "Animals Around Us",
            "paragraphs": [
                "*Animals* are everywhere. Some animals live in *homes* with people. *Cats* and *dogs* are *popular* *pets*. People take care of them every day.",
                "Other animals live outside. *Birds* fly in the sky. *Fish* swim in the water. You can see many animals in a *park* or a *garden*.",
                "Animals are very important. They help people in many ways. Some people work with animals. It is fun to learn about *different* animals."
            ]
        },
        "B": {
            "title_en": "Life on a Farm",
            "paragraphs": [
                "A *farm* has many animals. *Chickens* give us *eggs*. *Cows* give us *milk*. The *farmer* takes care of all the animals every day.",
                "The farmer wakes up very early in the morning. He gives food and water to the animals. The farm is a busy place.",
                "Children like to visit *farms*. They see the animals and play outside. A farm is a good place to learn about *nature* and animals."
            ]
        }
    },
    5: {
        "A": {
            "title_en": "Weather and Seasons",
            "paragraphs": [
                "The *weather* changes every day. Sometimes it is *hot* and *sunny*. Sometimes it is *cold* and *cloudy*. The weather is different in each *season*.",
                "In *summer*, it is very hot. People drink a lot of *water*. They stay inside when it is too hot. In *winter*, it is *cool* and sometimes it *rains*.",
                "Many people like *spring*. The weather is nice and the flowers are *beautiful*. It is a good time to go outside and enjoy *nature*."
            ]
        },
        "B": {
            "title_en": "A Rainy Day",
            "paragraphs": [
                "Today the weather is *rainy*. The sky is *gray* and *cloudy*. People carry *umbrellas* when they go outside.",
                "On rainy days, many people stay at home. They read books or watch TV. Some people drink *hot* tea or coffee. It feels warm and nice inside.",
                "Children like the *rain*. They play in the water and have fun. After the rain stops, the air smells *fresh*. A rainy day can be a good day."
            ]
        }
    },
    6: {
        "A": {
            "title_en": "My Family",
            "paragraphs": [
                "I have a big *family*. My *father* works in an office. My *mother* stays at home. I have two *brothers* and one *sister*.",
                "We eat *dinner* together every night. My mother *cooks* very good food. We talk about our day. It is my *favorite* time.",
                "On the weekend, we visit our *grandparents*. They live near us. We play games and eat food together. I love my family very much."
            ]
        },
        "B": {
            "title_en": "Friends at School",
            "paragraphs": [
                "I have many *friends* at *school*. We *study* together and play together. My best friend is very *kind* and funny.",
                "At school, we learn many things. We read *books* and write in our *notebooks*. Our *teacher* helps us every day. I like my school.",
                "After school, I sometimes visit my friends. We eat food and play games. Good *friends* make life happy and fun."
            ]
        }
    },
    7: {
        "A": {
            "title_en": "Going Shopping",
            "paragraphs": [
                "I like to go *shopping*. There are many *shops* in my city. Some shops sell *clothes*. Other shops sell food and *drinks*.",
                "When I go shopping, I look at the *prices*. Some things are *cheap* and some are *expensive*. I always try to save *money*.",
                "Shopping with my family is fun. We buy things we need for the *home*. Sometimes we buy *gifts* for friends. Shopping is a nice way to spend the day."
            ]
        },
        "B": {
            "title_en": "Money and Saving",
            "paragraphs": [
                "*Money* is important in our life. We use money to buy food, *clothes*, and other things. People work to get money.",
                "It is good to *save* money. You can put money in a *bank*. When you save money, you can buy big things later.",
                "Some people spend a lot of money. It is better to think before you buy. Ask: Do I really need this? Saving money helps you in the *future*."
            ]
        }
    },
    8: {
        "A": {
            "title_en": "Staying Healthy",
            "paragraphs": [
                "Good *health* is very important. You need to eat *healthy* food every day. *Vegetables* and *fruit* are good for your *body*.",
                "You also need to *exercise*. Walking, running, and playing *sports* help your body stay strong. Try to exercise for thirty minutes every day.",
                "Sleeping is important too. Your body needs *rest*. Try to sleep eight hours every night. Eat well, exercise, and sleep well to stay *healthy*."
            ]
        },
        "B": {
            "title_en": "At the Doctor",
            "paragraphs": [
                "Sometimes we feel *sick*. We go to the *doctor* for help. The doctor asks questions about how you feel.",
                "The *doctor* checks your body. She looks at your eyes and ears. She may give you *medicine* to help you feel better.",
                "It is important to visit the doctor every year. The doctor helps you stay *healthy*. Do not be afraid to go to the doctor."
            ]
        }
    },
    9: {
        "A": {
            "title_en": "Fun Hobbies",
            "paragraphs": [
                "Everyone has *hobbies*. Hobbies are things you like to do in your free time. Some people like to read *books*. Others like to play *sports*.",
                "I like to draw and *paint*. It is fun to make *pictures* with many colors. My friend likes to *play* music. She plays the *piano*.",
                "Hobbies make you happy. They help you rest after a long day. Try to find a hobby you love."
            ]
        },
        "B": {
            "title_en": "A Day at the Park",
            "paragraphs": [
                "The *park* is a nice place to visit. There are many trees and flowers. People come to the park to walk and play.",
                "Children run and play with *balls*. Some people sit and read books. Others have a *picnic* with their family. The park is a happy place.",
                "I go to the park every weekend. I walk and enjoy the *fresh* air. Sometimes I meet my friends there. The park is my favorite place."
            ]
        }
    },
    10: {
        "A": {
            "title_en": "Going on a Trip",
            "paragraphs": [
                "Traveling is very fun. You can visit new places and see new things. Some people travel by *plane*. Others travel by *car* or *train*.",
                "Before you travel, you need to *prepare*. You pack your *clothes* and other things in a bag. You also need your *passport* and *ticket*.",
                "When you *arrive* at a new place, everything is *different*. The food, the people, and the *weather* may be new. Traveling helps you learn about the world."
            ]
        },
        "B": {
            "title_en": "At the Airport",
            "paragraphs": [
                "The *airport* is a big and busy place. Many people come here to travel to other cities and *countries*.",
                "First, you go to the *check-in* desk. You show your *passport* and *ticket*. Then you wait at the gate for your *plane*.",
                "When the plane is ready, you get on. You find your *seat* and sit down. The plane goes up into the sky. You are on your way!"
            ]
        }
    },
    11: {
        "A": {
            "title_en": "Technology in Our Lives",
            "paragraphs": [
                "*Technology* is everywhere today. We use *phones* and *computers* every day. They help us talk to people and find *information*.",
                "The *internet* is very useful. You can read the news, watch *videos*, and learn new things. Many people use *apps* on their phones.",
                "Technology helps us a lot. But it is also good to take a break. Spend time with your family and go outside. Use technology in a good way."
            ]
        },
        "B": {
            "title_en": "Phones and Communication",
            "paragraphs": [
                "Everyone has a *phone* today. We use phones to call and send *messages*. We also use phones to take *photos* and watch videos.",
                "*Social* *media* is very *popular*. People share pictures and talk to friends. You can connect with people from other *countries*.",
                "Phones are very useful, but be *careful*. Do not use your phone too much. It is important to talk to people face to face too."
            ]
        }
    },
    12: {
        "A": {
            "title_en": "Different Jobs",
            "paragraphs": [
                "There are many *jobs* in the world. Some people are *teachers*. They help children learn. Other people are *doctors*. They help *sick* people feel better.",
                "Some people work in *offices*. They use *computers* and write *reports*. Others work outside. *Farmers* grow food and take care of animals.",
                "Every job is important. People work to help others and to make money. What job do you want in the *future*?"
            ]
        },
        "B": {
            "title_en": "My Dream Job",
            "paragraphs": [
                "I think about my *future* job a lot. I want to help people. Maybe I will be a *doctor* or a *teacher*.",
                "My father says I should *study* hard. Good *education* helps you get a good job. I study every day after *school*.",
                "In the future, there will be many new jobs. Some jobs will use new *technology*. I want to be ready for the future."
            ]
        }
    },
}

# ── Analyze all new passages ──────────────────────────────────────────────
print(f"\n{'='*60}")
print("ANALYZING NEW L0 PASSAGES")
print(f"{'='*60}\n")

progress_log = []
all_pass = True
sql_updates = []

for unit in UNITS:
    unit_num = unit["num"]
    unit_id = unit["id"]
    theme = unit["theme"]

    if unit_num not in L0_PASSAGES:
        print(f"[L0-U{unit_num:02d}] NO REWRITE DATA — SKIP")
        continue

    print(f"\n[L0-U{unit_num:02d}] {theme}")

    # Get current readings for this unit
    unit_readings = readings_by_unit.get(unit_id, [])
    unit_readings.sort(key=lambda r: r.get("reading_label", ""))

    for reading in unit_readings:
        label = reading.get("reading_label", "?")
        rid = reading["id"]

        if label not in L0_PASSAGES[unit_num]:
            print(f"  Reading {label} (id {rid[:8]}): no rewrite — SKIP")
            continue

        new_data = L0_PASSAGES[unit_num][label]
        new_text = " ".join(new_data["paragraphs"])
        # Strip asterisks for analysis
        metrics = analyze_passage(new_text)

        status = "PASS" if metrics["passes"] else "FAIL"
        if not metrics["passes"]:
            all_pass = False

        print(f"  Reading {label} (id {rid[:8]}): wc={metrics['word_count']} fkgl={metrics['fkgl']} "
              f"asl={metrics['avg_sent_len']} oov={metrics['oov_pct']}% -> {status}")

        if metrics["oov_words"]:
            print(f"    OOV: {metrics['oov_words'][:10]}")

        # Build passage_content JSON
        passage_json = json.dumps({"paragraphs": new_data["paragraphs"]}, ensure_ascii=False)

        sql_updates.append({
            "unit_num": unit_num,
            "reading_id": rid,
            "label": label,
            "title": new_data.get("title_en", reading.get("title_en", "")),
            "passage_json": passage_json,
            "word_count": metrics["word_count"],
            "metrics": metrics,
        })

        progress_log.append(
            f"[L0-U{unit_num:02d}] {theme}\n"
            f"  Reading {label} (id {rid}): rewritten | wc={metrics['word_count']} "
            f"fkgl={metrics['fkgl']} oov={len(metrics['oov_words'])}"
        )

# ── Save progress log ─────────────────────────────────────────────────────
with open(CLEANUP / "13-L0-progress.log", "w", encoding="utf-8") as f:
    f.write("\n".join(progress_log))
print(f"\nProgress log saved: {len(progress_log)} entries")

# ── Save SQL updates as JSON for execution ────────────────────────────────
with open(CLEANUP / "13-L0-updates.json", "w", encoding="utf-8") as f:
    json.dump(sql_updates, f, ensure_ascii=False, indent=2)
print(f"SQL updates saved: {len(sql_updates)} passages to update")

if not all_pass:
    print("\nWARNING: Some passages failed metrics! Review OOV words above.")
else:
    print("\nOK: All passages pass targets!")

# Print summary
print(f"\n{'='*60}")
print("SUMMARY")
print(f"{'='*60}")
print(f"Total passages to update: {len(sql_updates)}")
print(f"All metrics pass: {all_pass}")
