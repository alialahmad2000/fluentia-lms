-- 015: Student Avatar Customization
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_customization JSONB DEFAULT '{}';
