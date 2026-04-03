-- T8-B: Setup trainer Dr. Mohammed Sharbat + onboarding column

-- Step 1: Insert profile (trigger may not have fired)
INSERT INTO profiles (id, email, full_name, display_name, role, must_change_password)
VALUES ('e8e64b7c-66df-43a7-83f7-9b96b660dcdd', 'goldmohmmed@gmail.com', 'د. محمد شربط', 'د. محمد', 'trainer', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = 'د. محمد شربط',
  display_name = 'د. محمد',
  role = 'trainer',
  must_change_password = true;

-- Step 2: Create trainer record
INSERT INTO trainers (id, specialization, per_session_rate, is_active)
VALUES ('e8e64b7c-66df-43a7-83f7-9b96b660dcdd', ARRAY['English'], 75, true);

-- Step 3: Assign to Group 2
UPDATE groups SET trainer_id = 'e8e64b7c-66df-43a7-83f7-9b96b660dcdd'
WHERE code = '2' AND is_active = true;

-- Step 4: Add onboarding_completed column to trainers
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
