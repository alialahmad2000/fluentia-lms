-- ============================================================================
-- Fluentia LMS — Initial Database Schema
-- Production English Language Academy LMS on Supabase PostgreSQL
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('student', 'trainer', 'admin');
CREATE TYPE student_package AS ENUM ('asas', 'talaqa', 'tamayuz', 'ielts');
CREATE TYPE student_track AS ENUM ('foundation', 'development', 'ielts');
CREATE TYPE student_status AS ENUM ('active', 'paused', 'graduated', 'withdrawn');
CREATE TYPE assignment_type AS ENUM ('reading', 'speaking', 'listening', 'writing', 'grammar', 'vocabulary', 'irregular_verbs', 'custom');
CREATE TYPE submission_status AS ENUM ('draft', 'submitted', 'graded', 'resubmit_requested');
CREATE TYPE difficulty_rating AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE class_type AS ENUM ('group', 'private');
CREATE TYPE class_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'excused');
CREATE TYPE checkin_method AS ENUM ('trainer', 'code', 'auto');
CREATE TYPE private_session_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE message_channel AS ENUM ('general', 'reading', 'speaking', 'listening', 'writing', 'vocabulary', 'grammar', 'announcements', 'class_summary');
CREATE TYPE message_type AS ENUM ('text', 'image', 'voice', 'file', 'system', 'announcement');
CREATE TYPE notification_type AS ENUM ('assignment_new', 'assignment_deadline', 'assignment_graded', 'class_reminder', 'trainer_note', 'achievement', 'peer_recognition', 'team_update', 'payment_reminder', 'level_up', 'streak_warning', 'system');
CREATE TYPE payment_status AS ENUM ('paid', 'partial', 'pending', 'overdue', 'failed');
CREATE TYPE payment_method AS ENUM ('moyasar', 'bank_transfer', 'cash', 'free');
CREATE TYPE payroll_status AS ENUM ('pending', 'paid');
CREATE TYPE assessment_type AS ENUM ('placement', 'periodic', 'self');
CREATE TYPE vocab_mastery AS ENUM ('new', 'learning', 'reviewing', 'mastered');
CREATE TYPE report_type AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE report_status AS ENUM ('draft', 'trainer_review', 'published');
CREATE TYPE share_type AS ENUM ('achievement', 'level_up', 'streak', 'report', 'certificate', 'challenge', 'placement_test');
CREATE TYPE share_platform AS ENUM ('twitter', 'instagram', 'tiktok', 'snapchat', 'whatsapp', 'threads', 'copy_link');
CREATE TYPE referral_status AS ENUM ('pending', 'signed_up', 'subscribed');
CREATE TYPE xp_reason AS ENUM ('assignment_on_time', 'assignment_late', 'class_attendance', 'correct_answer', 'helped_peer', 'shared_summary', 'streak_bonus', 'achievement', 'peer_recognition', 'challenge', 'daily_challenge', 'voice_note_bonus', 'writing_bonus', 'early_bird', 'custom', 'penalty_absent', 'penalty_unknown_word', 'penalty_pronunciation');
CREATE TYPE challenge_type AS ENUM ('weekly', 'team', 'one_v_one', 'thirty_day', 'trainer_custom', 'social');
CREATE TYPE quiz_type AS ENUM ('quick_quiz', 'full_assessment');
CREATE TYPE quiz_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'fill_blank', 'reorder', 'matching', 'short_answer');
CREATE TYPE quiz_attempt_status AS ENUM ('in_progress', 'completed', 'timed_out');
CREATE TYPE activity_type AS ENUM ('submission', 'achievement', 'streak', 'level_up', 'team_rank', 'peer_recognition', 'challenge_complete', 'new_member', 'class_summary', 'announcement');
CREATE TYPE ai_usage_type AS ENUM ('writing_feedback', 'speaking_analysis', 'smart_nudge', 'progress_report', 'grammar_check', 'chatbot', 'quiz_generation', 'trainer_assistant', 'content_recommendation', 'whisper_transcription');
CREATE TYPE analytics_device AS ENUM ('mobile', 'desktop', 'tablet');


-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- 1. profiles — extends Supabase auth.users
CREATE TABLE profiles (
    id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    full_name   text NOT NULL,
    display_name text,
    avatar_url  text,
    role        user_role NOT NULL DEFAULT 'student',
    phone       text,
    email       text,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_profiles_role ON profiles (role);

-- 2. trainers
CREATE TABLE trainers (
    id                uuid PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
    specialization    text[] DEFAULT '{}',
    per_session_rate  integer DEFAULT 0,
    is_active         boolean DEFAULT true
);

-- ============================================================================
-- GROUP & TEAM TABLES
-- ============================================================================

-- 3. groups
CREATE TABLE groups (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name             text NOT NULL,
    code             text NOT NULL,
    level            integer NOT NULL CHECK (level BETWEEN 1 AND 5),
    trainer_id       uuid REFERENCES trainers,
    max_students     integer DEFAULT 7,
    google_meet_link text,
    schedule         jsonb DEFAULT '{}',
    is_active        boolean DEFAULT true,
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_groups_trainer_id ON groups (trainer_id);
CREATE INDEX idx_groups_code ON groups (code);

-- 4. teams
CREATE TABLE teams (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    emoji      text,
    color      text,
    group_id   uuid REFERENCES groups ON DELETE CASCADE,
    total_xp   integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_teams_group_id ON teams (group_id);

-- ============================================================================
-- STUDENT TABLES
-- ============================================================================

-- 5. students
CREATE TABLE students (
    id                     uuid PRIMARY KEY REFERENCES profiles ON DELETE CASCADE,
    academic_level         integer DEFAULT 1 CHECK (academic_level BETWEEN 1 AND 5),
    ielts_phase            integer CHECK (ielts_phase BETWEEN 1 AND 3),
    package                student_package DEFAULT 'asas',
    track                  student_track DEFAULT 'foundation',
    group_id               uuid REFERENCES groups,
    team_id                uuid REFERENCES teams,
    xp_total               integer DEFAULT 0,
    current_streak         integer DEFAULT 0,
    longest_streak         integer DEFAULT 0,
    gamification_level     integer DEFAULT 1,
    streak_freeze_available boolean DEFAULT false,
    enrollment_date        date DEFAULT CURRENT_DATE,
    status                 student_status DEFAULT 'active',
    custom_price           integer,
    payment_day            integer CHECK (payment_day BETWEEN 1 AND 31),
    payment_link           text,
    referral_code          text UNIQUE,
    referred_by            uuid REFERENCES students,
    writing_limit_override integer,
    goals                  text,
    interests              text[] DEFAULT '{}',
    public_goal            text,
    last_active_at         timestamptz DEFAULT now(),
    onboarding_completed   boolean DEFAULT false,
    deleted_at             timestamptz
);

CREATE INDEX idx_students_group_id ON students (group_id);
CREATE INDEX idx_students_team_id ON students (team_id);
CREATE INDEX idx_students_status ON students (status);
CREATE INDEX idx_students_referred_by ON students (referred_by);

-- 6. team_members (junction table)
CREATE TABLE team_members (
    team_id    uuid REFERENCES teams ON DELETE CASCADE,
    student_id uuid REFERENCES students ON DELETE CASCADE,
    joined_at  timestamptz DEFAULT now(),
    PRIMARY KEY (team_id, student_id)
);

CREATE INDEX idx_team_members_student_id ON team_members (student_id);

-- ============================================================================
-- ASSIGNMENT & SUBMISSION TABLES
-- ============================================================================

-- 7. assignments
CREATE TABLE assignments (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id       uuid REFERENCES trainers,
    group_id         uuid REFERENCES groups,
    title            text NOT NULL,
    description      text,
    type             assignment_type NOT NULL,
    instructions     text,
    attachments      jsonb DEFAULT '[]',
    youtube_url      text,
    external_link    text,
    deadline         timestamptz,
    points_on_time   integer DEFAULT 10,
    points_late      integer DEFAULT 5,
    allow_late       boolean DEFAULT true,
    allow_resubmit   boolean DEFAULT true,
    is_recurring     boolean DEFAULT false,
    recurrence_rule  jsonb,
    is_visible       boolean DEFAULT true,
    version          integer DEFAULT 1,
    version_history  jsonb DEFAULT '[]',
    created_at       timestamptz DEFAULT now(),
    deleted_at       timestamptz
);

CREATE INDEX idx_assignments_trainer_id ON assignments (trainer_id);
CREATE INDEX idx_assignments_group_id ON assignments (group_id);
CREATE INDEX idx_assignments_type ON assignments (type);
CREATE INDEX idx_assignments_deadline ON assignments (deadline);

-- 8. submissions
CREATE TABLE submissions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id            uuid REFERENCES assignments,
    student_id               uuid REFERENCES students,
    assignment_version       integer DEFAULT 1,
    content_text             text,
    content_voice_url        text,
    content_voice_duration   integer,
    content_voice_transcript text,
    content_image_urls       text[] DEFAULT '{}',
    content_file_urls        jsonb DEFAULT '[]',
    content_link             text,
    difficulty_rating        difficulty_rating,
    status                   submission_status DEFAULT 'draft',
    submitted_at             timestamptz,
    is_late                  boolean DEFAULT false,
    grade                    text,
    grade_numeric            integer,
    trainer_feedback         text,
    trainer_feedback_template text,
    ai_feedback              jsonb,
    ai_feedback_approved     boolean DEFAULT false,
    points_awarded           integer DEFAULT 0,
    created_at               timestamptz DEFAULT now(),
    updated_at               timestamptz DEFAULT now(),
    deleted_at               timestamptz
);

CREATE INDEX idx_submissions_assignment_id ON submissions (assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions (student_id);
CREATE INDEX idx_submissions_assignment_student ON submissions (assignment_id, student_id);
CREATE INDEX idx_submissions_status ON submissions (status);

-- ============================================================================
-- SPEAKING TOPIC TABLES
-- ============================================================================

-- 9. speaking_topic_banks
CREATE TABLE speaking_topic_banks (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level            integer NOT NULL CHECK (level BETWEEN 1 AND 5),
    topic_number     integer NOT NULL,
    title_en         text NOT NULL,
    title_ar         text,
    category         text,
    difficulty       difficulty_rating DEFAULT 'medium',
    prompt_questions text[] DEFAULT '{}',
    created_at       timestamptz DEFAULT now(),
    UNIQUE (level, topic_number)
);

-- 10. student_speaking_progress
CREATE TABLE student_speaking_progress (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    uuid REFERENCES students,
    topic_id      uuid REFERENCES speaking_topic_banks,
    completed     boolean DEFAULT false,
    submission_id uuid REFERENCES submissions,
    completed_at  timestamptz,
    UNIQUE (student_id, topic_id)
);

CREATE INDEX idx_student_speaking_progress_student_id ON student_speaking_progress (student_id);
CREATE INDEX idx_student_speaking_progress_topic_id ON student_speaking_progress (topic_id);

-- ============================================================================
-- GAMIFICATION TABLES
-- ============================================================================

-- 11. xp_transactions
CREATE TABLE xp_transactions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid REFERENCES students,
    amount      integer NOT NULL,
    reason      xp_reason NOT NULL,
    description text,
    related_id  uuid,
    awarded_by  uuid REFERENCES profiles,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_xp_transactions_student_id ON xp_transactions (student_id);
CREATE INDEX idx_xp_transactions_student_created ON xp_transactions (student_id, created_at DESC);

-- 12. achievements
CREATE TABLE achievements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code           text UNIQUE NOT NULL,
    name_ar        text NOT NULL,
    name_en        text,
    description_ar text,
    icon           text,
    xp_reward      integer DEFAULT 0,
    condition      jsonb,
    is_active      boolean DEFAULT true
);

-- 13. student_achievements
CREATE TABLE student_achievements (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id     uuid REFERENCES students,
    achievement_id uuid REFERENCES achievements,
    earned_at      timestamptz DEFAULT now(),
    shared         boolean DEFAULT false,
    UNIQUE (student_id, achievement_id)
);

CREATE INDEX idx_student_achievements_student_id ON student_achievements (student_id);
CREATE INDEX idx_student_achievements_achievement_id ON student_achievements (achievement_id);

-- 14. challenges
CREATE TABLE challenges (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar       text NOT NULL,
    description_ar text,
    type           challenge_type NOT NULL,
    target         jsonb,
    xp_reward      integer DEFAULT 0,
    start_date     timestamptz,
    end_date       timestamptz,
    group_id       uuid REFERENCES groups,
    created_by     uuid REFERENCES profiles,
    is_active      boolean DEFAULT true
);

CREATE INDEX idx_challenges_group_id ON challenges (group_id);
CREATE INDEX idx_challenges_created_by ON challenges (created_by);

-- 15. challenge_participants
CREATE TABLE challenge_participants (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id uuid REFERENCES challenges ON DELETE CASCADE,
    student_id   uuid REFERENCES students,
    progress     integer DEFAULT 0,
    completed    boolean DEFAULT false,
    completed_at timestamptz
);

CREATE INDEX idx_challenge_participants_challenge_id ON challenge_participants (challenge_id);
CREATE INDEX idx_challenge_participants_student_id ON challenge_participants (student_id);

-- 16. peer_recognitions
CREATE TABLE peer_recognitions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_student uuid REFERENCES students,
    to_student   uuid REFERENCES students,
    message      text,
    xp_awarded   integer DEFAULT 5,
    created_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_peer_recognitions_from_student ON peer_recognitions (from_student);
CREATE INDEX idx_peer_recognitions_to_student ON peer_recognitions (to_student);

-- ============================================================================
-- CLASS & ATTENDANCE TABLES
-- ============================================================================

-- 17. classes
CREATE TABLE classes (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id         uuid REFERENCES groups,
    trainer_id       uuid REFERENCES trainers,
    type             class_type DEFAULT 'group',
    title            text,
    topic            text,
    date             date NOT NULL,
    start_time       time NOT NULL,
    end_time         time,
    google_meet_link text,
    recording_url    text,
    summary_text     text,
    summary_file_url text,
    attendance_code  text,
    status           class_status DEFAULT 'scheduled',
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_classes_group_id ON classes (group_id);
CREATE INDEX idx_classes_trainer_id ON classes (trainer_id);
CREATE INDEX idx_classes_group_date ON classes (group_id, date);
CREATE INDEX idx_classes_date ON classes (date);

-- 18. attendance
CREATE TABLE attendance (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id       uuid REFERENCES classes ON DELETE CASCADE,
    student_id     uuid REFERENCES students,
    status         attendance_status DEFAULT 'absent',
    checked_in_via checkin_method,
    xp_awarded     integer DEFAULT 0,
    created_at     timestamptz DEFAULT now(),
    UNIQUE (class_id, student_id)
);

CREATE INDEX idx_attendance_class_id ON attendance (class_id);
CREATE INDEX idx_attendance_student_id ON attendance (student_id);
CREATE INDEX idx_attendance_class_student ON attendance (class_id, student_id);

-- 19. private_sessions
CREATE TABLE private_sessions (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       uuid REFERENCES students,
    trainer_id       uuid REFERENCES trainers,
    date             date NOT NULL,
    start_time       time NOT NULL,
    end_time         time,
    google_meet_link text,
    status           private_session_status DEFAULT 'scheduled',
    notes            text,
    trainer_rate     integer,
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_private_sessions_student_id ON private_sessions (student_id);
CREATE INDEX idx_private_sessions_trainer_id ON private_sessions (trainer_id);
CREATE INDEX idx_private_sessions_date ON private_sessions (date);

-- ============================================================================
-- MESSAGING TABLES
-- ============================================================================

-- 20. group_messages
CREATE TABLE group_messages (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id       uuid REFERENCES groups ON DELETE CASCADE,
    sender_id      uuid REFERENCES profiles,
    channel        message_channel DEFAULT 'general',
    type           message_type DEFAULT 'text',
    content        text,
    file_url       text,
    voice_url      text,
    voice_duration integer,
    is_pinned      boolean DEFAULT false,
    reply_to       uuid REFERENCES group_messages,
    created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_group_messages_group_id ON group_messages (group_id);
CREATE INDEX idx_group_messages_sender_id ON group_messages (sender_id);
CREATE INDEX idx_group_messages_group_channel_created ON group_messages (group_id, channel, created_at DESC);
CREATE INDEX idx_group_messages_reply_to ON group_messages (reply_to);

-- 21. message_reactions
CREATE TABLE message_reactions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid REFERENCES group_messages ON DELETE CASCADE,
    user_id    uuid REFERENCES profiles,
    emoji      text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message_id ON message_reactions (message_id);
CREATE INDEX idx_message_reactions_user_id ON message_reactions (user_id);

-- 22. direct_messages
CREATE TABLE direct_messages (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_id    uuid REFERENCES profiles,
    to_id      uuid REFERENCES profiles,
    content    text,
    file_url   text,
    voice_url  text,
    read_at    timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_direct_messages_from_id ON direct_messages (from_id);
CREATE INDEX idx_direct_messages_to_id ON direct_messages (to_id);
CREATE INDEX idx_direct_messages_created ON direct_messages (created_at DESC);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

-- 23. notifications
CREATE TABLE notifications (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES profiles,
    type       notification_type NOT NULL,
    title      text NOT NULL,
    body       text,
    data       jsonb DEFAULT '{}',
    read       boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user_id ON notifications (user_id);
CREATE INDEX idx_notifications_user_read_created ON notifications (user_id, read, created_at DESC);

-- ============================================================================
-- PAYMENT & PAYROLL TABLES
-- ============================================================================

-- 24. payments
CREATE TABLE payments (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id         uuid REFERENCES students,
    amount             integer NOT NULL,
    status             payment_status DEFAULT 'pending',
    method             payment_method,
    period_start       date,
    period_end         date,
    paid_at            timestamptz,
    moyasar_payment_id text,
    notes              text,
    recorded_by        uuid REFERENCES profiles,
    created_at         timestamptz DEFAULT now(),
    deleted_at         timestamptz
);

CREATE INDEX idx_payments_student_id ON payments (student_id);
CREATE INDEX idx_payments_student_period ON payments (student_id, period_start);
CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_recorded_by ON payments (recorded_by);

-- 25. trainer_payroll
CREATE TABLE trainer_payroll (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id             uuid REFERENCES trainers,
    period_month           date NOT NULL,
    private_sessions_count integer DEFAULT 0,
    rate_per_session       integer,
    total_amount           integer,
    status                 payroll_status DEFAULT 'pending',
    paid_at                timestamptz,
    notes                  text
);

CREATE INDEX idx_trainer_payroll_trainer_id ON trainer_payroll (trainer_id);
CREATE INDEX idx_trainer_payroll_period ON trainer_payroll (period_month);

-- ============================================================================
-- ASSESSMENT & SKILL TABLES
-- ============================================================================

-- 26. assessments
CREATE TABLE assessments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    uuid REFERENCES students,
    type          assessment_type NOT NULL,
    level_at_time integer,
    scores        jsonb,
    overall_score integer,
    ai_analysis   text,
    trainer_notes text,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_assessments_student_id ON assessments (student_id);

-- 27. skill_snapshots
CREATE TABLE skill_snapshots (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    uuid REFERENCES students,
    grammar       integer DEFAULT 0 CHECK (grammar BETWEEN 0 AND 100),
    vocabulary    integer DEFAULT 0 CHECK (vocabulary BETWEEN 0 AND 100),
    speaking      integer DEFAULT 0 CHECK (speaking BETWEEN 0 AND 100),
    listening     integer DEFAULT 0 CHECK (listening BETWEEN 0 AND 100),
    reading       integer DEFAULT 0 CHECK (reading BETWEEN 0 AND 100),
    writing       integer DEFAULT 0 CHECK (writing BETWEEN 0 AND 100),
    snapshot_date date DEFAULT CURRENT_DATE
);

CREATE INDEX idx_skill_snapshots_student_id ON skill_snapshots (student_id);
CREATE INDEX idx_skill_snapshots_date ON skill_snapshots (snapshot_date);

-- ============================================================================
-- ACTIVITY & CONTENT TABLES
-- ============================================================================

-- 28. activity_feed
CREATE TABLE activity_feed (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid REFERENCES groups,
    student_id  uuid REFERENCES students,
    type        activity_type NOT NULL,
    title       text NOT NULL,
    description text,
    data        jsonb DEFAULT '{}',
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_feed_group_id ON activity_feed (group_id);
CREATE INDEX idx_activity_feed_student_id ON activity_feed (student_id);
CREATE INDEX idx_activity_feed_group_created ON activity_feed (group_id, created_at DESC);

-- 29. vocabulary_bank
CREATE TABLE vocabulary_bank (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id       uuid REFERENCES students,
    word             text NOT NULL,
    meaning_en       text,
    meaning_ar       text,
    example_sentence text,
    source           text,
    level            integer,
    mastery          vocab_mastery DEFAULT 'new',
    next_review      timestamptz,
    review_count     integer DEFAULT 0,
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_vocabulary_bank_student_id ON vocabulary_bank (student_id);
CREATE INDEX idx_vocabulary_bank_mastery ON vocabulary_bank (mastery);
CREATE INDEX idx_vocabulary_bank_next_review ON vocabulary_bank (next_review);

-- 30. class_notes
CREATE TABLE class_notes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id            uuid REFERENCES classes ON DELETE CASCADE,
    author_id           uuid REFERENCES profiles,
    content             text,
    file_url            text,
    is_trainer_summary  boolean DEFAULT false,
    is_pinned           boolean DEFAULT false,
    xp_awarded          integer DEFAULT 0,
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_class_notes_class_id ON class_notes (class_id);
CREATE INDEX idx_class_notes_author_id ON class_notes (author_id);

-- ============================================================================
-- REPORTING TABLES
-- ============================================================================

-- 31. progress_reports
CREATE TABLE progress_reports (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id    uuid REFERENCES students,
    period_start  date NOT NULL,
    period_end    date NOT NULL,
    type          report_type NOT NULL,
    ai_summary    text,
    trainer_notes text,
    data          jsonb DEFAULT '{}',
    pdf_url       text,
    status        report_status DEFAULT 'draft',
    published_at  timestamptz
);

CREATE INDEX idx_progress_reports_student_id ON progress_reports (student_id);
CREATE INDEX idx_progress_reports_period ON progress_reports (period_start, period_end);

-- ============================================================================
-- SCHEDULING & HOLIDAYS
-- ============================================================================

-- 32. holidays
CREATE TABLE holidays (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    reschedule_info text,
    created_by      uuid REFERENCES profiles
);

CREATE INDEX idx_holidays_dates ON holidays (start_date, end_date);

-- ============================================================================
-- SOCIAL & REFERRAL TABLES
-- ============================================================================

-- 33. social_shares
CREATE TABLE social_shares (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  uuid REFERENCES students,
    type        share_type NOT NULL,
    platform    share_platform NOT NULL,
    shared_at   timestamptz DEFAULT now(),
    xp_awarded  integer DEFAULT 0
);

CREATE INDEX idx_social_shares_student_id ON social_shares (student_id);

-- 34. referrals
CREATE TABLE referrals (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id         uuid REFERENCES students,
    referred_email      text NOT NULL,
    referred_student_id uuid REFERENCES students,
    status              referral_status DEFAULT 'pending',
    xp_awarded          integer DEFAULT 0,
    discount_applied    boolean DEFAULT false,
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_referrals_referrer_id ON referrals (referrer_id);
CREATE INDEX idx_referrals_referred_student_id ON referrals (referred_student_id);

-- ============================================================================
-- SYSTEM TABLES
-- ============================================================================

-- 35. settings (key-value config store)
CREATE TABLE settings (
    key        text PRIMARY KEY,
    value      jsonb NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES profiles
);

-- 36. system_errors
CREATE TABLE system_errors (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    error_type    text NOT NULL,
    service       text,
    user_id       uuid REFERENCES profiles,
    error_message text NOT NULL,
    error_context jsonb DEFAULT '{}',
    stack_trace   text,
    resolved      boolean DEFAULT false,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_system_errors_type ON system_errors (error_type);
CREATE INDEX idx_system_errors_user_id ON system_errors (user_id);
CREATE INDEX idx_system_errors_resolved ON system_errors (resolved);
CREATE INDEX idx_system_errors_created ON system_errors (created_at DESC);

-- ============================================================================
-- AI & ANALYTICS TABLES
-- ============================================================================

-- 37. ai_usage
CREATE TABLE ai_usage (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    type               ai_usage_type NOT NULL,
    student_id         uuid REFERENCES students,
    trainer_id         uuid REFERENCES trainers,
    model              text,
    input_tokens       integer,
    output_tokens      integer,
    audio_seconds      integer,
    estimated_cost_sar numeric(10, 4) DEFAULT 0,
    created_at         timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_type ON ai_usage (type);
CREATE INDEX idx_ai_usage_student_id ON ai_usage (student_id);
CREATE INDEX idx_ai_usage_trainer_id ON ai_usage (trainer_id);
CREATE INDEX idx_ai_usage_created ON ai_usage (created_at DESC);

-- 38. analytics_events
CREATE TABLE analytics_events (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid REFERENCES profiles,
    event      text NOT NULL,
    properties jsonb DEFAULT '{}',
    session_id text,
    device     text,
    browser    text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_analytics_events_user_id ON analytics_events (user_id);
CREATE INDEX idx_analytics_events_event ON analytics_events (event);
CREATE INDEX idx_analytics_events_created ON analytics_events (created_at DESC);

-- 39. audit_log
CREATE TABLE audit_log (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    uuid REFERENCES profiles,
    action      text NOT NULL,
    target_type text,
    target_id   uuid,
    old_data    jsonb,
    new_data    jsonb,
    description text,
    ip_address  text,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_audit_log_actor_id ON audit_log (actor_id);
CREATE INDEX idx_audit_log_action ON audit_log (action);
CREATE INDEX idx_audit_log_target ON audit_log (target_type, target_id);
CREATE INDEX idx_audit_log_created ON audit_log (created_at DESC);

-- ============================================================================
-- QUIZ TABLES
-- ============================================================================

-- 40. quizzes
CREATE TABLE quizzes (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trainer_id          uuid REFERENCES trainers,
    group_id            uuid REFERENCES groups,
    title               text NOT NULL,
    description         text,
    type                quiz_type NOT NULL,
    context_prompt      text,
    level               integer CHECK (level BETWEEN 1 AND 5),
    skill_focus         text[] DEFAULT '{}',
    time_limit_minutes  integer,
    total_questions     integer DEFAULT 0,
    total_points        integer DEFAULT 0,
    xp_reward           integer DEFAULT 0,
    xp_bonus_perfect    integer DEFAULT 0,
    is_scheduled        boolean DEFAULT false,
    scheduled_at        timestamptz,
    deadline            timestamptz,
    shuffle_questions   boolean DEFAULT true,
    shuffle_options     boolean DEFAULT true,
    show_answers_after  boolean DEFAULT true,
    status              quiz_status DEFAULT 'draft',
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_quizzes_trainer_id ON quizzes (trainer_id);
CREATE INDEX idx_quizzes_group_id ON quizzes (group_id);
CREATE INDEX idx_quizzes_status ON quizzes (status);

-- 41. quiz_questions
CREATE TABLE quiz_questions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id            uuid REFERENCES quizzes ON DELETE CASCADE,
    order_number       integer NOT NULL,
    type               question_type NOT NULL,
    question_text      text NOT NULL,
    question_image_url text,
    options            jsonb DEFAULT '[]',
    correct_answer     text,
    accepted_answers   text[] DEFAULT '{}',
    matching_pairs     jsonb DEFAULT '[]',
    reorder_correct    text[] DEFAULT '{}',
    points             integer DEFAULT 1,
    explanation        text,
    skill_tag          text
);

CREATE INDEX idx_quiz_questions_quiz_id ON quiz_questions (quiz_id);

-- 42. quiz_attempts
CREATE TABLE quiz_attempts (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id            uuid REFERENCES quizzes,
    student_id         uuid REFERENCES students,
    started_at         timestamptz DEFAULT now(),
    completed_at       timestamptz,
    time_spent_seconds integer DEFAULT 0,
    total_score        integer DEFAULT 0,
    max_score          integer DEFAULT 0,
    percentage         numeric(5, 2) DEFAULT 0,
    skill_breakdown    jsonb DEFAULT '{}',
    xp_awarded         integer DEFAULT 0,
    status             quiz_attempt_status DEFAULT 'in_progress'
);

CREATE INDEX idx_quiz_attempts_quiz_id ON quiz_attempts (quiz_id);
CREATE INDEX idx_quiz_attempts_student_id ON quiz_attempts (student_id);

-- 43. quiz_answers
CREATE TABLE quiz_answers (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id     uuid REFERENCES quiz_attempts ON DELETE CASCADE,
    question_id    uuid REFERENCES quiz_questions,
    student_answer text,
    is_correct     boolean DEFAULT false,
    points_earned  integer DEFAULT 0,
    ai_grade       jsonb
);

CREATE INDEX idx_quiz_answers_attempt_id ON quiz_answers (attempt_id);
CREATE INDEX idx_quiz_answers_question_id ON quiz_answers (question_id);
