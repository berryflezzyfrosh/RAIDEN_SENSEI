CREATE OR REPLACE FUNCTION public.admin_delete_marketplace_listing(
  p_listing_type text,
  p_listing_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed integer := 0;
BEGIN
  IF NOT public.is_current_user_admin() THEN RETURN 'unauthorized'; END IF;

  IF p_listing_type = 'account' THEN
    DELETE FROM public.free_fire_account_listings WHERE id = p_listing_id;
    GET DIAGNOSTICS v_changed = ROW_COUNT;
    RETURN CASE WHEN v_changed = 1 THEN 'deleted' ELSE 'not_found' END;
  ELSIF p_listing_type = 'hud' THEN
    IF EXISTS (SELECT 1 FROM public.hud_purchases WHERE hud_listing_id = p_listing_id) THEN
      UPDATE public.free_fire_hud_listings
      SET status = 'hidden', review_status = 'rejected',
          review_reason = 'Removed from public marketplace by an administrator. Existing buyer access is retained.',
          reviewed_at = now(), reviewed_by = auth.uid()
      WHERE id = p_listing_id;
      GET DIAGNOSTICS v_changed = ROW_COUNT;
      RETURN CASE WHEN v_changed = 1 THEN 'hidden_preserving_purchases' ELSE 'not_found' END;
    END IF;

    DELETE FROM public.free_fire_hud_listings WHERE id = p_listing_id;
    GET DIAGNOSTICS v_changed = ROW_COUNT;
    RETURN CASE WHEN v_changed = 1 THEN 'deleted' ELSE 'not_found' END;
  END IF;

  RETURN 'invalid_type';
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_marketplace_listing(text, uuid) TO authenticated;