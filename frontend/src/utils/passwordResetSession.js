const RESET_STATE_KEY = 'ai_job_matching_reset_flow';

export const getResetFlow = () => {
  try {
    const raw = sessionStorage.getItem(RESET_STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveResetFlow = (nextState = {}) => {
  const current = getResetFlow();
  const merged = {
    ...current,
    ...nextState,
  };

  sessionStorage.setItem(RESET_STATE_KEY, JSON.stringify(merged));
  return merged;
};

export const clearResetFlow = () => {
  sessionStorage.removeItem(RESET_STATE_KEY);
};

export const getResetEmail = () => getResetFlow().resetEmail || '';
export const getResetToken = () => getResetFlow().resetToken || '';
export const isResetOtpVerified = () => Boolean(getResetFlow().otpVerified);

export const setResetEmail = (email) => {
  saveResetFlow({
    resetEmail: String(email || '').trim().toLowerCase(),
    otpVerified: false,
    resetToken: '',
    expiresAt: Date.now() + 30 * 60 * 1000,
  });
};

export const setOtpVerified = (resetToken = '') => {
  saveResetFlow({
    otpVerified: true,
    resetToken: String(resetToken || ''),
    expiresAt: Date.now() + 30 * 60 * 1000,
  });
};

export const hasValidResetFlow = () => {
  const state = getResetFlow();
  if (!state.resetEmail || !state.otpVerified) return false;

  const expiresAt = Number(state.expiresAt || 0);
  if (expiresAt && Date.now() > expiresAt) {
    clearResetFlow();
    return false;
  }

  return true;
};

export const getResetAttempts = (key) => {
  try {
    const value = Number(sessionStorage.getItem(key) || 0);
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

export const setResetAttempts = (key, value) => {
  sessionStorage.setItem(key, String(Math.max(0, Number(value) || 0)));
};
