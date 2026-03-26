-- ============================================
-- 050: Update Student Data — Packages, Levels, Groups, Payment Info
-- Students are joining today. Correct all records from test data.
-- ============================================

-- 1) Create Group 1B (doesn't exist yet)
INSERT INTO groups (id, name, code, level, max_students, is_active, schedule)
VALUES (
  'b1b1b1b1-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
  'Level 1 - Group B',
  '1B',
  1,
  7,
  true,
  '{"days": ["sunday", "wednesday"], "time": "21:00", "timezone": "Asia/Riyadh", "duration_minutes": 60}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Group IDs reference:
-- 1A = e7753305-2a42-4b51-89ab-60cf4df37cbb
-- 1B = b1b1b1b1-1b1b-1b1b-1b1b-1b1b1b1b1b1b (new)
-- 2A = 7ad2b12a-7330-41c4-93a3-ad3e98503cb7
-- 2B = b4b93eea-de72-4f83-ac34-bc3d8d330600

-- 2) Update each student

-- نادية خيار القحطاني → asas, level 2, 2A, 600, day 1 (already correct, but enforce)
UPDATE students SET
  package = 'asas',
  academic_level = 2,
  group_id = '7ad2b12a-7330-41c4-93a3-ad3e98503cb7',
  custom_price = 600,
  payment_day = 1
WHERE id = '0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e';

-- الهنوف البقمي → asas, level 2, 2A, 800, day 1
UPDATE students SET
  package = 'asas',
  academic_level = 2,
  group_id = '7ad2b12a-7330-41c4-93a3-ad3e98503cb7',
  custom_price = 800,
  payment_day = 1
WHERE id = 'de70db0c-1d87-4328-86d8-aa37344980a7';

-- هوازن العتيبي → asas, level 2, 2B, 500, day 27
UPDATE students SET
  package = 'asas',
  academic_level = 2,
  group_id = 'b4b93eea-de72-4f83-ac34-bc3d8d330600',
  custom_price = 500,
  payment_day = 27
WHERE id = '050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6';

-- منار العتيبي → asas, level 1, 1A, 500, day 1
UPDATE students SET
  package = 'asas',
  academic_level = 1,
  group_id = 'e7753305-2a42-4b51-89ab-60cf4df37cbb',
  custom_price = 500,
  payment_day = 1
WHERE id = 'cad66f17-4471-4e64-acce-aa2836e1a814';

-- بسيرين (سيرين) → talaqa, level 1, 1B, 950, day 10 (created_at = March 10)
UPDATE students SET
  package = 'talaqa',
  academic_level = 1,
  group_id = 'b1b1b1b1-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
  custom_price = 950,
  payment_day = 10
WHERE id = '4afd701f-aa1a-4f82-9f99-9476cc335a3c';

-- غيداء → asas, level 2, 2B, 550, day 15
UPDATE students SET
  package = 'asas',
  academic_level = 2,
  group_id = 'b4b93eea-de72-4f83-ac34-bc3d8d330600',
  custom_price = 550,
  payment_day = 15
WHERE id = 'b8692228-5219-4a59-884e-da360d8c7c2b';

-- نورة الياسي (اليامي) → asas, level 1, 1B, 500, day 1
UPDATE students SET
  package = 'asas',
  academic_level = 1,
  group_id = 'b1b1b1b1-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
  custom_price = 500,
  payment_day = 1
WHERE id = 'd1a3b497-c15b-42e5-83d8-864ce311fb5b';

-- سارة خالد منصور → talaqa, level 1, 1B, 1200, day 1
UPDATE students SET
  package = 'talaqa',
  academic_level = 1,
  group_id = 'b1b1b1b1-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
  custom_price = 1200,
  payment_day = 1
WHERE id = 'af56ca47-2637-494a-b0b1-64a83e29f942';

-- سارة شرائحي (شراحيلي) → tamayuz, level 1, 1B, 1500, day 1
UPDATE students SET
  package = 'tamayuz',
  academic_level = 1,
  group_id = 'b1b1b1b1-1b1b-1b1b-1b1b-1b1b1b1b1b1b',
  custom_price = 1500,
  payment_day = 1
WHERE id = 'f8d2f203-975f-4b0f-a607-ad1a05694f42';

-- لين الشهري → talaqa, level 1, 1A, 1250, day 1
UPDATE students SET
  package = 'talaqa',
  academic_level = 1,
  group_id = 'e7753305-2a42-4b51-89ab-60cf4df37cbb',
  custom_price = 1250,
  payment_day = 1
WHERE id = 'a64b4a03-5eac-433b-9dee-14af93e043c2';

-- وعد محمد العمران → tamayuz, level 2, 2A, 1350, day 1
UPDATE students SET
  package = 'tamayuz',
  academic_level = 2,
  group_id = '7ad2b12a-7330-41c4-93a3-ad3e98503cb7',
  custom_price = 1350,
  payment_day = 1
WHERE id = 'b091fb1d-15f1-43fc-841b-772328087fa3';

-- فاطمة خواجي → asas, level 1, 1A, 850, day 1
UPDATE students SET
  package = 'asas',
  academic_level = 1,
  group_id = 'e7753305-2a42-4b51-89ab-60cf4df37cbb',
  custom_price = 850,
  payment_day = 1
WHERE id = 'f9ecb220-107e-436e-a4b7-80fd9df0cba4';

-- 3) Update enrollment_date for all students to today (they're joining today)
UPDATE students SET
  enrollment_date = CURRENT_DATE
WHERE id IN (
  '0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e',
  'de70db0c-1d87-4328-86d8-aa37344980a7',
  '050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6',
  'cad66f17-4471-4e64-acce-aa2836e1a814',
  '4afd701f-aa1a-4f82-9f99-9476cc335a3c',
  'b8692228-5219-4a59-884e-da360d8c7c2b',
  'd1a3b497-c15b-42e5-83d8-864ce311fb5b',
  'af56ca47-2637-494a-b0b1-64a83e29f942',
  'f8d2f203-975f-4b0f-a607-ad1a05694f42',
  'a64b4a03-5eac-433b-9dee-14af93e043c2',
  'b091fb1d-15f1-43fc-841b-772328087fa3',
  'f9ecb220-107e-436e-a4b7-80fd9df0cba4'
);
