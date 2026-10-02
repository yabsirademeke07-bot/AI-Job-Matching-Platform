import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, Lock, ShieldCheck, Sparkles, Target } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../hooks/useToast';
import { clearResetFlow, getResetEmail, getResetToken, hasValidResetFlow } from '../utils/passwordResetSession';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const email = getResetEmail();

  useEffect(() => {
    if (!hasValidResetFlow()) {
      navigate('/forgot-password', { replace: true });
    }
  }, [navigate]);

  const validatePassword = (password) => {
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
    return '';
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const newPasswordError = validatePassword(formData.newPassword);
    if (newPasswordError) nextErrors.newPassword = newPasswordError;

    if (!formData.confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (formData.confirmPassword !== formData.newPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!hasValidResetFlow()) {
      showError('Your reset session has expired. Please request a new reset code.');
      navigate('/forgot-password', { replace: true });
      return;
    }

    setIsLoading(true);

    try {
      const resetToken = getResetToken();
      const payload = {
        resetToken,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      };

      await API.post('/auth/reset-password', payload);
      clearResetFlow();
      setIsSuccess(true);
      showSuccess('Password reset successfully.');
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to reset your password. Please try again.';
      showError(message);
      setErrors({ form: message });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--brand-soft)] bg-[radial-gradient(#d0e5f5_1px,transparent_1px)] [background-size:16px_16px] p-4">
        <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Password Reset Successfully</h1>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Your password has been updated successfully. You can now log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-[var(--brand-primary)] px-6 py-3.5 text-base font-extrabold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[var(--brand-deep)]"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--brand-soft)] bg-[radial-gradient(#d0e5f5_1px,transparent_1px)] [background-size:16px_16px] px-3 py-6 font-sans sm:p-8">
      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl md:grid-cols-12">
        <div className="flex flex-col justify-between bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-deep)] p-4 sm:p-6 md:col-span-5 md:p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-lg shadow-[#2b73a4]/30">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white sm:text-base">
                  SmartRecruit <span className="text-white/80">AI</span>
                </h3>
                <p className="text-[10px] text-white/60 sm:text-xs">Deep CV Inspector</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>New Password</span>
            </div>
          </div>

          <div className="my-6 z-10 sm:my-7">
            <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl">
              Create a new password
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              Make sure it is strong and unique so your account stays secure.
            </p>

            <div className="mt-6 space-y-3.5">
              <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2.5">
                  <KeyRound className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Strong password</h4>
                  <p className="mt-0.5 text-xs text-slate-300">Use uppercase, lowercase, numbers, and at least 8 characters.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2.5">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Secure account</h4>
                  <p className="mt-0.5 text-xs text-slate-300">Your recovery session stays protected until it is complete.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col justify-center bg-white p-5 sm:p-8 md:col-span-7 md:p-10">
          <div className="mb-6 flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/verify-reset-otp', { state: { email } })}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to OTP
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Reset your password</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">For {email || 'your account'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  className={`w-full rounded-xl border bg-slate-50/50 py-3.5 pl-12 pr-12 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${errors.newPassword ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:bg-white'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.newPassword && <p className="mt-2 text-xs font-bold text-red-600">{errors.newPassword}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Confirm New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter new password"
                  className={`w-full rounded-xl border bg-slate-50/50 py-3.5 pl-12 pr-12 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${errors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:bg-white'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((previous) => !previous)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-2 text-xs font-bold text-red-600">{errors.confirmPassword}</p>}
            </div>

            {errors.form && <p className="text-xs font-bold text-red-600">{errors.form}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[var(--brand-primary)] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-500/25 transition hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
