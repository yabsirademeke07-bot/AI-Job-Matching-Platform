import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  Sparkles, ShieldCheck, Cpu, User, Mail, Lock, 
  ArrowRight, Eye, EyeOff, Target, Phone 
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [countryCode, setCountryCode] = useState('+251');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  // Input Handlers
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
    if (apiError) setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required / እባክዎ ሙሉ ስም ያስገቡ';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required / ኢሜይል ያስፈልጋል';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    const rawPhone = formData.phone.trim();
    if (!rawPhone) {
      newErrors.phone = 'Phone number is required / የስልክ ቁጥር ያስገቡ';
    } else if (countryCode === '+251') {
      const cleanPhone = rawPhone.replace(/^0/, '');
      const ethiopianPhoneRegex = /^(9|7)\d{8}$/;

      if (!ethiopianPhoneRegex.test(cleanPhone)) {
        newErrors.phone = 'የተሳሳተ የኢትዮጵያ ስልክ ቁጥር (ምሳሌ: 911223344)';
      }
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit Handler
  const handleSubmitStep1 = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    setApiError('');

    const cleanPhoneDigits = formData.phone.trim().replace(/^0/, '');
    const formattedPhone = `${countryCode}${cleanPhoneDigits}`;

    try {
      // 1. Register User in Database
      const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_URL.replace(/\/$/, '')}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          full_name: formData.fullName,
          email: formData.email,
          phone: formattedPhone,
          phoneNumber: formattedPhone,
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // 2. Send OTP Email
        try {
          await fetch(`${API_URL.replace(/\/$/, '')}/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: formData.email }),
          });
        } catch (otpErr) {
          console.warn("OTP Send Background Warning:", otpErr);
        }

        // 3. Navigate to OTP verification page
        navigate('/verify-otp', { state: { email: formData.email } });
      } else {
        setApiError(data.message || `Server Error (${response.status}). Please check backend.`);
      }
    } catch (error) {
      console.error('Registration Error:', error);
      setApiError('Unable to connect to the server. Please check if backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google Registration Handler
  const handleGoogleRegister = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      setApiError('');
      try {
        const res = await fetch(`${API_URL.replace(/\/$/, '')}/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          navigate('/verify-otp', { 
            state: { 
              email: data.email,
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              isGoogleUser: true 
            } 
          });
        } else {
          setApiError(data.message || 'Google Registration failed.');
        }
      } catch (err) {
        console.error('Google Auth Error:', err);
        setApiError('Unable to connect to the server.');
      } finally {
        setIsLoading(false);
      }
    },
    onError: (error) => {
      console.error('Google Login Failed:', error);
      setApiError('Google Sign Up failed. Please try again.');
    },
  });

  const handleLinkedInRegister = () => {
    console.log("Registering with LinkedIn...");
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] flex items-center justify-center p-4 md:p-8 font-sans">
      <div className="w-full max-w-5xl grid md:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl bg-white border border-slate-300">
        
        {/* LEFT SIDE: Info Section */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#0A0F1D] via-[#0F172A] to-[#1E1B4B] p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm leading-tight tracking-wide">
                  SmartRecruit <span className="text-blue-400">AI</span>
                </h3>
                <p className="text-[10px] text-slate-400">Deep CV Inspector</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[11px] text-slate-200 shadow-sm backdrop-blur-md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Step 1 of 3</span>
            </div>
          </div>

          <div className="my-8 z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug mb-3">
              Create Account <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Smart Registration</span>
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              Our AI platform matches top talents with top companies automatically using dynamic CV parsing.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100">AI Match Score & Skill Extraction</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Scans CV text to score compatibility & list missing skills.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 backdrop-blur-sm">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100">Career Goals Alignment</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Tailors job recommendations based on salary & title goals.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/70 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 flex items-center gap-3 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center font-bold text-emerald-400 text-xs shrink-0">
              100%
            </div>
            <div>
              <p className="text-[11px] text-slate-200 font-medium leading-snug">
                "Instant parsing & high-precision skill verification active."
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Register Form */}
        <div className="md:col-span-7 bg-white p-6 md:p-10 flex flex-col justify-center relative overflow-y-auto max-h-[90vh]">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Create Account</h2>
            <p className="text-xs font-medium text-slate-500 mt-1">Fill in your information to get started</p>
          </div>

          {/* API Error Notification */}
          {apiError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-medium">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmitStep1} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Full Name</label>
              <div className="relative group flex items-center">
                <User className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={`w-full text-sm pl-11 pr-4 py-3 rounded-xl border bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm ${
                    errors.fullName ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-[11px] font-medium text-red-600 mt-1">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Email Address</label>
              <div className="relative group flex items-center">
                <Mail className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className={`w-full text-sm pl-11 pr-4 py-3 rounded-xl border bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm ${
                    errors.email ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[11px] font-medium text-red-600 mt-1">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Phone Number</label>
              <div className="flex gap-3">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 text-sm px-3 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                >
                  <option value="+251">+251 (ET)</option>
                  <option value="+1">+1 (US)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (IN)</option>
                </select>
                <div className="relative group flex items-center flex-1">
                  <Phone className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="911223344"
                    className={`w-full text-sm pl-11 pr-4 py-3 rounded-xl border bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm ${
                      errors.phone ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                    }`}
                  />
                </div>
              </div>
              {errors.phone && <p className="text-[11px] font-medium text-red-600 mt-1">{errors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Password</label>
              <div className="relative group flex items-center">
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  className={`w-full text-sm pl-11 pr-11 py-3 rounded-xl border bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm ${
                    errors.password ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[11px] font-medium text-red-600 mt-1">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">Confirm Password</label>
              <div className="relative group flex items-center">
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat password"
                  className={`w-full text-sm pl-11 pr-11 py-3 rounded-xl border bg-white text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm ${
                    errors.confirmPassword ? 'border-red-500 bg-red-50/20' : 'border-slate-300 hover:border-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[11px] font-medium text-red-600 mt-1">{errors.confirmPassword}</p>}
            </div>

            {/* PRIMARY SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/25 active:scale-[0.98] cursor-pointer mt-5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Continue to Email Verification</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* DIVIDER */}
          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-slate-300 w-full"></div>
            <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              or continue with
            </span>
            <div className="border-t border-slate-300 w-full"></div>
          </div>

          {/* SOCIAL BUTTONS */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogleRegister}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 hover:border-slate-400 shadow-sm transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Sign up with Google</span>
            </button>

            <button
              type="button"
              onClick={handleLinkedInRegister}
              className="w-full py-2.5 px-4 bg-[#0A66C2] hover:bg-[#004182] text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-3 active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
              </svg>
              <span>Sign up with LinkedIn</span>
            </button>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition">
              Login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;