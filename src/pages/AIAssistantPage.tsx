import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  ArrowLeft, Bot, Check, Copy, LoaderCircle, LockKeyhole, MessageSquarePlus, Plus, Send, Sparkles, Trash2,
} from 'lucide-react';
import { Badge, Button, Card, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface AIConversation {
  id: string;
  title: string;
  updated_at: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

const PROMPTS = [
  'How can I improve my close-range aim?',
  'Suggest a four-finger HUD setup for ranked.',
  'How much does Premium cost?',
  'Show me where to find the HUD marketplace.',
];

const textAreaClass = 'block w-full resize-none rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 focus:outline-none disabled:bg-neutral-50';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

async function readableFunctionError(error: unknown) {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload.error) return payload.error;
      } catch {
        return 'The AI service returned an unreadable error. Please retry.';
      }
    }
  }
  return error instanceof Error ? error.message : 'The assistant could not reply. Please try again.';
}

export function AIAssistantPage({ floating = false }: { floating?: boolean }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showChatOnMobile, setShowChatOnMobile] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sendingText, setSendingText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!user) { setLoadingList(false); return; }
    const { data, error: listError } = await supabase.from('ai_conversations')
      .select('id, title, updated_at').order('updated_at', { ascending: false });
    if (listError) setError(listError.message);
    else setConversations((data ?? []) as AIConversation[]);
    setLoadingList(false);
  }, [user]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => {
    let active = true;
    if (!activeId) { setMessages([]); return; }
    setLoadingMessages(true);
    supabase.from('ai_messages').select('id, role, content, created_at')
      .eq('conversation_id', activeId).order('created_at', { ascending: true })
      .then(({ data, error: messagesError }) => {
        if (!active) return;
        if (messagesError) setError(messagesError.message);
        else setMessages((data ?? []) as AIMessage[]);
        setLoadingMessages(false);
      });
    return () => { active = false; };
  }, [activeId]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const sendMessage = async (event?: FormEvent | KeyboardEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setError('');
    setSending(true);
    setSendingText(content);
    setDraft('');
    let data: { conversationId?: string; reply?: string; error?: string } | null = null;
    let invokeError: unknown;
    try {
      const result = await supabase.functions.invoke('assistant-chat', {
        body: { conversationId: activeId, message: content },
      });
      data = result.data as { conversationId?: string; reply?: string; error?: string } | null;
      invokeError = result.error;
    } catch (requestError) {
      invokeError = requestError;
    }
    if (invokeError || !data?.conversationId || !data?.reply) {
      setError(data?.error ?? await readableFunctionError(invokeError));
      setDraft(content);
      setSendingText('');
      setSending(false);
      return;
    }

    const response = data as { conversationId: string; reply: string };
    const createdAt = new Date().toISOString();
    if (response.conversationId !== activeId) setActiveId(response.conversationId);
    setMessages((current) => [...current,
      { id: `user-${crypto.randomUUID()}`, role: 'user', content, created_at: createdAt },
      { id: `assistant-${crypto.randomUUID()}`, role: 'assistant', content: response.reply, created_at: createdAt },
    ]);
    setDraft('');
    setSendingText('');
      if (data?.conversationId) {
        setActiveId(data.conversationId);
        await loadConversations();
      }
    setSending(false);
    await loadConversations();
  };

  const deleteConversation = async (conversationId: string) => {
    if (!window.confirm('Delete this AI conversation? This cannot be undone.')) return;
    const { error: deleteError } = await supabase.from('ai_conversations').delete().eq('id', conversationId);
    if (deleteError) { setError(deleteError.message); return; }
    setConversations((current) => current.filter((item) => item.id !== conversationId));
    if (activeId === conversationId) { setActiveId(null); setMessages([]); }
  };

  const copyMessage = async (message: AIMessage) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setError('Clipboard access is unavailable in this browser.');
    }
  };

  if (!user) return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><Bot size={40} className="mx-auto text-orange-500" /><h1 className="mt-4 font-display text-2xl font-bold text-neutral-900">Sign in to use the AI Assistant</h1><p className="mt-2 text-sm text-neutral-500">Your conversations are private to your account.</p></div>;

  const activeConversation = conversations.find((item) => item.id === activeId);

  return <div className={`mx-auto max-w-7xl px-4 py-7 sm:px-6 ${floating ? 'h-full max-w-none overflow-hidden px-3 py-3 sm:px-4 sm:py-3' : ''}`}>
    <header className={`flex flex-wrap items-end justify-between gap-3 ${floating ? 'mb-3' : 'mb-5'}`}><div><Badge color="orange"><Bot size={13} /> AI Assistant</Badge><h1 className={`mt-2 font-display font-bold text-neutral-900 ${floating ? 'text-lg' : 'text-2xl'}`}>RAIDEN Assistant</h1>{!floating && <p className="mt-1 text-sm text-neutral-500">Ask about RAIDEN SENSEI, Free Fire practice, tools, and Premium.</p>}</div><Button size={floating ? 'sm' : 'md'} onClick={() => { setActiveId(null); setMessages([]); setDraft(''); setError(''); setShowChatOnMobile(true); }}><Plus size={16} />New chat</Button></header>
    {error && <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}

    <div className={`grid h-[min(72vh,760px)] min-h-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] ${floating ? 'h-[calc(100%-4.5rem)] gap-3' : ''}`}>
      <div className={showChatOnMobile ? 'hidden lg:block' : 'block'}><Card className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3"><h2 className="text-sm font-semibold text-neutral-800">Your conversations</h2><MessageSquarePlus size={16} className="text-neutral-400" /></div>
        <div className="flex-1 overflow-y-auto">
          {loadingList ? <Spinner label="Loading history..." /> : conversations.length === 0 ? <div className="p-5 text-center text-sm text-neutral-500">Your AI chats will appear here.</div> : conversations.map((conversation) => <div key={conversation.id} className={`group flex items-center border-b border-neutral-100 ${activeId === conversation.id ? 'bg-orange-50/70' : 'hover:bg-neutral-50'}`}><button onClick={() => { setActiveId(conversation.id); setShowChatOnMobile(true); }} className="min-w-0 flex-1 px-4 py-3 text-left"><span className="block truncate text-sm font-medium text-neutral-800">{conversation.title}</span><span className="mt-1 block text-[11px] text-neutral-400">{formatDate(conversation.updated_at)}</span></button><button onClick={() => void deleteConversation(conversation.id)} aria-label="Delete conversation" title="Delete conversation" className="mr-2 rounded-md p-2 text-neutral-400 opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus:opacity-100"><Trash2 size={14} /></button></div>)}
        </div>
      </Card></div>

      <div className={`${showChatOnMobile ? 'block' : 'hidden lg:block'} min-h-0`}><Card className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3"><button onClick={() => setShowChatOnMobile(false)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 lg:hidden" aria-label="Back to AI conversations"><ArrowLeft size={18} /></button><span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700"><Bot size={19} /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-neutral-900">{activeConversation?.title ?? 'New conversation'}</h2><p className="text-xs text-neutral-500">RAIDEN SENSEI AI · Separate from private messages</p></div><span className="ml-auto hidden items-center gap-1 text-xs text-neutral-500 sm:inline-flex"><LockKeyhole size={13} />Private</span></div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-50/60 p-4 sm:p-6" aria-live="polite">
          {loadingMessages ? <Spinner label="Loading conversation..." /> : messages.length === 0 ? <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center"><div className="mb-5 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700"><Sparkles size={26} /></div><h3 className="mt-4 font-display text-xl font-bold text-neutral-900">What can I help you with?</h3><p className="mt-1 text-sm text-neutral-500">Ask about the website or get practical Free Fire training advice.</p></div><div className="grid gap-2 sm:grid-cols-2">{PROMPTS.map((prompt) => <button key={prompt} onClick={() => setDraft(prompt)} className="rounded-xl border border-neutral-200 bg-white p-3 text-left text-sm text-neutral-700 transition hover:border-orange-300 hover:bg-orange-50/40">{prompt}</button>)}</div>{sending && <div className="mt-6 flex flex-col items-end gap-3"><div className="max-w-[85%] rounded-2xl rounded-br-md bg-orange-600 px-4 py-3 text-sm text-white">{sendingText}</div><div className="inline-flex items-center gap-2 text-sm text-neutral-500"><LoaderCircle size={14} className="animate-spin" />Thinking...</div></div>}</div> : <div className="mx-auto max-w-3xl space-y-5">{messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>{message.role === 'assistant' && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-700"><Bot size={16} /></span>}<div className={`max-w-[88%] sm:max-w-[78%] ${message.role === 'user' ? 'rounded-2xl rounded-br-md bg-orange-600 px-4 py-3 text-white' : 'rounded-2xl rounded-bl-md border border-neutral-200 bg-white px-4 py-3 text-neutral-800'}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p><div className={`mt-2 flex items-center justify-between gap-4 text-[10px] ${message.role === 'user' ? 'text-orange-100' : 'text-neutral-400'}`}><time dateTime={message.created_at}>{formatDate(message.created_at)} · {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>{message.role === 'assistant' && <button onClick={() => void copyMessage(message)} className="inline-flex items-center gap-1 hover:text-orange-700" aria-label="Copy response">{copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}{copiedId === message.id ? 'Copied' : 'Copy'}</button>}</div></div>{message.role === 'user' && <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">{(user.email ?? 'U').slice(0, 1).toUpperCase()}</span>}</div>)}{sending && <div className="flex items-center gap-3 text-sm text-neutral-500"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700"><Bot size={16} /></span><span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" />Thinking...</span></div>}<div ref={messageEndRef} /></div>}
        </div>

        <form onSubmit={(event) => void sendMessage(event)} className="border-t border-neutral-100 bg-white p-3 sm:p-4"><div className="mx-auto flex max-w-3xl items-end gap-2"><textarea rows={1} className={`${textAreaClass} h-12 min-h-12 max-h-28 flex-1 overflow-y-auto`} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(event); } }} maxLength={4000} placeholder="Message the AI Assistant..." aria-label="Message the AI Assistant" disabled={sending} /><Button type="submit" loading={sending} disabled={!draft.trim()} aria-label="Send to AI Assistant"><Send size={16} />Send</Button></div><p className="mx-auto mt-2 max-w-3xl text-[10px] text-neutral-400">AI responses may be inaccurate. Never share passwords or payment credentials.</p></form>
      </Card></div>
    </div>
  </div>;
}