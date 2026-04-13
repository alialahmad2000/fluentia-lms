-- ============================================================
-- FLUENTIA PARTNERS — FOUNDATION SCHEMA
-- ============================================================

-- 1) AFFILIATES (the marketers themselves)
CREATE TABLE IF NOT EXISTS public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT,
  ref_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  social_handles JSONB DEFAULT '{}'::jsonb,
  audience_size INTEGER,
  why_join TEXT,
  heard_from TEXT,
  iban TEXT,
  stcpay_number TEXT,
  bank_name TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejected_reason TEXT,
  notes TEXT,
  terms_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_status ON public.affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_ref_code ON public.affiliates(ref_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates(user_id);

-- 2) AFFILIATE CLICKS
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id BIGSERIAL PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  ref_code TEXT NOT NULL,
  landing_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  country TEXT,
  visitor_id TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clicks_affiliate ON public.affiliate_clicks(affiliate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_visitor ON public.affiliate_clicks(visitor_id, created_at DESC);

-- 3) AFFILIATE CONVERSIONS
CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  ref_code TEXT NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 100.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','reversed')),
  first_payment_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  payout_id UUID,
  reversed_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_affiliate ON public.affiliate_conversions(affiliate_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_student ON public.affiliate_conversions(student_id);

-- 4) AFFILIATE PAYOUTS
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SAR',
  conversion_count INTEGER NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed')),
  payment_method TEXT CHECK (payment_method IN ('bank','stcpay','other')),
  transaction_reference TEXT,
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.affiliate_conversions
  DROP CONSTRAINT IF EXISTS fk_conv_payout;
ALTER TABLE public.affiliate_conversions
  ADD CONSTRAINT fk_conv_payout FOREIGN KEY (payout_id) REFERENCES public.affiliate_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON public.affiliate_payouts(affiliate_id, period_end DESC);

-- 5) AFFILIATE MATERIALS
CREATE TABLE IF NOT EXISTS public.affiliate_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('caption','image','video','template','guide')),
  platform TEXT CHECK (platform IN ('twitter','instagram','tiktok','snapchat','whatsapp','general')),
  content TEXT,
  asset_url TEXT,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.affiliates           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_materials  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID) RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'admin'
  );
$$;

-- affiliates: public can INSERT as pending; owner reads self; admin reads/writes all
DROP POLICY IF EXISTS "affiliates_insert_public" ON public.affiliates;
CREATE POLICY "affiliates_insert_public" ON public.affiliates
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending');

DROP POLICY IF EXISTS "affiliates_select_self" ON public.affiliates;
CREATE POLICY "affiliates_select_self" ON public.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "affiliates_select_anon" ON public.affiliates;
CREATE POLICY "affiliates_select_anon" ON public.affiliates
  FOR SELECT TO anon
  USING (false);

DROP POLICY IF EXISTS "affiliates_update_self_limited" ON public.affiliates;
CREATE POLICY "affiliates_update_self_limited" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "affiliates_admin_all" ON public.affiliates;
CREATE POLICY "affiliates_admin_all" ON public.affiliates
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- clicks: public insert; owner+admin read
DROP POLICY IF EXISTS "clicks_insert_public" ON public.affiliate_clicks;
CREATE POLICY "clicks_insert_public" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "clicks_read_owner_admin" ON public.affiliate_clicks;
CREATE POLICY "clicks_read_owner_admin" ON public.affiliate_clicks
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

-- conversions: admin+owner read; admin write
DROP POLICY IF EXISTS "conv_read_owner_admin" ON public.affiliate_conversions;
CREATE POLICY "conv_read_owner_admin" ON public.affiliate_conversions
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "conv_admin_write" ON public.affiliate_conversions;
CREATE POLICY "conv_admin_write" ON public.affiliate_conversions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- payouts: admin+owner read; admin write
DROP POLICY IF EXISTS "payouts_read_owner_admin" ON public.affiliate_payouts;
CREATE POLICY "payouts_read_owner_admin" ON public.affiliate_payouts
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "payouts_admin_write" ON public.affiliate_payouts;
CREATE POLICY "payouts_admin_write" ON public.affiliate_payouts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- materials: authenticated read active; admin writes
DROP POLICY IF EXISTS "materials_read_active" ON public.affiliate_materials;
CREATE POLICY "materials_read_active" ON public.affiliate_materials
  FOR SELECT TO authenticated
  USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "materials_admin_write" ON public.affiliate_materials;
CREATE POLICY "materials_admin_write" ON public.affiliate_materials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_affiliates_updated ON public.affiliates;
CREATE TRIGGER trg_affiliates_updated
  BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- ASSERTIONS
-- ============================================================
DO $$
DECLARE t_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO t_count FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN
    ('affiliates','affiliate_clicks','affiliate_conversions','affiliate_payouts','affiliate_materials');
  IF t_count <> 5 THEN
    RAISE EXCEPTION 'Expected 5 affiliate tables, found %', t_count;
  END IF;
  RAISE NOTICE 'SUCCESS: All 5 affiliate tables present.';
END $$;
