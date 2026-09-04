import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './login.css';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { continueApplicationFlow, getNextOnboardingStep, getPendingApplication } from '../utils/applicationFlow';
import { useAuth } from '../context/AuthContext';
import { getUserDestination } from '../utils/authSession';
import {
  Sparkles, ShieldCheck, Cpu, Lock, Mail,
  ArrowRight, Eye, EyeOff, Target, ArrowLeft
} from 'lucide-react';
import EmailInputWithDomains from '../components/EmailInputWithDomains';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, setSession } = useAuth();

  // Redirect or success message passed from Register step
  const successMessage = location.state?.message || '';

  // Verified accounts authenticate with their password; OTP is only used for registration verification.
  const loginMode = 'password';
  const [otpStep, setOtpStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP Code

  // Form State
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
    otp: ['', '', '', '', '', '']
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [apiSuccess, setApiSuccess] = useState(successMessage);

  const API_URL = import.meta.env.VITE_BACKEND_URL || '/api';

  const validateForm = () => {
    const nextErrors = {};
    const email = formData.emailOrPhone.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.emailOrPhone = 'Please provide a valid email address.';
    if (typeof formData.password !== 'string' || formData.password.length < 6) nextErrors.password = 'Password is required and must be at least 6 characters.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const navigateByRole = (role, sessionUser = {}) => {
    const email = String(sessionUser?.email || formData.emailOrPhone || '').trim().toLowerCase();
    const normalizedRole = (email === 'tekebaaweke32@gmail.com' ? 'admin' : (role || '').toLowerCase().replace(/[\s-]+/g, '_'));
    const pending = getPendingApplication();
    const pendingJobId = location.state?.jobId || pending?.jobId;
    const seekerRoles = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'];
    const onboardingIncomplete = seekerRoles.includes(normalizedRole) && (
      sessionUser.onboardingRoleSelected === false ||
      sessionUser.onboardingCvUploaded === false ||
      sessionUser.onboardingProfileCompleted === false ||
      (!sessionUser.onboardingCvUploaded && !localStorage.getItem('seekerResume')) ||
      (!sessionUser.onboardingProfileCompleted && !localStorage.getItem('userProfile'))
    );

    if (pendingJobId && !onboardingIncomplete) {
      continueApplicationFlow(navigate, { jobId: pendingJobId });
      return;
    }
    if (!normalizedRole) {
      if (!sessionUser.is_verified && !sessionUser.isVerified) {
        navigate('/verify-otp', { state: { email: formData.emailOrPhone.trim() } });
      } else {
        navigate(getNextOnboardingStep());
      }
      return;
    }
    if (['employer', 'company', 'recruiter'].includes(normalizedRole)) {
      navigate('/employer/dashboard');
    } else if (['admin', 'super_admin'].includes(normalizedRole)) {
      navigate('/admin/dashboard');
    } else if (['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'].includes(normalizedRole)) {
      if (sessionUser.onboardingComplete || sessionUser.profileComplete) {
        navigate('/dashboard');
      } else if (!sessionUser.is_verified && !sessionUser.isVerified) {
        navigate('/verify-otp', { state: { email: formData.emailOrPhone.trim() } });
      } else {
        navigate(getUserDestination(sessionUser) || getNextOnboardingStep());
      }
    } else {
      navigate('/');
    }
  };

  // Input Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    if (apiError) setApiError('');
  };

  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false;

    const newOtp = [...formData.otp];
    newOtp[index] = element.value;
    setFormData((prev) => ({ ...prev, otp: newOtp }));

    if (element.value !== '' && element.nextSibling) {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      const previousInput = e.target.previousSibling;
      if (previousInput) previousInput.focus();
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setApiError('');

    try {
      const data = await login({ email: formData.emailOrPhone.trim().toLowerCase(), password: formData.password });
      navigateByRole(data.user?.role || data.user?.userType, data.user);
    } catch (error) {
      const response = error.response;
      if (response?.status === 403 && response.data?.requiresVerification) {
        navigate('/verify-otp', { state: { email: response.data.email || formData.emailOrPhone.trim().toLowerCase() } });
        return;
      }
      setApiError(response?.data?.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Request OTP for Login
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!formData.emailOrPhone.trim()) {
      setErrors({ emailOrPhone: 'Please enter your email address' });
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/send-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.emailOrPhone.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setOtpStep(2);
        setApiSuccess('OTP verification code sent to your email.');
      } else {
        setApiError(data.message || 'Failed to send OTP code.');
      }
    } catch (err) {
      console.error('OTP Request Error:', err);
      setApiError(err.response?.data?.message || 'Unable to send login OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit OTP Verification for Login
  const handleVerifyOtpLogin = async (e) => {
    e.preventDefault();
    const otpCode = formData.otp.join('');
    if (otpCode.length < 6) {
      setApiError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setApiError('');

    try {
      const res = await fetch(`${API_URL.replace(/\/$/, '')}/verify-login-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.emailOrPhone.trim(),
          otp: otpCode
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        setSession({ token: data.token, user: data.user });

        navigateByRole(data.user?.role, data.user);
      } else {
        setApiError(data.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      console.error('OTP Verify Error:', err);
      setApiError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    window.location.href = `${API_URL.replace(/\/$/, '')}/auth/facebook`;
  };

  return (
    <div className="min-h-screen w-full bg-brand-soft bg-[radial-gradient(#d0e5f5_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 font-sans overflow-x-hidden">

      {/* Responsive Centered Card Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-white border border-slate-300 my-auto">

        {/* LEFT SIDE: Info Section (Hidden on ultra-small landscape or scaled smoothly) */}
        <div className="md:col-span-5 brand-gradient p-5 sm:p-7 md:p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 flex items-center justify-center shadow-lg shadow-[#2b73a4]/30 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm sm:text-base leading-tight tracking-wide">
                  SmartRecruit <span className="text-white/80">AI</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-slate-400">Deep CV Inspector</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs text-white shadow-sm backdrop-blur-md shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Portal</span>
            </div>
          </div>

          <div className="my-6 sm:my-8 lg:my-12 z-10">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug mb-3">
              Welcome Back <br />
              <span className="text-white/80">
                Sign In to SmartRecruit
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed mb-6">
              Access your personalized AI career dashboard, match scores, and hiring insights.
            </p>

            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/15 text-white border border-white/25 shrink-0">
                  <Cpu className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-100">AI-Powered Resume Parsing</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Automated skill gap analysis & real-time career matching.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white/15 text-white border border-white/25 shrink-0">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-100">Direct Candidate & Job Portal</h4>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Connect with targeted opportunities efficiently.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/15 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/25 flex items-center gap-3 z-10">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/15 border border-white/35 flex items-center justify-center font-bold text-white text-xs shrink-0">
              SSL
            </div>
            <div>
              <p className="text-xs text-slate-200 font-medium leading-snug">
                256-bit encrypted authentication active.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Interactive Login Form */}
        <div className="md:col-span-7 bg-white p-5 sm:p-8 md:p-10 lg:p-12 xl:p-14 flex flex-col justify-center relative">

          {/* Header Title */}
          <div className="mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Sign in to continue</h2>
          </div>

          {/* Notifications */}

          {apiError && (
            <div className="mb-4 p-3.5 sm:p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {apiError}
            </div>
          )}

          {apiSuccess && (
            <div className="mb-4 p-3.5 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              {apiSuccess}
            </div>
          )}

          {/* FORM 1: Password-Based Login */}
          {loginMode === 'password' && (
            <form onSubmit={handlePasswordLogin} noValidate className="space-y-4 sm:space-y-5">

              {/* EMAIL INPUT */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-700 mb-2">
                  Email Address
                </label>
                <EmailInputWithDomains
                  name="emailOrPhone"
                  value={formData.emailOrPhone}
                  onChange={(value) => handleChange({ target: { name: 'emailOrPhone', value } })}
                  error={errors.emailOrPhone}
                />
              </div>

              {/* PASSWORD INPUT */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm sm:text-base font-bold text-slate-700">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group flex items-center">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full text-sm sm:text-base pl-12 pr-12 py-3 sm:py-3.5 rounded-xl border bg-slate-50/50 text-slate-900 font-semibold placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all ${errors.password ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs font-bold text-red-600 mt-1">{errors.password}</p>}
              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 brand-gradient hover:opacity-90 text-white rounded-xl font-extrabold text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-lg shadow-[#56a2d8]/25 active:scale-[0.98] cursor-pointer mt-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORM 2: OTP-Based Login */}
          {loginMode === 'otp' && (
            <div>
              {otpStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4 sm:space-y-5">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                      Registered Email Address
                    </label>
                    <div className="relative group flex items-center">
                      <Mail className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                      <input
                        type="email"
                        name="emailOrPhone"
                        value={formData.emailOrPhone}
                        onChange={handleChange}
                        placeholder="name@example.com"
                        className="w-full text-sm sm:text-base pl-12 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-300 bg-slate-50/50 text-slate-900 font-semibold focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 sm:py-4 px-6 brand-bg hover:opacity-90 text-white rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition shadow-lg shadow-[#56a2d8]/25 active:scale-[0.98] cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Send Login OTP</span>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpLogin} className="space-y-5">
                  <button
                    type="button"
                    onClick={() => setOtpStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change Email
                  </button>

                  <div className="flex items-center justify-between gap-1.5 sm:gap-2 max-w-sm mx-auto">
                    {formData.otp.map((digit, index) => (
                      <input
                        key={index}
                        type="text"
                        maxLength="1"
                        value={digit}
                        onChange={(e) => handleOtpChange(e.target, index)}
                        onKeyDown={(e) => handleOtpKeyDown(e, index)}
                        className="w-10 sm:w-12 h-12 sm:h-14 text-center font-bold text-lg sm:text-xl rounded-xl border border-slate-300 bg-slate-50 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 sm:py-4 px-6 brand-bg hover:opacity-90 text-white rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition shadow-lg shadow-[#56a2d8]/25 active:scale-[0.98] cursor-pointer disabled:opacity-70"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>Verify & Login</span>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* SOCIAL BUTTONS */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-5 flex items-center justify-center gap-3">
              <div className="w-full border-t border-slate-200" />
              <span className="shrink-0 text-sm font-bold uppercase tracking-widest text-slate-500">OR</span>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="flex flex-col gap-3">
              <GoogleAuthButton label="Continue with Google" />
              <button type="button" onClick={handleFacebookLogin} className="w-full py-3 px-4 brand-bg hover:bg-[#f0f7fc] hover:text-[#2b73a4] text-white font-bold text-xs sm:text-sm rounded-xl border border-[#56a2d8] shadow-sm transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer">
                <span className="w-6 h-6 rounded-md bg-white text-[#56a2d8] flex items-center justify-center text-lg font-black">f</span>
                <span>Continue with Facebook</span>
              </button>
            </div>
          </div>

          <p className="mt-6 sm:mt-8 text-center text-sm sm:text-base font-semibold text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-extrabold text-blue-600 hover:text-blue-800 hover:underline transition">
              Create an account
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
};

export default Login;
