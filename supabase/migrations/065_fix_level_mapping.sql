-- T8-F: Fix level-to-curriculum mapping
-- Group 4 students = B1 (level_number 3), was incorrectly set to 4 (B2)
-- Group 2 students = A1 (level_number 1), was incorrectly set to 2 (A2)

-- Fix Group 4: level 4 → 3 (B1)
UPDATE groups SET level = 3 WHERE code = '4' AND is_active = true;

-- Fix Group 2: level 2 → 1 (A1)
UPDATE groups SET level = 1 WHERE code = '2' AND is_active = true;

-- Fix students in Group 4: academic_level 4 → 3
UPDATE students SET academic_level = 3
WHERE group_id = (SELECT id FROM groups WHERE code = '4' AND is_active = true)
  AND deleted_at IS NULL;

-- Fix students in Group 2: academic_level 2 → 1
UPDATE students SET academic_level = 1
WHERE group_id = (SELECT id FROM groups WHERE code = '2' AND is_active = true)
  AND deleted_at IS NULL;
