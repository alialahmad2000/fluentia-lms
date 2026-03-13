-- ============================================================================
-- Fluentia LMS — Seed Data (Real Students from Section 2)
-- ============================================================================
-- Run: npx supabase db reset   (local — applies migrations + seed)
--  or: paste into Supabase SQL Editor (hosted — after admin signup)
--
-- The admin (Dr. Ali) must sign up first via the app. Then run this seed
-- to populate the 3 groups, 12 real students, payments, classes, and assignments.
-- ============================================================================

DO $$
DECLARE
  -- Trainer (admin) — looked up dynamically
  v_trainer_id  uuid;

  -- Group IDs (deterministic so re-running is idempotent)
  v_group_1a  uuid := '11111111-1111-1111-1111-111111111001'::uuid;
  v_group_2a  uuid := '11111111-1111-1111-1111-111111111002'::uuid;
  v_group_3   uuid := '11111111-1111-1111-1111-111111111003'::uuid;

  -- Student IDs (deterministic)
  v_s1  uuid := '22222222-2222-2222-2222-222222220001'::uuid;
  v_s2  uuid := '22222222-2222-2222-2222-222222220002'::uuid;
  v_s3  uuid := '22222222-2222-2222-2222-222222220003'::uuid;
  v_s4  uuid := '22222222-2222-2222-2222-222222220004'::uuid;
  v_s5  uuid := '22222222-2222-2222-2222-222222220005'::uuid;
  v_s6  uuid := '22222222-2222-2222-2222-222222220006'::uuid;
  v_s7  uuid := '22222222-2222-2222-2222-222222220007'::uuid;
  v_s8  uuid := '22222222-2222-2222-2222-222222220008'::uuid;
  v_s9  uuid := '22222222-2222-2222-2222-222222220009'::uuid;
  v_s10 uuid := '22222222-2222-2222-2222-222222220010'::uuid;
  v_s11 uuid := '22222222-2222-2222-2222-222222220011'::uuid;
  v_s12 uuid := '22222222-2222-2222-2222-222222220012'::uuid;

BEGIN

-- ============================================================================
-- 1. FIND THE ADMIN / TRAINER
-- ============================================================================
SELECT id INTO v_trainer_id FROM profiles WHERE role = 'admin' LIMIT 1;

IF v_trainer_id IS NULL THEN
  SELECT id INTO v_trainer_id FROM profiles WHERE role = 'trainer' LIMIT 1;
END IF;

IF v_trainer_id IS NULL THEN
  RAISE EXCEPTION 'No admin or trainer found. Please sign up as admin first via the app, then re-run this seed.';
END IF;

RAISE NOTICE 'Using trainer: %', v_trainer_id;

-- Ensure trainer record exists
INSERT INTO trainers (id, specialization, per_session_rate, is_active)
VALUES (v_trainer_id, ARRAY['general_english', 'ielts', 'conversation'], 150, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE 3 GROUPS
-- ============================================================================
-- Group 1A: Level 1 beginners — Sunday & Tuesday 8PM
-- Group 2A: Level 2 intermediate — Monday & Wednesday 8PM
-- Group 3:  Level 2 mixed — Saturday & Thursday 8PM

DELETE FROM groups WHERE id IN (v_group_1a, v_group_2a, v_group_3);

INSERT INTO groups (id, name, code, level, trainer_id, max_students, google_meet_link, schedule, is_active)
VALUES
  (v_group_1a,
   'المستوى الأول - المجموعة أ',
   '1A', 1, v_trainer_id, 7,
   'https://meet.google.com/fluentia-1a',
   '{"days":["sunday","tuesday"],"time":"20:00","timezone":"Asia/Riyadh","duration_minutes":60}'::jsonb,
   true),

  (v_group_2a,
   'المستوى الثاني - المجموعة أ',
   '2A', 2, v_trainer_id, 7,
   'https://meet.google.com/fluentia-2a',
   '{"days":["monday","wednesday"],"time":"20:00","timezone":"Asia/Riyadh","duration_minutes":60}'::jsonb,
   true),

  (v_group_3,
   'المستوى الثاني - المجموعة ب',
   '3', 2, v_trainer_id, 7,
   'https://meet.google.com/fluentia-3',
   '{"days":["saturday","thursday"],"time":"20:00","timezone":"Asia/Riyadh","duration_minutes":60}'::jsonb,
   true);

-- ============================================================================
-- 3. CREATE 12 STUDENTS (auth.users + profiles + students)
-- ============================================================================
-- Password for all: Fluentia2026!
-- These are test accounts with @fluentia.test emails

-- Auth users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
VALUES
  (v_s1,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nadia.alqahtani@fluentia.test',  crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"نادية خيار القحطاني"}'::jsonb, now(), now(), '', ''),
  (v_s2,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alhanouf.albagami@fluentia.test', crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"الهنوف البقمي"}'::jsonb,       now(), now(), '', ''),
  (v_s3,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'hawazin.alotaibi@fluentia.test',  crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"هوازن العتيبي"}'::jsonb,       now(), now(), '', ''),
  (v_s4,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'manar.alotaibi@fluentia.test',    crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"منار العتيبي"}'::jsonb,        now(), now(), '', ''),
  (v_s5,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'basereen@fluentia.test',          crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"بسيرين"}'::jsonb,              now(), now(), '', ''),
  (v_s6,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ghaida@fluentia.test',            crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"غيداء"}'::jsonb,               now(), now(), '', ''),
  (v_s7,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'norah.alyasi@fluentia.test',      crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"نورة الياسي"}'::jsonb,         now(), now(), '', ''),
  (v_s8,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.k.mansour@fluentia.test',   crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"سارة خالد منصور"}'::jsonb,     now(), now(), '', ''),
  (v_s9,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.sharaihi@fluentia.test',    crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"سارة شرائحي"}'::jsonb,         now(), now(), '', ''),
  (v_s10, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leen.alshahri@fluentia.test',     crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"لين الشهري"}'::jsonb,          now(), now(), '', ''),
  (v_s11, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'waad.alomran@fluentia.test',      crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"وعد محمد العمران"}'::jsonb,    now(), now(), '', ''),
  (v_s12, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'fatima.khawaji@fluentia.test',    crypt('Fluentia2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"فاطمة خواجي"}'::jsonb,         now(), now(), '', '')
ON CONFLICT (id) DO NOTHING;

-- Profiles
INSERT INTO profiles (id, full_name, display_name, role, email)
VALUES
  (v_s1,  'نادية خيار القحطاني', 'نادية',     'student', 'nadia.alqahtani@fluentia.test'),
  (v_s2,  'الهنوف البقمي',       'الهنوف',    'student', 'alhanouf.albagami@fluentia.test'),
  (v_s3,  'هوازن العتيبي',       'هوازن',     'student', 'hawazin.alotaibi@fluentia.test'),
  (v_s4,  'منار العتيبي',        'منار',      'student', 'manar.alotaibi@fluentia.test'),
  (v_s5,  'بسيرين',              'بسيرين',    'student', 'basereen@fluentia.test'),
  (v_s6,  'غيداء',               'غيداء',     'student', 'ghaida@fluentia.test'),
  (v_s7,  'نورة الياسي',         'نورة',      'student', 'norah.alyasi@fluentia.test'),
  (v_s8,  'سارة خالد منصور',     'سارة خالد', 'student', 'sarah.k.mansour@fluentia.test'),
  (v_s9,  'سارة شرائحي',         'سارة ش.',   'student', 'sarah.sharaihi@fluentia.test'),
  (v_s10, 'لين الشهري',          'لين',       'student', 'leen.alshahri@fluentia.test'),
  (v_s11, 'وعد محمد العمران',    'وعد',       'student', 'waad.alomran@fluentia.test'),
  (v_s12, 'فاطمة خواجي',         'فاطمة',     'student', 'fatima.khawaji@fluentia.test')
ON CONFLICT (id) DO UPDATE SET
  full_name    = EXCLUDED.full_name,
  display_name = EXCLUDED.display_name;

-- Student records — real data from the Google Sheet
-- ┌────────────────────────────┬──────┬─────────┬───────┬───────────┬──────────┐
-- │ Name                       │ SAR  │ Payment │ Level │ Group     │ Package  │
-- ├────────────────────────────┼──────┼─────────┼───────┼───────────┼──────────┤
-- │ 1. نادية خيار القحطاني     │ 600  │ Paid    │ 2     │ 2A        │ asas     │
-- │ 2. الهنوف البقمي           │ 800  │ Paid    │ 2     │ 2A        │ talaqa   │
-- │ 3. هوازن العتيبي           │ 500  │ Not Yet │ 2     │ 3         │ asas     │
-- │ 4. منار العتيبي            │ 500  │ Paid    │ 1     │ 3         │ asas     │
-- │ 5. بسيرين                  │ 950  │ Not Yet │ 1     │ 1A        │ talaqa   │
-- │ 6. غيداء                   │ 800  │ Not Yet │ 2     │ 2A (IELTS)│ talaqa   │
-- │ 7. نورة الياسي             │ 500  │ Paid    │ 2     │ 2A        │ asas     │
-- │ 8. سارة خالد منصور         │ 1200 │ Paid    │ 2     │ 2A        │ tamayuz  │
-- │ 9. سارة شرائحي             │ 1500 │ Paid    │ 1     │ 1A        │ tamayuz  │
-- │ 10. لين الشهري             │ 1250 │ Paid    │ 1     │ 1A        │ tamayuz  │
-- │ 11. وعد محمد العمران       │ 1350 │ Partial │ 2     │ 3         │ tamayuz  │
-- │ 12. فاطمة خواجي            │ 850  │ Partial │ 2     │ 3         │ talaqa   │
-- └────────────────────────────┴──────┴─────────┴───────┴───────────┴──────────┘

INSERT INTO students (
  id, academic_level, package, track, group_id,
  custom_price, payment_day, status, enrollment_date,
  xp_total, current_streak, longest_streak, gamification_level
)
VALUES
  -- Group 2A students (Level 2)
  (v_s1,  2, 'asas',    'foundation', v_group_2a, 600,  1,  'active', '2025-11-01', 320,  5,  12, 3),
  (v_s2,  2, 'talaqa',  'foundation', v_group_2a, 800,  10, 'active', '2025-09-15', 1250, 22, 30, 7),  -- SUPER ACTIVE (242 msgs in Telegram)
  (v_s6,  2, 'talaqa',  'foundation', v_group_2a, 800,  16, 'active', '2026-01-20', 145,  2,  5,  2),  -- IELTS interested, shy/new
  (v_s7,  2, 'asas',    'foundation', v_group_2a, 500,  1,  'active', '2025-12-01', 410,  9,  15, 4),
  (v_s8,  2, 'tamayuz', 'foundation', v_group_2a, 1200, 10, 'active', '2025-08-01', 890,  15, 21, 6),  -- Premium student

  -- Group 1A students (Level 1)
  (v_s5,  1, 'talaqa',  'foundation', v_group_1a, 950,  20, 'active', '2026-02-01', 85,   3,  7,  1),  -- Very new
  (v_s9,  1, 'tamayuz', 'foundation', v_group_1a, 1500, 1,  'active', '2025-10-15', 560,  11, 18, 4),
  (v_s10, 1, 'tamayuz', 'foundation', v_group_1a, 1250, 15, 'active', '2025-11-10', 475,  7,  14, 4),

  -- Group 3 students (mixed Level 1 & 2)
  (v_s3,  2, 'asas',    'foundation', v_group_3,  500,  15, 'active', '2025-10-01', 680,  12, 20, 5),  -- IELTS focused (tracks band scores)
  (v_s4,  1, 'asas',    'foundation', v_group_3,  500,  1,  'active', '2026-01-10', 210,  8,  10, 2),
  (v_s11, 2, 'tamayuz', 'foundation', v_group_3,  1350, 20, 'active', '2025-09-01', 720,  14, 22, 5),  -- Partial payment
  (v_s12, 2, 'talaqa',  'foundation', v_group_3,  850,  10, 'active', '2025-12-15', 390,  6,  11, 3)   -- Partial payment
ON CONFLICT (id) DO UPDATE SET
  academic_level     = EXCLUDED.academic_level,
  package            = EXCLUDED.package,
  track              = EXCLUDED.track,
  group_id           = EXCLUDED.group_id,
  custom_price       = EXCLUDED.custom_price,
  payment_day        = EXCLUDED.payment_day,
  status             = EXCLUDED.status,
  xp_total           = EXCLUDED.xp_total,
  current_streak     = EXCLUDED.current_streak,
  longest_streak     = EXCLUDED.longest_streak,
  gamification_level = EXCLUDED.gamification_level;

-- ============================================================================
-- 4. PAYMENT RECORDS — March 2026
-- ============================================================================
-- Revenue: ~10,800 SAR total | Collected: ~8,000 SAR (74%)

DELETE FROM payments WHERE period_start = '2026-03-01' AND period_end = '2026-03-31'
  AND student_id IN (v_s1, v_s2, v_s3, v_s4, v_s5, v_s6, v_s7, v_s8, v_s9, v_s10, v_s11, v_s12);

INSERT INTO payments (id, student_id, amount, custom_amount, period_start, period_end, status, method, paid_at)
VALUES
  -- 7 fully paid
  (gen_random_uuid(), v_s1,  600,  600,  '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-01'),
  (gen_random_uuid(), v_s2,  800,  800,  '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-10'),
  (gen_random_uuid(), v_s4,  500,  500,  '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-01'),
  (gen_random_uuid(), v_s7,  500,  500,  '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-01'),
  (gen_random_uuid(), v_s8,  1200, 1200, '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-10'),
  (gen_random_uuid(), v_s9,  1500, 1500, '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-01'),
  (gen_random_uuid(), v_s10, 1250, 1250, '2026-03-01', '2026-03-31', 'paid',    'bank_transfer', '2026-03-15'),

  -- 3 not yet paid
  (gen_random_uuid(), v_s3,  0,    500,  '2026-03-01', '2026-03-31', 'pending', NULL, NULL),
  (gen_random_uuid(), v_s5,  0,    950,  '2026-03-01', '2026-03-31', 'pending', NULL, NULL),
  (gen_random_uuid(), v_s6,  0,    800,  '2026-03-01', '2026-03-31', 'pending', NULL, NULL),

  -- 2 partial payments
  (gen_random_uuid(), v_s11, 650,  1350, '2026-03-01', '2026-03-31', 'partial', 'bank_transfer', '2026-03-20'),  -- 350 remaining
  (gen_random_uuid(), v_s12, 650,  850,  '2026-03-01', '2026-03-31', 'partial', 'bank_transfer', '2026-03-10');  -- 200 remaining

-- ============================================================================
-- 5. CLASSES — March 2026 Schedule (4 per group = 12 total)
-- ============================================================================

-- Group 1A — Sunday & Tuesday 8PM Riyadh
INSERT INTO classes (id, group_id, trainer_id, title, type, status, scheduled_at, duration_minutes, google_meet_link)
VALUES
  (gen_random_uuid(), v_group_1a, v_trainer_id, 'Explorer Foundation — Unit 3A',    'group', 'completed', '2026-03-01 20:00+03', 60, 'https://meet.google.com/fluentia-1a'),
  (gen_random_uuid(), v_group_1a, v_trainer_id, 'Grammar — Present Simple',         'group', 'completed', '2026-03-04 20:00+03', 60, 'https://meet.google.com/fluentia-1a'),
  (gen_random_uuid(), v_group_1a, v_trainer_id, 'Explorer Foundation — Unit 3B',    'group', 'completed', '2026-03-08 20:00+03', 60, 'https://meet.google.com/fluentia-1a'),
  (gen_random_uuid(), v_group_1a, v_trainer_id, 'Grammar — Present Continuous',     'group', 'completed', '2026-03-11 20:00+03', 60, 'https://meet.google.com/fluentia-1a'),
  (gen_random_uuid(), v_group_1a, v_trainer_id, 'Explorer Foundation — Unit 4A',    'group', 'scheduled', '2026-03-15 20:00+03', 60, 'https://meet.google.com/fluentia-1a'),
  (gen_random_uuid(), v_group_1a, v_trainer_id, 'Grammar — Past Simple',            'group', 'scheduled', '2026-03-18 20:00+03', 60, 'https://meet.google.com/fluentia-1a'),

  -- Group 2A — Monday & Wednesday 8PM Riyadh
  (gen_random_uuid(), v_group_2a, v_trainer_id, 'Explorer 1 — Unit 5A',                'group', 'completed', '2026-03-03 20:00+03', 60, 'https://meet.google.com/fluentia-2a'),
  (gen_random_uuid(), v_group_2a, v_trainer_id, 'Grammar — Past Simple vs Continuous',  'group', 'completed', '2026-03-05 20:00+03', 60, 'https://meet.google.com/fluentia-2a'),
  (gen_random_uuid(), v_group_2a, v_trainer_id, 'Explorer 1 — Unit 5B',                'group', 'completed', '2026-03-10 20:00+03', 60, 'https://meet.google.com/fluentia-2a'),
  (gen_random_uuid(), v_group_2a, v_trainer_id, 'Grammar — Modals (can/could/should)',  'group', 'completed', '2026-03-12 20:00+03', 60, 'https://meet.google.com/fluentia-2a'),
  (gen_random_uuid(), v_group_2a, v_trainer_id, 'Explorer 1 — Unit 6A',                'group', 'scheduled', '2026-03-17 20:00+03', 60, 'https://meet.google.com/fluentia-2a'),
  (gen_random_uuid(), v_group_2a, v_trainer_id, 'Grammar — Future Tenses',             'group', 'scheduled', '2026-03-19 20:00+03', 60, 'https://meet.google.com/fluentia-2a'),

  -- Group 3 — Saturday & Thursday 8PM Riyadh
  (gen_random_uuid(), v_group_3,  v_trainer_id, 'Explorer 1 — Unit 4A',              'group', 'completed', '2026-03-01 20:00+03', 60, 'https://meet.google.com/fluentia-3'),
  (gen_random_uuid(), v_group_3,  v_trainer_id, 'Grammar — Future (will/going to)',  'group', 'completed', '2026-03-06 20:00+03', 60, 'https://meet.google.com/fluentia-3'),
  (gen_random_uuid(), v_group_3,  v_trainer_id, 'Explorer 1 — Unit 4B',              'group', 'completed', '2026-03-08 20:00+03', 60, 'https://meet.google.com/fluentia-3'),
  (gen_random_uuid(), v_group_3,  v_trainer_id, 'Grammar — Conditionals Type 1',    'group', 'completed', '2026-03-13 20:00+03', 60, 'https://meet.google.com/fluentia-3'),
  (gen_random_uuid(), v_group_3,  v_trainer_id, 'Explorer 1 — Unit 5A',              'group', 'scheduled', '2026-03-15 20:00+03', 60, 'https://meet.google.com/fluentia-3'),
  (gen_random_uuid(), v_group_3,  v_trainer_id, 'Grammar — Conditionals Type 2',    'group', 'scheduled', '2026-03-20 20:00+03', 60, 'https://meet.google.com/fluentia-3')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. ASSIGNMENTS — Active this week
-- ============================================================================

INSERT INTO assignments (id, trainer_id, group_id, title, description, type, deadline, points_on_time, points_late, is_visible)
VALUES
  -- Group 2A
  (gen_random_uuid(), v_trainer_id, v_group_2a,
   '🚨 Listening Task: TED Talk Summary',
   'Watch the TED Talk and send a voice note summary (1-3 minutes). Focus on main ideas and new vocabulary you heard.',
   'listening', '2026-03-16 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_2a,
   '📖 Reading: The Future of Remote Work',
   'Read the article, rate difficulty (easy/medium/hard), and share a screenshot of your completed exercises.',
   'reading', '2026-03-17 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_2a,
   '✍️ Writing: My Weekend Plans',
   'Write a paragraph (100+ words) about your plans for the weekend. Use future tense (will / going to).',
   'writing', '2026-03-18 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_2a,
   '🗣️ Speaking Topic #35: Your Dream Job',
   'Record a 2-minute voice note describing your dream job. What would you do? Why?',
   'speaking', '2026-03-19 23:59+03', 10, 5, true),

  -- Group 1A
  (gen_random_uuid(), v_trainer_id, v_group_1a,
   '📖 Reading: Explorer Foundation Unit 4 Exercises',
   'Complete the exercises at the end of Unit 4A. Upload a photo of your answers.',
   'reading', '2026-03-16 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_1a,
   '🗣️ Speaking: Introduce Your Family',
   'Record a 1-minute voice note introducing your family. Use the vocabulary from class.',
   'speaking', '2026-03-17 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_1a,
   '📝 Grammar: Present Simple Worksheet',
   'Complete the Present Simple worksheet shared in class. Upload a photo of your answers.',
   'grammar', '2026-03-18 23:59+03', 10, 5, true),

  -- Group 3
  (gen_random_uuid(), v_trainer_id, v_group_3,
   '📖 Reading: Explorer 1 Unit 4 Review',
   'Review both Unit 4A and 4B. Answer the comprehension questions and upload your work.',
   'reading', '2026-03-16 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_3,
   '🗣️ Speaking Topic #35: Your Dream Vacation',
   'Record a 2-minute voice note. Where would you go? What would you do? Why?',
   'speaking', '2026-03-18 23:59+03', 10, 5, true),

  (gen_random_uuid(), v_trainer_id, v_group_3,
   '🚨 Listening Task: Podcast Summary',
   'Listen to the podcast episode linked in class. Send a 1-2 minute voice note summarizing the key points.',
   'listening', '2026-03-19 23:59+03', 10, 5, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. ATTENDANCE RECORDS (completed classes)
-- ============================================================================
-- Insert attendance for completed classes — most students present

-- Get class IDs for completed classes and insert attendance
-- (Simplified: mark all students as present for their group's completed classes)
INSERT INTO attendance (id, class_id, student_id, status, check_in_method, checked_at)
SELECT
  gen_random_uuid(),
  c.id,
  s.id,
  CASE
    WHEN random() < 0.85 THEN 'present'::attendance_status
    WHEN random() < 0.95 THEN 'excused'::attendance_status
    ELSE 'absent'::attendance_status
  END,
  'trainer'::checkin_method,
  c.scheduled_at + interval '5 minutes'
FROM classes c
JOIN students s ON s.group_id = c.group_id
WHERE c.status = 'completed'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. XP TRANSACTION HISTORY (sample entries)
-- ============================================================================

INSERT INTO xp_transactions (id, student_id, amount, reason, description, created_at)
VALUES
  -- الهنوف (super active) — lots of XP events
  (gen_random_uuid(), v_s2, 15, 'class_attendance',  'حضور حصة Explorer 1 Unit 5A',  '2026-03-03 21:00+03'),
  (gen_random_uuid(), v_s2, 10, 'assignment_on_time', 'واجب القراءة — في الوقت',       '2026-03-04 18:00+03'),
  (gen_random_uuid(), v_s2, 15, 'class_attendance',  'حضور حصة Grammar',              '2026-03-05 21:00+03'),
  (gen_random_uuid(), v_s2, 10, 'assignment_on_time', 'واجب الاستماع — في الوقت',      '2026-03-06 15:00+03'),
  (gen_random_uuid(), v_s2, 50, 'streak_bonus',      'مكافأة سلسلة 7 أيام! 🔥',       '2026-03-07 10:00+03'),
  (gen_random_uuid(), v_s2, 10, 'helped_peer',       'ساعدت نادية في الواجب',          '2026-03-08 14:00+03'),
  (gen_random_uuid(), v_s2, 5,  'voice_note_bonus',  'ملاحظة صوتية > 60 ثانية',       '2026-03-09 16:00+03'),

  -- سارة خالد (premium) — steady XP
  (gen_random_uuid(), v_s8, 15, 'class_attendance',  'حضور حصة Explorer 1 Unit 5A',  '2026-03-03 21:00+03'),
  (gen_random_uuid(), v_s8, 10, 'assignment_on_time', 'واجب الكتابة — في الوقت',       '2026-03-05 20:00+03'),
  (gen_random_uuid(), v_s8, 15, 'class_attendance',  'حضور حصة Grammar',              '2026-03-05 21:00+03'),

  -- هوازن (IELTS focused) — consistent
  (gen_random_uuid(), v_s3, 15, 'class_attendance',  'حضور حصة Explorer 1 Unit 4A',  '2026-03-01 21:00+03'),
  (gen_random_uuid(), v_s3, 10, 'assignment_on_time', 'واجب القراءة — في الوقت',       '2026-03-03 17:00+03'),
  (gen_random_uuid(), v_s3, 15, 'class_attendance',  'حضور حصة Grammar',              '2026-03-06 21:00+03'),

  -- وعد (moderate) — some late submissions
  (gen_random_uuid(), v_s11, 15, 'class_attendance',  'حضور حصة',                     '2026-03-01 21:00+03'),
  (gen_random_uuid(), v_s11, 5,  'assignment_late',   'واجب القراءة — متأخر',          '2026-03-05 23:00+03'),
  (gen_random_uuid(), v_s11, -20, 'penalty_absent',   'غياب عن حصة 6 مارس',           '2026-03-06 21:00+03')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. NOTIFICATIONS (recent)
-- ============================================================================

INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
VALUES
  (gen_random_uuid(), v_s2,  'assignment_new',    'واجب جديد',    '🚨 Listening Task: TED Talk Summary — الموعد: 16 مارس', false, now()),
  (gen_random_uuid(), v_s2,  'streak_warning',    'سلسلتك في خطر!', 'لديك يوم واحد متبقي للحفاظ على سلسلة 22 يوم 🔥', false, now()),
  (gen_random_uuid(), v_s8,  'assignment_new',    'واجب جديد',    '📖 Reading: The Future of Remote Work — الموعد: 17 مارس', false, now()),
  (gen_random_uuid(), v_s3,  'payment_reminder',  'تذكير بالدفع',  'لم يتم استلام دفعة شهر مارس بعد. المبلغ: 500 ريال', false, now()),
  (gen_random_uuid(), v_s11, 'payment_reminder',  'تذكير بالدفع',  'المبلغ المتبقي: 350 ريال من دفعة مارس', false, now())
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 10. ADMIN SETTINGS
-- ============================================================================

INSERT INTO settings (key, value)
VALUES
  ('xp_values', '{"assignment_on_time":10,"assignment_late":5,"class_attendance":15,"correct_answer":10,"helped_peer":10,"shared_summary":15,"streak_bonus":50,"achievement":25,"voice_note_bonus":5,"writing_bonus":5,"early_bird":5,"daily_challenge":5,"penalty_absent":-20,"penalty_unknown_word":-5,"penalty_pronunciation":-5}'),
  ('package_prices', '{"asas":750,"talaqa":1100,"tamayuz":1500,"ielts":2000}'),
  ('moyasar_payment_link', '"https://moyasar.com/pay/fluentia"'),
  ('ai_monthly_budget', '50')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ============================================================================
-- 11. WELCOME ANNOUNCEMENTS
-- ============================================================================

INSERT INTO activity_feed (id, type, actor_id, group_id, content, metadata, created_at)
VALUES
  (gen_random_uuid(), 'announcement', v_trainer_id, v_group_2a,
   'مرحباً بكم في منصة طلاقة الجديدة! 🎉 هنا ستجدون كل شيء: الواجبات، الجدول، الدرجات، والمزيد.',
   '{"pinned":true}'::jsonb, '2026-03-01 10:00+03'),
  (gen_random_uuid(), 'announcement', v_trainer_id, v_group_1a,
   'أهلاً وسهلاً في أكاديمية طلاقة! 🌟 استكشفوا المنصة واكتشفوا كل الميزات الجديدة.',
   '{"pinned":true}'::jsonb, '2026-03-01 10:00+03'),
  (gen_random_uuid(), 'announcement', v_trainer_id, v_group_3,
   'يا هلا بالجميع! 👋 المنصة جاهزة. سلّموا الواجبات في الوقت للحصول على نقاط إضافية!',
   '{"pinned":true}'::jsonb, '2026-03-01 10:00+03')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- DONE
-- ============================================================================

RAISE NOTICE '';
RAISE NOTICE '══════════════════════════════════════════════════';
RAISE NOTICE '  ✅ Fluentia LMS Seed Complete!';
RAISE NOTICE '══════════════════════════════════════════════════';
RAISE NOTICE '  Trainer:      Dr. Ali (%)', v_trainer_id;
RAISE NOTICE '  Groups:       3 (1A, 2A, 3)';
RAISE NOTICE '  Students:     12 real students with custom prices';
RAISE NOTICE '  Payments:     12 records (7 paid, 3 pending, 2 partial)';
RAISE NOTICE '  Classes:      18 (March 2026 schedule)';
RAISE NOTICE '  Assignments:  10 (active this week)';
RAISE NOTICE '  Attendance:   auto-generated for completed classes';
RAISE NOTICE '  XP History:   16 sample transactions';
RAISE NOTICE '  Notifications: 5 recent';
RAISE NOTICE '  Settings:     4 admin configs';
RAISE NOTICE '══════════════════════════════════════════════════';
RAISE NOTICE '';
RAISE NOTICE '  Login credentials (all students):';
RAISE NOTICE '  Email: [firstname]@fluentia.test';
RAISE NOTICE '  Password: Fluentia2026!';
RAISE NOTICE '';

END $$;
