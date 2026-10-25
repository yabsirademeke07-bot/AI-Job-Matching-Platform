import React, { useEffect, useState } from 'react';
import {
  Bell,
  Maximize2,
  Menu,
  MessageSquareText,
  Minimize2,
  Search,
} from 'lucide-react';

export const EmployerHeader = ({
  currentTabTitle = 'Employer Dashboard',
  breadcrumb = 'Home / Dashboard',
  showSearch = true,
  user,
  unreadNotificationsCount = 0,
  unreadMessagesCount = 0,
  onToggleSidebar,
  onSearchClick,
  onOpenNotifications,
  onOpenMessages,
  onOpenProfile,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const displayName = user?.name || user?.full_name || user?.email || 'User';
  const avatarUrl = user?.avatar_url || user?.avatarUrl || user?.profile_picture;
  const getInitials = (name) => {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0]?.[0]?.toUpperCase() || 'U';
  };

  useEffect(() => {
    if (!showSearch || !onSearchClick) return undefined;
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        onSearchClick?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearchClick, showSearch]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Ignore fullscreen API failures gracefully.
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 shadow-xs backdrop-blur-sm">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-600 lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-bold text-slate-800">{currentTabTitle}</p>
          <p className="truncate text-xs text-slate-500">{breadcrumb}</p>
        </div>
      </div>

      {showSearch && <div className="mx-8 hidden max-w-md flex-1 items-center md:flex">
        <button
          type="button"
          onClick={onSearchClick}
          className="group relative flex w-full items-center rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-2.5 text-left transition-all duration-200 hover:bg-slate-100/80"
        >
          <Search className="mr-2.5 h-4 w-4 text-slate-400 transition-colors group-hover:text-blue-600" />
          <span className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400">
            Search candidates, jobs, skills...
          </span>
          <span className="ml-2 flex-shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400 shadow-xs">
            Ctrl + K
          </span>
        </button>
      </div>}

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <button
          type="button"
          onClick={onOpenNotifications || (() => window.location.assign('#notifications'))}
          className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-blue-600"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[10px] font-black text-white">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenMessages || (() => window.location.assign('#messages'))}
          className="relative rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-blue-600"
          title="Messages"
          aria-label="Messages"
        >
          <MessageSquareText className="h-5 w-5" />
          {unreadMessagesCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-blue-600 px-1 text-[10px] font-black text-white">
              {unreadMessagesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-xl p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-blue-600"
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onOpenProfile}
          className="ml-1 flex min-w-0 items-center gap-2 rounded-full p-1 pr-2 transition hover:bg-slate-100"
          aria-label={`Open profile for ${displayName}`}
          title={displayName}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold uppercase text-white">
              {getInitials(displayName)}
            </span>
          )}
          <span className="hidden max-w-32 truncate text-sm font-semibold text-slate-700 md:block">{displayName}</span>
        </button>
      </div>
    </header>
  );
};
