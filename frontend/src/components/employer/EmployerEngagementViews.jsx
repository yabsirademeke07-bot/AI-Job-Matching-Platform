import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Loader2, MessageSquareText, RefreshCw, Save, Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { deleteNotification, deleteReadNotifications, getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../services/notificationService';
import { deleteConversation, getConversation, getConversations, getUnreadMessageCount, markConversationAsRead, sendMessage } from '../../services/messageService';

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; } catch { return fallback; } }

function LegacyEmployerMessages() {
  const [search, setSearch] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const fileInput = useRef(null);
  const messagesEndRef = useRef(null);

  const conversations = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('mockConversations') || 'null');
      return Array.isArray(stored) && stored.length ? stored : [
        {
          id: 'conversation-601',
          companyName: 'Mekdes Tadesse',
          employerName: 'Hiring Team',
          jobTitle: 'Frontend Developer',
          lastMessage: 'I am available Thursday afternoon for the next interview stage.',
          lastMessageTime: '10:30 AM',
          unreadCount: 2,
          messages: [
            {
              id: 'message-1',
              sender: 'candidate',
              text: 'Hello, I am available Thursday afternoon for the next interview stage.',
              time: '10:20 AM',
            },
            {
              id: 'message-2',
              sender: 'employer',
              text: 'Great, we will send a calendar invite shortly.',
              time: '10:24 AM',
            },
            {
              id: 'message-3',
              sender: 'candidate',
              text: 'I am available Thursday afternoon for the next interview stage.',
              time: '10:30 AM',
            },
          ],
        },
        {
          id: 'conversation-602',
          companyName: 'Abel Bekele',
          employerName: 'Talent Team',
          jobTitle: 'Backend Developer',
          lastMessage: 'Thank you for your application. Our team will be in touch soon.',
          lastMessageTime: 'Yesterday',
          unreadCount: 0,
          messages: [
            {
              id: 'message-4',
              sender: 'employer',
              text: 'Thank you for your application. Our team will be in touch soon.',
              time: 'Yesterday',
            },
          ],
        },
        {
          id: 'conversation-603',
          companyName: 'Hana Solomon',
          employerName: 'Engineering Manager',
          jobTitle: 'Full Stack Software Engineer',
          lastMessage: 'Please share a convenient time for a follow-up.',
          lastMessageTime: 'Aug 22',
          unreadCount: 1,
          messages: [
            {
              id: 'message-5',
              sender: 'candidate',
              text: 'I enjoyed learning more about the engineering team.',
              time: 'Aug 22',
            },
            {
              id: 'message-6',
              sender: 'employer',
              text: 'Please share a convenient time for a follow-up.',
              time: 'Aug 22',
            },
          ],
        },
      ];
    } catch {
      return [
        {
          id: 'conversation-601',
          companyName: 'Mekdes Tadesse',
          employerName: 'Hiring Team',
          jobTitle: 'Frontend Developer',
          lastMessage: 'I am available Thursday afternoon for the next interview stage.',
          lastMessageTime: '10:30 AM',
          unreadCount: 2,
          messages: [
            {
              id: 'message-1',
              sender: 'candidate',
              text: 'Hello, I am available Thursday afternoon for the next interview stage.',
              time: '10:20 AM',
            },
            {
              id: 'message-2',
              sender: 'employer',
              text: 'Great, we will send a calendar invite shortly.',
              time: '10:24 AM',
            },
            {
              id: 'message-3',
              sender: 'candidate',
              text: 'I am available Thursday afternoon for the next interview stage.',
              time: '10:30 AM',
            },
          ],
        },
        {
          id: 'conversation-602',
          companyName: 'Abel Bekele',
          employerName: 'Talent Team',
          jobTitle: 'Backend Developer',
          lastMessage: 'Thank you for your application. Our team will be in touch soon.',
          lastMessageTime: 'Yesterday',
          unreadCount: 0,
          messages: [
            {
              id: 'message-4',
              sender: 'employer',
              text: 'Thank you for your application. Our team will be in touch soon.',
              time: 'Yesterday',
            },
          ],
        },
        {
          id: 'conversation-603',
          companyName: 'Hana Solomon',
          employerName: 'Engineering Manager',
          jobTitle: 'Full Stack Software Engineer',
          lastMessage: 'Please share a convenient time for a follow-up.',
          lastMessageTime: 'Aug 22',
          unreadCount: 1,
          messages: [
            {
              id: 'message-5',
              sender: 'candidate',
              text: 'I enjoyed learning more about the engineering team.',
              time: 'Aug 22',
            },
            {
              id: 'message-6',
              sender: 'employer',
              text: 'Please share a convenient time for a follow-up.',
              time: 'Aug 22',
            },
          ],
        },
      ];
    }
  }, []);

  const conversationItems = useMemo(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('mockConversations') || 'null');
      if (Array.isArray(stored) && stored.length) {
        return stored;
      }
    } catch {
      // Fall through to seeded conversations.
    }

    return conversations;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversationItems;

    return conversationItems.filter((conversation) =>
      [conversation.companyName, conversation.employerName, conversation.jobTitle, conversation.lastMessage].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [conversationItems, search]);

  const activeConversation = useMemo(
    () => conversationItems.find((item) => item.id === conversationId) || null,
    [conversationId, conversationItems],
  );

  const messages = useMemo(() => activeConversation?.messages || [], [activeConversation]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, conversationId]);

  const saveConversations = (items) => {
    localStorage.setItem('mockConversations', JSON.stringify(items));
  };

  const markConversationRead = (id) => {
    const next = conversationItems.map((conversation) =>
      String(conversation.id) === String(id)
        ? {
            ...conversation,
            unreadCount: 0,
            messages: conversation.messages.map((message) =>
              message.sender === 'candidate'
                ? { ...message, isRead: true }
                : message,
            ),
          }
        : conversation,
    );

    saveConversations(next);
    return next;
  };

  const handleSend = (event) => {
    event.preventDefault();
    const text = input.trim();
    if (!text && !attachment) return;

    const nextMessages = [
      ...messages,
      {
        id: `message-${Date.now()}`,
        sender: 'employer',
        text: text || `Shared ${attachment.name}`,
        time: 'Just now',
        isRead: true,
      },
    ];

    const nextConversationItems = conversationItems.map((item) =>
      item.id === conversationId
        ? {
            ...item,
            messages: nextMessages,
            unreadCount: 0,
            lastMessage: text || `Shared ${attachment.name}`,
            lastMessageTime: 'Just now',
          }
        : item,
    );

    saveConversations(nextConversationItems);
    setInput('');
    setAttachment(null);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend(event);
    }
  };

  const openConversation = (id) => {
    const next = markConversationRead(id);
    saveConversations(next);
    setConversationId(id);
  };

  if (conversationId && activeConversation) {
    return (
      <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 p-4">
            <button
              type="button"
              onClick={() => setConversationId('')}
              className="inline-flex min-h-10 items-center gap-2 text-sm font-bold text-(--brand-deep) hover:underline"
            >
              <span className="text-base">←</span>
              Back to Messages
            </button>
            <div className="ml-auto text-right">
              <h1 className="text-base font-black text-slate-900">{activeConversation.companyName}</h1>
              <p className="text-xs font-semibold text-slate-500">
                {activeConversation.jobTitle} · {activeConversation.employerName}
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${message.sender === 'employer' ? 'items-end' : 'items-start'}`}
              >
                <span className="mb-1 px-1 text-[11px] font-bold text-slate-400">
                  {message.sender === 'employer' ? 'Employer' : 'Applicant'}
                </span>
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === 'employer' ? 'rounded-br-sm bg-slate-900 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}
                >
                  {message.text}
                </p>
                <span className="mt-1 px-1 text-[11px] text-slate-400">{message.time}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3">
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Attach a file"
                onClick={() => fileInput.current?.click()}
                className="min-h-11 min-w-11 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <span className="flex items-center justify-center">📎</span>
              </button>
              <input
                ref={fileInput}
                type="file"
                onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                className="hidden"
              />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type a message..."
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-(--brand-primary)"
              />
              <button
                type="submit"
                disabled={!input.trim() && !attachment}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-(--brand-primary) px-4 text-sm font-bold text-white hover:bg-(--brand-primary-hover) disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <span className="text-base">➤</span>
                Send
              </button>
            </div>
            {attachment && (
              <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                <span>Selected file: {attachment.name}</span>
                <button
                  type="button"
                  aria-label="Remove selected file"
                  onClick={() => setAttachment(null)}
                  className="text-slate-500 hover:text-red-600"
                >
                  <span className="text-base">×</span>
                </button>
              </div>
            )}
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="information-page min-h-[70vh] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <div className="mx-auto max-w-4xl">
        <header>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">Messages</h1>
              <p className="mt-2 text-sm text-slate-500">Stay connected with applicants and track your conversations.</p>
            </div>
          </div>
        </header>

        <label className="mt-6 block">
          <span className="sr-only">Search conversations</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search conversations..."
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-800 shadow-sm outline-none focus:border-(--brand-primary)"
          />
        </label>

        <section className="mt-5 space-y-3" aria-label="Conversation list">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => openConversation(conversation.id)}
                className="w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-(--brand-primary) hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2
                      className={`truncate text-base text-slate-900 ${conversation.unreadCount ? 'font-black' : 'font-bold'}`}
                    >
                      {conversation.companyName}
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{conversation.jobTitle}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{conversation.lastMessageTime}</span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p
                    className={`truncate text-sm ${conversation.unreadCount ? 'font-semibold text-slate-700' : 'text-slate-500'}`}
                  >
                    {conversation.lastMessage}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="shrink-0 rounded-full bg-(--brand-soft) px-2.5 py-1 text-xs font-black text-(--brand-deep)">
                      {conversation.unreadCount} unread
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="text-base font-black text-slate-900">No conversations found.</h2>
              <p className="mt-2 text-sm text-slate-500">Try searching using a different applicant or job name.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export function EmployerMessages() {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeConversation, setActiveConversation] = useState(null);
  const [search, setSearch] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileChat, setMobileChat] = useState(false);

  const loadConversations = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data }, countResponse] = await Promise.all([getConversations(), getUnreadMessageCount()]);
      setConversations(data?.data || data?.conversations || []);
      setUnreadCount(Number(countResponse.data?.data?.count || 0));
      window.dispatchEvent(new Event('employer-messages:updated'));
    } catch {
      setError('Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  const openConversation = async (conversationId) => {
    setSelectedId(String(conversationId));
    setMobileChat(true);
    setOpening(true);
    setError('');
    try {
      const { data } = await getConversation(conversationId);
      setActiveConversation(data?.data || data?.conversation || null);
      setError('');
      setUnreadCount((current) => Math.max(0, current - Number(conversations.find((item) => String(item.conversationId) === String(conversationId))?.unreadCount || 0)));
      await markConversationAsRead(conversationId);
      window.dispatchEvent(new Event('employer-messages:updated'));
    } catch {
      setError('Unable to open conversation.');
    } finally {
      setOpening(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) { setSendError('Please enter a message.'); return; }
    if (message.length > 5000) { setSendError('Message is too large.'); return; }
    if (!selectedId) return;
    setSending(true);
    setSendError('');
    try {
      const { data } = await sendMessage(selectedId, message);
      const saved = data?.data || data?.message;
      setActiveConversation((current) => ({ ...current, messages: [...(current?.messages || []), saved] }));
      setConversations((current) => current.map((item) => String(item.conversationId) === String(selectedId) ? { ...item, lastMessage: message, lastMessageTime: new Date().toISOString() } : item));
      setInput('');
      window.dispatchEvent(new Event('employer-messages:updated'));
    } catch {
      setSendError('Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const removeConversation = async (conversation) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await deleteConversation(conversation.conversationId);
      setConversations((current) => current.filter((item) => item.conversationId !== conversation.conversationId));
      if (String(selectedId) === String(conversation.conversationId)) { setSelectedId(''); setActiveConversation(null); setMobileChat(false); }
      window.dispatchEvent(new Event('employer-messages:updated'));
    } catch { setError('Unable to delete conversation.'); }
  };

  const filteredConversations = conversations.filter((item) => `${item.candidateName || ''} ${item.jobTitle || ''}`.toLowerCase().includes(search.toLowerCase()));
  const formatTime = (value) => value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const messages = activeConversation?.messages || [];

  return <ViewFrame icon={MessageSquareText} title="Messages" subtitle="Communicate with candidates connected to your recruitment workflow."><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="grid min-h-[560px] md:grid-cols-[minmax(240px,0.36fr)_1fr]"> <aside className={`${mobileChat ? 'hidden md:block' : 'block'} border-b border-slate-200 md:border-b-0 md:border-r`}><div className="border-b border-slate-100 p-4"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidates..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>{loading ? <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div> : error && !conversations.length ? <div className="p-6 text-center"><p className="text-sm font-bold text-red-600">{error}</p><button type="button" onClick={loadConversations} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Retry</button></div> : filteredConversations.length ? <div className="divide-y divide-slate-100">{filteredConversations.map((item) => <div key={item.conversationId} className={`flex items-start gap-2 p-4 ${String(selectedId) === String(item.conversationId) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}><button type="button" onClick={() => openConversation(item.conversationId)} className="min-w-0 flex-1 text-left"><p className="truncate font-black text-slate-800">{item.candidateName || 'Candidate'}</p><p className="truncate text-xs text-slate-500">{item.jobTitle || 'Application'}</p><p className="mt-1 truncate text-xs text-slate-400">{item.lastMessage || 'No messages yet.'}</p></button><div className="flex shrink-0 flex-col items-end gap-2"><span className="text-[10px] text-slate-400">{formatTime(item.lastMessageTime)}</span>{Number(item.unreadCount) > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">{item.unreadCount}</span>}<button type="button" onClick={() => removeConversation(item)} className="text-[10px] font-bold text-slate-400 hover:text-red-600">Delete</button></div></div>)}</div> : <p className="p-8 text-center text-sm text-slate-500">No conversations yet.</p>}</aside><section className={`${mobileChat ? 'block' : 'hidden md:block'} min-w-0`}>{opening ? <div className="flex h-full min-h-[560px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Opening conversation...</div> : activeConversation ? <><div className="flex items-center gap-3 border-b border-slate-200 p-4"><button type="button" onClick={() => setMobileChat(false)} className="md:hidden text-sm font-bold text-blue-600">← Back</button><div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">{(activeConversation.conversation?.candidateName || 'C').charAt(0)}</div><div className="min-w-0"><h3 className="truncate font-black text-slate-900">{activeConversation.conversation?.candidateName || 'Candidate'}</h3><p className="truncate text-xs text-slate-500">{activeConversation.conversation?.jobTitle || 'Application'} · {activeConversation.conversation?.candidateStatus || 'Active'}</p></div></div><div className="flex min-h-[390px] flex-col gap-3 overflow-y-auto bg-slate-50 p-4">{messages.length ? messages.map((message) => <div key={message.id} className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${String(message.senderId) === String(activeConversation.conversation?.employerId) ? 'self-end bg-blue-600 text-white' : 'self-start bg-white text-slate-700 shadow-sm'}`}><p>{message.message}</p><p className="mt-1 text-[10px] opacity-70">{formatTime(message.createdAt)}</p></div>) : <div className="m-auto text-center text-sm text-slate-500"><p>No messages yet.</p><p className="mt-1">Start the conversation.</p></div>}</div><form onSubmit={handleSend} className="border-t border-slate-200 p-4"><div className="flex gap-2"><input value={input} onChange={(event) => { setInput(event.target.value); setSendError(''); }} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /><button type="submit" disabled={sending} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{sending ? 'Sending...' : 'Send'}</button></div>{sendError && <p className="mt-2 text-xs font-semibold text-red-600">{sendError}</p>}</form></> : <div className="flex min-h-[560px] items-center justify-center p-8 text-center text-sm text-slate-500">Select a candidate conversation.</div>}</section></div></div></ViewFrame>;
}

export function EmployerNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getNotifications();
      setNotifications(data?.data || data?.notifications || []);
      setUnreadCount(Number(data?.unreadCount || 0));
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch {
      setError('Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 30000);
    return () => window.clearInterval(intervalId);
  }, []);

  const markRead = async (item) => {
    if (item.isRead) return;
    setBusyId(item.id);
    setNotifications((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await markNotificationAsRead(item.id);
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch {
      await loadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    setBusyId('all');
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item) => {
    setBusyId(item.id);
    try {
      await deleteNotification(item.id);
      setNotifications((current) => current.filter((notification) => notification.id !== item.id));
      if (!item.isRead) setUnreadCount((current) => Math.max(0, current - 1));
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } finally {
      setBusyId(null);
    }
  };

  const removeRead = async () => {
    if (!notifications.some((item) => item.isRead)) return;
    setBusyId('read');
    try {
      await deleteReadNotifications();
      setNotifications((current) => current.filter((item) => !item.isRead));
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch {
      await loadNotifications();
    } finally {
      setBusyId(null);
    }
  };

  const openNotification = async (item) => {
    await markRead(item);
    const destinations = { APPLICATION: 'applications', SHORTLIST: 'applications', INTERVIEW: 'hired', MESSAGE: 'messages', AI_MATCH: 'matching', JOB_STATUS: 'jobs', VERIFICATION: 'profile', INVITATION: 'talent-pool', HIRING: 'hired', SYSTEM: 'overview' };
    navigate(`/employer/dashboard?view=${destinations[item.referenceType] || 'overview'}`);
  };

  const visibleNotifications = notifications.filter((item) => {
    if (filter === 'UNREAD') return !item.isRead;
    if (filter === 'APPLICATIONS') return ['APPLICATION', 'SHORTLIST', 'INVITATION'].includes(item.type);
    if (filter === 'INTERVIEWS') return item.type === 'INTERVIEW';
    if (filter === 'MESSAGES') return item.type === 'MESSAGE';
    if (filter === 'AI') return item.type === 'AI_MATCH';
    if (filter === 'SYSTEM') return ['JOB_STATUS', 'VERIFICATION', 'HIRING', 'SYSTEM'].includes(item.type);
    return true;
  });

  const readCount = notifications.filter((item) => item.isRead).length;

  return (
    <ViewFrame icon={Bell} title="Notifications" subtitle="Stay current with candidates, jobs, and team activity.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            ['ALL', 'All'],
            ['UNREAD', `Unread (${unreadCount})`],
            ['APPLICATIONS', 'Applications'],
            ['INTERVIEWS', 'Interviews'],
            ['MESSAGES', 'Messages'],
            ['AI', 'AI Matching'],
            ['SYSTEM', 'System'],
          ].map(([value, label]) => (
            <button type="button" key={value} onClick={() => setFilter(value)} className={`rounded-xl px-3 py-2 text-xs font-bold ${filter === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-blue-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button type="button" disabled={!unreadCount || busyId === 'all'} onClick={markAllRead} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 disabled:opacity-40">
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
          <button type="button" disabled={!readCount || busyId === 'read'} onClick={removeRead} className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 disabled:opacity-40" title="Delete all read notifications">
            <Trash2 className="h-4 w-4" /> Delete read ({readCount})
          </button>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading notifications...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center"><p className="text-sm font-bold text-red-700">{error}</p><button type="button" onClick={loadNotifications} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-4 w-4" /> Retry</button></div>
      ) : visibleNotifications.length ? (
        visibleNotifications.map((item) => (
          <article key={item.id} onClick={() => openNotification(item)} className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-5 ${item.isRead ? 'border-slate-200 bg-white' : 'border-blue-200 bg-blue-50/50'}`}>
            <Bell className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-black ${item.isRead ? 'text-slate-800' : 'text-slate-950'}`}>{item.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{item.type}</span>
                {!item.isRead && <span className="h-2 w-2 rounded-full bg-blue-600" />}
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.message}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!item.isRead && <button type="button" disabled={busyId === item.id} onClick={(event) => { event.stopPropagation(); markRead(item); }} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700"><Check className="h-4 w-4" /> Read</button>}
              <button type="button" disabled={busyId === item.id} onClick={(event) => { event.stopPropagation(); remove(item); }} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete notification"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{filter === 'UNREAD' ? "You're all caught up." : 'No notifications yet.'}</p>
      )}
    </ViewFrame>
  );
}

export function EmployerSettings() {
  const [settings, setSettings] = useState(() => read('employerSettings', { emailAlerts: true, matchingAlerts: true, weeklyDigest: false }));

  useEffect(() => {
    api.get('/employer/settings')
      .then(({ data }) => {
        const next = data?.settings || {};
        setSettings({
          emailAlerts: next.emailAlerts ?? true,
          matchingAlerts: next.matchingAlerts ?? true,
          weeklyDigest: next.weeklyDigest ?? false,
          notificationEmail: next.notificationEmail || '',
        });
      })
      .catch(() => setSettings(read('employerSettings', { emailAlerts: true, matchingAlerts: true, weeklyDigest: false })));
  }, []);

  const save = async () => {
    localStorage.setItem('employerSettings', JSON.stringify(settings));
    try {
      await api.put('/employer/settings', settings);
    } catch (requestError) {
      console.warn('Unable to save employer settings:', requestError);
    }
  };

  return <ViewFrame icon={Settings} title="Settings" subtitle="Control workspace alerts and matching preferences."><div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">{[['emailAlerts', 'Email alerts', 'Receive important recruitment updates by email.'], ['matchingAlerts', 'AI matching alerts', 'Get notified when new registered talent matches an open role.'], ['weeklyDigest', 'Weekly digest', 'Receive a weekly summary of workspace activity.']].map(([key, label, description]) => <label key={key} className="flex items-center justify-between gap-4 p-5"><span><span className="block font-black text-slate-900">{label}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span><input type="checkbox" checked={Boolean(settings[key])} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.checked }))} className="h-5 w-5 accent-blue-600" /></label>)}</div><button onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white"><Save className="h-4 w-4" /> Save Settings</button></ViewFrame>;
}

function ViewFrame({ icon: Icon, title, subtitle, children }) { return <section className="space-y-5"><div className="flex items-start gap-3"><Icon className="mt-1 h-7 w-7 text-blue-600" /><div><h2 className="text-2xl font-black text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div></div><div className="space-y-3">{children}</div></section>; }
