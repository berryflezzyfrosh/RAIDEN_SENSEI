/*
# Initial Schema — Free Fire Sensitivity Platform
(see full description in prior attempt; same schema, fixed UPDATE policy)
*/

-- =========================================================
-- user_profiles
-- =========================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text DEFAULT '',
  avatar_url text DEFAULT '',
  account_status text NOT NULL DEFAULT 'active'
    CHECK (account_status IN ('active','suspended','banned')),
  premium_status text NOT NULL DEFAULT 'free'
    CHECK (premium_status IN ('free','premium','expired')),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

-- Users can update only display_name/avatar_url. Use a SECURITY DEFINER function to
-- check that protected columns are unchanged (RLS cannot reference OLD directly in WITH CHECK).
DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Guard: prevent users from changing protected columns via a trigger
CREATE OR REPLACE FUNCTION public.guard_user_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only the system (server) should change these; a client UPDATE that tries to
  -- change them gets rejected. Allow if values are unchanged OR if caller is admin.
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not allowed to change account_status';
  END IF;
  IF NEW.premium_status IS DISTINCT FROM OLD.premium_status
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not allowed to change premium_status';
  END IF;
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin
     AND NOT public.is_current_user_admin() THEN
    RAISE EXCEPTION 'Not allowed to change is_admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_profile ON user_profiles;
CREATE TRIGGER trg_guard_user_profile
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile_columns();

-- Trigger: auto-create profile on signup, mirror is_admin from app_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE((NEW.raw_app_meta_data->>'is_admin')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- app_config
-- =========================================================
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_app_config" ON app_config;
CREATE POLICY "read_app_config" ON app_config
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO app_config (key, value) VALUES ('premium_price', '2500')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO app_config (key, value) VALUES ('opay_bank', 'Opay')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO app_config (key, value) VALUES ('opay_account_name', 'Courage Barminas')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO app_config (key, value) VALUES ('opay_account_number', '8033240323')
  ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- payments
-- =========================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transaction_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','under_review','verified','rejected','refunded','expired')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  reviewed_at timestamptz
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND amount > 0
  );

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =========================================================
-- payment_receipts
-- =========================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  mime_type text NOT NULL,
  ocr_text text DEFAULT '',
  ocr_confidence numeric DEFAULT 0,
  fraud_risk_score numeric DEFAULT 0,
  fraud_flags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_receipts" ON payment_receipts;
CREATE POLICY "select_own_receipts" ON payment_receipts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_receipts" ON payment_receipts;
CREATE POLICY "insert_own_receipts" ON payment_receipts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_receipts_payment ON payment_receipts(payment_id);

-- =========================================================
-- premium_subscriptions
-- =========================================================
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','revoked')),
  start_date timestamptz NOT NULL DEFAULT now(),
  expiry_date timestamptz,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON premium_subscriptions;
CREATE POLICY "select_own_subscriptions" ON premium_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subs_user ON premium_subscriptions(user_id);

-- =========================================================
-- saved_sensitivities
-- =========================================================
CREATE TABLE IF NOT EXISTS saved_sensitivities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Untitled',
  device jsonb NOT NULL DEFAULT '{}',
  preset text NOT NULL,
  values jsonb NOT NULL DEFAULT '{}',
  confidence numeric DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_sensitivities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_sens" ON saved_sensitivities;
CREATE POLICY "select_own_sens" ON saved_sensitivities
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_sens" ON saved_sensitivities;
CREATE POLICY "insert_own_sens" ON saved_sensitivities
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      EXISTS (SELECT 1 FROM premium_subscriptions ps
              WHERE ps.user_id = auth.uid() AND ps.status = 'active'
                AND (ps.expiry_date IS NULL OR ps.expiry_date > now()))
      OR (
        SELECT count(*) FROM saved_sensitivities s
        WHERE s.user_id = auth.uid()
      ) < 3
    )
  );

DROP POLICY IF EXISTS "update_own_sens" ON saved_sensitivities;
CREATE POLICY "update_own_sens" ON saved_sensitivities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_sens" ON saved_sensitivities;
CREATE POLICY "delete_own_sens" ON saved_sensitivities
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_sens_user ON saved_sensitivities(user_id);

-- =========================================================
-- admin_actions
-- =========================================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_user uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_payment uuid REFERENCES payments(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- security_logs
-- =========================================================
CREATE TABLE IF NOT EXISTS security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_logs" ON security_logs;
CREATE POLICY "select_own_logs" ON security_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_logs_user ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_event ON security_logs(event);

-- =========================================================
-- Helper: is_current_user_admin()
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false);
$$;

-- =========================================================
-- Storage bucket for receipts (private)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;
