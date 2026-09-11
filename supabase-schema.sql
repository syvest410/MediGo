-- ====================================================================
-- MediGo Hessen / BioDispatch UN 3373 - Supabase PostgreSQL Schema
-- Run this complete script in your Supabase Dashboard:
-- 1. Log in to https://supabase.com/dashboard
-- 2. Open your project (fbjlpflbzhphrylixkjs)
-- 3. Click "SQL Editor" on the left navigation
-- 4. Click "+ New query", paste this entire script, and click "Run" (Ctrl+Enter)
-- ====================================================================

-- 1. Create Users Table with Role-Based Access and Contract Number validation
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'DISPATCHER', 'DRIVER', 'CLIENT_CLINIC', 'LAB_STAFF')),
  password_hash TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  contract_number TEXT,
  facility_type TEXT CHECK (facility_type IN ('CLINIC', 'LABORATORY', 'HQ', 'COURIER')),
  facility_address TEXT,
  vehicle_reg_number TEXT,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Constraint: Clinics & Labs must provide a contracted account identifier
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS check_contract_number_for_facilities;

ALTER TABLE public.users
  ADD CONSTRAINT check_contract_number_for_facilities
  CHECK (
    (role NOT IN ('CLIENT_CLINIC', 'LAB_STAFF')) OR 
    (contract_number IS NOT NULL AND LENGTH(TRIM(contract_number)) > 0)
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_contract ON public.users(contract_number);

-- 2. Create Orders Table with JSONB payload for UN 3373 compliance audit trail
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  tracking_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('SCHEDULED', 'PRE_TRIP_CHECK', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
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

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver ON public.orders(driver_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking ON public.orders(tracking_number);

-- 3. Create Audit Logs Table for ADR / eIDAS compliance
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  action TEXT NOT NULL,
  performed_by_id TEXT,
  performed_by_name TEXT,
  performed_by_role TEXT,
  details JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_order ON public.audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON public.audit_logs(timestamp DESC);

-- 4. Enable access for REST API (Disable RLS or grant access so service role & app can operate)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.users TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.orders TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.audit_logs TO postgres, anon, authenticated, service_role;

-- 5. Pre-seed Functional Initial Users with valid Bcrypt hashes
-- Passwords:
-- Admin:    AdminPass2026!
-- Dispatch: Dispatch2026!
-- Driver:   DriverPass2026!
-- Clinic:   ClinicPass2026!
-- Lab:      LabPass2026!

INSERT INTO public.users (id, email, name, role, password_hash, phone, organization, contract_number, facility_type, facility_address, vehicle_reg_number, active)
VALUES
  (
    'USR-ADMIN-01',
    'nsansvester89@gmail.com',
    'Admin (nsansvester89)',
    'ADMIN',
    '$2b$10$A/CA3X.oQazc/S17GewRcOYeaqZ2LbgUAe1UegPIUfdX6p/Ht01IW', -- AdminPass2026!
    '+49 170 0000000',
    'BioDispatch / MediGo Zentrale',
    NULL,
    'HQ',
    'Wiesbaden Zentrale, Hessen',
    NULL,
    TRUE
  ),
  (
    'USR-DISPATCHER-01',
    'dispatch@medigo-hessen.de',
    'Katrin Weber (Dispatch Zentrale)',
    'DISPATCHER',
    '$2b$10$7yBYzynq5uppltb2BaaRi.44AMihfXCbFmHPftbQg8NpemdWn5cEe', -- Dispatch2026!
    '+49 611 9882 100',
    'MediGo Hauptstandort & Dispatch Zentrale (Wiesbaden)',
    NULL,
    'HQ',
    'Wiesbaden Zentrale',
    NULL,
    TRUE
  ),
  (
    'USR-DRIVER-01',
    'hans.schmidt@medigo-hessen.de',
    'Hans Schmidt (MediGo Kurier WI-MG 7741)',
    'DRIVER',
    '$2b$10$HVl3o5PeQ03BDwfBfFQ0B.qushOck5UVWOaKXEtj70Tbhh8pklo1W', -- DriverPass2026!
    '+49 171 9882310',
    'MediGo Wiesbaden Fleet & Hessen Express Logistics',
    NULL,
    'COURIER',
    'Depot Wiesbaden',
    'F-MG 7741 (Thermo Van)',
    TRUE
  ),
  (
    'USR-CLINIC-01',
    'probeneingang@kgu.de',
    'Dr. Martin Hoffmann',
    'CLIENT_CLINIC',
    '$2b$10$u31A5hrLxMP5CV/L9UZ.3e6QSI2jawlfUAUZS1gWDtQaa/JGfPV9C', -- ClinicPass2026!
    '+49 69 6301 0',
    'Universitätsklinikum Frankfurt am Main (Hessen)',
    'CTR-2026-UKF-HE-01',
    'CLINIC',
    'Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen',
    NULL,
    TRUE
  ),
  (
    'USR-LAB-01',
    'empfang@synlab-hessen.de',
    'Sabine Neumann (Laborleitung)',
    'LAB_STAFF',
    '$2b$10$DJjLvjO1kzd8L1FE.lXhg.vNSJkmw93OYjZdtYnhH0JNX6AS26Ifa', -- LabPass2026!
    '+49 69 7000 88',
    'Synlab Medizinisches Versorgungszentrum Frankfurt-Hessen',
    'CTR-2026-SYNLAB-04',
    'LABORATORY',
    'Paul-Ehrlich-Straße 51, 60596 Frankfurt am Main',
    NULL,
    TRUE
  )
ON CONFLICT (email) DO UPDATE 
SET 
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  contract_number = EXCLUDED.contract_number,
  facility_type = EXCLUDED.facility_type,
  facility_address = EXCLUDED.facility_address,
  password_hash = EXCLUDED.password_hash,
  active = EXCLUDED.active;

-- 6. Pre-seed Initial Orders
INSERT INTO public.orders (id, tracking_number, status, transport_type, pickup_clinic_name, pickup_address, delivery_lab_name, delivery_address, specimen_box_count, sample_category, driver_id, driver_name, data_payload)
VALUES
  (
    'ORD-DE-8821',
    'DE-UN3373-2026-8821',
    'SCHEDULED',
    'REFRIGERATED_2_8C',
    'Universitätsklinikum Frankfurt am Main',
    'Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen',
    'Biosammlungszentrum Hessen - Synlab',
    'Paul-Ehrlich-Straße 51, 60596 Frankfurt am Main',
    2,
    'UN 3373 Biological Substance Cat B (Blood Serum Samples)',
    NULL,
    NULL,
    '{"id":"ORD-DE-8821","trackingNumber":"DE-UN3373-2026-8821","status":"SCHEDULED","transportType":"REFRIGERATED_2_8C","pickupClinicName":"Universitätsklinikum Frankfurt am Main","pickupAddress":"Theodor-Stern-Kai 7, 60590 Frankfurt am Main, Hessen","pickupDepartment":"Station 12B - Infektiologie & Virologie","pickupContactPhone":"+49 69 6301 5120","deliveryLabName":"Biosammlungszentrum Hessen - Synlab","deliveryAddress":"Paul-Ehrlich-Straße 51, 60596 Frankfurt am Main","deliveryDepartment":"Trakt 4, Labor-Eingang C","deliveryContactPhone":"+49 69 7000 881","sampleCategory":"UN 3373 Biological Substance Cat B (Blood Serum Samples)","specimenBoxCount":2,"barcodeList":["SPEC-FRA-9901-A","SPEC-FRA-9901-B"],"specialNotes":"MediGo Hessen express. P650 packaging checked. Keep upright at 2-8°C.","temperatureHistory":[],"chainOfCustodyLogs":[],"createdAt":"2026-09-11T09:00:00.000Z"}'::jsonb
  ),
  (
    'ORD-DE-9104',
    'DE-UN3373-2026-9104',
    'PRE_TRIP_CHECK',
    'FROZEN_DRY_ICE',
    'Universitätsklinikum Marburg (Lahnberge)',
    'Baldingerstraße, 35043 Marburg, Hessen',
    'Zentrallabor Hessen - MVZ Limburg',
    'Senefelderstraße 1, 65553 Limburg an der Lahn',
    1,
    'UN 1845 Dry Ice / UN 3373 Deep Frozen Biopsies',
    'USR-DRIVER-01',
    'Hans Schmidt (MediGo Kurier WI-MG 7741)',
    '{"id":"ORD-DE-9104","trackingNumber":"DE-UN3373-2026-9104","status":"PRE_TRIP_CHECK","transportType":"FROZEN_DRY_ICE","pickupClinicName":"Universitätsklinikum Marburg (Lahnberge)","pickupAddress":"Baldingerstraße, 35043 Marburg, Hessen","pickupDepartment":"Institut für Pathologie","pickupContactPhone":"+49 6421 586 2200","deliveryLabName":"Zentrallabor Hessen - MVZ Limburg","deliveryAddress":"Senefelderstraße 1, 65553 Limburg an der Lahn","deliveryDepartment":"Kryo-Annahme Station 1","deliveryContactPhone":"+49 6431 9210 0","driverId":"USR-DRIVER-01","driverName":"Hans Schmidt (MediGo Kurier WI-MG 7741)","sampleCategory":"UN 1845 Dry Ice / UN 3373 Deep Frozen Biopsies","specimenBoxCount":1,"barcodeList":["SPEC-MRB-5521-KRYO"],"specialNotes":"Dry Ice sublimating hazard. ADR ventilating protocol required.","temperatureHistory":[{"timestamp":"2026-09-11T09:15:00.000Z","temperatureCelsius":-78.2,"isBreach":false,"batteryLevel":98,"sensorId":"SENS-DRYICE-99"}],"chainOfCustodyLogs":[],"createdAt":"2026-09-11T08:30:00.000Z"}'::jsonb
  )
ON CONFLICT (tracking_number) DO NOTHING;

-- Verification query
SELECT 'Database schema successfully created!' AS result, 
       (SELECT COUNT(*) FROM public.users) AS user_count,
       (SELECT COUNT(*) FROM public.orders) AS order_count;
