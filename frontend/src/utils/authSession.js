const ACTIVE_USER_KEY = 'user';
const ACTIVE_TOKEN_KEY = 'token';
const ACCOUNTS_KEY = 'frontendAuthAccounts';

export const normalizeRole = (role) => String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(ACTIVE_USER_KEY) || 'null');
  } catch {
    return null;
  }
};

export const getStoredAccounts = () => {
  try {
    const accounts = JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
    return Array.isArray(accounts) ? accounts : [];
  } catch {
    return [];
  }
};

export const saveAccount = (user) => {
  if (!user?.email) return;
  const accounts = [user, ...getStoredAccounts().filter((account) => account.email !== user.email)];
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const removeStoredAccount = (email) => {
  const accounts = getStoredAccounts().filter((account) => account.email !== email);
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const getUserDestination = (user) => {
  const role = normalizeRole(user?.role || user?.userType);
  if (['employer', 'company', 'recruiter'].includes(role)) return '/employer-dashboard';
  if (['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(role)) {
    if (!user?.is_verified && !user?.isVerified && !user?.otpVerified) return '/verify-otp';
    if (!user?.role && !user?.userType) return '/select-role';
    if (!user?.onboardingComplete && !user?.cvFileName && !localStorage.getItem('seekerResume')) return '/upload-cv';
    if (!user?.onboardingComplete && !user?.profileComplete && !localStorage.getItem('userProfile')) return '/profile';
    return '/dashboard';
  }
  if (!role) return '/select-role';
  return '/';
};

export const persistSession = ({ token, user }) => {
  if (token) localStorage.setItem(ACTIVE_TOKEN_KEY, token);
  if (user) {
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    localStorage.setItem('currentUser', JSON.stringify(user));
    saveAccount(user);
  }
};

export const clearActiveSession = () => {
  [ACTIVE_TOKEN_KEY, ACTIVE_USER_KEY, 'currentUser', 'job_matching_auth_user'].forEach((key) => localStorage.removeItem(key));
  ['token', 'user'].forEach((key) => sessionStorage.removeItem(key));
};
