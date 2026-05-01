-- Add 'recordings' value to the student_package enum
-- Recordings package: LMS access + class recordings only, no live classes
-- Pricing: 500 SAR/month (Saeed Aref onboards as free gift = first ever use)

ALTER TYPE student_package ADD VALUE IF NOT EXISTS 'recordings';
