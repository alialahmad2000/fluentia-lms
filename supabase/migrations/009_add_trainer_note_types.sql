-- ============================================================================
-- 009_add_trainer_note_types.sql
-- Add trainer_encouragement, trainer_observation, trainer_warning to
-- notification_type enum so TrainerQuickNotes can insert typed notes.
-- ============================================================================

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trainer_encouragement';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trainer_observation';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trainer_warning';
