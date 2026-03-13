-- ============================================================
-- 017: Weekly Task System + Spelling Trainer
-- ============================================================

-- Weekly task sets (one per student per week)
CREATE TABLE IF NOT EXISTS weekly_task_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  week_start date NOT NULL,
  week_end date NOT NULL,
  level_at_generation integer NOT NULL,
  total_tasks integer DEFAULT 8,
  completed_tasks integer DEFAULT 0,
  completion_percentage numeric DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active','completed','expired','partial')),
  generated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, week_start)
);

-- Individual weekly tasks
CREATE TABLE IF NOT EXISTS weekly_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_set_id uuid REFERENCES weekly_task_sets(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES students(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('speaking','reading','writing','listening','irregular_verbs')),
  sequence_number integer NOT NULL,

  title text NOT NULL,
  title_ar text,
  instructions text NOT NULL,
  instructions_ar text,

  content jsonb NOT NULL DEFAULT '{}',

  level integer NOT NULL,
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  points integer DEFAULT 10,
  deadline timestamptz NOT NULL,

  status text DEFAULT 'pending' CHECK (status IN ('pending','submitted','graded','resubmit_requested','skipped')),
  submitted_at timestamptz,

  response_text text,
  response_voice_url text,
  response_voice_duration integer,
  response_voice_transcript text,
  response_answers jsonb,
  response_file_urls jsonb,

  auto_score numeric,
  ai_feedback jsonb,
  ai_feedback_generated_at timestamptz,
  trainer_grade text,
  trainer_grade_numeric integer,
  trainer_feedback text,
  trainer_graded_at timestamptz,
  trainer_graded_by uuid REFERENCES profiles(id),

  xp_awarded integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Irregular verbs master list
CREATE TABLE IF NOT EXISTS irregular_verbs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_form text NOT NULL UNIQUE,
  past_simple text NOT NULL,
  past_participle text NOT NULL,
  meaning_ar text NOT NULL,
  example_sentence text,
  frequency_rank integer,
  level_appropriate integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Student verb progress
CREATE TABLE IF NOT EXISTS student_verb_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  verb_id uuid REFERENCES irregular_verbs(id) NOT NULL,
  times_tested integer DEFAULT 0,
  times_correct integer DEFAULT 0,
  mastery text DEFAULT 'new' CHECK (mastery IN ('new','learning','familiar','mastered')),
  last_tested_at timestamptz,
  UNIQUE(student_id, verb_id)
);

-- Spelling word bank
CREATE TABLE IF NOT EXISTS spelling_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word text NOT NULL UNIQUE,
  meaning_ar text NOT NULL,
  meaning_en text,
  phonetic text,
  difficulty integer DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  level_appropriate integer DEFAULT 1,
  common_misspellings text[],
  category text,
  created_at timestamptz DEFAULT now()
);

-- Student spelling progress
CREATE TABLE IF NOT EXISTS student_spelling_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  word_id uuid REFERENCES spelling_words(id) NOT NULL,
  times_tested integer DEFAULT 0,
  times_correct integer DEFAULT 0,
  accuracy_rate numeric DEFAULT 0,
  mastery text DEFAULT 'new' CHECK (mastery IN ('new','learning','familiar','mastered')),
  last_wrong_spelling text,
  last_tested_at timestamptz,
  UNIQUE(student_id, word_id)
);

-- Spelling sessions
CREATE TABLE IF NOT EXISTS spelling_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) NOT NULL,
  words_tested integer DEFAULT 0,
  words_correct integer DEFAULT 0,
  accuracy_percentage numeric DEFAULT 0,
  duration_seconds integer,
  xp_awarded integer DEFAULT 0,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_weekly_task_sets_student ON weekly_task_sets(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_task_sets_week ON weekly_task_sets(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_set ON weekly_tasks(task_set_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_student ON weekly_tasks(student_id);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_status ON weekly_tasks(status);
CREATE INDEX IF NOT EXISTS idx_weekly_tasks_type ON weekly_tasks(type);
CREATE INDEX IF NOT EXISTS idx_irregular_verbs_level ON irregular_verbs(level_appropriate);
CREATE INDEX IF NOT EXISTS idx_irregular_verbs_rank ON irregular_verbs(frequency_rank);
CREATE INDEX IF NOT EXISTS idx_student_verb_progress_student ON student_verb_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_spelling_words_level ON spelling_words(level_appropriate);
CREATE INDEX IF NOT EXISTS idx_spelling_words_difficulty ON spelling_words(difficulty);
CREATE INDEX IF NOT EXISTS idx_student_spelling_progress_student ON student_spelling_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_spelling_sessions_student ON spelling_sessions(student_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================
ALTER TABLE weekly_task_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE irregular_verbs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_verb_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE spelling_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_spelling_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE spelling_sessions ENABLE ROW LEVEL SECURITY;

-- Weekly task sets: students see own, trainers see group, admin sees all
CREATE POLICY "students_own_task_sets" ON weekly_task_sets FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "trainers_group_task_sets" ON weekly_task_sets FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN groups g ON s.group_id = g.id
    JOIN profiles p ON p.id = auth.uid()
    WHERE s.id = weekly_task_sets.student_id
    AND (p.role = 'admin' OR g.trainer_id = auth.uid())
  )
);
CREATE POLICY "admin_all_task_sets" ON weekly_task_sets FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_task_sets" ON weekly_task_sets FOR ALL USING (auth.role() = 'service_role');

-- Weekly tasks: students see own + can update own submissions
CREATE POLICY "students_own_tasks" ON weekly_tasks FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "students_submit_tasks" ON weekly_tasks FOR UPDATE USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "trainers_group_tasks" ON weekly_tasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN groups g ON s.group_id = g.id
    JOIN profiles p ON p.id = auth.uid()
    WHERE s.id = weekly_tasks.student_id
    AND (p.role = 'admin' OR g.trainer_id = auth.uid())
  )
);
CREATE POLICY "trainers_grade_tasks" ON weekly_tasks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM students s
    JOIN groups g ON s.group_id = g.id
    JOIN profiles p ON p.id = auth.uid()
    WHERE s.id = weekly_tasks.student_id
    AND (p.role IN ('admin','trainer') AND (p.role = 'admin' OR g.trainer_id = auth.uid()))
  )
);
CREATE POLICY "admin_all_tasks" ON weekly_tasks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_tasks" ON weekly_tasks FOR ALL USING (auth.role() = 'service_role');

-- Irregular verbs: everyone can read
CREATE POLICY "everyone_read_verbs" ON irregular_verbs FOR SELECT USING (true);
CREATE POLICY "admin_manage_verbs" ON irregular_verbs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_verbs" ON irregular_verbs FOR ALL USING (auth.role() = 'service_role');

-- Student verb progress: students see own
CREATE POLICY "students_own_verb_progress" ON student_verb_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "students_update_verb_progress" ON student_verb_progress FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "students_insert_verb_progress" ON student_verb_progress FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "admin_all_verb_progress" ON student_verb_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_verb_progress" ON student_verb_progress FOR ALL USING (auth.role() = 'service_role');

-- Spelling words: everyone can read
CREATE POLICY "everyone_read_spelling" ON spelling_words FOR SELECT USING (true);
CREATE POLICY "admin_manage_spelling" ON spelling_words FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_spelling" ON spelling_words FOR ALL USING (auth.role() = 'service_role');

-- Student spelling progress: students see own
CREATE POLICY "students_own_spelling_progress" ON student_spelling_progress FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "students_update_spelling_progress" ON student_spelling_progress FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "students_insert_spelling_progress" ON student_spelling_progress FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "admin_all_spelling_progress" ON student_spelling_progress FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_spelling_progress" ON student_spelling_progress FOR ALL USING (auth.role() = 'service_role');

-- Spelling sessions: students see own
CREATE POLICY "students_own_sessions" ON spelling_sessions FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "students_insert_sessions" ON spelling_sessions FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "admin_all_sessions" ON spelling_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "service_role_sessions" ON spelling_sessions FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- SEED: Irregular Verbs (150+ ranked by frequency)
-- ============================================================
INSERT INTO irregular_verbs (base_form, past_simple, past_participle, meaning_ar, example_sentence, frequency_rank, level_appropriate) VALUES
-- Level 1-2: Top 50 most common
('go', 'went', 'gone', 'يذهب', 'I go to school every day.', 1, 1),
('say', 'said', 'said', 'يقول', 'She said hello to everyone.', 2, 1),
('get', 'got', 'got/gotten', 'يحصل', 'I get up early in the morning.', 3, 1),
('make', 'made', 'made', 'يصنع', 'She made a delicious cake.', 4, 1),
('know', 'knew', 'known', 'يعرف', 'I knew the answer immediately.', 5, 1),
('think', 'thought', 'thought', 'يفكر', 'He thought about the problem carefully.', 6, 1),
('come', 'came', 'come', 'يأتي', 'They came to the party late.', 7, 1),
('take', 'took', 'taken', 'يأخذ', 'She took the bus to work.', 8, 1),
('see', 'saw', 'seen', 'يرى', 'I saw a beautiful sunset yesterday.', 9, 1),
('find', 'found', 'found', 'يجد', 'He found his lost keys under the table.', 10, 1),
('give', 'gave', 'given', 'يعطي', 'She gave me a wonderful gift.', 11, 1),
('tell', 'told', 'told', 'يخبر', 'He told me the good news.', 12, 1),
('feel', 'felt', 'felt', 'يشعر', 'I felt happy after the exam.', 13, 1),
('become', 'became', 'become', 'يصبح', 'She became a doctor last year.', 14, 1),
('leave', 'left', 'left', 'يغادر', 'We left the house at 8 AM.', 15, 1),
('put', 'put', 'put', 'يضع', 'He put the book on the shelf.', 16, 1),
('mean', 'meant', 'meant', 'يعني', 'What did you mean by that?', 17, 1),
('keep', 'kept', 'kept', 'يحتفظ', 'She kept all the letters.', 18, 1),
('let', 'let', 'let', 'يسمح', 'Please let me help you.', 19, 1),
('begin', 'began', 'begun', 'يبدأ', 'The movie began at 7 PM.', 20, 1),
('write', 'wrote', 'written', 'يكتب', 'She wrote a letter to her friend.', 21, 1),
('bring', 'brought', 'brought', 'يحضر', 'He brought flowers for his mother.', 22, 1),
('hold', 'held', 'held', 'يمسك', 'She held the baby carefully.', 23, 1),
('stand', 'stood', 'stood', 'يقف', 'They stood in line for an hour.', 24, 1),
('hear', 'heard', 'heard', 'يسمع', 'I heard a strange noise outside.', 25, 1),
('run', 'ran', 'run', 'يركض', 'He ran five kilometers this morning.', 26, 1),
('set', 'set', 'set', 'يضبط', 'She set the alarm for 6 AM.', 27, 1),
('meet', 'met', 'met', 'يقابل', 'We met at the coffee shop.', 28, 1),
('read', 'read', 'read', 'يقرأ', 'She read two books last week.', 29, 1),
('pay', 'paid', 'paid', 'يدفع', 'He paid the bill immediately.', 30, 1),
('speak', 'spoke', 'spoken', 'يتحدث', 'She spoke three languages fluently.', 31, 2),
('sit', 'sat', 'sat', 'يجلس', 'They sat around the table.', 32, 2),
('lead', 'led', 'led', 'يقود', 'She led the team to victory.', 33, 2),
('grow', 'grew', 'grown', 'ينمو', 'The plants grew quickly in summer.', 34, 2),
('lose', 'lost', 'lost', 'يخسر', 'He lost his wallet at the mall.', 35, 2),
('fall', 'fell', 'fallen', 'يسقط', 'The leaves fell from the trees.', 36, 2),
('buy', 'bought', 'bought', 'يشتري', 'She bought a new dress for the party.', 37, 2),
('send', 'sent', 'sent', 'يرسل', 'He sent an email to his boss.', 38, 2),
('build', 'built', 'built', 'يبني', 'They built a new house last year.', 39, 2),
('spend', 'spent', 'spent', 'ينفق', 'We spent the weekend at the beach.', 40, 2),
('cut', 'cut', 'cut', 'يقطع', 'She cut the paper with scissors.', 41, 2),
('catch', 'caught', 'caught', 'يمسك', 'He caught the ball with one hand.', 42, 2),
('break', 'broke', 'broken', 'يكسر', 'The child broke the window accidentally.', 43, 2),
('drive', 'drove', 'driven', 'يقود سيارة', 'She drove to work every day.', 44, 2),
('choose', 'chose', 'chosen', 'يختار', 'They chose the blue color for the walls.', 45, 2),
('rise', 'rose', 'risen', 'يرتفع', 'The sun rises in the east.', 46, 2),
('wear', 'wore', 'worn', 'يرتدي', 'She wore a beautiful dress to the party.', 47, 2),
('draw', 'drew', 'drawn', 'يرسم', 'The artist drew a portrait.', 48, 2),
('fight', 'fought', 'fought', 'يقاتل', 'They fought bravely in the competition.', 49, 2),
('eat', 'ate', 'eaten', 'يأكل', 'We ate dinner at a nice restaurant.', 50, 2),
-- Level 3: Next 50
('drink', 'drank', 'drunk', 'يشرب', 'He drank a glass of water.', 51, 3),
('sleep', 'slept', 'slept', 'ينام', 'She slept for eight hours.', 52, 3),
('teach', 'taught', 'taught', 'يُعلّم', 'He taught English for ten years.', 53, 3),
('sell', 'sold', 'sold', 'يبيع', 'They sold their old car.', 54, 3),
('win', 'won', 'won', 'يفوز', 'Our team won the championship.', 55, 3),
('fly', 'flew', 'flown', 'يطير', 'The bird flew over the mountain.', 56, 3),
('throw', 'threw', 'thrown', 'يرمي', 'He threw the ball across the field.', 57, 3),
('lie', 'lay', 'lain', 'يستلقي', 'She lay on the beach and relaxed.', 58, 3),
('sing', 'sang', 'sung', 'يغني', 'She sang a beautiful song at the concert.', 59, 3),
('swim', 'swam', 'swum', 'يسبح', 'They swam in the pool every morning.', 60, 3),
('hide', 'hid', 'hidden', 'يخفي', 'The cat hid under the bed.', 61, 3),
('shine', 'shone', 'shone', 'يلمع', 'The sun shone brightly all day.', 62, 3),
('blow', 'blew', 'blown', 'ينفخ', 'The wind blew the leaves away.', 63, 3),
('feed', 'fed', 'fed', 'يُطعم', 'She fed the baby every three hours.', 64, 3),
('forgive', 'forgave', 'forgiven', 'يسامح', 'She forgave him for his mistake.', 65, 3),
('freeze', 'froze', 'frozen', 'يتجمد', 'The lake froze during winter.', 66, 3),
('forget', 'forgot', 'forgotten', 'ينسى', 'He forgot his password again.', 67, 3),
('hang', 'hung', 'hung', 'يعلّق', 'She hung the picture on the wall.', 68, 3),
('hurt', 'hurt', 'hurt', 'يؤلم', 'He hurt his knee while playing football.', 69, 3),
('lay', 'laid', 'laid', 'يضع', 'She laid the tablecloth on the table.', 70, 3),
('lend', 'lent', 'lent', 'يُقرض', 'He lent me his textbook.', 71, 3),
('light', 'lit', 'lit', 'يُضيء', 'She lit the candles for dinner.', 72, 3),
('shake', 'shook', 'shaken', 'يهز', 'They shook hands after the meeting.', 73, 3),
('shoot', 'shot', 'shot', 'يُطلق', 'The photographer shot amazing photos.', 74, 3),
('shut', 'shut', 'shut', 'يُغلق', 'Please shut the door behind you.', 75, 3),
('steal', 'stole', 'stolen', 'يسرق', 'Someone stole my bicycle yesterday.', 76, 3),
('stick', 'stuck', 'stuck', 'يلصق', 'She stuck the poster on the wall.', 77, 3),
('strike', 'struck', 'struck', 'يضرب', 'Lightning struck the old tree.', 78, 3),
('swear', 'swore', 'sworn', 'يُقسم', 'He swore to tell the truth.', 79, 3),
('sweep', 'swept', 'swept', 'يكنس', 'She swept the floor every morning.', 80, 3),
('tear', 'tore', 'torn', 'يمزق', 'He tore the paper by accident.', 81, 3),
('wake', 'woke', 'woken', 'يستيقظ', 'She woke up early for work.', 82, 3),
('dig', 'dug', 'dug', 'يحفر', 'They dug a hole in the garden.', 83, 3),
('hit', 'hit', 'hit', 'يضرب', 'He hit the ball out of the park.', 84, 3),
('split', 'split', 'split', 'يقسم', 'They split the bill equally.', 85, 3),
('spread', 'spread', 'spread', 'ينشر', 'The news spread quickly.', 86, 3),
('bet', 'bet', 'bet', 'يراهن', 'I bet you cannot solve this puzzle.', 87, 3),
('quit', 'quit', 'quit', 'يترك', 'She quit her job last month.', 88, 3),
('cost', 'cost', 'cost', 'يكلف', 'The phone cost 3000 riyals.', 89, 3),
('deal', 'dealt', 'dealt', 'يتعامل', 'She dealt with the problem calmly.', 90, 3),
('dream', 'dreamt', 'dreamt', 'يحلم', 'He dreamt about traveling the world.', 91, 3),
('lean', 'leant', 'leant', 'يميل', 'She leant against the wall.', 92, 3),
('leap', 'leapt', 'leapt', 'يقفز', 'The cat leapt onto the table.', 93, 3),
('prove', 'proved', 'proven', 'يثبت', 'The evidence proved his innocence.', 94, 3),
('ring', 'rang', 'rung', 'يرن', 'The phone rang during the meeting.', 95, 3),
('seek', 'sought', 'sought', 'يبحث', 'She sought advice from her teacher.', 96, 3),
('slide', 'slid', 'slid', 'ينزلق', 'The kids slid down the slide happily.', 97, 3),
('spin', 'spun', 'spun', 'يدور', 'The wheel spun around and around.', 98, 3),
('spring', 'sprang', 'sprung', 'يقفز', 'The dog sprang up when it saw its owner.', 99, 3),
('weave', 'wove', 'woven', 'ينسج', 'She wove a beautiful carpet.', 100, 3),
-- Level 4-5: Advanced 50+
('arise', 'arose', 'arisen', 'ينشأ', 'A problem arose during the project.', 101, 4),
('awake', 'awoke', 'awoken', 'يستيقظ', 'He awoke to the sound of birds.', 102, 4),
('bear', 'bore', 'borne', 'يتحمل', 'She bore the pain without complaining.', 103, 4),
('beat', 'beat', 'beaten', 'يهزم', 'Our team beat the champions.', 104, 4),
('bend', 'bent', 'bent', 'يثني', 'He bent down to pick up the coin.', 105, 4),
('bind', 'bound', 'bound', 'يربط', 'They bound the books together.', 106, 4),
('bite', 'bit', 'bitten', 'يعض', 'The dog bit the stranger.', 107, 4),
('bleed', 'bled', 'bled', 'ينزف', 'His finger bled after the cut.', 108, 4),
('breed', 'bred', 'bred', 'يربي', 'They bred horses on their farm.', 109, 4),
('burst', 'burst', 'burst', 'ينفجر', 'The balloon burst with a loud pop.', 110, 4),
('cast', 'cast', 'cast', 'يلقي', 'The fisherman cast his line into the river.', 111, 4),
('cling', 'clung', 'clung', 'يتشبث', 'The child clung to his mother.', 112, 4),
('creep', 'crept', 'crept', 'يزحف', 'The cat crept silently toward the mouse.', 113, 4),
('dare', 'dared', 'dared', 'يجرؤ', 'He dared to speak up in the meeting.', 114, 4),
('flee', 'fled', 'fled', 'يهرب', 'They fled the country during the war.', 115, 4),
('fling', 'flung', 'flung', 'يقذف', 'She flung the ball across the room.', 116, 4),
('forbid', 'forbade', 'forbidden', 'يمنع', 'The rules forbade eating in the library.', 117, 4),
('grind', 'ground', 'ground', 'يطحن', 'She ground the coffee beans fresh.', 118, 4),
('kneel', 'knelt', 'knelt', 'يركع', 'He knelt down to tie his shoe.', 119, 4),
('overcome', 'overcame', 'overcome', 'يتغلب', 'She overcame many obstacles in her life.', 120, 4),
('overtake', 'overtook', 'overtaken', 'يتجاوز', 'The fast car overtook the truck.', 121, 4),
('sew', 'sewed', 'sewn', 'يخيط', 'She sewed a dress for her daughter.', 122, 4),
('sink', 'sank', 'sunk', 'يغرق', 'The ship sank during the storm.', 123, 4),
('slay', 'slew', 'slain', 'يقتل', 'The hero slew the dragon.', 124, 5),
('sow', 'sowed', 'sown', 'يزرع', 'The farmer sowed seeds in spring.', 125, 4),
('sting', 'stung', 'stung', 'يلسع', 'A bee stung him on the arm.', 126, 4),
('stink', 'stank', 'stunk', 'يُنتن', 'The garbage stank in the heat.', 127, 4),
('stride', 'strode', 'stridden', 'يخطو', 'He strode confidently into the room.', 128, 5),
('strive', 'strove', 'striven', 'يسعى', 'She strove for excellence in everything.', 129, 5),
('swing', 'swung', 'swung', 'يتأرجح', 'The children swung on the playground.', 130, 4),
('thrust', 'thrust', 'thrust', 'يدفع', 'He thrust the sword forward.', 131, 5),
('tread', 'trod', 'trodden', 'يدوس', 'He trod carefully on the icy path.', 132, 5),
('undergo', 'underwent', 'undergone', 'يخضع', 'She underwent surgery last month.', 133, 4),
('undertake', 'undertook', 'undertaken', 'يتعهد', 'He undertook the difficult task.', 134, 4),
('undo', 'undid', 'undone', 'يلغي', 'She undid all the hard work.', 135, 4),
('uphold', 'upheld', 'upheld', 'يؤيد', 'The court upheld the decision.', 136, 5),
('withdraw', 'withdrew', 'withdrawn', 'ينسحب', 'He withdrew money from the bank.', 137, 4),
('withhold', 'withheld', 'withheld', 'يحجب', 'They withheld the information.', 138, 5),
('withstand', 'withstood', 'withstood', 'يتحمل', 'The building withstood the earthquake.', 139, 5),
('wring', 'wrung', 'wrung', 'يعصر', 'She wrung the wet cloth.', 140, 5),
('do', 'did', 'done', 'يفعل', 'I did my homework after school.', 141, 1),
('have', 'had', 'had', 'يملك', 'She had breakfast at 7 AM.', 142, 1),
('be', 'was/were', 'been', 'يكون', 'She was happy to see her friend.', 143, 1),
('understand', 'understood', 'understood', 'يفهم', 'He understood the lesson perfectly.', 144, 1),
('learn', 'learnt', 'learnt', 'يتعلم', 'She learnt to drive last year.', 145, 1),
('show', 'showed', 'shown', 'يُظهر', 'He showed me his new phone.', 146, 2),
('spell', 'spelt', 'spelt', 'يتهجأ', 'She spelt the word correctly.', 147, 2),
('burn', 'burnt', 'burnt', 'يحرق', 'He burnt the toast this morning.', 148, 2),
('smell', 'smelt', 'smelt', 'يشم', 'She smelt the flowers in the garden.', 149, 2),
('spoil', 'spoilt', 'spoilt', 'يُفسد', 'The rain spoilt our picnic plans.', 150, 3)
ON CONFLICT (base_form) DO NOTHING;

-- ============================================================
-- SEED: Spelling Words (200+ words across levels)
-- ============================================================
INSERT INTO spelling_words (word, meaning_ar, meaning_en, difficulty, level_appropriate, common_misspellings, category) VALUES
-- Level 1: Basic words (50)
('family', 'عائلة', 'a group of related people', 1, 1, ARRAY['famly','famliy','familly'], 'daily'),
('school', 'مدرسة', 'a place for learning', 1, 1, ARRAY['scool','shool','schol'], 'daily'),
('house', 'منزل', 'a building where people live', 1, 1, ARRAY['hous','houes','howse'], 'daily'),
('friend', 'صديق', 'a person you like and trust', 1, 1, ARRAY['freind','frend','frind'], 'daily'),
('beautiful', 'جميل', 'very attractive', 1, 1, ARRAY['beautful','beutiful','beatiful'], 'daily'),
('important', 'مهم', 'having great value', 1, 1, ARRAY['importent','importnt','imortant'], 'daily'),
('different', 'مختلف', 'not the same', 1, 1, ARRAY['diffrent','diferent','diffrant'], 'daily'),
('because', 'لأن', 'for the reason that', 1, 1, ARRAY['becuse','becaus','becase'], 'daily'),
('together', 'معاً', 'with each other', 1, 1, ARRAY['togather','togeather','togeter'], 'daily'),
('always', 'دائماً', 'at all times', 1, 1, ARRAY['allways','alwase','alwys'], 'daily'),
('people', 'ناس', 'human beings', 1, 1, ARRAY['pepole','peple','poeple'], 'daily'),
('water', 'ماء', 'clear liquid for drinking', 1, 1, ARRAY['watter','woter','watr'], 'daily'),
('morning', 'صباح', 'early part of the day', 1, 1, ARRAY['mourning','morining','mornng'], 'daily'),
('mother', 'أم', 'female parent', 1, 1, ARRAY['mothr','muther','moher'], 'daily'),
('father', 'أب', 'male parent', 1, 1, ARRAY['fathr','fether','faher'], 'daily'),
('brother', 'أخ', 'male sibling', 1, 1, ARRAY['brothr','bruther','broter'], 'daily'),
('sister', 'أخت', 'female sibling', 1, 1, ARRAY['sistr','sester','sistor'], 'daily'),
('teacher', 'معلم', 'person who teaches', 1, 1, ARRAY['teachr','teecher','techer'], 'daily'),
('student', 'طالب', 'person who studies', 1, 1, ARRAY['studant','studdent','studen'], 'daily'),
('country', 'بلد', 'a nation', 1, 1, ARRAY['contry','cuntry','countrey'], 'daily'),
('language', 'لغة', 'system of communication', 1, 1, ARRAY['languge','languege','langage'], 'daily'),
('number', 'رقم', 'a mathematical value', 1, 1, ARRAY['numbr','numer','numbar'], 'daily'),
('answer', 'إجابة', 'a reply to a question', 1, 1, ARRAY['anser','answar','anwser'], 'daily'),
('question', 'سؤال', 'a sentence asking for info', 1, 1, ARRAY['qestion','questoin','queston'], 'daily'),
('example', 'مثال', 'a representative case', 1, 1, ARRAY['exampel','exampl','exapmle'], 'daily'),
('children', 'أطفال', 'young people', 1, 1, ARRAY['childran','childern','childen'], 'daily'),
('kitchen', 'مطبخ', 'room for cooking', 1, 1, ARRAY['kichen','kitchin','kithcen'], 'daily'),
('birthday', 'عيد ميلاد', 'day of birth celebration', 1, 1, ARRAY['brithday','birtday','berthday'], 'daily'),
('breakfast', 'فطور', 'first meal of the day', 1, 1, ARRAY['brekfast','breakfest','brakfast'], 'daily'),
('yesterday', 'أمس', 'the day before today', 1, 1, ARRAY['yestrday','yesturday','yesterdy'], 'daily'),
('weather', 'طقس', 'atmospheric conditions', 1, 1, ARRAY['wether','wheather','weathr'], 'daily'),
('already', 'بالفعل', 'before now', 1, 1, ARRAY['allready','alredy','allredy'], 'daily'),
('enough', 'كافي', 'as much as needed', 1, 1, ARRAY['enought','enugh','enof'], 'daily'),
('believe', 'يؤمن', 'to think something is true', 1, 1, ARRAY['belive','beleive','beleve'], 'daily'),
('receive', 'يستلم', 'to get something', 1, 1, ARRAY['recieve','receve','recive'], 'daily'),
('favorite', 'مفضل', 'most liked', 1, 1, ARRAY['favourit','favorit','favrite'], 'daily'),
('hospital', 'مستشفى', 'place for medical care', 1, 1, ARRAY['hospitel','hosiptal','hospitl'], 'daily'),
('tomorrow', 'غداً', 'the day after today', 1, 1, ARRAY['tomorow','tommorrow','tommorow'], 'daily'),
('tonight', 'الليلة', 'this evening', 1, 1, ARRAY['tonite','toninght','tonigt'], 'daily'),
('through', 'خلال', 'from one side to the other', 1, 1, ARRAY['threw','thru','throught'], 'daily'),
('thought', 'فكرة', 'an idea in the mind', 1, 1, ARRAY['thougth','thougt','thout'], 'daily'),
('please', 'من فضلك', 'polite request word', 1, 1, ARRAY['pleas','pleese','plese'], 'daily'),
('listen', 'يستمع', 'to hear attentively', 1, 1, ARRAY['lisen','listn','liston'], 'daily'),
('hungry', 'جائع', 'wanting food', 1, 1, ARRAY['hungrry','hungrey','hungri'], 'daily'),
('happy', 'سعيد', 'feeling good', 1, 1, ARRAY['happey','hapy','happi'], 'daily'),
('sorry', 'آسف', 'feeling regret', 1, 1, ARRAY['sorrey','sory','sorri'], 'daily'),
('money', 'مال', 'coins and notes', 1, 1, ARRAY['mony','muney','monay'], 'daily'),
('minute', 'دقيقة', '60 seconds', 1, 1, ARRAY['minite','minnute','minut'], 'daily'),
('sometimes', 'أحياناً', 'occasionally', 1, 1, ARRAY['sometims','sumtimes','some times'], 'daily'),
('interesting', 'مثير للاهتمام', 'holding attention', 1, 1, ARRAY['intresting','intersting','interessting'], 'daily'),
-- Level 2: Intermediate (50)
('experience', 'تجربة', 'knowledge gained from doing', 2, 2, ARRAY['experiance','exprience','experince'], 'academic'),
('environment', 'بيئة', 'surroundings', 2, 2, ARRAY['enviroment','envirnoment','enviornment'], 'academic'),
('government', 'حكومة', 'ruling body of a country', 2, 2, ARRAY['goverment','gouvernment','goverment'], 'academic'),
('necessary', 'ضروري', 'required, essential', 2, 2, ARRAY['neccessary','necesary','nessesary'], 'academic'),
('definitely', 'بالتأكيد', 'without doubt', 2, 2, ARRAY['definately','definitly','definetly'], 'academic'),
('restaurant', 'مطعم', 'place to eat meals', 2, 2, ARRAY['resturant','restarant','restraunt'], 'daily'),
('accommodation', 'إقامة', 'a place to stay', 3, 2, ARRAY['accomodation','acommodation','acomodation'], 'travel'),
('independent', 'مستقل', 'free from control', 2, 2, ARRAY['independant','indapendent','indipendent'], 'academic'),
('opportunity', 'فرصة', 'a favorable chance', 2, 2, ARRAY['oportunity','oppertunity','oppurtunity'], 'academic'),
('professional', 'محترف', 'relating to a profession', 2, 2, ARRAY['proffesional','profesional','profeshional'], 'business'),
('knowledge', 'معرفة', 'information and skills', 2, 2, ARRAY['knowlege','knowledg','knoledge'], 'academic'),
('technology', 'تكنولوجيا', 'application of science', 2, 2, ARRAY['technolgy','tecnology','techonology'], 'academic'),
('education', 'تعليم', 'process of learning', 2, 2, ARRAY['educaion','edducation','eduction'], 'academic'),
('information', 'معلومات', 'facts and data', 2, 2, ARRAY['infomation','informtion','informaion'], 'academic'),
('communication', 'تواصل', 'exchange of information', 2, 2, ARRAY['comunication','communicaton','communcation'], 'business'),
('development', 'تطوير', 'growth or progress', 2, 2, ARRAY['developement','devlopment','develepment'], 'business'),
('situation', 'وضع/موقف', 'state of affairs', 2, 2, ARRAY['situtation','situaion','situaltion'], 'academic'),
('relationship', 'علاقة', 'connection between people', 2, 2, ARRAY['realtionship','relashionship','relationshp'], 'daily'),
('responsibility', 'مسؤولية', 'duty or obligation', 3, 2, ARRAY['responsability','responsibilty','responcibility'], 'academic'),
('comfortable', 'مريح', 'providing ease', 2, 2, ARRAY['comfertable','comftable','comfertible'], 'daily'),
('successfully', 'بنجاح', 'in a successful way', 2, 2, ARRAY['succesfully','successfuly','succesfuly'], 'academic'),
('unfortunately', 'لسوء الحظ', 'regrettably', 2, 2, ARRAY['unfortunatly','unfortuantly','unfortunetly'], 'academic'),
('immediately', 'فوراً', 'without delay', 2, 2, ARRAY['immediatly','imediately','imediatly'], 'academic'),
('difference', 'فرق', 'way things are unlike', 2, 2, ARRAY['diffrence','diferrence','differance'], 'academic'),
('temperature', 'درجة حرارة', 'degree of heat', 2, 2, ARRAY['temprature','temperture','temperatur'], 'daily'),
('congratulations', 'تهانينا', 'expression of joy', 2, 2, ARRAY['congradulations','congatulations','congratulaions'], 'daily'),
('appreciate', 'يقدّر', 'to value highly', 2, 2, ARRAY['appriciate','apreciate','appretiate'], 'business'),
('certificate', 'شهادة', 'official document', 2, 2, ARRAY['certificat','sertificate','certifcate'], 'academic'),
('colleagues', 'زملاء', 'work partners', 2, 2, ARRAY['coleagues','collegues','colleages'], 'business'),
('maintenance', 'صيانة', 'keeping in good condition', 2, 2, ARRAY['maintanance','maintenence','maintainance'], 'business'),
('recommend', 'يوصي', 'to suggest', 2, 2, ARRAY['recomend','reccomend','recommand'], 'business'),
('separate', 'منفصل', 'not together', 2, 2, ARRAY['seperate','separete','seprate'], 'academic'),
('occurred', 'حدث', 'happened', 2, 2, ARRAY['occured','ocurred','occurrd'], 'academic'),
('beginning', 'بداية', 'the start', 2, 2, ARRAY['begining','beggining','beginng'], 'academic'),
('schedule', 'جدول', 'a plan of events', 2, 2, ARRAY['shedule','scedule','schedual'], 'business'),
('disappoint', 'يخيّب', 'to let down', 2, 2, ARRAY['disapoint','dissapoint','disappiont'], 'daily'),
('guarantee', 'ضمان', 'a promise of quality', 2, 2, ARRAY['garantee','guarentee','gaurantee'], 'business'),
('privilege', 'امتياز', 'a special right', 3, 2, ARRAY['priviledge','privelege','privlege'], 'academic'),
('surprise', 'مفاجأة', 'unexpected event', 2, 2, ARRAY['suprise','surprize','surpise'], 'daily'),
('strength', 'قوة', 'physical or mental power', 2, 2, ARRAY['strenth','strenght','strengh'], 'daily'),
('disappear', 'يختفي', 'to vanish', 2, 2, ARRAY['dissapear','disapear','dissappear'], 'daily'),
('excellent', 'ممتاز', 'extremely good', 2, 2, ARRAY['excelent','excellant','exellent'], 'academic'),
('foreign', 'أجنبي', 'from another country', 2, 2, ARRAY['foriegn','foregin','forein'], 'academic'),
('grammar', 'قواعد اللغة', 'rules of language', 2, 2, ARRAY['grammer','gramar','gramer'], 'academic'),
('height', 'ارتفاع', 'measurement upward', 2, 2, ARRAY['hight','heigth','hieght'], 'daily'),
('neighbor', 'جار', 'person living nearby', 2, 2, ARRAY['neighbour','nieghbor','nabor'], 'daily'),
('occasion', 'مناسبة', 'a special event', 2, 2, ARRAY['ocassion','occassion','ocasion'], 'daily'),
('available', 'متاح', 'able to be used', 2, 2, ARRAY['availble','avaliable','availible'], 'business'),
('particular', 'خاص/معين', 'specific', 2, 2, ARRAY['paticular','perticular','particlar'], 'academic'),
('previous', 'سابق', 'coming before', 2, 2, ARRAY['previus','previuos','previouse'], 'academic'),
-- Level 3: Upper-Intermediate (50)
('achievement', 'إنجاز', 'something accomplished', 3, 3, ARRAY['achevement','achievment','acheivment'], 'academic'),
('advertisement', 'إعلان', 'public promotion', 3, 3, ARRAY['advertisment','advertizement','advertisemnt'], 'business'),
('acknowledge', 'يعترف', 'to accept or admit', 3, 3, ARRAY['acknowlege','aknowledge','acknowledg'], 'academic'),
('phenomenon', 'ظاهرة', 'an observable event', 3, 3, ARRAY['phenomenom','phenominon','phenomemon'], 'academic'),
('psychology', 'علم النفس', 'study of the mind', 3, 3, ARRAY['psycology','phychology','psycchology'], 'academic'),
('consequence', 'نتيجة', 'a result of an action', 3, 3, ARRAY['consequense','consequnce','concequence'], 'academic'),
('enthusiasm', 'حماس', 'eager enjoyment', 3, 3, ARRAY['enthusiam','enthousiasm','enthusism'], 'academic'),
('exaggerate', 'يبالغ', 'to overstate', 3, 3, ARRAY['exagerate','exagarate','exagerrate'], 'academic'),
('embarrass', 'يحرج', 'to cause awkwardness', 3, 3, ARRAY['embarass','embarras','embaress'], 'daily'),
('conscience', 'ضمير', 'sense of right and wrong', 3, 3, ARRAY['concience','consciance','consience'], 'academic'),
('committee', 'لجنة', 'a group for decisions', 3, 3, ARRAY['comittee','commitee','comitee'], 'business'),
('discipline', 'انضباط', 'training and control', 3, 3, ARRAY['disipline','disiplin','disicpline'], 'academic'),
('vocabulary', 'مفردات', 'set of words known', 3, 3, ARRAY['vocabulery','vocabluary','vocabualry'], 'academic'),
('pronunciation', 'نطق', 'way of speaking words', 3, 3, ARRAY['pronounciation','pronuncation','prononciation'], 'academic'),
('hierarchy', 'تسلسل هرمي', 'ranking system', 4, 3, ARRAY['heirarchy','hierachy','hiearchy'], 'business'),
('bureaucracy', 'بيروقراطية', 'administrative system', 4, 3, ARRAY['burocracy','beaurocracy','beurocracy'], 'business'),
('contemporary', 'معاصر', 'of the present time', 3, 3, ARRAY['contempory','contempoary','contemporery'], 'academic'),
('Mediterranean', 'البحر المتوسط', 'region around Med Sea', 3, 3, ARRAY['Mediteranean','Mediterranian','Mediteranian'], 'travel'),
('entrepreneur', 'رائد أعمال', 'business starter', 4, 3, ARRAY['entrepeneur','entreprenuer','enterpreuner'], 'business'),
('maintenance', 'صيانة', 'upkeep', 3, 3, ARRAY['maintanance','maintenence','maintainance'], 'business'),
('miscellaneous', 'متنوع', 'various', 4, 3, ARRAY['miscelaneous','miscellanious','miscellanous'], 'academic'),
('perseverance', 'مثابرة', 'persistent effort', 3, 3, ARRAY['perseverence','perseverance','perseveranse'], 'academic'),
('questionnaire', 'استبيان', 'set of questions', 3, 3, ARRAY['questionare','questionaire','questionnare'], 'business'),
('surveillance', 'مراقبة', 'close observation', 4, 3, ARRAY['surveilance','survaillance','surviellance'], 'academic'),
('simultaneously', 'في وقت واحد', 'at the same time', 4, 3, ARRAY['simultanously','simultaniously','simultaneosly'], 'academic'),
-- Level 4-5: Advanced (25)
('acquaintance', 'معرفة', 'person you know slightly', 4, 4, ARRAY['acquaintence','acquantance','aquaintance'], 'daily'),
('catastrophe', 'كارثة', 'a disaster', 4, 4, ARRAY['catastophe','catastrophy','catastrofe'], 'academic'),
('chauffeur', 'سائق خاص', 'personal driver', 4, 4, ARRAY['chauffer','chofer','chaffeur'], 'daily'),
('correspondence', 'مراسلات', 'written communication', 4, 4, ARRAY['correspondance','correspendence','corespondence'], 'business'),
('curriculum', 'منهج', 'course of study', 4, 4, ARRAY['curriculam','cirriculum','curiculum'], 'academic'),
('entrepreneurship', 'ريادة أعمال', 'business creation', 5, 4, ARRAY['entrepreneursip','entrepneurship','entrepeneurship'], 'business'),
('idiosyncrasy', 'خصوصية', 'peculiar habit', 5, 5, ARRAY['idiosyncracy','idiosyncrosy','idiosyncresy'], 'academic'),
('lieutenant', 'ملازم', 'military rank', 5, 4, ARRAY['leutenant','lieutanant','liutenant'], 'academic'),
('manoeuvre', 'مناورة', 'a planned movement', 4, 4, ARRAY['manuever','manoeuver','manouver'], 'academic'),
('onomatopoeia', 'محاكاة صوتية', 'words imitating sounds', 5, 5, ARRAY['onomatopoea','onomatopeia','onomatapoeia'], 'academic'),
('pharmaceutical', 'صيدلاني', 'relating to medicine', 5, 4, ARRAY['pharmacutical','pharmeceutical','farmaceutical'], 'academic'),
('reconnaissance', 'استطلاع', 'military observation', 5, 5, ARRAY['reconaissance','reconnaisance','reconaisance'], 'academic'),
('rendezvous', 'موعد لقاء', 'arranged meeting', 4, 4, ARRAY['randezvous','rendayvous','rendevous'], 'daily'),
('rhythm', 'إيقاع', 'regular pattern of sounds', 3, 4, ARRAY['rythm','rhythem','rythm'], 'academic'),
('sovereignty', 'سيادة', 'supreme power', 5, 5, ARRAY['soverignty','sovereinty','soverianty'], 'academic')
ON CONFLICT (word) DO NOTHING;
