import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export interface MessageNotice {
  conversationId: string;
}

export function useMessageNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notice, setNotice] = useState<MessageNotice | null>(null);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setNotice(null);
      return;
    }

    let active = true;
    let noticeTimer: number | undefined;
    const onCountUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<number>;
      if (active) setUnreadCount(Number(customEvent.detail ?? 0));
    };
    window.addEventListener('direct-message-count', onCountUpdate);
    const refreshCount = async () => {
      const { data, error } = await supabase.rpc('get_my_unread_direct_message_count');
      if (active && !error) setUnreadCount(Number(data ?? 0));
    };
    void refreshCount();

    const channel = supabase
      .channel(`direct-message-notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `recipient_id=eq.${user.id}`,
      }, (payload) => {
        const message = payload.new as { conversation_id?: string; sender_id?: string };
        if (!message.conversation_id || message.sender_id === user.id) return;
        setNotice({ conversationId: message.conversation_id });
        if (noticeTimer) window.clearTimeout(noticeTimer);
        noticeTimer = window.setTimeout(() => setNotice(null), 7000);
        void supabase.rpc('mark_direct_messages_delivered', { p_conversation_id: message.conversation_id });
        void refreshCount();
      })
      .subscribe();

    return () => {
      active = false;
      window.removeEventListener('direct-message-count', onCountUpdate);
      if (noticeTimer) window.clearTimeout(noticeTimer);
      void supabase.removeChannel(channel);
    };
  }, [user]);

  return { unreadCount, notice, clearNotice: () => setNotice(null), refreshUnread: async () => {
    const { data, error } = await supabase.rpc('get_my_unread_direct_message_count');
    if (!error) setUnreadCount(Number(data ?? 0));
  } };
}