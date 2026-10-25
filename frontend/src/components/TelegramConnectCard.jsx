import { useEffect, useState } from 'react';
import { Link2, Send, Unplug } from 'lucide-react';
import api from '../services/api';

const initialStatus = {
  configured: false,
  botUsername: '',
  telegramChatId: '',
  telegramUsername: '',
  alertsActive: false,
  telegram_alerts_enabled: true,
  application_updates: true,
  interview_reminders: true,
  matching_job_recommendations: false,
  chat_messages: true,
  personalChatLinked: false,
};

const alertOptions = [
  ['application_updates', 'Application Status Alerts'],
  ['interview_reminders', 'Interview Invitations'],
  ['matching_job_recommendations', 'Recommended Job Matches'],
  ['chat_messages', 'Direct Messages'],
];

export default function TelegramConnectCard({ compact = false, banner = false }) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [message, setMessage] = useState('');

  const refreshStatus = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/telegram/status');
      setStatus({ ...initialStatus, ...data });
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to load Telegram status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    api.get('/telegram/status')
      .then(({ data }) => {
        if (mounted) setStatus({ ...initialStatus, ...data });
      })
      .catch((error) => {
        if (mounted) setMessage(error.response?.data?.message || 'Unable to load Telegram status.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const savePreferences = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.put('/telegram/preferences', {
        alertsActive: status.alertsActive,
        ...Object.fromEntries(alertOptions.map(([key]) => [key, status[key]])),
      });
      setMessage(data?.message || 'Telegram alert preferences saved.');
      await refreshStatus();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to save Telegram alert preferences.');
    } finally {
      setSaving(false);
    }
  };

  const startLink = async () => {
    setLinking(true);
    setMessage('');
    const telegramWindow = window.open('about:blank', '_blank');
    try {
      const { data } = await api.post('/telegram/link/deep-link');
      if (!data?.url) throw new Error('Telegram did not provide a linking URL.');
      if (telegramWindow) telegramWindow.location = data.url;
      else window.location.assign(data.url);
    } catch (error) {
      telegramWindow?.close();
      setMessage(error.response?.data?.message || error.message || 'Unable to open Telegram linking.');
    } finally {
      setLinking(false);
    }
  };

  const unlinkChat = async () => {
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.post('/notifications/disconnect');
      setMessage(data?.message || 'Telegram disconnected.');
      await refreshStatus();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to unlink this Telegram chat.');
    } finally {
      setSaving(false);
    }
  };

  const connected = status.configured && status.alertsActive && status.personalChatLinked;
  const badge = (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
      {connected && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />}
      {loading
        ? 'Checking Telegram…'
        : connected
        ? `Telegram Alerts Active: @${status.telegramUsername || 'connected'}`
          : status.alertsActive
            ? status.configured
              ? 'Alerts ready'
              : 'Telegram Bot Not Configured'
            : 'Telegram Alerts Paused'}
    </span>
  );

  const toggleAlerts = async () => {
    const nextValue = !status.alertsActive;
    setSaving(true);
    setMessage('');
    setStatus((current) => ({ ...current, alertsActive: nextValue }));
    try {
      const { data } = await api.put('/telegram/preferences', {
        alertsActive: nextValue,
      });
      setMessage(data?.message || `Telegram alerts ${nextValue ? 'enabled' : 'muted'}.`);
      await refreshStatus();
    } catch (error) {
      setStatus((current) => ({ ...current, alertsActive: !nextValue }));
      setMessage(error.response?.data?.message || 'Unable to update Telegram alert preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (banner) {
    const linked = status.personalChatLinked && status.configured;
    return (
      <section className="flex flex-col gap-4 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/80 via-white to-sky-50/40 p-4 shadow-sm sm:p-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#24A1DE] to-sky-600 text-white shadow-md shadow-sky-500/25 ring-4 ring-sky-100/80">
            <Send className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">Get Instant Alerts on Telegram</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Live Bot Active
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600 sm:text-sm">
              Instant interview invitations &amp; recruiter messages delivered directly to your phone
            </p>
            <span className="mt-2 inline-flex max-w-full items-center rounded-md border border-sky-200 bg-sky-100/80 px-2 py-0.5 font-mono text-xs font-semibold text-sky-700">
              @yabsira_job_matcher_bot
            </span>
            {linked && (
              <p className="mt-1.5 text-[11px] font-semibold text-emerald-700">
                Alerts {status.alertsActive ? 'are active' : 'are paused'}{status.telegramUsername ? ` for @${status.telegramUsername}` : ''}.
              </p>
            )}
            {message && <p role="status" className="mt-1.5 text-[11px] text-slate-600">{message}</p>}
          </div>
        </div>
        {linked ? (
          <a
            href={`https://t.me/${encodeURIComponent(status.botUsername || 'yabsira_job_matcher_bot')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#24A1DE] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition duration-150 hover:-translate-y-0.5 hover:bg-[#1e8ec4] hover:shadow-lg active:translate-y-0 active:scale-[0.98] sm:w-auto"
          >
            <span>Open Telegram</span><span aria-hidden="true">→</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={startLink}
            disabled={linking || loading || !status.configured}
            className="inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#24A1DE] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition duration-150 hover:-translate-y-0.5 hover:bg-[#1e8ec4] hover:shadow-lg active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            <span>{linking ? 'Opening Telegram…' : 'Connect Telegram'}</span><span aria-hidden="true">→</span>
          </button>
        )}
      </section>
    );
  }

  if (compact) {
    if (loading) {
      return (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            Checking Telegram…
          </span>
        </div>
      );
    }

    if (status.personalChatLinked && status.configured) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold shadow-sm ${status.alertsActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-emerald-500/10' : 'border-slate-200 bg-slate-100 text-slate-600 shadow-slate-500/10'}`}>
            <span className={`h-2.5 w-2.5 rounded-full ${status.alertsActive ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
            Telegram Alerts {status.alertsActive ? 'Active' : 'Paused'}: @{status.telegramUsername || 'connected'}
          </span>
          <button
            type="button"
            onClick={toggleAlerts}
            disabled={saving || loading}
            className="rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {status.alertsActive ? 'Mute' : 'Unmute'}
          </button>
          {message && <span role="status" className="basis-full text-xs text-slate-600">{message}</span>}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={startLink}
          disabled={linking || loading || !status.configured}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Link2 className="h-3.5 w-3.5" />
          {linking ? 'Opening Telegram…' : 'Connect Telegram for Live Alerts'}
        </button>
        {message && <span role="status" className="basis-full text-xs text-slate-600">{message}</span>}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            Connect your Telegram account with the bot to receive application and hiring updates directly.
          </p>
        </div>
        {badge}
      </div>
      <form onSubmit={savePreferences} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          {!status.personalChatLinked && (
            <button type="button" onClick={startLink} disabled={linking || loading || !status.configured} className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-60">
              <Link2 className="h-4 w-4" />
              {linking ? 'Opening Telegram…' : '🔗 Connect Telegram for Live Alerts'}
            </button>
          )}
            {status.botUsername && (
            <a href={`https://t.me/${encodeURIComponent(status.botUsername)}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-700 hover:underline">
              Open @{status.botUsername}
            </a>
          )}
          {status.personalChatLinked && (
            <button type="button" onClick={unlinkChat} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-60">
              <Unplug className="h-4 w-4" />
              {saving ? 'Disconnecting…' : '🔌 Disconnect Telegram'}
            </button>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={status.alertsActive}
            onChange={(event) => setStatus((current) => ({ ...current, alertsActive: event.target.checked }))}
            className="h-4 w-4 accent-blue-600"
          />
          Receive Telegram application and hiring alerts
        </label>
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          {alertOptions.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={status[key]}
                disabled={!status.alertsActive}
                onChange={(event) => setStatus((current) => ({ ...current, [key]: event.target.checked }))}
                className="h-4 w-4 accent-blue-600"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button type="submit" disabled={saving || loading} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Alert Preferences'}
          </button>
        </div>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>}
      {status.personalChatLinked && <p className="mt-2 text-xs text-emerald-700">Your personal Telegram chat is linked{status.telegramUsername ? ` as @${status.telegramUsername}` : ''}.</p>}
      {!status.personalChatLinked && <p className="mt-2 text-xs text-slate-500">Start the bot using the secure link to receive personal application and status alerts.</p>}
    </section>
  );
}
