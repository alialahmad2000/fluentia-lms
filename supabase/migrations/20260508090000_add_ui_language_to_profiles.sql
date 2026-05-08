ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ui_language text NOT NULL DEFAULT 'ar';

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_ui_language_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_ui_language_check
  CHECK (ui_language IN ('ar','en'));

COMMENT ON COLUMN profiles.ui_language IS 'UI language preference. ar=Arabic (default), en=English. User-toggleable in Settings.';
