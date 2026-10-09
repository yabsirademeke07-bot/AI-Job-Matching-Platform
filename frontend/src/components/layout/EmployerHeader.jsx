import React, { useEffect, useState } from 'react';
import {
  Bell,
  Maximize2,
  Menu,
  MessageSquareText,
  Minimize2,
  Search,
  X,
} from 'lucide-react';

export const EmployerHeader = ({
  currentTabTitle = 'Employer Dashboard',
  breadcrumb = 'Home / Dashboard',
  showSearch = true,
  unreadNotificationsCount = 0,
  onToggleSidebar,
  sidebarOpen = false,
  onSearchClick,
  onOpenNotifications,
  onOpenMessages,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={sidebarOpen ? 'Close employer navigation' : 'Open employer navigation'}
        aria-expanded={sidebarOpen}
        aria-controls="employer-sidebar"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <div className="hidden w-0 lg:block" aria-hidden="true" />

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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenNotifications || (() => window.location.assign('#notifications'))}
          className="relative rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
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
          onClick={toggleFullscreen}
          className="hidden rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 sm:flex"
          title="Toggle Fullscreen"
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
        </button>

        <button
          type="button"
          onClick={onOpenMessages || (() => window.location.assign('#messages'))}
          className="rounded-xl p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          title="Messages"
          aria-label="Messages"
        >
          <MessageSquareText className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};
