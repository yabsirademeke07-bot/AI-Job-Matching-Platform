import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const getDisplayName = (user) => user?.name || user?.full_name || user?.email?.split('@')[0] || 'Your account';

export default function LogoutAccountModal({ user, onLogout, onClose }) {
  const displayName = getDisplayName(user);
  const email = user?.email || 'Signed-in account';
  const avatarUrl = user?.avatarUrl || user?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-4"
        role="presentation"
        onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      >
        <div className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-[654px] overflow-y-auto rounded-[28px] border border-slate-200 bg-white px-5 py-8 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:px-[66px] sm:py-12" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
          <button type="button" aria-label="Close" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-slate-800 transition hover:bg-slate-100">
            <X className="h-7 w-7" />
          </button>
          <div className="mx-auto max-w-[526px] text-center">
            <h2 id="logout-confirm-title" className="text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-[42px]">Are you sure you want to log out?</h2>
            <div className="mt-9 flex w-full items-center gap-5 rounded-[26px] border border-slate-300 px-5 py-6 text-left">
              {avatarUrl ? <img src={avatarUrl} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xl font-medium text-white">{initials}</span>}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xl font-semibold text-slate-950 sm:text-2xl">{displayName}</span>
                <span className="mt-1 block truncate text-base text-slate-500 sm:text-xl">{email}</span>
              </span>
            </div>
            <div className="mt-10 space-y-4">
              <button type="button" onClick={onLogout} className="flex min-h-[70px] w-full items-center justify-center rounded-[40px] bg-[var(--brand-deep)] px-6 text-xl font-bold text-white transition hover:bg-[var(--brand-primary)]">Log out</button>
              <button type="button" onClick={onClose} className="flex min-h-[70px] w-full items-center justify-center rounded-[40px] border border-slate-300 px-6 text-xl font-bold text-[var(--brand-deep)] transition hover:border-[var(--brand-primary)] hover:bg-[var(--brand-soft)]">Cancel</button>
            </div>
          </div>
        </div>
      </div>,
    document.body,
  );
}
