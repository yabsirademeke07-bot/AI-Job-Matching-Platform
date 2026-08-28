import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { getUserDestination, removeStoredAccount } from '../utils/authSession';

const displayName = (user) => user?.name || user?.full_name || user?.email?.split('@')[0] || 'Your account';

export default function AccountSelectionModal({ accounts, onSelect, onAnotherAccount, onCreateAccount, onClose }) {
  const [visibleAccounts, setVisibleAccounts] = useState(accounts);
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-4" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-[654px] overflow-y-auto rounded-[28px] border border-slate-200 bg-white px-5 py-8 shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:px-[66px] sm:py-12" role="dialog" aria-modal="true" aria-labelledby="account-selection-title">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-5 top-5 rounded-full p-2 text-slate-800 hover:bg-slate-100"><X className="h-7 w-7" /></button>
        <div className="mx-auto max-w-[526px] text-center">
          <h2 id="account-selection-title" className="text-3xl font-medium tracking-tight text-slate-950 sm:text-[50px]">Welcome back</h2>
          <p className="mt-6 text-lg text-slate-900 sm:mt-8 sm:text-[25px]">Choose an account to continue.</p>
          <div className="mt-10 space-y-4 sm:mt-16">
            {visibleAccounts.map((account) => {
              const name = displayName(account);
              const initials = name.slice(0, 2).toUpperCase();
              return <div key={account.email} role="button" tabIndex={0} onClick={() => onSelect(account, getUserDestination(account))} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(account, getUserDestination(account)); }} className="flex w-full cursor-pointer items-center gap-4 rounded-[38px] border-2 border-slate-950 px-5 py-5 text-left transition hover:bg-[var(--brand-soft)] sm:gap-5 sm:px-6 sm:py-6">
                {account.avatarUrl || account.avatar_url ? <img src={account.avatarUrl || account.avatar_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" /> : <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xl text-white">{initials}</span>}
                <span className="min-w-0 flex-1"><span className="block truncate text-xl font-semibold text-slate-950 sm:text-2xl">{name}</span><span className="mt-1 block truncate text-base text-slate-500 sm:text-xl">{account.email}</span></span>
                <button type="button" aria-label={`Remove ${account.email}`} onClick={(event) => { event.stopPropagation(); removeStoredAccount(account.email); setVisibleAccounts((current) => current.filter((item) => item.email !== account.email)); }} className="shrink-0 rounded-full p-1 text-slate-950 hover:bg-slate-100"><X className="h-7 w-7" /></button>
              </div>;
            })}
          </div>
          <div className="my-8 flex items-center gap-5 text-lg font-bold text-slate-950 sm:my-11 sm:gap-10 sm:text-xl"><span className="h-px flex-1 bg-slate-300" />OR<span className="h-px flex-1 bg-slate-300" /></div>
          <div className="space-y-5"><button type="button" onClick={onAnotherAccount} className="min-h-20 w-full rounded-[40px] border border-slate-300 px-6 text-xl font-bold text-slate-950 hover:bg-[var(--brand-soft)]">Log in to another account</button><button type="button" onClick={onCreateAccount} className="flex min-h-20 w-full items-center justify-center gap-2 rounded-[40px] border border-slate-300 px-6 text-xl font-bold text-slate-950 hover:bg-[var(--brand-soft)]"><Plus className="h-6 w-6" />Create account</button></div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
