CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_low uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_high uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  CONSTRAINT direct_conversations_distinct_users CHECK (user_low < user_high),
  CONSTRAINT direct_conversations_unique_pair UNIQUE (user_low, user_high)
);

CREATE TABLE IF NOT EXISTS public.direct_conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz,
  hidden_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz,
  CONSTRAINT direct_messages_distinct_users CHECK (sender_id <> recipient_id)
);

CREATE TABLE IF NOT EXISTS public.direct_message_blocks (
  blocker_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CONSTRAINT direct_message_blocks_distinct_users CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.direct_message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 5 AND 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_participant_conversations" ON public.direct_conversations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.direct_conversation_members m
    WHERE m.conversation_id = id AND m.user_id = auth.uid()
  ));

CREATE POLICY "read_own_conversation_memberships" ON public.direct_conversation_members
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.can_send_direct_message(p_conversation_id uuid, p_recipient_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_recipient_id <> auth.uid()
    AND public.is_current_user_active()
    AND EXISTS (
      SELECT 1
      FROM public.direct_conversations c
      JOIN public.direct_conversation_members sender_member
        ON sender_member.conversation_id = c.id
       AND sender_member.user_id = auth.uid()
       AND sender_member.hidden_at IS NULL
      JOIN public.direct_conversation_members recipient_member
        ON recipient_member.conversation_id = c.id
       AND recipient_member.user_id = p_recipient_id
      WHERE c.id = p_conversation_id
        AND ((c.user_low = auth.uid() AND c.user_high = p_recipient_id)
          OR (c.user_high = auth.uid() AND c.user_low = p_recipient_id))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.direct_message_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p_recipient_id)
         OR (b.blocker_id = p_recipient_id AND b.blocked_id = auth.uid())
    );
$$;

CREATE POLICY "read_participant_messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.direct_conversation_members m
    WHERE m.conversation_id = public.direct_messages.conversation_id
      AND m.user_id = auth.uid()
      AND m.hidden_at IS NULL
  ));

CREATE POLICY "send_participant_messages" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND status = 'sent'
    AND delivered_at IS NULL
    AND read_at IS NULL
    AND public.can_send_direct_message(conversation_id, recipient_id)
  );

CREATE POLICY "read_own_message_blocks" ON public.direct_message_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR blocked_id = auth.uid());
CREATE POLICY "create_own_message_blocks" ON public.direct_message_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    blocker_id = auth.uid()
    AND public.is_current_user_active()
    AND EXISTS (
      SELECT 1 FROM public.direct_conversations c
      JOIN public.direct_conversation_members m
        ON m.conversation_id = c.id AND m.user_id = auth.uid()
      WHERE (c.user_low = blocked_id OR c.user_high = blocked_id)
        AND (c.user_low = auth.uid() OR c.user_high = auth.uid())
    )
  );
CREATE POLICY "remove_own_message_blocks" ON public.direct_message_blocks
  FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE POLICY "read_own_message_reports" ON public.direct_message_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.is_current_user_admin());
CREATE POLICY "report_participant_messages" ON public.direct_message_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      JOIN public.direct_conversation_members m
        ON m.conversation_id = dm.conversation_id
       AND m.user_id = auth.uid()
       AND m.hidden_at IS NULL
      WHERE dm.id = message_id
    )
  );

GRANT SELECT ON public.direct_conversations, public.direct_conversation_members,
  public.direct_messages, public.direct_message_blocks, public.direct_message_reports TO authenticated;
REVOKE INSERT ON public.direct_messages, public.direct_message_blocks,
  public.direct_message_reports FROM authenticated;
GRANT INSERT (conversation_id, sender_id, recipient_id, body)
  ON public.direct_messages TO authenticated;
GRANT INSERT (blocker_id, blocked_id)
  ON public.direct_message_blocks TO authenticated;
GRANT INSERT (reporter_id, message_id, reason)
  ON public.direct_message_reports TO authenticated;
GRANT DELETE ON public.direct_message_blocks TO authenticated;

CREATE INDEX IF NOT EXISTS idx_direct_conversations_updated
  ON public.direct_conversations(last_message_at DESC NULLS LAST, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_members_user_inbox
  ON public.direct_conversation_members(user_id, hidden_at, last_read_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_time
  ON public.direct_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_status
  ON public.direct_messages(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_direct_message_reports_status
  ON public.direct_message_reports(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_recipient_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_conversation_id uuid;
BEGIN
  IF v_user_id IS NULL OR p_recipient_id IS NULL OR p_recipient_id = v_user_id THEN
    RAISE EXCEPTION 'A different registered user is required.';
  END IF;
  IF NOT public.is_current_user_active() THEN
    RAISE EXCEPTION 'An active account is required to send messages.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = p_recipient_id AND up.account_status = 'active'
  ) THEN
    RAISE EXCEPTION 'This user is not available for messaging.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.direct_message_blocks b
    WHERE (b.blocker_id = v_user_id AND b.blocked_id = p_recipient_id)
       OR (b.blocker_id = p_recipient_id AND b.blocked_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Messaging is unavailable for this user.';
  END IF;

  INSERT INTO public.direct_conversations (user_low, user_high)
  VALUES (LEAST(v_user_id, p_recipient_id), GREATEST(v_user_id, p_recipient_id))
  ON CONFLICT (user_low, user_high) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.direct_conversation_members (conversation_id, user_id, hidden_at)
  VALUES (v_conversation_id, v_user_id, NULL), (v_conversation_id, p_recipient_id, NULL)
  ON CONFLICT (conversation_id, user_id) DO UPDATE
  SET hidden_at = CASE
    WHEN EXCLUDED.user_id = v_user_id THEN NULL
    ELSE public.direct_conversation_members.hidden_at
  END;

  RETURN v_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_message_users(p_query text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, is_admin boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT up.id, COALESCE(NULLIF(up.display_name, ''), 'RAIDEN player'),
         COALESCE(up.avatar_url, ''), up.is_admin
  FROM public.user_profiles up
  WHERE auth.uid() IS NOT NULL
    AND public.is_current_user_active()
    AND up.account_status = 'active'
    AND up.id <> auth.uid()
    AND length(trim(COALESCE(p_query, ''))) >= 2
    AND up.display_name ILIKE '%' || trim(p_query) || '%'
  ORDER BY up.is_admin DESC, up.display_name ASC
  LIMIT 20;
$$;

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
  WHERE auth.uid() IS NOT NULL AND up.is_admin AND up.account_status = 'active'
  ORDER BY up.created_at ASC
  LIMIT 1;
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
         contact.is_admin,
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

CREATE OR REPLACE FUNCTION public.get_my_unread_direct_message_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT count(*)
  FROM public.direct_messages dm
  JOIN public.direct_conversation_members m
    ON m.conversation_id = dm.conversation_id
   AND m.user_id = auth.uid()
   AND m.hidden_at IS NULL
  WHERE dm.recipient_id = auth.uid() AND dm.status <> 'read';
$$;

CREATE OR REPLACE FUNCTION public.mark_direct_messages_delivered(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.direct_conversation_members m
    WHERE m.conversation_id = p_conversation_id
      AND m.user_id = auth.uid() AND m.hidden_at IS NULL
  ) THEN
    RETURN false;
  END IF;
  UPDATE public.direct_messages
  SET status = 'delivered', delivered_at = now()
  WHERE conversation_id = p_conversation_id
    AND recipient_id = auth.uid() AND status = 'sent';
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_direct_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.direct_conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  UPDATE public.direct_conversation_members
  SET hidden_at = NULL
  WHERE conversation_id = NEW.conversation_id AND user_id = NEW.recipient_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_direct_conversation_on_message
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_direct_conversation_on_message();

CREATE OR REPLACE FUNCTION public.get_direct_message_block_status(p_conversation_id uuid)
RETURNS TABLE(i_blocked boolean, blocked_me boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
           SELECT 1 FROM public.direct_message_blocks b
           WHERE b.blocker_id = auth.uid() AND b.blocked_id = other_member.user_id
         ),
         EXISTS (
           SELECT 1 FROM public.direct_message_blocks b
           WHERE b.blocker_id = other_member.user_id AND b.blocked_id = auth.uid()
         )
  FROM public.direct_conversation_members mine
  JOIN public.direct_conversation_members other_member
    ON other_member.conversation_id = mine.conversation_id
   AND other_member.user_id <> auth.uid()
  WHERE mine.conversation_id = p_conversation_id
    AND mine.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.hide_direct_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.direct_conversation_members
  SET hidden_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_direct_messages_read(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.direct_conversation_members m
    WHERE m.conversation_id = p_conversation_id
      AND m.user_id = auth.uid() AND m.hidden_at IS NULL
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.direct_messages
  SET status = 'read', read_at = now(), delivered_at = COALESCE(delivered_at, now())
  WHERE conversation_id = p_conversation_id
    AND recipient_id = auth.uid()
    AND status <> 'read';

  UPDATE public.direct_conversation_members
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND user_id = auth.uid();
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.block_direct_message_user(p_conversation_id uuid, p_block boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_user uuid;
BEGIN
  SELECT CASE WHEN c.user_low = auth.uid() THEN c.user_high ELSE c.user_low END
  INTO v_other_user
  FROM public.direct_conversations c
  JOIN public.direct_conversation_members m ON m.conversation_id = c.id
  WHERE c.id = p_conversation_id AND m.user_id = auth.uid();
  IF v_other_user IS NULL THEN RETURN false; END IF;

  IF p_block THEN
    INSERT INTO public.direct_message_blocks (blocker_id, blocked_id)
    VALUES (auth.uid(), v_other_user) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.direct_message_blocks
    WHERE blocker_id = auth.uid() AND blocked_id = v_other_user;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_direct_message(p_message_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid;
BEGIN
  IF length(trim(COALESCE(p_reason, ''))) < 5 THEN
    RAISE EXCEPTION 'Please provide a report reason.';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.direct_messages dm
    JOIN public.direct_conversation_members m
      ON m.conversation_id = dm.conversation_id AND m.user_id = auth.uid()
    WHERE dm.id = p_message_id
  ) THEN
    RAISE EXCEPTION 'Message not found in your conversations.';
  END IF;
  INSERT INTO public.direct_message_reports (reporter_id, message_id, reason)
  VALUES (auth.uid(), p_message_id, trim(p_reason))
  RETURNING id INTO v_report_id;
  RETURN v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_direct_message_reports()
RETURNS TABLE(
  report_id uuid,
  message_id uuid,
  conversation_id uuid,
  reporter_id uuid,
  reporter_name text,
  sender_id uuid,
  sender_name text,
  message_body text,
  reason text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT r.id, dm.id, dm.conversation_id, r.reporter_id,
         COALESCE(NULLIF(reporter.display_name, ''), 'RAIDEN player'),
         dm.sender_id, COALESCE(NULLIF(sender.display_name, ''), 'RAIDEN player'),
         dm.body, r.reason, r.status, r.created_at
  FROM public.direct_message_reports r
  JOIN public.direct_messages dm ON dm.id = r.message_id
  JOIN public.user_profiles reporter ON reporter.id = r.reporter_id
  JOIN public.user_profiles sender ON sender.id = dm.sender_id
  WHERE public.is_current_user_admin()
  ORDER BY r.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_direct_message_report(p_report_id uuid, p_status text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_current_user_admin() OR p_status NOT IN ('resolved', 'dismissed') THEN
    RETURN false;
  END IF;
  UPDATE public.direct_message_reports
  SET status = p_status, reviewer_id = auth.uid(), reviewed_at = now()
  WHERE id = p_report_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_direct_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_message_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_direct_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_unread_direct_message_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_message_block_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hide_direct_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_direct_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_direct_messages_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_direct_message_user(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_direct_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_direct_message_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_direct_message_report(uuid, text) TO authenticated;

ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END;
$$;
