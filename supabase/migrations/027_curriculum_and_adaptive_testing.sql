-- Migration 027: Curriculum Management + Adaptive Testing Engine
-- Adds: curriculum structure, adaptive test questions, test sessions, smart nudges

-- ═══════════════════════════════════════════════════════════════
-- 1. CURRICULUM STRUCTURE
-- ═══════════════════════════════════════════════════════════════

-- Curriculum units: organized by level, each unit has topics
CREATE TABLE IF NOT EXISTS curriculum_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  unit_number integer NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  description_en text,
  description_ar text,
  cefr text NOT NULL DEFAULT 'A1',
  estimated_weeks integer DEFAULT 4,
  learning_objectives jsonb DEFAULT '[]',
  grammar_topics jsonb DEFAULT '[]',
  vocabulary_themes jsonb DEFAULT '[]',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(level, unit_number)
);

-- Student curriculum progress
CREATE TABLE IF NOT EXISTS student_curriculum_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES curriculum_units(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  mastery_score numeric(5,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(student_id, unit_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 2. ADAPTIVE TESTING ENGINE
-- ═══════════════════════════════════════════════════════════════

-- Question bank for adaptive tests
CREATE TABLE IF NOT EXISTS test_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill text NOT NULL CHECK (skill IN ('grammar', 'vocabulary', 'reading', 'listening', 'writing', 'speaking')),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  difficulty numeric(3,2) NOT NULL DEFAULT 0.50 CHECK (difficulty BETWEEN 0 AND 1),
  question_type text NOT NULL CHECK (question_type IN ('mcq', 'fill_blank', 'reorder', 'true_false', 'match', 'open_ended')),
  question_text text NOT NULL,
  question_text_ar text,
  options jsonb, -- for MCQ: ["A", "B", "C", "D"]
  correct_answer text,
  explanation text,
  explanation_ar text,
  media_url text, -- for listening/reading passages
  passage text, -- for reading comprehension
  tags text[] DEFAULT '{}',
  grammar_topic text, -- e.g., "present_perfect", "conditionals"
  times_served integer DEFAULT 0,
  times_correct integer DEFAULT 0,
  discrimination_index numeric(3,2) DEFAULT 0.50, -- how well it differentiates levels
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Test sessions (placement or periodic)
CREATE TABLE IF NOT EXISTS test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_type text NOT NULL CHECK (test_type IN ('placement', 'periodic', 'unit_exit', 'diagnostic')),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'timed_out')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  time_limit_minutes integer DEFAULT 30,
  -- Adaptive algorithm state
  current_difficulty numeric(3,2) DEFAULT 0.50,
  questions_answered integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  -- Results
  estimated_level integer,
  skill_scores jsonb DEFAULT '{}', -- { grammar: 72, vocabulary: 65, ... }
  overall_score numeric(5,2),
  ai_analysis text,
  ai_analysis_ar text,
  recommended_level integer,
  confidence_score numeric(3,2), -- how confident are we in the level assessment
  -- Metadata
  question_sequence jsonb DEFAULT '[]', -- ordered list of question IDs served
  response_log jsonb DEFAULT '[]', -- detailed log of each answer
  created_at timestamptz DEFAULT now()
);

-- Individual test responses
CREATE TABLE IF NOT EXISTS test_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES test_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES test_questions(id),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  answer text,
  is_correct boolean,
  time_spent_seconds integer,
  difficulty_at_time numeric(3,2),
  sequence_number integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 3. SMART NUDGES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS smart_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nudge_type text NOT NULL CHECK (nudge_type IN (
    'streak_at_risk', 'weekly_tasks_reminder', 'improvement_praise',
    'skill_gap', 'inactive_warning', 'milestone_celebration',
    'study_tip', 'challenge_invite', 'level_up_ready'
  )),
  title text NOT NULL,
  title_ar text NOT NULL,
  body text NOT NULL,
  body_ar text NOT NULL,
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  delivered boolean DEFAULT false,
  delivered_at timestamptz,
  dismissed boolean DEFAULT false,
  dismissed_at timestamptz,
  action_url text, -- deep link to relevant page
  metadata jsonb DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_curriculum_units_level ON curriculum_units(level, unit_number);
CREATE INDEX IF NOT EXISTS idx_student_curriculum_progress_student ON student_curriculum_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_test_questions_skill_level ON test_questions(skill, level, difficulty);
CREATE INDEX IF NOT EXISTS idx_test_questions_active ON test_questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_test_sessions_student ON test_sessions(student_id, test_type);
CREATE INDEX IF NOT EXISTS idx_test_responses_session ON test_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_smart_nudges_student ON smart_nudges(student_id, delivered, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_smart_nudges_expires ON smart_nudges(expires_at) WHERE delivered = false;

-- ═══════════════════════════════════════════════════════════════
-- 5. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE curriculum_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_curriculum_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_nudges ENABLE ROW LEVEL SECURITY;

-- Curriculum units: everyone can read
CREATE POLICY "Anyone can view curriculum units" ON curriculum_units FOR SELECT USING (true);
CREATE POLICY "Admins can manage curriculum units" ON curriculum_units FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Student curriculum progress
CREATE POLICY "Students view own curriculum progress" ON student_curriculum_progress
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Trainers view student curriculum progress" ON student_curriculum_progress
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin')));
CREATE POLICY "Service role manages curriculum progress" ON student_curriculum_progress
  FOR ALL USING (true) WITH CHECK (true);

-- Test questions: trainers/admins can view, admins can manage
CREATE POLICY "Authenticated users can view test questions" ON test_questions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage test questions" ON test_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Test sessions: students see own, trainers see all
CREATE POLICY "Students view own test sessions" ON test_sessions
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can create test sessions" ON test_sessions
  FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own sessions" ON test_sessions
  FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Trainers view all test sessions" ON test_sessions
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin')));

-- Test responses
CREATE POLICY "Students manage own test responses" ON test_responses
  FOR ALL USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Trainers view test responses" ON test_responses
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer', 'admin')));

-- Smart nudges
CREATE POLICY "Students view own nudges" ON smart_nudges
  FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students can update own nudges" ON smart_nudges
  FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Service role manages nudges" ON smart_nudges
  FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 6. SEED CURRICULUM UNITS (5 levels x 4 units each)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO curriculum_units (level, unit_number, title_en, title_ar, cefr, estimated_weeks, learning_objectives, grammar_topics, vocabulary_themes) VALUES
-- Level 1 (A1)
(1, 1, 'Hello & Introductions', 'مرحباً والتعارف', 'A1', 3,
  '["Greet people", "Introduce yourself", "Ask and answer basic questions"]'::jsonb,
  '["be verb (am/is/are)", "personal pronouns", "possessive adjectives"]'::jsonb,
  '["greetings", "family", "numbers 1-20", "countries"]'::jsonb),
(1, 2, 'Daily Life', 'الحياة اليومية', 'A1', 3,
  '["Describe daily routines", "Tell time", "Talk about likes/dislikes"]'::jsonb,
  '["present simple", "frequency adverbs", "question words (what/when/where)"]'::jsonb,
  '["daily activities", "time expressions", "food and drinks", "days of the week"]'::jsonb),
(1, 3, 'My World', 'عالمي', 'A1', 3,
  '["Describe places", "Give directions", "Talk about your home"]'::jsonb,
  '["there is/there are", "prepositions of place", "this/that/these/those"]'::jsonb,
  '["rooms and furniture", "neighborhood", "colors", "adjectives (big/small)"]'::jsonb),
(1, 4, 'Shopping & Services', 'التسوق والخدمات', 'A1', 3,
  '["Buy things in shops", "Ask for prices", "Order food"]'::jsonb,
  '["can/can''t", "how much/how many", "countable vs uncountable nouns"]'::jsonb,
  '["clothes", "money", "shops", "numbers 20-1000"]'::jsonb),

-- Level 2 (A2)
(2, 1, 'Past Experiences', 'تجارب الماضي', 'A2', 4,
  '["Talk about past events", "Tell a story", "Describe past experiences"]'::jsonb,
  '["past simple (regular/irregular)", "time expressions (ago/last/yesterday)", "was/were"]'::jsonb,
  '["travel", "holidays", "weather", "irregular verbs (common 30)"]'::jsonb),
(2, 2, 'Plans & Ambitions', 'الخطط والطموحات', 'A2', 4,
  '["Discuss future plans", "Make predictions", "Express intentions"]'::jsonb,
  '["going to + infinitive", "will for predictions", "want to/would like to"]'::jsonb,
  '["jobs and careers", "education", "goals", "life events"]'::jsonb),
(2, 3, 'Health & Lifestyle', 'الصحة ونمط الحياة', 'A2', 4,
  '["Describe health problems", "Give advice", "Compare lifestyles"]'::jsonb,
  '["should/shouldn''t", "comparative adjectives", "imperative for advice"]'::jsonb,
  '["body parts", "health problems", "sports", "healthy habits"]'::jsonb),
(2, 4, 'Communication', 'التواصل', 'A2', 4,
  '["Make requests", "Describe processes", "Express opinions"]'::jsonb,
  '["present continuous", "could/would for requests", "because/so"]'::jsonb,
  '["technology", "social media", "phone calls", "email vocabulary"]'::jsonb),

-- Level 3 (B1)
(3, 1, 'Storytelling & Narrative', 'السرد والحكايات', 'B1', 4,
  '["Tell detailed stories", "Use narrative tenses", "Describe experiences vividly"]'::jsonb,
  '["past continuous", "past perfect", "used to", "time clauses (when/while/before/after)"]'::jsonb,
  '["emotions", "descriptive adjectives", "sequence words", "literary vocabulary"]'::jsonb),
(3, 2, 'Work & Professional Life', 'العمل والحياة المهنية', 'B1', 4,
  '["Discuss work experiences", "Handle job interviews", "Write professional emails"]'::jsonb,
  '["present perfect", "for/since", "first conditional"]'::jsonb,
  '["workplace vocabulary", "job titles", "business expressions", "formal language"]'::jsonb),
(3, 3, 'Culture & Society', 'الثقافة والمجتمع', 'B1', 4,
  '["Compare cultures", "Discuss social issues", "Express agreement/disagreement"]'::jsonb,
  '["second conditional", "passive voice (present/past)", "relative clauses (who/which/that)"]'::jsonb,
  '["traditions", "celebrations", "social issues", "media and entertainment"]'::jsonb),
(3, 4, 'Travel & Global Awareness', 'السفر والوعي العالمي', 'B1', 4,
  '["Plan complex trips", "Handle travel situations", "Describe different countries"]'::jsonb,
  '["superlative adjectives", "reported speech (basic)", "modal verbs (must/might/may)"]'::jsonb,
  '["airports", "accommodation", "geography", "cultural differences"]'::jsonb),

-- Level 4 (B2)
(4, 1, 'Current Affairs & Debate', 'الأحداث الجارية والمناقشة', 'B2', 5,
  '["Analyze news articles", "Debate current topics", "Present arguments"]'::jsonb,
  '["third conditional", "wish/if only", "mixed conditionals"]'::jsonb,
  '["politics", "environment", "economics", "debate vocabulary"]'::jsonb),
(4, 2, 'Academic English', 'الإنجليزية الأكاديمية', 'B2', 5,
  '["Write academic essays", "Summarize research", "Use formal register"]'::jsonb,
  '["passive voice (all tenses)", "participle clauses", "inversion for emphasis"]'::jsonb,
  '["academic vocabulary (AWL)", "research terms", "connectors", "hedging language"]'::jsonb),
(4, 3, 'Literature & Critical Thinking', 'الأدب والتفكير النقدي', 'B2', 5,
  '["Analyze texts critically", "Express nuanced opinions", "Write reviews"]'::jsonb,
  '["subjunctive mood", "cleft sentences", "ellipsis"]'::jsonb,
  '["literary terms", "critique vocabulary", "abstract concepts", "idiomatic expressions"]'::jsonb),
(4, 4, 'Professional Communication', 'التواصل المهني', 'B2', 5,
  '["Lead meetings", "Negotiate", "Present professionally"]'::jsonb,
  '["reported speech (advanced)", "causative have/get", "future perfect/continuous"]'::jsonb,
  '["presentation language", "negotiation", "corporate vocabulary", "diplomatic language"]'::jsonb),

-- Level 5 (C1)
(5, 1, 'Advanced Discussion & Rhetoric', 'النقاش المتقدم والبلاغة', 'C1', 6,
  '["Construct sophisticated arguments", "Use rhetorical devices", "Discuss abstract ideas"]'::jsonb,
  '["advanced modals", "nominalization", "fronting and focus"]'::jsonb,
  '["philosophy", "ethics", "rhetorical vocabulary", "collocations (advanced)"]'::jsonb),
(5, 2, 'IELTS & Exam Preparation', 'الاستعداد لآيلتس والامتحانات', 'C1', 6,
  '["Master IELTS tasks", "Develop test strategies", "Achieve target band scores"]'::jsonb,
  '["all grammar structures (revision)", "error correction", "complex sentence structures"]'::jsonb,
  '["IELTS vocabulary", "academic word list", "topic-specific vocabulary sets"]'::jsonb),
(5, 3, 'Media & Global Issues', 'الإعلام والقضايا العالمية', 'C1', 6,
  '["Analyze media bias", "Discuss global challenges", "Write opinion pieces"]'::jsonb,
  '["discourse markers", "advanced relative clauses", "subjunctive and formal structures"]'::jsonb,
  '["journalism", "global issues", "specialized terminology", "register and style"]'::jsonb),
(5, 4, 'Mastery & Fluency', 'الإتقان والطلاقة', 'C1', 6,
  '["Achieve near-native fluency", "Handle any topic", "Express humor and irony"]'::jsonb,
  '["all structures mastered", "stylistic variation", "pragmatics"]'::jsonb,
  '["idioms and proverbs", "slang (appropriate)", "nuanced vocabulary", "field-specific terms"]'::jsonb)
ON CONFLICT (level, unit_number) DO NOTHING;
