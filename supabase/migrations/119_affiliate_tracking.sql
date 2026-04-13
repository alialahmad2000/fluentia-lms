-- ============================================================
-- AFFILIATE TRACKING — Schema additions for click tracking & attribution
-- ============================================================

-- 1) LEADS TABLE (captures form submissions from landing site)
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  path TEXT,
  pkg TEXT,
  goal TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  ref_code TEXT,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL,
  first_click_at TIMESTAMPTZ,
  visitor_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_ref_code ON public.leads(ref_code);
CREATE INDEX IF NOT EXISTS idx_leads_affiliate ON public.leads(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_insert_public" ON public.leads;
CREATE POLICY "leads_insert_public" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "leads_admin_read" ON public.leads;
CREATE POLICY "leads_admin_read" ON public.leads
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 2) Add affiliate tracking columns to students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS ref_code TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_students_affiliate ON public.students(affiliate_id);

-- 3) Assertions
DO $$
DECLARE c INTEGER;
BEGIN
  SELECT COUNT(*) INTO c FROM information_schema.columns
  WHERE table_schema='public' AND table_name='leads' AND column_name IN ('ref_code','affiliate_id','first_click_at','visitor_id');
  IF c <> 4 THEN RAISE EXCEPTION 'leads missing affiliate columns, found %', c; END IF;

  SELECT COUNT(*) INTO c FROM information_schema.columns
  WHERE table_schema='public' AND table_name='students' AND column_name IN ('ref_code','affiliate_id');
  IF c <> 2 THEN RAISE EXCEPTION 'students missing affiliate columns, found %', c; END IF;

  RAISE NOTICE 'SUCCESS: Affiliate tracking schema applied.';
END $$;
