-- Fix Dr. Mohammed's group (المجموعة 2) level from A2 (2) to A1 (1)
-- goldmohmmed@gmail.com is the trainer for this group
-- groups.level: 1=A1 أساسيات, 2=A2 تطوير

UPDATE groups
SET level = 1
WHERE trainer_id IN (
  SELECT t.id FROM trainers t
  JOIN profiles p ON p.id = t.id
  WHERE p.email = 'goldmohmmed@gmail.com'
)
AND level = 2;
