import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, Sparkles, Target } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../hooks/useToast';
import { setResetEmail } from '../utils/passwordResetSession';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isValidEmail = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    if (!isValidEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data } = await API.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      });

      setResetEmail(email);
      showSuccess('If an account exists for this email, a verification code has been sent.');
      navigate('/verify-reset-otp', { replace: true, state: { email: email.trim().toLowerCase(), otpExpiresAt: data.otpExpiresAt } });
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to send the reset code. Please try again.';
      showError(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
              <span>Secure Reset</span>
            </div>
          </div>

          <div className="my-6 z-10 sm:my-7">
            <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl">
              Forgot your password?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              We will send a one-time verification code to your email so you can safely reset your password.
            </p>

            <div className="mt-6 space-y-3.5">
              <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2.5">
                  <Mail className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Secure verification</h4>
                  <p className="mt-0.5 text-xs text-slate-300">No password details are shared in the reset process.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2.5">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Quick recovery</h4>
                  <p className="mt-0.5 text-xs text-slate-300">Reset your access in a few simple steps.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col justify-center bg-white p-5 sm:p-8 md:col-span-7 md:p-10">
          <div className="mb-6 flex items-center gap-2">
            <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Reset your password</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">Enter the email address associated with your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError('');
                  }}
                  placeholder="you@example.com"
                  className={`w-full rounded-xl border bg-slate-50/50 py-3.5 pl-12 pr-4 text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 ${error ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:bg-white'}`}
                />
              </div>
              {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isValidEmail}
              className="w-full rounded-xl bg-[var(--brand-primary)] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-500/25 transition hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
