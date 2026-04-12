-- Add 'private' to student_package enum for private session students
ALTER TYPE student_package ADD VALUE IF NOT EXISTS 'private';
