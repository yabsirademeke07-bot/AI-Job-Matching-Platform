import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, RefreshCw, ShieldCheck, Sparkles, Target } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../hooks/useToast';
import { getResetEmail, getResetFlow, hasValidResetFlow, saveResetFlow, setOtpVerified } from '../utils/passwordResetSession';

const VerifyResetOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();
  const otpInputRefs = useRef([]);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(600);
  const [resendCount, setResendCount] = useState(() => Number(sessionStorage.getItem('ai_job_reset_resend_count') || 0));
  const [error, setError] = useState('');

  const email = (location.state?.email || getResetEmail()).trim().toLowerCase();

  useEffect(() => {
    if (!email) {
      navigate('/forgot-password', { replace: true });
      return;
    }

    const flow = getResetFlow();
    if (flow.resetEmail && flow.resetEmail !== email) {
      saveResetFlow({ resetEmail: email, otpVerified: false, resetToken: '', expiresAt: Date.now() + 30 * 60 * 1000 });
    }
  }, [email, navigate]);

  useEffect(() => {
    otpInputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (otpTimer <= 0) return undefined;

    const timer = window.setInterval(() => {
      setOtpTimer((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpTimer]);

  const formattedTime = useMemo(() => {
    const minutes = String(Math.floor(otpTimer / 60)).padStart(2, '0');
    const seconds = String(otpTimer % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [otpTimer]);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);
    setError('');

    if (value && index < otp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    const otpCode = otp.join('');

    if (otpTimer <= 0) {
      setError('The verification code has expired. Please resend a new code.');
      showError('The verification code has expired. Please resend a new code.');
      return;
    }

    if (otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      showError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await API.post('/auth/verify-reset-otp', {
        email,
        otp: otpCode,
      });

      const resetToken = response?.data?.resetToken || response?.data?.token || '';
      setOtpVerified(resetToken);
      showSuccess('Verification successful. Please create a new password.');
      navigate('/reset-password', { replace: true });
    } catch (err) {
      const message = err?.response?.data?.message || 'Invalid or expired OTP code.';
      showError(message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCount >= 3) {
      const message = 'Too many resend attempts. Please wait and try again later.';
      setError(message);
      showError(message);
      return;
    }

    try {
      await API.post('/auth/forgot-password', { email });
      const nextResendCount = resendCount + 1;
      sessionStorage.setItem('ai_job_reset_resend_count', String(nextResendCount));
      setResendCount(nextResendCount);
      setOtp(['', '', '', '', '', '']);
      setOtpTimer(600);
      showSuccess('If an account exists for this email, a new verification code has been sent.');
      window.setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    } catch (err) {
      const message = err?.response?.data?.message || 'Unable to resend the reset code. Please try again.';
      showError(message);
      setError(message);
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
              <span>Verify OTP</span>
            </div>
          </div>

          <div className="my-6 z-10 sm:my-7">
            <h1 className="text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl">
              Verify your email
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              Enter the one-time code sent to your email to continue with password recovery.
            </p>

            <div className="mt-6 space-y-3.5">
              <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2.5">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Secure access</h4>
                  <p className="mt-0.5 text-xs text-slate-300">Your reset flow is protected by time-limited verification.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5">
                <div className="rounded-xl border border-white/25 bg-white/15 p-2.5">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Single-use code</h4>
                  <p className="mt-0.5 text-xs text-slate-300">Use the code once and continue to create a new password.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-[420px] flex-col justify-center bg-white p-5 sm:p-8 md:col-span-7 md:p-10">
          <div className="mb-6 flex items-center gap-2">
            <Link to="/forgot-password" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
              Change email
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Enter verification code</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              We sent a 6-digit code to <span className="font-bold text-[var(--brand-deep)]">{email || 'your email'}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="mx-auto flex max-w-sm items-center justify-between gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  ref={(element) => {
                    otpInputRefs.current[index] = element;
                  }}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  className="h-12 w-10 rounded-xl border border-slate-300 bg-slate-100 text-center text-lg font-bold text-slate-900 outline-none transition focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:h-14 sm:w-12 sm:text-xl"
                  aria-label={`OTP digit ${index + 1}`}
                />
              ))}
            </div>

            {error && <p className="text-center text-xs font-bold text-red-600">{error}</p>}

            <div className="text-center text-xs font-semibold text-slate-500">
              {otpTimer > 0 ? (
                <>
                  Resend code in <span className="font-bold text-[var(--brand-deep)]">{formattedTime}</span>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="inline-flex items-center gap-2 font-bold text-red-600 transition hover:text-red-800"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otpTimer === 0}
              className="w-full rounded-xl bg-[var(--brand-primary)] px-6 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-500/25 transition hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyResetOtp;
