ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'premium',
  ADD COLUMN IF NOT EXISTS hud_listing_id uuid;

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_plan_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_plan_check
  CHECK (plan IS NULL OR plan IN ('weekly', 'monthly', 'yearly'));
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_purpose_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_purpose_check
  CHECK (purpose IN ('premium', 'hud'));

ALTER TABLE public.premium_subscriptions
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'yearly',
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS purchase_date timestamptz NOT NULL DEFAULT now();

UPDATE public.premium_subscriptions ps
SET plan = COALESCE(p.plan, 'yearly'),
    amount_paid = COALESCE(p.amount, 0),
    payment_status = COALESCE(p.status, 'verified'),
    purchase_date = ps.start_date
FROM public.payments p
WHERE p.id = ps.payment_id;

ALTER TABLE public.premium_subscriptions
  DROP CONSTRAINT IF EXISTS premium_subscriptions_plan_check,
  DROP CONSTRAINT IF EXISTS premium_subscriptions_payment_status_check;
ALTER TABLE public.premium_subscriptions
  ADD CONSTRAINT premium_subscriptions_plan_check
    CHECK (plan IN ('weekly', 'monthly', 'yearly')),
  ADD CONSTRAINT premium_subscriptions_payment_status_check
    CHECK (payment_status IN ('verified', 'refunded'));

DROP POLICY IF EXISTS "insert_own_payments" ON public.payments;
CREATE POLICY "insert_own_payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND status = 'pending'
    AND transaction_reference <> ''
    AND purpose = 'premium'
    AND hud_listing_id IS NULL
    AND (
      (plan = 'weekly' AND amount = 2500)
      OR (plan = 'monthly' AND amount = 7000)
      OR (plan = 'yearly' AND amount = 50000)
    )
  );

CREATE OR REPLACE FUNCTION public.has_premium_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.account_status = 'active'
      AND (
        public.is_current_user_admin()
        OR EXISTS (
          SELECT 1
          FROM public.premium_subscriptions ps
          WHERE ps.user_id = auth.uid()
            AND ps.status = 'active'
            AND ps.payment_status = 'verified'
            AND (ps.expiry_date IS NULL OR ps.expiry_date > now())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_premium_status()
RETURNS TABLE(premium_status text, is_active boolean, expiry_date timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE
           WHEN public.has_premium_access() THEN 'premium'
           WHEN EXISTS (
             SELECT 1 FROM public.premium_subscriptions ps
             WHERE ps.user_id = auth.uid() AND ps.status = 'active'
               AND ps.expiry_date <= now()
           ) THEN 'expired'
           ELSE up.premium_status
         END AS premium_status,
         public.has_premium_access() AS is_active,
         (SELECT max(ps.expiry_date)
          FROM public.premium_subscriptions ps
          WHERE ps.user_id = auth.uid() AND ps.status = 'active') AS expiry_date
  FROM public.user_profiles up
  WHERE up.id = auth.uid();
$$;

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
  SELECT up.id, up.email, up.display_name, up.account_status,
         CASE
           WHEN up.is_admin AND up.account_status = 'active' THEN 'premium'
           WHEN EXISTS (
             SELECT 1 FROM public.premium_subscriptions ps
             WHERE ps.user_id = up.id AND ps.status = 'active'
               AND ps.payment_status = 'verified'
               AND (ps.expiry_date IS NULL OR ps.expiry_date > now())
           ) THEN 'premium'
           WHEN EXISTS (
             SELECT 1 FROM public.premium_subscriptions ps
             WHERE ps.user_id = up.id AND ps.status = 'active'
               AND ps.expiry_date <= now()
           ) THEN 'expired'
           ELSE up.premium_status
         END,
         up.is_admin, up.created_at
  FROM public.user_profiles up
  WHERE public.is_current_user_admin()
  ORDER BY up.created_at DESC;
$$;

CREATE OR REPLACE VIEW public.my_premium_subscriptions
WITH (security_invoker = true)
AS
SELECT id, user_id, plan, amount_paid, payment_status, purchase_date,
       start_date, expiry_date,
      (status = 'active' AND payment_status = 'verified'
       AND (expiry_date IS NULL OR expiry_date > now())) AS is_active
FROM public.premium_subscriptions;

GRANT SELECT ON public.my_premium_subscriptions TO authenticated;

DROP FUNCTION IF EXISTS public.admin_list_payments(text);
CREATE FUNCTION public.admin_list_payments(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  amount numeric,
  plan text,
  purpose text,
  hud_listing_id uuid,
  transaction_reference text,
  status text,
  review_note text,
  created_at timestamptz,
  verified_at timestamptz,
  receipt_id uuid,
  storage_path text,
  file_name text,
  mime_type text,
  fraud_risk_score numeric,
  fraud_flags text[],
  ocr_text text,
  ocr_confidence numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
      SELECT p.id, p.user_id, p.amount, p.plan, p.purpose, p.hud_listing_id,
        p.transaction_reference, p.status,
         p.review_note, p.created_at, p.verified_at,
         r.id, r.storage_path, r.file_name, r.mime_type,
         r.fraud_risk_score, r.fraud_flags, r.ocr_text, r.ocr_confidence
  FROM public.payments p
  LEFT JOIN public.payment_receipts r ON r.payment_id = p.id
  WHERE public.is_current_user_admin()
    AND (p_status IS NULL OR p.status = p_status)
  ORDER BY p.created_at DESC;
$$;

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
  v_plan text;
  v_purpose text;
  v_hud_id uuid;
  v_status text;
  v_days integer;
  v_admin uuid := auth.uid();
  v_sub_id uuid;
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;

  SELECT user_id, amount, plan, purpose, hud_listing_id, status
  INTO v_user_id, v_amount, v_plan, v_purpose, v_hud_id, v_status
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_user_id IS NULL OR v_status NOT IN ('pending', 'under_review') THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payment_receipts WHERE payment_id = p_payment_id) THEN
    RETURN false;
  END IF;

  IF v_purpose = 'premium' THEN
    IF v_plan IS NULL THEN
      v_plan := 'yearly';
      v_days := 365;
    ELSE
      v_days := CASE v_plan WHEN 'weekly' THEN 7 WHEN 'monthly' THEN 30 WHEN 'yearly' THEN 365 END;
      IF v_amount <> (CASE v_plan WHEN 'weekly' THEN 2500 WHEN 'monthly' THEN 7000 WHEN 'yearly' THEN 50000 END) THEN
        RETURN false;
      END IF;
    END IF;
  ELSIF v_purpose = 'hud' THEN
    IF v_hud_id IS NULL OR v_plan IS NOT NULL OR EXISTS (
      SELECT 1 FROM public.hud_purchases hp
      WHERE hp.hud_listing_id = v_hud_id AND hp.buyer_id = v_user_id
    ) THEN
      RETURN false;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.free_fire_hud_listings h
      WHERE h.id = v_hud_id AND h.status = 'active' AND NOT h.is_free
        AND h.seller_id <> v_user_id AND h.asking_price = v_amount
    ) THEN
      RETURN false;
    END IF;
  ELSE
    RETURN false;
  END IF;

  UPDATE public.payments
  SET status = 'verified', verified_at = now(), reviewed_at = now(),
      reviewer_id = v_admin, review_note = p_note
  WHERE id = p_payment_id;

  IF v_purpose = 'premium' THEN
    INSERT INTO public.premium_subscriptions
      (user_id, status, start_date, expiry_date, payment_id, plan, amount_paid, payment_status, purchase_date)
    VALUES
      (v_user_id, 'active', now(), now() + make_interval(days => v_days), p_payment_id,
       v_plan, v_amount, 'verified', now())
    RETURNING id INTO v_sub_id;

    UPDATE public.user_profiles SET premium_status = 'premium', updated_at = now()
    WHERE id = v_user_id;
  ELSE
    INSERT INTO public.hud_purchases (buyer_id, hud_listing_id, payment_id)
    VALUES (v_user_id, v_hud_id, p_payment_id);
  END IF;

  INSERT INTO public.admin_actions (admin_id, action, target_user, target_payment, metadata)
  VALUES (v_admin, 'verify_payment', v_user_id, p_payment_id,
          jsonb_build_object('note', p_note, 'subscription_id', v_sub_id,
                             'plan', v_plan, 'purpose', v_purpose, 'hud_listing_id', v_hud_id));
  INSERT INTO public.security_logs (user_id, event, metadata)
  VALUES (v_user_id, 'premium_activated',
          jsonb_build_object('payment_id', p_payment_id, 'admin_id', v_admin,
                             'plan', v_plan, 'purpose', v_purpose, 'hud_listing_id', v_hud_id));

  RETURN true;
END;
$$;

CREATE TABLE IF NOT EXISTS public.free_fire_account_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_name text NOT NULL DEFAULT '',
  seller_contact text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 100),
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
  asking_price numeric NOT NULL CHECK (asking_price > 0),
  account_level integer NOT NULL CHECK (account_level BETWEEN 1 AND 100),
  region_server text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  available_items text NOT NULL DEFAULT '',
  character_info text NOT NULL DEFAULT '',
  account_details text NOT NULL DEFAULT '',
  image_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.free_fire_hud_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_name text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (char_length(title) BETWEEN 4 AND 100),
  description text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
  asking_price numeric NOT NULL DEFAULT 0 CHECK (asking_price >= 0),
  is_free boolean NOT NULL DEFAULT true,
  device_compatibility text NOT NULL DEFAULT '',
  hud_file_path text NOT NULL,
  preview_path text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hud_free_price_check CHECK (
    (is_free AND asking_price = 0) OR (NOT is_free AND asking_price > 0)
  ),
  CONSTRAINT hud_asset_ownership_check CHECK (
    hud_file_path LIKE seller_id::text || '/%'
    AND preview_path LIKE seller_id::text || '/%'
    AND lower(hud_file_path) ~ '\.(json|txt|cfg)$'
    AND lower(preview_path) ~ '\.(jpg|jpeg|png|webp)$'
  )
);

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_hud_listing_id_fkey;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_hud_listing_id_fkey
  FOREIGN KEY (hud_listing_id) REFERENCES public.free_fire_hud_listings(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.hud_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  hud_listing_id uuid NOT NULL REFERENCES public.free_fire_hud_listings(id) ON DELETE RESTRICT,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  purchase_date timestamptz NOT NULL DEFAULT now(),
  UNIQUE (buyer_id, hud_listing_id)
);

ALTER TABLE public.hud_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_hud_purchases" ON public.hud_purchases
  FOR SELECT TO authenticated USING (buyer_id = auth.uid());
GRANT SELECT ON public.hud_purchases TO authenticated;

DROP POLICY IF EXISTS "insert_own_payments" ON public.payments;
CREATE POLICY "insert_own_payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND status = 'pending'
    AND transaction_reference <> ''
    AND (
      (
        purpose = 'premium' AND hud_listing_id IS NULL
        AND ((plan = 'weekly' AND amount = 2500)
          OR (plan = 'monthly' AND amount = 7000)
          OR (plan = 'yearly' AND amount = 50000))
      )
      OR (
        purpose = 'hud' AND plan IS NULL AND hud_listing_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.free_fire_hud_listings h
          WHERE h.id = payments.hud_listing_id AND h.status = 'active' AND NOT h.is_free
            AND h.seller_id <> auth.uid() AND h.asking_price = payments.amount
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.hud_purchases hp
          WHERE hp.hud_listing_id = payments.hud_listing_id AND hp.buyer_id = auth.uid()
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.set_marketplace_seller_name()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.seller_name := COALESCE(
      (SELECT NULLIF(display_name, '') FROM public.user_profiles WHERE id = NEW.seller_id),
      'Free Fire player'
    );
  ELSE
    NEW.seller_id := OLD.seller_id;
    NEW.seller_name := OLD.seller_name;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_account_listing_seller ON public.free_fire_account_listings;
CREATE TRIGGER trg_account_listing_seller
  BEFORE INSERT OR UPDATE ON public.free_fire_account_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_seller_name();
DROP TRIGGER IF EXISTS trg_hud_listing_seller ON public.free_fire_hud_listings;
CREATE TRIGGER trg_hud_listing_seller
  BEFORE INSERT OR UPDATE ON public.free_fire_hud_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_marketplace_seller_name();

ALTER TABLE public.free_fire_account_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_fire_hud_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_account_marketplace_listings" ON public.free_fire_account_listings
  FOR SELECT TO anon, authenticated USING (status = 'active' OR seller_id = auth.uid());
CREATE POLICY "create_own_account_marketplace_listings" ON public.free_fire_account_listings
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND public.is_current_user_active() AND status = 'active');
CREATE POLICY "update_own_account_marketplace_listings" ON public.free_fire_account_listings
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() AND public.is_current_user_active())
  WITH CHECK (seller_id = auth.uid() AND public.is_current_user_active());
CREATE POLICY "delete_own_account_marketplace_listings" ON public.free_fire_account_listings
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid() AND public.is_current_user_active());

CREATE POLICY "read_hud_marketplace_listings" ON public.free_fire_hud_listings
  FOR SELECT TO anon, authenticated USING (
    status = 'active'
    OR seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.hud_purchases hp
      WHERE hp.hud_listing_id = public.free_fire_hud_listings.id
        AND hp.buyer_id = auth.uid()
    )
  );
CREATE POLICY "create_own_hud_marketplace_listings" ON public.free_fire_hud_listings
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid() AND public.is_current_user_active() AND status = 'active');
CREATE POLICY "update_own_hud_marketplace_listings" ON public.free_fire_hud_listings
  FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() AND public.is_current_user_active())
  WITH CHECK (seller_id = auth.uid() AND public.is_current_user_active());
CREATE POLICY "delete_own_hud_marketplace_listings" ON public.free_fire_hud_listings
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid() AND public.is_current_user_active());

GRANT SELECT ON public.free_fire_account_listings, public.free_fire_hud_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.free_fire_account_listings, public.free_fire_hud_listings TO authenticated;

CREATE INDEX IF NOT EXISTS idx_account_marketplace_status_category
  ON public.free_fire_account_listings(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_marketplace_seller
  ON public.free_fire_account_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_hud_marketplace_status_category
  ON public.free_fire_hud_listings(status, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hud_marketplace_seller
  ON public.free_fire_hud_listings(seller_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('marketplace', 'marketplace', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('hud-files', 'hud-files', false, 5242880,
  ARRAY['application/json', 'text/plain'])
ON CONFLICT (id) DO UPDATE
SET public = false, file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "marketplace_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'marketplace');
CREATE POLICY "marketplace_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketplace'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );
CREATE POLICY "marketplace_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'marketplace'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  )
  WITH CHECK (
    bucket_id = 'marketplace'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );
CREATE POLICY "marketplace_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketplace'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );

CREATE POLICY "hud_files_upload_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'hud-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );
CREATE POLICY "hud_files_read_purchased_or_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'hud-files'
    AND public.is_current_user_active()
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.free_fire_hud_listings h
        WHERE h.hud_file_path = name AND h.is_free AND h.status = 'active'
      )
      OR EXISTS (
        SELECT 1 FROM public.hud_purchases hp
        JOIN public.payments p ON p.id = hp.payment_id AND p.status = 'verified'
        JOIN public.free_fire_hud_listings h ON h.id = hp.hud_listing_id
        WHERE hp.buyer_id = auth.uid() AND h.hud_file_path = name
      )
    )
  );
CREATE POLICY "hud_files_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'hud-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.is_current_user_active()
  );