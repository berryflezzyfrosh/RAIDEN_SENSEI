-- Keep the owner secret hash private and enforce account/payment rules in the database.

DROP POLICY IF EXISTS "read_app_config" ON public.app_config;
CREATE POLICY "read_app_config" ON public.app_config
  FOR SELECT TO anon, authenticated
  USING (key <> 'admin_owner_secret_hash');

CREATE OR REPLACE FUNCTION public.is_current_user_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND account_status = 'active'
  );
$$;

DROP POLICY IF EXISTS "select_own_payments" ON public.payments;
CREATE POLICY "select_own_payments" ON public.payments
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_active());

DROP POLICY IF EXISTS "insert_own_payments" ON public.payments;
CREATE POLICY "insert_own_payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND status = 'pending'
    AND amount > 0
    AND amount = (
      SELECT value::numeric FROM public.app_config WHERE key = 'premium_price'
    )
  );

DROP POLICY IF EXISTS "select_own_receipts" ON public.payment_receipts;
CREATE POLICY "select_own_receipts" ON public.payment_receipts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_active());

DROP POLICY IF EXISTS "insert_own_receipts" ON public.payment_receipts;
CREATE POLICY "insert_own_receipts" ON public.payment_receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_id AND p.user_id = auth.uid() AND p.status = 'pending'
    )
  );

DROP POLICY IF EXISTS "select_own_subscriptions" ON public.premium_subscriptions;
CREATE POLICY "select_own_subscriptions" ON public.premium_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_active());

DROP POLICY IF EXISTS "select_own_sens" ON public.saved_sensitivities;
CREATE POLICY "select_own_sens" ON public.saved_sensitivities
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_active());

DROP POLICY IF EXISTS "insert_own_sens" ON public.saved_sensitivities;
CREATE POLICY "insert_own_sens" ON public.saved_sensitivities
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND (
      EXISTS (
        SELECT 1 FROM public.premium_subscriptions ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
          AND (ps.expiry_date IS NULL OR ps.expiry_date > now())
      )
      OR (
        NOT is_premium
        AND preset IN ('balanced', 'aggressive', 'headshot', 'close_range')
        AND (SELECT count(*) FROM public.saved_sensitivities s WHERE s.user_id = auth.uid()) < 3
      )
    )
  );

DROP POLICY IF EXISTS "update_own_sens" ON public.saved_sensitivities;
CREATE POLICY "update_own_sens" ON public.saved_sensitivities
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_active())
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND (
      EXISTS (
        SELECT 1 FROM public.premium_subscriptions ps
        WHERE ps.user_id = auth.uid() AND ps.status = 'active'
          AND (ps.expiry_date IS NULL OR ps.expiry_date > now())
      )
      OR (
        NOT is_premium
        AND preset IN ('balanced', 'aggressive', 'headshot', 'close_range')
      )
    )
  );

DROP POLICY IF EXISTS "delete_own_sens" ON public.saved_sensitivities;
CREATE POLICY "delete_own_sens" ON public.saved_sensitivities
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND public.is_current_user_active());

DROP POLICY IF EXISTS "receipts_upload_own" ON storage.objects;
CREATE POLICY "receipts_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );

DROP POLICY IF EXISTS "receipts_read_own" ON storage.objects;
CREATE POLICY "receipts_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );

UPDATE storage.buckets
SET file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'receipts';

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
  v_status text;
  v_admin uuid := auth.uid();
  v_sub_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;

  SELECT user_id, status INTO v_user_id, v_status
  FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF v_user_id IS NULL OR v_status NOT IN ('pending', 'under_review') THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_receipts WHERE payment_id = p_payment_id) THEN
    RETURN false;
  END IF;

  UPDATE public.payments
  SET status = 'verified', verified_at = now(), reviewed_at = now(),
      reviewer_id = v_admin, review_note = p_note
  WHERE id = p_payment_id;

  INSERT INTO public.premium_subscriptions (user_id, status, start_date, expiry_date, payment_id)
  VALUES (v_user_id, 'active', now(), now() + interval '365 days', p_payment_id)
  RETURNING id INTO v_sub_id;

  UPDATE public.user_profiles SET premium_status = 'premium', updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.admin_actions (admin_id, action, target_user, target_payment, metadata)
  VALUES (v_admin, 'verify_payment', v_user_id, p_payment_id,
          jsonb_build_object('note', p_note, 'subscription_id', v_sub_id));
  INSERT INTO public.security_logs (user_id, event, metadata)
  VALUES (v_user_id, 'premium_activated',
          jsonb_build_object('payment_id', p_payment_id, 'admin_id', v_admin));

  RETURN true;
END;
$$;

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
  v_status text;
  v_admin uuid := auth.uid();
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;

  SELECT user_id, status INTO v_user_id, v_status
  FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF v_user_id IS NULL OR v_status NOT IN ('pending', 'under_review') THEN RETURN false; END IF;

  UPDATE public.payments
  SET status = 'rejected', reviewed_at = now(), reviewer_id = v_admin, review_note = p_note
  WHERE id = p_payment_id;
  INSERT INTO public.admin_actions (admin_id, action, target_user, target_payment, metadata)
  VALUES (v_admin, 'reject_payment', v_user_id, p_payment_id, jsonb_build_object('note', p_note));
  INSERT INTO public.security_logs (user_id, event, metadata)
  VALUES (v_user_id, 'payment_rejected',
          jsonb_build_object('payment_id', p_payment_id, 'admin_id', v_admin));

  RETURN true;
END;
$$;