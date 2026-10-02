import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import './login.css';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { continueApplicationFlow, getNextOnboardingStep, getPendingApplication } from '../utils/applicationFlow';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast.js';
import { scrollToFeedback } from '../utils/scrollHelper.js';
import { resolveUserRole } from '../utils/authSession';
import {
  ShieldCheck, Lock,
  ArrowRight, Eye, EyeOff
} from 'lucide-react';
import EmailInputWithDomains from '../components/EmailInputWithDomains';
import logoImage from './images/logo1.png';
import loginImage from './images/images (1).jpg';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession } = useAuth();
  const { showSuccess, showError } = useToast();

  // Redirect or success message passed from Register step
  const successMessage = location.state?.message || '';

  // Form State
  const [formData, setFormData] = useState({
    emailOrPhone: '',
    password: '',
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL || '/api';
  const AUTH_API_URL = `${API_URL.replace(/\/$/, '')}/auth`;

  const validateForm = () => {
    const nextErrors = {};
    const email = formData.emailOrPhone.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.emailOrPhone = 'Please provide a valid email address.';
    if (typeof formData.password !== 'string' || formData.password.length < 6) nextErrors.password = 'Password is required and must be at least 6 characters.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      showError('Please correct the highlighted fields.');
      scrollToFeedback('error');
    }
    return Object.keys(nextErrors).length === 0;
  };

  const navigateByRole = (role, sessionUser = {}) => {
    const email = String(sessionUser?.email || formData.emailOrPhone || '').trim().toLowerCase();
    const normalizedRole = resolveUserRole({ email, role: role || sessionUser?.role || sessionUser?.userType });
    const pending = getPendingApplication();
    const pendingJobId = location.state?.jobId || pending?.jobId;
    if (location.state?.intent === 'post-job') {
      navigate('/explore-jobs', { replace: true, state: { openPostJob: true } });
      return;
    }
    const seekerRoles = ['job_seeker', 'seeker', 'jobseeker', 'user', 'employee'];
    const onboardingIncomplete = seekerRoles.includes(normalizedRole) && (
      sessionUser.onboardingRoleSelected === false ||
      sessionUser.has_cv === false ||
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
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  // Input Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };


  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const res = await fetch(`${AUTH_API_URL}/login-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.emailOrPhone.trim().toLowerCase(), password: formData.password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 403 && data.requires_verification) {
        navigate('/verify-otp', {
          state: {
            email: data.email || formData.emailOrPhone.trim().toLowerCase(),
            message: data.message,
            intent: location.state?.intent,
          }
        });
        return;
      }

      if (res.status === 429 || data.requires_otp || data.message?.toLowerCase().includes('login code was already sent')) {
        navigate('/verify-otp', {
          state: {
            email: data.email || formData.emailOrPhone.trim().toLowerCase(),
            message: data.message || 'A login code was already sent to your email. Please enter it below to continue.',
            intent: location.state?.intent,
          }
        });
        return;
      }

      if (!res.ok) throw new Error(data.message || data.error || 'Unable to send login OTP.');
      if (data.requires_otp || data.success) {
        navigate('/verify-otp', {
          state: {
            email: data.email || formData.emailOrPhone.trim().toLowerCase(),
            message: `We sent a verification code to ${(data.email || formData.emailOrPhone).trim().toLowerCase()}.`,
            intent: location.state?.intent,
          }
        });
        showSuccess('Verification code sent successfully.');
        return;
      }
    } catch (error) {
      showError(error.message || 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-brand-soft bg-[radial-gradient(#d0e5f5_1px,transparent_1px)] bg-size-[16px_16px] flex items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 font-sans overflow-x-hidden">

      {/* Responsive Centered Card Container */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl bg-white border border-slate-300 my-auto">

        {/* LEFT SIDE: Info Section (Hidden on ultra-small landscape or scaled smoothly) */}
        <div className="md:col-span-5 auth-brand-gradient p-4 sm:p-5 md:p-6 lg:p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <img src={logoImage} alt="" className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-white/80 object-cover object-left shadow-md shrink-0" />
              <div>
                <h3 className="text-white font-bold text-xs sm:text-sm lg:text-base leading-tight tracking-wide whitespace-nowrap">
                  SmartRecruit <span className="text-white/80">AI</span>
                </h3>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-slate-300 whitespace-nowrap">Deep CV Inspector</p>
              </div>
            </div>

            <div className="flex items-center gap-1 px-2 py-1 md:px-2.5 md:py-1.5 rounded-full bg-white/15 border border-white/25 text-[11px] sm:text-xs text-white shadow-sm backdrop-blur-md shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Secure Portal</span>
            </div>
          </div>

          <div className="mt-8 mb-6 sm:mt-10 sm:mb-8 z-10">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-snug mb-3">
              Welcome Back <br />
              <span className="text-white/80">
                Log In to SmartRecruit
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm lg:text-base leading-relaxed mb-6">
              Access your personalized AI career dashboard, match scores, and hiring insights.
            </p>
          </div>
          <img src={loginImage} alt="Colleagues meeting around a table" className="z-10 mt-6 min-h-[420px] w-full flex-1 rounded-xl object-cover object-center" />
        </div>

        {/* RIGHT SIDE: Interactive Login Form */}
        <div className="md:col-span-7 bg-white p-4 sm:p-6 md:p-8 lg:p-10 flex flex-col justify-center relative">

          {/* Header Title */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Log In to continue</h2>
          </div>

          {/* FORM 1: Password-Based Login */}
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
                <div className="mb-1.5">
                  <label className="block text-sm sm:text-base font-bold text-slate-700">
                    Password
                  </label>
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
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                  >
                    Forgot password?
                  </Link>
                </div>
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
                    <span>Log In</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

          {/* SOCIAL BUTTONS */}
          <div className="mt-8 border-t border-slate-200 pt-6">
            <div className="mb-5 flex items-center justify-center gap-3">
              <div className="w-full border-t border-slate-200" />
              <span className="shrink-0 text-sm font-bold uppercase tracking-widest text-slate-500">OR</span>
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="flex flex-col gap-3">
              <GoogleAuthButton label="Continue with Google" />
            </div>
          </div>

          <p className="mt-6 sm:mt-8 text-center text-sm sm:text-base font-semibold text-slate-600">
            Don't have an account?{' '}
            <Link to="/register" className="font-extrabold text-blue-600 hover:text-blue-800 hover:underline transition">
              Create account
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
};

export default Login;
