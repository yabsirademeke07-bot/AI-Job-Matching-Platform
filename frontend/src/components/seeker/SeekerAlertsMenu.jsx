import { useEffect, useRef, useState } from 'react';
import { Bell, MessageSquareText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const notificationIsRead = (notification) => notification.is_read === true || notification.is_read === 1;

const relativeTime = (value) => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes === 0) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const badge = (count) => count > 0 ? (
  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
    {count > 99 ? '99+' : count}
  </span>
) : null;

export default function SeekerAlertsMenu() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const knownIdsRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let mounted = true;
    const loadAlerts = async () => {
      try {
        const [notificationResponse, messageResponse] = await Promise.all([
          api.get('/seeker/notifications'),
          api.get('/seeker/messages/unread-count'),
        ]);
        if (!mounted) return;

        const nextNotifications = notificationResponse.data?.notifications || [];
        const previousIds = knownIdsRef.current;
        const newUnread = previousIds
          ? nextNotifications.find((item) => !previousIds.has(String(item.id)) && !notificationIsRead(item))
          : null;
        knownIdsRef.current = new Set(nextNotifications.map((item) => String(item.id)));
        setNotifications(nextNotifications);
        setUnreadCount(Number(notificationResponse.data?.unreadCount ?? nextNotifications.filter((item) => !notificationIsRead(item)).length));
        setUnreadMessageCount(Number(messageResponse.data?.unreadCount || 0));
        if (newUnread) setToast(newUnread);
      } catch {
        // Keep the last successful counts visible while the API is unavailable.
      }
    };

    loadAlerts();
    const intervalId = window.setInterval(loadAlerts, 15000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const openNotification = async (notification) => {
    setNotifications((current) => current.map((item) => String(item.id) === String(notification.id) ? { ...item, is_read: true } : item));
    if (!notificationIsRead(notification)) setUnreadCount((current) => Math.max(0, current - 1));
    setIsOpen(false);
    try {
      await api.patch(`/seeker/notifications/${notification.id}/read`);
    } catch {
      // Navigation still works if the read receipt request temporarily fails.
    }

    const jobId = notification.related_job_id || notification.reference_id;
    const actionUrl = String(notification.action_url || '');
    const destination = actionUrl.startsWith('/jobs/') ? actionUrl : jobId ? `/jobs/${jobId}` : '/notifications';
    navigate(destination);
  };

  return (
    <div ref={rootRef} className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
      >
        <Bell className="h-5 w-5" />
        {badge(unreadCount)}
      </button>
      <button
        type="button"
        onClick={() => navigate('/chat')}
        aria-label={`Messages${unreadMessageCount ? `, ${unreadMessageCount} unread` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
      >
        <MessageSquareText className="h-5 w-5" />
        {badge(unreadMessageCount)}
      </button>

      {isOpen && (
        <section className="absolute right-0 top-full z-[80] mt-3 max-h-[min(70vh,30rem)] w-[min(24rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl" aria-label="Recent notifications">
          <div className="flex items-center justify-between border-b border-slate-100 px-2 pb-3">
            <h2 className="text-sm font-black text-slate-900">Notifications</h2>
            <span className="text-xs font-semibold text-slate-500">{unreadCount} unread</span>
          </div>
          {notifications.length ? (
            <div className="divide-y divide-slate-100">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`block min-h-0 w-full rounded-lg px-3 py-3 text-left transition hover:bg-blue-50 ${notificationIsRead(notification) ? '' : 'bg-blue-50/60'}`}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900">{notification.title}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-400">{relativeTime(notification.created_at)}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="px-3 py-8 text-center text-sm text-slate-500">You’re all caught up.</p>
          )}
        </section>
      )}

      {toast && (
        <div role="status" className="fixed right-4 top-24 z-[100] flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xl border border-blue-200 bg-white p-4 text-left shadow-xl">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <button type="button" onClick={() => openNotification(toast)} className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-bold text-slate-900">{toast.title}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{toast.message}</span>
          </button>
          <button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification" className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
      )}
    </div>
  );
}
