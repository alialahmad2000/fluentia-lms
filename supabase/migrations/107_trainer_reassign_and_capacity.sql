-- Update max_students: 7 → 10 (new academy capacity rule: optimal=7, max before split=10)
ALTER TABLE groups ALTER COLUMN max_students SET DEFAULT 10;
UPDATE groups SET max_students = 10 WHERE max_students = 7;
