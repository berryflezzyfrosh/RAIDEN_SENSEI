import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Ban, Check, CheckCheck, CircleUserRound, Headset,
  MessageCircle, MessageSquarePlus, Search, Send, Shield, ShieldCheck, Trash2, X,
} from 'lucide-react';
import { Badge, Button, Card, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface ConversationSummary {
  conversation_id: string;
  contact_id: string;
  display_name: string;
  avatar_url: string;
  is_admin: boolean;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  last_status: 'sent' | 'delivered' | 'read' | null;
}

interface MessageSearchResult {
  user_id: string;
  display_name: string;
  avatar_url: string;
  is_admin: boolean;
}

interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  status: 'sent' | 'delivered' | 'read' | 'sending';
  created_at: string;
}

interface MessageReport {
  report_id: string;
  message_id: string;
  conversation_id: string;
  reporter_name: string;
  sender_id: string;
  sender_name: string;
  message_body: string;
  reason: string;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
}

const inputClass = 'w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none';

function initialConversationId() {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('conversation');
}

function formatTime(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

export function MessagesPage({ adminInbox = false }: { adminInbox?: boolean }) {
  const { user, isAdmin } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialConversationId);
  const [query, setQuery] = useState('');
  const [sidebarView, setSidebarView] = useState<'chats' | 'people'>('people');
  const [conversationSearch, setConversationSearch] = useState('');
  const [people, setPeople] = useState<MessageSearchResult[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleHasMore, setPeopleHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profilePreview, setProfilePreview] = useState<MessageSearchResult | null>(null);
  const [reports, setReports] = useState<MessageReport[]>([]);
  const [adminView, setAdminView] = useState<'inbox' | 'reports'>('inbox');
  const [reportSearch, setReportSearch] = useState('');

  const refreshUnread = useCallback(async () => {
    const { data, error: unreadError } = await supabase.rpc('get_my_unread_direct_message_count');
    if (!unreadError) window.dispatchEvent(new CustomEvent('direct-message-count', { detail: Number(data ?? 0) }));
  }, []);

  const loadConversations = useCallback(async () => {
    if (!user) { setConversations([]); setLoading(false); return; }
    const { data, error: loadError } = await supabase.rpc('list_my_direct_conversations');
    if (loadError) setError(loadError.message);
    else setConversations((data ?? []) as ConversationSummary[]);
    setLoading(false);
  }, [user]);

  const loadReports = useCallback(async () => {
    if (!adminInbox) return;
    const { data, error: reportError } = await supabase.rpc('admin_list_direct_message_reports');
    if (reportError) setError(reportError.message);
    else setReports((data ?? []) as MessageReport[]);
  }, [adminInbox]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { void loadReports(); }, [loadReports]);
  useEffect(() => {
    const updateSelectedConversation = () => {
      const conversationId = initialConversationId();
      if (conversationId) setActiveId(conversationId);
    };
    window.addEventListener('hashchange', updateSelectedConversation);
    return () => window.removeEventListener('hashchange', updateSelectedConversation);
  }, []);

  useEffect(() => {
    if (adminInbox || sidebarView !== 'people' || !user) return;
    let active = true;
    setPeopleLoading(true);
    const term = query.trim();
    const timer = window.setTimeout(async () => {
      const { data, error: searchError } = await supabase.rpc('list_message_users', {
        p_query: term || null,
        p_limit: 40,
        p_offset: 0,
      });
      if (!active) return;
      setPeopleLoading(false);
      if (searchError) setError(searchError.message);
      else {
        const results = (data ?? []) as MessageSearchResult[];
        setPeople(results);
        setPeopleHasMore(results.length === 40);
      }
    }, term ? 250 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [adminInbox, query, sidebarView, user]);

  const activeConversation = conversations.find((conversation) => conversation.conversation_id === activeId) ?? null;
  const visibleConversations = useMemo(() => conversations.filter((conversation) => {
    const text = [conversation.display_name, conversation.last_message ?? ''].join(' ').toLowerCase();
    return text.includes(conversationSearch.trim().toLowerCase());
  }), [conversations, conversationSearch]);

  const openConversation = useCallback(async (recipientId: string) => {
    setError('');
    const { data, error: openError } = await supabase.rpc('create_direct_conversation', { p_recipient_id: recipientId });
    if (openError || !data) { setError(openError?.message ?? 'Could not open this conversation.'); return; }
    setActiveId(data as string);
    setQuery('');
    setSidebarView('chats');
    await loadConversations();
  }, [loadConversations]);

  const loadMorePeople = async () => {
    if (peopleLoading || !peopleHasMore) return;
    setPeopleLoading(true);
    const { data, error: peopleError } = await supabase.rpc('list_message_users', {
      p_query: query.trim() || null,
      p_limit: 40,
      p_offset: people.length,
    });
    if (peopleError) setError(peopleError.message);
    else {
      const nextPage = (data ?? []) as MessageSearchResult[];
      setPeople((current) => [...current, ...nextPage]);
      setPeopleHasMore(nextPage.length === 40);
    }
    setPeopleLoading(false);
  };

  const contactSupport = async () => {
    const { data, error: supportError } = await supabase.rpc('get_support_account').maybeSingle();
    if (supportError || !data) { setError(supportError?.message ?? 'Support is not available right now.'); return; }
    await openConversation((data as { user_id: string }).user_id);
  };

  const hideConversation = async (conversationId: string) => {
    const { data, error: hideError } = await supabase.rpc('hide_direct_conversation', { p_conversation_id: conversationId });
    if (hideError || data !== true) { setError(hideError?.message ?? 'Could not remove the conversation.'); return; }
    if (activeId === conversationId) setActiveId(null);
    await loadConversations();
    await refreshUnread();
  };

  const updateReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    const { data, error: updateError } = await supabase.rpc('admin_update_direct_message_report', {
      p_report_id: reportId, p_status: status,
    });
    if (updateError || data !== true) setError(updateError?.message ?? 'Could not update the report.');
    else await loadReports();
  };

  const suspendReportedUser = async (senderId: string) => {
    if (!window.confirm('Suspend this user account? They will lose access until an administrator restores it.')) return;
    const { data, error: suspendError } = await supabase.rpc('admin_suspend_user', { p_user_id: senderId });
    if (suspendError || data !== true) setError(suspendError?.message ?? 'The account could not be suspended.');
    else setError('The reported account has been suspended.');
  };

  const filteredReports = useMemo(() => reports.filter((report) => {
    const text = [report.reporter_name, report.sender_name, report.message_body, report.reason].join(' ').toLowerCase();
    return text.includes(reportSearch.trim().toLowerCase());
  }), [reports, reportSearch]);

  if (!user) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><MessageCircle size={40} className="mx-auto text-orange-500" /><h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">Sign in to view Messages</h1><p className="mt-2 text-sm text-neutral-500">Private conversations are available to registered users.</p></div>;
  }

  if (adminInbox && !isAdmin) return <div className="p-6 text-sm text-red-700">Administrator access is required.</div>;

  return (
    <div className={`mx-auto max-w-7xl px-4 py-7 sm:px-6 ${adminInbox ? 'max-w-none px-0 py-0' : ''}`}>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><Badge color={adminInbox ? 'blue' : 'orange'}>{adminInbox ? <><Shield size={12} /> Admin inbox</> : <><MessageCircle size={12} /> Private messages</>}</Badge><h1 className="mt-2 font-display text-2xl font-bold text-neutral-900">{adminInbox ? 'Support conversations' : 'Messages'}</h1><p className="mt-1 text-sm text-neutral-500">{adminInbox ? 'Reply to users who contacted RAIDEN SENSEI support.' : 'Private conversations with players and RAIDEN SENSEI support.'}</p></div>
        {!adminInbox && <Button variant="outline" onClick={contactSupport}><Headset size={16} />Contact Admin</Button>}
      </header>

      {error && <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}<button className="ml-auto" onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}

      {adminInbox && <div className="mb-4 flex gap-1 border-b border-neutral-200">{(['inbox', 'reports'] as const).map((view) => <button key={view} onClick={() => setAdminView(view)} className={`border-b-2 px-3 py-2 text-sm font-semibold capitalize ${adminView === view ? 'border-orange-500 text-orange-700' : 'border-transparent text-neutral-500'}`}>{view}{view === 'reports' && reports.filter((report) => report.status === 'open').length > 0 ? ` (${reports.filter((report) => report.status === 'open').length})` : ''}</button>)}</div>}

      {adminInbox && adminView === 'reports' ? (
        <div>
          <input className={`${inputClass} mb-3`} value={reportSearch} onChange={(event) => setReportSearch(event.target.value)} placeholder="Search reports" />
          {filteredReports.length === 0 ? <Card className="p-8 text-center text-sm text-neutral-500">No message reports found.</Card> : <div className="space-y-3">{filteredReports.map((report) => <Card key={report.report_id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge color={report.status === 'open' ? 'amber' : 'neutral'}>{report.status}</Badge><span className="text-xs text-neutral-500">{formatTime(report.created_at)}</span></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { setAdminView('inbox'); setActiveId(report.conversation_id); }}>Open thread</Button>{report.status === 'open' && <><Button size="sm" variant="danger" onClick={() => void suspendReportedUser(report.sender_id)}>Suspend sender</Button><Button size="sm" onClick={() => updateReport(report.report_id, 'resolved')}>Resolve</Button><Button size="sm" variant="ghost" onClick={() => updateReport(report.report_id, 'dismissed')}>Dismiss</Button></>}</div></div><p className="mt-3 text-sm text-neutral-700">{report.message_body}</p><p className="mt-2 text-xs text-neutral-500">Reported by {report.reporter_name} · Message from {report.sender_name}</p><p className="mt-1 text-sm text-neutral-600">Reason: {report.reason}</p></Card>)}</div>}
        </div>
      ) : (
        <div className="grid min-h-[min(72vh,760px)] gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className={activeConversation ? 'hidden lg:block' : 'block'}><Card className="flex min-h-[360px] flex-col overflow-hidden">
            {!adminInbox && <div className="grid grid-cols-2 gap-1 border-b border-neutral-100 p-2"><button onClick={() => { setSidebarView('chats'); setQuery(''); }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${sidebarView === 'chats' ? 'bg-orange-50 text-orange-700' : 'text-neutral-500 hover:bg-neutral-50'}`}>Chats <span className="ml-1 text-xs opacity-70">{conversations.length}</span></button><button onClick={() => setSidebarView('people')} className={`rounded-lg px-3 py-2 text-sm font-semibold ${sidebarView === 'people' ? 'bg-orange-50 text-orange-700' : 'text-neutral-500 hover:bg-neutral-50'}`}>People</button></div>}
            {!adminInbox && sidebarView === 'people' && <div className="border-b border-neutral-100 p-3"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input className={`${inputClass} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all players" /></div></div>}
            {adminInbox && <div className="border-b border-neutral-100 p-3"><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input className={`${inputClass} pl-9`} value={conversationSearch} onChange={(event) => setConversationSearch(event.target.value)} placeholder="Search support conversations" /></div></div>}
            {(adminInbox || sidebarView === 'chats') && <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3"><h2 className="text-sm font-semibold text-neutral-800">{adminInbox ? 'Conversations' : 'Your conversations'}</h2></div>}
            {sidebarView === 'chats' || adminInbox ? <div className="flex-1 overflow-y-auto">
              {loading ? <Spinner label="Loading inbox..." /> : visibleConversations.length === 0 ? <div className="p-6 text-center text-sm text-neutral-500"><MessageCircle size={22} className="mx-auto mb-2 text-neutral-300" />No conversations found.</div> : visibleConversations.map((conversation) => (
                <div key={conversation.conversation_id} className={`group flex items-start border-b border-neutral-100 hover:bg-neutral-50 ${activeId === conversation.conversation_id ? 'bg-orange-50/70' : ''}`}>
                  <button onClick={() => setActiveId(conversation.conversation_id)} className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left">
                    <UserAvatar name={conversation.display_name} src={conversation.avatar_url} />
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-sm font-semibold text-neutral-800">{conversation.display_name}{conversation.is_admin && <ShieldCheck size={13} className="text-orange-600" />}{conversation.unread_count > 0 && <span className="ml-auto rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] text-white">{conversation.unread_count}</span>}</span><span className="mt-1 block truncate text-xs text-neutral-500">{conversation.last_message ?? 'Start a conversation'}</span><span className="mt-1 block text-[10px] text-neutral-400">{formatTime(conversation.last_message_at)}</span></span>
                  </button>
                  <button onClick={() => void hideConversation(conversation.conversation_id)} aria-label="Remove conversation" title="Remove from inbox" className="mt-2 mr-2 rounded-md p-1.5 text-neutral-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button>
                </div>
              ))}
            </div> : <div className="flex-1 overflow-y-auto">
              {peopleLoading && people.length === 0 ? <Spinner label="Loading players..." /> : people.length === 0 ? <div className="p-6 text-center text-sm text-neutral-500"><CircleUserRound size={24} className="mx-auto mb-2 text-neutral-300" />No players found.</div> : people.map((person) => <div key={person.user_id} className="flex items-center gap-2 border-b border-neutral-100 px-3 py-3 hover:bg-neutral-50"><button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setProfilePreview(person)}><UserAvatar name={person.display_name} src={person.avatar_url} /><span className="truncate text-sm font-medium text-neutral-800">{person.display_name}{person.is_admin && <ShieldCheck size={13} className="ml-1 inline text-orange-600" />}</span></button><button onClick={() => void openConversation(person.user_id)} className="rounded-lg p-2 text-orange-600 hover:bg-orange-50" title={`Message ${person.display_name}`} aria-label={`Message ${person.display_name}`}><MessageSquarePlus size={16} /></button></div>)}
              {peopleHasMore && <div className="p-3 text-center"><Button size="sm" variant="outline" loading={peopleLoading} onClick={loadMorePeople}>Load more players</Button></div>}
            </div>}
          </Card></div>
          <div className={!activeConversation ? 'hidden lg:block' : 'block'}><Card className="flex min-h-[min(72vh,760px)] flex-col overflow-hidden">
            {activeConversation && <div className="border-b border-neutral-100 p-2 lg:hidden"><button onClick={() => setActiveId(null)} className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"><ArrowLeft size={16} />All conversations</button></div>}
            {activeConversation ? <MessageThread key={activeConversation.conversation_id} conversation={activeConversation} onUpdated={loadConversations} onRead={refreshUnread} /> : <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-neutral-500"><MessageCircle size={36} className="text-neutral-300" /><h2 className="mt-3 font-display font-bold text-neutral-800">Choose a conversation</h2><p className="mt-1 text-sm">Your private messages and support threads appear here.</p></div>}
          </Card></div>
        </div>
      )}

      {profilePreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setProfilePreview(null)}><div className="w-full max-w-sm" onClick={(event) => event.stopPropagation()}><Card className="p-5"><div className="flex justify-end"><button onClick={() => setProfilePreview(null)} aria-label="Close profile" className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"><X size={18} /></button></div><div className="-mt-2 text-center"><UserAvatar name={profilePreview.display_name} src={profilePreview.avatar_url} large /><h2 className="mt-3 font-display text-lg font-bold text-neutral-900">{profilePreview.display_name}</h2>{profilePreview.is_admin && <Badge color="amber"><ShieldCheck size={12} /> Admin</Badge>}<p className="mt-2 text-xs text-neutral-500">RAIDEN SENSEI member</p><Button className="mt-4" full onClick={() => { setProfilePreview(null); void openConversation(profilePreview.user_id); }}>Message</Button></div></Card></div></div>}
    </div>
  );
}

function MessageThread({ conversation, onUpdated, onRead }: { conversation: ConversationSummary; onUpdated: () => void; onRead: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [iBlocked, setIBlocked] = useState(false);
  const [blockedMe, setBlockedMe] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [showReport, setShowReport] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMessages = useCallback(async () => {
    const { data, error: loadError } = await supabase.from('direct_messages').select('*')
      .eq('conversation_id', conversation.conversation_id).order('created_at', { ascending: true });
    if (loadError) setError(loadError.message);
    else setMessages((data ?? []) as DirectMessage[]);
    setLoading(false);
    await supabase.rpc('mark_direct_messages_delivered', { p_conversation_id: conversation.conversation_id });
    await supabase.rpc('mark_direct_messages_read', { p_conversation_id: conversation.conversation_id });
    onRead();
    onUpdated();
  }, [conversation.conversation_id, onRead, onUpdated]);

  const loadBlockStatus = useCallback(async () => {
    const { data } = await supabase.rpc('get_direct_message_block_status', { p_conversation_id: conversation.conversation_id }).maybeSingle();
    const status = data as { i_blocked?: boolean; blocked_me?: boolean } | null;
    setIBlocked(Boolean(status?.i_blocked));
    setBlockedMe(Boolean(status?.blocked_me));
  }, [conversation.conversation_id]);

  useEffect(() => { void loadMessages(); void loadBlockStatus(); }, [loadBlockStatus, loadMessages]);

  useEffect(() => {
    const channel = supabase.channel(`direct-message-thread:${conversation.conversation_id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${conversation.conversation_id}`,
      }, (payload) => {
        const message = payload.new as DirectMessage;
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        if (message.recipient_id === user?.id) {
          void supabase.rpc('mark_direct_messages_read', { p_conversation_id: conversation.conversation_id });
          onRead();
        }
        onUpdated();
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'direct_messages',
        filter: `conversation_id=eq.${conversation.conversation_id}`,
      }, (payload) => {
        const message = payload.new as DirectMessage;
        setMessages((current) => current.map((item) => item.id === message.id ? message : item));
        onUpdated();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [conversation.conversation_id, onRead, onUpdated, user?.id]);

  const send = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || !user || sending || iBlocked || blockedMe) return;
    setSending(true);
    setError('');
    const { data, error: sendError } = await supabase.from('direct_messages').insert({
      conversation_id: conversation.conversation_id,
      sender_id: user.id,
      recipient_id: conversation.contact_id,
      body: cleanBody,
    }).select('*').single();
    if (sendError) setError(sendError.message);
    else {
      setMessages((current) => [...current, data as DirectMessage]);
      setBody('');
      onUpdated();
    }
    setSending(false);
  };

  const toggleBlock = async () => {
    setBlockBusy(true);
    const { data, error: blockError } = await supabase.rpc('block_direct_message_user', {
      p_conversation_id: conversation.conversation_id, p_block: !iBlocked,
    });
    if (blockError || data !== true) setError(blockError?.message ?? 'Could not update block settings.');
    else await loadBlockStatus();
    setBlockBusy(false);
  };

  const reportMessage = async (messageId: string) => {
    if (reportReason.trim().length < 5) { setError('Add at least five characters explaining the report.'); return; }
    setReporting(true);
    const { error: reportError } = await supabase.rpc('report_direct_message', { p_message_id: messageId, p_reason: reportReason.trim() });
    if (reportError) setError(reportError.message);
    else { setError(''); setSuccess('Message reported to the administrators.'); setReportReason(''); setShowReport(null); }
    setReporting(false);
  };

  return <>
    <header className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3"><div className="flex min-w-0 items-center gap-3"><UserAvatar name={conversation.display_name} src={conversation.avatar_url} /><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-neutral-900">{conversation.display_name}{conversation.is_admin && <ShieldCheck size={14} className="ml-1 inline text-orange-600" />}</h2><p className="text-xs text-neutral-500">{conversation.is_admin ? 'RAIDEN SENSEI Support' : 'RAIDEN SENSEI member'}</p></div></div><Button size="sm" variant="ghost" loading={blockBusy} onClick={toggleBlock}><Ban size={15} />{iBlocked ? 'Unblock' : 'Block'}</Button></header>
    <div className="flex-1 space-y-3 overflow-y-auto bg-neutral-50/60 p-4" aria-live="polite">
      {loading ? <Spinner label="Loading messages..." /> : messages.length === 0 ? <div className="py-12 text-center text-sm text-neutral-500">This is the beginning of your conversation.</div> : messages.map((message) => {
        const own = message.sender_id === user?.id;
        return <div key={message.id} className={`group flex ${own ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${own ? 'rounded-br-md bg-orange-600 text-white' : 'rounded-bl-md border border-neutral-200 bg-white text-neutral-800'}`}><p className="whitespace-pre-wrap break-words text-sm">{message.body}</p><div className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${own ? 'text-orange-100' : 'text-neutral-400'}`}><time dateTime={message.created_at}>{formatTime(message.created_at)}</time>{own && <span aria-label={message.status}>{message.status === 'read' ? <CheckCheck size={13} /> : message.status === 'delivered' ? <CheckCheck size={13} /> : <Check size={13} />}</span>}</div></div>{!own && <button onClick={() => setShowReport(message.id)} title="Report message" aria-label="Report message" className="ml-1 self-center rounded-md p-1 text-neutral-300 opacity-0 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"><AlertTriangle size={14} /></button>}</div>;
      })}
    </div>
    {error && <div className="border-t border-neutral-100 px-4 py-2 text-xs text-red-700">{error}</div>}
    {success && <div className="border-t border-neutral-100 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">{success}</div>}
    {blockedMe ? <div className="border-t border-neutral-100 p-4 text-center text-sm text-neutral-500">This user has restricted new messages.</div> : iBlocked ? <div className="border-t border-neutral-100 p-4 text-center text-sm text-neutral-500">You blocked this user. Unblock them to send a message.</div> : <form onSubmit={send} className="flex items-end gap-2 border-t border-neutral-100 p-3"><textarea rows={1} className={`${inputClass} h-11 min-h-11 max-h-28 resize-none overflow-y-auto`} value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} placeholder="Write a message..." aria-label="Message" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(event); } }} /><Button type="submit" loading={sending} disabled={!body.trim()} aria-label="Send message"><Send size={16} />Send</Button></form>}
    {showReport && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowReport(null)}><div className="w-full max-w-md" onClick={(event) => event.stopPropagation()}><Card className="p-5"><h3 className="font-display text-lg font-bold text-neutral-900">Report message</h3><p className="mt-1 text-sm text-neutral-500">Administrators will review this message and your reason.</p><textarea rows={4} className={`${inputClass} mt-4 resize-none`} value={reportReason} onChange={(event) => setReportReason(event.target.value)} maxLength={1000} placeholder="What is the issue?" /><div className="mt-4 flex justify-end gap-2"><Button variant="ghost" onClick={() => setShowReport(null)}>Cancel</Button><Button variant="danger" loading={reporting} onClick={() => void reportMessage(showReport)}><AlertTriangle size={15} />Submit report</Button></div></Card></div></div>}
  </>;
}

function UserAvatar({ name, src, large = false }: { name: string; src: string; large?: boolean }) {
  return src ? <img src={src} alt="" className={`${large ? 'h-16 w-16' : 'h-9 w-9'} inline-block shrink-0 rounded-full border border-neutral-200 object-cover`} /> : <span className={`${large ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-sm'} inline-flex shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700`}><CircleUserRound size={large ? 30 : 18} /><span className="sr-only">{name}</span></span>;
}