CREATE OR REPLACE FUNCTION public.get_support_account()
RETURNS TABLE(user_id uuid, display_name text, avatar_url text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT up.id, COALESCE(NULLIF(up.display_name, ''), 'RAIDEN SENSEI Support'),
         COALESCE(up.avatar_url, '')
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE auth.uid() IS NOT NULL
    AND au.raw_app_meta_data->>'is_admin' = 'true'
    AND up.account_status = 'active'
  ORDER BY up.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_message_users(p_query text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, is_admin boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT up.id, COALESCE(NULLIF(up.display_name, ''), 'RAIDEN player'),
         COALESCE(up.avatar_url, ''),
         (au.raw_app_meta_data->>'is_admin' = 'true') AS is_admin
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE auth.uid() IS NOT NULL
    AND public.is_current_user_active()
    AND up.account_status = 'active'
    AND up.id <> auth.uid()
    AND length(trim(COALESCE(p_query, ''))) >= 2
    AND up.display_name ILIKE '%' || trim(p_query) || '%'
  ORDER BY is_admin DESC, up.display_name ASC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.list_my_direct_conversations()
RETURNS TABLE(
  conversation_id uuid,
  contact_id uuid,
  display_name text,
  avatar_url text,
  is_admin boolean,
  last_message text,
  last_message_at timestamptz,
  unread_count bigint,
  last_status text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT c.id,
         contact.id,
         COALESCE(NULLIF(contact.display_name, ''), 'RAIDEN player'),
         COALESCE(contact.avatar_url, ''),
         (contact_auth.raw_app_meta_data->>'is_admin' = 'true'),
         latest.body,
         latest.created_at,
         (SELECT count(*)
          FROM public.direct_messages unread
          WHERE unread.conversation_id = c.id
            AND unread.recipient_id = auth.uid()
            AND unread.status <> 'read'),
         latest.status
  FROM public.direct_conversations c
  JOIN public.direct_conversation_members mine
    ON mine.conversation_id = c.id AND mine.user_id = auth.uid()
   AND mine.hidden_at IS NULL
  JOIN public.direct_conversation_members theirs
    ON theirs.conversation_id = c.id AND theirs.user_id <> auth.uid()
  JOIN public.user_profiles contact ON contact.id = theirs.user_id
  JOIN auth.users contact_auth ON contact_auth.id = contact.id
  LEFT JOIN LATERAL (
    SELECT dm.body, dm.created_at, dm.status
    FROM public.direct_messages dm
    WHERE dm.conversation_id = c.id
    ORDER BY dm.created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE public.is_current_user_active()
  ORDER BY COALESCE(latest.created_at, c.created_at) DESC;
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
           WHEN au.raw_app_meta_data->>'is_admin' = 'true' AND up.account_status = 'active' THEN 'premium'
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
         (au.raw_app_meta_data->>'is_admin' = 'true'), up.created_at
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE public.is_current_user_admin()
  ORDER BY up.created_at DESC;
$$;