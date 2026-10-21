CREATE OR REPLACE FUNCTION public.list_message_users(
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 40,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, is_admin boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT up.id,
         COALESCE(NULLIF(up.display_name, ''), 'RAIDEN player'),
         COALESCE(up.avatar_url, ''),
         COALESCE(au.raw_app_meta_data->>'is_admin' = 'true', false)
  FROM public.user_profiles up
  JOIN auth.users au ON au.id = up.id
  WHERE auth.uid() IS NOT NULL
    AND public.is_current_user_active()
    AND up.account_status = 'active'
    AND up.id <> auth.uid()
    AND (NULLIF(trim(COALESCE(p_query, '')), '') IS NULL
      OR up.display_name ILIKE '%' || trim(p_query) || '%')
  ORDER BY COALESCE(au.raw_app_meta_data->>'is_admin' = 'true', false) DESC,
           up.display_name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

GRANT EXECUTE ON FUNCTION public.list_message_users(text, integer, integer) TO authenticated;

CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation' CHECK (char_length(title) BETWEEN 1 AND 120),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 12000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_ai_conversations" ON public.ai_conversations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "delete_own_ai_conversations" ON public.ai_conversations
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "read_own_ai_messages" ON public.ai_messages
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.ai_conversations c
    WHERE c.id = conversation_id AND c.user_id = auth.uid()
  ));

GRANT SELECT, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT ON public.ai_messages TO authenticated;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated
  ON public.ai_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
  ON public.ai_messages(conversation_id, created_at ASC);