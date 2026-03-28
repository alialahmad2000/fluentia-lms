-- 053: Analytics tracking engine — add missing columns + indexes + RLS

-- ─── analytics_events: add missing columns ─────────────────────
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS page_path text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS device text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS browser text;
ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON public.analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON public.analytics_events(session_id);

-- RLS policies (create only if not exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Users can insert own events') THEN
    CREATE POLICY "Users can insert own events" ON public.analytics_events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_events' AND policyname = 'Admins can read all events') THEN
    CREATE POLICY "Admins can read all events" ON public.analytics_events FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;

-- ─── user_sessions: add missing columns ────────────────────────
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS last_seen_at timestamptz DEFAULT now();
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS duration_seconds integer DEFAULT 0;
ALTER TABLE public.user_sessions ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_started ON public.user_sessions(started_at DESC);

-- ─── profiles: add last_active_at ──────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
