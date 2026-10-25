import { useCallback, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import api from '../../services/api';

const initialStatus = {
  configured: false,
  telegramUsername: '',
  alertsActive: true,
  personalChatLinked: false,
};

export default function SeekerTelegramIntegrationCard() {
  const [status, setStatus] = useState(initialStatus);

  const refreshStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/telegram/status');
      setStatus({ ...initialStatus, ...data });
      return Boolean(data?.personalChatLinked);
    } catch (error) {
      console.error('Unable to load Telegram connection status:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (status.personalChatLinked) return undefined;
    const timer = window.setInterval(() => {
      refreshStatus();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshStatus, status.personalChatLinked]);

  const linked = status.personalChatLinked;

  return (
    <div>
      <a
        href="https://t.me/yabsira_job_matcher_bot?start=connect"
        target="_blank"
        rel="noopener noreferrer"
        title={linked ? `Telegram connected${status.telegramUsername ? ` as @${status.telegramUsername}` : ''}. Click to manage connection.` : 'Connect Telegram alerts'}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#229ED9]/30 bg-[#229ED9]/10 px-4 py-2 text-xs font-bold text-[#229ED9] shadow-xs transition-all duration-200 hover:bg-[#229ED9] hover:text-white"
      >
        <Send className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Telegram Alerts</span>
      </a>
    </div>
  );
}
