CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE((auth.jwt()->'app_metadata'->>'is_admin')::boolean, false)
    AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.account_status = 'active'
    );
$$;

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
           WHEN up.account_status = 'active' AND public.is_current_user_admin() THEN 'premium'
           ELSE up.premium_status
         END AS premium_status,
         public.has_premium_access() AS is_active,
         (SELECT max(ps.expiry_date)
          FROM public.premium_subscriptions ps
          WHERE ps.user_id = auth.uid() AND ps.status = 'active') AS expiry_date
  FROM public.user_profiles up
  WHERE up.id = auth.uid();
$$;

DROP POLICY IF EXISTS "insert_own_sens" ON public.saved_sensitivities;
CREATE POLICY "insert_own_sens" ON public.saved_sensitivities
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.is_current_user_active()
    AND (
      public.has_premium_access()
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
      public.has_premium_access()
      OR (
        NOT is_premium
        AND preset IN ('balanced', 'aggressive', 'headshot', 'close_range')
      )
    )
  );