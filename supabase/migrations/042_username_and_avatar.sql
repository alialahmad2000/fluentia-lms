-- Migration 042: Username column + avatar_url column (idempotent)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Auto-generate usernames for existing profiles without one
UPDATE profiles SET username = split_part(full_name, ' ', 1) || '_' || lpad(floor(random() * 10000)::text, 4, '0')
WHERE username IS NULL AND full_name IS NOT NULL;
