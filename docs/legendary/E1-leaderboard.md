# LEGENDARY-E1: Streak Widget, Team Card & Enhanced Leaderboard

## Summary
Added streak widget and team card to the student dashboard, and enhanced the leaderboard with a podium for top 3, level-based tab, and daily period filter.

## Components Created

### `src/components/student/StreakWidget.jsx`
- Fetches streak via `supabase.rpc('get_student_streak')`
- Displays fire emoji, current streak count, milestone progress bar
- Shows longest streak as subtext

### `src/components/student/TeamCard.jsx`
- Shows group name, trainer, member avatars
- Weekly team rank via `get_team_rank` RPC

## Components Modified

### `src/pages/student/StudentDashboard.jsx`
- Added StreakWidget + TeamCard in a 2-column grid after V2 widgets

### `src/pages/student/StudentLeaderboard.jsx`
- **New "level" tab** (`مستواي`): uses `get_level_leaderboard` RPC to rank students within same `academic_level`
- **New "day" period** (`اليوم`): filters XP transactions from midnight today
- **Podium for top 3**: gold/silver/bronze gradient pedestals with medal emojis, avatar display
- **Removed old teams tab**: replaced with level tab
- **`tabular-nums`** on all XP and rank numbers
- **Avatar support** for level tab (uses `avatar_url` from RPC)
- Level tab shows `groupName` badge (like academy tab)

### `src/components/layout/Sidebar.jsx`
- Added leaderboard nav entry with Trophy icon: `{ to: '/student/leaderboard', label: 'الترتيب', icon: Trophy }`

## Database RPCs (migration 127)

| RPC | Purpose |
|-----|---------|
| `get_level_leaderboard(p_level, p_period)` | Students ranked by XP within same academic_level |
| `get_academy_leaderboard(p_period)` | Top students across all groups |
| `get_team_rank(p_group_id)` | Weekly team rank for group |

All RPCs are `SECURITY DEFINER` with `Asia/Riyadh` timezone.

## Design Tokens
- Background: `#060e1c`, cards: `rgba(255,255,255,0.03)`
- Primary accent: `#38bdf8` (sky-blue)
- Gold accent: `#fbbf24` for streaks/ranks
- Font: Tajawal, RTL layout
