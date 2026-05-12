# GOD COMM Phase A — Codebase Discovery
# Date: 2026-05-12

## Layout Files (`src/components/layout/`)
- Header.jsx, Header.legacy.jsx
- LayoutShell.jsx, LayoutShell.legacy.jsx
- Sidebar.jsx, Sidebar.legacy.jsx
- TrainerSidebar.jsx + TrainerSidebar.css
- MobileBar.jsx, TrainerMobileBar.jsx + css
- MobileDrawer.jsx
- NotificationCenter.jsx, NotificationSettings.jsx
- TrainerHeader.jsx, TrainerHeaderThemeButton.jsx + css

## Config Files (`src/config/`)
- navigation.js — structured nav with sections/items/mobileBar per role
- trainerNavigation.js
- trainerCompensation.js
- pageHelpRegistry.js

## navigation.js Analysis
- STUDENT_NAV: no chat entry. MessageCircle icon only used for "نادي المحادثة" → /student/speaking-hub
- TRAINER_NAV: no chat entry.
- ADMIN_NAV: MessageCircle used for "نادي المحادثة" → /admin/speaking-hubs
- Mobile bar (student): dashboard, curriculum, flashcards, progress, more — NO chat slot
- Chat entry will be added to STUDENT_NAV.sections[community] and TRAINER_NAV

## Prior Chat/Message Files
### ACTIVE
- `src/pages/student/StudentGroupChat.jsx` — active group chat page with 7 hard-coded channel
  constants (general, announcements, reading, speaking, listening, writing, vocabulary).
  Subscribes to `chat_messages` (WRONG table name — bug), queries `group_messages` table.
  Uses `channel` enum column to filter by selected channel.
- `src/pages/student/StudentMessages.jsx` — DM inbox (read-only view currently)

### DEPRECATED (renamed, not deleted — correct)
- `src/pages/trainer/TrainerGroupChat.deprecated.jsx`
- `src/pages/student/StudentConversation.deprecated.jsx`
- `src/components/trainer/nabih.deprecated/` — ChatInputBar, MessageList, ConversationsSidebar

## Realtime Usage (existing patterns)
- `src/stores/authStore.js` — postgres_changes on `students` table for real-time profile updates
- `src/hooks/useCompetition.js` — postgres_changes on competition tables
- `src/components/layout/NotificationCenter.jsx` — postgres_changes on `notifications`
- `src/pages/student/StudentGroupChat.jsx` — subscribes to `chat_messages` (bug: wrong table name, should be `group_messages`)
- `src/pages/student/StudentDuels.jsx` — broadcast channels for duel state
- `src/hooks/dashboard/useLevelActivityFeed.js` — postgres_changes on activity_feed
- `src/pages/student/curriculum/tabs/WritingTab.jsx`, `SpeakingTab.jsx` — per-tab subscriptions
All use proper `supabase.removeChannel(ch)` cleanup in useEffect return.

## Voice Infrastructure
- `src/components/assignments/VoiceRecorder.jsx` — assignment voice recorder
- `src/components/VoiceRecorder.jsx` — generic recorder
- `src/components/ielts/diagnostic/AudioRecorder.jsx` — IELTS-specific
- `src/components/ielts/speaking/SpeakingRecorder.jsx` — IELTS speaking
The chat voice recorder (Phase G) should be a new component, not reuse these.

## Push Notification Infrastructure (ALREADY EXISTS)
- `src/utils/pushSubscribe.js` — COMPLETE: subscribeUserToPush, unsubscribeFromPush,
  isPushSupported, getPushPermission, updateAppBadge, listenForSWMessages, detectDeviceLabel
- Uses `VITE_VAPID_PUBLIC_KEY` env var (must verify it's set)
- `push_subscriptions` table uses: user_id, endpoint, p256dh, auth, user_agent,
  device_label, is_active, last_used_at (NOT last_seen_at)
- `src/components/notifications/EnableNotificationsPrompt.jsx` — already exists
- Edge function: `supabase/functions/send-push-notification/index.ts` — already exists
  → Phase L is largely pre-built. Only need to wire chat triggers into send-push-notification.

## Router Pattern
- `src/App.jsx` uses BrowserRouter + Routes (react-router-dom v6)
- All routes in single App.jsx file with lazyRetry() imports
- `StudentGroupChat` is already imported and has a route (need to verify route path)
- Pattern: `lazyRetry(() => import('./pages/student/StudentGroupChat'))`

## Edge Functions (90+ total)
Key ones relevant to Phase 1:
- `send-push-notification` — already exists (Phase L done)
- `whisper-transcribe` — exists (Phase G voice can use it later for Phase 3)
- `nabih-chat` — exists (trainer AI, not chat)
NOT YET EXISTING (need to create):
- `process-mentions` — new (Phase J)
- `link-preview` — new (Phase H)

## Service Worker
- `src/App.jsx:292` unregisters all service workers on load (likely cleanup from old SW)
- `src/utils/hardRefresh.js` also handles SW cleanup
- No existing push-specific SW file found in `/public/` — need to create `public/sw-push.js`
