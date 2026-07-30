import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  Briefcase,
  UserCheck,
  Building2,
  Globe,
  Zap,
  ShieldCheck,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // URL Query Params ቼክ ማድረጊያ (ምሳሌ፡ /login?redirect=apply)
  const redirectTarget = searchParams.get('redirect');

  // Role State ('seeker', 'employer', or 'admin')
  const [userRole, setUserRole] = useState('seeker');

  // Form & UI States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'magic-link'
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null); // 'google' or 'linkedin'

  // Role Switcher Helper
  const handleRoleChange = (role) => {
    setUserRole(role);
    setErrors({}); // Clear validation errors on role change
  };

  // Validation Logic
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

  // 🔄 Routing & Authentication Success Logic
  const handleAuthSuccess = (authenticatedEmail = email, role = userRole) => {
    // 🟢 1. LocalStorage ውስጥ የመረጠውን ሚና እና ኢሜይል ማስቀመጥ
    localStorage.setItem('user', JSON.stringify({ email: authenticatedEmail, role }));

    // 🟢 2. Admin Auto-Detect Check
    if (role === 'admin' || authenticatedEmail.toLowerCase().includes('admin@ethiosolve.com') || authenticatedEmail.toLowerCase().includes('admin')) {
      navigate('/admin-dashboard');
      return;
    }

    // 🟢 3. Employer Navigation
    if (role === 'employer') {
      navigate('/employer-dashboard');
      return;
    }

    // 🟢 4. Job Seeker Navigation (Quick Apply ተጭኖ መጥቶ ከሆነ ወደ ነበረበት ገጽ ይመልሰዋል)
    if (redirectTarget === 'apply') {
      navigate(-1);
    } else {
      navigate('/seeker-dashboard');
    }
  };

  // Standard Form Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      handleAuthSuccess();
    }, 1200);
  };

  // Demo Admin Fill-in Helper
  const fillAdminCredentials = () => {
    handleRoleChange('admin');
    setEmail('admin@ethiosolve.com');
    setPassword('admin123');
  };

  // Google Sign In Handler
  const handleGoogleLogin = () => {
    setSocialLoading('google');
    setTimeout(() => {
      setSocialLoading(null);
      const demoEmail = email || `user_${Date.now()}@gmail.com`;
      handleAuthSuccess(demoEmail, userRole);
    }, 1500);
  };

  // LinkedIn Sign In Handler
  const handleLinkedInLogin = () => {
    setSocialLoading('linkedin');
    setTimeout(() => {
      setSocialLoading(null);
      const demoEmail = email || `user_${Date.now()}@linkedin.com`;
      handleAuthSuccess(demoEmail, userRole);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-200 flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-slate-300/40 dark:bg-slate-800/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-slate-300/40 dark:bg-slate-800/30 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl overflow-hidden grid md:grid-cols-12 z-10">
        
        {/* Left Visual Side */}
        <div className="md:col-span-5 bg-slate-800 text-slate-100 p-8 md:p-11 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-slate-700/60 border border-slate-600 flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-slate-200" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                EthioSolve <span className="text-slate-400 font-semibold">AI</span>
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight leading-snug mb-3 text-slate-100">
              {userRole === 'admin' 
                ? 'System Control Center' 
                : userRole === 'seeker' 
                ? 'Find Your Next Dream Role' 
                : 'Hire World-Class Talent'}
            </h1>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              {userRole === 'admin'
                ? 'Manage pending job postings, approve employer profiles, and monitor system analytics.'
                : userRole === 'seeker'
                ? 'Log in to access AI-curated job recommendations, match scores, and application status.'
                : 'Log in to manage job listings, review top-ranked candidates, and streamline hiring.'}
            </p>

            {/* Dynamic Card Info */}
            <div className="bg-slate-700/40 border border-slate-600/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  {userRole === 'admin' ? (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  ) : userRole === 'seeker' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Briefcase className="w-4 h-4 text-blue-400" />
                  )}
                  {userRole === 'admin' ? 'System Status' : userRole === 'seeker' ? 'Match Accuracy' : 'Candidate Pipeline'}
                </span>
                <span className="bg-slate-600/50 text-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-500/40">
                  {userRole === 'admin' ? 'Admin Access' : userRole === 'seeker' ? '98% Score' : 'Active Matching'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-600/40 rounded-full overflow-hidden">
                <div className="h-full bg-slate-300 w-[90%] rounded-full" />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-4 h-4 text-slate-300 shrink-0" />
                <span>
                  {userRole === 'admin' 
                    ? 'Approve employers & verify listings' 
                    : userRole === 'seeker' 
                    ? 'Verified tech roles in Ethiopia' 
                    : 'AI-screened applicant profiles'}
                </span>
              </div>
            </div>

            {/* Admin Quick Fill Helper */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={fillAdminCredentials}
                className="mt-4 w-full py-2 bg-slate-700/80 hover:bg-slate-700 border border-slate-600/60 rounded-xl text-[11px] text-slate-200 transition font-medium flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Auto-fill Demo Admin Credentials
              </button>
            )}
          </div>

          {/* Bottom Nav */}
          <div className="relative z-10 mt-8 pt-6 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <button 
              type="button" 
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 hover:text-slate-200 transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </button>
            <span className="text-[11px] text-slate-500">© 2026 EthioSolve AI</span>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your role to access your personalized portal.
            </p>

            {/* 1. ROLE SWITCHER */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl mt-4 border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => handleRoleChange('seeker')}
                className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium rounded-lg transition ${
                  userRole === 'seeker'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Seeker
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('employer')}
                className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium rounded-lg transition ${
                  userRole === 'employer'
                    ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                Employer
              </button>

              <button
                type="button"
                onClick={() => handleRoleChange('admin')}
                className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium rounded-lg transition ${
                  userRole === 'admin'
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>

            {/* 2. LOGIN METHOD SWITCHER */}
            <div className="flex gap-4 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('password');
                  setErrors({});
                }}
                className={`text-xs font-medium transition ${
                  loginMethod === 'password'
                    ? 'text-slate-800 dark:text-slate-200 underline underline-offset-4'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Password Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('magic-link');
                  setErrors({});
                }}
                className={`text-xs font-medium transition flex items-center gap-1 ${
                  loginMethod === 'magic-link'
                    ? 'text-slate-800 dark:text-slate-200 underline underline-offset-4'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Zap className="w-3 h-3 text-amber-500" />
                Magic Link
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    userRole === 'admin' 
                      ? 'admin@ethiosolve.com' 
                      : userRole === 'seeker' 
                      ? 'seeker@example.com' 
                      : 'hr@company.com'
                  }
                  className={`w-full pl-10 pr-4 py-2 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 text-xs outline-none transition ${
                    errors.email ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-slate-400'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[11px] text-red-500 mt-1">{errors.email}</p>}
            </div>

            {/* Password Input */}
            {loginMethod === 'password' && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 text-xs outline-none transition ${
                      errors.password ? 'border-red-400' : 'border-slate-200 dark:border-slate-700 focus:border-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-[11px] text-red-500 mt-1">{errors.password}</p>}
              </div>
            )}

            {/* Remember & Forgot */}
            {loginMethod === 'password' && (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center text-slate-500 dark:text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 text-slate-700 rounded border-slate-300"
                  />
                  <span className="ml-2">Remember Me</span>
                </label>
                <a href="#forgot" className="text-slate-600 dark:text-slate-400 hover:underline font-medium">
                  Forgot Password?
                </a>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>
                    {loginMethod === 'password'
                      ? `Sign In as ${userRole === 'admin' ? 'System Admin' : userRole === 'employer' ? 'Employer' : 'Job Seeker'}`
                      : 'Send Magic Link'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Social Logins */}
          {userRole !== 'admin' && (
            <>
              <div className="relative my-5 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <span className="relative px-3 bg-white dark:bg-slate-900 text-[11px] text-slate-400 uppercase tracking-wider">
                  Or continue with
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={socialLoading !== null}
                  className="flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition disabled:opacity-50 text-slate-700 dark:text-slate-300"
                >
                  {socialLoading === 'google' ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-slate-600" />
                      <span>Google</span>
                    </>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={handleLinkedInLogin}
                  disabled={socialLoading !== null}
                  className="flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition disabled:opacity-50 text-slate-700 dark:text-slate-300"
                >
                  {socialLoading === 'linkedin' ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5 text-slate-600" />
                      <span>LinkedIn</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* Bottom Link */}
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-slate-700 dark:text-slate-200 hover:underline">
              Sign Up for Free
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
};

export default Login;