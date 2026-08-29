-- ============================================================
-- MAULINOND ADMIN & QR TRACKING SCHEMA (COMPLETE & ADDITIVE)
-- Copy and run all lines below in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Extend varkaris table
ALTER TABLE public.varkaris
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS band_issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS band_issued_by UUID REFERENCES auth.users(id);

-- 2. Extend orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'QR_BAND',
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS issued_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ADMIN',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create qr_scans table for real-time location & scan logging
CREATE TABLE IF NOT EXISTS public.qr_scans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  varkari_id UUID REFERENCES public.varkaris(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now(),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_name TEXT,
  permission_granted BOOLEAN DEFAULT false,
  user_agent TEXT,
  status TEXT DEFAULT 'ACTIVE'
);

-- 5. Create qr_alerts table for actionable incident management
CREATE TABLE IF NOT EXISTS public.qr_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  varkari_id UUID REFERENCES public.varkaris(id) ON DELETE CASCADE,
  registration_id TEXT NOT NULL,
  alert_type TEXT NOT NULL, -- 'EMERGENCY', 'REPEATED_SCAN', 'LOCATION_ANOMALY', 'FLAGGED'
  message TEXT NOT NULL,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED', 'DISMISSED'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Extend incidents table for IVR and QR/Web unification
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS type TEXT,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_accuracy DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS maps_url TEXT,
  ADD COLUMN IF NOT EXISTS reporter_name TEXT,
  ADD COLUMN IF NOT EXISTS reporter_phone TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'WEB',
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Row Level Security (RLS) Configuration
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.varkaris ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Public scan insert" ON public.qr_scans;
CREATE POLICY "Public scan insert" ON public.qr_scans FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public scan select" ON public.qr_scans;
CREATE POLICY "Public scan select" ON public.qr_scans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public alerts insert" ON public.qr_alerts;
CREATE POLICY "Public alerts insert" ON public.qr_alerts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public incident insert" ON public.incidents;
CREATE POLICY "Public incident insert" ON public.incidents FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins select varkaris" ON public.varkaris;
CREATE POLICY "Admins select varkaris" ON public.varkaris FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update varkaris" ON public.varkaris;
CREATE POLICY "Admins update varkaris" ON public.varkaris FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins manage orders" ON public.orders;
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage qr_scans" ON public.qr_scans;
CREATE POLICY "Admins manage qr_scans" ON public.qr_scans FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage qr_alerts" ON public.qr_alerts;
CREATE POLICY "Admins manage qr_alerts" ON public.qr_alerts FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins manage incidents" ON public.incidents;
CREATE POLICY "Admins manage incidents" ON public.incidents FOR ALL USING (true);
