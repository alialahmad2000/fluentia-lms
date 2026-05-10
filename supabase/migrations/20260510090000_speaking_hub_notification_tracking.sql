-- Track when notification was last sent for each hub
ALTER TABLE speaking_hubs
  ADD COLUMN IF NOT EXISTS last_notification_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_notification_recipient_count int;
