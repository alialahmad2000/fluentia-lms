# GOD COMM Phase A — Database Discovery
# Date: 2026-05-12

## Q1 — Candidate Tables That Exist
EXISTS:
- direct_messages (0 rows)
- group_messages (153 rows — REAL DATA, cannot drop)
- message_reactions (0 rows)
- notifications (596 rows — REAL DATA, cannot drop)
- push_subscriptions (268 rows — REAL DATA, cannot drop)

MISSING (need to create):
- group_channels
- channel_read_cursors
- message_reads
- message_pins
- message_mentions
- typing_indicators

## Q2 — Column Drift Analysis

### group_messages (153 rows — HAS DATA)
Actual columns:
  id uuid PK gen_random_uuid()
  group_id uuid nullable
  sender_id uuid nullable
  channel USER-DEFINED (enum: message_channel) nullable default 'general'
  type USER-DEFINED (enum: message_type) nullable default 'text'
  content text nullable           ← spec calls it `body`
  file_url text nullable
  voice_url text nullable
  voice_duration integer nullable  ← spec calls it `voice_duration_ms`
  is_pinned boolean default false
  reply_to uuid nullable
  created_at timestamptz default now()

MISSING vs spec:
  channel_id uuid FK group_channels  ← KEY: current design uses enum, spec uses FK table
  body text                           ← use content; add body as alias going forward
  file_name, file_size, file_mime
  voice_duration_ms                   ← will add; voice_duration stays for backward compat
  voice_waveform jsonb
  voice_transcript text
  voice_transcript_lang text
  image_url, image_width, image_height
  link_url, link_title, link_description, link_image_url, link_domain
  mentions uuid[]
  is_edited boolean
  edited_at timestamptz
  pinned_at timestamptz
  pinned_by uuid FK profiles
  deleted_at timestamptz             ← soft delete — CRITICAL

Enum values discovered:
  message_channel: general, reading, speaking, listening, writing, vocabulary,
                   grammar, announcements, class_summary
  message_type: text, image, voice, file, system, announcement

### message_reactions (0 rows)
Actual columns: id, message_id, user_id, emoji text, created_at
MISSING vs spec:
  UNIQUE(message_id, user_id, emoji) constraint
  CHECK emoji IN ('👍','🔥','❤️','😂','👏')

### notifications (596 rows — HAS DATA)
Actual columns:
  id, user_id, type USER-DEFINED enum, title, body, data jsonb default '{}',
  read boolean default false,     ← spec calls it `is_read`
  created_at, pushed bool, pushed_at,
  action_url text,                ← spec calls it `link`
  action_label, icon_url, image_url, priority, source_announcement_id, expires_at
MISSING vs spec: `kind` text, `is_read` bool, `link` text
ADAPTATION: use existing column names in code: read→is_read alias, action_url→link alias
  The `type` enum needs new values: message_mention, message_reply,
  channel_announcement, voice_note_received, reaction_received

### push_subscriptions (268 rows — HAS DATA)
Actual columns: id, user_id, endpoint, p256dh, auth, user_agent,
  device_label, created_at, last_used_at, is_active
vs spec: has `last_seen_at` → actual is `last_used_at`; extra: device_label, is_active
ADAPTATION: use last_used_at in code. is_active already useful.

### direct_messages (0 rows — out of scope for Phase 1)
Actual columns: id, from_id, to_id, content, file_url, voice_url, read_at, created_at
Phase 2 only.

## Q3 — Existing RLS Policies on Candidate Tables

### group_messages
- group_messages_select: group_id = get_student_group_id() OR get_trainer_group_ids() OR is_admin()
- group_messages_insert: sender_id = auth.uid() AND (student group OR trainer group OR admin)
- group_messages_update: trainer of group OR admin
- group_messages_delete: trainer of group OR admin

### notifications
- notifications_select: user_id = auth.uid() OR trainer sees students' OR admin
- notifications_insert: admin OR trainer
- notifications_update: user_id = auth.uid()
- notifications_delete: self OR admin OR trainer for their students
- "Service role inserts notifications": WITH CHECK true

### push_subscriptions
- "Users manage own push subscriptions": ALL where user_id = auth.uid()
- "Admins view all push subscriptions": SELECT for admins

## Q4 — Realtime Publication
supabase_realtime currently publishes:
  - activity_feed
  - student_curriculum_progress
NONE of the chat tables are published. Need to add:
  group_messages, message_reactions, notifications, channel_read_cursors

## Q5 — Row Counts
  group_messages: 153
  message_reactions: 0
  direct_messages: 0
  notifications: 596
  push_subscriptions: 268

## Q6 — Storage Buckets
Existing (relevant):
  voice-notes (private, 5MB limit, audio formats including mp4/webm/aac)
  submissions (private, 10MB, includes audio/webm and audio/mp4)
  materials (private, 50MB, includes pdf/images/video/audio)
MISSING (need to create):
  chat-voice — 25MB, audio/mp4 + audio/webm
  chat-files — 50MB, pdf/word/excel/zip
  chat-images — 10MB, png/jpeg/webp/gif

## Q7 — Groups
Total groups: 8
  Level 1 - Group A (id: e7753305-...)
  Level 1 - Group B (id: b1b1b1b1-...)
  Level 2 - Group A (id: 7ad2b12a-...)
  Level 2 - Group B (id: b4b93eea-...)
  Level 3 - Group A (id: 3a3a3a3a-...)
  Level 3 - Group B (id: d3c4efd1-...)
  المجموعة 2 (id: bbbbbbbb-...)
  المجموعة 4 (id: aaaaaaaa-...)
Total profiles: 32 (profiles table has no deleted_at column)

## Q8 — Group Membership Pattern
profiles.group_id → DOES NOT EXIST (query returned empty)
students.group_id → EXISTS ✅

Confirmed by existing RLS helper functions:
  get_student_group_id() → SELECT group_id FROM public.students WHERE id = auth.uid()
  get_trainer_group_ids() → SELECT COALESCE(array_agg(id), '{}') FROM public.groups WHERE trainer_id = auth.uid()
  is_admin() → SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  is_trainer() → SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('trainer','admin'))

The is_in_group() helper function (Phase B) MUST use students.group_id, NOT profiles.group_id.

## A.3 — Decision Log

DECISION: **DRIFT REPAIR**

Some candidate tables exist (group_messages with 153 real rows, notifications 596 rows,
push_subscriptions 268 rows) but have significant column drift vs the Phase B spec.
Phase B will:
  1. CREATE new tables: group_channels, message_reads, channel_read_cursors
  2. ALTER group_messages: add channel_id FK, add all missing columns, backfill channel_id
     from existing channel enum, add deleted_at for soft delete support
  3. ALTER message_reactions: add UNIQUE constraint + emoji CHECK
  4. ADAPT code to use existing notification column names (read, action_url, type enum)
     rather than renaming columns with 596 live rows
  5. ADAPT code to use push_subscriptions as-is (last_used_at not last_seen_at)
  6. NOT touch direct_messages (Phase 2 scope)

Group membership pattern: students.group_id (NOT profiles.group_id)
All RLS policies in Phase B use students.group_id via get_student_group_id() helper.

Pre-existing push infrastructure:
  - src/utils/pushSubscribe.js — complete
  - supabase/functions/send-push-notification/index.ts — exists
  - Phase L is ~60% pre-built; only need chat-specific trigger wiring.

Phase A complete. Decision: DRIFT REPAIR. Proceeding to Phase B.
