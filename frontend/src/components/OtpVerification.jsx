import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { getPendingApplication } from '../utils/applicationFlow';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast.js';
import { Cpu, RefreshCw, ShieldCheck, Sparkles, Target } from 'lucide-react';

const OTP_TIMER_SECONDS = 180;
const getExpiryTimestamp = (value) => {
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(timestamp) ? timestamp : Date.now() + OTP_TIMER_SECONDS * 1000;
};
const getOtpDigits = (code) => /^\d{6}$/.test(String(code || ''))
  ? String(code).split('')
  : ['', '', '', '', '', ''];

const OtpVerification = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setSession } = useAuth();
  const { showSuccess, showError } = useToast();

  const email = location.state?.email || searchParams.get('email') || localStorage.getItem('pending_email') || '';
  const userIdFromUrl = searchParams.get('userId') || null;
  const providedRole = location.state?.role || searchParams.get('role') || null;
  const otpPurpose = location.state?.purpose || searchParams.get('purpose') || 'registration';
  const pendingJobId = searchParams.get('jobId') || location.state?.jobId || getPendingApplication()?.jobId || '';

  const [developmentOtp, setDevelopmentOtp] = useState(location.state?.devOtp || '');
  const [otp, setOtp] = useState(() => getOtpDigits(location.state?.devOtp));
  const [loading, setLoading] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState(() => getExpiryTimestamp(location.state?.otpExpiresAt));
  const [otpTimer, setOtpTimer] = useState(() => Math.max(0, Math.ceil((getExpiryTimestamp(location.state?.otpExpiresAt) - Date.now()) / 1000)));
  const otpInputRefs = useRef([]);

  const formatOtpTime = (seconds) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  };

  useEffect(() => {
    otpInputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (email) localStorage.setItem('pending_email', email);
  }, [email]);

  useEffect(() => {
    const deliveryError = location.state?.emailDeliveryError;
    if (deliveryError && !location.state?.devOtp) {
      showError(deliveryError);
    }
  }, [location.key, location.state, showError]);

  useEffect(() => {
    const updateTimer = () => setOtpTimer(Math.max(0, Math.ceil((otpExpiresAt - Date.now()) / 1000)));
    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresAt]);

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < otp.length - 1) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      showError('Please enter the full 6-digit OTP code.');
      return;
    }
    if (otpTimer === 0 && !(import.meta.env.DEV && otpCode === '123456')) {
      showError('OTP code has expired. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      const verifyPath = otpPurpose === 'login' ? '/auth/verify-login-otp' : '/auth/verify-otp';
      const verifyPayload = otpPurpose === 'login'
        ? { email, otp_code: otpCode }
        : { email, otp: otpCode, role: providedRole };
      const { data } = await api.post(verifyPath, verifyPayload);
      if (!data.token || !data.user) throw new Error('Authentication response was incomplete.');
      localStorage.removeItem('pending_email');
      const verifiedUser = {
        ...data.user,
        onboardingRoleSelected: data.user.onboardingRoleSelected ?? false,
        onboardingCvUploaded: data.user.has_cv ?? false,
        onboardingProfileCompleted: data.user.onboardingProfileCompleted ?? false,
      };
      setSession({ token: data.token, user: verifiedUser });

      const params = new URLSearchParams();
      if (userIdFromUrl) params.set('userId', userIdFromUrl);
      if (pendingJobId) params.set('jobId', pendingJobId);
      navigate(`/select-role${params.toString() ? `?${params.toString()}` : ''}`);
    } catch (err) {
      showError(err.response?.data?.message || err.response?.data?.error || err.message || 'Invalid or expired OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0 || loading) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/resend-otp', { email, purpose: otpPurpose });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to resend OTP.');
      const expiry = getExpiryTimestamp(response.data.otpExpiresAt);
      setOtpExpiresAt(expiry);
      setOtpTimer(Math.max(0, Math.ceil((expiry - Date.now()) / 1000)));
      const newDevelopmentOtp = response.data.devOtp || '';
      setDevelopmentOtp(newDevelopmentOtp);
      setOtp(getOtpDigits(newDevelopmentOtp));
      if (response.data.emailDelivered === false) {
        if (newDevelopmentOtp) {
          showError(`${response.data.emailError || 'Email delivery failed.'} Use the development code shown below.`);
        } else {
          showError(response.data.emailError || 'Email delivery failed. Check the backend SMTP configuration and try again.');
        }
      } else {
        showSuccess('A new verification code was sent to your email.');
      }
      setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
    } catch (err) {
      showError(err.response?.data?.message || err.message || 'Unable to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--brand-soft)] bg-[radial-gradient(#d0e5f5_1px,transparent_1px)] [background-size:16px_16px] px-3 py-6 font-sans sm:p-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-2xl md:grid-cols-12">
        <div className="flex flex-col justify-between bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-deep)] p-6 sm:p-8 md:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Sparkles className="h-5 w-5 text-white" /></div><div><h3 className="text-sm font-bold text-white sm:text-base">SmartRecruit <span className="text-white/80">AI</span></h3><p className="text-[10px] text-white/60 sm:text-xs">Deep CV Inspector</p></div></div>
            <div className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs text-white"><ShieldCheck className="h-4 w-4 text-emerald-300" />Step 2 of 3</div>
          </div>
          <div className="my-8"><h1 className="text-2xl font-extrabold leading-snug tracking-tight text-white sm:text-3xl">Verify Email<br /><span className="text-white/80">Security Check</span></h1><p className="mt-3 text-sm leading-relaxed text-blue-100">Our AI platform matches top talents with top companies automatically using dynamic CV parsing.</p><div className="mt-6 space-y-3.5"><div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5"><div className="rounded-xl border border-white/25 bg-white/15 p-2.5"><Cpu className="h-5 w-5 text-white" /></div><div><h4 className="text-sm font-semibold text-slate-100">AI Match Score &amp; Skill Extraction</h4><p className="mt-0.5 text-xs text-slate-300">Scans CV text to score compatibility &amp; list missing skills.</p></div></div><div className="flex items-start gap-3 rounded-xl border border-slate-700/70 bg-slate-800/60 p-3.5"><div className="rounded-xl border border-white/25 bg-white/15 p-2.5"><Target className="h-5 w-5 text-white" /></div><div><h4 className="text-sm font-semibold text-slate-100">Career Goals Alignment</h4><p className="mt-0.5 text-xs text-slate-300">Tailors job recommendations based on salary &amp; title goals.</p></div></div></div></div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/15 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/15 text-xs font-bold text-white">100%</div><p className="text-xs font-medium leading-snug text-blue-50">&quot;Instant parsing &amp; high-precision skill verification active.&quot;</p></div>
        </div>
        <div className="flex min-h-[520px] flex-col justify-center bg-white p-6 sm:p-10 md:col-span-7 lg:p-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Enter Verification Code</h2>
          <p className="mt-1 mb-6 text-xs font-semibold text-slate-500 sm:text-sm">We sent a 6-digit code to <span className="font-bold text-[var(--brand-deep)]">{email || 'your email'}</span></p>
          {developmentOtp && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center" role="status">
              <p className="text-xs font-semibold text-amber-900">Local development verification code</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-[0.3em] text-amber-950">{developmentOtp}</p>
              {location.state?.emailDeliveryError && (
                <p className="mt-2 text-xs text-amber-800">{location.state.emailDeliveryError}</p>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6"><div className="mx-auto flex max-w-sm items-center justify-between gap-2">{otp.map((digit, index) => <input key={index} type="text" inputMode="numeric" maxLength="1" value={digit} ref={(el) => (otpInputRefs.current[index] = el)} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)} className="h-12 w-10 rounded-xl border border-slate-300 bg-slate-100 text-center text-lg font-bold text-slate-900 outline-none transition focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:h-14 sm:w-12 sm:text-xl" aria-label={`OTP digit ${index + 1}`} />)}</div><div className="text-center text-xs font-semibold text-slate-500">
            {otpTimer > 0 ? (
              <>Resend code in <span className="font-bold text-[var(--brand-deep)]">{formatOtpTime(otpTimer)}</span></>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-bold italic text-red-600">
                OTP expired — <button type="button" onClick={handleResendOtp} className="inline-flex items-center gap-1.5 font-bold italic text-red-600 hover:text-red-800 hover:underline"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Resend OTP</button>
              </span>
            )}
          </div><button type="submit" disabled={loading || (otpTimer === 0 && !(import.meta.env.DEV && otp.join('') === '123456'))} className="w-full rounded-xl bg-[var(--brand-primary)] px-6 py-3.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-500/25 transition hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-70 sm:py-4">{loading ? 'Verifying...' : otpTimer === 0 && otp.join('') !== '123456' ? 'OTP Expired' : 'Verify Code'}</button>
          {import.meta.env.DEV && (
            <button
              type="button"
              onClick={() => {
                setOtp(['1', '2', '3', '4', '5', '6']);
                setTimeout(() => otpInputRefs.current[0]?.focus(), 0);
              }}
              className="mt-3 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 py-2.5 text-xs font-semibold text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
            >
              ⚡ Quick Fill Developer Code (123456)
            </button>
          )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;