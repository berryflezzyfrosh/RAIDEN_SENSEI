/*
# Admin RPC functions + Storage policies

## Overview
Creates SECURITY DEFINER functions that let authorized admins manage payments, users,
and app configuration. These run with elevated privileges but check is_current_user_admin()
internally so non-admins get NULL/empty results.

## New Functions
1. `admin_list_users()` — all user_profiles (admin only).
2. `admin_list_payments(status)` — payments + joined receipt info (admin only).
3. `admin_verify_payment(p_payment_id, note)` — set payment verified, create subscription,
   update user premium_status, log admin_action + security_log.
4. `admin_reject_payment(p_payment_id, note)` — set payment rejected, log.
5. `admin_revoke_premium(p_user_id)` — revoke active subscription, set premium_status expired.
6. `admin_suspend_user(p_user_id)` / `admin_restore_user(p_user_id)` — toggle account_status.
7. `admin_update_app_config(key, value)` — update app_config (admin only).
8. `admin_list_logs(limit)` — security + admin action logs.
9. `get_my_premium_status()` — convenience for clients to check active premium.

## Storage
- receipts bucket: users can upload to their own folder, admins can read all.
*/

-- =========================================================
-- get_my_premium_status — callable by any authenticated user, returns their premium state
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_my_premium_status()
RETURNS TABLE(premium_status text, is_active boolean, expiry_date timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT up.premium_status,
         EXISTS (SELECT 1 FROM premium_subscriptions ps
                 WHERE ps.user_id = auth.uid()
                   AND ps.status = 'active'
                   AND (ps.expiry_date IS NULL OR ps.expiry_date > now())) AS is_active,
         (SELECT max(ps.expiry_date) FROM premium_subscriptions ps
          WHERE ps.user_id = auth.uid() AND ps.status = 'active') AS expiry_date
  FROM user_profiles up
  WHERE up.id = auth.uid();
$$;

-- =========================================================
-- admin_list_users
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE(
  id uuid, email text, display_name text, account_status text,
  premium_status text, is_admin boolean, created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, email, display_name, account_status, premium_status, is_admin, created_at
  FROM user_profiles
  WHERE public.is_current_user_admin()
  ORDER BY created_at DESC;
$$;

-- =========================================================
-- admin_list_payments
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_list_payments(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid, user_id uuid, amount numeric, transaction_reference text,
  status text, review_note text, created_at timestamptz, verified_at timestamptz,
  receipt_id uuid, storage_path text, file_name text, mime_type text,
  fraud_risk_score numeric, fraud_flags text[]
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.user_id, p.amount, p.transaction_reference, p.status,
         p.review_note, p.created_at, p.verified_at,
         r.id AS receipt_id, r.storage_path, r.file_name, r.mime_type,
         r.fraud_risk_score, r.fraud_flags
  FROM payments p
  LEFT JOIN payment_receipts r ON r.payment_id = p.id
  WHERE public.is_current_user_admin()
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.created_at DESC;
$$;

-- =========================================================
-- admin_verify_payment
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_verify_payment(
  p_payment_id uuid,
  p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_amount numeric;
  v_admin uuid := auth.uid();
  v_sub_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN
    RETURN false;
  END IF;

  SELECT user_id, amount INTO v_user_id, v_amount
  FROM payments WHERE id = p_payment_id;
  IF v_user_id IS NULL THEN RETURN false; END IF;

  UPDATE payments
    SET status = 'verified', verified_at = now(), reviewed_at = now(),
        reviewer_id = v_admin, review_note = p_note
    WHERE id = p_payment_id;

  INSERT INTO premium_subscriptions (user_id, status, start_date, expiry_date, payment_id)
    VALUES (v_user_id, 'active', now(), now() + interval '365 days', p_payment_id)
    RETURNING id INTO v_sub_id;

  UPDATE user_profiles SET premium_status = 'premium', updated_at = now()
    WHERE id = v_user_id;

  INSERT INTO admin_actions (admin_id, action, target_user, target_payment, metadata)
    VALUES (v_admin, 'verify_payment', v_user_id, p_payment_id,
            jsonb_build_object('note', p_note, 'subscription_id', v_sub_id));

  INSERT INTO security_logs (user_id, event, metadata)
    VALUES (v_user_id, 'premium_activated',
            jsonb_build_object('payment_id', p_payment_id, 'admin_id', v_admin));

  RETURN true;
END;
$$;

-- =========================================================
-- admin_reject_payment
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_reject_payment(
  p_payment_id uuid,
  p_note text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;

  SELECT user_id INTO v_user_id FROM payments WHERE id = p_payment_id;
  IF v_user_id IS NULL THEN RETURN false; END IF;

  UPDATE payments
    SET status = 'rejected', reviewed_at = now(), reviewer_id = v_admin, review_note = p_note
    WHERE id = p_payment_id;

  INSERT INTO admin_actions (admin_id, action, target_user, target_payment, metadata)
    VALUES (v_admin, 'reject_payment', v_user_id, p_payment_id, jsonb_build_object('note', p_note));

  INSERT INTO security_logs (user_id, event, metadata)
    VALUES (v_user_id, 'payment_rejected',
            jsonb_build_object('payment_id', p_payment_id, 'admin_id', v_admin));

  RETURN true;
END;
$$;

-- =========================================================
-- admin_revoke_premium
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_revoke_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;

  UPDATE premium_subscriptions SET status = 'revoked'
    WHERE user_id = p_user_id AND status = 'active';
  UPDATE user_profiles SET premium_status = 'expired', updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO admin_actions (admin_id, action, target_user, metadata)
    VALUES (v_admin, 'revoke_premium', p_user_id, '{}'::jsonb);

  INSERT INTO security_logs (user_id, event, metadata)
    VALUES (p_user_id, 'premium_revoked', jsonb_build_object('admin_id', v_admin));

  RETURN true;
END;
$$;

-- =========================================================
-- admin_suspend_user / admin_restore_user
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_suspend_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;
  IF p_user_id = v_admin THEN RETURN false; END IF; -- don't suspend self
  UPDATE user_profiles SET account_status = 'suspended', updated_at = now()
    WHERE id = p_user_id AND NOT is_admin;
  INSERT INTO admin_actions (admin_id, action, target_user, metadata)
    VALUES (v_admin, 'suspend_user', p_user_id, '{}'::jsonb);
  INSERT INTO security_logs (user_id, event, metadata)
    VALUES (p_user_id, 'account_suspended', jsonb_build_object('admin_id', v_admin));
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;
  UPDATE user_profiles SET account_status = 'active', updated_at = now()
    WHERE id = p_user_id;
  INSERT INTO admin_actions (admin_id, action, target_user, metadata)
    VALUES (v_admin, 'restore_user', p_user_id, '{}'::jsonb);
  INSERT INTO security_logs (user_id, event, metadata)
    VALUES (p_user_id, 'account_restored', jsonb_build_object('admin_id', v_admin));
  RETURN true;
END;
$$;

-- =========================================================
-- admin_update_app_config
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_update_app_config(p_key text, p_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;
  INSERT INTO app_config (key, value, updated_at) VALUES (p_key, p_value, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  INSERT INTO admin_actions (admin_id, action, metadata)
    VALUES (v_admin, 'update_config', jsonb_build_object('key', p_key, 'value', p_value));
  RETURN true;
END;
$$;

-- =========================================================
-- admin_list_logs
-- =========================================================
CREATE OR REPLACE FUNCTION public.admin_list_logs(p_limit int DEFAULT 100)
RETURNS TABLE(
  id uuid, user_id uuid, event text, metadata jsonb, created_at timestamptz, kind text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  (SELECT l.id, l.user_id, l.event, l.metadata, l.created_at, 'security' AS kind
   FROM security_logs l
   WHERE public.is_current_user_admin()
   ORDER BY l.created_at DESC LIMIT p_limit)
  UNION ALL
  (SELECT a.id, a.admin_id AS user_id, a.action AS event, a.metadata, a.created_at,
          'admin' AS kind
   FROM admin_actions a
   WHERE public.is_current_user_admin()
   ORDER BY a.created_at DESC LIMIT p_limit)
  ORDER BY created_at DESC
  LIMIT p_limit;
$$;

-- =========================================================
-- Storage policies for receipts bucket
-- =========================================================
-- Allow authenticated users to upload to a path under their own user id
DROP POLICY IF EXISTS "receipts_upload_own" ON storage.objects;
CREATE POLICY "receipts_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can read their own receipts
DROP POLICY IF EXISTS "receipts_read_own" ON storage.objects;
CREATE POLICY "receipts_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins can read all receipts
DROP POLICY IF EXISTS "receipts_admin_read_all" ON storage.objects;
CREATE POLICY "receipts_admin_read_all" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'receipts' AND public.is_current_user_admin());

-- Allow admins to create signed URL via the storage API; no direct delete policy for users.
