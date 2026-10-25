import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, BriefcaseBusiness, Building2, CalendarDays, Camera, CheckCheck, CircleCheck, FileText, Globe2, Inbox, Link2, Loader2, Mail, MapPin, MessageCircle, MessageSquareText, RefreshCw, Save, Send, Settings, ShieldCheck, Sparkles, Tag, Target, Trash2, UserPlus, Users, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { deleteNotification, deleteReadNotifications, getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../services/notificationService';
import { deleteConversation, getConversation, getConversations, getUnreadMessageCount, markConversationAsRead, sendMessage } from '../../services/messageService';

export function EmployerMessages() {
  const [searchParams] = useSearchParams();
  const requestedUser = searchParams.get('user');
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
  const openedDeepLinkUserRef = useRef('');

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

  const openConversation = useCallback(async (conversationId) => {
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
  }, [conversations]);

  useEffect(() => {
    if (!requestedUser) {
      openedDeepLinkUserRef.current = '';
      return;
    }
    if (openedDeepLinkUserRef.current === requestedUser) return;
    const conversation = conversations.find((item) =>
      String(item.candidateId) === requestedUser,
    );
    if (!conversation) return;
    openedDeepLinkUserRef.current = requestedUser;
    openConversation(conversation.conversationId);
  }, [conversations, openConversation, requestedUser]);

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

  return (
    <section className="space-y-5">
      <div>
        <div className="flex items-center gap-2.5">
          <MessageSquareText className="w-7 h-7 text-sky-600 stroke-[2.2]" />
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Messages
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">Communicate with candidates connected to your recruitment workflow.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex min-h-[560px] flex-row">
          <aside className={`${mobileChat ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-b border-slate-200 md:w-80 md:border-b-0 md:border-r`}>
            <div className="border-b border-slate-100 p-4">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search candidates..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>
            ) : error && !conversations.length ? (
              <div className="p-6 text-center"><p className="text-sm font-bold text-red-600">{error}</p><button type="button" onClick={loadConversations} className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white">Retry</button></div>
            ) : filteredConversations.length ? (
              <div className="divide-y divide-slate-200">
                {filteredConversations.map((item) => (
                  <div key={item.conversationId} className={`group flex items-center gap-3 border-l-4 p-4 transition ${String(selectedId) === String(item.conversationId) ? 'border-l-sky-500 bg-sky-50/50' : 'border-l-transparent hover:bg-slate-50'}`}>
                    <button type="button" onClick={() => openConversation(item.conversationId)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">{(item.candidateName || 'C').charAt(0).toUpperCase()}</span>
                      <span className="truncate text-sm font-bold text-slate-900">{item.candidateName || 'Candidate'}</span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] text-slate-400">{formatTime(item.lastMessageTime)}</span>
                      <button type="button" onClick={() => removeConversation(item)} className="text-[10px] font-bold text-slate-400 transition hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="p-8 text-center text-sm text-slate-500">No conversations yet.</p>}
          </aside>
          <section className={`${mobileChat ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`}>
            {opening ? (
              <div className="flex min-h-[560px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Opening conversation...</div>
            ) : activeConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 p-4">
                  <button type="button" onClick={() => setMobileChat(false)} className="text-sm font-bold text-blue-600 md:hidden">Back</button>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">{(activeConversation.conversation?.candidateName || 'C').charAt(0)}</div>
                  <div className="min-w-0"><h3 className="truncate font-black text-slate-900">{activeConversation.conversation?.candidateName || 'Candidate'}</h3><p className="truncate text-xs text-slate-500">{activeConversation.conversation?.jobTitle || 'Application'} - {activeConversation.conversation?.candidateStatus || 'Active'}</p></div>
                </div>
                <div className="flex min-h-[390px] flex-1 flex-col gap-3 overflow-y-auto bg-slate-50 p-4">
                  {messages.length ? messages.map((message) => {
                    const isOutgoing = String(message.senderId) === String(activeConversation.conversation?.employerId);
                    return <div key={message.id} className={`${isOutgoing ? 'self-end border border-sky-200 bg-sky-100 text-slate-900 shadow-xs' : 'self-start border border-slate-200 bg-white text-slate-900 shadow-sm'} max-w-[80%] rounded-2xl px-4 py-3 text-sm`}><p className="whitespace-pre-wrap break-words font-normal leading-relaxed">{message.message}</p><span className={`${isOutgoing ? 'text-sky-700/75' : 'text-slate-400'} mt-1 block text-right font-mono text-[10px]`}>{formatTime(message.createdAt)}</span></div>;
                  }) : <div className="m-auto text-center text-sm text-slate-500"><p>No messages yet.</p><p className="mt-1">Start the conversation.</p></div>}
                </div>
                <form onSubmit={handleSend} className="border-t border-slate-200 p-4">
                  <div className="flex gap-2"><input value={input} onChange={(event) => { setInput(event.target.value); setSendError(''); }} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" /><button type="submit" disabled={sending} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{sending ? 'Sending...' : 'Send'}</button></div>
                  {sendError && <p className="mt-2 text-xs font-semibold text-red-600">{sendError}</p>}
                </form>
              </>
            ) : <div className="flex min-h-[560px] items-center justify-center p-8 text-center text-sm text-slate-500">Select a candidate conversation.</div>}
          </section>
        </div>
      </div>
    </section>
  );
}

const getNotificationType = (item) => String(item.type || item.referenceType || '')
  .trim()
  .toLowerCase()
  .replace(/[\s-]+/g, '_');

const notificationMatchesFilter = (item, filter) => {
  const type = getNotificationType(item);
  if (filter === 'UNREAD') return item.isRead !== true && item.isRead !== 1;
  if (filter === 'APPLICATIONS') return ['application', 'new_application', 'shortlist', 'invitation'].includes(type);
  if (filter === 'INTERVIEWS') return type === 'interview';
  if (filter === 'MESSAGES') return type === 'message';
  if (filter === 'AI') return ['ai_match', 'ai_matching'].includes(type);
  if (filter === 'SYSTEM') return ['system', 'job_rejected', 'job', 'job_status', 'verification', 'hiring'].includes(type);
  return true;
};

export function EmployerNotifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [unreadCount, setUnreadCount] = useState(0);
  const [markedAllReadCount, setMarkedAllReadCount] = useState(0);
  const [markedAllReadIds, setMarkedAllReadIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const notificationIsRead = (item) => item.isRead === true || item.isRead === 1;

  const loadNotifications = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const { data } = await getNotifications();
      const items = data?.data || data?.notifications || [];
      setNotifications(items.map((item) => ({
        ...item,
        isRead: notificationIsRead(item),
      })));
      setUnreadCount(Number(data?.unreadCount || 0));
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch (requestError) {
      console.error('Unable to load notifications:', requestError);
      setError(requestError.response?.data?.message || 'Unable to load notifications.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
    const intervalId = window.setInterval(loadNotifications, 15000);
    return () => window.clearInterval(intervalId);
  }, []);

  const markRead = async (item) => {
    if (notificationIsRead(item)) return true;
    setBusyId(item.id);
    try {
      await markNotificationAsRead(item.id);
      setNotifications((current) => current.map((notification) =>
        String(notification.id) === String(item.id) ? { ...notification, isRead: true } : notification,
      ));
      setUnreadCount((current) => Math.max(0, current - 1));
      window.dispatchEvent(new Event('employer-notifications:updated'));
      return true;
    } catch (requestError) {
      console.error('Unable to mark notification as read:', requestError);
      await loadNotifications();
      setError(requestError.response?.data?.message || 'Unable to mark notification as read.');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const markAllRead = async () => {
    const countMarked = unreadCount || notifications.filter((item) => !notificationIsRead(item)).length;
    const unreadIds = notifications.filter((item) => !notificationIsRead(item)).map((item) => String(item.id));
    setBusyId('all');
    setError('');
    try {
      await markAllNotificationsAsRead();
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      if (filter === 'UNREAD') {
        setMarkedAllReadIds(unreadIds);
        setMarkedAllReadCount(countMarked);
      }
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch (requestError) {
      console.error('Unable to mark all notifications as read:', requestError);
      setError(requestError.response?.data?.message || 'Unable to mark all notifications as read.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item) => {
    setBusyId(item.id);
    try {
      await deleteNotification(item.id);
      setNotifications((current) => current.filter((notification) => String(notification.id) !== String(item.id)));
      if (!notificationIsRead(item)) setUnreadCount((current) => Math.max(0, current - 1));
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch (requestError) {
      console.error('Unable to delete notification:', requestError);
      setError(requestError.response?.data?.message || 'Unable to delete notification.');
    } finally {
      setBusyId(null);
    }
  };

  const removeRead = async () => {
    if (!notifications.some(notificationIsRead)) return;
    setBusyId('read');
    try {
      await deleteReadNotifications();
      setNotifications((current) => current.filter((item) => !notificationIsRead(item)));
      setMarkedAllReadIds([]);
      setMarkedAllReadCount(0);
      window.dispatchEvent(new Event('employer-notifications:updated'));
    } catch (requestError) {
      console.error('Unable to delete read notifications:', requestError);
      await loadNotifications();
      setError(requestError.response?.data?.message || 'Unable to delete read notifications.');
    } finally {
      setBusyId(null);
    }
  };

  const openNotification = async (item) => {
    if (!await markRead(item)) return;

    const type = getNotificationType(item);
    const title = String(item.title || '').toLowerCase();
    const targetId = item.targetId || item.jobId || item.applicationId || item.referenceId;
    if (['job_rejected', 'job'].includes(type) || title.includes('job listing needs changes')) {
      navigate(`/employer/jobs?edit=${encodeURIComponent(String(targetId || 'security'))}`);
    } else if (type === 'message' || title.includes('new message')) {
      const senderId = item.senderId || item.relatedUserId;
      navigate(senderId
        ? `/employer/messages?user=${encodeURIComponent(String(senderId))}`
        : '/employer/messages');
    } else if (type === 'application' || title.includes('new application')) {
      const applicationId = item.applicationId || item.targetId || item.referenceId;
      navigate(applicationId
        ? `/employer/applications?id=${encodeURIComponent(String(applicationId))}`
        : '/employer/applications');
    } else if (type === 'interview') {
      navigate('/employer/dashboard?view=interviews');
    } else if (type === 'ai_match' || type === 'ai match') {
      navigate('/employer/ai-matching');
    } else {
      const destinations = {
        NEW_APPLICATION: 'applications',
        SHORTLIST: 'applications',
        JOB_STATUS: 'jobs',
        VERIFICATION: 'profile',
        INVITATION: 'talent-pool',
        HIRING: 'hired',
        SYSTEM: 'overview',
      };
      navigate(`/employer/dashboard?view=${destinations[item.referenceType] || 'overview'}`);
    }
  };

  const visibleNotifications = notifications.filter((item) =>
    filter === 'UNREAD' && markedAllReadCount > 0
      ? markedAllReadIds.includes(String(item.id))
      : notificationMatchesFilter(item, filter),
  );

  const readCount = notifications.filter(notificationIsRead).length;
  const filterTabs = [
    { value: 'ALL', label: 'All', icon: Inbox },
    { value: 'UNREAD', label: 'Unread', icon: Bell },
    { value: 'APPLICATIONS', label: 'Applications', icon: BriefcaseBusiness },
    { value: 'INTERVIEWS', label: 'Interviews', icon: CalendarDays },
    { value: 'MESSAGES', label: 'Messages', icon: MessageCircle },
    { value: 'AI', label: 'AI Matches', icon: Sparkles },
    { value: 'SYSTEM', label: 'System', icon: Settings },
  ].map((tab) => ({
    ...tab,
    count: notifications.filter((item) => notificationMatchesFilter(item, tab.value)).length,
  }));

  const changeFilter = (value) => {
    setFilter(value);
    setMarkedAllReadCount(0);
    setMarkedAllReadIds([]);
  };

  const handleCardKeyDown = (event, item) => {
    if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    openNotification(item);
  };

  return (
    <ViewFrame icon={Bell} title="Notifications" subtitle="Stay current with candidates, jobs, and team activity.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map(({ value, label, icon: Icon, count }) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => changeFilter(value)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs transition-all duration-150 ${
                filter === value
                  ? 'bg-sky-500 font-bold text-white shadow-sm shadow-sky-500/30'
                  : 'border border-slate-200/90 bg-white font-medium text-slate-600 shadow-2xs hover:border-slate-300 hover:bg-slate-50/80 hover:text-slate-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.2]" />
              {label}
              {count > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  filter === value
                    ? 'bg-white/25 text-white'
                    : 'border border-slate-200/60 bg-slate-100 text-slate-700'
                }`}>
                  {count}
                </span>
              )}
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
      {filter === 'UNREAD' && markedAllReadCount > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">All caught up! No unread notifications.</p>
          <button type="button" onClick={() => changeFilter('ALL')} className="rounded-lg px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100">
            View all notifications
          </button>
        </div>
      )}
      {error && !loading && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm font-bold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading notifications...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center"><p className="text-sm font-bold text-red-700">{error}</p><button type="button" onClick={loadNotifications} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"><RefreshCw className="h-4 w-4" /> Retry</button></div>
      ) : visibleNotifications.length ? (
        visibleNotifications.map((item) => (
          <article
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={`Open notification: ${item.title}`}
            onClick={() => openNotification(item)}
            onKeyDown={(event) => handleCardKeyDown(event, item)}
            className={`group flex cursor-pointer items-start gap-4 rounded-2xl border p-5 transition-all duration-200 hover:shadow-md hover:border-indigo-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/80 ${notificationIsRead(item) ? 'border-slate-200 bg-white' : 'border-blue-300 bg-blue-50/60'}`}
          >
            <Bell className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-black ${notificationIsRead(item) ? 'text-slate-800' : 'text-slate-950'}`}>{item.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{item.type}</span>
                {!notificationIsRead(item) && <span className="h-2.5 w-2.5 rounded-full bg-sky-500 ring-4 ring-sky-100 animate-pulse" aria-label="Unread" />}
              </div>
              <p className="mt-1 text-sm text-slate-600">{item.message}</p>
              <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <span className="pointer-events-none flex items-center gap-1 rounded-xl border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-100">
                View &rarr;
              </span>
              <button type="button" disabled={busyId === item.id} onClick={(event) => { event.stopPropagation(); remove(item); }} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-rose-500" aria-label="Delete notification"><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <Inbox className="mx-auto h-9 w-9 text-slate-300" />
          <h3 className="mt-3 text-sm font-bold text-slate-700">
            {filter === 'UNREAD' ? "You're all caught up." : `No ${filterTabs.find((tab) => tab.value === filter)?.label.toLowerCase() || ''} notifications`}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {filter === 'UNREAD' ? 'New unread updates will appear here.' : 'Notifications in this category will appear here when available.'}
          </p>
        </div>
      )}
    </ViewFrame>
  );
}

const defaultEmployerSettings = {
  emailAlerts: true,
  matchingAlerts: true,
  weeklyDigest: false,
  company: {
    companyName: '', legalName: '', tradeBrandName: '', companyType: 'Startup', tinNumber: '',
    registrationNumber: '', industry: '', location: '', website: '', bio: '', logo: '',
    verificationStatus: 'pending', tradeLicenseUrl: '', tradeLicenseName: '',
  },
  screening: { minimumMatchThreshold: 80, confirmationEmail: true, regretEmail: false, recruiterAlert: true },
  telegram: { channel: '', broadcastApprovedJobs: false, includeSalary: true, includeApplyLink: true, interviewAlerts: true },
  team: { activeMembers: [], pendingInvites: [], seatLimit: 5 },
};

const employerSettingsTabs = [
  ['company', 'Company & Verification', Building2],
  ['team', 'Hiring Team & Recruiter Seats', Users],
  ['screening', 'ATS Screening & Auto-Responses', Target],
  ['telegram', 'Telegram Channel & Broadcast', Send],
];

const employerSettingsFieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-4 focus:ring-sky-100';
const employerSettingsLabelClass = 'block text-xs font-bold text-slate-700';

export function EmployerSettings() {
  const { user, token, setSession } = useAuth();
  const [settings, setSettings] = useState(defaultEmployerSettings);
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState(null);
  const [inviteDraft, setInviteDraft] = useState({ email: '', role: 'Recruiter' });
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.allSettled([api.get('/employer/settings'), api.get('/telegram/status')])
      .then(([settingsResult, telegramResult]) => {
        if (!active) return;
        if (settingsResult.status === 'fulfilled') {
          const remote = settingsResult.value.data?.settings || {};
          setSettings({
            ...defaultEmployerSettings,
            ...remote,
            company: { ...defaultEmployerSettings.company, ...remote.company },
            screening: { ...defaultEmployerSettings.screening, ...remote.screening },
            telegram: { ...defaultEmployerSettings.telegram, ...remote.telegram },
            team: { ...defaultEmployerSettings.team, ...remote.team },
          });
          setSettingsLoaded(true);
        } else {
          console.error('Unable to load employer workspace settings:', settingsResult.reason);
          setError(settingsResult.reason.response?.data?.message || 'Unable to load employer settings.');
        }
        if (telegramResult.status === 'fulfilled') {
          setTelegramStatus(telegramResult.value.data || {});
        } else {
          console.error('Unable to load recruiter Telegram status:', telegramResult.reason);
          setError((current) => current || 'Unable to load recruiter Telegram status.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!savedToast) return undefined;
    const timeoutId = window.setTimeout(() => setSavedToast(false), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [savedToast]);

  const updateCompany = (key, value) => {
    setSettings((current) => ({ ...current, company: { ...current.company, [key]: value } }));
    setSavedToast(false);
    setError('');
  };

  const updateSetting = (section, key, value) => {
    setSettings((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setSavedToast(false);
    setError('');
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setError('Choose a PNG, JPG, or WebP logo no larger than 1 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);
    setUploadingLogo(true);
    setError('');
    try {
      const { data } = await api.post('/employer/profile/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!data?.logoUrl) throw new Error('The server did not return the saved logo URL.');
      updateCompany('logo', data.logoUrl);
      syncEmployerIdentity({ ...settings.company, logo: data.logoUrl });
    } catch (uploadError) {
      console.error('Unable to upload company logo:', uploadError);
      setError(uploadError.response?.data?.message || uploadError.message || 'Unable to upload company logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const syncEmployerIdentity = (company) => {
    const nextCompanyProfile = {
      company_name: company.companyName,
      industry: company.industry,
      location: company.location,
      website: company.website,
      description: company.bio,
      logo_url: company.logo,
    };
    const updatedUser = {
      ...user,
      company_name: company.companyName,
      logo_url: company.logo,
      companyInfo: { ...(user?.companyInfo || {}), ...nextCompanyProfile },
    };
    setSession({ token, user: updatedUser });
    window.dispatchEvent(new CustomEvent('employer:company-profile-updated', { detail: nextCompanyProfile }));
  };

  const save = async (settingsToSave = settings) => {
    setSaving(true);
    setError('');
    setSavedToast(false);
    try {
      const { data } = await api.put('/employer/settings', settingsToSave);
      const savedSettings = data?.settings;
      if (!savedSettings) throw new Error('The server did not return the saved settings.');
      setSettings((current) => ({
        ...current,
        ...savedSettings,
        company: { ...current.company, ...savedSettings.company },
        screening: { ...current.screening, ...savedSettings.screening },
        telegram: { ...current.telegram, ...savedSettings.telegram },
        team: { ...current.team, ...savedSettings.team },
      }));
      syncEmployerIdentity({
        ...settingsToSave.company,
        ...savedSettings.company,
        logo: savedSettings.company?.logo || settingsToSave.company.logo,
      });

      if (telegramStatus?.configured && telegramStatus?.personalChatLinked) {
        await api.put('/telegram/preferences', {
          alertsActive: telegramStatus.alertsActive,
          interview_reminders: settingsToSave.telegram.interviewAlerts,
        });
      }
      setSavedToast(true);
      return true;
    } catch (requestError) {
      console.error('Unable to save employer settings:', requestError);
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save employer settings.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const company = settings.company;
  const connectedToTelegram = Boolean(telegramStatus?.configured && telegramStatus?.personalChatLinked);
  const companyInitials = String(company.tradeBrandName || company.companyName || '').trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'CO';
  const verificationLabel = company.verificationStatus === 'verified'
    ? `Verified ${company.companyType || 'Company'}${company.tradeLicenseUrl ? ' - Trade License on File' : ''}`
    : company.verificationStatus === 'rejected'
      ? 'Verification rejected'
      : 'Verification pending';

  const inviteMember = async (event) => {
    event.preventDefault();
    const email = inviteDraft.email.trim().toLowerCase();
    const activeMembers = settings.team.activeMembers || [];
    const pendingInvites = settings.team.pendingInvites || [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid work email address.');
      return;
    }
    if (activeMembers.length + pendingInvites.length >= settings.team.seatLimit) {
      setError('All recruiter seats are in use.');
      return;
    }
    if ([...activeMembers, ...pendingInvites].some((member) => member.email.toLowerCase() === email)) {
      setError('This email already has a workspace seat or pending invitation.');
      return;
    }
    const nextSettings = {
      ...settings,
      team: {
        ...settings.team,
        pendingInvites: [...pendingInvites, { email, role: inviteDraft.role, status: 'pending' }],
      },
    };
    setSettings(nextSettings);
    setInviteModalOpen(false);
    setInviteDraft({ email: '', role: 'Recruiter' });
    await save(nextSettings);
  };

  const renderActiveTab = () => {
    if (activeTab === 'company') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out">
          <section className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="group relative h-20 w-20 shrink-0">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-xl font-black text-sky-700 shadow-sm transition-all duration-200 group-hover:border-sky-300 group-hover:shadow-md">
                  {company.logo ? <img src={company.logo} alt={`${company.tradeBrandName || 'Company'} logo`} className="h-full w-full object-cover" /> : companyInitials}
                </div>
                <label className="absolute -bottom-2 -right-2 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border-2 border-white bg-sky-500 text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-sky-600 active:scale-95" title={uploadingLogo ? 'Uploading logo' : 'Change company logo'}>
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoUpload} disabled={uploadingLogo} className="sr-only" aria-label="Upload company logo" />
                </label>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">Official company profile</p>
                <h3 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{company.tradeBrandName || company.companyName || 'Your company'}</h3>
                <p className="mt-1 text-xs text-slate-500">PNG, JPG or WebP · max 1 MB</p>
              </div>
            </div>
            <div className={`inline-flex w-fit shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-3 text-xs font-bold shadow-sm ${company.verificationStatus === 'verified' && company.tradeLicenseUrl ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              <span className={`relative flex h-2.5 w-2.5 shrink-0 ${company.verificationStatus === 'verified' && company.tradeLicenseUrl ? '' : 'animate-pulse'}`}>
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-50 ${company.verificationStatus === 'verified' && company.tradeLicenseUrl ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${company.verificationStatus === 'verified' && company.tradeLicenseUrl ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              <span>{company.verificationStatus === 'verified' && company.tradeLicenseUrl ? verificationLabel : 'Verification in progress - Under MOTI Review'}</span>
            </div>
          </section>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-sky-600" />Company legal name</span>
              <input value={company.legalName} onChange={(event) => updateCompany('legalName', event.target.value)} placeholder="Registered legal entity name" className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`} />
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><Tag className="h-4 w-4 text-sky-600" />Trade brand name</span>
              <input value={company.tradeBrandName} onChange={(event) => {
                const value = event.target.value;
                setSettings((current) => ({ ...current, company: { ...current.company, tradeBrandName: value, companyName: value } }));
                setSavedToast(false);
                setError('');
              }} placeholder="e.g. Safaricom Ethiopia" className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`} />
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-sky-600" />Company type</span>
              <select value={company.companyType} onChange={(event) => updateCompany('companyType', event.target.value)} className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`}>
                {['PLC', 'Share Company (S.C.)', 'Foreign Entity', 'NGO', 'Startup'].map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" />Business registration number</span>
              <input value={company.registrationNumber} onChange={(event) => updateCompany('registrationNumber', event.target.value)} placeholder="Registration number" className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`} />
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sky-600" />TIN number</span>
              <input value={company.tinNumber} onChange={(event) => updateCompany('tinNumber', event.target.value)} placeholder="e.g. 0048291042" maxLength={10} inputMode="numeric" className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`} />
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><Building2 className="h-4 w-4 text-sky-600" />Industry / sector</span>
              <select value={company.industry} onChange={(event) => updateCompany('industry', event.target.value)} className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`}>
                <option value="">Select a sector</option>
                {['Software & Tech', 'Banking / Fintech', 'Telecom', 'Healthcare', 'Education', 'Manufacturing', 'Other'].map((industry) => <option key={industry}>{industry}</option>)}
              </select>
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sky-600" />Headquarters location</span>
              <input value={company.location} onChange={(event) => updateCompany('location', event.target.value)} placeholder="Addis Ababa, Bole Sub-city" className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`} />
            </label>
            <label className={employerSettingsLabelClass}><span className="flex items-center gap-2"><Globe2 className="h-4 w-4 text-sky-600" />Company website</span>
              <input type="url" value={company.website} onChange={(event) => updateCompany('website', event.target.value)} placeholder="https://company.com" className={`${employerSettingsFieldClass} mt-2 px-4 py-3 h-auto transition-all duration-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40`} />
            </label>
            <label className={`${employerSettingsLabelClass} sm:col-span-2`}><span className="flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" />Company bio</span>
              <textarea value={company.bio} onChange={(event) => updateCompany('bio', event.target.value)} rows={4} maxLength={1000} placeholder="A short introduction for prospective candidates…" className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/40" />
            </label>
          </div>
        </div>
      );
    }

    if (activeTab === 'team') {
      const activeMembers = settings.team.activeMembers || [];
      const pendingInvites = settings.team.pendingInvites || [];
      const seatLimit = settings.team.seatLimit || 5;
      const usedSeats = activeMembers.length + pendingInvites.length;

      return (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <div>
              <p className="text-sm font-bold text-slate-900">{usedSeats} of {seatLimit} Recruiter Seats Active</p>
              <div className="mt-2 h-2 w-56 max-w-full overflow-hidden rounded-full bg-sky-100"><span className="block h-full rounded-full bg-sky-500 transition-all" style={{ width: `${Math.min(100, (usedSeats / seatLimit) * 100)}%` }} /></div>
            </div>
            <button type="button" onClick={() => setInviteModalOpen(true)} disabled={usedSeats >= seatLimit} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"><UserPlus className="h-4 w-4" /> Invite New Team Member</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(90px,0.7fr)] gap-3 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500"><span>Name</span><span>Work email</span><span>Role</span></div>
            {activeMembers.map((member) => (
              <div key={member.email || member.name} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(90px,0.7fr)] items-center gap-3 border-t border-slate-100 px-4 py-3 text-xs">
                <span className="truncate font-bold text-slate-800">{member.name}</span><span className="truncate text-slate-600">{member.email}</span><span className="font-semibold text-sky-700">{member.role}</span>
              </div>
            ))}
            {pendingInvites.map((invite) => (
              <div key={invite.email} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(90px,0.7fr)] items-center gap-3 border-t border-slate-100 px-4 py-3 text-xs">
                <span className="truncate font-semibold text-slate-700">Pending invite</span><span className="truncate text-slate-600">{invite.email}</span><span className="text-slate-500">{invite.role}</span>
              </div>
            ))}
          </div>
          {inviteModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setInviteModalOpen(false); }}>
              <form onSubmit={inviteMember} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
                <div className="mb-5 flex items-center justify-between"><div><h4 className="text-lg font-black text-slate-900">Invite team member</h4><p className="mt-1 text-xs text-slate-500">Add a pending invitation to your workspace.</p></div><button type="button" onClick={() => setInviteModalOpen(false)} aria-label="Close invite dialog" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
                <label className={employerSettingsLabelClass}>Work email<input type="email" required value={inviteDraft.email} onChange={(event) => setInviteDraft((current) => ({ ...current, email: event.target.value }))} placeholder="name@company.com" className={`${employerSettingsFieldClass} mt-1.5`} /></label>
                <label className={`${employerSettingsLabelClass} mt-4 block`}>Role<select value={inviteDraft.role} onChange={(event) => setInviteDraft((current) => ({ ...current, role: event.target.value }))} className={`${employerSettingsFieldClass} mt-1.5`}>{['Admin', 'Recruiter', 'Reviewer'].map((role) => <option key={role}>{role}</option>)}</select></label>
                <button type="submit" className="mt-5 w-full rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/25 hover:bg-sky-600">Save Invitation</button>
              </form>
            </div>
          )}
        </div>
      );
    }

    if (activeTab === 'screening') {
      return (
        <div className="space-y-5">
          <label className={`${employerSettingsLabelClass} max-w-xs`}>Minimum ATS match threshold
            <div className="mt-2 flex items-center gap-4"><input type="range" min="60" max="95" step="1" value={settings.screening.minimumMatchThreshold} onChange={(event) => updateSetting('screening', 'minimumMatchThreshold', Number(event.target.value))} className="w-full accent-sky-500" /><span className="min-w-12 rounded-lg bg-sky-50 px-2.5 py-1.5 text-center text-sm font-black text-sky-700">{settings.screening.minimumMatchThreshold}%</span></div>
          </label>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            <EmployerToggle checked={settings.screening.confirmationEmail} onChange={(value) => updateSetting('screening', 'confirmationEmail', value)} icon={Mail} label="Send Immediate Application Receipt Confirmation" description="Send an application receipt confirmation." />
            <EmployerToggle checked={settings.screening.regretEmail} onChange={(value) => updateSetting('screening', 'regretEmail', value)} icon={Mail} label="Automated Polite Regret Email" description="Send a respectful notification after review when ATS score is below 50%." />
            <EmployerToggle checked={settings.screening.recruiterAlert} onChange={(value) => updateSetting('screening', 'recruiterAlert', value)} icon={Bell} label="Instant Recruiter Alert" description="Notify HR when a candidate matching at 90% or higher applies." />
          </div>
        </div>
      );
    }

    if (activeTab === 'telegram') {
      return (
        <div className="space-y-5">
          <label className={employerSettingsLabelClass}>Official Telegram talent channel
            <select value={settings.telegram.channel} onChange={(event) => updateSetting('telegram', 'channel', event.target.value)} className={`${employerSettingsFieldClass} mt-1.5 max-w-sm`}>
              <option value="">Select a channel</option>
              {['@yabsira_tech_jobs', '@afriwork_jobs'].map((channel) => <option key={channel}>{channel}</option>)}
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-sky-100 p-2.5 text-sky-600"><Send className="h-4 w-4" /></span>
              <div><p className="text-sm font-bold text-slate-900">Recruiter Telegram</p><p className="mt-0.5 text-xs text-slate-500">{connectedToTelegram ? `Connected as @${telegramStatus.telegramUsername || telegramStatus.botUsername || 'Telegram'}` : 'Connect an account to receive recruiter alerts.'}</p></div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${connectedToTelegram ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{connectedToTelegram ? 'Connected' : 'Not connected'}</span>
          </div>
          {!connectedToTelegram && <button type="button" onClick={async () => {
            const telegramWindow = window.open('about:blank', '_blank');
            try {
              const { data } = await api.post('/telegram/link/deep-link');
              if (!data?.url) throw new Error('Telegram did not return a connection link.');
              if (telegramWindow) telegramWindow.location = data.url;
              else window.location.assign(data.url);
            } catch (linkError) {
              telegramWindow?.close();
              setError(linkError.response?.data?.message || linkError.message || 'Unable to open Telegram connection.');
            }
          }} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-bold text-sky-700 transition hover:bg-sky-100"><Link2 className="h-4 w-4" /> Connect Telegram</button>}
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
            <EmployerToggle checked={settings.telegram.broadcastApprovedJobs} onChange={(value) => updateSetting('telegram', 'broadcastApprovedJobs', value)} icon={BriefcaseBusiness} label="Broadcast approved jobs to the selected talent channel" description="Publish approved job posts to the channel selected above." />
            <EmployerToggle checked={settings.telegram.includeSalary} onChange={(value) => updateSetting('telegram', 'includeSalary', value)} icon={BriefcaseBusiness} label="Include salary range on broadcast posts" description="Show compensation details when provided in the job listing." />
            <EmployerToggle checked={settings.telegram.includeApplyLink} onChange={(value) => updateSetting('telegram', 'includeApplyLink', value)} icon={Link2} label="Include direct 1-click apply bot link" description="Add a direct application link to channel posts." />
            <EmployerToggle checked={settings.telegram.interviewAlerts} onChange={(value) => updateSetting('telegram', 'interviewAlerts', value)} icon={Bell} label="Recruiter DM bot alerts for interview acceptances" description="Receive interview acceptance alerts through the recruiter bot." />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
          <EmployerToggle checked={settings.emailAlerts} onChange={(value) => setSettings((current) => ({ ...current, emailAlerts: value }))} icon={Mail} label="Email alerts" description="Receive important recruitment updates by email." />
          <EmployerToggle checked={settings.matchingAlerts} onChange={(value) => setSettings((current) => ({ ...current, matchingAlerts: value }))} icon={Sparkles} label="AI matching alerts" description="Get notified when new registered talent matches an open role." />
          <EmployerToggle checked={settings.weeklyDigest} onChange={(value) => setSettings((current) => ({ ...current, weeklyDigest: value }))} icon={CalendarDays} label="Weekly digest" description="Receive a weekly summary of workspace activity." />
        </div>
      </div>
    );
  };

  return (
    <ViewFrame icon={Settings} title="Workspace control center" subtitle="Manage company presence, screening, and recruiter notifications.">
      <div className="overflow-x-auto border-b border-slate-200/70 scrollbar-none">
        <div className="flex min-w-max items-center gap-5 sm:gap-8">
          {employerSettingsTabs.map(([id, label, Icon]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex shrink-0 items-center gap-2 border-b-2 border-transparent px-1 pb-3 pt-1 text-xs font-bold italic transition-colors sm:text-sm ${activeTab === id ? 'border-sky-500 text-sky-500' : 'text-slate-400 hover:text-sky-500'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>}
      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm font-medium text-slate-500"><Loader2 className="h-5 w-5 animate-spin text-sky-500" /> Loading workspace settings…</div>
      ) : (
        <>
          <section key={activeTab} className="settings-tab-panel animate-in fade-in slide-in-from-bottom-2 duration-300 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-7">
            <h3 className="mb-5 text-base font-black text-slate-900">{employerSettingsTabs.find(([id]) => id === activeTab)?.[1]}</h3>
            {renderActiveTab()}
          </section>
          <div className="flex justify-end">
            <button type="button" onClick={save} disabled={saving || uploadingLogo || loading || !settingsLoaded} className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-7 py-3 font-bold text-white shadow-md shadow-sky-500/25 transition hover:bg-sky-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
      {savedToast && <div role="status" className="settings-success-toast fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-700 shadow-lg"><CircleCheck className="h-5 w-5" /> Settings saved successfully</div>}
    </ViewFrame>
  );
}

function EmployerToggle({ checked, onChange, icon: Icon, label, description }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-5 p-5">
      <span className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <span><span className="block text-sm font-bold text-slate-800">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-sky-500 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-500" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function ViewFrame({ icon: Icon, title, subtitle, children }) { return <section className="space-y-5"><div className="flex items-start gap-3"><Icon className="mt-1 h-7 w-7 text-blue-600" /><div><h2 className="text-2xl font-black text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div></div><div className="space-y-3">{children}</div></section>; }
