-- ====================================================================
-- MediGo v3 Architecture - Non-Destructive Supabase PostgreSQL Schema
-- Compliance: ApBetrO § 17, ADR P650, GDPR Art. 9/28, eIDAS Cryptography
-- NOTE: Safe & Non-Destructive. Preserves all existing tables and data.
-- ====================================================================

-- 1. Create Organizations Table (Polymorphic Organization Schema)
CREATE TABLE IF NOT EXISTS public.organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('HOSPITAL', 'CLINIC', 'PHARMACY', 'CARE_HOME', 'LABORATORY', 'INDIVIDUAL_PATIENT')),
  contract_number TEXT UNIQUE,
  address_street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT DEFAULT 'HE' NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_city ON public.organizations(city);

-- 2. Create Retention Policies Table (GDPR Art. 9 / ApBetrO § 17 Legal Basis)
CREATE TABLE IF NOT EXISTS public.retention_policies (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  retention_period_days INT DEFAULT 1825 NOT NULL, -- 5 Years
  legal_basis TEXT NOT NULL,
  anonymize_instead_of_delete BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO public.retention_policies (id, code, name, retention_period_days, legal_basis, anonymize_instead_of_delete)
VALUES
  ('RET-APBETRO-5Y', 'APBETRO_SEC17_5YR', 'ApBetrO § 17 Statutory 5-Year Documentation', 1825, 'ApBetrO § 17 Abs. 2 / DSGVO Art. 6 Abs. 1 lit. c', TRUE),
  ('RET-GDPR-ART9-ANON', 'GDPR_ART9_ANONYMIZED', 'GDPR Art. 9 Health Data Pseudonymization', 365, 'DSGVO Art. 9 Abs. 2 lit. h / BDSG § 22', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. Update Users Table (Preserving all existing records while adding v3 fields)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  contract_number TEXT,
  facility_type TEXT,
  facility_address TEXT,
  vehicle_reg_number TEXT,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Safely add missing columns to users without dropping data
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_code_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device_public_key TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0 NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON public.users(organization_id);

-- 4. Update Orders Table (Dual Relations & State Machine Extension)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  transport_type TEXT NOT NULL,
  pickup_clinic_name TEXT NOT NULL,
  pickup_address TEXT NOT NULL,
  delivery_lab_name TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  specimen_box_count INT DEFAULT 1 NOT NULL,
  sample_category TEXT,
  driver_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  driver_name TEXT,
  data_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Safely add missing columns to orders without dropping data
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS origin_organization_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS destination_org_id TEXT REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS public_access_token TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS specimen_category TEXT DEFAULT 'UN3373_CATEGORY_B_SPECIMEN';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS quarantine_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS retention_policy_id TEXT REFERENCES public.retention_policies(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Update status constraint to include QUARANTINED_UNSYNCED
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('SCHEDULED', 'PRE_TRIP_CHECK', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'QUARANTINED_UNSYNCED', 'CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_origin_org ON public.orders(origin_organization_id);
CREATE INDEX IF NOT EXISTS idx_orders_dest_org ON public.orders(destination_org_id);
CREATE INDEX IF NOT EXISTS idx_orders_public_token ON public.orders(public_access_token);

-- 5. Audit Logs Table (Conflict Resolution & eIDAS Compliance)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  action TEXT NOT NULL,
  performed_by_id TEXT,
  performed_by_name TEXT,
  performed_by_role TEXT,
  details JSONB NOT NULL,
  conflict_resolution TEXT DEFAULT 'NONE',
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS conflict_resolution TEXT DEFAULT 'NONE';

CREATE INDEX IF NOT EXISTS idx_audit_logs_order ON public.audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(timestamp DESC);

-- 6. Login Attempts & Rate Limits Table (Anti-Brute Force Protection)
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('EMAIL', 'IP')),
  identifier TEXT NOT NULL,
  attempts INT DEFAULT 0 NOT NULL,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  locked_until TIMESTAMPTZ,
  lockout_duration_minutes INT DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_key ON public.login_attempts(key);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON public.login_attempts(identifier);
CREATE INDEX IF NOT EXISTS idx_login_attempts_locked_until ON public.login_attempts(locked_until);

-- 7. Refresh Tokens Table (Rotation, SHA-256 Hashing, Family Reuse Detection)
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  family_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON public.refresh_tokens(family_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON public.refresh_tokens(expires_at);

-- 8. Enable Row Level Security (RLS) for GDPR/UN 3373 Compliance
-- The backend uses the Supabase service_role key which automatically bypasses RLS,
-- while unauthorized public direct requests via anon keys are strictly blocked.
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

-- Allow full access to the service_role key (used by MediGo server backend)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_refresh_tokens') THEN
    CREATE POLICY service_role_full_access_refresh_tokens ON public.refresh_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_login_attempts') THEN
    CREATE POLICY service_role_full_access_login_attempts ON public.login_attempts FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_organizations') THEN
    CREATE POLICY service_role_full_access_organizations ON public.organizations FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_retention') THEN
    CREATE POLICY service_role_full_access_retention ON public.retention_policies FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_users') THEN
    CREATE POLICY service_role_full_access_users ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_orders') THEN
    CREATE POLICY service_role_full_access_orders ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_full_access_audit') THEN
    CREATE POLICY service_role_full_access_audit ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 7. Seed Standard Organizations (Hessen Region Hubs) if not already present
INSERT INTO public.organizations (id, name, type, contract_number, address_street, postal_code, city, state, contact_phone, contact_email)
VALUES
  ('ORG-UKF-01', 'Universitätsklinikum Frankfurt am Main', 'HOSPITAL', 'CTR-2026-UKF-HE-01', 'Theodor-Stern-Kai 7', '60590', 'Frankfurt am Main', 'HE', '+49 69 6301 0', 'probeneingang@kgu.de'),
  ('ORG-SYNLAB-01', 'Biosammlungszentrum Hessen - Synlab MVZ', 'LABORATORY', 'CTR-2026-SYNLAB-04', 'Paul-Ehrlich-Straße 51', '60596', 'Frankfurt am Main', 'HE', '+49 69 7000 88', 'empfang@synlab-hessen.de'),
  ('ORG-UKGM-01', 'Universitätsklinikum Gießen und Marburg', 'HOSPITAL', 'CTR-2026-UKGM-02', 'Baldingerstraße', '35043', 'Marburg', 'HE', '+49 6421 5860', 'dispatch@ukgm.de'),
  ('ORG-MEDIGO-HQ', 'MediGo Hessen Zentrale & Leitstand', 'CLINIC', 'CTR-MEDIGO-INTERNAL', 'Kaiser-Friedrich-Ring 98', '65185', 'Wiesbaden', 'HE', '+49 611 9882 100', 'dispatch@medigo-hessen.de')
ON CONFLICT (id) DO NOTHING;

-- Backfill existing sample users with organization_id where matching
UPDATE public.users 
SET organization_id = 'ORG-UKF-01' 
WHERE email = 'probeneingang@kgu.de' AND organization_id IS NULL;

UPDATE public.users 
SET organization_id = 'ORG-SYNLAB-01' 
WHERE email = 'empfang@synlab-hessen.de' AND organization_id IS NULL;

UPDATE public.users 
SET organization_id = 'ORG-MEDIGO-HQ' 
WHERE (email = 'dispatch@medigo-hessen.de' OR email = 'nsansvester89@gmail.com') AND organization_id IS NULL;
