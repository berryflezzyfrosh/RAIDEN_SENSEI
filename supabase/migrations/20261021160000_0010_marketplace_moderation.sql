ALTER TABLE public.free_fire_account_listings
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_review_decision text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.free_fire_hud_listings
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS review_reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_review_decision text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS ai_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.free_fire_account_listings
  DROP CONSTRAINT IF EXISTS free_fire_account_listings_review_status_check,
  DROP CONSTRAINT IF EXISTS free_fire_account_listings_status_check;
ALTER TABLE public.free_fire_account_listings
  ADD CONSTRAINT free_fire_account_listings_review_status_check
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT free_fire_account_listings_status_check
    CHECK (status IN ('active', 'sold', 'hidden'));

ALTER TABLE public.free_fire_hud_listings
  DROP CONSTRAINT IF EXISTS free_fire_hud_listings_review_status_check,
  DROP CONSTRAINT IF EXISTS free_fire_hud_listings_status_check;
ALTER TABLE public.free_fire_hud_listings
  ADD CONSTRAINT free_fire_hud_listings_review_status_check
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT free_fire_hud_listings_status_check
    CHECK (status IN ('active', 'hidden'));

CREATE OR REPLACE FUNCTION public.guard_marketplace_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_changed boolean := false;
BEGIN
  IF public.is_current_user_admin() OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'hidden';
    NEW.review_status := 'pending';
    NEW.review_reason := 'Awaiting automated review.';
    NEW.ai_review_decision := 'pending';
    NEW.ai_reviewed_at := NULL;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.seller_id IS DISTINCT FROM OLD.seller_id THEN
    RAISE EXCEPTION 'Listing owner cannot be changed';
  END IF;

  IF TG_TABLE_NAME = 'free_fire_account_listings' THEN
    v_content_changed := NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.asking_price IS DISTINCT FROM OLD.asking_price
      OR NEW.account_level IS DISTINCT FROM OLD.account_level
      OR NEW.region_server IS DISTINCT FROM OLD.region_server
      OR NEW.category IS DISTINCT FROM OLD.category
      OR NEW.available_items IS DISTINCT FROM OLD.available_items
      OR NEW.character_info IS DISTINCT FROM OLD.character_info
      OR NEW.account_details IS DISTINCT FROM OLD.account_details
      OR NEW.seller_contact IS DISTINCT FROM OLD.seller_contact
      OR NEW.image_paths IS DISTINCT FROM OLD.image_paths;
  ELSE
    v_content_changed := NEW.title IS DISTINCT FROM OLD.title
      OR NEW.description IS DISTINCT FROM OLD.description
      OR NEW.asking_price IS DISTINCT FROM OLD.asking_price
      OR NEW.is_free IS DISTINCT FROM OLD.is_free
      OR NEW.device_compatibility IS DISTINCT FROM OLD.device_compatibility
      OR NEW.hud_file_path IS DISTINCT FROM OLD.hud_file_path
      OR NEW.preview_path IS DISTINCT FROM OLD.preview_path
      OR NEW.category IS DISTINCT FROM OLD.category;
  END IF;

  IF v_content_changed THEN
    NEW.status := 'hidden';
    NEW.review_status := 'pending';
    NEW.review_reason := 'Listing edited; awaiting automated review.';
    NEW.ai_review_decision := 'pending';
    NEW.ai_reviewed_at := NULL;
    NEW.reviewed_at := NULL;
    NEW.reviewed_by := NULL;
    RETURN NEW;
  END IF;

  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     OR NEW.review_reason IS DISTINCT FROM OLD.review_reason
     OR NEW.ai_review_decision IS DISTINCT FROM OLD.ai_review_decision
     OR NEW.ai_reviewed_at IS DISTINCT FROM OLD.ai_reviewed_at
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
    RAISE EXCEPTION 'Only moderators can change review state';
  END IF;

  IF OLD.review_status <> 'approved' AND NEW.status <> 'hidden' THEN
    RAISE EXCEPTION 'Listing must be approved before publication';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_account_marketplace_submission ON public.free_fire_account_listings;
CREATE TRIGGER trg_guard_account_marketplace_submission
  BEFORE INSERT OR UPDATE ON public.free_fire_account_listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_submission();
DROP TRIGGER IF EXISTS trg_guard_hud_marketplace_submission ON public.free_fire_hud_listings;
CREATE TRIGGER trg_guard_hud_marketplace_submission
  BEFORE INSERT OR UPDATE ON public.free_fire_hud_listings
  FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_submission();

DROP POLICY IF EXISTS "read_account_marketplace_listings" ON public.free_fire_account_listings;
CREATE POLICY "read_account_marketplace_listings" ON public.free_fire_account_listings
  FOR SELECT TO anon, authenticated USING (
    (status = 'active' AND review_status = 'approved')
    OR seller_id = auth.uid()
    OR public.is_current_user_admin()
  );
DROP POLICY IF EXISTS "create_own_account_marketplace_listings" ON public.free_fire_account_listings;
CREATE POLICY "create_own_account_marketplace_listings" ON public.free_fire_account_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = auth.uid() AND public.is_current_user_active()
    AND status = 'hidden' AND review_status = 'pending'
  );

DROP POLICY IF EXISTS "read_hud_marketplace_listings" ON public.free_fire_hud_listings;
CREATE POLICY "read_hud_marketplace_listings" ON public.free_fire_hud_listings
  FOR SELECT TO anon, authenticated USING (
    (status = 'active' AND review_status = 'approved')
    OR seller_id = auth.uid()
    OR public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.hud_purchases hp
      WHERE hp.hud_listing_id = public.free_fire_hud_listings.id
        AND hp.buyer_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "create_own_hud_marketplace_listings" ON public.free_fire_hud_listings;
CREATE POLICY "create_own_hud_marketplace_listings" ON public.free_fire_hud_listings
  FOR INSERT TO authenticated
  WITH CHECK (
    seller_id = auth.uid() AND public.is_current_user_active()
    AND status = 'hidden' AND review_status = 'pending'
  );

CREATE OR REPLACE FUNCTION public.admin_list_marketplace_moderation()
RETURNS TABLE(
  listing_type text,
  listing_id uuid,
  seller_id uuid,
  seller_name text,
  title text,
  description text,
  asking_price numeric,
  category text,
  status text,
  review_status text,
  review_reason text,
  ai_review_decision text,
  created_at timestamptz,
  details jsonb
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 'account'::text, a.id, a.seller_id, a.seller_name, a.title, a.description,
         a.asking_price, a.category, a.status, a.review_status, a.review_reason,
         a.ai_review_decision, a.created_at,
         jsonb_build_object(
           'level', a.account_level, 'region', a.region_server,
           'items', a.available_items, 'characters', a.character_info,
           'details', a.account_details, 'contact', a.seller_contact,
           'images', a.image_paths
         )
  FROM public.free_fire_account_listings a
  WHERE public.is_current_user_admin()
  UNION ALL
  SELECT 'hud'::text, h.id, h.seller_id, h.seller_name, h.title, h.description,
         h.asking_price, h.category, h.status, h.review_status, h.review_reason,
         h.ai_review_decision, h.created_at,
         jsonb_build_object(
           'free', h.is_free, 'device_compatibility', h.device_compatibility,
           'hud_file_path', h.hud_file_path, 'preview_path', h.preview_path
         )
  FROM public.free_fire_hud_listings h
  WHERE public.is_current_user_admin()
  ORDER BY created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_review_marketplace_listing(
  p_listing_type text,
  p_listing_id uuid,
  p_decision text,
  p_reason text DEFAULT ''
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed integer := 0;
  v_status text;
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN RETURN false; END IF;
  v_status := CASE WHEN p_decision = 'approved' THEN 'active' ELSE 'hidden' END;

  IF p_listing_type = 'account' THEN
    UPDATE public.free_fire_account_listings
    SET review_status = p_decision, status = v_status,
        review_reason = COALESCE(p_reason, ''), reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_listing_id;
  ELSIF p_listing_type = 'hud' THEN
    UPDATE public.free_fire_hud_listings
    SET review_status = p_decision, status = v_status,
        review_reason = COALESCE(p_reason, ''), reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_listing_id;
  ELSE
    RETURN false;
  END IF;

  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_marketplace_listing(
  p_listing_type text,
  p_listing_id uuid,
  p_reason text DEFAULT 'Removed by administrator.'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed integer := 0;
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN false; END IF;
  IF p_listing_type = 'account' THEN
    UPDATE public.free_fire_account_listings
    SET status = 'hidden', review_status = 'rejected',
        review_reason = COALESCE(p_reason, 'Removed by administrator.'),
        reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_listing_id;
  ELSIF p_listing_type = 'hud' THEN
    UPDATE public.free_fire_hud_listings
    SET status = 'hidden', review_status = 'rejected',
        review_reason = COALESCE(p_reason, 'Removed by administrator.'),
        reviewed_at = now(), reviewed_by = auth.uid()
    WHERE id = p_listing_id;
  ELSE
    RETURN false;
  END IF;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  RETURN v_changed = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_marketplace_moderation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_marketplace_listing(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_marketplace_listing(text, uuid, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.admin_list_marketplace_moderation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_marketplace_listing(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_marketplace_listing(text, uuid, text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_account_marketplace_review_queue
  ON public.free_fire_account_listings(review_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hud_marketplace_review_queue
  ON public.free_fire_hud_listings(review_status, created_at DESC);