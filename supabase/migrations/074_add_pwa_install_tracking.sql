-- Track PWA installation status for push notification eligibility
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pwa_installed BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pwa_install_prompted_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pwa_installed_at TIMESTAMPTZ;
