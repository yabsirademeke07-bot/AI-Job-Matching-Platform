import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './login.css';

import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  User,
  Phone,
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api').replace(/\/$/, '');

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);

  // Auth Mode State ('login' | 'signup')
  const [authMode, setAuthMode] = useState('login');

  // Signup State
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [signupErrors, setSignupErrors] = useState({});
  const [signupLoading, setSignupLoading] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (loginMethod === 'password' && !password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateSignup = () => {
    const newErrors = {};

    if (!signupForm.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!signupForm.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(signupForm.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!signupForm.password) {
      newErrors.password = 'Password is required';
    } else if (signupForm.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!signupForm.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (signupForm.password !== signupForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (signupForm.phone.trim()) {
      const cleanPhone = signupForm.phone.trim().replace(/^0/, '');
      if (!/^(9|7)\d{8}$/.test(cleanPhone)) {
        newErrors.phone = 'Use a valid Ethiopian phone number (e.g. 0912345678)';
      }
    }

    setSignupErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAuthSession = (token, user, remember) => {
    const storage = remember ? localStorage : sessionStorage;
    
    // Clear old data first
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');

    storage.setItem('token', token);
    if (user) {
      storage.setItem('user', JSON.stringify(user));
      storage.setItem('currentUser', JSON.stringify(user));
      storage.setItem('userRole', (user.role || user.userType || '').toString());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      if (loginMethod === 'magic-link') {
        await axios.post(`${API_URL}/auth/magic-link`, { email });
        setMagicLinkSent(true);
        return;
      }

      const endpoints = [
        `${API_URL}/login`,
        `${API_URL}/auth/login`,
        `${API_URL}/auth/local`,
        `${API_URL}/signin`,
      ];

      let response = null;
      let lastError = null;

      for (const url of endpoints) {
        try {
          response = await axios.post(url, { email, password });
          if (response) break;
        } catch (err) {
          lastError = err;
          // Continue loop if endpoint is not found or not matching
          if (err.response?.status === 404) continue;
        }
      }

      if (!response) {
        throw lastError || new Error('Unable to connect to authentication server');
      }

      const resp = response?.data || {};
      const token =
        resp.token ||
        resp.authToken ||
        resp.accessToken ||
        resp.data?.token ||
        resp.data?.authToken ||
        null;
      const user =
        resp.user ||
        resp.data ||
        resp.userData ||
        resp.profile ||
        null;

      if (!token) {
        const msg = resp.message || 'No authentication token returned from server.';
        setErrors({ apiError: msg });
        return;
      }

      const requiresVerification =
        user?.is_verified === false ||
        resp.needsVerification === true ||
        resp.is_verified === false;

      saveAuthSession(token, user, rememberMe);

      if (requiresVerification) {
        navigate('/verify-otp', { state: { email: user?.email || email } });
        return;
      }

      const role = (user?.role || user?.userType || resp.role || '').toString().toLowerCase().trim();

      if (role === 'admin') {
        navigate('/admin-dashboard');
      } else if (role === 'employer') {
        navigate('/employer-dashboard');
      } else if (role.includes('seeker') || role === 'job_seeker' || role === 'seeker') {
        if (redirectTarget === 'apply') {
          navigate(-1);
        } else {
          navigate('/seeker-dashboard');
        }
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        `Request failed with status code ${error.response?.status || 'unknown'}`;
      setErrors({ apiError: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setSignupForm((prev) => ({ ...prev, [name]: value }));
    if (signupErrors[name]) {
      setSignupErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    if (!validateSignup()) return;

    setSignupLoading(true);
    setSignupErrors({});

    try {
      await axios.post(`${API_URL}/register`, {
        fullName: signupForm.fullName,
        full_name: signupForm.fullName,
        email: signupForm.email,
        phone: signupForm.phone.trim(),
        phoneNumber: signupForm.phone.trim(),
        password: signupForm.password,
        role: 'job_seeker',
        skills: '',
      });

      await axios.post(`${API_URL}/send-otp`, { email: signupForm.email });
      navigate('/verify-otp', { state: { email: signupForm.email } });
    } catch (error) {
      console.error('Signup error:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Registration failed. Please try again.';
      setSignupErrors({ apiError: errorMsg });
    } finally {
      setSignupLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setSocialLoading('google');
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleLinkedInLogin = () => {
    setSocialLoading('linkedin');
    window.location.href = `${API_URL}/auth/linkedin`;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans text-slate-800 antialiased">
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Decorative Banner */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-blue-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Job & Talent Platform</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                Empowering Career Mobility with AI
              </h1>

              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Connect seamlessly with top tech opportunities and high-impact talent using our vector skill-matching engine.
              </p>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3 backdrop-blur-md shadow-xl">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 font-bold text-blue-400">
                    <TrendingUp className="w-4 h-4" />
                    Smart Matching Engine
                  </span>
                  <span className="bg-blue-600/20 text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-500/30">
                    98.4% Match Accuracy
                  </span>
                </div>

                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[94%] rounded-full transition-all duration-500 shadow-sm shadow-blue-500" />
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Enterprise grade security & verification</span>
                </div>
              </div>
            </div>

            <div className="pt-8 text-[11px] text-slate-400 relative z-10">
              © 2026 EthioSolve AI. All rights reserved.
            </div>
          </div>

          {/* Right Form Area */}
          <div className="lg:col-span-7 p-6 sm:p-10 lg:p-12 flex flex-col justify-center space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {authMode === 'login' ? 'Welcome Back!' : 'Create your account'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {authMode === 'login'
                  ? 'Login to your account and continue your journey.'
                  : 'Join the platform and start matching with your next opportunity.'}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex space-x-6 border-b border-slate-200 pb-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrors({});
                  setMagicLinkSent(false);
                }}
                className={`pb-2 transition-all border-b-2 -mb-2 ${
                  authMode === 'login'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrors({});
                  setSignupErrors({});
                }}
                className={`pb-2 transition-all border-b-2 -mb-2 ${
                  authMode === 'signup'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* ==================== LOGIN VIEW ==================== */}
            {authMode === 'login' ? (
              <>
                {errors.apiError && (
                  <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl">
                    {errors.apiError}
                  </div>
                )}

                <div className="flex space-x-6 border-b border-slate-200 pb-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('password');
                      setMagicLinkSent(false);
                      setErrors({});
                    }}
                    className={`pb-2 transition-all border-b-2 -mb-2 ${
                      loginMethod === 'password'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Password Authentication
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginMethod('magic-link');
                      setErrors({});
                    }}
                    className={`pb-2 transition-all border-b-2 -mb-2 flex items-center space-x-1 ${
                      loginMethod === 'magic-link'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Passwordless Link</span>
                  </button>
                </div>

                {magicLinkSent ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <h3 className="text-sm font-bold text-slate-800">Login Link Dispatched</h3>
                    <p className="text-xs text-slate-600">
                      We emailed a magic link to <span className="font-bold text-slate-800">{email}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMagicLinkSent(false)}
                      className="text-xs font-bold text-blue-600 hover:underline pt-2 block mx-auto cursor-pointer"
                    >
                      Back to Password Login
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@example.com"
                          className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                            errors.email ? 'border-red-500' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {errors.email && <p className="text-[11px] text-red-500 font-semibold">{errors.email}</p>}
                    </div>

                    {loginMethod === 'password' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 block">Password</label>
                        <div className="relative">
                          <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                              errors.password ? 'border-red-500' : 'border-slate-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.password && <p className="text-[11px] text-red-500 font-semibold">{errors.password}</p>}
                      </div>
                    )}

                    {loginMethod === 'password' && (
                      <div className="flex items-center justify-between text-xs pt-0.5">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-600">Remember Me</span>
                        </label>
                        <a href="#forgot" className="font-bold text-blue-600 hover:underline">
                          Forgot Password?
                        </a>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>{loginMethod === 'password' ? 'Sign In' : 'Send Magic Link'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                <div className="relative my-2 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <span className="relative px-3 bg-white text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Or Continue With
                  </span>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={socialLoading !== null}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center space-x-3 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {socialLoading === 'google' ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLinkedInLogin}
                    disabled={socialLoading !== null}
                    className="w-full py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center space-x-3 shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {socialLoading === 'linkedin' ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24">
                          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68c.93 0 1.69-.75 1.69-1.68z" />
                        </svg>
                        <span>Continue with LinkedIn</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* ==================== SIGNUP VIEW ==================== */
              <form onSubmit={handleSignupSubmit} noValidate className="space-y-3">
                {signupErrors.apiError && (
                  <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl">
                    {signupErrors.apiError}
                  </div>
                )}

                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      name="fullName"
                      value={signupForm.fullName}
                      onChange={handleSignupChange}
                      placeholder="John Doe"
                      className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                        signupErrors.fullName ? 'border-red-500' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {signupErrors.fullName && <p className="text-[11px] text-red-500 font-semibold">{signupErrors.fullName}</p>}
                </div>

                {/* Email Address */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={signupForm.email}
                      onChange={handleSignupChange}
                      placeholder="user@example.com"
                      className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                        signupErrors.email ? 'border-red-500' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {signupErrors.email && <p className="text-[11px] text-red-500 font-semibold">{signupErrors.email}</p>}
                </div>

                {/* Phone Number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={signupForm.phone}
                      onChange={handleSignupChange}
                      placeholder="0912345678"
                      className={`w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                        signupErrors.phone ? 'border-red-500' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {signupErrors.phone && <p className="text-[11px] text-red-500 font-semibold">{signupErrors.phone}</p>}
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showSignupPassword ? 'text' : 'password'}
                        name="password"
                        value={signupForm.password}
                        onChange={handleSignupChange}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-9 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                          signupErrors.password ? 'border-red-500' : 'border-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {signupErrors.password && <p className="text-[11px] text-red-500 font-semibold">{signupErrors.password}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type={showSignupConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={signupForm.confirmPassword}
                        onChange={handleSignupChange}
                        placeholder="••••••••"
                        className={`w-full pl-10 pr-9 py-2 bg-slate-50 border rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition ${
                          signupErrors.confirmPassword ? 'border-red-500' : 'border-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition"
                      >
                        {showSignupConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    {signupErrors.confirmPassword && (
                      <p className="text-[11px] text-red-500 font-semibold">{signupErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signupLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer mt-2"
                >
                  {signupLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Register & Verify OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;