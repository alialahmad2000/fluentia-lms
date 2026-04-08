-- ============================================================
-- Creator Challenge — Video Competition Feature
-- Students create short educational videos, post on social
-- media, and compete for views + XP prizes.
-- ============================================================

-- Status enum for creator challenges
CREATE TYPE creator_challenge_status AS ENUM ('draft', 'active', 'judging', 'completed');

-- Platform enum for video submissions
CREATE TYPE video_platform AS ENUM ('tiktok', 'instagram', 'youtube', 'snapchat', 'x', 'other');

-- Submission review status
CREATE TYPE creator_submission_status AS ENUM ('pending', 'approved', 'rejected');

-- ─── Creator Challenges ─────────────────────────────────────
CREATE TABLE creator_challenges (
    id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title_ar               text NOT NULL,
    description_ar         text,
    hashtag                text DEFAULT '#FluentiaChallenege',
    rules_ar               text,
    xp_reward_participation integer DEFAULT 30,
    xp_reward_1st          integer DEFAULT 200,
    xp_reward_2nd          integer DEFAULT 100,
    xp_reward_3rd          integer DEFAULT 50,
    min_duration_sec       integer DEFAULT 30,
    max_duration_sec       integer DEFAULT 120,
    start_date             timestamptz NOT NULL,
    end_date               timestamptz NOT NULL,
    judging_end_date       timestamptz,
    status                 creator_challenge_status DEFAULT 'draft',
    created_by             uuid REFERENCES profiles(id),
    created_at             timestamptz DEFAULT now()
);

CREATE INDEX idx_creator_challenges_status ON creator_challenges(status);

-- ─── Creator Submissions ────────────────────────────────────
CREATE TABLE creator_submissions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id      uuid REFERENCES creator_challenges(id) ON DELETE CASCADE NOT NULL,
    student_id        uuid REFERENCES students(id) NOT NULL,
    video_url         text NOT NULL,
    platform          video_platform NOT NULL DEFAULT 'tiktok',
    description       text,
    view_count        integer DEFAULT 0,
    shows_platform    boolean DEFAULT false,
    status            creator_submission_status DEFAULT 'pending',
    rejection_reason  text,
    rank              integer,
    xp_awarded        integer DEFAULT 0,
    submitted_at      timestamptz DEFAULT now(),
    reviewed_at       timestamptz,
    reviewed_by       uuid REFERENCES profiles(id),
    UNIQUE(challenge_id, student_id)
);

CREATE INDEX idx_creator_submissions_challenge ON creator_submissions(challenge_id);
CREATE INDEX idx_creator_submissions_student ON creator_submissions(student_id);
CREATE INDEX idx_creator_submissions_status ON creator_submissions(status);

-- ─── RLS Policies ───────────────────────────────────────────
ALTER TABLE creator_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_submissions ENABLE ROW LEVEL SECURITY;

-- Creator challenges: everyone can read active challenges
CREATE POLICY "Anyone can view active creator challenges"
    ON creator_challenges FOR SELECT
    USING (status IN ('active', 'judging', 'completed'));

-- Admin can do everything with challenges
CREATE POLICY "Admin full access to creator challenges"
    ON creator_challenges FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Students can view all approved submissions
CREATE POLICY "Anyone can view approved submissions"
    ON creator_submissions FOR SELECT
    USING (status = 'approved' OR student_id IN (SELECT id FROM students WHERE id = auth.uid()));

-- Students can insert their own submission
CREATE POLICY "Students can submit videos"
    ON creator_submissions FOR INSERT
    WITH CHECK (student_id IN (SELECT id FROM students WHERE id = auth.uid()));

-- Admin can do everything with submissions
CREATE POLICY "Admin full access to creator submissions"
    ON creator_submissions FOR ALL
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );
