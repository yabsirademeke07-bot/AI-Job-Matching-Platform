import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Briefcase, 
  Lock, 
  Mail, 
  Phone, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Globe,
  FileText,
  BarChart3,
  Cpu
} from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();

  // Form States
  const [userType, setUserType] = useState('seeker'); // 'seeker' or 'employer'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear field error on typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validation Logic
  const validateForm = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the Terms and Conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle Submit & Navigation
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    // Mock API Registration
    setTimeout(() => {
      setIsLoading(false);
      
      // ተጠቃሚው እንደተመዘገበበት ሚና (Role) ወደ ትክክለኛው Dashboard ይመራል
      if (userType === 'seeker') {
        navigate('/upload-cv'); // ወይም '/seeker-dashboard'
      } else {
        navigate('/employer-dashboard');
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Background Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-12 z-10">
        
        {/* Left Visual Illustration Section */}
        <div className="md:col-span-5 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-800 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Floating Technology Elements Effect */}
          <div className="absolute top-8 right-8 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 animate-bounce">
            <Cpu className="w-6 h-6 text-blue-200" />
          </div>
          <div className="absolute bottom-20 left-6 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 animate-pulse">
            <FileText className="w-6 h-6 text-indigo-200" />
          </div>
          <div className="absolute top-1/2 right-4 p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
            <BarChart3 className="w-6 h-6 text-emerald-300" />
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">EthioSolve <span className="text-blue-200">AI</span></span>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight leading-tight mb-4">
              Start Your Journey with Smart AI
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              Create an account to automatically match your profile with verified job opportunities or top talent in Ethiopia.
            </p>

            {/* Feature Highlights */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs font-medium">Smart Automated CV Matching</span>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/10">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                <span className="text-xs font-medium">Verified Employers & Applicants</span>
              </div>
            </div>
          </div>

          {/* Footer Back Link */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
            <button 
              type="button" 
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Login
            </button>
            <span>© 2026 EthioSolve AI</span>
          </div>
        </div>

        {/* Right Sign Up Form Section */}
        <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
          
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Create an Account</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Fill in your details to get started with EthioSolve AI.</p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            
            {/* User Type Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
                I am signing up as a <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUserType('seeker')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                    userType === 'seeker'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Job Seeker
                </button>

                <button
                  type="button"
                  onClick={() => setUserType('employer')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition ${
                    userType === 'employer'
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  Employer
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Abebe Bikila"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800/50 text-sm outline-none transition ${
                    errors.fullName ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600'
                  }`}
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800/50 text-sm outline-none transition ${
                      errors.email ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+251 911 000 000"
                    className={`w-full pl-10 pr-3 py-2.5 rounded-xl border bg-white dark:bg-slate-800/50 text-sm outline-none transition ${
                      errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600'
                    }`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* Password & Confirm Password Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-9 py-2.5 rounded-xl border bg-white dark:bg-slate-800/50 text-sm outline-none transition ${
                      errors.password ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-9 py-2.5 rounded-xl border bg-white dark:bg-slate-800/50 text-sm outline-none transition ${
                      errors.confirmPassword ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-blue-600'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>

            {/* Terms & Conditions Checkbox */}
            <div>
              <label className="flex items-start text-xs text-slate-600 dark:text-slate-400 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="ml-2">
                  I agree to the <a href="#terms" className="text-blue-600 underline">Terms & Conditions</a> and <a href="#privacy" className="text-blue-600 underline">Privacy Policy</a>.
                </span>
              </label>
              {errors.acceptTerms && <p className="text-xs text-red-500 mt-1">{errors.acceptTerms}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Sign Up Section */}
          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-800" />
            </div>
            <span className="relative px-3 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-400">
              OR
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button" 
              className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Globe className="w-4 h-4 text-blue-600" /> Google Sign Up
            </button>
            <button 
              type="button" 
              className="flex items-center justify-center gap-2 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              <Globe className="w-4 h-4 text-blue-700" /> LinkedIn Sign Up
            </button>
          </div>

          {/* Login Link */}
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Login
            </Link>
          </p>

        </div>

      </div>
    </div>
  );
};

export default Register;