-- T8: Restructure groups, teams, students

-- Step 1: Deactivate all old groups
UPDATE groups SET is_active = false WHERE is_active = true;

-- Step 2: Create new groups
INSERT INTO groups (id, name, code, level, trainer_id, max_students, is_active)
VALUES
  ('aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', 'المجموعة 4', '4', 4, 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96', 7, true),
  ('bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', 'المجموعة 2', '2', 2, 'e5528ced-b3e2-45bb-8c89-9368dc9b5b96', 7, true);

-- Step 3: Update Group 4 students (level 4)
UPDATE students SET academic_level = 4, group_id = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', package = 'asas'
WHERE id = '0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e'; -- نادية القحطاني

UPDATE students SET academic_level = 4, group_id = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', package = 'asas'
WHERE id = 'de70db0c-1d87-4328-86d8-aa37344980a7'; -- الهنوف البقمي

UPDATE students SET academic_level = 4, group_id = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', package = 'tamayuz'
WHERE id = 'b091fb1d-15f1-43fc-841b-772328087fa3'; -- وعد العمران

UPDATE students SET academic_level = 4, group_id = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', package = 'asas'
WHERE id = '050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6'; -- هوازن العتيبي

UPDATE students SET academic_level = 4, group_id = 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa', package = 'asas'
WHERE id = 'b8692228-5219-4a59-884e-da360d8c7c2b'; -- غيداء طلحة

-- Update Group 2 students (level 2)
UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'asas'
WHERE id = 'cad66f17-4471-4e64-acce-aa2836e1a814'; -- منار العتيبي

UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'talaqa'
WHERE id = 'a64b4a03-5eac-433b-9dee-14af93e043c2'; -- لين الشهري

UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'asas'
WHERE id = 'f9ecb220-107e-436e-a4b7-80fd9df0cba4'; -- فاطمة خواجي

UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'talaqa'
WHERE id = '4afd701f-aa1a-4f82-9f99-9476cc335a3c'; -- سيرين

UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'asas'
WHERE id = 'd1a3b497-c15b-42e5-83d8-864ce311fb5b'; -- نورة اليامي

UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'asas'
WHERE id = 'af56ca47-2637-494a-b0b1-64a83e29f942'; -- سارة منصور

UPDATE students SET academic_level = 2, group_id = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb', package = 'tamayuz'
WHERE id = 'f8d2f203-975f-4b0f-a607-ad1a05694f42'; -- سارة شراحيلي

-- Step 4: Create 4 teams
INSERT INTO teams (id, name, emoji, color, group_id)
VALUES
  ('cccccccc-4a4a-4a4a-4a4a-cccccccccccc', 'فريق A', '🔵', '#38bdf8', 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa'),
  ('dddddddd-4b4b-4b4b-4b4b-dddddddddddd', 'فريق B', '🟡', '#fbbf24', 'aaaaaaaa-4444-4444-4444-aaaaaaaaaaaa'),
  ('eeeeeeee-2a2a-2a2a-2a2a-eeeeeeeeeeee', 'فريق A', '🔵', '#38bdf8', 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb'),
  ('ffffffff-2b2b-2b2b-2b2b-ffffffffffff', 'فريق B', '🟡', '#fbbf24', 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb');

-- Step 5: Delete old team_members and insert new
DELETE FROM team_members;

-- Group 4 Team A: نادية، الهنوف، وعد
INSERT INTO team_members (team_id, student_id) VALUES
  ('cccccccc-4a4a-4a4a-4a4a-cccccccccccc', '0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e'),
  ('cccccccc-4a4a-4a4a-4a4a-cccccccccccc', 'de70db0c-1d87-4328-86d8-aa37344980a7'),
  ('cccccccc-4a4a-4a4a-4a4a-cccccccccccc', 'b091fb1d-15f1-43fc-841b-772328087fa3');

-- Group 4 Team B: هوازن، غيداء
INSERT INTO team_members (team_id, student_id) VALUES
  ('dddddddd-4b4b-4b4b-4b4b-dddddddddddd', '050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6'),
  ('dddddddd-4b4b-4b4b-4b4b-dddddddddddd', 'b8692228-5219-4a59-884e-da360d8c7c2b');

-- Group 2 Team A: منار، لين، فاطمة
INSERT INTO team_members (team_id, student_id) VALUES
  ('eeeeeeee-2a2a-2a2a-2a2a-eeeeeeeeeeee', 'cad66f17-4471-4e64-acce-aa2836e1a814'),
  ('eeeeeeee-2a2a-2a2a-2a2a-eeeeeeeeeeee', 'a64b4a03-5eac-433b-9dee-14af93e043c2'),
  ('eeeeeeee-2a2a-2a2a-2a2a-eeeeeeeeeeee', 'f9ecb220-107e-436e-a4b7-80fd9df0cba4');

-- Group 2 Team B: سيرين، نورة، سارة خالد، سارة شراحيلي
INSERT INTO team_members (team_id, student_id) VALUES
  ('ffffffff-2b2b-2b2b-2b2b-ffffffffffff', '4afd701f-aa1a-4f82-9f99-9476cc335a3c'),
  ('ffffffff-2b2b-2b2b-2b2b-ffffffffffff', 'd1a3b497-c15b-42e5-83d8-864ce311fb5b'),
  ('ffffffff-2b2b-2b2b-2b2b-ffffffffffff', 'af56ca47-2637-494a-b0b1-64a83e29f942'),
  ('ffffffff-2b2b-2b2b-2b2b-ffffffffffff', 'f8d2f203-975f-4b0f-a607-ad1a05694f42');

-- Step 6: Update students.team_id
-- Group 4 Team A
UPDATE students SET team_id = 'cccccccc-4a4a-4a4a-4a4a-cccccccccccc' WHERE id IN ('0aba3164-2cd9-4e47-a47b-c3c3b7e8a56e', 'de70db0c-1d87-4328-86d8-aa37344980a7', 'b091fb1d-15f1-43fc-841b-772328087fa3');
-- Group 4 Team B
UPDATE students SET team_id = 'dddddddd-4b4b-4b4b-4b4b-dddddddddddd' WHERE id IN ('050ebad7-0c3b-4eaa-9bd1-9eaeca44adb6', 'b8692228-5219-4a59-884e-da360d8c7c2b');
-- Group 2 Team A
UPDATE students SET team_id = 'eeeeeeee-2a2a-2a2a-2a2a-eeeeeeeeeeee' WHERE id IN ('cad66f17-4471-4e64-acce-aa2836e1a814', 'a64b4a03-5eac-433b-9dee-14af93e043c2', 'f9ecb220-107e-436e-a4b7-80fd9df0cba4');
-- Group 2 Team B
UPDATE students SET team_id = 'ffffffff-2b2b-2b2b-2b2b-ffffffffffff' WHERE id IN ('4afd701f-aa1a-4f82-9f99-9476cc335a3c', 'd1a3b497-c15b-42e5-83d8-864ce311fb5b', 'af56ca47-2637-494a-b0b1-64a83e29f942', 'f8d2f203-975f-4b0f-a607-ad1a05694f42');
