# IELTS-S1: Speaking — Part 1 + Part 2 (Personal Topics + Cue Cards)
# Instruction: Read and execute prompts/IELTS-S1.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from('ielts_speaking_questions').select('*').limit(1);
  console.log('Existing questions:', data?.length);
  if (data?.[0]) console.log('Columns:', Object.keys(data[0]));
  else {
    const { error } = await supabase.from('ielts_speaking_questions').select('id');
    console.log('Table:', error ? error.message : 'exists but empty');
  }
}
check();
"
```

⚠️ Use ACTUAL column names.

## YOUR TASK

### Part 1: Generate 20 Topic Sets (4 questions each = 80 questions)

Part 1 = 4-5 minutes of simple personal questions. Examiner asks, student answers 2-3 sentences.

Topics:
1. Home/accommodation
2. Work/studies
3. Hometown
4. Family
5. Friends
6. Daily routine
7. Food and cooking
8. Weather and seasons
9. Shopping
10. Transportation
11. Music
12. Reading
13. Sports and exercise
14. Technology/phones
15. Holidays/vacations
16. Languages
17. Hobbies
18. Clothes/fashion
19. Health
20. Social media

For EACH topic set provide:
- **Topic name** (English + Arabic)
- **4 questions** (simple, personal, present tense mostly)
- **Sample answers**: brief model response for each (2-3 sentences)
- **Useful vocabulary**: 5 key words/phrases
- **Grammar to demonstrate**: what grammar the examiner is looking for
- **Arabic tip**: نصيحة بالعربي

### Part 2: Generate 20 Cue Cards

Part 2 = 1 minute preparation + 2 minutes speaking. Student receives a card with a topic and 3-4 bullet points.

Cue Cards:
1. Describe a teacher who influenced you
2. Describe a place you visited recently
3. Describe a book you enjoyed reading
4. Describe a celebration/festival you attended
5. Describe a skill you learned recently
6. Describe a person you admire
7. Describe a trip that didn't go as planned
8. Describe a piece of technology you use daily
9. Describe a time you helped someone
10. Describe your favorite childhood memory
11. Describe a building you find interesting
12. Describe a movie/show you recommend
13. Describe a time you had to make a difficult decision
14. Describe a gift you gave or received
15. Describe a place where you feel relaxed
16. Describe a time you learned something from a mistake
17. Describe an activity you do to stay healthy
18. Describe a friend who is important to you
19. Describe a goal you want to achieve
20. Describe a time you felt proud of yourself

For EACH cue card provide:
- **Topic**: "Describe a..." prompt
- **Bullet points**: 3-4 things to include (You should say: ...)
- **Preparation tips**: what to note in the 1 minute (Arabic)
- **Model answer outline**: structured 2-minute response plan
- **Useful phrases**: 6-8 phrases for this specific topic
- **Vocabulary**: 8-10 words to demonstrate range
- **Grammar structures**: 3-4 structures to use (past narratives, conditionals, etc.)
- **Common mistakes for Arabic speakers**: 2-3 specific errors

## RULES
- Topics ORIGINAL — not copied from any IELTS prep book
- Culturally appropriate for Saudi students (18-34, mostly women)
- Part 1 questions should be answerable by any student
- Part 2 cue cards should allow personal, relatable responses
- No controversial topics

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() { const { data } = await supabase.from('ielts_speaking_questions').select('id, part'); console.log('Speaking questions:', data?.length); }
v();
"
git add -A && git commit -m "feat(ielts): generate Speaking Part 1 (20 topics) + Part 2 (20 cue cards)" && git push origin main
```

**STOP after this.**
