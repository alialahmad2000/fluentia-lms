# IELTS-S2: Speaking — Part 3 (Abstract Discussion Questions)
# Instruction: Read and execute prompts/IELTS-S2.md

---

## BEFORE YOU START
```bash
cd "C:\Users\Dr. Ali\Desktop\fluentia-lms"
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function check() {
  const { data } = await supabase.from('ielts_speaking_questions').select('id, part');
  console.log('Existing questions:', data?.length);
  const parts = {};
  data?.forEach(q => { parts[q.part] = (parts[q.part] || 0) + 1; });
  console.log('By part:', parts);
  const { data: s } = await supabase.from('ielts_speaking_questions').select('*').limit(1);
  if (s?.[0]) console.log('Columns:', Object.keys(s[0]));
}
check();
"
```

⚠️ Use ACTUAL column names. Part 1 + Part 2 should exist from IELTS-S1. Add Part 3 only.

## YOUR TASK

Generate **20 Part 3 discussion question sets** — linked to the 20 Part 2 cue cards.

Part 3 = 4-5 minutes of abstract discussion. Examiner asks deeper questions related to Part 2 topic. Student gives extended answers with opinions, examples, and analysis.

### 20 Discussion Sets (4-5 questions each):

1. **Education & Teachers** (linked to: teacher who influenced you)
   - Role of teachers vs technology in education
   - How teaching methods have changed
   - Should education be standardized globally?

2. **Travel & Tourism** (linked to: place you visited)
   - Impact of tourism on local communities
   - Responsible travel
   - Virtual tourism vs real travel

3. **Reading & Media** (linked to: book you enjoyed)
   - Future of physical books
   - How reading habits have changed
   - Social media vs traditional media for news

4. **Culture & Traditions** (linked to: celebration you attended)
   - Preserving traditions in modern world
   - Globalization and cultural identity
   - Should traditions evolve?

5. **Learning & Skills** (linked to: skill you learned)
   - Formal education vs self-learning
   - Most important skills for the future
   - Should schools teach practical skills?

6. **Role Models & Influence** (linked to: person you admire)
   - Who influences young people today?
   - Celebrity culture — positive or negative?
   - Qualities of good leaders

7. **Planning & Expectations** (linked to: trip that didn't go as planned)
   - Importance of planning vs spontaneity
   - How people deal with unexpected situations
   - Can failure be beneficial?

8. **Technology & Society** (linked to: technology you use daily)
   - Technology addiction
   - AI and the future of work
   - Digital divide between generations

9. **Helping Others** (linked to: time you helped someone)
   - Volunteering in society
   - Should helping others be mandatory?
   - Individual vs government responsibility

10. **Childhood & Memory** (linked to: childhood memory)
    - How childhood shapes personality
    - Are children today different from past generations?
    - Role of play in child development

11. **Architecture & Design** (linked to: interesting building)
    - Modern vs traditional architecture
    - How buildings affect people's mood
    - Sustainable building design

12. **Entertainment & Media** (linked to: movie/show you recommend)
    - Influence of media on society
    - Should content be censored?
    - Local vs international entertainment

13. **Decision Making** (linked to: difficult decision)
    - Who should make major life decisions?
    - Age and wisdom in decision making
    - Rational vs emotional decisions

14. **Gift Giving** (linked to: gift you gave/received)
    - Materialism in modern society
    - Cultural differences in gift giving
    - Is it better to give experiences or objects?

15. **Relaxation & Wellbeing** (linked to: place where you relax)
    - Work-life balance
    - Stress in modern life
    - Mental health awareness

16. **Learning from Mistakes** (linked to: learning from a mistake)
    - How societies learn from historical mistakes
    - Risk-taking in business/education
    - Punishment vs rehabilitation

17. **Health & Lifestyle** (linked to: activity for health)
    - Government's role in public health
    - Prevention vs treatment
    - Health education in schools

18. **Friendship & Relationships** (linked to: important friend)
    - Online friendships vs face-to-face
    - How relationships change with age
    - Community and belonging

19. **Goals & Ambition** (linked to: goal you want to achieve)
    - Pressure to succeed in modern society
    - Work satisfaction vs high salary
    - How goals differ across cultures

20. **Pride & Achievement** (linked to: time you felt proud)
    - What makes a society proud?
    - Individual vs collective achievement
    - How recognition affects motivation

### For EACH question set provide:
- **Topic theme** (English + Arabic)
- **Linked Part 2 cue card** (reference number)
- **4-5 discussion questions** (progressive difficulty: concrete → abstract)
- **Model answer outlines**: key points for each question
- **Advanced vocabulary**: 8-10 words to demonstrate C1 level
- **Grammar structures**: conditionals, passive, complex sentences
- **Useful phrases**: for giving opinions, comparing, speculating
- **Arabic examiner tips**: نصائح للإجابة بالعربي

## RULES
- Questions should require ANALYSIS not just description
- Progressive difficulty within each set
- Culturally appropriate — avoid sensitive political/religious debates
- Language should push students to B2-C1 level

## AFTER COMPLETION
```bash
node -e "
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function v() {
  const { data } = await supabase.from('ielts_speaking_questions').select('id, part');
  const parts = {}; data?.forEach(q => { parts[q.part] = (parts[q.part] || 0) + 1; });
  console.log('Total speaking:', data?.length, '(target: ~140)');
  console.log('By part:', parts);
}
v();
"
git add -A && git commit -m "feat(ielts): generate Speaking Part 3 — 20 discussion sets — SPEAKING COMPLETE" && git push origin main
```

**STOP after this.**
